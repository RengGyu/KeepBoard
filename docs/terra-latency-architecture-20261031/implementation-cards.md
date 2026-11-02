# 구현 인계 — 원인별 작은 순서

2026-10-31 · RECOMMENDATION · 이번 연구의 제품 편집/추론 실행 0

## 카드 1 — 관측 값을 결합하면서 생기는 퇴행부터 좁히기

**목적:** high를 붙이기 전에 정상 숫자가 작은 crop 때문에 바뀌는 제품 손실을 막는다. 새 검출·오독 해결로 포장하지 않는다.

**소유:** 감독이 지정할 기존 Sol 한 명. `server/observationFusion.ts::projectGenericFusion`의 속성 선택 및 그 직접 tests. 다른 Sol의 보드 자산/팩/화면은 소유하지 않는다. 현재 dirty tree와 이전 freeze는 보존하고 수정할 파일 preimage를 별도 기록한다.

**불변식/허용 변경**

- `known` 값들이 같거나 한쪽만 known이면 기존 보충을 유지한다. `0`, `false`, 수동 null·삭제를 unknown과 혼동하지 않는다.
- 서로 다른 known 값에서 ROI 면적만으로 `focused-provisional` 선택을 하지 않는다. 수동값 → 기존 잠정 선택 → deterministic anchor 순서를 유지하고, 동일 실물의 나머지 속성·정상 물체는 계속 편집 가능하게 둔다. 양쪽 literal·출처·필드 conflict를 남긴다.
- high·다수결·두 응답의 동의도 정답 인증으로 쓰지 않는다. 더 작은 crop의 올바른 수정 기회를 줄일 수 있다는 손해를 함께 기록한다.
- 물체 정체성/기하 threshold, group retirement, owner/epoch, native 조립, 원본 값은 이번 카드에서 바꾸지 않는다. 충돌을 이유로 모든 관측을 unresolved로 보내지 않는다.

**수용:** known 충돌/보충/같은 값/0·false/수동값·삭제·null/역순·재전달 합성 검사. 기존 A+C/B+C의 숫자 3개 자동 교체가 없어지는지, B+D 모름 보충이 유지되는지, 새 A+D와 이전 10게임 저장 응답에서 실물·raw 소실이 없는지 비교한다. 부분 참조 밖 오연결 0을 주장하지 않는다. focused 정답 수정이 줄어드는 경우를 숨기지 않는다. 관련 집중 검사 후 typecheck/build, 전체 반복은 변경 영향이나 새 실패가 있을 때만 수행한다.

## 카드 2 — high를 실제 요청 계약으로 연결, 선행 low는 생략 가능한 구조

**목적:** 현재 실험에만 있는 high를 정상 job에서 선택할 수 있게 하고, 사전에 선정된 whole/detail을 같은 시작 단계에서 보낸다. 기존 low 기본값은 보존한다. 구현 후 품질 비교 없이 전역 high 전환하지 않는다.

**최소 파일·심볼**

| 소유 범위 | 수정 계약 |
|---|---|
| `shared/lightweightRecognition.ts` — TerraReaderIdentity / HostedReaderSelection | Terra만 optional `reasoningEffort: low|high` 선택 가능. 미지정은 low로 정규화. 동일 provider/model/API/detail/outputcap/adapter 유지. Gemini/local에 잘못 전달한 high는 거절 |
| `server/ai/terraGameReader.ts` — constructor, body, buildTerraGameBody, readCatanScene | identity의 effort를 실제 `reasoning.effort`에 사용. generic/native 모두 동일. output 32768, detail high, timeout 240초, retry 0 그대로. 상태표시만 high이고 실제 body는 low인 경우 차단 |
| `server/ai/hostedReader.ts::hostedReaderFor` | pinned identity의 effort를 재생성할 때 보존. 과거 identity는 low. 설정 파일/전역 상수 변경으로 job 의미를 바꾸지 않음 |
| `server/index.ts` — start validation / ScanIntent / signature | 선택 필드 allowlist·유효성 검사. 서버가 정규화한 identity를 job·signature에 고정. 같은 requestId의 다른 high/low 계획을 기존 성공으로 오인하지 않음 |
| `server/scanExecution.ts::runHostedScan`, `server/scanObservation.ts::prepareScanObservation/analyzeScanUnit` | 기존 한 reader per job 유지. 모든 선택 단위의 pin/receipt 일치 검사. `Promise.allSettled`를 재작성하거나 새 대기열 만들지 않음 |
| `server/analysisTask.ts::commitAnalysisTask`, `server/cloudRuntime.ts`, `workflows/analyze.ts` | 현재 factory 사용 경로가 고정 effort를 보존하는지 검사. 결과 개수/reader/transform/CAS 검사를 완화하지 않음. 필요한 경우에만 좁은 wiring 변경 |
| `src/SessionWorkspace.tsx`, `src/api.ts` | 감독이 UI 소유자와 조율할 별도 부분. 기존 판독 선택에 quality 요청 옵션을 전달하는 최소 연결. 새 확인 단계·대시보드 추가 없음 |

