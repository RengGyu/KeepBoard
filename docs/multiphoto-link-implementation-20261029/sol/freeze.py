"""Freeze only this package's delta against its dirty-tree preimage; no git/index mutations."""
import datetime, difflib, hashlib, json
from pathlib import Path

root = Path(__file__).resolve().parents[3]
out = Path(__file__).resolve().parent
baseline = json.loads((out / 'baseline.json').read_text())
snapshot = Path(baseline['snapshot'])
paths = [
    'shared/scanObservation.ts', 'server/scanObservation.ts',
    'src/ScanObservationResults.tsx', 'src/SceneWorkspace.tsx',
    'tests/scan-observation-results-ui.test.ts', 'tests/multiphoto-unresolved.test.ts',
]
digest = lambda b: hashlib.sha256(b).hexdigest()
records, patch = [], []
for name in paths:
    before_path, after_path = snapshot / name, root / name
    before = before_path.read_bytes() if before_path.exists() else b''
    after = after_path.read_bytes()
    expected = next((f['sha256'] for f in baseline['files'] if f['path'] == name), None)
    assert (digest(before) if before_path.exists() else None) == expected, name
    records.append({'path': name, 'preSHA256': expected, 'postSHA256': digest(after), 'bytes': len(after)})
    patch.extend(difflib.unified_diff(before.decode().splitlines(True), after.decode().splitlines(True),
        fromfile='a/' + name if before_path.exists() else '/dev/null', tofile='b/' + name))
patch_bytes = ''.join(patch).encode()
(out / 'implementation.patch').write_bytes(patch_bytes)
report = {
    'status': 'SOURCE_FROZEN_DIRECT_CHECKS_PASS', 'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'baseline': str(out / 'baseline.json'), 'files': records,
    'deltaDigestSHA256': digest(json.dumps(records, sort_keys=True, separators=(',', ':')).encode()),
    'patch': {'path': str(out / 'implementation.patch'), 'sha256': digest(patch_bytes)},
    'checks': {
        'focused': {'command': 'node --import tsx --test tests/scan-observation.test.ts tests/scan-recognition-integration.test.ts tests/fastest-scan.test.ts tests/multiphoto-unresolved.test.ts tests/scan-observation-results-ui.test.ts', 'exitCode': 0, 'pass': 27, 'fail': 0, 'log': str(out / 'focused-approved.log'), 'sandboxAttempt': '25 pass; 2 loopback listen EPERM; same tests approved rerun 27/27'},
        'typecheck': {'command': 'npm run typecheck', 'exitCode': 0, 'evidence': 'direct exec session 50156 completed exit0'},
        'frozenResponseReplay': {'command': 'node --import tsx docs/multiphoto-link-implementation-20261029/sol/replay.mts', 'exitCode': 0, 'permutations': 120, 'report': str(out / 'replay-result.json')},
        'fullSuiteAndBuild': 'Supervisor running; not duplicated by worker',
        'browser': 'Worker SSR only; supervisor owns actual browser/live checks',
    },
    'actualFixture': {'harborObservations': 8, 'editableHarborCandidates': 6, 'unresolvedHarborObservations': 2, 'unresolvedHarborGroups': 1, 'physicalHarborInventory': None},
    'preservation': ['raw provider/result unchanged', 'stable relation IDs and unit redelivery idempotence', 'owner/epoch/area guard', 'known manual/null/0 unchanged', 'manual answerField save and JSON reopen; legacy optional absence accepted'],
    'scope': {'modelCalls': 0, 'externalAPICalls': 0, 'commit': False, 'deploy': False, 'schedulerPromptModelPackChanges': False},
    'limits': ['A review relation is not physical identity or quantity.', 'P1/P2 registration and exact board placement remain outside P0; placement accuracy UNKNOWN.', 'No worker browser or new live inference; full test/build evidence belongs to supervisor.'],
}
(out / 'handoff.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'files': len(records), 'deltaDigestSHA256': report['deltaDigestSHA256'], 'patchSHA256': digest(patch_bytes)}))
