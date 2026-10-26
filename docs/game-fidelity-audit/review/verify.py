"""Audit package consistency only; this does NOT verify board-game rules."""
import hashlib
import json
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
def read(name): return json.loads((HERE/name).read_text())
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def pointer(path):
    file, fragment = path.split('#', 1)
    value = json.loads((REPO/file).read_text())
    for token in fragment.strip('/').split('/'):
        key = token.replace('~1', '/').replace('~0', '~')
        value = value[int(key)] if isinstance(value, list) else value[key]
    return value

ledger, summary, findings, claims = read('ledger.json'), read('summary.json'), read('findings.json'), read('claims.json')
ids = [x['gameId'] for x in ledger]
expected = {p.stem for p in (REPO/'docs/research/game-specs-120/games').glob('*.json')} - {'rummikub'}
assert len(expected) == len(ids) == len(set(ids)) == 119
assert set(ids) == expected
assert dict(Counter(x['status'] for x in ledger)) == summary['statusCounts']
assert sum(summary['statusCounts'].values()) == 119
assert {x['status'] for x in ledger} <= {'VERIFIED_SCOPED', 'PARTIAL', 'HELD'}
assert len(findings) == summary['findingCount'] == len({x['id'] for x in findings})
assert len({x['gameId'] for x in findings}) == summary['affectedGames']

changed = []
for c in claims:
    for path_key, hash_key in [('specPath','specSha256'),('mappingPath','mappingSha256')]:
        if sha(REPO/c[path_key]) != c[hash_key]: changed.append(c[path_key])
assert not changed, 'Read-only baseline changed: '+str(changed)

for entry in ledger:
    assert entry['edition']['name'] and entry['checkedDimensions'] and entry['readScope']
    assert entry['finding'] and entry['layer'] and entry['unconfirmed']
    assert entry['sources'] and all(s['url'].startswith('https://') for s in entry['sources'])
    assert all(s.get('page') or s.get('section') for s in entry['sources'])
    if entry['status'] == 'VERIFIED_SCOPED':
        assert any(s['visualFactChecked'] and s.get('visualEvidence') for s in entry['sources'])
    if entry['status'] == 'HELD': assert entry['verifiedFacts'] is None
    for source in entry['sources']:
        if source.get('localPath'):
            assert sha(REPO/source['localPath']) == source['sha256']
        for image in source.get('visualEvidence', []):
            assert (REPO/image).read_bytes().startswith(b'\x89PNG\r\n\x1a\n')
    actual = [f['id'] for f in findings if f['gameId'] == entry['gameId']]
    assert actual == entry['findingIds']

for finding in findings:
    assert finding['status'] == 'VERIFIED_MISMATCH' and finding['sourceURL'] and finding['page']
    assert finding['evidenceValue'] and finding['minimumCorrection'] and finding['limits']
    assert (REPO/finding['visualEvidence'].split(' (')[0]).exists()
    assert finding['inference'] is False
    for path in finding['paths']: pointer(path)
assert '플레이어별색점수말' not in next(x for x in findings if x['id']=='F017')['evidenceValue']

files = [p for p in HERE.rglob('*') if p.is_file()]
report = dict(result='PASS', checkedAt='2026-10-22', scope='audit record/path/hash consistency only, not factual correctness',
    games=119, missingIds=[], duplicateIds=[], counts=summary['statusCounts'],
    findings=len(findings), affectedGames=summary['affectedGames'],
    originalSpecHashesUnchanged=119, originalMappingHashesUnchanged=119,
    validatedFindingPointers=sum(len(x['paths']) for x in findings),
    auditFilesBeforeVerificationReport=len(files), auditBytesBeforeVerificationReport=sum(x.stat().st_size for x in files),
    checks=['119 IDs exact excluding rummikub','all terminal scoped statuses','status counts','finding IDs and valid JSON pointers',
            'source URL and page/section','download PDF SHA256','viewed PNG existence/signature','119 spec+119 mapping baseline SHA256 unchanged','F017 unsupported comparison absent'])
(HERE/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
