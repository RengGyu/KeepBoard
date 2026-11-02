# 구현 인계 — 결합 보존 우선, 실행 최적화 분리

2026-10-29. [설계와 실측 근거](README.md). 이 문서는 제안이며 제품 수정·새 API 시험을 실행하지 않았다. **기존 구현솔 한 명이 아래 제품 수정의 소유자**다. 다른 작업자의 dirty 변경과 기존 동결 실험은 보존한다. prompt/model/schema/pack/selector/UI를 함께 변경하지 않는다.

## P0. 결합 손실과 중복을 고친다

### 파일·함수

| 소유 파일 | 변경 책임 |
|---|---|
| `server/scanObservation.ts` / `projectScanResults` | 범위별 unit/ref 색인, 입력 복제, baseline/anchor 선보존, crop-only 추가, 숫자 표현 정리, 안정 ID·refs·collision 처리 |
| `shared/scanObservation.ts` / `linkScanObservations`, `mergeObservedFacts` | 대응 모호와 속성별 충돌의 내부 분리, 일대일 대응, 합의된 null 보충. 기존 persisted link 형식은 유지 |
| `server/analysisTask.ts` / `commitAnalysisTask` | 기존 CAS/원본/owner 검사를 유지. 정확한 unit ID 집합·단위 상태·중복/미완료를 검사해야 하는 부분만 좁게 보완 |
| `tests/scan-observation.test.ts`, `tests/scan-recognition-integration.test.ts` | 아래 결합 회귀. 현재 “crop이면 새 inventory 0” 검사는 새 보수적 추가 조건과 모호한 경우로 나누기 |

`shared/photoGeometry.ts`, `server/ai/catanSceneReading.ts`, `server/ai/observationAssembly.ts`, `src/sceneGroups.ts`, `src/SceneEditor.tsx`는 기존 의미를 읽어 사용하는 경계다. 도로/건물 기하 엔진·새 편집 UI는 만들지 않는다. 현재 `commitAnalysisTask`는 판독을 편집 가능한 accepted 기록으로 바로 반영한다. 과거 별도 후보 승인 큐를 다시 도입하지 않는다.

### 고정 처리 순서

1. **검증·정렬:** plan의 고정 unit index로 단위 상태/응답을 정렬한다. 각 unit은 정확히 한 terminal 결과여야 한다. 중복 ID로 빠진 단위를 가린 결과는 commit하지 않고 원문을 보존한다. raw observation 배열의 ref는 단위 namespace 안에서만 해석한다.
2. **범위·좌표:** 현재 job의 scope/owner/epoch/definition 아래 field/area/원본 evidence+SHA별로 후보를 나눈다. 고정 crop transform만 역매핑한다. 다른 view에는 이를 재사용하지 않는다.
3. **기준 기록:** baseline 전체를 복제하고 수동값/미촬영 객체를 보존한다. baseline 없는 최초 판독은 유효한 normalized anchor 구성물을 먼저 투영한다. native의 `terrain.number` 등을 literal 관측만으로 다시 만들지 않는다. baseline이 있으면 새 anchor도 신규 crop과 같은 중복 판정을 거친다.
4. **대응과 속성:** 일대일 물체 후보가 분명할 때만 보충한다. `conflict` 전체를 건너뛰어 기준 객체를 잃지 않는다. 대응 모호/종류 충돌은 객체 유지+raw 미연결, 속성만 충돌이면 다른 비충돌 속성은 보충한다. 기준 non-null은 덮지 않고 기준 null은 알려진 보충값이 하나로 합의할 때만 채운다.
5. **새 관측:** 동일 원본의 중복 위험 없는 crop-only는 한 편집 기록으로 추가한다. 겹침 사슬·경계 조각·같은 종류의 위치 없는 기존 객체 등 구별 불가는 미연결로 보존한다. 수량 null/0/묶음은 그대로이며 임의 낱개 분할은 금지한다. 배치 근거 없는 새 객체는 unplaced다.
6. **숫자 표현:** 새 투영에서 실제 원판↔한 지형의 유일한 포함 관계와 값의 비충돌이 확인된 후보만 `attachedToId`를 쓴다. 실제 원판을 만든 뒤 같은 새 지형의 inline 중복을 제거한다. 이미 저장된 inline은 이관하지 않는다. 상충/모호는 inline+원문 유지이며 이중 실물 생성 금지. 원판을 지형 ID로 `componentRefs`에 귀속하지 않는다.
7. **배치·출처:** baseline 자리 보호, 새 자리 충돌은 unplaced로 남긴다. refs는 실제 투영된 물체만 가리킨다. 새 물체 ID는 plan+대표 unit/ref에서 안정적으로 정하며 baseline ID는 유지한다. 무작위 충돌 회피 ID나 완료 순서로 ID를 정하지 않는다. 대표 member/links도 plan 순서로 고정한다.
8. **반영:** 모든 단위의 성공/실패를 포함한 receipt를 보존하고 기존 최종 CAS·1회 반영 경로를 통과한다. raw/provider wire는 불변이며 투영된 refs/links와 구별한다. 실패·미연결이 있어도 현재 허용된 부분 기록 저장을 막지 않는다.

