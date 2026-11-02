"""Keep oracle information union distinct from actual editable projection."""
import json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parent;P=Path('/private/tmp/kb-ten-games-closeup-video-20261030')
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def iou(a,b):
 z=max(0,min(a[2],b[2])-max(a[0],b[0]))*max(0,min(a[3],b[3])-max(a[1],b[1]))
 return z/((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-z) if z else 0
cases=[]
for game,pre in [('splendor','pilot'),('quacks','quacks')]:
 plan=json.loads((R/f'{pre}-inputs.json').read_text());ref=json.loads(Path(plan['reference']['path']).read_text());assert sha(plan['reference']['path'])==plan['reference']['sha256']
 details={v:json.loads((P/f'{pre}-{v}.score.json').read_text()) for v in 'WCD'}
 correct={v:{(o['referenceId'],a['id']) for o in d['objects'] for a in o['attributes'] if a['status']=='correct'} for v,d in details.items()}
 rawCounts={}
 for v in 'WCD':
  a=json.loads((P/f'{pre}-{v}.parsed.json').read_text())['items'];b=json.loads((P/f'{pre}-{v}.decoded.json').read_text())['observations']
  count=lambda xs,k:{i:sum(x[k]==i for x in xs) for i in sorted({x[k] for x in xs})}
  rawCounts[v]=dict(raw=count(a,'kind'),decoded=count(b,'componentId'));assert rawCounts[v]['raw']==rawCounts[v]['decoded']
 rows=[]
 for label in ['W','W-C','W-D']:
  f=P/f'{pre}-projection-{label}.json';j=json.loads(f.read_text());pieces=[p for a in j['assertions'] for p in a['value'].get('pieces',[])]
  boxes=[]
  for p in pieces:
   b=p.get('region');boxes.append(None if not b else [b['x']*1920,b['y']*1080,(b['x']+b['width'])*1920,(b['y']+b['height'])*1080])
  matrix=[[iou(o['boxesPx']['W'],b) if b else 0 for b in boxes] for o in ref['objects']];matches={}
  for i,vals in enumerate(matrix):
   mx=max(vals,default=0);choices=[k for k,x in enumerate(vals) if abs(x-mx)<1e-9]
   if mx<.25 or len(choices)!=1:continue
   k=choices[0];col=[x[k] for x in matrix]
   if sum(abs(x-mx)<1e-9 for x in col)==1 and max(col)==mx:matches[i]=k
  good=wrong=unknown=missing=0
  for i,o in enumerate(ref['objects']):
   p=pieces[matches[i]] if i in matches else None
   for key in o['scoredPropertyIds']:
    if not p:missing+=1;continue
    readout=p.get('readout',{});v=readout.get('values',readout).get(key)
    if v is None:unknown+=1
    elif v==o['properties'][key]:good+=1
    else:wrong+=1
  rows.append(dict(condition=label,editableRows=len(pieces),targetObjects=len(ref['objects']),targetMatched=len(matches),correctTargetAttributes=good,wrongTargetAttributes=wrong,unknownTargetAttributes=unknown,missingTargetAttributes=missing,receipts=len(j['observationReceipts']),projectionSHA=sha(f)))
 cases.append(dict(gameId=game,rawVsDecodedKinds=rawCounts,oracleInformationUnionCorrectAttributes={'W+C':len(correct['W']|correct['C']),'W+D':len(correct['W']|correct['D'])},actualProductProjection=rows))
(R/'information-vs-projection.json').write_text(json.dumps(dict(cases=cases,calls=0,limitations=['Oracle union selects correct readings using evaluator reference; product does not have that oracle','Current product result measured by saved-response replay, not live app/store/browser','Only bounded frozen targets scored; total editable row count is not accuracy','Different-source automatic registration is not implemented']),ensure_ascii=False,indent=2)+'\n')
print(json.dumps(cases,ensure_ascii=False,indent=2))
