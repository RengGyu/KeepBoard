"""Read-only source/input pins. Writes only next to this script; never reads runtime data."""
import hashlib
import json
import pathlib
import subprocess
import sys

OUT = pathlib.Path(__file__).resolve().parent
ROOT = OUT.parents[1]
PRODUCT_ROOTS = ('src/', 'shared/', 'server/', 'gamepacks/', 'game-photo-definitions/')
tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
paths = {p for p in tracked if p.startswith(PRODUCT_ROOTS)}
paths.update(['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts'])
for folder in ['docs/pro-review-20261113/data', 'docs/pro-review-20261113/photos',
               'docs/photo-service-comparison-20261113']:
    paths.update(str(p.relative_to(ROOT)) for p in (ROOT / folder).rglob('*') if p.is_file())
for case in ['01', '04', '05', '06', '07']:
    base = ROOT / 'docs/real-photo-review-20261110'
    paths.add(str((base / 'photos' / f'final-pool-{case}.jpg').relative_to(ROOT)))
    for name in ['view.json', 'request.json', 'decoded.json', 'native.json', 'summary.json']:
        paths.add(str((base / 'cases' / f'final-pool-{case}' / name).relative_to(ROOT)))
paths.update(['docs/restoration-readability-generalization-20261113/sol2/manifest.json',
              'docs/restoration-readability-generalization-20261113/sol2/fixtures.mts'])
pins = {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in sorted(paths) if (ROOT / p).is_file()}
meta = {'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT).decode().strip(), 'files': pins}
if '--capture' in sys.argv:
    target = OUT / 'input-pins.json'
    if target.exists():
        raise SystemExit('Refusing to overwrite initial pins')
    target.write_text(json.dumps(meta, indent=2) + '\n')
    print(json.dumps({'pinnedFiles': len(pins), 'head': meta['head']}))
else:
    before = json.loads((OUT / 'input-pins.json').read_text())
    changed = [p for p, h in before['files'].items() if pins.get(p) != h]
    added = [p for p in pins if p not in before['files']]
    same_head = before['head'] == meta['head']
    result = {'headBefore': before['head'], 'headAfter': meta['head'], 'sameHead': same_head, 'checkedFiles': len(before['files']),
              'changed': changed, 'addedTrackedProductOrInput': added,
              'unchanged': not changed and not added}
    (OUT / 'input-invariance.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
    if not result['unchanged'] or ('--strict-head' in sys.argv and not same_head):
        raise SystemExit(1)
