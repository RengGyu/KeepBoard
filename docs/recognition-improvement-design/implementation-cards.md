# 첫 구현 묶음과 인계 카드

제안만 작성했다. 제품 구현·배포·유료 호출은 이 연구의 권한에 포함되지 않는다. 첫 출시는 **Splendor base / public / market / 사진 1장**의 세로 흐름 하나다. 다른 영역/게임은 현행 경로를 유지한다. 모든 기능을 새 관측 형식으로 일괄 이관하지 않는다.

**소유권/순서**

[기존 작업 세션](../work-sessions.md)을 따른다. 감독이 기존 구현솔2에게 아래 backend·gateway·shared·해당 test 파일의 **일시 소유권을 명시 배정**해야 한다(server/ai·shared·gateway는 현재 기본 담당 밖). 구현솔은 src/** 담당을 유지한다. 새 thread/agent는 만들지 않고 shared 인터페이스부터 짧게 고정한다. 두 사람이 같은 파일을 동시에 수정하지 않는다. 잡무루나의 팩/아트 변경은 첫 묶음에 없다. 감독은 범위 승인/통합/최종 사용자 설명을 맡고 직접 구현을 전제하지 않는다.

**카드 1 — 구현솔2: Argon 공개 시장 → 기존 후보까지**

- OUTCOME: 시장 사진 하나가 202 job으로 시작되어 Interactions 완료 JSON을 기존 Splendor 후보로 만들고, 명시 적용/저장 API를 그대로 통과한다. 제공자 429/중단은 후보를 만들지 않으며 원본 유지. 운영 alias 교체는 별도 활성화 결정이다.
- 기존 위치: [gateway/server.mjs](../../gateway/server.mjs)의 `validateConfig/requestBody/upstreamRequest/finalJSON/usageNumbers/hostedJSON`, [server/ai/gateway.ts](../../server/ai/gateway.ts)의 `requestGatewayJSON`, [server/ai/index.ts](../../server/ai/index.ts)의 `requestJSON/analyzeEvidence/normalizeObservations`.
- 제안 신규 파일(아직 없음): `gateway/interactions.mjs`에 요청/응답/usage 순수 함수, `server/ai/marketObservation.ts`에 시장 prompt/schema/관측→앱 mapper. 기존 gateway fetch와 오류 처리를 재사용하며 SDK 의존성은 추가하지 않는다. `gateway/server.d.mts`는 실제 signature 변경 시 함께 갱신한다.
- protocol 필드를 model과 별도로 명시한다. 첫 성공 fixture와 동일하게 `/v1beta/interactions`, high 이미지/high thinking, summaries none, output32768, standard, store/background/stream false를 지원한다. 정상 응답은 `status=completed`와 최종 text JSON을 요구하며 thoughts/tool step은 제외한다. Schema는 문법만 제한하고 정답을 보증하지 않는다. legacy generateContent와 DeepSeek Responses는 그대로 남긴다.
- 기존 hostedJSON의 DeepSeek 고정을 새 protocol 선택 경로와 연결해야 cloud도 같은 계약이 된다. 키·alias 값은 출력/테스트fixture에 넣지 않는다. 실제 자격 연결/기본값 변경은 감독이 별도로 승인할 사항이다. gatewayStatus도 실제 선택과 불일치한 DeepSeek/high 고정 표시를 남기지 않는다. 지원되지 않는 직접120초 경로는 Argon pilot으로 우회 실행하지 않는다.
- 시간 제안: upstream220초, gateway client245/server250, cloud 함수300초(기존 설정). 유료 재시도0. `max_output_tokens`는 생각+최종 합계. 이번 Argon usage 3905+9648/5412+9431를 각각 13553/14843으로 해석하고, DS는 이미 합산된 output을 다시 더하지 않는다. totals가 모순되면 비용 UNKNOWN.
- 429/status/error code와 가능한 Retry-After만 구조화한다. 없는 reset 시각은 만들지 않는다. 현재 local job은 generic error로, cloud workflow는 모든 예외를 interrupted로 바꾸므로 [server/analysisJobs.ts](../../server/analysisJobs.ts), [server/cloudRuntime.ts](../../server/cloudRuntime.ts)의 `failCloudJob`, [workflows/analyze.ts](../../workflows/analyze.ts)의 실패 인계를 함께 연결한다. timeout/불명확한 전송 성공에 자동 재송신하지 않는다. provider별 대규모 scheduler는 추가하지 않는다.

작은 **제안 DTO**:

```text
{ version: 'market-observation-v1', cards: [
  { imageIndex: 0, bbox: {x,y,width,height}|null,
    face: 'front'|'back'|'unknown',
    points: integer|null, bonus: white|blue|green|red|black|null,
    cost: {white,blue,green,red,black: integer|null}|null,
    level: 1|2|3|null, quantity: integer|null }
] }
```

bbox는 전송한 실제 evidence의 왼쪽 위 기준 xywh 0..1이다. 순서는 identity가 아니다. 앞면 카드만 development readout, 뒷면은 deck/미확인으로 보존하고 가린 값은 null. level을 줄 위치에서 자동 추론하지 않는다. 카드 12장·승점/비용 합·색별 재고를 정답 제약으로 넣지 않는다. `cost.white=null`과 0은 다르다. 이 DTO는 B 실험 형식 자체가 아니므로 새 과제라고 기록한다.

서버는 실제 요청 사진에서만 evidenceId를 매핑하고 UUID/field=`market.scene`/owner 없음/후보 상태를 채운다. [shared/splendor.ts](../../shared/splendor.ts)의 `emptySplendorObservation/validateSplendorObservation`, [server/ai/splendor.ts](../../server/ai/splendor.ts)의 `normalizeSplendorModelRecord`, [generic.ts](../../server/ai/generic.ts)의 `genericCandidateValue`를 거친다. 라벨 문자열이나 카드 사전으로 없는 값을 복원하지 않는다. 기존 앞면 수량1 정규화 조건은 별도 테스트하여 변경 여부를 드러내고, 덱/가림/불명 수량까지1로 확장하지 않는다. 신선한 관측의 [validateCaptureObservation](../../shared/photoCapture.ts)와 commit의 별도 범위 검사를 모두 유지한다. `market` 허용 component는 development뿐이며 nobles/chips/player.scene 반환은 허용하지 않는다.

- 요청 plan: [server/index.ts](../../server/index.ts)의 job 생성 signature, [AnalysisTask](../../server/analysisTask.ts)의 prepared에 `planVersion, protocol/model/effort/resolution/outputCap, prompt/schema version, source/edition, area/owner/epoch, ordered input SHA`를 고정한다. 기존 alias 문자열만으로 재사용하지 않는다. credential은 plan에 넣지 않는다. local/hosted 실행 시 pinned plan과 resolved target이 다르면 미송신 오류로 멈춘다.
- 기존 [AnalysisJobs](../../server/analysisJobs.ts)/[CloudJobs](../../server/cloudJobs.ts)의 활성job 재사용·requestId 충돌·24h 조회, cloud batch claim/완료 재사용/paid step retry0 유지. 요청 fingerprint는 job 범위 재사용용이며 실물 중복 인식이나 다른 owner/epoch 결과 캐시로 사용하지 않는다. 전역 결과 캐시는 첫 묶음 밖.
- 첫 입력은 원본 또는 기존 `PhotoDialog`가 생성한 **독립 evidence 1장**. crop evidence 자신의 SHA/크기로 bbox를 정의한다. 현재 PhotoInput에는 parent crop transform이 없으므로 parent 사진 좌표로 역변환했다고 주장하지 않는다. 자동 crop·회전이 나중에 들어가면 parentSHA+crop/rotation 변환을 먼저 저장해야 한다.
- 관측 이후 `commitAnalysisTask/taskTarget`의 owner/PIN/epoch/사진/room revision 재검사, candidate-only/명시 적용 경계 유지. 공용 시장 위치를 선택한 것은 해당 판의 개인 소유권을 추론하라는 권한이 아니다. 부분 응답이 기존 accepted 전체 시장을 비우지 않게 한다. 현재 `GameEssentials.applyCandidate`는 필드 전체를 교체하므로 이를 부분 추가라고 재사용하면 안 된다. 이미 기록이 있는 시장에는 기존 `linkComponents`의 선택 항목 추가/expectedTargetAssertionId 경로를 사용하고, 전체 교체는 기존 명시 교체 동작으로만 남긴다. 서로 다른 사진의 같은 카드를 bbox만으로 자동 병합하지 않는다.
- 시간은 기존 `analyzeEvidence` images/provider/normalize와 job queue/commit을 잇는다. `requestGatewayJSON`이 버리는 diagnostics의 안전한 숫자만 반환 계약에 보존한다. 완료 JSON/정규화/후보 commit 시간을 분리한다. 신규 영구 telemetry 플랫폼은 필요 없다.

수용 예(오프라인·합성, 모델 호출0):

1. 저장된 성공 Interactions 응답의 final JSON/usage를 그대로 복원하고 incomplete/refusal/invalid JSON에서는 후보0. 기존 generateContent/Responses fixture도 유지.
2. 해당 시장의 development 2개, nullable 비용 일부, 점수0을 후보화→명시 반영→저장/reload에서 같은 값/근거를 얻는다. null→0/소유자 추정/수량→가격 변환 없음. 다른 부분의 accepted 카드도 보존.
3. imageIndex 범위 밖/다른 owner/epoch/captureTarget은 거절. 같은 requestId reload는 upstream0추가. plan 변경은 이전 활성job 재사용 안 함. 기존 user correction 중 완료하면 stale 처리; 이미 확정한 기록에 덮어쓰기 없음.
4. 합성149–150초를 실제 기다리는 대신 제어 가능한 fetch/clock fixture로120초 legacy와220초 pilot 경계를 확인. 429/전송 결과 불명/프로세스 재개에 paid 재호출0. cloud 완료 batch 재사용도 확인.
5. raw의 누락/오독을 정상 보존하는 것과 시각 정답을 구분. 기존 개인 사진/GT를 소스 fixture에 복사하지 않는다. 공개 가능한 최소 합성 fixture를 사용하고 승인된 비공개 replay는 그 위치에서만 읽는다.

기존 집중 검사 위치: `tests/ai-gateway.test.ts`, `tests/background-analysis-api.test.ts`, `tests/cloud-contract.test.ts`, `tests/photo-capture-api.test.ts`, `tests/game-recognition-normalize.test.ts`, `tests/component-linking-api.test.ts`. changed boundary에만 의미 있는 사례를 더한다. 매 파일 수정마다 전체 suite를 반복하지 않는다.

**카드 2 — 구현솔: 카드 원본 옆에서 정정하고 저장**

카드1의 DTO→기존 후보 계약이 고정되면 mock 후보로 먼저 진행 가능하다. 소유 파일은 [src/SessionWorkspace.tsx](../../src/SessionWorkspace.tsx), [GameEssentials.tsx](../../src/GameEssentials.tsx), [SplendorEditor.tsx](../../src/SplendorEditor.tsx), [PhotoTargets.tsx](../../src/PhotoTargets.tsx), [analysisJobMessage.ts](../../src/analysisJobMessage.ts), [scanTiming.ts](../../src/scanTiming.ts), 필요한 기존 style과 focused UI tests만이다. `ComponentLinkDialog`의 소유/대상 이동은 유지하고 새 시장 확인화면에서 중복 구현하지 않는다.

- 스플렌더 market 후보에서 카드 선택→`TargetCrop`+`SplendorFields`를 한곳에 배치. 같은 후보에 대한 기본 편집과 원본 확인을 위해 다른 모달을 왕복하지 않는다. 한 장의 점수·보너스를 고치고 다음 카드로 이동할 때 미저장 값이 유지된다.
- 기존 다중선택/삭제/새 카드 추가/명시 적용 경로를 유지한다. 빈 시장은 기존 후보 적용, 기록이 있는 시장은 `ComponentLinkDialog`를 해당 market 대상으로 열어 선택 카드만 추가한다. 현재 필드 교체 API를 묵시적 부분 병합처럼 사용하지 않는다. 자동 인정 체크박스나 모든 비용 필수입력은 추가하지 않는다. 알 수 없는 비용은 모름으로 저장 가능. NULL만 검토하면 된다는 뜻의 완료 표시 금지.
- area guide는 ‘공개 카드가 꽉 차게 찍어 주세요’ 정도로 짧게. 영역 선택이 픽셀 자르기임을 암시하지 않는다. 실제 crop 사진은 기존 PhotoDialog 경로로 사용한다. 한 스캔에 여러 각도 fan-out은 첫 묶음 밖.
- 분석 진행 중 기존 원본/메모 접근, 재접속 동일 job, 후보 도착 시 dirty 수정 보존. rate-limit이면 가짜 재개 countdown 없이 사진보존/직접정정/사용자 재시도. 일반 에러에 내부 API 명칭을 노출하지 않는다.
- `recordScanTiming`에 해당 시험의 photo-start/job-ready/correction-start/explicit-save/reopen 단계를 연결할 최소 로컬 기록만 추가한다. 사용자 미확인 저장은 ‘verified’로 자동 이름 붙이지 않는다. 시험 진행자가 사전GT와 대조해 그 여부를 기록한다.

수용 예: 합성 시장 후보에서 한 점수와 보너스를 정정, 누락 카드 추가, 허위 카드 삭제, null 비용 유지→선택 반영→저장→재열기 값 일치. 390px에서 crop/편집/반영 가능, 키보드 focus/명확한 이름/44px 조작. running 재접속과 429도 같은 화면에서 확인한다. 실AI/카메라 없이 합성 세션으로 가능. 이 검사는 실제 인식 성능을 인증하지 않는다.

**카드 3 — 합친 결과의 최소 판단, 유료 실행은 별도 승인 후**

개발 중에는 위 boundary tests만, 최종 통합에서 기존 typecheck/build 및 필요한 회귀를 한 번 수행한다. 이후 수정/실패/새 우려가 없다면 반복하지 않는다. 기존 소스·템플릿·tests 우선 탐색(search-first), 작은 사전 분모와 실패 보존(eval-harness), 비용/claim 기록(cost-aware), 이 README의 선택 근거(ADR)를 사용한다. 새 ECC 서비스/에이전트/커버리지 목표는 만들지 않는다.

아래는 **요청 카드**이며 이번에 실행/승인된 실험이 아니다:

- 결정: 첫 공개 시장 묶음이 기존 경로보다 **같은 확인 상태까지의 총시간**을 줄이는가. 모델 단독 인과/전게임 선택을 결정하는 시험이 아니다.
- 자료: 기존 승인 corpus에서 튜닝/이전 실험에 쓰지 않은 Splendor base의 서로 다른 물리 판 2장. 하나는 정면, 하나는 비스듬한 시장; 인쇄 판독 가능한 close-up. 사진·crop·같은 판의 다른 각도가 양쪽 holdout에 섞이지 않게 선정. 사진 접근/판본/권리와 실제 가독성이 확인되지 않으면 해당 사례는 UNKNOWN으로 보류하고 임의 새 수집/재콜 안 함.
- 사전 고정: SHA/판본/공용 market 경계/실물별 bbox·보이는 점수·보너스·읽을 수 있는 비용·가림/unknown. GT 작성 시 모델 응답 미열람. 비용 전부 확인 못하면 비용 전체 정확도를 계산하지 않는다. 명확한 무점 표시는 판본 근거로0, 단순 안 보임은null로 구별한다.
- 최대 **4 upstream 시도(실패 포함), retry0**: 사진1 현행 DeepSeek 앱 경로→새 Argon 시장 경로, 사진2 역순. 같은 evidence 바이트/해상도와 동일 market task/목표 GT, 각 모델high·출력32768; 관측 schema와 UI는 treatment 차이로 명시. 직접120초 경로는 Argon 실험으로 사용하지 않는다. 첫429/불명확한 전송 실패 시 중단, 남은 호출 자동 재개 없음.
- 예상 승인 상한 **$0.90**, 입력/출력 각각≤32768 가정이면 `2×32768×[(2+10)+(0.30+1.20)]/1e6=$0.884736`. 2026-10-24 [Argon](https://ai.google.dev/gemini-api/docs/pricing)/[DS peak](https://api-docs.deepseek.com/quick_start/pricing/) 기준이며 invoice가 아니다. Argon 가격은12월1일 변경 예정이므로 실행일 재확인. 입력 bound를 provider token-count로 검증할 수 없으면 보수 계산의 가정임을 기록하고 hard budget 보장이라고 말하지 않는다. 요금/한도/자격 불명확 시 전송 전 감독에게 해당 한계만 반환. 실패도 예약 예산에 포함.
- **속성:** 모든 사전 GT 대상으로 정답/오답/null/미검출/대응불명을 분리. **개체:** FP/누락/중복. **bbox:** unique center-match와 IoU 분포를 속성과 별도 보고; 대응 못한 물체를 분모에서 없애지 않음. **placement:** 첫 시장은 canonical 배치 자동생성 없음(N/A); 이것을 배치 정확도100%로 보고하지 않음. 실제 원본 연결/저장 대상은 검사.
- **사용자 시간:** t0 촬영/사진 선택→업로드→queue/provider/normalize→후보 보임→사전 GT와 같은 상태로 정정·명시 반영→저장→재열기. wall time, 사람의 active correction time, 필드 변경/추가/삭제/영역 이동 동작 수를 분리. 가능한 서로 다른 두 검토자에게 조건 순서를 반대로 배정하거나 학습 효과를 제한사항으로 남긴다. 같은 raw를 다시 모델 호출하지 않고 UI 시험에 재사용한다.
- 조건별 1회·2사진이므로 평균/p95 서비스 개선을 단정하지 않는다. 두 사진에서 각각 동일 확인 상태에 도달하고 총시간이 짧아지며 속성 오독/FP가 늘지 않으면 **그 좁은 pilot 유지 근거**로 삼는다. 결과 혼합이면 게임/조건별 유지 또는 UI만 먼저 적용; 글로벌 기본모델 변경 근거로 사용하지 않는다. 실패/이탈은 성공 사례의 시간분모 밖으로 숨기지 않고 별도 완료실패로 보고한다.

**이후에만 하는 일**

1. Catan: [shared/scene.ts](../../shared/scene.ts)의 `CATAN_TOPOLOGY/slotPoint/snapToSlot`로 사용자 확인 기준점/방향→로컬 평면 변환→슬롯 후보를 만든다. transform은 원본 SHA/평면에 귀속, 허용 거리 밖/충돌은 미배치. `sceneAssembly`의 부분 보존과 `SceneWorkspace`의 명시 적용 사용. 높이 있는 말/도로는 근거 bbox 중심만으로 확정하지 않음. 별도 소규모 사진에서 숫자 정답과 배치 정답을 분리한 뒤 활성화.
2. 같은 pilot에서 provider 시간이 계속 지배하면 Argon **high→medium 한 변수**만 다음 비교 후보. ROI·출력 cap·모델을 함께 바꾸지 않는다. 별도 호출 승인 전 실행0. Sagrada429가 해소됐다는 근거가 없으므로 현재 성능 UNKNOWN 유지.
3. 다른 게임은 기존 계약에서 관측 가능한 필드와 수동/비밀 상태를 구분한 채 mapper를 재사용한다. 120개 동시 변경·전용 학습/검색 인프라·전체 카드 사전은 이번 인계 밖이다.
