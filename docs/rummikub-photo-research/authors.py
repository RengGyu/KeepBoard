"""Normal public Flickr author pages only; stop on access denial, no API or credentials."""
import json,pathlib,requests,hashlib,sys
from html.parser import HTMLParser
from PIL import Image
HERE=pathlib.Path(__file__).resolve().parent
class Metadata(HTMLParser):
 def __init__(self):super().__init__();self.image=None;self.title=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='meta' and a.get('property')=='og:image':self.image=a.get('content')
  if tag=='meta' and a.get('property')=='og:title':self.title=a.get('content')
rows=[]
for source in json.loads((HERE/'sources.json').read_text()):
 if len(sys.argv)>1 and source['id']!=sys.argv[1]:continue
 if 'author_source' not in source:continue
 row={'id':source['id'],'page':source['author_source']}
 try:
  response=requests.get(source['author_source'],timeout=45);row['http_status']=response.status_code;response.raise_for_status()
  parser=Metadata();parser.feed(response.text);row['title']=parser.title;row['image_url']=parser.image
  if parser.image:
   photo=requests.get(parser.image,timeout=45);row['image_status']=photo.status_code;photo.raise_for_status()
   path=HERE/'author-images'/(source['id']+'.jpg');path.parent.mkdir(exist_ok=True);path.write_bytes(photo.content)
   with Image.open(path) as im:im.load();row.update(path=str(path.relative_to(HERE)),width=im.width,height=im.height,sha256=hashlib.sha256(path.read_bytes()).hexdigest())
 except Exception as error:row['error']=str(error)
 rows.append(row);print(json.dumps(row),flush=True)
 if row.get('http_status') in [401,403,429] or row.get('image_status') in [401,403,429]:break
path=HERE/'author-results.json'
old=json.loads(path.read_text()) if path.exists() and len(sys.argv)>1 else []
path.write_text(json.dumps([r for r in old if r['id'] not in {x['id'] for x in rows}]+rows,indent=2)+'\n')
