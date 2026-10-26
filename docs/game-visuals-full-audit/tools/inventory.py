"""Read current public/source metadata only. Writes this audit folder; no Store/network/AI."""
from pathlib import Path
import json,hashlib,csv,collections,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'docs/game-visuals-full-audit'
def load(p):return json.loads((ROOT/p).read_text())
def sha(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
assets=load('public/game-art/assets.json')['assets'];games=load('public/game-art/games.json')['games'];packs=load('gamepacks/generated/game-essentials.json');boards=load('public/game-art/boards/mapping.json')['games']
assert len(packs)==len(games)==120
by_game={g['game_id']:g for g in games};by_board={g['gameId']:g for g in boards};by_asset={a['asset_id']:a for a in assets}
assert len(by_asset)==len(assets)
rows=[];errors=[];protected={}
for folder in ['public/game-art','public/carcassonne-art','gamepacks/generated','src/readouts','shared/readouts']:
 for p in sorted((ROOT/folder).rglob('*')):
  if p.is_file():protected[str(p.relative_to(ROOT))]=sha(str(p.relative_to(ROOT)))
for p in ['src/GenericPieceArt.tsx','src/GameComponentArt.tsx','src/GameBoardRecord.tsx','src/boardVisuals.ts','src/artResolver.ts','src/artLoader.ts','src/ComponentArt.tsx','src/CarcassonneArt.tsx','src/RummikubBoard.tsx','src/SceneEditor.tsx']:
 protected[p]=sha(p)
for pack in packs:
 runtime=pack['runtime'];game=runtime['source']['gameId'];mapping=by_game[game];board=by_board.get(game);spec=load(mapping['source_spec']);components=mapping['components'];local_errors=[]
 if mapping['source_sha256']!=runtime['source']['sha256']:local_errors.append('mapping-pack-sourceSHA')
 if sha(mapping['source_spec'])!=mapping['source_sha256']:local_errors.append('mapping-spec-sourceSHA')
 if [c['component_id'] for c in components]!=[c['id'] for c in spec['components']]:local_errors.append('component-id/order')
 missing=[]
 for c in components:
  for v in c['variants']:
   for layer in v['layers']:
    if layer['asset_id'] not in by_asset:missing.append(layer['asset_id'])
 if missing:local_errors.append('missing-layer-asset')
 for b in runtime['fieldBindings']:
  if any(cid not in [c['id'] for c in runtime['components']] for cid in b['componentIds']):local_errors.append('binding-component')
 if board and board['sourceSHA']!=runtime['source']['sha256']:local_errors.append('board-pack-sourceSHA')
 row={'gameId':game,'packId':pack['id'],'edition':pack['edition'],'editionId':runtime['source']['editionId'],'packVersion':pack['version'],'sourceSHA':runtime['source']['sha256'],'recording':runtime['support']['recording'],'components':len(components),'variants':sum(len(c['variants']) for c in components),'unresolvedVariants':sum(bool(v.get('unresolved')) for c in components for v in c['variants']),'unclearComponents':sum(c['status']=='unclear' for c in components),'areas':len(board['areas']) if board else 0,'boardTemplates':sorted(set(a['template'] for a in board['areas'])) if board else [],'componentCatalogFields':sum(b['editor']=='component-catalog' for b in runtime['fieldBindings']),'mappingPath':f'public/game-art/games/{game}/mapping.json','renderStatus':'NOT_STARTED','humanVisualStatus':'NOT_STARTED','sheetPath':None,'metadataErrors':local_errors,'limits':'Metadata only; neutral board is a manual recording surface, not an actual printed game board.'}
 rows.append(row);errors.extend([{'gameId':game,'error':e} for e in local_errors])
asset_files=[]
for a in assets:
 path=a['file'] if a['classification']=='existing' else 'public/game-art/'+a['file'];p=ROOT/path
 if not p.is_file():errors.append({'assetId':a['asset_id'],'error':'missing-file','path':path})
 asset_files.append({'assetId':a['asset_id'],'path':path,'exists':p.is_file()})
raw=[p for folder in ['public/game-art','public/carcassonne-art'] for p in (ROOT/folder).rglob('*') if p.suffix.lower() in ['.svg','.png']]
xml=[]
for p in raw:
 if p.suffix=='.svg':
  try:ET.parse(p)
  except ET.ParseError as e:xml.append({'path':str(p.relative_to(ROOT)),'error':str(e)})
summary={'games':len(rows),'components':sum(r['components'] for r in rows),'variants':sum(r['variants'] for r in rows),'registeredAssets':len(assets),'assetClassifications':dict(collections.Counter(a['classification'] for a in assets)),'boardGames':len(boards),'boardAreas':sum(len(b['areas']) for b in boards),'boardTemplates':sorted(set(a['template'] for b in boards for a in b['areas'])),'rawSVG':sum(p.suffix=='.svg' for p in raw),'rawPNG':sum(p.suffix=='.png' for p in raw),'metadataErrors':errors,'xmlParseErrors':xml,'renderedGames':0,'humanVisuallyInspectedGames':0,'productWrites':0,'AIcalls':0,'limitations':['No SVG fragment/clip geometry or browser raster check completed yet.','No new source/game-rule verification; previous evidence is reference material only.','No actual user records or photographs were read.']}
for name,data in [('games.json',rows),('asset-files.json',asset_files),('summary.json',summary),('baseline-hashes.json',protected)]:
 (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
with (OUT/'games.csv').open('w',newline='',encoding='utf-8-sig') as f:
 writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
print(json.dumps({k:v for k,v in summary.items() if k not in ['metadataErrors','xmlParseErrors']},ensure_ascii=False));print('metadataErrors',len(errors),'xmlErrors',len(xml))
