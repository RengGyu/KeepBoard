"""Record only the bounded followup delta; keep the earlier P0 freeze intact."""
import datetime, difflib, hashlib, json
from pathlib import Path
out = Path(__file__).resolve().parent
root = out.parents[3]
base = json.loads((out / 'baseline.json').read_text())
snapshot = Path(base['snapshot'])
sha = lambda b: hashlib.sha256(b).hexdigest()
files, diff = [], []
for f in base['files']:
    name = f['path']; before = (snapshot / name).read_bytes(); after = (root / name).read_bytes()
    assert sha(before) == f['sha256'], name
    files.append({'path': name, 'preSHA256': sha(before), 'postSHA256': sha(after), 'bytes': len(after)})
    diff.extend(difflib.unified_diff(before.decode().splitlines(True), after.decode().splitlines(True), fromfile='a/' + name, tofile='b/' + name))
patch = ''.join(diff).encode(); (out / 'implementation.patch').write_bytes(patch)
replay = json.loads((out / 'replay-result.json').read_text())
report = {
    'status': 'SOURCE_FROZEN_DIRECT_CHECKS_PASS', 'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'baseline': str(out / 'baseline.json'), 'files': files,
    'deltaDigestSHA256': sha(json.dumps(files, sort_keys=True, separators=(',', ':')).encode()),
    'patch': {'path': str(out / 'implementation.patch'), 'sha256': sha(patch)},
    'change': 'Absent source boxes cannot establish a distinct crop-only object when a compatible same-source observation exists. Keep existing anchor/manual pieces and preserve unresolved claims with relatedPieceIds; never merge by kind/value.',
    'tests': {
        'RED': {'log': str(out / 'red.log'), 'pass': 7, 'fail': 2, 'cause': 'boxless same-kind anchor and city/settlement allowed extra physical object'},
        'focused': {'command': 'node --import tsx --test tests/scan-observation.test.ts tests/scan-recognition-integration.test.ts tests/fastest-scan.test.ts tests/multiphoto-unresolved.test.ts tests/scan-observation-results-ui.test.ts', 'pass': 30, 'fail': 0, 'exitCode': 0, 'log': str(out / 'focused-http.log')},
        'typecheck': {'command': 'npm run typecheck', 'exitCode': 0, 'log': str(out / 'typecheck-final.log')},
        'realResponseReplay': {'command': 'node --import tsx docs/multiphoto-link-implementation-20261029/sol/duplicate/replay.mts', 'exitCode': 0, 'report': str(out / 'replay-result.json'), 'reportSHA256': sha((out / 'replay-result.json').read_bytes()), 'sets': [{'name': r['name'], 'anchorPreserved': r['anchorPreserved'], 'permutations': r['permutations'], 'allRawAccounted': r['allRawAccounted'], 'boxlessAnchorCropsAddedAsPhysical': r['boxlessAnchorCropsAddedAsPhysical']} for r in replay['reports']]},
    },
    'preserved': ['All frozen native/provider results and raw values', 'Existing anchor known values, IDs and manual baseline', 'Distinct kinds and demonstrably disjoint crop supplementation', 'Anchor-kind absence/partial-failure crop supplementation', 'Settlement/city compatibility without forced kind merge', 'Owner/epoch/area separation', 'Unit redelivery idempotence and manual save/JSON reopen'],
    'modelCalls': 0, 'externalAPIRequests': 0, 'productFiles': 2, 'testFiles': 1,
    'notChanged': ['UI', 'models/prompts/output schema', 'gamepacks', 'scheduler', 'source images', 'old freeze reports'],
    'limitations': ['Projected counts are not physical inventory truth or recall.', 'No new live call or worker browser check; supervisor owns whole suite/build/mobile.', 'A possible source relation does not establish which particular boxless anchor and crop are the same physical item.'],
}
(out / 'handoff.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'files': len(files), 'deltaDigestSHA256': report['deltaDigestSHA256'], 'patchSHA256': sha(patch)}))
