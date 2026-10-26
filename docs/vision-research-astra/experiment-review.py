"""Independent fixed-six audit. Reads authorized artifacts only; no network or runner import."""
from pathlib import Path
import hashlib,json,base64,collections
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[1];EXP=ROOT/'docs/photo-read-experiment'
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
card_path=OUT/'experiment-card.json';card=read(card_path)
assert sha(card_path)=='e4bcde3566aa5e746b6a2dedce60161f76e598ab8a8a99fb8ea8f273d85ee3f6'
pre=read(EXP/'preflight.json');ledger=read(EXP/'requests.json');private=Path(pre['privateDir'])
assert pre['cardSHA256']==sha(card_path) and len(ledger['requests'])==ledger['realRequests']==6
assert ledger['automaticRetries']==0 and ledger['maxRequests']==6
assert [(r['gameId'],r['condition']) for r in ledger['requests']]==[(r['game_id'],r['condition']) for r in card['execution_order']]
assert ledger['operatingMetadataUnchanged'] and ledger['operatingBefore']==ledger['operatingAfter']
files={};source_rows=[]
def pin(p):files[str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else str(p)]={'sha256':sha(p),'bytes':p.stat().st_size}
for n in ['README.md','requests.json','evaluation.json','verification.json','source-manifest.json','prepare.mts','run.mts','evaluate.py','preflight.json']:pin(EXP/n)
for f in read(EXP/'source-manifest.json')['files']:
 p=ROOT/f['path'];assert sha(p)==f['sha256'];source_rows.append({'path':f['path'],'sha256':f['sha256'],'matches':True})
pin(card_path);fixtures={};input_checks=[]
for i in card['inputs']:
 p=next(p for p in pre['inputs'] if p['gameId']==i['game_id']);f=read(Path(p['inputFile']));fixtures[i['game_id']]=f
 original=Path(i['local_path']);assert sha(original)==i['sha256']==p['originalSHA256'];assert sha(ROOT/i['pinned_pack']['path'])==i['pinned_pack']['sha256']
 assert hashlib.sha256(f['prompt'].encode()).hexdigest()==p['promptSHA256']
 assert f['pack']['runtime']['source']['sha256']==i['pinned_pack']['sha256'] and f['pack']['version']==i['pinned_pack']['runtime_pack_version']
 body=json.dumps({'alias':'board-vision','prompt':f['prompt'],'images':[{'mimeType':'image/png' if original.suffix=='.png' else 'image/jpeg','data':base64.b64encode(original.read_bytes()).decode()}]},ensure_ascii=False,separators=(',',':')).encode()
 digest=hashlib.sha256(body).hexdigest();pair=[r for r in ledger['requests'] if r['gameId']==i['game_id']]
 assert all(r['requestBodySHA256']==digest and r['requestBytes']==len(body) and r['promptSHA256']==p['promptSHA256'] and r['originalSHA256']==i['sha256'] for r in pair)
 pin(Path(p['inputFile']));input_checks.append({'game_id':i['game_id'],'original_sha256':i['sha256'],'prompt_sha256':p['promptSHA256'],'body_sha256':digest,'reconstructed_request_bytes':len(body),'both_conditions_match':True})
def pieces(d):return [p for a in d['assertions'] for p in a.get('value',{}).get('pieces',[])]
def field(d,key):return next((a['value']['pieces'] for a in d['assertions'] if a['field']==key),[])
def at(d,key,index):ps=field(d,key);return ps[index] if len(ps)>index else {}
def nested(x,key):
 for k in key.split('.'):x=x.get(k) if isinstance(x,dict) else None
 return x