동일 실물의 ‘기준 기록 보존’은 그 값이 사실이라는 확정이 아니다. crop의 색이 다르다고 숫자를 삭제하지 않고, 도시/마을 차이가 있다고 anchor 건물을 없애지 않는 것이 첫 목표다. 반대로 모호한 crop 관측을 모두 추가해 개수를 부풀리는 것도 통과가 아니다.

## P0 수용 검사 — 무과금, 고정 응답 재사용

| 사례 | 기대 결과 |
|---|---|
| **실응답 cap5** | 기존 전체사진의 49개 anchor ID가 부분 충돌만으로 사라지지 않음. 숫자 10·건물 6의 현재 누락을 회귀로 고정. 이는 실물 49개 정답 인증이 아님 |
| **실응답 cap2** | inline 숫자 17개의 값/출처가 보존됨. 유일한 실제 원판 대응으로 표현을 옮기면 전후 fact 연결을 기록해 검증. 독립 원판 행 수로 숫자 인식률을 계산하지 않음 |
| 속성 일부 충돌 | 같은 물체의 색 상충+동일 숫자: 기준 숫자/물체 보존. 기준 null에 서로 다른 알려진 보충값이면 null 유지; 다른 일치 속성은 보충 |
| 대응 모호·종류 차이 | 같은 단위 두 관측/겹침 사슬/settlement↔city: 기준 객체를 삭제·합체하지 않음. 원문 두 주장과 미연결 근거 보존 |
| crop-only·중복 | 분리된 한 도로 관측은 unplaced 기록+원본 bbox로 남음. 여러 crop의 강한 일대일 중복은 한 객체. 약한 겹침/잘린 조각은 임의 복제·합산하지 않음 |
| 두 숫자 표현 | 같은 원판에 대한 inline+실제 disc 중복은 새 투영에서 한 표현. 값이 달라도 같은 값 위치로 다른 원판에 맞추지 않음. 원판 없는 inline의 bbox를 생성하지 않음. 기존 수동 inline 불변 |
| 다른 source/view/area | 같은 숫자·색·슬롯만 같거나 sourceSHA만 같은 다른 등록이면 자동 물체 동일성 없음. 다른 시점 raw는 유지; 명시 target/기존 확인 기하 외 좌표 이전 금지 |
| owner/epoch·수동값 | 다른 owner/epoch의 crop은 준비/commit에서 거절. 실행 중 수동 변경은 stale, 덮어쓰기 없음. 이미 존재한 수동 객체·미촬영 객체·위치 유지 |
| null/0·수량 | unknown은 unknown, 점수/수량 등 0은 0. quantity null을 1로 만들거나 묶음을 개별 실물로 분할하지 않음. 위치만 모르는 읽힌 값 유지 |
| 순서·ID | 같은 고정 응답 5개의 전 120개 배열 순열 및 뒤집힌 완료 지연에서 같은 구성물 ID/값·links·source 관계. assertion 생성 시각/UUID는 비교 제외. 단위마다 같은 `item-1`/구성물 ID가 있어도 충돌 없음 |
| 실패·중복 commit | 성공 일부+failed 일부는 성공 보존. receipt 누락/중복으로 완성 위장 금지. 같은 job 재commit은 추가 객체/재호출 0. raw SHA 불변 |
| 저장·재열기 | 정상값·충돌·미연결 raw·변환·refs·unplaced를 직렬화/재열기 후 유지. 부품 목록/원사진에서 접근 가능하며 저장에 필수 정정 없음 |

