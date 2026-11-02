"""Offline game-by-game report from immutable references and current-service artifacts."""
import argparse
import collections
import hashlib
import json
import re
from pathlib import Path
from compare_anchors import compare

p=argparse.ArgumentParser();p.add_argument('--run-root',required=True);p.add_argument('--additional-run-root',action='append',default=[]);p.add_argument('--out',default='docs/service-all-games-20261027/results');a=p.parse_args();root=Path(a.run_root);runRoots=[root]+[Path(x) for x in a.additional_run_root];out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
load=lambda p:json.loads(Path(p).read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
inv={x['gameId']:x for x in load('docs/service-all-games-20261027/inventory.json')['entries']}
definitions={d['gameId']:d for d in load('game-photo-definitions/index.json')['games']}
plans={c['gameId']:c for run in runRoots for f in run.glob('plan-*.json') for c in load(f)['cases']}
ledger=[];caseFolders={};responseHistory=[]
for run in runRoots:
 attempts=load(run/'attempt-ledger.json')['attempts'];assert len(attempts)==len({x['gameId'] for x in attempts}),'duplicate attempt within experiment';ledger.extend(attempts)
 for folder in (run/'cases').iterdir():
  if (folder/'native-response.json').exists():
   n=load(folder/'native-response.json');code=n.get('error',{}).get('code',200);responseHistory.append({'gameId':folder.name,'code':code,'runRoot':str(run)})
   if folder.name in caseFolders:assert load(caseFolders[folder.name]/'native-response.json').get('error',{}).get('code')==402,'successful inference must not be repeated'
   caseFolders[folder.name]=folder
attemptedIds={x['gameId'] for x in ledger}
stop=load(runRoots[-1]/'run-stop.json') if (runRoots[-1]/'run-stop.json').exists() else None
nativeCodes={}
for nativeFile in [folder/'native-response.json' for folder in caseFolders.values()]:
 n=load(nativeFile);nativeCodes[nativeFile.parent.name]=n.get('error',{}).get('code',200)
refs={}
for f in Path('/private/tmp/keepboard-service-all-games-20261027-references').glob('sol*/*.json'):
 r=load(f)
 if isinstance(r,dict) and r.get('gameId') in inv:refs[r['gameId']]=r
reviews={}
for reviewFile in list(Path('docs/service-all-games-20261027').glob('sol*-adjudication.json'))+(list(Path('docs/service-all-games-20261027').glob('resume-adjudication.json')) if len(runRoots)>1 else []):
 for row in load(reviewFile).get('cases',[]):
  assert row['gameId'] not in reviews,'duplicate visual adjudication'
  reviews[row['gameId']]=row
entries=[]
for gid,e in sorted(inv.items()):
 ref=refs.get(gid);folder=caseFolders.get(gid,root/'cases'/gid);entry={'gameId':gid,'nameKo':e['nameKo'],'status':'적합성 검토 중','suitability':ref.get('suitability') if ref else None}
 if gid in plans:
  c=plans[gid];entry.update(sourceSHA=c['sourceSHA'],referenceSHA=c['referenceSHA'],scope={'areaId':c['areaId'],'partition':c['partition']},sourceURL=ref.get('sourceURL') if ref else None)
 if ref and ref.get('suitability')=='suitable':entry['status']='서비스 검사 대기'
 if ref and ref.get('suitability')!='suitable':entry.update(status='사진 보완 필요',reason=ref.get('suitabilityReason'))
 f=folder/'summary.json'
 if f.exists():
  s=load(f);c=plans[gid];referencePath=Path(c['referencePath']);assert sha(referencePath)==c['referenceSHA'],gid+' reference changed'
  ref=load(referencePath);entry.update(summary=s,sourceURL=ref.get('sourceURL'),sourceSHA=c['sourceSHA'],referenceSHA=c['referenceSHA'],scope={'areaId':c['areaId'],'partition':c['partition']},limitations=ref.get('sourceLimitations',[])+ref.get('unknowns',[]))
  nativePath=folder/'native-response.json';native=load(nativePath) if nativePath.exists() else None
  items=None
  if native and native.get('candidates'):
   try:
    parts=native['candidates'][0]['content']['parts'];wire=json.loads(''.join(p['text'] for p in parts if 'text' in p and not p.get('thought')));items=wire['items'];assert isinstance(items,list)
   except (KeyError,ValueError,TypeError):items=None
  if items is not None:
   # Free prose descriptions of structure/placement have no unique literal spelling. Keep them for review, outside exact-match denominator.
   semantic={comp['id']:{p['id'] for p in comp['properties'] if p['type']=='text' and not p.get('options') and p['id']!='observedColor' and not re.search(r'name|printed|text|label|symbol',p['id'],re.I)} for comp in definitions[gid]['components']}
   unsupported={comp['id']:{p['id'] for p in comp['properties'] if p['id'] not in c['allowedPropertyIds'].get(comp['id'],[])} for comp in definitions[gid]['components']}
   entry['visualComparison']=compare(ref,items,semantic,unsupported)
   entry['nativeCounts']=dict(collections.Counter(x.get('kind') for x in items))
  if s.get('error') or s.get('jobState')!='completed':entry['status']='서비스 처리 실패'
  elif not s.get('saveReopen'):entry['status']='저장·재열기 확인 필요'
  elif entry.get('visualComparison',{}).get('allSampledAnchorsAgree'):entry['status']='검사 표본 일치'
  else:entry['status']='판독 차이 검토 필요'
  if entry.get('visualComparison',{}).get('unsupportedProperties'):
   entry['manualInputNeeded']=True
   if entry['visualComparison'].get('allSampledAnchorsAgree') and s.get('saveReopen'):entry['status']='사용자 입력 필요'
  # Compare the provider envelope to decoded receipt and candidate independently of sparse visual anchors.
  candidatesPath=folder/'candidates-before-apply.json';candidates=load(candidatesPath) if candidatesPath.exists() else []
  receipts=[r for q in candidates for r in q.get('observationReceipts',[])];receipt=receipts[0] if receipts else None
  audit={'nativeToReceipt':None,'receiptToCandidateObjects':None,'candidateToReopenedExact':None,'projectionDeferredProperties':[]}
  if receipt and items is not None:
   obs=receipt['result']['observations'];byref={o['ref']:o for o in obs};errors=[]
   for i,item in enumerate(items,1):
    o=byref.get(f'item-{i}')
    if not o:errors.append(f'missing item-{i}');continue
    props={x['id']:({'state':'observed','value':json.loads(x['valueJson'])} if x['valueJson'] is not None else {'state':'unknown','value':None,'reason':x['unknownReason']}) for x in item['attributes']}
    b=item['box_1000'];box=None if b is None else {'x':b[1]/1000,'y':b[0]/1000,'width':(b[3]-b[1])/1000,'height':(b[2]-b[0])/1000}
    if not (o['componentId']==item['kind'] and o['face']==item['face'] and o['quantity']==item['quantity'] and o['bbox']==box and o['properties']==props):errors.append(f'decode difference item-{i}')
   audit['nativeToReceipt']={'objects':len(items),'exact':len(obs)==len(items) and not errors,'errors':errors}
   pieces={}
   for q in candidates:
    v=q['value'];objects=v.get('pieces',v.get('components',v.get('loose',[])+[t for g in v.get('groups',[]) for t in g.get('tiles',[])]));pieces.update({v['id']:v for v in objects})
   issues=[]
   for o in obs:
    v=pieces.get(receipt['componentRefs'].get(o['ref']))
    if not v:issues.append(o['ref']+': missing projected object');continue
    if v.get('region')!=o['bbox']:issues.append(o['ref']+': changed photo region')
    if v.get('evidenceId',None)!=receipt['request']['images'][o['imageIndex']]['evidenceId'] and receipt['request']['images'][o['imageIndex']]['evidenceId'] not in v.get('evidenceIds',[]):issues.append(o['ref']+': changed image source')
    if c.get('nativeBridge') is None:
     if v.get('componentId')!=o['componentId'] or v.get('quantity')!=o['quantity']:issues.append(o['ref']+': changed kind/quantity')
     for key,prop in o['properties'].items():
      if prop['state']=='observed' and v.get('readout',{}).get('values',{}).get(key)!=prop['value']:audit['projectionDeferredProperties'].append({'ref':o['ref'],'property':key,'native':prop['value'],'candidate':v.get('readout',{}).get('values',{}).get(key)})
    elif c.get('nativeBridge')=='rummikub':
     expectedKind='number' if o['componentId']=='numbers' else 'joker' if o['componentId']=='jokers' else 'unknown'
     if v.get('kind')!=expectedKind or v.get('face')!=o['face']:issues.append(o['ref']+': changed native tile kind/face')
     for key in ['color','number']:
      prop=o['properties'].get(key)
      if prop and prop['state']=='observed' and v.get(key)!=prop['value']:audit['projectionDeferredProperties'].append({'ref':o['ref'],'property':key,'native':prop['value'],'candidate':v.get(key)})
    elif c.get('nativeBridge')=='splendor':
     readout=v.get('readout',{})
     for key,prop in o['properties'].items():
      if prop['state']!='observed':continue
      value=prop['value'];actual=readout.get(key)
      if key in ['cost','requirements'] and isinstance(value,list):
       if any((actual or {}).get(row['symbol'])!=row['value'] for row in value):audit['projectionDeferredProperties'].append({'ref':o['ref'],'property':key,'native':value,'candidate':actual})
      elif actual!=value:audit['projectionDeferredProperties'].append({'ref':o['ref'],'property':key,'native':value,'candidate':actual})
   audit['receiptToCandidateObjects']={'objects':len(pieces),'allPresentWithRegionAndSource':not issues and len(pieces)==len(obs),'issues':issues}
   reopenedPath=folder/'reopened-session.json'
   if reopenedPath.exists():
    assertions=load(reopenedPath)['session']['assertions'];accepted=[x for x in assertions if x['status']=='accepted'];audit['candidateToReopenedExact']=all(any(z['field']==q['field'] and z.get('ownerId')==q.get('ownerId') and z['value']==q['value'] and z.get('observationReceipts')==q.get('observationReceipts') for z in accepted) for q in candidates)
  entry['pipelineAudit']=audit
  diagnosisPath=folder/'offline-diagnosis.json'
  if diagnosisPath.exists():entry['offlineDiagnosis']=load(diagnosisPath)
  if audit['projectionDeferredProperties'] or audit['nativeToReceipt'] and not audit['nativeToReceipt']['exact'] or audit['receiptToCandidateObjects'] and not audit['receiptToCandidateObjects']['allPresentWithRegionAndSource'] or audit['candidateToReopenedExact'] is False:entry['status']='서비스 전달 차이 검토 필요'
  entry['automatedStatus']=entry['status']
  pipeline_difference=entry['status']=='서비스 전달 차이 검토 필요'
  review=reviews.get(gid)
  if review:
   assert review['referenceSHA']==c['referenceSHA'] and review['nativeSHA']==sha(nativePath),(gid,'stale visual adjudication')
   entry['visualAdjudication']=review
   if s.get('error') or s.get('jobState')!='completed':entry['status']='서비스 처리 실패'
   elif pipeline_difference:entry['status']='서비스 전달 차이 검토 필요'
   else:
    entry['status']={'consistent':'시각 표본 일치','service-difference':'실물·값 차이','representation-difference':'구성·필드 차이','reference-error':'독립 참조 확인 필요','uncertain':'시각 판단 보류','integration-failure':'서비스 처리 실패'}.get(review['verdict'],entry['status'])
    if review['verdict']=='consistent' and entry.get('manualInputNeeded'):entry['status']='사용자 입력 필요'
 if nativeCodes.get(gid)==402:
  entry.update(status='외부 잔액 부족·판독 미실행',externalBlock='HTTP402: provider prepayment credits depleted')
 elif stop and gid not in attemptedIds:
  entry.update(status='잔액 부족으로 요청 보류',externalBlock='Not attempted after provider billing blockage')
 entries.append(entry)
counts=dict(collections.Counter(e['status'] for e in entries));tested=[e for e in entries if 'summary' in e];usage=collections.Counter()
for e in tested:usage.update({k:v for k,v in (e['summary'].get('usage') or {}).items() if isinstance(v,(int,float))})
estimate=(usage.get('promptTokenCount',0)*.75+(usage.get('candidatesTokenCount',0)+usage.get('thoughtsTokenCount',0))*3.75)/1e6
pipelineCounts={'nativeToReceiptExact':sum(e.get('pipelineAudit',{}).get('nativeToReceipt',{}).get('exact') is True for e in tested if e.get('pipelineAudit',{}).get('nativeToReceipt')), 'receiptToCandidateExact':sum(e.get('pipelineAudit',{}).get('receiptToCandidateObjects',{}).get('allPresentWithRegionAndSource') is True for e in tested if e.get('pipelineAudit',{}).get('receiptToCandidateObjects')), 'candidateToReopenedExact':sum(e.get('pipelineAudit',{}).get('candidateToReopenedExact') is True for e in tested), 'completedWithNoCandidates':sum(e['summary'].get('jobState')=='completed' and e['summary'].get('candidateCount')==0 for e in tested), 'jobFailures':sum(e['summary'].get('providerStatus')==200 and e['summary'].get('jobState')!='completed' for e in tested)}
result={'pipelineCounts':pipelineCounts,'version':'service-all-games-results-v1','expectedGames':119,'suitabilityReviewed':len(refs),'actualAttemptedGames':len(attemptedIds),'providerAttemptHistoryCount':len(ledger),'providerResponseHistory':responseHistory,'nativeHTTP200Games':sum(c==200 for c in nativeCodes.values()),'providerBlockedGames':sum(c==402 for c in nativeCodes.values()),'notAttemptedGames':119-len(attemptedIds),'runStop':stop,'finishedCaseRecords':len(tested),'visualAdjudicatedCases':sum('visualAdjudication' in e for e in entries),'states':counts,'usage':dict(usage),'estimatedUSD':estimate,'actualBilledUSD':None,'entries':entries,'limits':['First-pass one photo/one selected area per game, sparse independent Sol visual anchors. Not full-game reconstruction or whole-image accuracy.','Independent interpretations can be wrong; disagreements need image review. No post-prediction truth edits.','Color comparison accepts explicit shade modifiers and Korean/English aliases within the same base hue; exact strings/counts and expression variants remain in each result.',
'Extra outputs are unscored because a complete per-image object denominator is not available. Free prose structure/placement descriptions have no exact lexical denominator and are recorded for semantic review; unsupported hosted properties are separated as manual-input needs.','Current local product service and real Gemini, isolated temporary Stores; deployment/browser rendering not tested.']}
(out/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
lines=['# 다른 게임 실사진 서비스 검사 1차 결과','','카탄 제외 119종. 사진 적합성 → 솔 독립 표본 → 동일 사진의 실제 서비스 판독 → 저장·재열기를 구분한다. **표본 일치는 게임 전체 정확도 보증이 아니다.**','',f"직접 사진 검토 {len(refs)}/119 · 실제 요청 {result['actualAttemptedGames']}/119 · 결과 기록 {len(tested)}/119 · 비교 후 시각 재검토 {result['visualAdjudicatedCases']}/119",'','| 판정 | 게임 수 |\n|---|---:|\n'+'\n'.join(f'| {status} | {count} |' for status,count in counts.items()),'',f'추정 모델 비용 ${estimate:.4f} (실제 청구 미확인). 입력 $0.75/M·출력/생각 $3.75/M의 [공식 도입 가격](https://ai.google.dev/gemini-api/docs/whats-new-gemini-3.8) 기준.','', '아래 수치는 최초 자동 위치·문자열 비교다. 최종 시각 판정에서는 근사 상자·색 표현 차이를 구분했으므로 수치와 판정이 다를 수 있다. 게임별 이유는 뒤의 시각 재검토 표에 있다.','', '| 게임 | 상태 | 물체 표본 대응 | 종류 일치 | 읽은 속성 일치 | 저장·재열기 | 모델 시간 |','|---|---|---:|---:|---:|---|---:|']
for e in entries:
 v=e.get('visualComparison',{});s=e.get('summary',{});n=v.get('anchorCount');den=str(n) if n is not None else '—';m=lambda k:f"{v[k]}/{den}" if k in v else '—';props=f"{v['visiblePropertyAgreements']}/{v['visiblePropertyCount']}" if v else '—';ms=(s.get('jobTimings') or {}).get('providerMs');time=f'{ms/1000:.1f}s' if ms is not None else '—';save='일치' if e.get('pipelineAudit',{}).get('candidateToReopenedExact') is True else '미확인' if s else '—';link=f"[{e['nameKo']}]({e['sourceURL']})" if e.get('sourceURL') else e['nameKo'];lines.append(f"| {link} | {e['status']} | {m('matchedAnchors')} | {m('kindAgreements')} | {props} | {save} | {time} |")
lines+=['','세부 표본·차이·원응답/후보 전달 검사는 [results.json](results.json)에 있다. 원사진·독립 참조·원응답·개별 임시 저장본은 비공개 임시 경로에 유지하며 저장소에는 포함하지 않는다.','', '현재 판정은 위 검사 표본에만 적용한다. 사진에서 가리거나 읽지 못한 정보와 실제 주인·턴·숨긴 패는 추측하지 않았다.']
if stop:
 lines[2:2]=[f"**119종 사진·독립 참조 준비 완료. 실제 판독 응답 {result['nativeHTTP200Games']}종, 잔액 부족으로 판독하지 못한 게임 {result['providerBlockedGames']+result['notAttemptedGames']}종. 전체 119종 성능 검사는 아직 완료되지 않았다.**",'', 'Gemini가 선불 크레딧 소진(HTTP402)을 반환하여 실행을 중단했다. 19종은 요청이 거절됐고, 윙스팬·웜스팬 2종은 요청 전 보류했다. 이 21종은 성능 실패나 통과로 세지 않는다.','']
if result['nativeHTTP200Games']==119:
 lines[2:2]=['**119종 모두 실제 사진의 서비스 판독과 솔 독립 표본 대조를 마쳤다.** 이전 잔액 부족으로 미검사했던21종을 추가 실행했으며, 기존98종은 재요청하지 않았다.','']
(out/'README.md').write_text('\n'.join(lines)+'\n');print(json.dumps({k:result[k] for k in ['expectedGames','suitabilityReviewed','actualAttemptedGames','states','estimatedUSD']},ensure_ascii=False))

# Human-readable reasons keep visual adjudication separate from the raw geometric counts above.
with (out/'README.md').open('a') as fh:
 fh.write('\n\n## 판독과 저장을 나누어 보기\n\n')
 fh.write(f"원응답→관측 기록 원값 보존 {pipelineCounts['nativeToReceiptExact']}건, 관측 기록→후보 물체 보존 {pipelineCounts['receiptToCandidateExact']}건, 후보→저장·재열기 완전 일치 {pipelineCounts['candidateToReopenedExact']}건. 빈 후보 {pipelineCounts['completedWithNoCandidates']}건은 저장 성공으로 세지 않았다. 작업 처리 실패 {pipelineCounts['jobFailures']}건.\n\n")
 fh.write('위 표의 위치·속성 수치는 최초 자동 비교다. 아래 재검토는 사진과 원응답을 다시 보아 근사 상자·표현 차이를 해석한 결과이며, 최초 참조와 수치를 바꾸지 않는다. 표본 일치여도 전체 상태 완성이나 다른 사진의 성능을 뜻하지 않는다.\n\n')
 fh.write('| 게임 | 시각 재검토 | 근거 |\n|---|---|---|\n')
 for e in entries:
  v=e.get('visualAdjudication')
  if not v:continue
  reason=v.get('reason','').replace('|','\\|').replace('\n',' ')
  fh.write(f"| {e['nameKo']} | {e['status']} | {reason} |\n")

with (out/'README.md').open('a') as fh:
 fh.write('\n\n## 서비스 응답 처리에서 확인한 문제\n\n')
 fh.write('- 에이지 오브 이노베이션·도미넌트 스피시즈: 모름을 JSON null 대신 문자열 `\"null\"`로 반환해 현재 디코더가 거절했다.\n')
 fh.write('- 마블 챔피언스: 정수 단계에 문자열 `\"1\"`을 반환해 현재 값 검증이 거절했다.\n')
 fh.write('- 위 최초 실행 3건은 HTTP200 판독 응답은 받았지만 후보 생성에 실패했다. 원응답은 보존했고 보정·재요청하지 않았다.\n')
 if any((run/'run-stop.json').exists() for run in runRoots):
  fh.write('- 최초 배치 실행기의 중단 조건에 HTTP402가 빠져 있어 거절 응답이 이어졌다. 감독이 원인을 확인해 실행 프로세스를 중단했다. 원래 실행기와 원응답을 보존했고 추가 실행 전 HTTP402 즉시 중단 조건을 보완했다.\n')
 if 'terraforming-mars' in caseFolders and (caseFolders['terraforming-mars']/'summary.json').exists() and load(caseFolders['terraforming-mars']/'summary.json').get('providerStatus')==200 and load(caseFolders['terraforming-mars']/'summary.json').get('jobState')=='failed':
  fh.write('- 추가 실행의 테라포밍 마스: 원응답의 cubes 항목에 terrain 전용 속성(face/printedName/tileType)이 붙어 현재 종류별 속성 검증이 거절했다. 재보정·재요청 없이 원응답을 보존했다.\n')
 fh.write('\n이 검사는 제품의 현재 로컬 API 경로를 사용했다. 배포 사이트의 브라우저 화면, 스캔의 여러 프레임, 다른 판본·조명·게임 진행 상태는 이번 범위에서 시험하지 않았다.\n')

with (out/'README.md').open('a') as fh:
 fh.write(f"\n현재 미검사 {result['providerBlockedGames']+result['notAttemptedGames']}종. [남은 게임 목록](remaining-games.json). 이전402 거절 이력을 포함한 요청 수는 {len(ledger)}회이며 실제 판독 응답은 {result['nativeHTTP200Games']}종이다.\n")
