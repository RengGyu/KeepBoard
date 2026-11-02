"""Fixed geometry-only scoring of pre-frozen partial visual reference."""
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
P=Path('/private/tmp/kb-ten-games-closeup-video-20261030')
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
plan=json.loads((ROOT/'pilot-inputs.json').read_text());ref=json.loads(Path(plan['reference']['path']).read_text())
assert sha(plan['reference']['path'])==plan['reference']['sha256']
ledger=json.loads((ROOT/'pilot-ledger.json').read_text())
def iou(a,b):
    x=max(0,min(a[2],b[2])-max(a[0],b[0]));y=max(0,min(a[3],b[3])-max(a[1],b[1]));z=x*y
    return z/((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-z) if z else 0
cases=[]
for v in ['W','C','D']:
    image=next(x for x in ref['images'] if x['variant']==v)
    native=P/f'pilot-{v}.native.json';decoded=P/f'pilot-{v}.decoded.json'
    row=next(x for x in ledger if x['variant']==v)
    assert sha(native)==row['rawSHA'] and sha(decoded)==row['decodedSHA']
    obs=json.loads(decoded.read_text())['observations'];pred=[]
    for x in obs:
        b=x['bbox']
        pred.append(None if not b or x['quantity'] is not None and x['quantity']>1 else [b['x']*image['width'],b['y']*image['height'],(b['x']+b['width'])*image['width'],(b['y']+b['height'])*image['height']])
    matrix=[[iou(o['boxesPx'][v],b) if b else 0 for b in pred] for o in ref['objects']]
    matches={}
    for i,vals in enumerate(matrix):
        mx=max(vals,default=0);choices=[j for j,x in enumerate(vals) if abs(x-mx)<1e-9]
        if mx<.25 or len(choices)!=1:continue
        j=choices[0];col=[r[j] for r in matrix];best=max(col)
        if abs(mx-best)<1e-9 and sum(abs(x-best)<1e-9 for x in col)==1:matches[i]=j
    details=[];correct=wrong=unknown=missing=0
    for i,o in enumerate(ref['objects']):
        j=matches.get(i);x=obs[j] if j is not None else None;attrs=[]
        for k in o['scoredPropertyIds']:
            q=x['properties'].get(k) if x else None
            actual=q.get('value') if q else None
            status='missing-object' if not x else 'unknown' if not q or q['state']!='observed' else 'correct' if actual==o['properties'][k] else 'wrong'
            correct+=status=='correct';wrong+=status=='wrong';unknown+=status=='unknown';missing+=status=='missing-object'
            attrs.append(dict(id=k,expected=o['properties'][k],actual=actual,status=status))
        details.append(dict(referenceId=o['id'],predictedRef=x['ref'] if x else None,iou=matrix[i][j] if j is not None else None,
            individualDetected=x is not None,correctKind=bool(x and x['componentId']==o['componentId'] and x['properties'].get('kind',{}).get('value')=='development'),attributes=attrs))
    unmatched=[x['ref'] for j,x in enumerate(obs) if j not in matches.values()]
    detail=dict(variant=v,referenceSHA=plan['reference']['sha256'],rawSHA=sha(native),decodedSHA=sha(decoded),objects=details,
       unmatchedRawRefs=unmatched,unmatchedAssessment='Visually verified clipped/full deck observations outside the 12 face-up card targets; not physical false positives',
       unsupportedOrUnscoredProperties='Costs all unknown, level/blank-point inference not evaluated; no full-state claim')
    dp=P/f'pilot-{v}.score.json';dp.write_text(json.dumps(detail,ensure_ascii=False,indent=2)+'\n');dp.chmod(0o600)
    usage=row['usage'] or {}
    cases.append(dict(variant=v,referenceObjects=12,individualDetected=len(matches),correctKind=sum(x['correctKind'] for x in details),
       readableAttributes=18,correctAttributes=correct,wrongAttributes=wrong,unknownAttributes=unknown,missingAttributes=missing,
       rawObservations=len(obs),unmatchedRawObjects=len(unmatched),detailPath=str(dp),detailSHA=sha(dp),
       durationMs=row['ms'],tokens=dict(input=usage.get('promptTokenCount'),output=usage.get('candidatesTokenCount'),thoughts=usage.get('thoughtsTokenCount'),total=usage.get('totalTokenCount'))))
execution=json.loads((ROOT/'pilot-execution.json').read_text())
result=dict(status='MEASURED_ONE_ELIGIBLE_DEVELOPMENT_CASE',gameId='splendor',cases=cases,
    parallelWallMs=execution['wallMs'],peakConcurrency=execution['peak'],calls=execution['attempts'],retries=0,
    gainVerdict='D has one more correct bonus than C and no object gain; W already reads that bonus correctly. D adds no correct target attribute beyond W. Both C/D misread two clearly printed point numerals as zero; W leaves those values unknown.',
    meaningfulDifferences=['C misreads top-left target bonus red as black; W/D read red',
      'Top-row two scored printed point numerals are unknown in W and wrong zero in C/D; the existing valid read values are not corrected in the experiment'],
    limitations=['AI partial visual reference, not certified human GT','12 stationary market cards only; moving noble excluded',
      'One request per condition; no causal/repeatability/general accuracy claim','D is larger but visibly more defocused/compressed; real closeup need not improve readability',
      'Unmatched deck outputs are not false positives; hidden stacks/costs/levels/full-photo accuracy unscored',
      'Actual billed money not reported; missing thought usage is null, not zero','Automatic cross-view registration remains NOT_IMPLEMENTED'])
(ROOT/'pilot-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
