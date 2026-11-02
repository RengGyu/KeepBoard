"""Read-only failure breakdown; writes aggregates in this directory only. No API.
Reference-centre coverage is a diagnostic, never an object recovery score or runtime rule.
"""
import collections, hashlib, json, sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
EXP=ROOT/'docs/terra-accuracy-20261030'
sys.path.insert(0,str(EXP))
from score_refs import refs, iou, norm, types_from, score
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
plan=read(EXP/'plan-heldout.json');calls={c['id']:c for c in plan['calls']};ledger={x['id']:x for x in read(EXP/'plan-heldout-ledger.json')}
frozen=refs();rows=[];numeric_confusions=collections.Counter()
for photo in plan['photos']:
 g=photo['gameId'];call=calls[g+'-improved'];task=read(Path(call['taskPath']));reference=frozen[g]
 p=Path(plan['privateDir']);decoded_path=p/f'{g}-improved.decoded.json';native_path=p/f'{g}-improved.native.json'
 assert sha(decoded_path)==ledger[g+'-improved']['decodedSHA'] and sha(native_path)==ledger[g+'-improved']['rawSHA']
 assert sha(Path(call['taskPath']))==call['taskSHA']
 native=read(native_path);wire=json.loads(''.join(part['text'] for message in native['output'] if message['type']=='message' for part in message['content']))['items']
 observations=read(decoded_path)['observations'];types=types_from(task)
 def box(o):
  b=o.get('bbox');return [b['x'],b['y'],b['x']+b['width'],b['y']+b['height']] if b else None
 boxes=[box(o) for o in observations]
 pred=[b if (o.get('quantity') or 1)<=1 else None for o,b in zip(observations,boxes)]
 matrix=[[iou(r['box'],b) if b else 0 for b in pred] for r in reference];matches={}
 for i,line in enumerate(matrix):
  best=max(line,default=0);js=[j for j,x in enumerate(line) if abs(x-best)<1e-9]
  if best<.25 or len(js)!=1:continue
  j=js[0];col=[x[j] for x in matrix]
  if abs(best-max(col))<1e-9 and sum(abs(x-max(col))<1e-9 for x in col)==1:matches[i]=j
 missing=collections.Counter();coverage=collections.Counter();attrs=collections.defaultdict(collections.Counter);raw_wrong=0;omitted=0
 for w in wire:omitted+=len(set(task['request']['allowedPropertyIds'][w['kind']])-{a['id'] for a in w['attributes']})
 for i,r in enumerate(reference):
  o=observations[matches[i]] if i in matches else None
  if o is None:
   missing[r['kind']]+=1;cx=(r['box'][0]+r['box'][2])/2;cy=(r['box'][1]+r['box'][3])/2
   covering=[v for v,b in zip(observations,boxes) if v['componentId']==r['kind'] and b and b[0]<=cx<=b[2] and b[1]<=cy<=b[3]]
   category='inside_counted_group' if any(v['quantity'] is not None and v['quantity']>1 for v in covering) else 'inside_null_quantity_box' if any(v['quantity'] is None for v in covering) else 'inside_other_single_box' if covering else 'no_center_coverage'
   coverage[category]+=1
  for key,expected in r['attrs'].items():
   if types.get((r['kind'],key))=='text':continue
   a=(o or {}).get('properties',{}).get(key)
   state='missing-object' if o is None else 'unknown' if not a or a['state']!='observed' else 'correct' if norm(a['value'])==norm(expected) else 'wrong'
   attrs[key][state]+=1
   if state=='wrong':
    source=next(v for v in wire[matches[i]]['attributes'] if v['id']==key)
    assert source['valueJson'] is not None and json.loads(source['valueJson'])==a['value']
    raw_wrong+=1
    if key in ['chipNumber','dieValue']:numeric_confusions[(g,key,str(expected),str(a['value']))]+=1
 rows.append({'gameId':g,'sourceSHA':photo['sourceSHA'],'originalSize':[photo['width'],photo['height']],'condition':'whole-image fill + Lanczos upscale, not a crop','metrics':score(reference,observations,types),'missingKinds':dict(missing),'missingCenterCoverageDiagnostic':dict(coverage),'valueAttributeBreakdown':dict(attrs),'wrongValuesAlreadyPresentInProviderRaw':raw_wrong,'omittedAllowedPropertyRows':omitted,'quantityNullRows':sum(o['quantity'] is None for o in observations),'quantityAboveOneRows':sum(o['quantity'] is not None and o['quantity']>1 for o in observations),'nativeSHA':ledger[g+'-improved']['rawSHA'],'decodedSHA':ledger[g+'-improved']['decodedSHA']})
keys=['referenceObjects','individualDetected','correct','wrong','unknown','missingObject','valueAttributes']
inputs=['docs/terra-accuracy-20261030/plan-heldout.json','docs/terra-accuracy-20261030/plan-heldout-ledger.json','docs/terra-accuracy-20261030/score_refs.py','docs/twenty-games-pack-study-20261029/references-sol1.json','docs/twenty-games-pack-study-20261029/references-sol2.json','server/ai/geminiGameReader.ts','server/ai/observationAssembly.ts','server/scanObservation.ts','server/observationFusion.ts','shared/scanObservation.ts','src/Capture.tsx','src/SessionWorkspace.tsx']
output={'date':'2026-10-30','newProviderCalls':0,'productWrites':0,'evidenceStatus':'VERIFIED offline arithmetic and provider-to-decoded values; frozen references are AI partial, not human-certified truth','totals':{k:sum(r['metrics'][k] for r in rows) for k in keys},'rows':rows,'numericConfusionsAgainstFrozenReference':[{'gameId':k[0],'property':k[1],'referenceValue':k[2],'providerValue':k[3],'count':n} for k,n in numeric_confusions.items()],'limitations':['No new model/image experiment.','107 unmatched individual references all fall inside a same-kind counted or quantity-null box; containment does not establish identity, correct grouping, or editable recovery.','Do not use reference labels, centres, counts, or this matching threshold as product rules.','No score or reference was edited.'],'inputs':[{'path':f,'sha256':sha(ROOT/f)} for f in inputs]}
(HERE/'breakdown.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'totals':output['totals'],'rawWrong':sum(x['wrongValuesAlreadyPresentInProviderRaw'] for x in rows),'omittedRows':sum(x['omittedAllowedPropertyRows'] for x in rows),'missingKinds':{x['gameId']:x['missingKinds'] for x in rows if x['missingKinds']}},ensure_ascii=False))
