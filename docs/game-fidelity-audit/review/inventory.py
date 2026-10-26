"""Read-only claim snapshot; not a rulebook correctness verdict."""
import json, hashlib
from pathlib import Path

root = Path(__file__).resolve().parents[3]
out = Path(__file__).resolve().parent
games = []
for file in sorted((root / 'docs/research/game-specs-120/games').glob('*.json')):
    spec = json.loads(file.read_text())
    if spec['game_id'] == 'rummikub':
        continue
    mapping_file = root / 'public/game-art/games' / spec['game_id'] / 'mapping.json'
    mapping = json.loads(mapping_file.read_text())
    games.append(dict(gameId=spec['game_id'], edition=spec['edition'], specPath=str(file.relative_to(root)),
        specSha256=hashlib.sha256(file.read_bytes()).hexdigest(), mappingPath=str(mapping_file.relative_to(root)),
        mappingSha256=hashlib.sha256(mapping_file.read_bytes()).hexdigest(), sources=spec['sources'],
        components=spec['components'], areas=spec['layout']['areas'],
        mappedComponents=mapping['components'], mappedAreas=mapping['areas']))
assert len(games) == 119 and len({g['gameId'] for g in games}) == 119
(out / 'claims.json').write_text(json.dumps(games, ensure_ascii=False, indent=2) + '\n')
lines = []
for g in games:
    lines.append('\n## ' + g['gameId'] + ' | ' + g['edition']['name'])
    for i, c in enumerate(g['components']):
        a = next(a for a in g['mappedComponents'] if a['component_id'] == c['id'])
        variants = '; '.join(v['name'] + ':' + '/'.join(l['asset_id'] for l in v['layers']) for v in a['variants'])
        lines.append(f"/components/{i} {c['id']} {c['name']} q={c['quantity']} {c['description']} | art color={a.get('color_role')} {variants}")
    lines.append('AREAS ' + '; '.join(f"{a['id']}={a['name']}({a['scope']}/{a['visibility']},{a['topology']},fixed={a['fixed_slot_count']}) {a['anchor_contract']}" for a in g['areas']))
    lines.append('SOURCES ' + '; '.join(str(s['url']) for s in g['sources'] if s.get('url')))
(out / 'claims.txt').write_text('\n'.join(lines) + '\n')
print(f'{len(games)} claim locations snapshotted; no factual verdict assigned.')
