"""Dev Quacks C scoring: frozen evaluate() copied verbatim from terra-comparison/score.py; same reference, variant C."""
import json,hashlib,collections
from pathlib import Path
R=Path(__file__).resolve().parent;OLD=R.parent/'ten-games-closeup-20261029'/'video-attempt'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def iou(a,b):
 x=max(0,min(a[2],b[2])-max(a[0],b[0]));y=max(0,min(a[3],b[3])-max(a[1],b[1]));z=x*y
 return z/((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-z) if z else 0
def evaluate(ref,image,obs,variant,invalid_count=0):
 pred=[]
 for x in obs:
  b=x['bbox'];pred.append(None if not b or x['quantity'] is not None and x['quantity']>1 else [b['x']*image['width'],b['y']*image['height'],(b['x']+b['width'])*image['width'],(b['y']+b['height'])*image['height']])
 matrix=[[iou(o['boxesPx'][variant],b) if b else 0 for b in pred] for o in ref['objects']];matches={}
 for i,vals in enumerate(matrix):
  mx=max(vals,default=0);choices=[j for j,x in enumerate(vals) if abs(x-mx)<1e-9]
  if mx<.25 or len(choices)!=1:continue
  j=choices[0];col=[x[j] for x in matrix]
  if abs(mx-max(col))<1e-9 and sum(abs(x-max(col))<1e-9 for x in col)==1:matches[i]=j
 details=[];correct=wrong=unknown=missing=0
 for i,o in enumerate(ref['objects']):
  j=matches.get(i);x=obs[j] if j is not None else None;attrs=[]
  for k in o['scoredPropertyIds']:
   q=x['properties'].get(k) if x else None;actual=q.get('value') if q else None
   status='missing-object' if not x else 'unknown' if not q or q['state']!='observed' else 'correct' if actual==o['properties'][k] else 'wrong'
   correct+=status=='correct';wrong+=status=='wrong';unknown+=status=='unknown';missing+=status=='missing-object'
   attrs.append(dict(id=k,expected=o['properties'][k],actual=actual,status=status))
  component_correct=bool(x and x['componentId']==o['componentId'])
  details.append(dict(referenceId=o['id'],predictedRef=x['ref'] if x else None,iou=matrix[i][j] if j is not None else None,
   individualDetected=x is not None,componentKindCorrect=component_correct,
   correctKind=component_correct and (ref['gameId']!='splendor' or x['properties'].get('kind',{}).get('value')=='development'),
   outcome='matched' if x else 'unresolved-source-correspondence-invalid-boxes-present' if invalid_count else 'not-individually-recovered',attributes=attrs))
 metrics=dict(referenceObjects=len(ref['objects']),individualDetected=len(matches),componentKindCorrect=sum(x['componentKindCorrect'] for x in details),legacySubtypeConfirmed=sum(x['correctKind'] for x in details),
  readableAttributes=sum(len(o['scoredPropertyIds']) for o in ref['objects']),correctAttributes=correct,wrongAttributes=wrong,unknownAttributes=unknown,notRecoveredAttributes=missing,
  unmatchedReferenceObjects=len(ref['objects'])-len(matches),unresolvedReferenceObjects=len(ref['objects'])-len(matches) if invalid_count else 0,
  missingOrGroupedReferenceObjects=0 if invalid_count else len(ref['objects'])-len(matches))
 metrics['unmatchedValidRawRows']=len(obs)-len(matches)
 return metrics,details

inputs=json.loads((OLD/'quacks-inputs.json').read_text());ref=json.loads(Path(inputs['reference']['path']).read_text());assert sha(inputs['reference']['path'])==inputs['reference']['sha256']
image=next(x for x in inputs['images'] if x['variant']=='C');plan=json.loads((R/'plan-dev.json').read_text());ledger=json.loads((R/'plan-dev-ledger.json').read_text())
rows=[]
for c in plan['calls']:
 l=next(x for x in ledger if x['id']==c['id']);base=Path(plan['privateDir'])/c['id']
 obs=json.loads((base.with_suffix('.decoded.json')).read_text())['observations'] if l['state']=='decoded' else []
 m,det=evaluate(ref,image,obs,'C')
 raw=json.loads(base.with_suffix('.parsed.json').read_text())['items']
 fields=collections.Counter()
 for x in raw:
  if x['kind']!='chips':continue
  ids={a['id']:a for a in x['attributes']}
  for k in ['observedColor','chipColor','chipNumber']:fields[(k,'omitted' if k not in ids else 'observed' if ids[k]['valueJson'] is not None else ids[k]['unknownReason'])]+=1
 attr=collections.Counter((a['id'],a['status']) for d in det for a in d['attributes'])
 rows.append(dict(id=c['id'],variant=c['variant'],repeat=c['repeat'],ms=l['ms'],usage=dict(input=l['usage']['input_tokens'],output=l['usage']['output_tokens'],reasoning=l['usage'].get('output_tokens_details',{}).get('reasoning_tokens')),
  rawKinds=dict(collections.Counter(x['kind'] for x in raw)),rawChipFieldStates={f"{k}:{s}":n for (k,s),n in sorted(fields.items())},metrics=m,referenceAttributeStatus={f"{k}:{s}":n for (k,s),n in sorted(attr.items())}))
(R/'scores-dev.json').write_text(json.dumps(dict(sample='development Quacks C crop; reference 6b7dc260 unchanged',rows=rows),ensure_ascii=False,indent=1)+'\n')
for r in rows:print(r['id'],r['rawKinds'],'det',r['metrics']['individualDetected'],'attr',r['metrics']['correctAttributes'],'/16 wrong',r['metrics']['wrongAttributes'],'unk',r['metrics']['unknownAttributes'],'|',r['referenceAttributeStatus'],'|',r['rawChipFieldStates'],r['ms'],r['usage'])
