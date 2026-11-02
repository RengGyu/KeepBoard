"""Offline artifact checks only. Does not read credentials or make requests."""
import base64
import copy
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
load = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
p = load(ROOT / 'preflight.json')
e = load(ROOT / 'execution.json')
v = load(ROOT / 'evaluation.json')
frozen = load(ROOT / 'freeze.json')
old = load(p['previousPreflightPath'])
old_execution = load(p['previousExecutionPath'])
checks = []


def check(name, condition):
    checks.append({'name': name, 'pass': bool(condition)})


def bodyhash(path):
    # All actual requests have UTF-8 literal JSON.stringify encoding.
    return hashlib.sha256(json.dumps(load(path), ensure_ascii=False,
                                   separators=(',', ':')).encode()).hexdigest()


check('preflight frozen before calls', sha(ROOT / 'preflight.json') == frozen['preflightSHA'] == e['preflightSHA'])
check('runner unchanged since freeze', sha(ROOT / 'run.mts') == frozen['runnerSHA'])
check('scorer unchanged since freeze', sha(ROOT / 'score.mts') == frozen['scorerSHA'])
check('previous preflight immutable', sha(p['previousPreflightPath']) == p['previousPreflightSHA'])
check('previous execution immutable', sha(p['previousExecutionPath']) == p['previousExecutionSHA'])
check('selection immutable', sha(p['selectionPath']) == p['selectionSHA'])
check('reference protocol immutable', sha(p['evaluationPreflightPath']) == p['referencePreflightSHA'])
check('evaluation linked to execution', sha(ROOT / 'execution.json') == v['executionSHA'])
check('exact three new calls, peak two, retry zero', e['calls'] == 3 and e['peak'] <= 2 and e['retries'] == 0 and len(e['rows']) == 3 and len({r['id'] for r in e['rows']}) == 3)
check('no halt, skipped calls or source drift', not e['halt'] and not e['skipped'] and not e['sourceDrift'] and not v['sourceDrift'])
check('all pinned product sources still unchanged', all(sha(x['path']) == x['sha256'] for x in p['sourceFiles']))
check('no product writes or credentials persisted', e['productWrites'] == 0 and e['credentialsPersisted'] is False)
private = Path(p['privateDir'])
run_claim = load(private / 'execution.run.claim')
check('separate durable execution claim', run_claim['preflightSHA'] == sha(ROOT / 'preflight.json') and run_claim['max'] == 3)
artifact_rows = []
for c in p['calls']:
    row = next(r for r in e['rows'] if r['id'] == c['id'])
    body = load(c['requestPath'])
    before_c = next(r for r in old['calls'] if r['gameId'] == c['gameId'] and r['condition'] == 'C')
    whole = next(r for r in p['reuseWhole'] if r['gameId'] == c['gameId'])
    prior_crop = load(before_c['requestPath'])
    changed_effort = copy.deepcopy(prior_crop)
    changed_effort['reasoning']['effort'] = 'high'
    whole_body = load(whole['requestPath'])
    without_images = []
    for candidate in [body, whole_body]:
        candidate = copy.deepcopy(candidate)
        for msg in candidate['input']:
            for part in msg['content']:
                if part['type'] == 'input_image':
                    part['image_url'] = '[IDENTICAL-IMAGE-FIELD-REMOVED]'
        without_images.append(candidate)
    native_path = private / (c['id'] + '.native.json')
    provider_path = private / (c['id'] + '.provider-body.txt')
    native = load(native_path)
    image_parts = [part for msg in body['input'] for part in msg['content'] if part['type'] == 'input_image']
    check(c['id'] + ' exact input/task/reference/body SHA', all(sha(c[k]) == c[h] for k, h in [('inputPath', 'inputSHA'), ('taskPath', 'taskSHA'), ('referencePath', 'referenceSHA')]) and bodyhash(c['requestPath']) == c['bodySHA'] == row['bodySHA'])
    check(c['id'] + ' C-to-D only effort changes', body == changed_effort and c['inputSHA'] == before_c['inputSHA'])
    check(c['id'] + ' B-to-D only image changes', without_images[0] == without_images[1])
    check(c['id'] + ' transmitted image bytes exact', len(image_parts) == 1 and hashlib.sha256(base64.b64decode(image_parts[0]['image_url'].split(',', 1)[1])).hexdigest() == c['inputSHA'])
    check(c['id'] + ' durable unit claim', (private / (c['id'] + '.claim')).read_text() == c['bodySHA'])
    check(c['id'] + ' provider/native/result immutable', sha(provider_path) == row['responseBytesSHA'] and sha(native_path) == row['nativeSHA'] and sha(c['resultPath']) == row['resultSHA'] and load(provider_path) == native)
    check(c['id'] + ' actual completed Terra high response', row['httpStatus'] == 200 and row['state'] == 'completed' and native['status'] == 'completed' and native['model'] == 'gpt-6.1-terra' and native['reasoning']['effort'] == 'high')
    check(c['id'] + ' usage exact and within reservation', native['usage'] == row['usage'] and native['usage']['input_tokens'] <= c['reservedInputTokens'] and native['usage']['output_tokens'] <= c['maxOutputTokens'])
    artifact_rows.append({k: row[k] for k in ['id', 'bodySHA', 'inputSHA', 'responseBytesSHA', 'nativeSHA', 'resultSHA', 'model', 'returnedEffort', 'providerMs', 'usage', 'calculatedUSD']})

