"""Normal public official PDF requests only; one attempt per URL, no bypass."""
import concurrent.futures, datetime, hashlib, json, urllib.request
from pathlib import Path
out=Path(__file__).resolve().parent
local={x['gameId'] for x in json.loads((out/'local-documents.json').read_text())}
tasks=[]
for g in json.loads((out/'claims.json').read_text()):
 if g['gameId'] in local:continue
 source=next((s for s in g['sources'] if s.get('url') and '.pdf' in s['url'].lower()),None)
 if source:tasks.append((g['gameId'],source['url']))
tasks += [('age-of-innovation','https://capstone-games.com/cdn/shop/files/AoI_rules_EN_V1-1_reduced.pdf?v=10451577216657094607')]
(out/'sources').mkdir(exist_ok=True)
def fetch(task):
 game,url=task;receipt=dict(gameId=game,url=url,accessedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),rights='Publisher copyright retained; public research copy, not redistribution/production-art permission.')
 try:
  with urllib.request.urlopen(url,timeout=35) as r:
   data=r.read(35_000_001);receipt.update(httpStatus=r.status,finalURL=r.url,contentType=r.headers.get('Content-Type'))
  if len(data)>35_000_000:raise ValueError('bounded download exceeds 35MB')
  if not data.startswith(b'%PDF'):raise ValueError('response not PDF')
  file=out/'sources'/(game+'.pdf');file.write_bytes(data)
  receipt.update(saved=True,path=str(file.relative_to(out.parents[2])),bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
 except Exception as e:receipt.update(saved=False,error=type(e).__name__+': '+str(e))
 return receipt
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(fetch,tasks))
(out/'download-receipts.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
for r in results:print(r['gameId'],r.get('httpStatus',r.get('error')),r['saved'])
