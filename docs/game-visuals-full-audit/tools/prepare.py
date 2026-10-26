"""Create an isolated, keyless source/art snapshot, never a product build."""
from pathlib import Path
import json,shutil,tempfile,hashlib
R=Path(__file__).resolve().parents[3];D=R/'docs/game-visuals-full-audit';T=Path(tempfile.mkdtemp(prefix='keepboard-visual-audit-')).resolve()
for folder in ['src','shared','gamepacks']:
 shutil.copytree(R/folder,T/folder,ignore=shutil.ignore_patterns('__pycache__'))
for folder in ['game-art','carcassonne-art']:
 shutil.copytree(R/'public'/folder,T/'public'/folder,ignore=shutil.ignore_patterns('*.zip'))
for a in json.loads((R/'public/game-art/assets.json').read_text())['assets']:
 path=Path(a['file']) if a['classification']=='existing' else Path('public/game-art')/a['file']
 if not (T/path).exists():shutil.copy2(R/path,T/path)
(T/'node_modules').symlink_to(R/'node_modules',target_is_directory=True)
(T/'package.json').write_text('{"type":"module"}\n')
(T/'audit').mkdir();(D/'renders').mkdir(exist_ok=True)
for name in ['app.tsx','audit.css','index.html']:
 shutil.copy2(D/'tools'/name,T/'audit'/name)
# Keep product CSS bytes untouched; use a derived local-font stylesheet to avoid external requests.
css=(R/'src/styles.css').read_text();css='\n'.join(line for line in css.splitlines() if not line.startswith('@import'))
(T/'audit/global-local.css').write_text(css)
fixtures={p.stem:json.loads(p.read_text()) for p in (R/'tests/fixtures/readouts').glob('*.json')}
(T/'audit/data.json').write_text(json.dumps({'packs':json.loads((R/'gamepacks/generated/game-essentials.json').read_text()),'games':json.loads((R/'public/game-art/games.json').read_text())['games'],'assets':json.loads((R/'public/game-art/assets.json').read_text())['assets'],'boards':json.loads((R/'public/game-art/boards/mapping.json').read_text())['games'],'fixtures':fixtures,'rawImages':['/'+str(p.relative_to(T/'public')) for p in (T/'public').rglob('*') if p.suffix in ['.svg','.png']]},ensure_ascii=False))
for p in (D/'renders/games').glob('*/categories.svg'):
 dest=T/'public/audit-before'/p.parent.name/p.name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
for p in (D/'renders/games').glob('*/variants.svg'):
 dest=T/'public/audit-projection'/p.parent.name/p.name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
manifest={str(p.relative_to(R)):hashlib.sha256(p.read_bytes()).hexdigest() for folder in ['src','shared','gamepacks','public/game-art','public/carcassonne-art'] for p in (R/folder).rglob('*') if p.is_file()}
for a in json.loads((R/'public/game-art/assets.json').read_text())['assets']:
 if a['classification']=='existing':
  p=Path(a['file']);manifest[str(p)]=hashlib.sha256((R/p).read_bytes()).hexdigest()
receipt=D/'render-source-hashes.json'
if not receipt.exists():receipt.write_text(json.dumps(manifest,indent=2)+'\n')
else:
 before=json.loads(receipt.read_text());assert all(manifest.get(p)==h for p,h in before.items()),'Source changed: use a new audit output directory, do not overwrite the frozen baseline.'
(D/'work-paths.json').write_text(json.dumps({'snapshot':str(T),'output':str(D/'renders'),'sourceFiles':len(manifest),'envRead':False,'AIcalls':0},indent=2)+'\n')
print(T)
