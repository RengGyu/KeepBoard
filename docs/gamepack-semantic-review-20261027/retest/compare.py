"""Compare selected retests against each case's frozen latest baseline; no model calls."""
import hashlib
import importlib.util
import json
import sys
from pathlib import Path
from collections import Counter

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
DATA = Path(sys.argv[1])
sha = lambda x: hashlib.sha256(x).hexdigest()
original = {r['gameId']: r for r in json.loads((ROOT/'docs/service-all-games-20261027/results/results.json').read_text())['entries']}
selection = {r['gameId']: r for r in json.loads((HERE/'selection.json').read_text())['rows']}
manifest = json.loads((HERE/'manifest.json').read_text())
spec = importlib.util.spec_from_file_location('anchors', ROOT/'docs/service-all-games-20261027/compare_anchors.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def items(native):
    return json.loads(''.join(p.get('text','') for p in native['candidates'][0]['content']['parts'] if not p.get('thought')))['items']

rows, pending = [], []
for c in manifest['cases']:
    g = c['gameId']
    folder = DATA/'cases'/g
    if not (folder/'summary.json').exists():
        pending.append(g)
        continue
    summary = json.loads((folder/'summary.json').read_text())
    native_bytes = (folder/'native-response.json').read_bytes()
    assert sha(native_bytes) == summary['nativeSHA']
    ref_bytes = Path(c['referencePath']).read_bytes()
    assert sha(ref_bytes) == c['referenceSHA']
    assert sha(Path(c['path']).read_bytes()) == c['sourceSHA']
    ref = json.loads(ref_bytes)
    semantic, unsupported = {}, {}
    for a in original[g]['visualComparison']['rows']:
        for prop in a['properties']:
            target = semantic if prop['state']=='semantic-review-unscored' else unsupported if prop['state']=='unsupported-by-reader' else None
            if target is not None:
                target.setdefault(a['expectedKind'],set()).add(prop['id'])
    baseline = selection.get(g)
    before_summary, before = None, None
    if baseline:
        raw = Path(baseline['baselineNativePath']).read_bytes()
        old_summary = Path(baseline['baselineSummaryPath']).read_bytes()
        assert sha(raw)==baseline['baselineNativeSHA'] and sha(old_summary)==baseline['baselineSummarySHA']
        before_summary=json.loads(old_summary)
        before=module.compare(ref,items(json.loads(raw)),semantic,unsupported)
    after=module.compare(ref,items(json.loads(native_bytes)),semantic,unsupported) if summary['providerStatus']==200 else None
    rows.append(dict(gameId=g,name=original[g]['nameKo'],sourceSHA=c['sourceSHA'],referenceSHA=c['referenceSHA'],nativeSHA=summary['nativeSHA'],
                     baselineFamily=baseline['baselineFamily'] if baseline else 'new-area-no-baseline',
                     beforeSummary=before_summary,afterSummary=summary,beforeAutomatic=before,afterAutomatic=after,
                     photoPath=c['path'],referencePath=c['referencePath'],nativePath=str(folder/'native-response.json')))

totals={}
for side in ['before','after']:
    values=[r[side+'Automatic'] for r in rows if r[side+'Automatic'] is not None]
    totals[side]=dict(cases=len(values),anchors=sum(x['anchorCount'] for x in values),matched=sum(x['matchedAnchors'] for x in values),
                      kindAgreements=sum(x['kindAgreements'] for x in values),rawObjects=sum(x['nativeObjectCount'] for x in values),empty=sum(x['nativeObjectCount']==0 for x in values))
out=dict(version='gamepack-semantic-retest-automatic-v1',experimentRoot=str(DATA),completed=len(rows),pending=pending,totals=totals,rows=rows,
         limitation='Automatic geometry/string comparison only, not visual accuracy. New Rummikub private area has no old baseline; do not compare its denominator to the 48 old cases.')
(DATA/'comparison.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');(DATA/'comparison.json').chmod(0o600)
print(json.dumps(dict(completed=len(rows),pending=len(pending),totals=totals,states=dict(Counter(r['afterSummary']['jobState'] for r in rows))),ensure_ascii=False))