**실행 계약**

```text
입력: 같은 멈춘 상태, 같은 owner/epoch/영역, 등록된 whole + 선택 detail
선택: job 전체 low 또는 high (첫 slice에 mixed-unit effort 없음)
고정: evidence/input SHA + crop transform + pack/definition SHA + reader identity
실행: prepare → 원래 index별 claim 1회 → 선택 단위 모두 즉시 dispatch
결과: 단위 원문/usage/상태 보존 → 기존 진행 preview → 모두 terminal이면 한 번 결합·commit
실패: 성공 단위 보존, 실패/미완료는 명시, paid retry/모델 대체 0
```

첫 비교 계획은 **whole high 1 + 필요한 사전 detail high 최대 1**. detail이 없으면 single high다. 이것을 모든 스캔의 자동 2호출 의무나 모든 게임의 최적 수량으로 만들지 않는다. 기존 최대 6사진 일반 경로는 그대로다. 등록 crop만 source 좌표로 자동 연결하고 별도 시점 사진은 관계 증거 없이 같은 실물로 합치지 않는다.

ROI 선택은 기존 사진/영역과 등록 `sourceRegion`을 이용한다. 결과의 빠진 정답 위치·재고로 새 ROI를 만들지 않는다. 기존 local quality 점수는 blur/duplicate 판정에만 쓰고 `unknown 개수=빠진 실물 수`나 `unknown 0=충분` 규칙을 만들지 않는다. 자동 선택기·새 이미지 검출 모델은 이번 카드 밖이다.

**수용:** body snapshot에서 effort 외 prompt/schema/detail/image 바뀜 0; request/receipt/factory 재개 후 동일 identity; low legacy 불변; 모의 out-of-order/중복/한 단위 실패/429/모든 실패/입력 drift; claim당 provider 호출 1회 이하. 이전 성공에 재발행 0. 권한·owner·epoch·수동값 변경으로 stale 될 때 성공 원관측은 남고 저장값을 덮지 않음. generic와 Catan native 경로 모두 fake-provider로 고정 profile 전달 검사. 이는 native 실사진 품질 검증이 아니다.

기존 job/unit timing에 원본 읽기·준비 종료, unit dispatch/완료, 최종 commit의 비민감 시각만 보완하면 된다. 기존 `providerMs` 합계를 wall로 재해석하지 말고 별도 end-to-end 경과를 계산한다. 새 관측 플랫폼·상시 로그 수집은 필요 없다.

**중간 편집을 서둘러 추가하지 않기:** 현재 최종값은 한 번 accepted로 반영되고 `analysisJobId` 중복 방지·scope digest가 있다. 매 단위 완료 때 `commitAnalysisTask`를 다시 부르면 첫 쓰기 후 다음 단위를 막거나 수동값을 덮는 새 문제가 생긴다. 첫 slice는 사진 관측 미리보기와 최종 한 번 쓰기를 재사용한다. 사람이 대기 중 판을 정정하면 현재 stale/원문 보존 정책을 유지한다. 정말 중간 편집·저장 시간이 중요한지 측정한 뒤 draft/base revision 계약을 별도 좁게 다룬다.

## 카드 3 — 입력 고정 후 새 사진으로 비교 (제안, 미승인·미실행)

**판단할 질문:** low 선행 없는 high 직접 판독이 추가 비용·시간만큼 복원 항목을 더 남기는가? 사전 high detail이 실제 이득을 주는가? 작은 crop 우선 제거가 맞는 값의 보존과 유익한 교정에 어떤 영향을 주는가?

