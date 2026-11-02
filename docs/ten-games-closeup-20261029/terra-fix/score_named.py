"""Named-box Terra run scored with the frozen evaluate() copied verbatim from terra-comparison/score.py. Writes only terra-fix/named-results.json."""
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

frozen=json.loads((CMP/'results.json').read_text());fix=json.loads((R/'scores.json').read_text());pre=json.loads((R/'named-preflight.json').read_text());ledger=json.loads((R/'named-ledger.json').read_text())
rows=[];K=['individualDetected','componentKindCorrect','correctAttributes','wrongAttributes','unknownAttributes','notRecoveredAttributes','unmatchedValidRawRows']
def price(u):
 c=u.get('input_tokens_details',{});w=c.get('cache_write_tokens') or 0;r=c.get('cached_tokens') or 0
 return ((u['input_tokens']-w-r)*1+w*1.25+r*.05+u['output_tokens']*5)/1e6
for game,prefix in [('splendor','pilot'),('quacks','quacks')]:
 inputs=json.loads((OLD/f'{prefix}-inputs.json').read_text());ref=json.loads(Path(inputs['reference']['path']).read_text());assert sha(inputs['reference']['path'])==inputs['reference']['sha256']
 for v in 'WCD':
  i=f'{game}-{v}';image=next(x for x in inputs['images'] if x['variant']==v);t=next(x for x in pre['tasks'] if x['id']==i);l=next(x for x in ledger if x['id']==i)
  assert sha(t['prefix']+'.native.json')==l['rawSHA'] and sha(t['prefix']+'.decoded.json')==l['decodedSHA']
  m,_=evaluate(ref,image,json.loads(Path(t['prefix']+'.decoded.json').read_text())['observations'],v)
  fz=next(c for c in frozen['cases'] if c['gameId']==game and c['variant']==v);fx=next(x for x in fix['rows'] if x['id']==i);u=l['usage']
  raw=json.loads(Path(t['prefix']+'.parsed.json').read_text())
  rows.append(dict(id=i,named=dict(wholeResponseDecoded=l['state']=='decoded',boxContract=l['boxContract'],rawItems=len(raw['items']),rawKindCounts={k:sum(o['kind']==k for o in raw['items']) for k in sorted({o['kind'] for o in raw['items']})},metrics=m,ms=l['ms'],modelReturned=l['modelReturned'],
   tokens=dict(input=u['input_tokens'],cached=u.get('input_tokens_details',{}).get('cached_tokens'),cacheWrite=u.get('input_tokens_details',{}).get('cache_write_tokens'),output=u['output_tokens'],reasoning=u.get('output_tokens_details',{}).get('reasoning_tokens'),total=u['total_tokens']),usagePriceEstimateUSD=price(u)),
   previousTerra=dict(wholeResponseDecoded=fz['terra']['wholeResponseDecoded'],invalidGeometryRows=fz['terra']['invalidGeometryRows'],frozenDiagnosticMetrics=fz['terra']['metrics'],frozenDiagnosticTrusted=False,ms=fz['terra']['ms'],tokens=fz['terra']['tokens']),
   postHocAlternatePolicy=fx['adopt-consistent-alternate']['metrics'],gemini=dict(metrics=fz['gemini']['metrics'],ms=fz['gemini']['ms'],tokens=fz['gemini']['tokens'])))
tot={k:sum(r['named']['tokens'][k] or 0 for r in rows) for k in ['input','cached','cacheWrite','output','reasoning','total']}
(R/'named-results.json').write_text(json.dumps(dict(version='terra-named-box-v1',rows=rows,totalUsage=tot,usagePriceEstimateUSD=sum(r['named']['usagePriceEstimateUSD'] for r in rows),actualBilledUSD=None,
 notes=['Frozen diagnostic Terra row scores for W/C used transposed valid-looking rows and are not trustworthy','postHocAlternatePolicy is evaluation-only order inference on old responses, not contract compliance','Not connected to the app read path'],
 matching='frozen evaluate(): reciprocal unique max IoU>=.25'),ensure_ascii=False,indent=1)+'\n')
for r in rows:print(r['id'],'named',[r['named']['metrics'][k] for k in K],r['named']['boxContract'],r['named']['ms'],r['named']['tokens'],'| prevFrozen',[r['previousTerra']['frozenDiagnosticMetrics'][k] for k in K],'| posthoc',[r['postHocAlternatePolicy'][k] for k in K],'| gemini',[r['gemini']['metrics'][k] for k in K],r['gemini']['ms'])
print(tot,round(sum(r['named']['usagePriceEstimateUSD'] for r in rows),6))
