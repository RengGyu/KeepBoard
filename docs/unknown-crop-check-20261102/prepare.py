import json,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
P=Path('/private/tmp/kb-unknown-crop-check-20261102');cs=json.load(open('docs/terra-ten-new-20261102/root/cases.json'))+json.load(open('docs/terra-ten-new-20261102/worker/cases.json'));targets={'carcassonne':{'followers-25':['observedColor']},'rummikub':{'numbers-33':['color']},'ticket-to-ride':{'trains-06':['observedColor'],'trains-07':['observedColor']},'new-codenames':{'word-r3c5':['word'],'word-r4c5':['word']},'new-patchwork':{f'leather-{i}':['shape','face']for i in range(1,6)}};rows=[];sheet=Image.new('RGB',(1200,1080),'#dddddd');draw=ImageDraw.Draw(sheet)
for c in cs:
 if c['id']not in targets:continue
 im=Image.open(c['path']).convert('RGB');r=json.load(open(c['referencePath']))
 for o in r['objects']:
  if o['id']not in targets[c['id']]:continue
  x0,y0,x1,y1=o['boxPx'];w=x1-x0;h=y1-y0;b=[max(0,int(x0-w*.15)),max(0,int(y0-h*.15)),min(im.width,int(x1+w*.15)),min(im.height,int(y1+h*.15))];crop=im.crop(b);scale=min(290/crop.width,290/crop.height);crop=crop.resize((round(crop.width*scale),round(crop.height*scale)));i=len(rows);id=f'crop-{i+1}';x,y=(i%4)*300,(i//4)*360;sheet.paste(crop,(x+(300-crop.width)//2,y+50+(290-crop.height)//2));draw.text((x+10,y+10),id,fill='black');rows.append({'id':id,'caseId':c['id'],'objectId':o['id'],'properties':targets[c['id']][o['id']],'referenceBox':o['boxPx'],'cropBox':b,'expected':{p:o['attributes'].get(p)for p in targets[c['id']][o['id']]},'imageSHA':c['sha256']})
sheet.save(P/'contact.png');json.dump(rows,open(P/'targets.json','w'),indent=2);json.dump({'maxCalls':2,'retries':0,'originalUnknownMissingUniqueFacts':28,'protocol':'Diagnostic oracle crops from fixed reference boxes, not production recovery. No crop of occluded Carcassonne negatives; hidden values must remain unknown. No expected answers in prompt. Two exact same calls; no tuning. Existing originals only. No product changes.','targets':rows,'contactSHA':hashlib.sha256((P/'contact.png').read_bytes()).hexdigest()},open('docs/unknown-crop-check-20261102/preflight.json','w'),indent=2)
