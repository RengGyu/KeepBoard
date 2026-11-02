"""Compare frozen sparse samples, without changing predictions or reference labels."""
import hashlib
import importlib.util
import json
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
data = Path(sys.argv[1])
baseline_path = HERE.parent / 'service-all-games-20261027/results/results.json'
baseline_bytes = baseline_path.read_bytes()
assert hashlib.sha256(baseline_bytes).hexdigest() == '51a348efa740aa24c067bfb38c1ef7f60bb56e3f7b869a7f7926fb0872e21f9b'
baseline = {x['gameId']: x for x in json.loads(baseline_bytes)['entries']}
manifest = json.loads((HERE / 'manifest.json').read_text())
metadata = {x['gameId']: x for x in manifest['caseMetadata']}
spec = importlib.util.spec_from_file_location('anchors', HERE.parent / 'service-all-games-20261027/compare_anchors.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
rows = []
pending = []
for case in manifest['cases']:
    g = case['gameId']
    folder = data / 'cases' / g
    if not (folder / 'summary.json').is_file():
        pending.append(g)
        continue
    old = baseline[g]
    summary = json.loads((folder / 'summary.json').read_text())
    ref_bytes = Path(case['referencePath']).read_bytes()
    assert hashlib.sha256(ref_bytes).hexdigest() == case['referenceSHA']
    assert hashlib.sha256(Path(case['path']).read_bytes()).hexdigest() == case['sourceSHA']
    ref = json.loads(ref_bytes)
    native_bytes = (folder / 'native-response.json').read_bytes()
    assert hashlib.sha256(native_bytes).hexdigest() == summary['nativeSHA']
    native = json.loads(native_bytes)
    items = []
    if summary['providerStatus'] == 200:
        text = ''.join(p.get('text', '') for p in native['candidates'][0]['content']['parts'] if not p.get('thought'))
        items = json.loads(text)['items']
    semantic, unsupported = {}, {}
    for a in old['visualComparison']['rows']:
        for prop in a['properties']:
            target = semantic if prop['state'] == 'semantic-review-unscored' else unsupported if prop['state'] == 'unsupported-by-reader' else None
            if target is not None:
                target.setdefault(a['expectedKind'], set()).add(prop['id'])
    comparison = module.compare(ref, items, semantic, unsupported) if summary['providerStatus'] == 200 else None
    row = dict(gameId=g, name=old['nameKo'], group=metadata[g]['group'], sourceSHA=case['sourceSHA'], referenceSHA=case['referenceSHA'],
               oldNativeSHA=old['summary']['nativeSHA'], nativeSHA=summary['nativeSHA'],
               beforeSummary=old['summary'], afterSummary=summary,
               beforeAutomatic=old['visualComparison'], afterAutomatic=comparison,
               beforeVisualVerdict=old['visualAdjudication']['verdict'], beforeVisualReason=old['visualAdjudication']['reason'],
               newKinds=dict(Counter(x['kind'] for x in items)), referencePath=case['referencePath'], photoPath=case['path'], nativePath=str(folder / 'native-response.json'))
    rows.append(row)

groups = {}
for group in ['P0', 'P1', 'control']:
    selected = [r for r in rows if r['group'] == group]
    groups[group] = dict(games=len(selected))
    for side, name in [('before', 'beforeSummary'), ('after', 'afterSummary')]:
        values = [r[name] for r in selected]
        groups[group][side] = dict(completed=sum(v['jobState'] == 'completed' for v in values),
                                  savedReopened=sum(v.get('saveReopen') is True for v in values),
                                  failed=sum(v['jobState'] == 'failed' for v in values))
    for side, key in [('before', 'beforeAutomatic'), ('after', 'afterAutomatic')]:
        comparisons = [r[key] for r in selected if r[key] is not None]
        groups[group][side]['rawObjects'] = sum(v['nativeObjectCount'] for v in comparisons)
        groups[group][side]['emptyOutputs'] = sum(v['nativeObjectCount'] == 0 for v in comparisons)
        groups[group][side]['matchedAnchorsAutomatic'] = sum(v['matchedAnchors'] for v in comparisons)
        groups[group][side]['kindAgreementsAutomatic'] = sum(v['kindAgreements'] for v in comparisons)
        groups[group][side]['anchors'] = sum(v['anchorCount'] for v in comparisons)

out = dict(version='recognition-retest-comparison-v1', baselineSHA=hashlib.sha256(baseline_bytes).hexdigest(),
           experimentRoot=str(data), completed=len(rows), pending=pending, groups=groups, rows=rows,
           limitation='Automatic geometry/string comparison only; human visual adjudication is separate. Counts are sparse selected samples, not full-photo precision/recall.')
(data / 'comparison.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
(data / 'comparison.json').chmod(0o600)
print(json.dumps({k: out[k] for k in ['completed', 'pending', 'groups']}, ensure_ascii=False, indent=2))