def status(expected,actual):return 'missing' if actual is None else 'correct' if expected==actual else 'incorrect'
results=[]
for r in ledger['requests']:
 i=next(i for i in card['inputs'] if i['game_id']==r['gameId']);stem=f"{r['sequence']}-{r['gameId']}-{r['condition']}"
 rp=private/(stem+'.response.json');np=private/(stem+'.normalized.json');pin(rp);pin(np)
 env=read(rp);raw=env['data'];norm=read(np);assert rp.stat().st_size==r['responseBytes']
 assert r['status']==200 and r['state']=='completed' and env['diagnostics']==r['diagnostics'] and env['target']==r['target']
 assert env['diagnostics']['reportedEffort']==r['effort'] and env['diagnostics']['reportedModel']=='deepseek-flash'
 assert r['effort']!='none' or env['diagnostics']['reasoningTokens']==0
 assert len(pieces(raw))==r['rawPieceCount'] and len(pieces(norm))==r['normalizedPieceCount']
 allowed={f['key'] for f in i['allowed_fields']};eid=fixtures[r['gameId']]['evidence']['id'];owner=i['owner_id']
 for d in [raw,norm]:
  for a in d['assertions']:
   assert a['field'] in allowed and a.get('ownerId',owner)==owner
   assert set(a['evidenceIds'])=={eid} and all(p['evidenceId']==eid for p in a['value']['pieces'])
 entries=[]
 for n,gt in enumerate(i['ground_truth']):
  e={'gt_index':n,'target':gt['target'],'field':gt['field'],'expected':gt['value'],'raw_actual':None,'normalized_actual':None}
  if r['gameId']=='splendor':
   index={'위 가운데 카드':1,'아래 가운데 카드':4,'아래 오른쪽 카드':5}[gt['target']]
   e.update(raw_actual=nested(at(raw,'market.scene',index).get('readout'),gt['field']),normalized_actual=nested(at(norm,'market.scene',index).get('readout'),gt['field']),correspondence='direct source object + anchor/crop; not inferred market ownership')
  elif r['gameId']=='sagrada':
   unsupported={'rows':'no current typed board dimensions','columns':'no current typed board dimensions','occupancy':'cell/placement manual, not AI geometry','printed-effect-paraphrase':'no typed effect field','visible-count':'favor stones absent from this owner photo binding'}
   if gt['field'] in unsupported:e.update(raw_status='unsupported',normalized_status='unsupported',reason=unsupported[gt['field']])
   elif gt['field']=='visible-dice-count':
    e.update(raw_actual=sum(p['componentId']=='dice' for p in pieces(raw)),normalized_actual=sum(p['componentId']=='dice' for p in pieces(norm)) if norm['assertions'] else None,representation='candidate-instance count, NOT populated typed value or quantity-null->1')
   else:
    if r['condition']=='A':
     pid={4:'new-local-physical-9',5:'new-local-physical-9',6:'new-local-physical-10',7:'new-local-physical-10',8:'new-local-physical-11',9:'new-local-physical-1'}[n]
     p=next(p for p in pieces(raw) if p['id']==pid);e['raw_actual']=p['readout']['values'][gt['field']]
     if gt['field']=='observedColor':e['raw_actual']={'노란색':'yellow','초록색':'green'}.get(e['raw_actual'],e['raw_actual'])
     e['correspondence']='direct image review + declared relative row/column anchor, not accepted board coordinates'
    else:
     label_value={4:5,5:'yellow',6:6,7:'green',8:6,9:'GREEN FOCUS'}[n]
     e.update(label_only_actual=label_value,label_only_status=status(gt['value'],label_value),reason='No raw readout. Text is not promoted to structured data.')
  else:
   if n<2:
    pair=[3,6] if r['condition']=='A' else [2,6]
    secondary='incorrect' if gt['value'] not in pair else 'ambiguous'
    if r['condition']=='A':e.update(raw_status=secondary,raw_end_pair=pair)
    else:e.update(label_only_end_pair=pair,label_only_status=secondary)
    e['correspondence']='foreground card anchor/crop; colour-end association unspecified; no inferred activeEnd'
   else:
    actual=[p.get('readout',{}).get('values',{}).get('nominalValue') for p in pieces(raw) if p.get('readout',{}).get('values',{}).get('nominalValue') is not None]
    if r['condition']=='A':
     assert actual==[5,10,2];e.update(raw_actual=actual,raw_status='missing',reason='One of two distinct 10 tokens omitted; frozen list is one GT item.')
    else:e.update(label_only_actual=[3,10,10,2],label_only_status='incorrect',reason='Typed values missing; label5->3 mismatch is secondary only.')
  e.setdefault('raw_status',status(gt['value'],e['raw_actual']));e.setdefault('normalized_status',status(gt['value'],e['normalized_actual']));entries.append(e)
 for p in pieces(raw):
  assert p.get('placement') is None
  for key in ['level','values.cell','values.activeEnd','values.handPosition']:assert nested(p.get('readout'),key) is None
 results.append({'sequence':r['sequence'],'game_id':r['gameId'],'condition':r['condition'],'gateway_roundtrip_ms':r['completedMs'],'upstream_network_provider_output_ms':r['diagnostics']['upstreamMs'],'normalization_ms':r['normalizeMs'],'reasoning_tokens_reported':r['diagnostics']['reasoningTokens'],'input_tokens_reported':r['diagnostics']['inputTokens'],'output_tokens_reported':r['diagnostics']['outputTokens'],'raw_pieces':len(pieces(raw)),'normalized_pieces':len(pieces(norm)),'raw_readout_pieces':sum('readout' in p for p in pieces(raw)),'raw_score_counts':dict(collections.Counter(e['raw_status'] for e in entries)),'normalized_score_counts':dict(collections.Counter(e['normalized_status'] for e in entries)),'gt_entries':entries,'scope_violation_count':0})
