"""Fixed geometry-only scoring of pre-frozen partial visual reference."""
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
P=Path('/private/tmp/kb-ten-games-closeup-video-20261030')
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
plan=json.loads((ROOT/'quacks-inputs.json').read_text());ref=json.loads(Path(plan['reference']['path']).read_text())
assert sha(plan['reference']['path'])==plan['reference']['sha256']
ledger=json.loads((ROOT/'quacks-ledger.json').read_text())
def iou(a,b):
    x=max(0,min(a[2],b[2])-max(a[0],b[0]));y=max(0,min(a[3],b[3])-max(a[1],b[1]));z=x*y
    return z/((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-z) if z else 0
cases=[]
for v in ['W','C','D']:
    image=next(x for x in ref['images'] if x['variant']==v)
    native=P/f'quacks-{v}.native.json';decoded=P/f'quacks-{v}.decoded.json'
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
            individualDetected=x is not None,correctKind=bool(x and x['componentId']==o['componentId']),attributes=attrs))
    unmatched=[x['ref'] for j,x in enumerate(obs) if j not in matches.values()]
    detail=dict(variant=v,referenceSHA=plan['reference']['sha256'],rawSHA=sha(native),decodedSHA=sha(decoded),objects=details,
       unmatchedRawRefs=unmatched,unmatchedAssessment='Outside the eight selected top-face chips; may be real books/other chips, not automatically false positives. Full-photo precision unscored.',
       unsupportedOrUnscoredProperties='Only eight chip colors and numeral values scored; books, neighbors and hidden stack quantities unscored')
    dp=P/f'quacks-{v}.score.json';dp.write_text(json.dumps(detail,ensure_ascii=False,indent=2)+'\n');dp.chmod(0o600)
    usage=row['usage'] or {}
    cases.append(dict(variant=v,referenceObjects=8,individualDetected=len(matches),correctKind=sum(x['correctKind'] for x in details),
       readableAttributes=16,correctAttributes=correct,wrongAttributes=wrong,unknownAttributes=unknown,missingAttributes=missing,
       rawObservations=len(obs),unmatchedRawObjects=len(unmatched),detailPath=str(dp),detailSHA=sha(dp),
       durationMs=row['ms'],tokens=dict(input=usage.get('promptTokenCount'),output=usage.get('candidatesTokenCount'),thoughts=usage.get('thoughtsTokenCount'),total=usage.get('totalTokenCount'))))
execution=json.loads((ROOT/'quacks-execution.json').read_text())
result=dict(status='MEASURED_ONE_ELIGIBLE_DEVELOPMENT_CASE',gameId='quacks',cases=cases,
    parallelWallMs=execution['wallMs'],peakConcurrency=execution['peak'],calls=execution['attempts'],retries=0,
    gainVerdict='W and independent D omit all selected chips, returning books only; exact W crop recovers the selected individual chips. No independent closeup gain in this single run.',
    meaningfulDifferences=['The photographed chips are visible in W and D but not returned; this is model omission, not missing source pixels','C reads individual chip colors/numbers; its numeral errors are retained'],
    limitations=['AI partial reference, not certified human GT','Eight exposed green top-face chips only; no full-pile or stack count accuracy','D is earlier110.5s, W later112.5s during the same continuous camera pan','One run/condition; field-context/scale/focus vary together, no causal generalization','Unmatched raw objects unscored, not automatically hallucinations','Thought usage unreported=null; billed money unknown','Cross-view automatic registration NOT_IMPLEMENTED'])
(ROOT/'quacks-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
