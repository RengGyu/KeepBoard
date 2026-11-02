"""Offline comparison of the frozen visual reference and the single live service result."""
import collections
import hashlib
import json
import math
import sys
from pathlib import Path

run, reference, output = map(Path, sys.argv[1:])
load = lambda p: json.loads(p.read_text())
native = load(run / 'native-response.json')
items = json.loads(next(p['text'] for p in native['candidates'][0]['content']['parts'] if 'text' in p and not p.get('thought')))['items']
ref = load(reference)
candidate = load(run / 'candidate-before-apply.json')
receipt = candidate['observationReceipts'][0]
components = {c['id']: c for c in candidate['value']['components']}
observations = {o['ref']: o for o in receipt['result']['observations']}
assert native['candidates'][0]['finishReason'] == 'STOP'
assert len(items) == len(components) == len(observations) == 38
assert ref['sourceSHA'] == receipt['sourceImageSHA']
for i, item in enumerate(items, 1):
    key = f'item-{i}'
    observed = observations[key]
    component = components[receipt['componentRefs'][key]]
    attrs = {a['id']: json.loads(a['valueJson']) for a in item['attributes'] if a['valueJson'] is not None}
    assert observed['componentId'] == component['kind'] == item['kind']
    assert observed['face'] == component['face'] == item['face']
    assert observed['quantity'] == component['quantity'] == item['quantity']
    for k, value in attrs.items():
        assert observed['properties'][k] == {'state': 'observed', 'value': value}
        assert component[k] == value
    y, x, Y, X = item['box_1000']
    expected = dict(x=x/1000, y=y/1000, width=(X-x)/1000, height=(Y-y)/1000)
    assert all(math.isclose(observed['bbox'][k], v, abs_tol=1e-12) for k, v in expected.items())
    assert component['region'] == observed['bbox']
    assert component['evidenceId'] == receipt['request']['images'][0]['evidenceId']
reopened = load(run / 'reopened-session.json')['session']
accepted = [a for a in reopened['assertions'] if a['field'] == 'board.layout' and a['status'] == 'accepted'][-1]
assert accepted['value']['components'] == candidate['value']['components']
assert accepted['observationReceipts'] == candidate['observationReceipts']

def bbox(item):
    y, x, Y, X = item['box_1000']
    return [x*ref['width']/1000, y*ref['height']/1000, X*ref['width']/1000, Y*ref['height']/1000]

def iou(a, b):
    intersect = max(0, min(a[2], b[2])-max(a[0], b[0])) * max(0, min(a[3], b[3])-max(a[1], b[1]))
    return intersect / ((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-intersect)

matrix = [[iou(r['boxPx'], bbox(item)) for item in items] for r in ref['objects']]
rows = []
for i, r in enumerate(ref['objects']):
    best = max(matrix[i]); choices = [j for j, v in enumerate(matrix[i]) if math.isclose(v, best, abs_tol=1e-12)]
    assert len(choices) == 1 and best >= .25
    j = choices[0]; reverse = max(row[j] for row in matrix)
    assert [k for k, row in enumerate(matrix) if math.isclose(row[j], reverse, abs_tol=1e-12)] == [i]
    item = items[j]; attrs = {a['id']: json.loads(a['valueJson']) for a in item['attributes'] if a['valueJson'] is not None}
    expected = r['terrainType'] if r['kind'] == 'terrain' else r['number']
    actual = attrs.get('variant') if r['kind'] == 'terrain' else attrs.get('number')
    rows.append(dict(referenceId=r['id'], kind=r['kind'], nativeIndex=j, iou=best, kindAgrees=r['kind']==item['kind'], referenceValue=expected, serviceValue=actual, valueAgrees=expected==actual if expected is not None else None))
assert len({row['nativeIndex'] for row in rows}) == len(items)
summary = load(run / 'summary.json')
result = dict(status='VERIFIED', photoCount=1, sourceSHA=ref['sourceSHA'], modelReported=native.get('modelVersion'), finishReason='STOP', providerCalls=summary['providerCalls'], retries=0, providerMs=summary['jobTimings']['providerMs'], usage=native.get('usageMetadata'), counts=dict(collections.Counter(x['kind'] for x in items)), locationMatches=len(rows), kindAgreements=sum(r['kindAgrees'] for r in rows), terrainAgreements=sum(r['valueAgrees'] is True and r['kind']=='terrain' for r in rows), numberAgreements=sum(r['valueAgrees'] is True and r['kind']=='number-token' for r in rows), numberScorable=sum(r['kind']=='number-token' and r['referenceValue'] is not None for r in rows), nativeToReceiptToCandidatePreserved=38, candidateToReopenedPreserved=38, unplaced=sum(c['location']['type']=='unplaced' for c in components.values()), summary=summary, rows=rows, evidenceSHA256={f:hashlib.sha256((run/f).read_bytes()).hexdigest() for f in ['preflight.json','native-response.json','candidate-before-apply.json','reopened-session.json','summary.json']}, referenceSHA256=hashlib.sha256(reference.read_bytes()).hexdigest(), limitations=['Independent Sol visual interpretation is not certified ground truth. Two uncertain 6/9 values are unscored.','One photo through current local service code and real Gemini; no deployed-site or browser-render verification.','Canonical Catan cell/edge placement needs a confirmed frame or user review; photo regions are preserved.','Original harness polling read private requestId, which is omitted by API. Finished existing completed job offline via public job.id; no second inference.'])
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['rows','evidenceSHA256','usage','summary','limitations']}, ensure_ascii=False))
