"""Frozen partial references; reciprocal unique geometry-only IoU >= .25. No model calls or repairs."""
import json,hashlib
from pathlib import Path
out=Path(__file__).resolve().parent
pre=json.loads((out/'v1-preflight.json').read_text());run=json.loads((out/'v1-execution.json').read_text());private=Path(pre['privateDir'])
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def iou(a,b):
 x=max(0,min(a[2],b[2])-max(a[0],b[0]));y=max(0,min(a[3],b[3])-max(a[1],b[1]));z=x*y
 return z/((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-z) if z else 0
rows=[]
for c in pre['cases']:
 assert sha(c['inputPath'])==c['inputSHA'];assert sha(c['referencePath'])==c['referenceSHA']
 ref=json.loads(Path(c['referencePath']).read_text());v=json.loads((private/(c['id']+'.after.json')).read_text());receipts=[r for a in v['session']['assertions'] if a['status']=='accepted' for r in a.get('observationReceipts',[])];r=receipts[0];obs=r['result']['observations'];image=next(i for i in ref['images'] if i.get('variant')=='W') if isinstance(ref['images'],list) else ref['images']['W']
 width=image['width'];height=image['height']
 boxes=[None if not o['bbox'] or o['quantity'] is not None and o['quantity']>1 else [o['bbox']['x']*width,o['bbox']['y']*height,(o['bbox']['x']+o['bbox']['width'])*width,(o['bbox']['y']+o['bbox']['height'])*height] for o in obs]
 matrix=[[iou(o['boxesPx']['W'],b) if b else 0 for b in boxes] for o in ref['objects']];matches={}
 for i,values in enumerate(matrix):
  maximum=max(values,default=0);choices=[j for j,v in enumerate(values) if abs(v-maximum)<1e-9]
  if maximum<.25 or len(choices)!=1:continue
  j=choices[0];column=[row[j] for row in matrix]
  if abs(maximum-max(column))<1e-9 and sum(abs(v-max(column))<1e-9 for v in column)==1:matches[i]=j
 details=[];counts=dict(correct=0,wrong=0,unknown=0,missingObject=0)
 for i,o in enumerate(ref['objects']):
  p=obs[matches[i]] if i in matches else None;attrs=[]
  for key in o['scoredPropertyIds']:
   a=p['properties'].get(key) if p else None;actual=a.get('value') if a else None
   status='missingObject' if not p else 'unknown' if not a or a['state']!='observed' else 'correct' if actual==o['properties'][key] else 'wrong';counts[status]+=1
   attrs.append(dict(id=key,expected=o['properties'][key],actual=actual,status=status))
  details.append(dict(referenceId=o['id'],predictedRef=p['ref'] if p else None,individualDetected=p is not None,kindCorrect=p is not None and p['componentId']==o['componentId'],iou=matrix[i][matches[i]] if i in matches else None,attributes=attrs))
 target=private/(c['id']+'.score.json');target.write_text(json.dumps(dict(objects=details,referenceSHA=c['referenceSHA'],nativeSHA=next(l['nativeSHA'] for l in run['ledger'] if l['id']==c['id'])),ensure_ascii=False,indent=2)+'\n');target.chmod(0o600)
 rows.append(dict(gameId=c['id'],referenceSHA=c['referenceSHA'],inputSHA=c['inputSHA'],nativeSHA=next(l['nativeSHA'] for l in run['ledger'] if l['id']==c['id']),referenceObjects=len(ref['objects']),individualDetected=len(matches),correctKind=sum(d['kindCorrect'] for d in details),readableAttributes=sum(len(o['scoredPropertyIds']) for o in ref['objects']),attributes=counts,unmatchedReferenceObjects=len(ref['objects'])-len(matches),rawRows=len(obs),unmatchedRawRows=len(obs)-len(matches),detailPath=str(target),detailSHA=sha(target)))
report=dict(cases=rows,scope='AI partial references for same two development W images; not exhaustive GT or holdout',matching='geometry-only reciprocal unique maximum IoU >= .25; no value/kind matching',fullPhotoAccuracy=None,limits=['Groups are not individual detections; null quantity does not authorize duplicating objects','Unmatched rows can be legitimate unannotated objects; not automatically hallucinations','No comparison against earlier differently prompted calls as a causal quality result','Splendor UI point=2 was a manual save demonstration, not a reference correction or scored model output'])
(out/'v1-scores.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(rows,ensure_ascii=False))