worker={r['sequence']:r for r in read(EXP/'evaluation.json')['results']}
for r in results:
 assert r['raw_score_counts']==worker[r['sequence']]['rawTypedGT']
 assert r['normalized_score_counts']==worker[r['sequence']]['usableNormalizedTypedGT']
replay=read(OUT/'experiment-review.replay.json');assert replay['exit']==0
out={'as_of':'2026-10-23','decision':'KEEP_HIGH_DEFAULT; NONE_QUALITY_GATE_FAILED; APPLY_TWO_NARROW_FORMAT_CORRECTIONS','evidence_level':'VERIFIED_SCOPED_PILOT_ONLY','card_sha256':sha(card_path),'gt_changes':0,'additional_paid_requests':0,'product_writes':0,
 'request_count':6,'automatic_retries':0,'http_and_json_success':6,'nonempty_normalized_results':4,'normalized_results_with_populated_typed_values':2,
 'input_checks':input_checks,'source_hash_checks':source_rows,'results':results,'worker_aggregate_match':True,
 'count_note':'Sagrada correct1 is19 candidate dice, not a populated typed detail. Unsupported5 never enter correctness denominator; primary27 frozen GT per condition are unchanged.',
 'measurement_boundary':'Local isolated gateway HTTP start through final nonstreaming JSON bytes. Includes provider network/queue/thinking/output; excludes phone camera/upload, app job queue/commit, render. headersMs is not model first-token latency.',
 'none_acceptance':'3 HTTP200 replies report deepseek-flash and effort none with reasoningTokens0; actual alias accepted in these calls, not merely configured.',
 'quality_gate':'FAILED: Splendor none introduces black->red bonus error and blue1 cost omission; both other none responses omit typed readouts. High also has visual mistakes and source-format rejection.',
 'minimum_fixes':[{'id':'E1','files':['server/ai/gameReadouts.ts','server/ai/generic.ts'],'description':'Fresh response source basis exactly matching its authorized same-scope piece evidence ID may be canonicalized to observation. Keep user/manual/foreign-id and non-null manual-field rejection. Never change saved/imported records.','diagnostic':'In-memory narrow alias-only replay recovers high Sagrada21/SCOUT15; no raw value or GT score changed.'},{'id':'E2','files':['server/ai/gameReadouts.ts','server/ai/generic.ts'],'description':'Remove optional/required contradiction for active typed schemas; include actual component readout values/sources shape in final response example, distinguish source basis from evidenceId. Do not parse arbitrary labels into accepted values or add paid retry.'}],
 'other_observations':['Both Splendor outputs select market.scene although frozen market-versus-owned context is UNKNOWN. Treat dedicated destination as unverified; current-game/area UI should let user select, otherwise prompt should use unassigned tray when context is not visible. No proof of public/private leak here.','Raw high Sagrada contains19 canonical dieColor claims despite uncertain lighting; not all are proven false. Correct format does not certify them.','Wrong extra Splendor black6/white1 costs and SCOUT label numerals are described separately; no new GT entries/denominator added.'],
 'limitations':['One call per game per condition, no p95/statistical estimate or120-game generalization.','Upstream full wire payload/billing is not independently captured; six attempts established by local ledger and single-fetch/no-retry code.','Operating high unchanged and temporary server shutdown use worker before/after metadata plus runner code; no settings/keys/process inspection by reviewer.','Candidate-only/accepted-save/reconnect behavior not exercised by this direct gateway runner.','Five Sagrada GT fields unsupported in this pinned scope; do not manufacture values or expand full board engine.','Future prompt/normalizer fix needs offline acceptance first; recognition benefit remains unmeasured without separately authorized calls.'],
 'artifact_hashes':files,'replay_file':'experiment-review.replay.json','verification_exit':0}
followup_path=ROOT/'docs/game-photo-integration/offline-replay.json'
followup=read(followup_path)
for row in followup['results']:
 assert sha(private/row['file'])==row['responseSHA256'] and row['AIcalls']==0
out['implementation_followup']={'evidence_level':'WORKER_REPORTED_RESULTS; RESPONSE_HASHES_INDEPENDENTLY_MATCHED',
 'path':str(followup_path.relative_to(ROOT)),'sha256':sha(followup_path),
 'summary':'Sol2 reports corrected high Sagrada21/SCOUT15 pieces with60/42 non-null typed values; none outputs retain0 non-null typed values. Matches this review diagnostic. Frozen integration source review is a separate task; these counts do not certify recognition accuracy.'}
(OUT/'experiment-review.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'requests':6,'reconstructed_pairs':3,'source_hashes':len(source_rows),'worker_aggregate_match':True,'http_success':6,'nonempty_normalized':4,'populated_typed_results':2,'decision':out['decision'],'exit':0},ensure_ascii=False))
