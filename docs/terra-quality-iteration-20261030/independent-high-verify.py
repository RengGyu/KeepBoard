"""Offline review only. No network, credentials, provider calls or product writes.

Recompute frozen-reference matches directly from provider output, independently
of the TypeScript scorer. Preserve all frozen artifacts; write a new review file.
"""
from pathlib import Path
import base64
import copy
import hashlib
import json
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
pre = read(OUT / 'preflight-high.json')
protocol = read(OUT / 'evaluation-preflight.json')
execution = read(OUT / 'execution-high.json')
evaluation = read(OUT / 'evaluation-high.json')
private = Path(pre['privateDir'])
checks = []


def check(label, condition):
    assert condition, label
    checks.append(label)


def iou(a, b):
    intersection = max(0, min(a[2], b[2])-max(a[0], b[0])) * max(0, min(a[3], b[3])-max(a[1], b[1]))
    union = (a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-intersection
    return intersection/union if union else 0


def matches(refs, rows):
    matrix = [[iou(r['boxPx'], p['box']) for p in rows] for r in refs]
    found = {}
    for i, values in enumerate(matrix):
        maximum = max([0]+values)
        js = [j for j, value in enumerate(values) if abs(value-maximum) < 1e-9]
        if maximum < .25 or len(js) != 1:
            continue
        j = js[0]
        column = [v[j] for v in matrix]
        if abs(max(column)-maximum) < 1e-9 and sum(abs(v-maximum) < 1e-9 for v in column) == 1:
            found[i] = j
    return found


def color(value):
    if not isinstance(value, str):
        return value
    value = value.strip().lower()
    return next((k for k, aliases in protocol['matching']['colorAliases'].items() if value in aliases), value)


check('frozen preflight SHA', sha(OUT/'preflight-high.json') == execution['preflightSHA'])
check('frozen protocol SHA', sha(OUT/'evaluation-preflight.json') == pre['referencePreflightSHA'])
check('frozen selection SHA', sha(OUT/'selection.json') == pre['selectionSHA'])
check('exact nine unique execution rows', len(execution['rows']) == len({r['id'] for r in execution['rows']}) == 9)
check('peak/retry', execution['peak'] == 2 and execution['retries'] == 0)
for source in pre['sourceFiles'] + evaluation['sourceHashes']:
    check('source '+source['path'], sha(ROOT/source['path']) == source['sha256'])
rows_by_id = {r['id']: r for r in execution['rows']}
cases = {c['gameId']: c for c in evaluation['cases']}
requests = {}
reports = []
for call in pre['calls']:
    cid, game, condition = call['id'], call['gameId'], call['condition']
    run = rows_by_id[cid]
    body = read(call['requestPath'])
    requests[cid] = body
    check(cid+' frozen request body SHA', hashlib.sha256(json.dumps(body,ensure_ascii=False,separators=(',',':')).encode()).hexdigest() == call['bodySHA'])
    check(cid+' completed effort', run['httpStatus'] == 200 and run['state'] == run['status'] == 'completed' and run['returnedEffort'] == call['effort'])
    for path, expected in [(call['inputPath'], call['inputSHA']), (call['taskPath'], call['taskSHA']), (call['referencePath'], call['referenceSHA']),
                           (private/(cid+'.provider-body.txt'), run['responseBytesSHA']), (private/(cid+'.native.json'), run['nativeSHA']), (private/(cid+'.result.json'), run['resultSHA'])]:
        check(cid+' hash '+Path(path).name, sha(path) == expected)
    image_urls = [c['image_url'] for m in body['input'] for c in m['content'] if c['type'] == 'input_image']
    check(cid+' sole image bytes', len(image_urls) == 1 and hashlib.sha256(base64.b64decode(image_urls[0].split(',', 1)[1])).hexdigest() == call['inputSHA'])
    check(cid+' claim', (private/(cid+'.claim')).read_text() == call['bodySHA'] == run['bodySHA'])
    native = read(private/(cid+'.native.json'))
    check(cid+' original provider body parse', read(private/(cid+'.provider-body.txt')) == native)
    check(cid+' native effort/model', native['reasoning']['effort'] == body['reasoning']['effort'] == run['returnedEffort'] and native['model'] == body['model'] == pre['model'])
    text = ''.join(c['text'] for message in native['output'] if message['type'] == 'message' for c in message['content'] if c['type'] == 'output_text')
    items = json.loads(text)['items']
    normalized = read(private/(cid+'.result.json'))['observationReceipts'][0]
    observations = normalized['result']['observations']
    check(cid+' native-normalized count', len(items) == len(observations) == run['observationCount'])
    ref = read(call['referencePath'])
    parsed_rows = []
    for n, (item, obs) in enumerate(zip(items, observations), 1):
        attrs = {a['id']: json.loads(a['valueJson']) if a['valueJson'] is not None else None for a in item['attributes']}
        check(cid+f' literal {n}', item['kind'] == obs['componentId'] and item['quantity'] == obs['quantity'] and all(attrs.get(k) == p['value'] for k, p in obs['properties'].items()))
        unit = item['physicalUnit']
        check(cid+f' unit {n}', unit == normalized['hostedWire']['physicalUnits'][obs['ref']])
        b = item.get('box_1000')
        if b is None:
            continue
        if condition == 'C':
            x, y, endx, endy = call['roiPx']; w, h = endx-x, endy-y
        else:
            x, y, w, h = 0, 0, call['width'], call['height']
        box = [x+b['xmin']/1000*w, y+b['ymin']/1000*h, x+b['xmax']/1000*w, y+b['ymax']/1000*h]
        parsed_rows.append({'id':obs['ref'], 'kind':item['kind'], 'box':box, 'values':attrs, 'single':unit != 'group' and (item['quantity'] == 1 or item['quantity'] is None and unit == 'single')})
    singles = [r for r in parsed_rows if r['single']]
    found = matches(ref['objects'], singles)
    numbers = dict(correct=0, wrong=0, unknown=0, **{'missing-object':0})
    number_high = dict(numbers)
    for i, r in enumerate(ref['objects']):
        pred = singles[found[i]] if i in found else None
        for field, expected in r.get('attributes', {}).items():
            if not isinstance(expected, (int, float)) or isinstance(expected, bool):
                continue
            actual = pred['values'].get(field) if pred else None
            state = 'missing-object' if pred is None else 'unknown' if actual is None else 'correct' if actual == expected else 'wrong'
            numbers[state] += 1
            if r.get('confidence','high') == 'high':
                number_high[state] += 1
    worker = next(v for v in cases[game]['variants'] if v['condition'] == condition)
    check(cid+' independent native matching', len(found) == worker['individual']['detected'])
    check(cid+' independent numeric scoring', all(worker['individual']['numeric'][k] == v for k,v in numbers.items()) and all(worker['individual']['numericHigh'][k] == v for k,v in number_high.items()))
    u = native['usage']; inp, outp = u['input_tokens'], u['output_tokens']
    cached = u['input_tokens_details'].get('cached_tokens',0); writes = u['input_tokens_details'].get('cache_write_tokens',0)
    usd = ((inp-cached-writes)+cached*.05+writes*1.25+outp*5)/1e6
    check(cid+' usage and calculation', u == run['usage'] and abs(usd-run['calculatedUSD']) < 1e-12)
    reports.append({'gameId':game,'condition':condition,'rawObservations':len(items),'matchedPartialObjects':len(found),'partialObjectDenominator':len(ref['objects']),'numbers':numbers,'highConfidenceNumbers':number_high,'providerSeconds':run['providerMs']/1000,'calculatedUSD':usd,'inputTokens':inp,'outputTokens':outp,'reasoningTokens':u['output_tokens_details'].get('reasoning_tokens',0)})

for game in cases:
    a,b,c = (copy.deepcopy(requests[game+'-'+v]) for v in 'ABC')
    check(game+' A low/B high', a['reasoning']['effort'] == 'low' and b['reasoning']['effort'] == 'high')
    b['reasoning']['effort'] = a['reasoning']['effort']
    check(game+' AB exact except effort', a == b)
    for request in [a,c]:
        for message in request['input']:
            for part in message['content']:
                if part['type'] == 'input_image': part['image_url'] = '[IMAGE_BYTES]'
    check(game+' AC exact except image', a == c)

events=[]
for r in execution['rows']:
    events.extend([(r['startedAt'],1),(r['finishedAt'],-1)])
active=peak=0
for _,d in sorted(events,key=lambda e:(e[0],e[1])):
    active+=d;peak=max(peak,active)
check('independent concurrency reconstruction', peak == 2 and active == 0)
check('cost sum within plan', abs(sum(r['calculatedUSD'] for r in reports)-execution['calculatedUSD'])<1e-12 and execution['calculatedUSD']<2)
result={'version':'independent-high-verification-v1','verifiedAt':datetime.now(timezone.utc).isoformat(),'newProviderCalls':0,'productWrites':0,'checksPassed':len(checks),'checks':checks,'conditions':reports,'requestPeakReconstructed':peak,'calculatedUSD':execution['calculatedUSD'],'actualInvoiceUSD':None,'frozenArtifacts':{n:sha(OUT/n) for n in ['preflight-high.json','evaluation-preflight.json','selection.json','execution-high.json','evaluation-high.json','score-evaluation-high.mts','run-evaluation-high.mts']},'limits':['Fixed partial AI references, not human certified.','Matching is frozen geometry-only; does not prove all output precision or exact board topology.','This script does not modify references, rerun models, or judge unannotated objects.']}
(OUT/'independent-high-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checksPassed':len(checks),'conditions':reports,'calculatedUSD':result['calculatedUSD'],'newProviderCalls':0},ensure_ascii=False,indent=2))
