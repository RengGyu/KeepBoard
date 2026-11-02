import json,hashlib,urllib.request,concurrent.futures,subprocess
from pathlib import Path
from datetime import datetime,timezone
root=Path(__file__).resolve().parent
private=Path.home()/'Library/Application Support/KeepBoard/research/twenty-games-pack-study-20261029'
private.mkdir(parents=True,exist_ok=True,mode=0o700)
ids=['azul','blokus','bohnanza','calico','carcassonne','cascadia','codenames','dominion','kingdomino','patchwork','quacks','rummikub','sagrada','scout','hanabi','jaipur','splendor','splendor-duel','ticket-to-ride','tiny-towns']
cases={c['gameId']:c for p in sorted(Path('docs/service-all-games-20261027').glob('cases-*.json')) for c in json.loads(p.read_text()).get('cases',[])}
inventory=json.loads(Path('docs/service-all-games-20261027/inventory.json').read_text())
photos={}
def walk(v):
 if isinstance(v,dict):
  if v.get('sha256') and v.get('imageURL'):photos[v['sha256']]=v
  for x in v.values():walk(x)
 elif isinstance(v,list):
  for x in v:walk(x)
walk(inventory)
selected={}
def select(v):
 if isinstance(v,dict):
  if v.get('gameId') and v.get('selectedPhoto'):selected[v['gameId']]=v['selectedPhoto']
  for x in v.values():select(x)
 elif isinstance(v,list):
  for x in v:select(x)
select(inventory)
rows=[]
for i,k in enumerate(ids):
 c=cases[k].copy();p=photos.get(c['sourceSHA']) or selected[k]
 if c['sourceSHA']!=p['sha256']:c.update(priorUnavailableSHA=c['sourceSHA'],sourceSHA=p['sha256'],width=p['width'],height=p['height'])
 c.update(index=i,sourceURL=p['sourceURL'],imageURL=p['imageURL'],path=str(private/(k+'.jpg')),group='sol1' if i<10 else 'sol2',status='PENDING',license='Private research only; no redistribution claim.');rows.append(c)
def download(c):
 try:
  p=Path(c['path'])
  if p.exists():b=p.read_bytes()
  else:
   b=subprocess.run(['curl','--fail','--silent','--show-error','--location','--max-time','60',c['imageURL']],check=True,capture_output=True).stdout
  actual=hashlib.sha256(b).hexdigest()
  if actual!=c['sourceSHA']:raise ValueError('Original SHA mismatch')
  p.write_bytes(b);p.chmod(0o600);c.update(status='VERIFIED',bytes=len(b))
 except Exception as e:c.update(status='FAILED',error=str(e))
 return c
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:rows=list(pool.map(download,rows))
report={'createdAt':datetime.now(timezone.utc).isoformat(),'caseCount':20,'criterion':'20 non-Catan games with existing physical-photo source manifests, selected before new provider outputs; photo/area assessability must be frozen by visual reference owners before calls.','privateDirectory':str(private),'cases':rows}
(root/'selection-preflight.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'verified':sum(r['status']=='VERIFIED' for r in rows),'failed':[{'id':r['gameId'],'error':r.get('error')} for r in rows if r['status']!='VERIFIED']}))
