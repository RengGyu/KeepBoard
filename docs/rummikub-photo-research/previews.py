"""Try the published Commons preview links, keeping original-download failures intact."""
import hashlib,json,pathlib,requests
from html.parser import HTMLParser
from PIL import Image
HERE=pathlib.Path(__file__).resolve().parent
class Links(HTMLParser):
 def __init__(self):super().__init__();self.urls=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);url=a.get('href','')
  if tag=='a' and url.startswith('https://thumb.wikimedia.org/') and ('1280px-' in url or '960px-' in url):self.urls.append(url)
rows=[]
for source in json.loads((HERE/'download-results.json').read_text()):
 parser=Links();parser.feed((HERE/source['page_local']).read_text())
 url=next((u for u in parser.urls if '1280px-' in u),parser.urls[0] if parser.urls else None)
 if not url:continue
 row={'id':source['id'],'url':url}
 try:
  response=requests.get(url,timeout=60);row['http_status']=response.status_code;row['retry_after']=response.headers.get('Retry-After');response.raise_for_status()
  path=HERE/'previews'/(source['id']+'.jpg');path.parent.mkdir(exist_ok=True);path.write_bytes(response.content)
  with Image.open(path) as im:im.load();row.update(path=str(path.relative_to(HERE)),width=im.width,height=im.height,sha256=hashlib.sha256(path.read_bytes()).hexdigest())
 except Exception as e:row['error']=str(e)
 rows.append(row);print(json.dumps(row),flush=True)
 if row.get('http_status')==429:break
(HERE/'preview-results.json').write_text(json.dumps(rows,indent=2)+'\n')
