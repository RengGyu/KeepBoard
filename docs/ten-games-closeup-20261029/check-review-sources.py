# Only exact public article images; no provider API, extraction pipeline, or original edits.
import pathlib,subprocess,json,hashlib,concurrent.futures
from PIL import Image,ImageDraw
D=pathlib.Path('/private/tmp/kb-ten-games-closeup-20261029')
items=[('duel-gems','https://cdn.mos.cms.futurecdn.net/vLay4yHE5gtBYn3jnaZq5E.jpg','https://www.gamesradar.com/splendor-duel-review/'),('duel-cards','https://cdn.mos.cms.futurecdn.net/8HAC8iXLCCQRVVSK2bEJyk.jpg','https://www.gamesradar.com/splendor-duel-review/'),('duel-board','https://cdn.mos.cms.futurecdn.net/NkSeSSL3QG3zNFdfV6ydGa.jpg','https://www.gamesradar.com/splendor-duel-review/'),('sagrada-window','https://www.spritesanddice.com/media/images/sagrada_review_3.width-1080.jpg','https://www.spritesanddice.com/reviews/sagrada-review/'),('sagrada-table','https://www.spritesanddice.com/media/images/sagrada_review.width-1080.jpg','https://www.spritesanddice.com/reviews/sagrada-review/'),('sagrada-play','https://www.spritesanddice.com/media/images/sagrada_review_2.width-1080.jpg','https://www.spritesanddice.com/reviews/sagrada-review/')]
def one(i):
 id,url,page=i;p=D/(id+'.jpg')
 try:
  if not p.exists():p.write_bytes(subprocess.run(['curl','--fail','--silent','--show-error','--max-time','25',url],check=True,capture_output=True).stdout);p.chmod(0o600)
  im=Image.open(p);im.load();return {'id':id,'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'width':im.width,'height':im.height,'imageURL':url,'sourceURL':page}
 except Exception as e:return {'id':id,'imageURL':url,'sourceURL':page,'error':type(e).__name__}
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:rows=list(pool.map(one,items))
(D/'review-sources.json').write_text(json.dumps(rows,indent=2));(D/'review-sources.json').chmod(0o600)
for n in range(2):
 sheet=Image.new('RGB',(1500,1350),'white');draw=ImageDraw.Draw(sheet)
 for j,r in enumerate(rows[n*3:n*3+3]):
  y=j*450;draw.text((10,y+10),r['id'],fill='black')
  if 'path'in r:
   im=Image.open(r['path']).convert('RGB');im.thumbnail((1450,415));sheet.paste(im,((1500-im.width)//2,y+35))
 sheet.save(D/f'reviews-{n+1}.jpg');(D/f'reviews-{n+1}.jpg').chmod(0o600)
print(json.dumps({'downloaded':sum('path'in r for r in rows),'total':len(rows),'errors':[r for r in rows if'error'in r]}))
