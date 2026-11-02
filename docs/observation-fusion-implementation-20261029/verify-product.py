import json,hashlib,collections
from pathlib import Path
import numpy as np
from scipy.optimize import linear_sum_assignment
root=Path(__file__).resolve().parent;priv=Path.home()/'Library/Application Support/KeepBoard/research/observation-fusion-implementation-20261029'
refs={c['gameId']:c for g in ['sol1','sol2'] for c in json.load(open('docs/twenty-games-pack-study-20261029/references-'+g+'.json'))['cases']}
def iou(a,b):
 if not a or not b:return 0
 inter=max(0,min(a['x']+a['width'],b['x']+b['width'])-max(a['x'],b['x']))*max(0,min(a['y']+a['height'],b['y']+b['height'])-max(a['y'],b['y']))
 return inter/(a['width']*a['height']+b['width']*b['height']-inter) if inter else 0
def score(game,v):
 r=json.load(open(priv/(game+'.'+v+'.json')));pieces=[p for a in r['assertions'] for p in a['value'].get('pieces',a['value'].get('components',[]))];gt=[]
 for o in refs[game]['objects']:
  b=o.get('bbox')
  if not b:z=o['box'];b={'x':z[0],'y':z[1],'width':z[2]-z[0],'height':z[3]-z[1]}
  gt.append({'id':o['id'],'kind':o.get('kind',o.get('canonicalKind')),'bbox':b,'attrs':o.get('attributes',o.get('readableAttributes',{}))})
 pairs=[]
 if pieces:
  w=np.array([[iou(g['bbox'],p.get('region')) if g['kind']==p.get('componentId',p.get('kind')) and p['quantity']==1 else 0 for p in pieces] for g in gt])
  for i,j in zip(*linear_sum_assignment(-w)):
   if w[i,j]>=.25:pairs.append({'ref':gt[i]['id'],'pieceId':pieces[j]['id'],'iou':float(w[i,j]),'gt':gt[i],'piece':pieces[j]})
 pips=[]
 for g in gt:
  if g['attrs'].get('dieValue') is None:continue
  p=next((m['piece'] for m in pairs if m['ref']==g['id']),{});actual=p.get('readout',{}).get('values',{}).get('dieValue');pips.append({'ref':g['id'],'expected':g['attrs']['dieValue'],'actual':actual,'correct':actual==g['attrs']['dieValue']})
 duplicate=[]
 for g in gt:
  candidates=[p['id'] for p in pieces if p['quantity']==1 and p.get('componentId',p.get('kind'))==g['kind'] and iou(g['bbox'],p.get('region'))>=.25]
  if len(candidates)>1:duplicate.append({'ref':g['id'],'candidates':candidates})
 # Independently check that linked raw observations known in the reference do not cross physical identities.
 linkedFacts=collections.defaultdict(set)
 for receipt in r.get('observationReceipts',[]):
  rows=receipt['result']['observations'];transforms=receipt.get('transforms',[]);pred=[]
  for o in rows:
   b=o.get('bbox');image=receipt['request']['images'][o['imageIndex']];tr=next((t for t in transforms if t['transformId']==image.get('transformId')),None)
   if b and tr and tr['kind']=='crop':
    matrix=tr['inverseMatrix'];b={'x':matrix[0]*b['x']+matrix[2],'y':matrix[4]*b['y']+matrix[5],'width':matrix[0]*b['width'],'height':matrix[4]*b['height']}
   pred.append({'ref':o['ref'],'kind':o['componentId'],'quantity':o['quantity'],'bbox':b})
  if not pred:continue
  weights=np.array([[iou(g['bbox'],o['bbox']) if g['kind']==o['kind'] and o['quantity']==1 else 0 for o in pred] for g in gt])
  for i,j in zip(*linear_sum_assignment(-weights)):
   if weights[i,j]<.25:continue
   pieceId=receipt.get('componentRefs',{}).get(pred[j]['ref'])
   if pieceId:linkedFacts[pieceId].add(gt[i]['id'])
 wrongLinks={pieceId:sorted(ids) for pieceId,ids in linkedFacts.items() if len(ids)>1}
 assert not wrongLinks
 return {'wrongCrossLinksWithinReference':wrongLinks,'editablePieces':len(pieces),'referenceObjects':len(gt),'matched':len(pairs),'unmatchedReferenceIds':[g['id'] for g in gt if g['id'] not in {x['ref'] for x in pairs}],'matchedPieceIds':[m['pieceId'] for m in pairs],'pips':{'correct':sum(x['correct'] for x in pips),'denominator':len(pips),'outcomes':pips},'duplicateCandidatesWithinReference':duplicate,'matches':[{'referenceId':x['ref'],'pieceId':x['pieceId'],'iou':x['iou']} for x in pairs]}
results=[]
for game in ['cascadia','sagrada','splendor-duel']:
 before=score(game,'before');after=score(game,'after');assert not after['duplicateCandidatesWithinReference'];results.append({'gameId':game,'before':before,'after':after})
a=json.load(open(root/'before-product-replay.json'));b=json.load(open(root/'after-product-replay.json'));assert [x['inputUnitSHA'] for x in a['cases']]==[x['inputUnitSHA'] for x in b['cases']]
report={'status':'VERIFIED_SAME_RESPONSES_CURRENT_PRODUCT','modelCalls':0,'sameSavedUnitInputs':True,'reference':'Frozen AI partial references unchanged; not full-photo accuracy','cases':results}
(root/'supervisor-comparison.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps([{'game':x['gameId'],'objectsBefore':x['before']['matched'],'objectsAfter':x['after']['matched'],'denominator':x['after']['referenceObjects'],'pipsBefore':x['before']['pips']['correct'],'pipsAfter':x['after']['pips']['correct'],'pipDenominator':x['after']['pips']['denominator'],'duplicateCandidates':len(x['after']['duplicateCandidatesWithinReference'])} for x in results]))
