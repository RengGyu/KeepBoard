from pathlib import Path
import requests,json,hashlib,collections,datetime
D=Path(__file__).parent;BASE='https://keepboard-kappa.vercel.app';m=json.loads((D/'static-manifest.json').read_text());checks=[]
for p in ['index.html','assets/index-C0mKZ3GJ.js','assets/index-u-JBb3AS.css','game-art/assets.json','game-art/boards/mapping.json','manifest.webmanifest']:
 r=requests.get(BASE+('/' if p=='index.html' else '/'+p),timeout=40);sha=hashlib.sha256(r.content).hexdigest();assert r.status_code==200 and sha==m[p]['sha256'],p;checks.append({'path':p,'status':r.status_code,'sha256':sha,'matches':True})
api={};before=json.loads((D/'settings-before.json').read_text())
for key,b in [('local','http://127.0.0.1:4319'),('public',BASE)]:
 h=requests.get(b+'/api/health',timeout=30);assert h.status_code==200;c=requests.get(b+'/api/game-catalog',timeout=30).json();assert len(c)==120;modes=dict(collections.Counter(p['support']['recognition'] for p in c));assert modes=={'assisted':118,'native':2},modes
 v=requests.get(b+'/api/settings',timeout=30).json();s={k:v.get(k) for k in ['configured','provider','model','upstreamProvider','reasoningEffort']};assert s==before[key];api[key]={'health':200,'catalog':len(c),'modes':modes,'settings':s}
(D/'public-assets.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'assets':checks,'API':api,'TLSVerification':True},indent=2)+'\n');print(json.dumps({'assets':len(checks),'API':api}))