현재 검토에서 실행한 것은 **수정 전 cap2/cap5 각각의 정순·역순 재생**이다. 120순열·수정 후 기대 결과·UI 재검사는 위 구현 후 검사이며 미실행이다. 실제 crop-only 전체 정답이 없으므로 “9개/6개를 무조건 추가” 같은 사진 종속 통과 조건을 두지 않는다. 모델 bbox가 틀렸는지는 별도 미확인으로 남긴다.

고정 비공개 fixture SHA:

| 파일명 | SHA256 |
|---|---|
| `cap-2-results.json` | `dd65c4e56936ca8a9fca2ca6c3543866bccd4dc3839a638275ac11db929b2b29` |
| `cap-5-results.json` | `95512c67749ff10aaea027e35ed8ed2377d0f6bec256e9e7be55c329e342556d` |
| `cap-2-saved.json` | `a2313a90e097e1e4aef2274e1339937f38fe33575dfc6e31998d75a791cc94f3` |
| `cap-5-saved.json` | `5d70146152f79bc37a80cf285a8319b1dbdfe75df552a5bee4faf514fa7ce862` |

오프라인 재생 절차: 위 결과/저장 Session을 읽고 frozen `scanBundle.plan`, receipt의 request/reader/transforms/sourceSHA 및 해당 정의로 pinned scan을 재구성한다. 새 입력 상태의 assertions를 사용해 `projectScanResults`에 복제본을 전달한다. 네트워크 fetch는 오류로 대체한다. 원본은 읽기 전용이며 공급자 요청 실행기 `run.mts`를 실행하지 않는다. 저장 응답의 읽힌 값을 정답으로 제품에 하드코딩하지 않는다.

## P1. 같은 상한에서 cloud의 빈 대기부터 제거

**소유:** `workflows/analyze.ts`의 `analyzeWorkflow`, 필요한 최소 `server/cloudRuntime.ts`/`server/cloudJobs.ts`; 검사 `tests/scan-parallel-workflow.test.ts`와 기존 cloud job 회귀. local `analyzeScan`의 2-worker 상한은 유지한다.

- 현재 2개 wave barrier를 고정 index를 나눠 받는 rolling worker 2개로 교체한다. durable step은 기존 `analyzeBatch(id,index)`를 사용하고 claim은 `(job,index)`당 한 번이다. 새 큐/프레임워크는 없다.
- 각 새 단위 dispatch 전에 slot/lease를 확보·갱신한다. 두 worker의 정상 완료 또는 오류를 모두 settle한 다음에만 최종 commit/interrupted와 release를 수행한다. 한 worker의 치명적 dispatch 오류 후 새 단위 출발은 멈추고 이미 출발한 요청의 결과를 회수한다. 단위 판독 자체가 failed 결과로 정상 반환하면 기존 부분 성공 정책을 유지한다.
- 완료 index는 `batchResult`에서 재사용한다. started인데 완료 기록이 없으면 자동 재호출하지 않는다. `analyzeBatch.maxRetries=0` 유지. 미완료 index가 있으면 전체 완료/commit으로 표시하지 않는다.
- 2 job × 2 unit 상한과 저장소 namespace를 명시한다. 임대가 만료된 상태에서 새 dispatch하지 않는다. lease 유효기간을 넘는 일시정지/원격 실행의 완전한 계정 전역 상한은 보장했다고 하지 않는다.
- mock에서 빠른 index가 끝나면 느린 동료를 기다리지 않고 다음 index가 시작되는지, 총 active≤4(동일 namespace의 2jobs), 중복 step 전송0, 실패 후 active=0일 때 release, 결과 index 보존을 확인한다. workflow SDK의 실제 재전달과도 맞는지 기존 테스트 범위에서 검증한다.

