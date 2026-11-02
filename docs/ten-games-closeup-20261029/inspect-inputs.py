# Bounded public source retrieval only. No model/OCR/runtime access.
import json,pathlib,hashlib,os,concurrent.futures,subprocess
from PIL import Image,ImageOps,ImageDraw
D=pathlib.Path('/private/tmp/kb-ten-games-closeup-20261029');D.mkdir(mode=0o700,exist_ok=True)
M=json.load(open('docs/game-photo-corpus/manifest.json'));S=json.load(open('docs/twenty-games-pack-study-20261029/selection-preflight.json'))
gids=['blokus','bohnanza','calico','carcassonne','cascadia','quacks','sagrada','splendor','splendor-duel','ticket-to-ride']
rows=[]
for g in gids:
 c=next(c for c in S['cases'] if c['gameId']==g);p=pathlib.Path(c['path']);assert hashlib.sha256(p.read_bytes()).hexdigest()==c['sourceSHA'];
 alts=[i for i in M['images'] if i['gameId']==g and i['pageUrl']!=c['sourceURL'] and i.get('shotType')=='physical-play']
 if not alts:alts=[i for i in M['images'] if i['gameId']==g and i['pageUrl']!=c['sourceURL']][:1]
 rows.append({'gameId':g,'whole':c,'candidates':alts[:1]})
def retrieve(item):
 p=D/(item['gameId']+'-'+item['sha256']+'.jpg')
 if not p.exists():
  b=subprocess.run(['curl','--fail','--silent','--show-error','--max-time','25',item['imageUrl']],check=True,capture_output=True).stdout
  assert len(b)<12_000_000
  p.write_bytes(b);p.chmod(0o600)
 b=p.read_bytes();assert hashlib.sha256(b).hexdigest()==item['sha256'];im=Image.open(p);im.load();return {**item,'path':str(p),'verifiedSHA':hashlib.sha256(b).hexdigest(),'actualDimensions':list(im.size)}
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:
 for row in rows:
  out=[]
  for item in row['candidates']:
   try:out.append(pool.submit(retrieve,item))
   except Exception as e:out.append({'error':type(e).__name__})
  row['futures']=out
 for row in rows:
  out=[]
  for f in row.pop('futures'):
   try:out.append(f.result())
   except Exception as e:out.append({'error':type(e).__name__,'message':str(e)[:150]})
  row['candidateFiles']=out
(D/'inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));(D/'inventory.json').chmod(0o600)
for batch in range(5):
 sheet=Image.new('RGB',(1400,1200),'white');draw=ImageDraw.Draw(sheet)
 for j,row in enumerate(rows[batch*2:batch*2+2]):
  for k,desc in enumerate([row['whole'],*row['candidateFiles']][:2]):
   loc=desc.get('path');y=j*600
   draw.text((k*700+10,y+10),row['gameId']+' '+('W'if k==0 else 'candidate D'),fill='black')
   if loc and pathlib.Path(loc).exists():
    im=ImageOps.exif_transpose(Image.open(loc)).convert('RGB');im.thumbnail((690,565));sheet.paste(im,(k*700+(700-im.width)//2,y+35))
 sheet.save(D/f'contact-{batch+1}.jpg');(D/f'contact-{batch+1}.jpg').chmod(0o600)
print(json.dumps({'rows':len(rows),'downloaded':sum('path'in i for r in rows for i in r['candidateFiles']),'errors':[{r['gameId']:i}for r in rows for i in r['candidateFiles']if'error'in i],'privateInventory':str(D/'inventory.json')}))
