from pathlib import Path
import json,csv,shutil
R=Path(__file__).resolve().parents[1]
SHA='d7e6d098116659b727dae50a8ae204b1ab566aae'
URL=f'https://github.com/RengGyu/KeepBoard/blob/{SHA}/'
photos={
 'sagrada':'94368d0c2f995914b9e857ceafa04afbfaff112c2b309ee082a4d2d4ac7a4feb',
 'lost-cities':'d6abc06aca6feda5f747803aca9df403e93fddf8acd807c8b5e654afb11c78cc',
 'seven-wonders':'ea5f475396df0714f212b4440bb18215b85fbcc717d103d48ce59db98fbbbd14'}
def write(name,text):
 (R/name).parent.mkdir(parents=True,exist_ok=True);(R/name).write_text(text.strip()+'\n',encoding='utf-8')
def js(name,obj):write(name,json.dumps(obj,ensure_ascii=False,indent=2))
prior=[
 ['sagrada-baseline',38,42,4,68,92],['sagrada-high',38,42,4,72,92],['sagrada-medium',38,42,4,71,92],['sagrada-low',19,41,22,72,87],
 ['lost-cities-baseline',41,42,1,115,205],['lost-cities-high',41,43,2,117,210],['lost-cities-medium',42,43,1,116,210],['lost-cities-low',45,46,1,105,225],
 ['seven-wonders-baseline',101,117,16,209,376]]
prior=[dict(caseId=x[0],reportedAssigned=x[1],reportedObjects=x[2],reportedUnassigned=x[3],reportedKnown=x[4],reportedRequested=x[5],correctlyPlaced=None,provenance='EVIDENCE.md; reported numbers, not a full estimator replay in this review') for x in prior]
effort=[['sagrada-high',59.530,79.533,65,20],['sagrada-medium',21.120,39.826,64,21],['sagrada-low',5.630,28.912,65,15],['lost-cities-high',58.497,75.431,75,93],['lost-cities-medium',23.654,44.136,74,94],['lost-cities-low',3.329,30.698,60,120]]
js('data/reported-metrics.json',dict(source=URL+'docs/pro-review-20261113/EVIDENCE.md',placements=prior,effort=[dict(caseId=x[0],firstHttpPreviewSeconds=x[1],completionSeconds=x[2],knownNonFaceFields=x[3],unknownNonFaceFields=x[4],firstUsefulValuePaintSeconds=None,provenance='reported source metrics; not independently timed') for x in effort]))
js('ground-truth.json',dict(schemaVersion='keepboard-review-ground-truth-v1',sourceCommit=SHA,directVisualReviewCompleted=False,warning='This is an explicit blocked truth ledger, NOT a completed answer key. No values have been promoted from model responses or prior AI review.',cases=[dict(caseId=g,sha256=h,reviewStatus='blocked-original-image-bytes-unavailable',exhaustive=False,objects=[],requiredVisualAudit={'sagrada':'18 foreground dice plus track/tools/objectives/tokens','lost-cities':'both sides, lanes, discard roles, 9/6 and proposed extra 8','seven-wonders':'at least 20 stratified physical objects and actual anchor membership'}[g]) for g,h in photos.items()]))
ex=json.loads((R/'data/sagrada-response-extract.json').read_text());lat={r['effort']:r for r in json.loads((R/'verification/lattice-excerpt-results.json').read_text())}
rows=[]
for effort,items in ex['responses'].items():
 for item in items:
  cell=lat[effort]['cells'].get(item['id'],{})
  rows.append(dict(case_id='sagrada-'+effort,source_sha=photos['sagrada'],photo_path='docs/pro-review-20261113/photos/sagrada.jpg',piece_id=item['id'],bbox=json.dumps(item['bbox']),reported_color=item['values']['dieColor'],reported_value=item['values']['dieValue'],current_product_anchor='',current_product_cell='',diagnostic_row=cell.get('row'),diagnostic_column=cell.get('column'),photo_anchor='',photo_cell='',photo_value='',verdict='UNADJUDICATED_ORIGINAL_IMAGE_NOT_VIEWED',basis='stored-response subset; standalone lattice diagnostic; not product replay',image_evidence_available=False))
