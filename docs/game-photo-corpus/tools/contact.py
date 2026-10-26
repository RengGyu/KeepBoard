import json,os,math,argparse
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
p=argparse.ArgumentParser();p.add_argument('--offset',type=int,default=0);p.add_argument('--count',type=int,default=12);p.add_argument('--all',action='store_true');a=p.parse_args()
m=json.load(open('docs/game-photo-corpus/manifest.json'));notes=json.load(open('docs/game-photo-corpus/reviews-sol.json'));imgs=[i for i in m['images'] if i.get('localPath') and os.path.exists(i['localPath']) and (a.all or i['shotType']=='unclassified' and i['sha256'] not in notes)][a.offset:a.offset+a.count]
root=Path(m['privateDir']).parent/'sheets';root.mkdir(mode=0o700,exist_ok=True)
w,h,cols=420,375,4;sheet=Image.new('RGB',(w*cols,h*math.ceil(len(imgs)/cols)),(244,244,244));d=ImageDraw.Draw(sheet)
for n,i in enumerate(imgs):
 with Image.open(i['localPath']) as im:
  im=ImageOps.exif_transpose(im);im.thumbnail((w-8,h-64));x=(n%cols)*w+(w-im.width)//2;y=(n//cols)*h+56;sheet.paste(im,(x,y))
 label=f"{i['gameId']} | {i['sha256'][:8]}\n{i['width']}x{i['height']} | {(i.get('caption') or '')[:48]}";d.text(((n%cols)*w+6,(n//cols)*h+3),label,fill=(20,20,20))
f=root/f"sheet-{a.offset}-{a.count}-{'all' if a.all else 'pending'}.jpg";sheet.save(f,quality=90);os.chmod(f,0o600);print(f);print(json.dumps([(i['gameId'],i['sha256'][:8]) for i in imgs]))
