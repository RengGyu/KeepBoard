from PIL import Image,ImageDraw
from pathlib import Path
import json,hashlib
P=Path('/private/tmp/kb-dice-research-20261102/second');P.mkdir(exist_ok=True);base=Path('/private/tmp/kb-terra-crop-oQSwrk');im=Image.open(base/'sagrada.roi.png').convert('RGB');n=json.load(open(base/'sagrada-roi.native.json'));items=json.loads(''.join(c.get('text','')for m in n['output']if m['type']=='message'for c in m['content']))['items'];sheet=Image.new('RGB',(1120,1072),'#dddddd');draw=ImageDraw.Draw(sheet);rows=[]
for j,o in enumerate(items):
 if o['kind']!='dice':continue
 b=o['box_1000'];x,y=b['xmin']*im.width/1000,b['ymin']*im.height/1000;w,h=(b['xmax']-b['xmin'])*im.width/1000,(b['ymax']-b['ymin'])*im.height/1000;box=[max(0,round(x-w*.1)),max(0,round(y-h*.1)),min(im.width,round(x+w*1.1)),min(im.height,round(y+h*1.1))];crop=im.crop(box);i=len(rows);id='item-'+str(j+1);sheet.paste(crop.resize((224,224)),((i%5)*224,(i//5)*268+44));draw.text(((i%5)*224+10,(i//5)*268+12),id,fill='black');rows.append({'id':id,'box':box})
sheet.save(P/'contact.png');json.dump(rows,open(P/'crops.json','w'),indent=2)
json.dump({'maxCalls':2,'methodUnchanged':True,'sourcePhotoSHA':'2eff2ac9593ad4faa2eed32ac850af89105b3b1fc710990d7dfb1d429ce0cbdf','imageSHA':hashlib.sha256((P/'contact.png').read_bytes()).hexdigest(),'noReferenceBoxesInRequest':True,'knownReference':'old frozen19; sensitivity excluding uncertain die-r3c2','notNovelPhoto':'previously tested photo; not previously tested with this method'},open('docs/dice-research-20261102/second-preflight.json','w'),indent=2)