for c in old['calls']:
    row = next(r for r in old_execution['rows'] if r['id'] == c['id'])
    check(c['id'] + ' prior nine response unchanged', bodyhash(c['requestPath']) == row['bodySHA'] and sha(Path(old['privateDir']) / (c['id'] + '.native.json')) == row['nativeSHA'] and sha(Path(old['privateDir']) / (c['id'] + '.result.json')) == row['resultSHA'])
for r in p['reuseWhole']:
    row = r['executionRow']
    check(r['id'] + ' reuse only, no new whole call', r['reused'] and not r['newProviderCall'] and sha(r['nativePath']) == row['nativeSHA'] and sha(r['resultPath']) == row['resultSHA'] and bodyhash(r['requestPath']) == r['bodySHA'] and row['returnedEffort'] == 'high')
for c in v['cases']:
    for fusion in c['fusion']:
        check(c['gameId'] + ' ' + fusion['version'] + ' raw/order/redelivery invariant', fusion['rawPreserved'] and fusion['inputResultsUnchanged'] and fusion['orderReversalAndRedeliveryEqual'])

usage = lambda rows: {
    'input': sum(r['usage']['input_tokens'] for r in rows),
    'cacheWrite': sum(r['usage']['input_tokens_details'].get('cache_write_tokens', 0) for r in rows),
    'cacheHit': sum(r['usage']['input_tokens_details'].get('cached_tokens', 0) for r in rows),
    'outputIncludingReasoning': sum(r['usage']['output_tokens'] for r in rows),
    'reasoningSubset': sum(r['usage']['output_tokens_details'].get('reasoning_tokens', 0) for r in rows),
    'total': sum(r['usage']['total_tokens'] for r in rows)
}
reused = [r['executionRow'] for r in p['reuseWhole']]
check('new estimate within authorized dollar planning budget', e['calculatedUSD'] <= p['maxCalculatedUSD'])
result = {
    'verifiedAt': datetime.now(timezone.utc).isoformat(),
    'status': 'VERIFIED' if all(x['pass'] for x in checks) else 'FAILED',
    'checks': checks,
    'preflightSHA': sha(ROOT / 'preflight.json'), 'executionSHA': sha(ROOT / 'execution.json'),
    'evaluationSHA': sha(ROOT / 'evaluation.json'),
    'newCalls': 3, 'wholeHighNewCalls': 0, 'reusedWholeCalls': 3,
    'peak': e['peak'], 'retries': 0, 'remainingAuthorizedCalls': 0,
    'newWallSeconds': e['wallMs'] / 1000,
    'newUsage': usage(e['rows']), 'reusedWholeUsage': usage(reused),
    'newCalculatedUSD': e['calculatedUSD'],
    'reusedWholeCalculatedUSD': sum(r['calculatedUSD'] for r in reused),
    'sixResponseConditionCalculatedUSD': e['calculatedUSD'] + sum(r['calculatedUSD'] for r in reused),
    'actualInvoiceUSD': None, 'authSource': 'provided-upload',
    'artifacts': artifact_rows,
    'limits': ['Planning cost conversion is not an invoice.', 'New wall excludes all reused whole-high inference.', 'AI partial reference, not certified human truth; repeated development images.', 'No new UI/save/reopen timing or whole-photo accuracy measured.'],
    'productWrites': 0, 'additionalCallsFromVerifier': 0
}
(ROOT / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': result['status'], 'checks': len(checks), 'failed': [x['name'] for x in checks if not x['pass']], 'newUsage': result['newUsage']}, ensure_ascii=False))
assert result['status'] == 'VERIFIED'