- **입력 3장:** 미사용 물리 상태 3개, 밀집·가림/작은 숫자·회전/카드·문자와 소유 영역을 가용 자료에서 나눠 선택. 기존 3사진·그 crop은 회귀용이다. 새 사진이 없다면 holdout이라고 부르지 않는다. 사진·판본·상태·노출 이력, 가독/불가독, single/group 단위와 필요한 복원 속성, 범위를 먼저 동결한다. 가능하면 사람이 실제 확인한 부분 정답; AI만의 판정은 별도 신뢰 수준으로 남긴다.
- **ROI:** 모델 출력 및 참조 정답 박스를 보기 전에 물리 영역 기준 1개를 선정하고 작업 시간을 기록한다. `sourceRegion`/crop bytes/transform 동결, 외부 업스케일 없음. 이 수동 계획 시간도 전체 노력에 포함한다. 별도 시점 합성/다른 상태 혼합은 금지한다.
- **최대 9요청:** 사진당 A whole-low 1, B whole-high 1, D fixed-crop-high 1. B+D는 실제 한 job의 동시 실행으로 관찰하고 A+D는 동일 저장 응답의 결합 비교로만 사용한다. B/D는 image만, A/B는 effort만 다르게 한다. 모델·task/schema·해상도 설정·출력 한도는 동일. peak 2/retry 0, claim당 1회, 자동 보충/실패 복구 0. baseline A와 B+D 순서는 사진별로 번갈아 사전 고정한다. 한 사진의 D를 다른 상태 자료로 바꾸지 않는다.
- **비용:** 과거 실험의 보수적 예약 가정(input 32768, output 32768 및 당시 요율)을 그대로 쓰면 9 × $0.2048 = **$1.8432**다. 현재 요율·이미지 토큰 추정·cache 조건을 실제 발행 전에 다시 확인해야 하며 hard billing cap이 아니다. 향후 승인을 요청할 계획 환산 상한은 $2로 제한하고, 남은 최악 예약이 넘으면 발행을 멈춘다. 이번 연구에는 호출 권한이 없다.
- **일정 효과 분리:** 동일 frozen unit 결과/지연을 mock cap1/cap2로 재생해 결과·claim·소요시간 공식을 검사한다. 위 9회로는 실제 provider의 순차 대비 병렬 인과 효과를 증명하지 않는다. 새로운 serial 재호출은 자동 추가하지 않고, 필요하다면 별도 예산의 독립 scheduling 실험으로 분리한다.

**기록할 분모와 시간**

1. 사전 선택 물체 single/group의 올바른 회수, 처음부터 누락, unknown, 숫자/문자 오독을 별도 집계. 텍스트/가림 미판정은 오답/정답으로 채우지 않는다.
2. raw → editable에서 잃은 값·잘못 고른 충돌·실중복·오연결·미배치 보존, owner/위치/수량null·0을 각각 점검. bbox 후보는 실중복 확정값이 아니다. 선택 기준 밖도 가능 범위에서 false positives를 표본 검토하고 전체 precision으로 확대하지 않는다.
3. 촬영 종료/남은 PUT/등록/이미지 읽기·준비/각 unit dispatch·응답/최초 관측 표시/최종 commit·그림/정정 후 저장·재열기를 분리한다. `providerMs` 합을 wall로 쓰지 않는다. token input/output/reasoning 부분집합·비용 환산·429/실패도 남긴다.
4. 같은 복원 체크리스트를 사람이 고쳐 저장하는 시간·조작을 실제 측정한다. 이미 정답을 학습한 같은 사진 반복으로 UI 시간 이득을 주장하지 않는다. 작업자/노출 순서를 기록한다. 사람이 없다면 correction effort는 UNKNOWN으로 마감한다.

**진행/중단 기준:** 임의 합격률·30초 기준은 없다. whole high가 중요한 실물 회수와 정정 부담을 개선하는지, detail이 이득 없는 비용인지, 빠른 A+D가 필요한 항목을 잃는지 비교한다. 병합으로 정상값이 사라지거나 owner/새 상태를 덮는 경우 먼저 해당 좁은 결함을 고치고 회귀한다. 첫 transport 실패는 바로 중단하고 9건을 연속 소진하지 않는다. HTTP 실패는 기록하고 자동 재발행하지 않는다. 평가 결과를 보고 튜닝하면 해당 사진은 개발셋으로 재분류한다.

## 이후로 미룰 것

혼합 effort per-unit plan, 응답 confidence 기반 자동 보충, 전 사진 분할, 새 검출기/참조 사전, 다중 시점 자동 정합, SSE 조각을 즉시 편집 상태로 승격, provider background 이전, 자동 취소·다른 모델 재시도는 첫 구현에 넣지 않는다. 관측 충분성·정정 시간·현재 잔여 대기가 어느 문제인지 확인한 뒤 필요한 것만 선택한다. 이는 장래 기능 금지가 아니라 현재 증거에 맞춘 구현 순서다.
