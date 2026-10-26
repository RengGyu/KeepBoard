"""Download only the explicit public Commons sources selected and license-reviewed."""
import hashlib,json,pathlib,requests
from PIL import Image
HERE=pathlib.Path(__file__).resolve().parent
headers={'User-Agent':'KeepBoard research/1.0 (manual Commons attribution study)'}
results=[]
for source in json.loads((HERE/'sources.json').read_text()):
 result={**source}
 for kind,url,relative in [('page',source['page'],f"licenses/{source['id']}.html"),('image',source['image'],f"originals/{source['id']}.jpg")]:
  if not url:continue
  path=HERE/relative;path.parent.mkdir(parents=True,exist_ok=True)
  try:
   response=requests.get(url,headers=headers,timeout=60);response.raise_for_status();data=response.content
   path.write_bytes(data)
   result[kind+'_local']=relative;result[kind+'_sha256']=hashlib.sha256(data).hexdigest()
   if kind=='image':
    with Image.open(path) as im:im.load();result.update(width=im.width,height=im.height,format=im.format,bytes=len(data))
  except Exception as error:result[kind+'_error']=str(error)
 results.append(result)
 print(source['id'],result.get('width'),result.get('height'),result.get('image_error',''),flush=True)
(HERE/'download-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
