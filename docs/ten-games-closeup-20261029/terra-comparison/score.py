"""Same frozen reciprocal-IoU scoring; no box-order repair or value matching."""
import json,hashlib,math
from pathlib import Path
R=Path(__file__).resolve().parent;OLD=R.parent/'video-attempt'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
pre=json.loads((R/'preflight.json').read_text());ledger=json.loads((R/'ledger.json').read_text());diag=json.loads((R/'normalization-diagnostic.json').read_text())
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
rows=[];baseline_reproduced=0
for game,prefix in [('splendor','pilot'),('quacks','quacks')]:
 inputs=json.loads((OLD/f'{prefix}-inputs.json').read_text());ref=json.loads(Path(inputs['reference']['path']).read_text());assert sha(inputs['reference']['path'])==inputs['reference']['sha256']
 baseline=json.loads((OLD/f'{prefix}-results.json').read_text());oldpre=json.loads((OLD/f'{prefix}-preflight.json').read_text())
 for v in 'WCD':
  image=next(x for x in inputs['images'] if x['variant']==v);oldtask=next(t for t in oldpre['tasks'] if t['variant']==v)
  gem=json.loads(Path(oldtask['prefix']+'.decoded.json').read_text());gm,gd=evaluate(ref,image,gem['observations'],v)
  prior=next(x for x in baseline['cases'] if x['variant']==v)
  for k in ['referenceObjects','individualDetected','readableAttributes','correctAttributes','wrongAttributes','unknownAttributes']:assert gm[k]==prior[k],(game,v,k)
  assert gm['notRecoveredAttributes']==prior['missingAttributes'];baseline_reproduced+=1
  t=next(t for t in pre['tasks'] if t['gameId']==game and t['variant']==v);row=next(x for x in ledger if x['id']==t['id']);d=next(x for x in diag['rows'] if x['id']==t['id'])
  assert sha(t['prefix']+'.native.json')==row['rawSHA'] and sha(d['path'])==d['sha256']
  evaluation=json.loads(Path(d['path']).read_text());tm,details=evaluate(ref,image,evaluation['observations'],v,d['invalidGeometryRows'])
  raw=json.loads(Path(t['prefix']+'.parsed.json').read_text());rawkinds={k:sum(o['kind']==k for o in raw['items']) for k in sorted({o['kind'] for o in raw['items']})}
  private_score=Path(pre['privateDir'])/(t['id']+'.score.json')
  used={x['predictedRef'] for x in details if x['predictedRef'] is not None}
  private_score.write_text(json.dumps(dict(referenceSHA=t['referenceSHA'],nativeSHA=row['rawSHA'],objects=details,excludedRawRows=evaluation['excluded'],unmatchedValidRawRefs=[o['ref'] for o in evaluation['observations'] if o['ref'] not in used],
    GTUnchanged=True,matching='Original contract order only; reciprocal unique maximum IoU >=.25; no value/kind matching or coordinate repair',
    limitations='Invalid coordinate rows cannot be assigned by guessing. Unmatched references in those responses are unresolved, not confirmed physical omissions. Partial raw scoring does not make full-response decoder pass.'),ensure_ascii=False,indent=2)+'\n');private_score.chmod(0o600)
  u=row['usage'];cache=u.get('input_tokens_details',{});out=u.get('output_tokens_details',{});write=cache.get('cache_write_tokens');read=cache.get('cached_tokens')
  cost=None
  if all(isinstance(x,int) for x in [u.get('input_tokens'),u.get('output_tokens'),write,read]):
   assert u['input_tokens']>=write+read
   cost=((u['input_tokens']-write-read)*1+write*1.25+read*.05+u['output_tokens']*5)/1e6
  rows.append(dict(gameId=game,variant=v,referenceSHA=t['referenceSHA'],inputSHA=t['inputSHA'],gemini=dict(metrics=gm,ms=prior['durationMs'],tokens=prior['tokens'],wholeResponseDecoded=True),
   terra=dict(metrics=tm,ms=row['ms'],rawItems=len(raw['items']),rawKindCounts=rawkinds,invalidGeometryRows=d['invalidGeometryRows'],wholeResponseDecoded=d['wholeResponseDecoded'],
    tokens=dict(input=u.get('input_tokens'),cachedInput=read,cacheWrite=write,output=u.get('output_tokens'),reasoning=out.get('reasoning_tokens'),total=u.get('total_tokens')),
    usagePriceEstimateUSD=cost,priceBasis='Official Standard short-context rates; omitted prompt_cache_options TTL defaults30m; cache-write rate replaces input rate, not additive; not invoice',
    modelReturned=row['modelReturned'],nativeSHA=row['rawSHA'],detailPath=str(private_score),detailSHA=sha(private_score))))
assert baseline_reproduced==6 and len(rows)==6
execution=json.loads((R/'execution.json').read_text())
report=dict(version='terra-gemini-closeup-comparison-v1',cases=rows,baselineMetricReproduction='6/6 unchanged Gemini metrics reproduced in memory; original files not modified',
 actualInferenceCalls=6,retries=0,peak=execution['peak'],wallMs=execution['wallMs'],http200=6,terraWholeResponseDecoded=sum(r['terra']['wholeResponseDecoded'] for r in rows),
 rawInvalidGeometryRows=sum(r['terra']['invalidGeometryRows'] for r in rows),totalUsage={k:sum(r['terra']['tokens'][k] for r in rows) for k in ['input','cachedInput','cacheWrite','output','reasoning','total']},
 standardUsagePriceEstimateUSD=sum(r['terra']['usagePriceEstimateUSD'] for r in rows),actualBilledUSD=None,
 limitations=['AI partial visual references, not certified human GT','Same two development scenes, one call/condition/model; no generalization or causal claim',
  'Four responses violate box min/max contract and fail full normalization. Diagnostic per-row scoring retains valid rows only, without repairing excluded rows',
  'Unresolved localization is separate from definite object omission and attribute value error','Legacy Splendor subtype kind property confirmation separate from raw component kind',
  'Provider-specific low/high preprocessing/tokenization/output cap semantics differ','Gemini cohorts each peak3; Terra all6 concurrent, wall times not directly equal workload comparison',
  'No app model swap, product store writes, automatic cross-view registration test or end-to-end scan timing','Unmatched raw rows may be groups, unannotated neighbors or invalid localization; no full-photo precision/hallucination/duplicate rate claimed'],fullPhotoPrecision=None,productChanges=0)
(R/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(dict(rows=[dict(gameId=r['gameId'],variant=r['variant'],gemini=r['gemini']['metrics'],terra=r['terra']['metrics'],decoded=r['terra']['wholeResponseDecoded'],invalid=r['terra']['invalidGeometryRows']) for r in rows],totalUsage=report['totalUsage'],standardUsagePriceEstimateUSD=report['standardUsagePriceEstimateUSD']),ensure_ascii=False,indent=2))
