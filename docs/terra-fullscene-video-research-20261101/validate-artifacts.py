"""Validate only research artifacts and read-only citations. No network/model calls."""
from pathlib import Path
import hashlib
import json
import re

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
load = lambda p: json.loads(p.read_text())
checks = []


def check(name, ok, detail=None):
    checks.append({'name': name, 'passed': bool(ok), 'detail': detail})


for path in sorted(OUT.glob('*.json')):
    if path.name == 'validation.json':
        continue
    try:
        load(path)
        check('json:' + path.name, True)
    except Exception as exc:
        check('json:' + path.name, False, str(exc))

local_refs = []
external_urls = set()
for path in sorted(OUT.glob('*.md')):
    for target in re.findall(r'\]\(([^)]+)\)', path.read_text()):
        if target.startswith(('https://', 'http://')):
            external_urls.add(target)
            continue
        target_path, _, anchor = target.partition('#')
        dest = (path.parent / target_path).resolve()
        exists = dest.exists() or dest == OUT / 'validation.json'
        line_ok = True
        if exists and anchor.startswith('L') and anchor[1:].isdigit():
            line_ok = 1 <= int(anchor[1:]) <= len(dest.read_text().splitlines())
        local_refs.append({'from': path.name, 'target': target, 'exists': exists, 'lineInRange': line_ok})
check('markdown-local-links-and-line-ranges', all(r['exists'] and r['lineInRange'] for r in local_refs), local_refs)

drift = []
for inventory in ['input-inventory.json', 'late-read-inventory.json']:
    for f in load(OUT / inventory)['files']:
        p = ROOT / f['path']
        if not p.exists() or sha(p) != f['sha256']:
            drift.append({'inventory': inventory, 'path': f['path'], 'currentSHA256': sha(p) if p.exists() else None, 'initialSHA256': f['sha256']})
check('read-input-hashes-unchanged', not drift, drift)

sources = load(OUT / 'public-source-index.json')
downloaded = [f for f in sources['files'] if f.get('ok')]
check('public-source-download-hashes', all(Path(f['localPath']).is_file() and sha(Path(f['localPath'])) == f['sha256'] for f in downloaded), {'files': len(downloaded), 'substantiveCodeOrLicenseFiles': sum('repo' in f for f in downloaded)})

evidence = load(OUT / 'evidence.json')
symbol_checks = []
for c in evidence['localClaims']:
    for loc in c.get('local', []):
        parts = loc.split(':', 2)
        p = ROOT / parts[0]
        exists = p.is_file()
        ok = exists
        if len(parts) == 3 and exists:
            lines = p.read_text().splitlines()
            ok = 1 <= int(parts[1]) <= len(lines) and parts[2] in p.read_text()
        symbol_checks.append({'reference': loc, 'ok': ok})
check('local-evidence-path-symbols', all(s['ok'] for s in symbol_checks), symbol_checks)

raw = load(OUT / 'raw-audit.json')['rows']
check('stored-nine-count-preservation', len(raw) == 9 and sum(r['rawItems'] for r in raw) == sum(r['decodedObservations'] for r in raw) == 353 and all(r['providerStatus'] == 'completed' and r['incompleteDetails'] is None for r in raw))
check('counterfactual-serialization-labels', all(r['serializationOnlyNotModelTokenPrediction'] for r in raw))
selector = load(OUT / 'selector-replay.json')
check('selector-record-sample-count', len(selector['reports']) == 2 and sum(r['frames'] for r in selector['reports']) == 40)
check('selector-source-version', selector['sourceSelectorSHA'] == sha(ROOT / 'src/scanQuality.ts'))
check('no-model-operations-in-replay-record', selector['modelCalls'] == selector['uploads'] == selector['productChanges'] == 0)

prompts = load(OUT / 'prompt-variants.json')
for v in prompts['variants']:
    if 'instructionSHA256' in v:
        check('prompt-hash:' + v['id'], hashlib.sha256(v['instruction'].encode()).hexdigest() == v['instructionSHA256'])
    if 'replacementSHA256' in v:
        check('prompt-hash:' + v['id'], hashlib.sha256(v['replacement'].encode()).hexdigest() == v['replacementSHA256'])
check('fill-sentence-current-source', prompts['variants'][2]['removeExact'] in (ROOT / 'server/ai/terraGameReader.ts').read_text())
plan = load(OUT / 'experiment-plan.json')
calls = [c['id'] for case in plan['cases'] for c in case['calls']]
check('experiment-12-unique-call-plan', len(calls) == len(set(calls)) == plan['requestLimits']['maximumCalls'] == 12)
scheduled = [i for s in plan['timingProtocol']['schedule'] for batch in s['steps'] for i in batch]
check('schedule-covers-once-peak2', sorted(scheduled) == sorted(calls) and all(len(batch) <= 2 for s in plan['timingProtocol']['schedule'] for batch in s['steps']))
check('experiment-not-executed-or-authorized', plan['newCallsThisResearch'] == 0 and plan['status'] == 'PROPOSAL_ONLY_NOT_AUTHORIZED_OR_EXECUTED')
check('no-new-catan-wire-in-plan', len(plan['cases'][0]['calls']) == 2 and {c['variant'] for c in plan['cases'][0]['calls']} == {'P0', 'P1'})

# Secrets/private originals are not allowed in deliverables. Public source cache paths are allowed.
bad = []
for p in OUT.glob('*'):
    if p.suffix not in {'.md', '.json'} or p.name == 'validation.json':
        continue
    t = p.read_text()
    if re.search(r'(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{16,}', t) or 'data:image/' in t or 'Library/Application Support/KeepBoard/research/' in t:
        bad.append(p.name)
check('no-credentials-or-raw-media-in-report', not bad, bad)

report = {'version': 'research-validation-v1', 'checkedAt': '2026-11-01', 'newPaidCalls': 0, 'productWrites': 0,
          'checks': checks, 'passed': sum(c['passed'] for c in checks), 'total': len(checks),
          'externalLinks': {'urls': sorted(external_urls), 'method': 'Primary webpages directly opened during research; pinned GitHub raw files HTTP/SHA retained in public-source-index. This script does not rerun web or authenticate endpoints.', 'limitations': 'No inference/API availability or production integration tested.'},
          'artifacts': [{'path': p.name, 'sha256': sha(p)} for p in sorted(OUT.iterdir()) if p.is_file() and p.name != 'validation.json']}
(OUT / 'validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'passed': report['passed'], 'total': report['total'], 'failed': [c['name'] for c in checks if not c['passed']], 'sourceDrift': drift}, ensure_ascii=False))
raise SystemExit(0 if all(c['passed'] for c in checks) else 1)