with (R/'placement-audit.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
shutil.copyfile(R/'response-pair-correspondence.csv',R/'matched-results.csv')
js('metrics.json',dict(sourceCommit=SHA,status='PARTIAL_CODE_AND_RESPONSE_REVIEW_NOT_PHOTO_AUDIT',originalImagesVisuallyReviewed=0,sevenWondersPhotoSamplesReviewed=0,lostCitiesPhotoSamplesReviewed=0,photoGroundTruthObjects=0,photoAccuracy=None,correctlyPlaced=None,fullAppTestsExecuted=False,newProviderCalls=0,newPaidCalls=0,remoteWrites=0,responseComparison=json.loads((R/'verification/sagrada-pair-results.json').read_text()),geometryDiagnostics=[dict(caseId='sagrada-'+k,inputCount=v['inputCount'],algorithmAssigned=v['assignedCells'],correctlyAssigned=None,roleAndAnchorGatesBypassedForDiagnosis=True) for k,v in lat.items()],reportedBaseline=prior))
findings=[
 ('P0-01','code_counterexample_confirmed','manual-scope', 'shared/estimatedBoardStructure.ts','estimateBoardStructure:44','Automatic context uses other fields; manual refs require same assertion, rejecting same-source cross-field anchor.','4-file minimum patch','Full app save/reopen not executed'),
 ('P0-02','code_counterexample_confirmed','display','src/EstimatedBoardView.tsx','renderWithAttachments / roots','Cycle has no root; grandchild is not rendered. Every live object must remain reachable.','4-file minimum patch','No claim supplied real photos contain cycles'),
 ('P1-01','code_counterexample_confirmed','structure','shared/estimatedBoardStructure.ts','lost-cities discard grouping','Discard key omits board instance; two boards with same colour can merge.','board-qualified group key','Actual supplied photograph collision not established'),
 ('P1-02','code_counterexample_confirmed','structure','shared/estimatedBoardStructure.ts','lost-cities toward / side','Side derives from photo centre, so translation/crop can flip sides without changing board relation.','board-relative frame and A/B side','Real photo orientation unverified'),
 ('P1-03','code_counterexample_confirmed','anchor','shared/estimatedBoardStructure.ts','nearAnchor:24-29 / seven-wonders branch','Nearest board centre need not mean correct physical membership; unique containing board is not preferred.','relation / local-frame inference, explicit uncertainty','7W 20-object photo verdict missing'),
 ('P1-04','code_path_confirmed','role-anchor','shared/estimatedBoardStructure.ts','sagrada window candidates / diceLattice','Window anchor and source role gate cell inference. Low candidate geometry alone assigns18 but product gate cannot be bypassed as a fix.','Reuse observed anchor or one local frame correction','No new inferred window or source role invented'),
 ('P1-05','code_path_confirmed','display-semantics','shared/estimatedBoardStructure.ts;src/EstimatedBoardView.tsx','round-track extent / g.slots','Relative bands and equal AABB bins render with numbered slots, distinct from printed round certainty.','slotBasis and observed band labels','Do not claim actual printed rounds correct'),
 ('P1-06','code_path_confirmed','role-attachment','shared/estimatedBoardStructure.ts','tokens/favors loop','All tokens go through tool attachment; independent reserve tokens must not be forced onto a tool.','Role distinction and qualified attachment candidate','Exact token in supplied photo remains unverified'),
 ('P2-01','inference_requires_integration_test','edit-precedence','shared/estimatedBoardStructure.ts;src/GameBoardRecord.tsx','structureOverride branch precedes retained projection','Stale structure override may outrank subsequent native layout edit unless transition clears relevant overlay.','Explicit per-relation edit mode precedence','Not yet reproduced through real UI'),
 ('KEEP-01','code_confirmed_no_new_patch','display','src/GameBoardRecord.tsx;src/GenericPieceArt.tsx;src/piece-face-values.css','art(p,true) / compact','Estimated-board rendering already requests compact artwork on wide and mobile viewports.','Keep current implementation; no blanket duplicate rewrite','Screenshots not visually inspected'),
 ('KEEP-02','code_confirmed','provenance','shared/drawingProjection.ts','photoDrawingReference','Owner/evidence/epoch/source/definition/transform checks are existing safeguards.','Keep; never relax to boost placement count','Not an authorization replacement'),
 ('METRIC-01','executed_response_comparison','evaluation','analysis/match_observations.py','match_objects','18 pairs per Sagrada output pair matched without values/colour/ID hard gates.','Use geometry plus explicit ambiguous/merged statuses','Response agreement is not photo accuracy'),
]
with (R/'findings.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['id','evidence_status','layer','file','function_condition','finding','resolution','limitation']);w.writerows(findings)
js('sources.json',dict(sourceCommit=SHA,repository='RengGyu/KeepBoard',pinnedCodeBlobs={'shared/estimatedBoardStructure.ts':'1faaa03e371ef029e9a3ccaa28454785fd4559db','shared/estimatedGeometry.ts':'c7a99e0dd339e3ce0ec300d790a61b66927b0666','src/EstimatedBoardView.tsx':'9b6a3f21909a4c51bf6b396bd39afb7ccbf4e393'},photos=[dict(game=g,sha256=h,bytesAvailable=False,viewed=False) for g,h in photos.items()],officialRules=[dict(id='R-SAG',url='https://floodgategames.com/Sagrada/Sagrada-Rules-Floodgate-Games-SA01.pdf',verification='text + screenshot of pages3 and4; supplied photo edition not identified'),dict(id='R-LC',url='https://cms.kosmos.de/game-instructions/4002051694135_Lost%20Cities_Duell_Manual_web.pdf',verification='official parsed text; screenshot attempted but cache miss; 2018 6-expedition edition; photo edition unknown'),dict(id='R-LC-OLD',url='https://fragkosmos.zendesk.com/hc/de/article_attachments/8088013281052',verification='official parsed text; screenshot cache miss; 2015 5-expedition edition; photo edition unknown'),dict(id='R-7W',url='https://rules.dized.com/game/pmaODHsUS_65I0ac8XvnoQ/Vb8L5V6lR-qPb3Fh0J30lg/phase-2-build-a-stage-of-a-wonder',verification='publisher-maintained official rules HTML; supplied photo edition not identified')]))
write('README.md',r'''
# KeepBoard 위치 복원 코드·응답 감사 — 부분 결과와 최소 패치

기준: `RengGyu/KeepBoard@d7e6d098116659b727dae50a8ae204b1ab566aae` · 2026-11-13

## 완료 범위와 중요한 제한

**이 묶음은 PRO_PROMPT 전체 요청의 완료본이 아니다.** 지정 문서·실제 소스·저장 응답은 읽었고, 코드 반례·응답 간 재대응·기하 알고리즘 진단과 최소 패치는 실행했다. 그러나 비공개 GitHub 이미지가 이미지 파일로 전달되지 않아 **원사진 3장과 스크린샷을 직접 보지 못했다.** 세븐 원더스 20개 표본의 실제 소속 판정, 사그라다 18개 사진 정답표, LC 9/6·추가8의 실물 판정, 6응답의 사진 기준 오독률은 미완료다. 이전 AI 판단을 새 정답으로 승격하지 않았다.

`placement-audit.csv`의 54행은 사그라다 3응답×전경 후보18의 **응답/기하 진단 유보표**이다. 원사진 정답이나 제품 배치 성공표가 아니다. `ground-truth.json`은 미확인 상태를 명시한 빈 정답 원장이고, 채점기는 이를 기본적으로 거부한다. `matched-results.csv`의108행은 **응답↔응답**의 색·눈 비교이며 사진↔응답 정답표가 아니다. 7W 표본20개를 만들었다고 표시하지 않는다.

원본 접근에 필요한 것은 새 유료 실험이 아니라 **해당 커밋의 저장소 ZIP 또는 원사진과 기존 JSON의 파일 첨부**다. 기존 `photos/` 자료가 있으므로 우선 새 촬영을 요구할 이유는 없다.

## 바로 사용할 결과

| 파일 | 내용 |
|---|---|
| `findings.csv` | 실제 파일·함수·조건별 코드 결함/추정/보존 항목 |
| `design.md` | 판 내부 좌표계와 관계 기반 공통 구조, 기존 코드 연결, 게임별 필요한 정보 |
| `implementation-plan.md` | 우선순위별 수정 파일·함수·계약·완료 기준 |
| `patch/minimum.patch` | 기존 파일2개 수정 + 새 helper·test2개 추가 |
| `patch/apply_minimum.py` | 원본 Git blob 해시 확인 후 기본 dry-run, 명시할 때만 적용 |
| `analysis/match_observations.py` | 값·색·ID를 정답 대응의 강제 조건으로 쓰지 않는 오프라인 채점 도구 |
| `analysis/build_response_comparison.py` | 실제 저장 응답에서 전사한 사그라다54후보로 재대응 결과 재생 |
| `analysis/relation_core.py` | 판 좌표 변환·사진중앙 비의존 편 구분·판별 그룹키·부분순서의 실행 가능한 알고리즘 원형 |
| `analysis/run_lattice.cjs` | 기존 diceLattice를 동일 응답 좌표에서 실행하는 격리 진단 |
| `experiments.md` | 새 호출 없이 해결할 범위와 조건부 추가 비교 |
| `metrics.json`, `verification/` | 새로 실행한 것과 기존 보고값의 분리, 검사 로그 |

## 직접 확인한 우선 결함

1. **수동 기준판 연결의 범위가 자동 배치와 불일치:** 자동은 같은 원사진의 다른 기록 영역을 참고하지만 수동 정정은 같은 assertion만 허용한다. 유효한 cross-field anchor를 미연결로 만드는 조건을 반례로 재현했다. 기존 출처·소유 범위 검증은 유지한 채 최소 패치에 반영했다.
2. **부착물의 표시 소실:** A↔B 순환은 root가 없어 둘 다 숨고, A→B→C의 C는 원래 렌더 함수가 재귀하지 않아 표시되지 않는다. 데이터 삭제가 아닌 표시 소실이다. 파생 표시에서 순환을 풀어 경고하고 모든 실물을 남기는 최소 패치를 넣었다.
3. **LC 버림 묶음에 판 ID 누락:** 같은 소스 안의 여러 판에 같은 색 버림 묶음이 있으면 합쳐질 수 있다. 실제 제공 사진에서 발생했는지는 미확인이다.
4. **LC 편의 사진중앙 의존:** 판과 카드를 같이 이동해도 사진중앙 기준 때문에 near/far가 바뀌는 반례를 재현했다. 해결은 판의 관측 축/방향 기준이지 사진별 좌표 보정이 아니다.
5. **7W 최근접 중심은 소속의 증거가 아님:** 한 판 안에 있는 대상이 다른 작은 판의 중심에 더 가깝다는 이유로 다른 anchor를 선택하는 반례가 있다. 다만 실제117개 중 오배치 수는 사진 없이 정하지 않았다.
6. **Sagrada low는 숫자만의 문제가 아님:** 동일하게 전경 후보18개를 기하 함수에 주면 high/medium/low 모두18개 셀 주소를 반환한다. low의 제품 배치 저하는 창문 anchor·영역 역할 게이트와 함께 분석해야 한다. 이 격리 진단에서 게이트를 우회했다고 제품 게이트를 제거하자는 뜻은 아니다.

## 응답 간 대응 실행 결과 — 정확도가 아님

| 두 응답 | 기하 대응 | 색·눈36항목 중 동일 | 서로 다른 값 | 한쪽 모름 | 양쪽 모름 |
|---|---:|---:|---:|---:|---:|
| high/medium |18|32|2|1|1|
| high/low |18|31|3|2|0|
| medium/low |18|34|1|1|0|

색을 identity gate로 쓰지 않아 high의 `yellow/4`와 medium의 `보라색/6`을 같은 위치 후보로 연결했다. 무엇이 사진에 맞는지는 아직 유보다. 이 결과는 “medium은 ID가 달라 대량 미대응이므로 나쁘다”는 근거를 반박하지만 **medium 전체 정답**을 증명하지 않는다.

## 오푸스 검토에 대한 판정

- 동의: 101/117을 정답 위치로 부르면 안 된다. ID 의존 대응은 교체해야 한다. 규칙으로 자동 보정하면 안 된다.
- 수정: 색을 강제 일치 조건으로 사용하면 색 오독이 평가에서 탈락한다. 기하로 대응한 뒤 색을 채점한다.
- 반박: `[3,4,5,6,8,10]`은 중복 없이 증가하므로 그 두 규칙만으로 “8은 추가 실물 오류”라고 검출할 수 없다. 사진상 겹침·독립 카드 대응이 필요하다.
- 보류: 원사진의9를6으로 읽었다는 결론, medium 오독0, 7W 실제 묶음 정확도.
- 현 코드에서 재작업 불필요: 추정 복원판은 이미 `art(p,true)`→`GenericPieceArt compact`를 모바일/넓은 화면 공통으로 사용한다. 다른 경로의 화면 문제는 실제 렌더 확인 전 일반화하지 않는다.
- 전환 보류: high→medium 기본값은 원사진 기준 품질을 재채점하기 전 바꾸지 않는다. 30초를 전환 기준으로 강제하지 않는다.

## 패치 적용

이 패치는 원격 저장소에 커밋·푸시하지 않았다. 먼저 작업용 브랜치에서:

```sh
python patch/apply_minimum.py --repo /path/to/KeepBoard
# DRY-RUN OK 후 아래 둘 중 한 방식만 사용
python patch/apply_minimum.py --repo /path/to/KeepBoard --apply
# 또는: cd /path/to/KeepBoard && git apply /path/to/review/patch/minimum.patch
```

기존 두 파일의 Git blob 해시를 확인하므로 다른 커밋에는 강제 적용하지 않는다. 이 묶음의 `verification/pinned/`는 **검증한 관련 소스3개**이지 완전한 원앱이 아니다.

## 검증 범위

`verification/verify-local.sh`로 재실행한다. Python matcher10개, 구조 원형11개, TypeScript helper15개, 기존 조건 반례6개를 실행한다. TypeScript helper와 원형의 개별 검사, 변경 TS/TSX의 구문 변환, 정확한 원본에 대한 패치 적용 검사다. **원앱 전체 타입 검사·전체 테스트·브라우저 렌더·실제 저장재열기는 실행하지 못했다.** helper 테스트 통과를 원앱 통합 통과로 표시하지 않았다.

새 provider 호출0회, 유료 호출0회, 학습0회, 배포/원격 수정0회. 사진 정확도와 올바른 위치 수는 `null`로 유지했다.
''')
write('experiments.md',r'''
# 추가 실험: 기존 자료 재평가부터

## 이번에 실제 실행한 것

유료 모델 호출 없이 소스 조건 반례6개, 안전 helper15개, 기하/부분순서 원형11개, 대응기10개를 실행했다. 저장 응답에서 전사한 사그라다 각18후보를 색/값/ID 강제 조건 없이 재대응했다. 같은 후보의 bbox를 원본 `diceLattice`에 넣는 격리 진단도 실행했다. 제공 사진과 실제 화면은 보지 못했다.

## 우선 필요한 입력 — 새 실험이 아님

지정 SHA의 ZIP에 이미 있는 `photos/`, `data/cases/`, `data/structures/`, `screenshots/` 바이너리를 읽을 수 있어야 한다. 새로운 촬영·고성능 호출을 요청할 단계가 아니다. 원사진을 확보하면 다음을 동일 기존 응답으로 수행한다.

- Sagrada 전경18개 + 트랙/카드/토큰의 식별 가능한 범위에 GT 작성; 눈이 불명확하면 null+reason.
- LC 양편·색줄·버림의 독립 실물별 대응; 9/6 방향 단서, 제안된8의 실제 독립 영역/중복 여부.
- 7W 각 관측 판 인스턴스×카드색·동전·군사·단계/경계 사례에서 최소20개를 사전 층화 선정. 오류만 골라 전체오류율로 환산하지 않는다. 사진상 역할 불명확 표본도 유보로 남긴다.
- six stored efforts를 동일 GT·같은 일대일 매칭 규칙으로 채점. field/ID/색 오독 때문에 같은 실물이 다른 것으로 탈락하지 않게 한다.

## 모델 선택 — 현재 결론

medium을 ID/색 기반 미대응으로 버릴 근거는 약하다. 그러나 새 사진 정답표를 완성하지 못했으므로 기본값 전환을 승인하지 않는다. high의 설정값이 의미상 “더 정확한 정답”도 아니다. 3응답 간 불일치와 필요한 구조 누락을 함께 비교한다. 현재 report의 provider/model 이름은 저장소 alias 기준이며 외부 공개모델과 동일하다고 새로 인증하지 않았다.

`firstHttpPreviewSeconds`는 첫 필요한 값이 사용자의 화면에 그려진 시간이 아니다. 기존 `previewValues.ts`/`EarlyScanValues.tsx`를 활용해 첫 non-face 값 수신, DOM 반영, 최종 저장, 수동수정 시간을 구분한다. 이번엔 DOM paint를 측정하지 않았다.

## 조건부 최소 추가 호출

### E1 — 같은 구조 출력에 대한 high/medium 반복 안정성

조건: 기존6응답을 원사진으로 재채점해도 강도 선택이 불확실한 경우만 실행.
가설: 차이는 설정이 아니라 단발 변동일 수 있다.
입력: 기존 Sagrada·LC 각1사진. 설정/원본bytes/요청/코드SHA를 고정하고 순서를 교차.
호출: 2사진×2강도×추가1회=4회, 자동 재시도0. 기존1회와 새1회로 방향을 보되 통계적 보증으로 쓰지 않는다.
비용: `sum(input_tokens * input_rate + billed_output_tokens * output_rate + provider_fixed_fee)`; hidden reasoning 과금은 공급 계약을 포함한다. 현재 묶음에서 실제 단가·청구명세를 확보하지 못해 원화 견적을 만들지 않았다. 승인용 estimate와 절대 지출 상한을 먼저 기록해야 실행할 수 있다.
판정: 필요한 값/개별 분리/판·편·순서 오류, 유보/누락, 수정시간을 우선. 30초는 통과선 아님. 개선·악화가 섞이면 경로별 유지, 전게임 기본값 변경하지 않음.

### E2 — 7W에서 관계 정보가 최근접 중심보다 도움이 되는가

조건: 기존 receipt에 관계/boardInstance가 없어 제공 원사진의 유보가 풀리지 않는 경우만 실행.
변수: 같은 모델·강도에서 “개별 관측 + 필요한 anchor/stack relation”만 추가. 카드명 전수·숨은 stage 카드정체는 요구하지 않는다.
호출: 동일 사진 기존계약1회+변경계약1회=2회, 재시도0. 첫 단계는 원본 응답으로 코드 연결만 바꿔0호출로 비교한다.
판정: 고정20+표본의 실제 판 소속/필요한 순서/겹침 정확성, unknown·누락, 기존값보존. 배치수 증가만으로 채택하지 않는다. 넓은 영역 묶음 출력을 개별정답으로 채점하지 않는다.

### E3 — 새 사진 일반화

조건: 기존 자료의 결함 수정이 확인된 뒤 출시 전 작은 점검이 필요한 경우.
입력: 같은 실물 상태를 단순 크롭한 사진뿐 아니라, 다른 실제 배치·회전·2판·가림이 포함된 소수 독립 사진. 사진 수/비용은 E1/E2 판정 이후 정하고120종 전수실험을 선행하지 않는다.
코드 테스트는 translation/rotation/scope/삭제/정정으로 먼저 검증한다. 단순 기하 변형은 독립 실사진 정확도 표본으로 세지 않는다.

## 하지 않는 실험

프롬프트에 이번 사진의 정답18개·좌표·목록 삽입, 게임당새렌더러, 모든사진OCR+SAM+강한모델직렬호출, 로컬4B재시도 반복, 근거 없는 비용/속도 목표 확정, 색 일치로 대응한 뒤 색정답률 측정.
''')
