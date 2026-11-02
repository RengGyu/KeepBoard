"""Adapted Terra outputs scored with the frozen evaluate() copied verbatim from terra-comparison/score.py.
Read-only on frozen files; writes only terra-fix/scores.json. Geometry policy comes from the adapter, not from GT."""
import json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parent;OLD=R.parent/'video-attempt';CMP=R.parent/'terra-comparison'
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

frozen=json.loads((CMP/'results.json').read_text());rep=json.loads((R/'reproduction.json').read_text());pre=json.loads((CMP/'preflight.json').read_text())
out=[]
for game,prefix in [('splendor','pilot'),('quacks','quacks')]:
 inputs=json.loads((OLD/f'{prefix}-inputs.json').read_text());ref=json.loads(Path(inputs['reference']['path']).read_text());assert sha(inputs['reference']['path'])==inputs['reference']['sha256']
 for v in 'WCD':
  image=next(x for x in inputs['images'] if x['variant']==v);r=next(x for x in rep['rows'] if x['id']==f'{game}-{v}');fz=next(c for c in frozen['cases'] if c['gameId']==game and c['variant']==v)
  row=dict(id=r['id'],frozenTerra=fz['terra']['metrics'],gemini=fz['gemini']['metrics'])
  for pol in ['withhold-unless-declared','adopt-consistent-alternate']:
   p=r[pol];assert sha(p['path'])==p['sha256'];obs=json.loads(Path(p['path']).read_text())['observations'];m,_=evaluate(ref,image,obs,v)
   row[pol]=dict(geometry=p['geometry'],metrics=m)
  out.append(row)
keys=['individualDetected','correctAttributes','wrongAttributes','unknownAttributes','notRecoveredAttributes']
(R/'scores.json').write_text(json.dumps(dict(version='terra-fix-scores-v1',matching='frozen evaluate(): reciprocal unique max IoU>=.25, no value matching',rows=out),ensure_ascii=False,indent=1)+'\n')
for x in out:print(x['id'],'gemini',[x['gemini'][k] for k in keys],'frozenTerra',[x['frozenTerra'][k] for k in keys],'withhold',[x['withhold-unless-declared']['metrics'][k] for k in keys],'alternate',[x['adopt-consistent-alternate']['metrics'][k] for k in keys])
