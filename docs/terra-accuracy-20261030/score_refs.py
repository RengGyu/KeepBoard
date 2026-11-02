"""Automatic, model-blind scorer for the frozen twenty-games references (sol1/sol2). Identical for Gemini and Terra.
Matching: reciprocal unique max IoU>=.25 on normalized boxes; predictions with quantity>1 are groups and never count as individual detections.
Values: strict normalized equality (trim, lowercase, numeric). No translation/synonym credit, so text fields can undercount for BOTH models."""
import json,hashlib,collections,sys
from pathlib import Path
R=Path(__file__).resolve().parent;S=R.parent/'twenty-games-pack-study-20261029'
def refs():
 out={}
 for c in json.loads((S/'references-sol1.json').read_text())['cases']:
  out[c['gameId']]=[dict(id=o['id'],kind=o.get('componentId') or o.get('kind'),box=[o['bbox']['x'],o['bbox']['y'],o['bbox']['x']+o['bbox']['width'],o['bbox']['y']+o['bbox']['height']],
   attrs={k:v for k,v in (o.get('attributes') or {}).items() if (o.get('attributeScorable') or {}).get(k,True)}) for o in c['objects']]
 for c in json.loads((S/'references-sol2.json').read_text())['cases']:
  out[c['gameId']]=[dict(id=o['id'],kind=o['canonicalKind'],box=list(o['box']),attrs=dict(o.get('readableAttributes') or {})) for o in c['objects']]
 return out
def iou(a,b):
 x=max(0,min(a[2],b[2])-max(a[0],b[0]));y=max(0,min(a[3],b[3])-max(a[1],b[1]));z=x*y
 return z/((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-z) if z else 0
def norm(v):
 if isinstance(v,bool) or v is None:return v
 if isinstance(v,(int,float)):return float(v)
 s=str(v).strip().lower()
 try:return float(s)
 except ValueError:return s
def types_from(task):
 return {(c['id'],p['id']):p.get('type') for c in task['definition']['components'] for p in c['properties']}
def score(ref,obs,types=None):
 pred=[None if not o.get('bbox') or (o.get('quantity') or 1)>1 else [o['bbox']['x'],o['bbox']['y'],o['bbox']['x']+o['bbox']['width'],o['bbox']['y']+o['bbox']['height']] for o in obs]
 M=[[iou(r['box'],p) if p else 0 for p in pred] for r in ref];match={}
 for i,row in enumerate(M):
  mx=max(row,default=0);ch=[j for j,x in enumerate(row) if abs(x-mx)<1e-9]
  if mx<.25 or len(ch)!=1:continue
  j=ch[0];col=[x[j] for x in M]
  if abs(mx-max(col))<1e-9 and sum(abs(x-max(col))<1e-9 for x in col)==1:match[i]=j
 st=collections.Counter();tx=collections.Counter();kind=0
 for i,r in enumerate(ref):
  o=obs[match[i]] if i in match else None
  if o and o.get('componentId')==r['kind']:kind+=1
  for k,v in r['attrs'].items():
   q=(o or {}).get('properties',{}).get(k)
   s='missing-object' if not o else 'unknown' if not q or q['state']!='observed' else 'correct' if norm(q['value'])==norm(v) else 'wrong'
   if types is not None and types.get((r['kind'],k))=='text':tx['observed-unjudged' if s=='wrong' else s]+=1  # free text: synonyms/translations are not auto-judged
   else:st[s]+=1
 groups=sum(1 for o in obs if (o.get('quantity') or 1)>1)
 return dict(referenceObjects=len(ref),individualDetected=len(match),kindCorrect=kind,readableAttributes=sum(len(r['attrs']) for r in ref),
  correct=st['correct'],wrong=st['wrong'],unknown=st['unknown'],missingObject=st['missing-object'],valueAttributes=sum(st.values()),
  text=dict(total=sum(tx.values()),exact=tx['correct'],observedUnjudged=tx['observed-unjudged'],unknown=tx['unknown'],missingObject=tx['missing-object']),outputRows=len(obs),groupRows=groups,unmatchedRows=len(obs)-len(match))
if __name__=='__main__':
 RD=Path('/Users/jeonggyuju/Library/Application Support/KeepBoard/research/twenty-games-pack-study-20261029');rf=refs()
 man={c['gameId']:c['metrics'] for f in ['scores-sol1.json','scores-sol2.json'] for c in json.loads((S/f).read_text())['cases']}
 for g in sys.argv[1:]:
  m=score(rf[g],json.loads((RD/f'{g}.baseline.decoded.json').read_text())['observations'],types_from(json.loads((RD/f'{g}.baseline.task.json').read_text())));print(g,'auto',m['individualDetected'],'/',m['referenceObjects'],'value',m['correct'],'/',m['valueAttributes'],'text',m['text'],'| manual',man[g].get('individualDetected'),man[g].get('correctAttributes'),'/',man[g].get('readableAttributes'))
