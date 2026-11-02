import json,hashlib,pathlib
from PIL import Image,ImageDraw
P=pathlib.Path('/private/tmp/kb-dice-research-20261102');im=Image.open('/private/tmp/kb-terra-ten-new-20261102/sagrada.jpg').convert('RGB');d=json.load(open('/private/tmp/kb-terra-detail-20261102/sagrada-default-replay.decoded.json'));rows=[];sheet=Image.new('RGB',(1120,1072),'#dddddd');draw=ImageDraw.Draw(sheet)
for o in d['raw']['observations']:
 if o['componentId']!='dice':continue
 b=o['bbox'];x,y,w,h=b['x']*im.width,b['y']*im.height,b['width']*im.width,b['height']*im.height
 box=[max(0,round(x-w*.1)),max(0,round(y-h*.1)),min(im.width,round(x+w*1.1)),min(im.height,round(y+h*1.1))];crop=im.crop(box);n=len(rows);crop.resize((224,224)).save(P/(o['ref']+'.png'));sheet.paste(crop.resize((224,224)),((n%5)*224,(n//5)*268+44));draw.text(((n%5)*224+10,(n//5)*268+12),o['ref'],fill='black');rows.append({'id':o['ref'],'providerBox':b,'cropBox':box,'legacyValue':o['properties']['dieValue'],'path':str(P/(o['ref']+'.png'))})
sheet.save(P/'contact.png');json.dump(rows,open(P/'crops.json','w'),indent=2)
plan={'imageSHA':hashlib.sha256(im.tobytes()).hexdigest(),'providerBoxesOnly':True,'cropMargin':.1,'stretchSize':224,'model':'G-G-Games/diecamera-models/dice-value-cls.onnx','classifierPreprocessing':'RGB 224x224, ImageNet normalization as model card, both unrestricted and d6-only argmax reported','apiMaxCalls':2,'apiCondition':'same contact sheet twice; independent pip-centre enumeration on visible upper faces; no reference answers, no retraining/threshold tuning','reference':'existing audited AI reference, 19 known die values; not human certified','noProductIntegration':True}
json.dump(plan,open('docs/dice-research-20261102/preflight.json','w'),indent=2)
