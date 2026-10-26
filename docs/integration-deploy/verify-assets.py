from pathlib import Path
import requests,json,hashlib,concurrent.futures,datetime
D=Path(__file__).parent;BASE='https://keepboard-kappa.vercel.app';manifest=json.loads((D/'static-manifest.json').read_text())
paths=['index.html','assets/index-B_n9th97.js','assets/index-CsGPTF4d.css','manifest.webmanifest','favicon.svg','game-art/assets.json','game-art/boards/mapping.json','game-art/common/piece-building.svg','game-art/common/piece-bridge.svg']
paths.extend(p for p in manifest if p.startswith('brand/cartoon-v2/web/') and p.endswith('.jpg'))
plans=json.loads(Path('docs/game-art/fidelity-corrections.json').read_text())
paths.extend('game-art/games/'+key.split(':')[0]+'/mapping.json' for key in plans)
m=json.loads(Path('public/game-art/games/king-of-tokyo/mapping.json').read_text());reg={a['asset_id']:a for a in json.loads(Path('public/game-art/assets.json').read_text())['assets']}
for c in m['components']:
 for v in c['variants']:
  if v.get('die_type')=='extra' and not v.get('unresolved'):paths.extend('game-art/'+reg[l['asset_id']]['file'] for l in v['layers'])
def one(p):
 r=requests.get(BASE+('/' if p=='index.html' else '/'+p),timeout=40);h=hashlib.sha256(r.content).hexdigest()
 assert r.status_code==200 and h==manifest[p]['sha256'],p
 return {'path':p,'status':r.status_code,'sha256':h,'matchesStageAndDist':True,'type':r.headers.get('content-type')}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:assets=list(ex.map(one,sorted(set(paths))))
h=requests.get(BASE+'/?ui=new-board',timeout=30);assert h.status_code==200 and hashlib.sha256(h.content).hexdigest()==manifest['index.html']['sha256']
before=json.loads((D/'settings-before.json').read_text());apis={}
for key,b in [('local','http://127.0.0.1:4319'),('public',BASE)]:
 health=requests.get(b+'/api/health',timeout=30);health.raise_for_status();cat=requests.get(b+'/api/game-catalog',timeout=30);cat.raise_for_status();assert len(cat.json())==120
 s=requests.get(b+'/api/settings',timeout=30);s.raise_for_status();v=s.json();settings={k:v.get(k) for k in ['configured','provider','model','upstreamProvider','reasoningEffort']};assert settings==before[key]
 apis[key]={'health':health.status_code,'catalogCount':len(cat.json()),'settings':settings}
out={'status':'PASS','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'assets':assets,'deepLink':200,'API':apis,'TLSVerification':True}
(D/'asset-verification.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':'PASS','assets':len(assets),'APIs':apis}))
