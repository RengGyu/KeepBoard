"""Read-only research/art inputs -> compact, pinned photo-eligibility compatibility index."""
from pathlib import Path
import json,hashlib,sys
R=Path(__file__).resolve().parents[2]
read=lambda p:json.loads((R/p).read_text())
baseline={x['game_id']:x['spec'] for x in read('docs/game-essentials/baseline.json')}
manifest={x['game_id']:x for x in read('docs/game-essentials/manifest.json')['games']}
out={}
for p in sorted((R/'docs/research/game-specs-120/games').glob('*.json')):
 raw=p.read_bytes();s=json.loads(raw);game=s['game_id'];groups=[]
 versions=[(hashlib.sha256(raw).hexdigest(),s)]
 if game in manifest:versions.append((manifest[game]['baseline_sha256'],baseline[game]))
 if game=='agricola':
  old=R/'docs/game-fidelity-audit/corrections/agricola-before.json';versions.append((hashlib.sha256(old.read_bytes()).hexdigest(),json.loads(old.read_bytes())))
 for sha,spec in versions:
  fields=[{'id':f['id'],'type':f['type'],'scope':f['scope'],'visibility':f['visibility'],'photo':'photo' in f.get('acquisition',[]),'componentIds':f.get('component_ids',[]),'areaIds':f.get('area_ids',[])} for f in spec['state_fields']]
  group=next((g for g in groups if g['fields']==fields and g['editionId']==spec['edition']['id']),None)
  if group:group['sha256']=sorted(set(group['sha256']+[sha]))
  else:groups.append({'sha256':[sha],'editionId':spec['edition']['id'],'fields':fields})
 mapping=read('public/game-art/games/'+('catan' if game=='catan' else game)+'/mapping.json')
 out[game]={'sources':groups,'variants':{c['component_id']:[v['name'] for v in c['variants'] if not v.get('unresolved')] for c in mapping['components']}}
text=json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n';target=R/'shared/recognition-index.json'
if '--check' in sys.argv:assert target.read_text()==text,'recognition index drift'
else:target.write_text(text)
print(json.dumps({'games':len(out),'bytes':len(text.encode()),'check':'--check' in sys.argv}))
