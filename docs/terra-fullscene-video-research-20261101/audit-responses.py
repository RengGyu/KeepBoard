"""Read frozen research responses, not personal sessions. No GT/response writes."""
from pathlib import Path
import json, hashlib, collections
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
STUDY=ROOT/'docs/terra-quality-iteration-20261030'
load=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
pre=load(STUDY/'preflight-high.json');evaluation=load(STUDY/'evaluation-high.json')
rows=[]
for case in evaluation['cases']:
 for v in case['variants']:
  game,condition=case['gameId'],v['condition']
  p=Path(pre['privateDir'])/f'{game}-{condition}.result.json'
  assert sha(p)==v['resultSHA']
  receipt=load(p)['observationReceipts'][0]
  wire=receipt.get('hostedWire',{});obs=receipt['result']['observations']
  native=wire.get('providerResponse',{})
  # Serialization counterfactual on stored answers, not a shorter-prompt trial.
  payload=wire.get('items',[])
  sparse=[]
  for item in payload:
   x=dict(item);x['attributes']=[a for a in x.get('attributes',[]) if a.get('valueJson') is not None];sparse.append(x)
  compact=lambda x:len(json.dumps(x,ensure_ascii=False,separators=(',',':')).encode())
  props=collections.Counter(p['state'] for o in obs for p in o['properties'].values())
  units=collections.Counter(wire.get('physicalUnits',{}).values())
  rows.append({'gameId':game,'condition':condition,'resultSHA256':sha(p),'providerStatus':native.get('status'),'incompleteDetails':native.get('incomplete_details'),'rawItems':len(payload),'decodedObservations':len(obs),'components':dict(collections.Counter(o['componentId'] for o in obs)),'physicalUnits':dict(units),'propertyRows':dict(props),'serializedItemsBytes':compact(payload),'serializedWithoutUnknownAttributeRowsBytes':compact(sparse),'serializationOnlyNotModelTokenPrediction':True,'selectedReference':v['individual'],'providerMs':v['providerMs'],'usage':v['usage'],'historicalCalculatedUSD':v['calculatedUSD']})
out={'version':'fullscene-raw-audit-v1','newModelCalls':0,'productWrites':0,'gtWrites':0,'rows':rows,'limits':['Nine stored responses; previously exposed photos and partial AI references, not full-scene human truth.','Removing null attribute rows offline preserves already observed values only; it cannot reveal what a different prompt would detect.','Compact UTF-8 size is not token usage, inference latency or an approved product schema.','Absent records are not zeros; grouping, true omissions and GT ambiguity require separate analysis.']}
(OUT/'raw-audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'rows':len(rows),'counts':[{k:r[k] for k in ['gameId','condition','providerStatus','rawItems','decodedObservations','physicalUnits','propertyRows','serializedItemsBytes','serializedWithoutUnknownAttributeRowsBytes']} for r in rows]},ensure_ascii=False))
