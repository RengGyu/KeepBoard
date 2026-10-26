from pathlib import Path
import json,shutil,hashlib
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'docs/game-readouts-117/integration';paths=json.loads((OUT/'paths.json').read_text());APP=Path(paths['isolated']);APP.mkdir(exist_ok=True)
roots=['src','server','shared','gamepacks','public','tests','game-specifications','tools/game-specs','tools/game-runtime','tools/game-board-visuals']
exact=['package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html','docs/lightweight-catan-trial/response-observer.mts','docs/board-story/feedback/skip-css.mjs','docs/board-story/feedback/register-css.mjs','docs/game-essentials/data-freeze.json','docs/game-essentials/manifest.json','docs/game-essentials/baseline.json','docs/game-essentials/runtime/fixture-packs.json','docs/game-board-visuals/coverage.json','docs/game-board-visuals/fidelity-pending.json','docs/game-art/fidelity-corrections.json','docs/game-fidelity-audit/corrections/agricola-pack-before.json','docs/game-fidelity-audit/review/claims.json']
roots+=['docs/research/game-specs-120/games','docs/research/initial-supported-games','docs/game-essentials/runtime/fixtures']
files=set()
for r in roots:
 for p in (ROOT/r).rglob('*'):
  if not p.is_file() or p.is_symlink():continue
  rel=p.relative_to(ROOT)
  if any(x in rel.parts for x in ['uploads','.keepboard','.env','node_modules','__pycache__']):continue
  if p.suffix.lower() in ['.zip','.pdf','.pyc']:continue
  files.add(rel.as_posix())
files.update(r for r in exact if (ROOT/r).is_file())
manifest={}
for r in sorted(files):
 p=ROOT/r;d=APP/r;d.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,d);manifest[r]=hashlib.sha256(p.read_bytes()).hexdigest()
(APP/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
(OUT/'baseline.json').write_text(json.dumps({'isolation':'physical allowlisted copy of dirty workingtree, no git operations; read-only reuse node_modules via symlink','path':str(APP),'files':manifest,'digest':hashlib.sha256(json.dumps(manifest,sort_keys=True).encode()).hexdigest()},indent=2)+'\n')
print(json.dumps({'snapshot':str(APP),'files':len(files),'dataAndSecretsExcluded':True}))
