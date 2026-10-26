"""Download only this research's explicitly indexed public official sources."""
import concurrent.futures,hashlib,json,pathlib,requests,sys
ROOT=pathlib.Path(__file__).resolve().parent
manifest=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'downloads.json'
items=json.loads(manifest.read_text())
def fetch(item):
 dest=ROOT/'sources'/item['id'];dest.parent.mkdir(exist_ok=True)
 try:
  r=requests.get(item['url'],timeout=35,headers={'User-Agent':'KeepBoard public rules research/1.0'})
  r.raise_for_status();content=r.content
  ext='.pdf' if content.startswith(b'%PDF') else '.html'
  path=dest.with_suffix(ext);path.write_bytes(content)
  return dict(item,status='downloaded',final_url=r.url,path=str(path.relative_to(ROOT)),bytes=len(content),sha256=hashlib.sha256(content).hexdigest())
 except Exception as e:return dict(item,status='unavailable',error=str(e)[:250])
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(fetch,items))
(manifest.with_name(manifest.stem+'-results.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
for r in results:print(r['id'],r['status'],r.get('bytes',r.get('error')))
