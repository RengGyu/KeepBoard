"""Check completed real boards against the game packs before the app uses them.
Usage: python3 tools/real-boards/check.py   (prints one line per complete board; exit 1 on problems)"""
import json, glob, os, re, sys, collections
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
packs = {p['id']: p for p in json.load(open(f'{ROOT}/gamepacks/generated/game-essentials.json'))}
status, bad = collections.Counter(), 0
# Public is shipped wholesale. Historical scripts/reports and intermediate renders belong in docs.
public_root = f'{ROOT}/public/game-art/real-boards'
allowed_files = {'board.json', 'board.svg', 'pieces.svg'}
for name in sorted(os.listdir(public_root)):
    game_dir = os.path.join(public_root, name)
    if not os.path.isdir(game_dir) or not os.path.isfile(os.path.join(game_dir, 'board.json')):
        print(f'PROBLEM non-runtime public entry: {name}')
        bad += 1
        continue
    for child in sorted(os.listdir(game_dir)):
        path = os.path.join(game_dir, child)
        allowed = child in allowed_files and os.path.isfile(path) or child == 'variants' and os.path.isdir(path)
        if not allowed:
            print(f'PROBLEM non-runtime public entry: {name}/{child}')
            bad += 1
for path in sorted(glob.glob(f'{ROOT}/public/game-art/real-boards/*/board.json')):
    board = json.load(open(path)); status[board.get('status')] += 1
    # Declared alternate layouts are runtime dependencies, even when old files lived beside board.json.
    for variant in board.get('variants', []):
        for key in ('json', 'svg'):
            relative = variant.get(key, '')
            if not relative.startswith('variants/') or not os.path.isfile(os.path.join(os.path.dirname(path), relative)):
                print(f'PROBLEM missing runtime variant: {board["gameId"]}/{relative}')
                bad += 1
        variant_path = os.path.join(os.path.dirname(path), variant.get('json', ''))
        if os.path.isfile(variant_path):
            variant_board = json.load(open(variant_path))
            if not os.path.isfile(os.path.join(os.path.dirname(path), variant_board.get('svg', ''))):
                print(f'PROBLEM missing variant SVG: {variant_path}')
                bad += 1
    if board.get('status') != 'complete': continue
    pack = packs.get(board['gameId']) or packs.get(board['gameId'] + '-base')
    fields = {b['key'] for b in pack['runtime']['fieldBindings'] if b['editor'] == 'component-catalog'}
    comps = {c['id'] for c in pack['runtime']['components']}
    slots = [s for a in board['areas'] for s in a['slots']]
    ids = [s['id'] for s in slots]
    svg = open(os.path.join(os.path.dirname(path), board['svg'])).read()
    problems = [f'field {a["field"]}' for a in board['areas'] if a['field'] not in fields]
    problems += [f'component {c}' for a in board['areas'] for c in a.get('accepts', []) if c not in comps]
    problems += ['duplicate slot ids'] if len(ids) != len(set(ids)) else []
    problems += ['svg/json slots differ'] if set(re.findall(r'id="slot-([^"]+)"', svg)) != set(ids) else []
    problems += [f'slot {s["id"]} outside board' for s in slots if s['x'] < 0 or s['y'] < 0 or s['x'] + s['w'] > 1000 or s['y'] + s['h'] > 1000]
    small = sum(1 for s in slots if min(s['w'], s['h']) < 60)
    bad += bool(problems)
    print(f'{board["gameId"]:22} slots {len(slots):4}  small {small:4}  ' + ('OK' if not problems else 'PROBLEM ' + '; '.join(problems[:3])))
print(dict(status))
sys.exit(1 if bad else 0)
