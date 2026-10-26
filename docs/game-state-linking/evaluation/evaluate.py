# Offline only; matches are explicitly human-selected by source spatial correspondence, never expected numeric values.
from pathlib import Path
import json,collections,hashlib
here=Path(__file__).resolve().parent;pre=json.loads((here/'preflight.json').read_text());ledger=json.loads((here/'requests.json').read_text());private=Path(pre['privateDirectory'])
# The GT is the 19 attributes frozen in plan.md before dispatch. Exact returned piece IDs only locate that GT.
matches={1:{'splendor-top-middle':'79483d7b-901f-4f09-b224-8776dcbb5cd7','splendor-bottom-middle':'fe88829c-e44d-41c3-9c0d-c1bfef5fb7eb'},2:{'splendor-top-middle':'5458cf2f-4a22-42af-8c20-7fe544afbc1a','splendor-bottom-middle':'8c1159a7-531d-4c85-bddb-aec9718bdf28'},3:{'sagrada-r2c2':'4be1b6c4-1d08-4a2f-85dd-32ab6e4ebf82','sagrada-r2c3':'d9a0067f-5965-401d-8aad-5475db79da10','sagrada-r2c4':'6a31f316-9662-4aad-8424-8b3999dd32ec'},4:{'sagrada-r2c2':'bdbc03e6-6e68-4f17-9e3a-910b07255b17','sagrada-r2c3':'070880bd-7cde-407c-8074-415932a042fc','sagrada-r2c4':'0aa0bdcd-825c-4851-947b-6ef6b7901ff8'},5:{'scout-star-top':'bbac2d15-2271-4e8e-8e28-0d505c4bdf18','scout-star-left':'4653d3ee-963d-4337-9274-2a75963b6303','scout-star-right':'ced7870b-539f-4803-9ff9-7d352f9fac79','scout-star-bottom':'edfe40ce-25c6-4d89-9d1b-7aefbb02be18'}}
# Optional last-response correspondence is written only after direct source/region/anchor review.
last=private/'last-matches.json'
if last.exists():matches[6]=json.loads(last.read_text())
gt={'splendor-top-middle':{'points':4,'bonus':'blue','cost.white':6,'cost.blue':3,'cost.black':3},'splendor-bottom-middle':{'points':2,'bonus':'black','cost.blue':1,'cost.green':4,'cost.red':2},'sagrada-r2c2':{'values.dieValue':4,'values.observedColor':'yellow'},'sagrada-r2c3':{'values.dieValue':6,'values.observedColor':'green'},'sagrada-r2c4':{'values.dieValue':5},'scout-star-top':{'values.nominalValue':5},'scout-star-left':{'values.nominalValue':10},'scout-star-right':{'values.nominalValue':10},'scout-star-bottom':{'values.nominalValue':2}}
def value(r,key):
 for k in key.split('.'):
  if not isinstance(r,dict) or k not in r:return None
  r=r[k]
 return r
def equivalent(observed,expected,key):
 if key.endswith('observedColor'):
  return observed in {'yellow':['yellow','노랑','노란색','황색'],'green':['green','초록','초록색','녹색']}[expected]
 return observed==expected
rows=[];details=[]
for r in ledger['requests']:
 if r['state']!='COMPLETED':continue
 seq=r['sequence'];m=matches.get(seq)
 if not m:continue
 normalized=json.loads((private/f"{seq}-{r['gameId']}-{r['condition']}.normalized.json").read_text());envelope=json.loads((private/f"{seq}-{r['gameId']}-{r['condition']}.response.json").read_text());pieces=[p for a in normalized['assertions'] for p in a['value'].get('pieces',[])];raw=[p for a in envelope['data'].get('assertions',[]) for p in a['value'].get('pieces',[])];counts={'raw':collections.Counter(),'typed':collections.Counter()};errors=[]
 for target,pid in m.items():
  p=next((p for p in pieces if p['id']==pid),None);assert p,'Missing human correspondence '+pid
  rp=[x for x in raw if x.get('componentId')==p.get('componentId') and x.get('region')==p.get('region') and x.get('anchor')==p.get('anchor')];assert len(rp)==1,'Ambiguous raw-to-normalized correspondence'
  for key,expected in gt[target].items():
   result={}
   for surface,piece in [('raw',rp[0]),('typed',p)]:
    observed=value(piece.get('readout'),key);status='null_or_absent' if observed is None else 'correct' if equivalent(observed,expected,key) else 'incorrect';counts[surface][status]+=1;result[surface]={'status':status,'observed':observed}
   details.append({'sequence':seq,'target':target,'field':key,'expected':expected,'results':result,'pieceId':pid,'sourceRegion':p.get('region'),'correspondence':'human source location/relative anchor; no value-based rematching'})
   if result['typed']['status']!='correct':errors.append({'target':target,'field':key,'expected':expected,'observed':result['typed']['observed'],'status':result['typed']['status']})
 rows.append({'sequence':seq,'gameId':r['gameId'],'condition':r['condition'],'raw':dict(counts['raw']),'typed':dict(counts['typed']),'scoredObjects':len(m),'scoredAttributes':sum(counts['typed'].values()),'errors':errors,'completedMs':r['completedMs'],'normalizeMs':r['normalizeMs'],'inputTokens':r['diagnostics'].get('inputTokens'),'outputTokens':r['diagnostics'].get('outputTokens'),'reasoningTokens':r['diagnostics'].get('reasoningTokens'),'peakCostUSD':r['peakCostUSD'],'rawPieces':r['rawPieces'],'normalizedPieces':r['normalizedPieces'],'scopeViolations':r['scopeViolations']})
(private/'gt-evaluation.private.json').write_text(json.dumps({'matches':matches,'groundTruth':gt,'details':details},ensure_ascii=False,indent=2)+'\n');(private/'gt-evaluation.private.json').chmod(0o600)
summary={'status':'COMPLETE' if len(rows)==6 else 'PARTIAL','calls':ledger['realAIRequests'],'sourceDigest':pre['sourceDigest'],'GTAttributesPerCondition':19,'matchedAttributes':sum(r['scoredAttributes'] for r in rows),'costBasis':'peak, no cache discount; actual invoice not read','peakCostUSD':ledger.get('actualPeakCostUSD'),'rows':rows,'unknownExcluded':['SCOUT canonical card top/bottom/activeEnd','Sagrada dieColor/physical owner/cell','unlisted costs and full game inventory/history','all target owners and purchase status','objects outside common ROI'],'scope':'Fixed nine printed objects; real game accuracy beyond these targets unknown'}
(here/'evaluation.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':summary['status'],'rows':[{'game':r['gameId'],'condition':r['condition'],'typed':r['typed']} for r in rows]},ensure_ascii=False))