**타이밍 판정:** `providerMs`의 단위 합은 wall time이 아니다. queue/각 단위 시작·종료/최종 commit을 따로 남긴다. 기존 고정 응답+delay mock으로 스케줄과 의미 불변만 확인한다. 유료 재시험은 이번 카드에서 실행하지 않는다. cap2→cap5 실측 한 쌍으로 rolling 수정의 절감률을 약속하지 않는다.

## P2. upload·등록 의존성을 유지한 병렬 전송

**소유:** `src/api.ts`의 `api.evidence` 내부 단계 분리, `src/scanUploads.ts`, `src/SessionWorkspace.tsx`의 연결 부분, `tests/scan-upload-queue.test.ts`. 필요 시 `server/cloudUploads.ts::evidence`의 ticket metadata 대조에 `sourceRegion`도 포함하는 좁은 보완. 기존 서버 evidence/CAS 저장 경로를 새 병렬 쓰기 경로로 대체하지 않는다.

- ticket+PUT 완료 결과를 보관하는 내부 전송 단계와, 최신 revision으로 순차 evidence 등록하는 단계를 나눈다. 기존 `api.evidence` 단일사진 동작은 이 단계들을 순서대로 호출해 호환한다.
- crop은 원본 evidence 등록 후에만 ticket을 받는다. 독립 사진 전송은 최대2개, evidence 등록·createdEvidenceId/SessionView 반영은 고정 순서 한 개씩이다. owner/epoch/area/sourceRegion 및 원본 ID를 전송 당시 값으로 고정한다.
- PUT 성공 뒤 등록만 실패하면 원래 ticket/전송 결과를 재사용할 수 있는 경우 등록만 재시도한다. 최신 epoch/권한과 ticket 만료 조건이 달라졌다면 자동 재등록하지 않는다. 실패 원본·선택 목록은 보존한다. 사용자 재시도를 새로운 유료 판독으로 연결하지 않는다.
- 사진 미등록/failed가 남아 있는데 이를 완전한 5장 plan인 것처럼 시작하지 않는다. 기존의 부분 선택/그대로 저장 경로는 유지하고 새 확인 버튼을 추가하지 않는다.
- 검사: 원본 이전 crop ticket 0, active PUT≤2, evidence 쓰기≤1, 뒤집힌 전송 완료에도 등록 순서/원본/refs 불변, 늦은 SessionView의 stale overwrite 0, 업로드 실패·stop·epoch 변경에서 bytes/성공 등록 중복 보존.

단계 시간을 ticket/PUT/inspect·register/응답 적용으로 나눠 실제 병목을 확인한다. 이 결과 없이 새 일괄 등록 API나 저장소 구조 변경을 선행하지 않는다. 운영 Vercel 동시 한도·비용은 이번 자료로 UNKNOWN이며, 45.5초 중 줄일 수 있는 양도 미측정이다.

## 인계 기준

먼저 P0의 고정 응답 재생과 관련 집중 회귀를 통과시킨다. P1/P2는 별도 diff/측정으로 원인과 효과를 분리한다. 실제 사용자에게는 읽힌 그림이 사라지지 않는 변화부터 제공하며, 실사진 성능 전체 인증이나 30초 보장은 붙이지 않는다. 일반적인 가역적 구현 선택 때문에 별도 설계 승인 단계를 추가하지 않는다. 이 연구의 산출물은 두 문서뿐이며 제품 편집권은 구현 담당자에게 있다.
