import json,collections,math
from pathlib import Path
import numpy as np
from scipy.optimize import linear_sum_assignment
root=Path(__file__).resolve().parent;priv=Path.home()/'Library/Application Support/KeepBoard/research/multiview-followup-20261029'
refs={c['gameId']:c for g in ['sol1','sol2'] for c in json.load(open('docs/twenty-games-pack-study-20261029/references-'+g+'.json'))['cases']}
plan=json.load(open(root/'plan.json'));results=[]
def iou(a,b):
 if not a or not b:return 0
 x=max(0,min(a['x']+a['width'],b['x']+b['width'])-max(a['x'],b['x']));y=max(0,min(a['y']+a['height'],b['y']+b['height'])-max(a['y'],b['y']));inter=x*y
 return inter/(a['width']*a['height']+b['width']*b['height']-inter) if inter else 0
def target(o):
 b=o.get('bbox')
 if not b:
  z=o['box'];b={'x':z[0],'y':z[1],'width':z[2]-z[0],'height':z[3]-z[1]}
 return {'id':o['id'],'kind':o.get('kind',o.get('canonicalKind')),'bbox':b,'attrs':o.get('attributes',o.get('readableAttributes',{}))}
def match(gt,obs):
 pairs=[]
 if obs:
  weights=np.array([[iou(g['bbox'],o['bbox']) if g['kind']==o['kind'] and o['quantity']==1 else 0 for o in obs] for g in gt])
  for i,j in zip(*linear_sum_assignment(-weights)):
   if weights[i,j]>=.25:pairs.append({'referenceId':gt[i]['id'],'predictedId':obs[j]['id'],'iou':float(weights[i,j]),'reference':gt[i],'prediction':obs[j]})
 return pairs
for c in plan['cases']:
 game=c['gameId'];gt=[target(o) for o in refs[game]['objects']];u=json.load(open(priv/(game+'.units.json')));sets={};account={}
 for i,x in enumerate(u):
  receipt=x['observationReceipts'][0];items=[]
  for o in receipt['result']['observations']:
   b=o['bbox']
   if i and b:
    r=c['sourceRegion'];b={'x':r['x']+b['x']*r['width'],'y':r['y']+b['y']*r['height'],'width':b['width']*r['width'],'height':b['height']*r['height']}
   items.append({'id':o['ref'],'kind':o['componentId'],'quantity':o['quantity'],'bbox':b,'attrs':{k:v['value'] for k,v in o['properties'].items() if v['state']=='observed'}})
  sets['whole' if i==0 else 'crop']=items
 for variant in ['whole','combined']:
  projection=json.load(open(priv/(game+'.'+variant+'-projection.json')));pieces=[p for a in projection['assertions'] for p in a['value'].get('pieces',a['value'].get('components',[]))]
  sets[variant+'Projection']=[{'id':o['id'],'kind':o.get('componentId',o.get('kind')),'quantity':o['quantity'],'bbox':o.get('region'),'attrs':o.get('readout',{}).get('values',{})} for o in pieces]
  if variant=='combined':
   groups=projection['scanBundle'].get('unresolvedGroups',[]);ids={p['id'] for p in pieces};receipts=projection['observationReceipts'];rawOnly=[]
   for receipt in receipts:
    for o in receipt['result']['observations']:
     represented=receipt['componentRefs'].get(o['ref']) in ids;inGroup=any(any(m['unitId']==receipt['scanUnitId'] and m['observationRef']==o['ref'] for m in g['members']) for g in groups)
     if not represented and not inGroup:rawOnly.append([receipt['scanUnitId'],o['ref']])
   assert not rawOnly
   account={'projectedPieces':len(pieces),'unresolvedGroups':len(groups),'rawObservations':sum(len(r['result']['observations']) for r in receipts),'rawOnly':rawOnly,'allObservationsRepresentedOrGrouped':True}
 scored={}
 for name,obs in sets.items():
  matches=match(gt,obs);s={'individualMatched':len(matches),'referenceObjects':len(gt),'matchedByKind':dict(collections.Counter(m['reference']['kind'] for m in matches)),'matches':matches,'unmatchedReferenceIds':[g['id'] for g in gt if g['id'] not in {m['referenceId'] for m in matches}]}
  if game=='sagrada':
   valid=[g for g in gt if g['attrs'].get('dieValue') is not None];outcomes=[]
   for g in valid:
    m=next((m for m in matches if m['referenceId']==g['id']),None);value=m['prediction']['attrs'].get('dieValue') if m else None
    outcomes.append({'referenceId':g['id'],'expected':g['attrs']['dieValue'],'actual':value,'correct':value==g['attrs']['dieValue']})
   s['dieValue']={'correct':sum(x['correct'] for x in outcomes),'readableReferenceValues':len(valid),'outcomes':outcomes}
  if game=='splendor-duel':
   outcomes=[{'referenceId':g['id'],'expected':g['attrs'].get('observedColor'),'actual':next((m['prediction']['attrs'].get('observedColor') for m in matches if m['referenceId']==g['id']),None)} for g in gt];s['color']={'correct':sum(x['actual']==x['expected'] for x in outcomes),'reference':len(outcomes)}
  scored[name]=s
 results.append({'gameId':game,'scores':scored,'accounting':account})
report={'scope':'3 frozen error cases; same-original crop, not other-angle/new-detail evidence','reference':'previous pre-output AI references unchanged','matchingRule':'source-coordinate same-kind quantity1 maximum-total-IoU one-to-one assignment; IoU>=0.25; manual review of correspondences required; not whole-photo precision','cases':results}
(root/'scores.json').write_text(json.dumps(report,indent=2)+'\n')
for c in results:
 print(c['gameId'],{v:{'objects':str(s['individualMatched'])+'/'+str(s['referenceObjects']),'dieValue':s.get('dieValue',{}).get('correct'),'color':s.get('color',{}).get('correct')} for v,s in c['scores'].items()},c['accounting'])
