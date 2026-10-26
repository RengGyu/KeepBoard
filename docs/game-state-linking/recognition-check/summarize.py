"""Offline transport/normalization summary only. It does not score recognition accuracy."""
from pathlib import Path
import json,hashlib,collections,os
here=Path(__file__).resolve().parent
pre=json.loads((here/'preflight.json').read_text());ledger=json.loads((here/'requests.json').read_text());root=Path(pre['privateDirectory']);rows=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def scene_counts(assertions):
 out=collections.Counter()
 for a in assertions:
  v=a.get('value',{})
  if not isinstance(v,dict):continue
  for c in v.get('components',[]):
   out['components']+=1;out['kind:'+str(c.get('kind'))]+=1
   if not (c.get('location')or{}).get('id'):out['nullLocation']+=1
   if c.get('kind')=='terrain' and c.get('variant') is None:out['terrainUnknown']+=1
   if c.get('kind')=='number-token' and c.get('number') is None:out['numberUnknown']+=1
  for p in v.get('pieces',[]):
   out['pieces']+=1;out['component:'+str(p.get('componentId'))]+=1
   readout=p.get('readout') or {};out['hasReadout']+=bool(readout);vals=readout.get('values',{})
   out['typedKnownLeaves']+=sum(value is not None and not isinstance(value,(dict,list)) for value in vals.values())
   out['typedNullLeaves']+=sum(value is None for value in vals.values())
  for t in [t for g in v.get('groups',[]) for t in g.get('tiles',[])]+v.get('loose',[]):
   out['tiles']+=1;out['kind:'+str(t.get('kind'))]+=1
   if t.get('color') is None:out['tileColorUnknown']+=1
   if t.get('kind')=='number' and t.get('number') is None:out['tileNumberUnknown']+=1
  out['groups']+=len(v.get('groups',[]));out['looseTiles']+=len(v.get('loose',[]))
 return dict(out)
for attempt in ledger['requests']:
 row={k:attempt.get(k) for k in ['sequence','gameId','state','status','latencyMs','normalizeMs','peakCostUSD','usage','normalizationWarningCount','raw','normalized','usable','boardVisible','boardOutside']}
 files={surface:root/f"{attempt['sequence']}-{attempt['gameId']}.{surface}.json" for surface in ['provider','raw','normalized','usable']}
 row['privateArtifacts']={surface:{'path':str(p),'sha256':sha(p)} for surface,p in files.items() if p.exists()}
 if files['raw'].exists() and files['normalized'].exists():
  raw=json.loads(files['raw'].read_text());norm=json.loads(files['normalized'].read_text());row['rawDetailCounts']=scene_counts(raw.get('assertions',[]));row['normalizedDetailCounts']=scene_counts(norm.get('assertions',[]))
  if attempt['gameId']=='catan':
   counts=collections.Counter();detail=[];ns={p['id']:p for a in norm['assertions'] for p in a['value'].get('components',[])}
   for a in raw['assertions']:
    for p in a['value'].get('components',[]):
     q=ns.get(p.get('id'))
     if not q:counts['unmatchedRawComponent']+=1;continue
     for key in ['kind','variant','number','quantity','ownerId','region']:
      if p.get(key)!=q.get(key):counts[key+'Changed']+=1
     if p.get('location')!=q.get('location'):
      counts['locationChanged']+=1
      if(p.get('location')or{}).get('id')and not(q.get('location')or{}).get('id'):counts['nonNullLocationBecameUnknown']+=1
      detail.append({'id':p['id'],'raw':p.get('location'),'normalized':q.get('location')})
   row['normalizationDelta']=dict(counts);private=root/'catan-normalization-delta.private.json';private.write_text(json.dumps(detail));private.chmod(0o600)
 rows.append(row)
summary={'status':ledger['status'],'sourceDigest':pre['sourceDigest'],'attempts':ledger['realAIRequests'],'actualUpstreamAttempts':ledger.get('actualUpstreamAttempts'),'automaticRetries':0,'actualPeakCostUSD':ledger.get('actualPeakCostUSD'),'ownGatewayClosed':ledger.get('ownGatewayClosed'),'rows':rows,'limits':['Not a semantic accuracy score; private frozen GT comparison is separate.','usable is the source-level editor input path, not a browser screenshot or user acceptance.','Old Catan provider raw is unavailable; a new request does not reconstruct its cause.','No user-session writes or production/preview deployment.']}
(here/'transport-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':summary['status'],'attempts':summary['attempts'],'cost':summary['actualPeakCostUSD'],'rows':[{'game':r['gameId'],'state':r['state'],'raw':r['raw'],'normalized':r['normalized']}for r in rows]},ensure_ascii=False))
