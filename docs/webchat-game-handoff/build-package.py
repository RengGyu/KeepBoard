"""Explicit allowlist export; never traverses runtime data or settings."""
from pathlib import Path
import csv, hashlib, io, json, shutil, zipfile, re
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/webchat-game-handoff'
B=OUT/'package'; B.mkdir(exist_ok=True)
files=[]
def copy(rel):
 p=ROOT/rel
 if not p.is_file(): raise RuntimeError('Missing approved reference: '+rel)
 assert not p.is_symlink()
 d=B/'snapshot'/rel; d.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,d);files.append(rel)
def write(rel,value):
 p=B/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(value,encoding='utf8')
def js(rel,v):write(rel,json.dumps(v,ensure_ascii=False,indent=2)+'\n')
core='''package.json tsconfig.json vite.config.ts shared/types.ts shared/genericRecord.ts shared/splendor.ts shared/gameEssentials.ts shared/recognition.ts shared/recognition-index.json shared/privacy.ts shared/rooms.ts shared/boardRecording.ts shared/scene.ts shared/sceneFields.ts shared/rummikub.ts server/ai/generic.ts server/ai/splendor.ts server/ai/index.ts server/ai/fields.ts server/ai/prompt.ts server/ai/response.ts server/ai/rummikubPrompt.ts server/index.ts server/engine.ts server/runtimeResume.ts server/privatePin.ts server/rooms.ts src/SplendorReadout.tsx src/SplendorEditor.tsx src/splendor-readout.css src/GameEssentials.tsx src/game-essentials.css src/GameBoardRecord.tsx src/game-board-record.css src/GenericPieceArt.tsx src/GameComponentArt.tsx src/artCatalog.json src/artResolver.ts src/artLoader.ts src/boardVisuals.ts src/ComponentArt.tsx src/component-art.css src/CarcassonneArt.tsx src/carcassonne-art.css src/SessionWorkspace.tsx src/SceneWorkspace.tsx src/RummikubWorkspace.tsx src/Packing.tsx src/Fields.tsx src/PhotoTargets.tsx src/api.ts src/rummikubSavePolicy.ts gamepacks/catalog.ts gamepacks/catan.ts gamepacks/catanProfile.ts gamepacks/rummikub.ts gamepacks/generated/game-essentials.json gamepacks/generated/game-essentials.manifest.json tools/game-runtime/generate.ts game-specifications/schema.json game-specifications/template.json game-specifications/README.md docs/game-art/README.md'''.split()
# Check actual names without including arbitrary paths.
core=[x for x in core if (ROOT/x).is_file()]
for rel in core:copy(rel)
for rel in sorted((ROOT/'tests').glob('*.test.ts')):
 if any(rel.name.startswith(x) for x in ['splendor-','game-recognition-','game-board-visuals-','art-integration']):copy(rel.relative_to(ROOT).as_posix())
for rel in ['public/game-art/assets.json','public/game-art/boards/mapping.json']:copy(rel)
for rel in sorted((ROOT/'public/game-art/boards').glob('*.svg')):copy(rel.relative_to(ROOT).as_posix())
assets=json.loads((ROOT/'public/game-art/assets.json').read_text())
for a in assets['assets']:
 rel=a['file'].removeprefix('public/')
 rel='public/'+rel if a['classification']=='existing' else 'public/game-art/'+rel
 assert rel.endswith('.svg') and '..' not in Path(rel).parts
 if rel not in files:copy(rel)
packs=json.loads((ROOT/'gamepacks/generated/game-essentials.json').read_text());rows=[];details=[]
for p in packs:
 r=p['runtime'];gid=r['source']['gameId'];specpath=f'docs/research/game-specs-120/games/{gid}.json';mappath=f'public/game-art/games/{gid}/mapping.json'
 copy(specpath);copy(mappath)
 spec=json.loads((ROOT/specpath).read_text());mapping=json.loads((ROOT/mappath).read_text())
 detailed='native' if gid in ['catan','rummikub'] else 'splendor-structured' if gid=='splendor' else 'generic-assisted-no-dedicated-readout'
 row={'gameId':gid,'runtimePackId':p['id'],'title':p['title'],'editionId':r['source']['editionId'],'edition':p['edition'],'packVersion':p['version'],'sourceSHA':r['source']['sha256'],'sourceSHAActual':hashlib.sha256((ROOT/specpath).read_bytes()).hexdigest(),'scope':detailed,'target117':gid not in ['catan','rummikub','splendor'],'sourceURLs':' | '.join((s.get('url') or '') for s in spec.get('sources',[])),'bindings':len(r['fieldBindings']),'components':len(r['components'])}
 rows.append(row);details.append({**row,'source':r['source'],'sourceReferences':spec['sources'],'bindings':r['fieldBindings'],'stateFields':spec['state_fields'],'components':spec['components'],'layout':spec['layout'],'preservation':p['preservationTemplates'],'artMappingPath':'snapshot/'+mappath,'artSourceSHA':mapping['source_sha256']})
js('examples/splendor-manual-synthetic.json',{'notice':'SYNTHETIC manual example, not a model output or real photo. field must match selected pinned binding.','gameId':'splendor','value':{'version':'game-component-record-v1','pieces':[{'id':'synthetic-card-1','componentId':'development','variant':None,'quantity':1,'label':'합성 개발 카드 · 실제 판독 아님','anchor':'수동 예시','evidenceId':None,'region':None,'readout':{'schema':'splendor-v1','kind':'development','points':0,'bonus':'blue','cost':{'white':None,'blue':0,'green':2,'red':None,'black':0},'requirements':None,'color':None,'level':None}}]}})
js('data/games-120.json',details);js('data/targets-117.json',[r for r in details if r['target117']])
for name,rr in [('games-120.csv',rows),('targets-117.csv',[r for r in rows if r['target117']])]:
 buf=io.StringIO();w=csv.DictWriter(buf,fieldnames=list(rows[0]));w.writeheader();w.writerows(rr);write('data/'+name,buf.getvalue())
assert len(rows)==120 and len({r['gameId'] for r in rows})==120 and sum(r['target117'] for r in rows)==117
# Docs are authored separately, then copied to package root by this reproducible exporter.
for p in sorted((OUT/'guide').glob('*.md')):shutil.copyfile(p,B/p.name)
entries=[]
for p in sorted(B.rglob('*')):
 if p.is_file() and p.name!='MANIFEST.json':entries.append({'path':p.relative_to(B).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
js('MANIFEST.json',{'purpose':'reference subset, not standalone application','sourceFiles':sorted(files),'files':entries,'gameCount':120,'targetCount':117})
zpath=OUT/'KeepBoard-WebChat-Pro.zip'
with zipfile.ZipFile(zpath,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(B.rglob('*')):
  if p.is_file():z.write(p,'KeepBoard-WebChat-Pro/'+p.relative_to(B).as_posix())
with zipfile.ZipFile(zpath) as z:assert z.testzip() is None
print(json.dumps({'zip':str(zpath.relative_to(ROOT)),'bytes':zpath.stat().st_size,'files':len(entries)+1,'games':120,'targets':117},ensure_ascii=False))
