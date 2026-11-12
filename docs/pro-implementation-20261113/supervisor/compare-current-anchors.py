"""Reuse frozen direct-photo identity judgments; never create new photo truth."""
from pathlib import Path
import csv, json, collections

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
audit = list(csv.DictReader((ROOT / 'photo-audit/placement-audit.csv').open(encoding='utf-8-sig')))
rows = [r for r in audit if r['case_id'] == 'seven-wonders-baseline']
case = json.loads((HERE.parents[1] / 'pro-review-20261113/data/cases/seven-wonders-baseline.json').read_text())
pieces = {p['id']: p for a in case['assertions'] for p in a['value']['pieces']}
anchors = {r['pieceId']: r['photo_anchor'] for r in rows if pieces[r['pieceId']].get('componentId') == 'wonder'}
structure = json.loads((HERE / 'current-structures/seven-wonders-baseline.json').read_text())
placements = {p['pieceId']: p for p in structure['placements']}
out = []
for r in rows:
    p = placements.get(r['pieceId'])
    ref = p.get('anchorRef') if p else None
    target = anchors.get(ref['pieceId']) if ref and ref.get('kind') == 'live-piece' else None
    if r['pieceId'] in anchors:
        target = anchors[r['pieceId']]
    if r['placement_status'] == 'withheld':
        result = 'withheld'
    elif not target or not p or p['areaId'] == 'unclassified':
        result = 'unassigned'
    elif target == r['photo_anchor']:
        result = 'match'
    else:
        result = 'wrong-anchor'
    out.append({'pieceId': r['pieceId'], 'photo_anchor': r['photo_anchor'], 'old_status': r['placement_status'], 'current_anchor': target, 'current_status': result, 'crop': r['individual_crop'] or r['crop']})
result = {'method': 'Same frozen Sol direct-photo identity/anchor judgments; current derived structure only',
          'human_certified': False, 'providerCalls': 0, 'source_geometry_modified': False,
          'before': dict(collections.Counter(r['old_status'] for r in out)),
          'after': dict(collections.Counter(r['current_status'] for r in out)), 'rows': out}
(HERE / 'current-photo-anchors.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: result[k] for k in ['method', 'before', 'after']}, ensure_ascii=False))
