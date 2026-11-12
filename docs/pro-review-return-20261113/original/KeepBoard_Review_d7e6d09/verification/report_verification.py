from pathlib import Path
import json, hashlib, csv, re, sys
ROOT = Path(__file__).resolve().parents[1]
source = json.loads((ROOT/'sources.json').read_text())
checks=[]
for file, expected in source['pinnedCodeBlobs'].items():
    b=(ROOT/'verification/pinned'/file).read_bytes()
    actual=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
    if actual != expected:
        raise AssertionError(f'Pinned blob mismatch: {file}')
    checks.append({'file': file, 'gitBlobSHA1': actual, 'matches': True})
logs={name:(ROOT/'verification'/name).read_text() for name in ['final-python.log','final-safety.log','final-source-predicates.log']}
py_count=int(re.search(r'Ran (\d+) tests?', logs['final-python.log']).group(1))
if not re.search(r'\nOK\s*$', logs['final-python.log']): raise AssertionError('Python tests not OK')
node_counts={}
for name in ['final-safety.log','final-source-predicates.log']:
    if int(re.search(r'# fail (\d+)',logs[name]).group(1)):raise AssertionError(f'{name}: failures')
    node_counts[name]=int(re.search(r'# pass (\d+)',logs[name]).group(1))
with (ROOT/'matched-results.csv').open(encoding='utf-8-sig') as f: matched=list(csv.DictReader(f))
with (ROOT/'placement-audit.csv').open(encoding='utf-8-sig') as f: audit=list(csv.DictReader(f))
if len(matched)!=108 or len(audit)!=54:raise AssertionError('Unexpected output row count')
if (ROOT/'response-pair-correspondence.csv').read_bytes() != (ROOT/'matched-results.csv').read_bytes(): raise AssertionError('Stale matched-results.csv')
gt=json.loads((ROOT/'ground-truth.json').read_text())
summary={
    'sourceCommit':source['sourceCommit'],
    'pythonTests':{'passed':py_count,'failed':0},
    'typescriptHelperTests':{'passed':node_counts['final-safety.log'],'failed':0},
    'originalBehaviorCounterexampleTests':{'passed':node_counts['final-source-predicates.log'],'failed':0,'note':'These reproduce original failure predicates; not product integration tests.'},
    'localTestsTotal':py_count+sum(node_counts.values()),
    'pinnedSourceChecks':checks,
    'gitApplyCheck':True,
    'syntaxTranspileFiles':4,
    'fullApplicationTypecheck':False,
    'fullApplicationTests':False,
    'browserRendering':False,
    'originalPhotosViewed':0,
    'responsePairAttributeRows':len(matched),
    'unadjudicatedObservationRows':len(audit),
    'modelCalls':0,
    'paidCalls':0,
    'remoteWrites':0,
}
(ROOT/'verification/result.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False,indent=2))
