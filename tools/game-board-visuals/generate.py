from pathlib import Path
import hashlib,json,collections,sys,re
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'public/game-art/boards';OUT.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
CHECK='--check' in sys.argv
def emit(path,text):
 if CHECK:assert path.exists() and path.read_text()==text,'Generated visual artifact differs: '+str(path)
 else:path.write_text(text)
pending={}
for item in json.loads((ROOT/'docs/game-board-visuals/fidelity-pending.json').read_text())['items']:
 pending.setdefault(item['gameId'],[]).append({k:v for k,v in item.items() if k!='gameId'})
rows=[];originals={str(p.relative_to(ROOT)):sha(p) for p in (ROOT/'public/game-art').rglob('*') if p.is_file() and 'boards' not in p.relative_to(ROOT/'public/game-art').parts}
for p in sorted((ROOT/'docs/research/game-specs-120/games').glob('*.json')):
 s=json.loads(p.read_text());g=s['game_id']
 if g=='rummikub':continue
 m=json.loads((ROOT/f'public/game-art/games/{g}/mapping.json').read_text());safe=lambda a:a['visibility']=='public' and a['scope'] in ['public','player'] or a['visibility']=='owner' and a['scope']=='player'
 arts=[c for c in m['components'] if c['kind']=='board' and c['status']!='unclear'];primary=next((a for a in s['layout']['areas'] if safe(a)),None)
 status='reuse' if g in ['catan','carcassonne'] or arts else 'source-pending' if primary and primary['topology'] in ['graph','hex'] and not primary['dynamic'] else 'new' if primary else 'not-needed'
 areas=[]
 for a in s['layout']['areas']:
  ok=safe(a);template='personal-tray' if a['scope']=='player' and a['topology']=='zone' else {'grid':'square-mat','hex':'hex-mat','track':'track-mat','stack':'card-lanes','zone':'card-lanes' if any(c['kind']=='card' and c['id'] in a['component_ids'] for c in s['components']) else 'free-table'}.get(a['topology'],'free-table')
  ref=next((c for c in arts if c['component_id'] in a['component_ids']),None)
  areas.append({'areaId':a['id'],'label':a['name'],'fieldKeys':[f['id'] for f in s['state_fields'] if a['id'] in f.get('area_ids',[])],'componentIds':a['component_ids'],'scope':a['scope'],'visibility':a['visibility'],'topology':a['topology'],'template':template,'status':'not-needed' if not ok else 'reuse' if g=='catan' or ref or g=='carcassonne' else 'source-pending' if a['topology'] in ['graph','hex','grid','track'] and a.get('confidence') not in ['verified'] else 'new','geometryStatus':'native' if g=='catan' else 'manual-surface','sourceRefs':a['source_refs'],'sourceConfidence':a['confidence'],'artComponentId':ref['component_id'] if ref else None})
 rows.append({'gameId':g,'editionId':s['edition']['id'],'sourceSHA':sha(p),'status':status,'areas':areas,'fidelityPending':pending.get(g,[])})
assert len(rows)==119 and sum(len(r['areas']) for r in rows)==522
emit(OUT/'mapping.json',json.dumps({'version':'board-visuals-v1','games':rows},ensure_ascii=False,indent=2)+'\n')
# Open-ended guide patterns are intentionally not finite game slots or printed tracks.
patterns={
 'free-table':'<path d="M15 20h35m-35 5h18M550 375h35m-18 5h18" stroke="#b9aa8c" opacity=".35"/>',
 'square-mat':'<defs><pattern id="guide" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#738d87" stroke-width=".7" opacity=".13"/></pattern></defs><rect width="600" height="400" fill="url(#guide)"/>',
 'hex-mat':'<defs><pattern id="guide" width="72" height="62.35" patternUnits="userSpaceOnUse"><path d="M18 0L0 31.175l18 31.175h36l18-31.175L54 0Z" fill="none" stroke="#8b976e" stroke-width=".7" opacity=".14"/></pattern></defs><rect width="600" height="400" fill="url(#guide)"/>',
 'personal-tray':'<path d="M14 368h572l-14 15H28Z" fill="#bba070" stroke="#657468"/><path d="M28 383h544v7H28Z" fill="#99835d" opacity=".65"/>',
 'card-lanes':'<defs><pattern id="guide" width="600" height="96" patternUnits="userSpaceOnUse"><path d="M18 94h564" stroke="#7b969d" stroke-width="1" opacity=".18"/></pattern></defs><rect width="600" height="400" fill="url(#guide)"/>',
 'track-mat':'<path d="M16 335C165 335 435 335 584 335" stroke="#a79066" stroke-width="10" opacity=".18" stroke-linecap="round"/><path d="M16 335h568" stroke="#a79066" stroke-width="1" opacity=".35"/>'}
for name,body in patterns.items():
 color={'personal-tray':'#f1e8d5','card-lanes':'#eaf1ee','square-mat':'#eaf0e8','hex-mat':'#edf0df','track-mat':'#f0eadd'}.get(name,'#eee8d8')
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><rect x="1" y="1" width="598" height="398" rx="18" fill="{color}" stroke="#c9c9b5"/>{body}</svg>\n'
 emit(OUT/f'{name}.svg',svg)
coverage={'version':'board-visuals-v1','gameCount':len(rows),'areaCount':sum(len(r['areas']) for r in rows),'gameStatus':dict(collections.Counter(r['status'] for r in rows)),'hiddenAreaCount':sum(a['status']=='not-needed' for r in rows for a in r['areas']),'knownFidelityPending':[{'gameId':game,**finding} for game,findings in pending.items() for finding in findings],'originalAssetHashes':originals,'unboundSourceAreas':[{'gameId':r['gameId'],'areaId':a['areaId']} for r in rows for a in r['areas'] if not a['fieldKeys']],'mappingSHA':sha(OUT/'mapping.json')}
emit(ROOT/'docs/game-board-visuals/coverage.json',json.dumps(coverage,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in coverage.items() if k!='originalAssetHashes'},ensure_ascii=False))
