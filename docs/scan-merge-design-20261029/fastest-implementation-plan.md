# 빠른 초기 서비스 — 구현 인계

2026-10-29 · [권고와 코드 근거](fastest-path.md). **설계만 완료했으며 아래 구현/시험은 미실행이다.** 기존 두 문서는 수정하지 않는다. 제품은 기존 구현솔 한 명이 소유하고, 작업자가 여럿이면 파일 소유권을 별도로 나눈다. 모델/지시문/판독 schema/요소 수/팩/영상 선별은 불변이다.

## 1. 유지·대체 결정

| 이전 계획 | 이번 결정 |
|---|---|
| P0: anchor 보존·속성별 충돌·crop-only·숫자 표현 | 유지. 도착 순서와 독립적인 최종 투영 및 부분 미리보기 경계를 추가 |
| per-job 2, 2-job scheduler 유지 | **hosted scan에서는 대체:** N≤6 즉시 fan-out, 사용자 간 2-job 대기 제거. 같은 session/owner의 중복 방지 유지 |
| cloud wave를 rolling2로 변경 | **대체:** scan step 한 개 내부의 전체 fan-out. 실효 runtime 한도 부족 때만 per-unit step N개 동시 dispatch |
| prepare는 기존 위치, 실행에서 다시 읽기 | **대체:** job을 먼저 고정하고 실행 step에서 parallel prepare→같은 bytes로 분석 |
| ticket/PUT 2개, evidence 등록 순차 | **대체:** 최대 N개 전송, 서버 manifest 기반 CAS 일괄 등록. 원본 관계는 등록 내부에서 검증 |
| 모든 결과 후 기존 polling으로 UI 갱신 | **대체:** 진행 단위 관측 표시+짧은 polling, 최종 accepted 쓰기는 1회 |

범위는 기존 hosted Gemini 판독의 local-server/cloud 실행이다. 하드웨어 제한이 다른 local model과 legacy 분석의 실행 정책을 같이 바꾸지 않는다.

## 2. 실행 가능한 작업 순서와 소유 파일

### A. 즉시 fan-out + 결합 보존 + 완료 발견 지연 제거

가장 작은 첫 diff다. 뒤 작업을 기다리며 기존 2동시 권고로 돌아가지 않는다.

- **`server/scanObservation.ts`**: `analyzeScan`의 hosted scan은 고정 units 전체를 동시에 시작한다. 배열은 원래 index에 기록하고 모든 결과를 settle한다. `prepareScanObservation`은 원본 memoized promise 읽기를 먼저 병렬 시작하거나 순수 단위 준비를 `Promise.all`로 수행한다. fixed frame 검증/target/parent 계보 검사는 그대로다.
- **`workflows/analyze.ts`**: wave·reserve/sleep 경로를 hosted scan에서 제거한다. 우선 기존 per-unit `analyzeBatch` N개 동시 실행으로 이행 가능하며, B에서 한 scan step으로 합친다. 각 유료 실행 step `maxRetries=0`, 최종 commit 1회. non-scan 경로는 기존대로 둔다.
- **`server/analysisJobs.ts`, `server/cloudJobs.ts`**: hosted scan이 local active<2/CloudJobs.slot에서 줄서지 않도록 분리한다. 기존 requestId/signature·동일 owner 영역 활성 job 중복 검사·완료 결과 재사용 유지. local의 기존 과부하 거절은 다른 사용자를 2개씩 처리하는 queue와 구별한다. 계정 전체 무제한 수용을 보장하지 않는다.
- **`server/scanObservation.ts`, `shared/scanObservation.ts`**: [이전 P0](implementation-plan.md#p0-결합-손실과-중복을-고친다)를 수행하되 아래 결정적 reducer 계약을 따른다. 내부 namespace·stable ID, baseline/anchor 선보존, 합의된 속성 보충, raw 보존. receipt/schema를 새로 만들지 않는다.
- **`src/jobStatusPolling.ts`, `src/SessionWorkspace.tsx`**: active/visible job은 기본 1초 확인, 60초 이후 3초 확인을 권고한다. 이는 UI 정책값이지 처리시간 보장/통과 기준이 아니다. 요청 중복은 없고 숨긴 화면에서는 멈춘다. 전체 session은 매 poll마다 받지 않는다. 네트워크 실패에는 bounded backoff를 쓰되 모델 재호출은 하지 않는다. 기존 10회 제한을 그대로 둬 10초 만에 사용자의 새로고침을 요구하지 않는다. job deadline/terminal·화면 수명을 기준으로 종료한다.

### B. prepare/분석 같은 실행과 단위별 진행 보존

**소유:** `server/index.ts`, `server/analysisTask.ts`, `server/scanObservation.ts`, `server/hostedObservation.ts`, `server/cloudRuntime.ts`, `server/cloudJobs.ts`, `server/analysisJobs.ts`, `workflows/analyze.ts`. 필요하면 같은 모듈의 작은 helper로 분리하며 새 실행 플랫폼은 만들지 않는다.

내부 계약은 다음처럼 분명히 나눈다. 모델 body는 이 변경으로 달라지지 않아야 한다.

```text
ScanIntent (job 생성 때 고정)
  requestId, ordered evidenceIds <= 6, reader selection/identity,
  source metadata + crop parent/region, game/definition,
  owner/epoch, captured session baseline, revision/권한 stamp

PreparedScan (모델 송신 전에 저장)
  기존 PinnedScanObservation/ScanPlan
  입력·원본 SHA, dimensions, transforms, unit request/profile

UnitResult (index별 독립 저장)
  기존 AnalysisResult + completed/failed/interrupted, timings
  claim key = jobId + unitIndex
```

1. job 시작 route는 빠른 메타데이터/권한 검증과 고정 intent 저장·dispatch를 한다. Intent가 아직 prepared가 아니면 commit할 수 없다. signature는 안정적인 intent에서 계산하고, 실제 이미지 SHA/plan 검증은 실행 때 한다. 클라이언트 주장 SHA를 신뢰하여 서버 읽기를 건너뛰지 않는다.
2. `runHostedScan(jobId)` **한 durable step**이 실제 bytes를 읽는다. 선택 입력과 필요한 부모 원본의 고유 집합을 cache하고 병렬 취득한다. 중복 부모는 한 번 읽는다. 원본 수가 선택 수와 다를 수 있으므로 parent 포함 집합과 메모리 사용량을 기록한다. 모델 호출은 여전히 선택 단위 최대 6회다.
3. 준비한 plan을 CAS로 저장한 뒤 기존 `taskTarget`의 현재 상태/권한 검사를 통과하고 동일 Buffer/promise를 `analyzeScanUnit`의 `readImage`에 전달한다. 전송 전에 source/input SHA가 같아야 한다. 이미지 bytes는 durable step 인수/반환값·job JSON에 넣지 않는다. 모든 단위가 끝나면 참조를 해제한다.
4. 각 단위는 전송 직전 `claimBatch(job,index)`를 갖고, 완료 즉시 `finishBatch`로 raw/receipt를 저장한다. 하나가 실패해도 이미 진행 중인 다른 단위를 취소하여 성공 결과를 버리지 않는다. running 공통 job 갱신은 1회로 줄여 6개의 index CAS 갱신 경쟁을 만들지 않는다.
5. 준비/claim 이후 crash가 나면 이미 completed는 재사용하고 started는 interrupted로 남긴다. 함수가 재전달돼도 같은 유료 요청을 다시 보내지 않는다. 이 보장을 **step retry 설정만으로** 대신하지 않는다. 새 scan step 자체도 `maxRetries=0`이다.
6. 최종화 step은 모든 index의 상태를 확인한다. completed/failed 등 terminal 결과로 조립하고 누락은 interrupted로 명시한다. 정상 partial success는 성공 관측을 보존한다. 최종화의 재전달은 기존 `analysisJobId` 영수증으로 멱등 처리하며 paid step을 재호출하지 않는다.

한 step 선택은 현재 `nitro.config.ts`의 300초 선언과 HTTP 180초 timeout 안에서 준비·저장 여유가 있는지, 최대 허용 사진의 base64 생성 중 peak memory가 맞는지를 구현자가 확인해야 한다. 원본 bytes와 요청 문자열을 동시에 여러 벌 복제하지 않는다. 실제 배포의 유효 한도가 안 맞으면 A의 per-unit step N개 동시 경로를 사용한다. **그 경우 이중 GET 제거는 미달로 보고하고 2동시로 바꾸지 않는다.**

### C. 전송 병렬·사진 등록 일괄화

**소유:** `server/index.ts`, `server/cloudUploads.ts`, `src/api.ts`, `src/scanUploads.ts`, `src/SessionWorkspace.tsx`; 촬영 callback 계약에 필요한 최소 `src/Capture.tsx`/`src/scanBatch.ts`. 저장소 엔진/DB schema는 바꾸지 않는다.

신규 내부 API 예시는 `POST /sessions/:id/upload-batch`와 `POST /sessions/:id/evidence-batch`다. 이름은 구현 선택이지만 아래 의미는 고정한다.

- `upload-batch`: 최대6개의 clientPhotoId, scope/owner/epoch/area, MIME/dimensions, 기존 원본 ID 또는 같은 batch의 parentClientId, sourceRegion을 받는다. 서버가 안정적인 evidence ID/ticket/원본 관계를 발급·저장한다. 부모가 아직 session에 없어도 **같은 서버 고정 manifest 안의 부모**만 참조할 수 있다. 파일 bytes나 관측 값을 여기서 받지 않는다.
- signed PUT는 준비된 모든 독립 파일에 즉시 보낸다. 이미 촬영 중 전송한 사진은 재전송하지 않는다. 원본/자식 PUT 자체에는 순서 의존성이 없다. decode와 payload 보유에는 기존 기기 bytes 제한을 유지한다. 사진 수 6이라는 한도와 기기 메모리 제한은 서로 다른 제약이다.
- `evidence-batch`: 성공 ticket 집합과 run ID를 보낸다. 크기/형식 검사 등 독립 I/O는 병렬, session append는 한 번의 `change`/CAS에서 수행한다. 부모를 먼저 포함하는 위상 순서와 같은 scope/epoch/area·sourceRegion을 검사한다. 새로운 자동 CAS 재기준화로 사용자의 다른 수정 위에 덮어쓰지 않는다.
- 동일 run/ticket 재전달은 같은 evidence ID/url을 반환한다. 등록 응답을 잃어도 신규 원본이나 새 유료 job을 만들지 않는다. 등록 후 분석 시작도 같은 run의 requestId를 재사용한다.
- 필요하면 `evidence-batch`가 등록 직후 기존 job-start helper를 호출해 `{createdEvidenceIds, view, job}`을 한 번 반환한다. 반복적인 session reload/recompute와 클라이언트의 추가 왕복을 줄인다. evidence CAS 완료 → intent 고정 → job 생성의 논리 순서는 유지한다.
- 전송 실패는 successful parent-closed subset만 등록한다. 실패/부모 미등록 crop 목록을 돌려주고 원본 bytes는 선택적으로 재시도할 수 있게 남긴다. 부분 성공 분석에 새 필수 확인을 넣지 않는다. 성공 PUT는 등록 실패만으로 다시 보내지 않는다.
- 카메라는 촬영 중 bytes 전송을 지속하고 종료 시 이미 준비된 ticket을 한 번 등록한다. `onCapture`의 upload-ready와 **등록 완료 Evidence** 타입을 구별해 가짜 Evidence를 먼저 반환하지 않는다. 이 내부 callback 변경이 필요 없도록 단일사진 경로를 그대로 재사용할 수 있는 곳은 유지한다. 기존 사진 선택/스캔 UX에 새 모드를 추가하지 않는다.

선택 완료 전 유료 분석까지 시작하는 파이프라인은 첫 구현에서 제외한다. 그러려면 미완성 입력 집합과 추가 사진에 따른 scope/source revision을 별도로 다뤄야 한다. 먼저 전체 photo set을 고정하는 한 경계는 유지하되 촬영·전송은 겹친다. 모든 `/evidence`를 동시에 호출하는 방식보다 작은 일괄 API가 상태 쓰기를 실제로 줄인다.

### D. 첫 결과 표시와 편집 보호

**소유:** `server/index.ts`, `server/cloudJobs.ts`/`server/analysisJobs.ts`의 조회, `shared/analysisJobs.ts` 또는 좁은 progress DTO, `src/api.ts`, `src/jobStatusPolling.ts`, `src/SessionWorkspace.tsx`, `src/ScanObservationResults.tsx`. 기존 `PhotoObservationOverlay`를 재사용한다.

- 진행 조회는 인증된 현재 job/owner 범위에서 완료 index와 새 receipt만 반환한다. client가 이미 받은 index는 다시 내려주지 않는다. raw/provider credentials나 이미지 base64를 상태 응답에 싣지 않는다. 최대6개 결과의 기존 저장을 이용하며 새 pub/sub/SSE 인프라는 만들지 않는다.
- 부분 그림은 **사진 위 관측 표시**이고 자동 accepted 저장/최종 그림으로 표시하지 않는다. 첫 성공 결과를 자동으로 열어볼 수 있게 하되 화면 이동·필수 확인 버튼은 없다. pending은 failed/없음과 구별한다.
- 최종 결과는 기존 `commitAnalysisTask` 한 번과 session 조회로 연결한다. job별 generation, owner, epoch가 다른 늦은 응답은 UI에도 적용하지 않는다. 기존 editor의 dirty 보호를 유지하고 완료 refresh가 초안/선택을 리셋하지 않는지 확인한다.
- 사용자가 기존 판을 고쳐 저장하거나 차례/상태를 바꾸면 그 revision을 보호한다. 최종 결과가 stale이면 raw는 접근 가능하지만 자동 재base/재판독하지 않는다. 저장·나가기·수동 정정을 모델 완료 때문에 강제 대기시키지 않는다.

## 3. 결정적 결합 계약

`project(baseline, fixedPlan, responseSet)`는 완성 결과의 순수 함수로 다룬다. source unit/ref를 namespace하고 입력을 복제한다. 도착 순서로 baseline을 갱신하지 않는다. 미리보기는 `responseSet`의 일부를 보여줄 뿐 미래 결과의 물체 수나 위치를 확정하지 않는다.

- anchor는 plan에서 고정, 정상 객체 선보존. 기존/수동 non-null 보호. 충돌한 속성만 남기고 정상 물체 삭제 금지.
- 같은 root evidence+SHA·field/area·owner/epoch에서만 bbox 대응. 강한 일대일 중복을 합치고 겹침 사슬/다대일은 보류. 다른 view는 명시 target/기존 확인 기하 없이는 합산하지 않음.
- crop-only는 구별 가능한 신규 기록만 추가. 위치 모름은 unplaced, null 수량은 null. 수량/슬롯/색을 정답 inventory에 맞추지 않음.
- 새 inline 숫자와 실제 disc의 유일한 대응/비충돌만 표현 정리. 저장된 수동 inline과 충돌값은 보호, native와 raw 및 source transform 불변.
- stable ID·refs·충돌 정렬을 plan index 기준으로 결정. 최종 UI에 자리 충돌이 있으면 기존 수동 자리를 유지하고 신규를 unplaced로 보존. raw를 지웠거나 빈 성공으로 바꾸는 처리는 금지.

## 4. 작고 결정적인 검사

**이번 설계 단계에서 아래 테스트/모델 호출은 실행하지 않았다.** 이전 독립 검토의 정순/역순 cap2·cap5 재생 결과만 기존 사실로 재사용한다.

| 검사 | 확인할 결과 |
|---|---|
| 보존된 실응답 오프라인 재생 | cap5 anchor 49개의 16개 제외 문제 해소. cap2 inline 숫자17값 보존/명확한 표현 전환. 이 개수는 fixture 기록 수이지 제품 상수/실물 GT가 아님 |
| 5응답 모든 순열, cap1/2/5/6 mock | 같은 responseSet이면 구성물 ID/값·links·refs 동일. 완료 시각·assertion UUID 제외. 6번째는 합성 중복/실패 단위여도 모델 호출 없음 |
| 중복/충돌/crop-only/숫자 | 같은 crop 두 번이 두 실물이 되지 않음. 부분 색/종류 충돌이 anchor를 삭제하지 않음. inline/disc 중복 없는 연결, 다른 시점은 미연결, 원본 bbox와 도형 슬롯 혼동 없음 |
| 전송/일괄 등록 | PUT 최대N 동시, CAS 등록1회, parent/crop 관계 유지. 실패 부분집합·응답 유실 재전달에 evidence/job 중복0. 후속 ticket/commit의 owner/epoch/region 변경 거절 |
| 한번만 과금 가능한 실행 | unit claim 중복·started 재전달·429·timeout·step 재전달에서 paid fetch≤1/unit. 2개의 독립 scan이 2-job reserve를 기다리지 않음. 스캔 내 N 초과0 |
| prepare/bytes 재사용 | 선택+부모의 unique 원본별 read 1회/실행. hash 불일치면 해당 호출0. 실제 reader body가 수정 전과 바이트 단위로 같음 |
| 진행·수동·늦은 결과 | 첫 성공만으로 전체 완료 표시 안 함. 부분 실패와 unknown/null/0 보존. owner/epoch 교체·dirty 초안·저장 후 late result가 덮지 않음. 나갔다 들어와 저장된 결과 재발견 |
| 저장·재열기 | 최종 결합1회, 미연결/raw/source/수동값 보존. 임시 progress를 복원 정답으로 저장하지 않음. 어떤 단계도 필수 사용자 정정/승인을 새로 요구하지 않음 |

관련 기존 테스트를 확장한다: `scan-observation.test.ts`, `scan-recognition-integration.test.ts`, `scan-parallel-workflow.test.ts`, `scan-upload-queue.test.ts` 및 job polling/cloud job tests. 기능 범위를 넘는 전수 규칙 감사는 선행하지 않는다.

### 후속 실사진 시간 비교 최소안 — 제안만, 호출 승인 없음

- 보존된 **동일 5사진 bytes, 같은 crop/GT·본문/schema/설정**을 사용한다. 기존 방식 1회와 새 방식 1회, 각 단위1회, **최대10회(실패 포함), retry0**. 같은 prepared snapshot을 두 synthetic 상태에 고정하고 실제 송신 body SHA 5쌍을 호출 전에 대조한다. 동일 body를 만들 수 없는 입력/세션 차이는 먼저 보고하며 임의 문구 변경으로 맞추지 않는다.
- 전체 실행 비교에는 upload start/scan end, ticket, PUT, registration, prepare/read, dispatch, 각 provider 끝, 첫 관측 paint, 전량 terminal, commit, 최종 편집판 paint를 기록한다. 촬영 중 이미 진행된 upload와 종료 후 남은 upload를 구분한다. 저장된 사진 재사용 시험이면 업로드가 제외됐음을 명시한다.
- 업로드/등록 부분은 모형 provider로 별도 무과금 반복 가능하다. 이를 실제 모델 종단 시간과 합산해 측정값처럼 만들지 않는다. 실제 서비스 비교에서 고정 body 조건과 배포 환경을 함께 유지할 수 없으면, 공급자 scheduling 비교와 제품 transport 비교를 분리해 보고한다.
- 토큰은 input/output/thought/total/cached, 미보고는 UNKNOWN. 비용은 보고 usage와 단가 근거가 있을 때만 추정한다. 단위 수/필수 속성은 줄이지 않는다. 429/timeout도 결과에 포함하고 재시험으로 지우지 않는다.
- 목적은 (a) 앱이 더한 대기 감소, (b) 전량 시간 변화, (c) 첫 관측 표시 시간, (d) 속성/물체/배치 누락 변화를 **별도** 보는 것이다. provider 응답이 달라진 두 번의 차이를 모두 scheduling 효과라 부르지 않는다. 품질은 기존 raw의 결정적 재생 검사와 별도 실제 응답 대조로 판단한다. 30초/절감률/정확도 목표를 지어내지 않는다.

## 5. 인계 시 명시할 미확인

필수 내부 변경은 upload batch transport, prepare 전 intent, 단위 progress 조회다. 모델 output schema/게임 저장 schema 변경은 필요하지 않다. 서버 code/config상 300초 선언은 확인했지만 실제 배포한 workflow step의 실효 한도·peak memory·provider 계정 quota는 UNKNOWN이다. 그 한도 확인이 안 되면 “단일 step 검증 완료”로 인계하지 않고, N개 durable step 동시라는 명시 대안을 사용한다.

현재 evidence 식별: `result.json` SHA `1e2c159742d7a4622cb81f3acb29dcd429d5a9dbb938420d8492140b859ded00`, `checks.json` SHA `8273ff85d4caac6d1c472fcbc512f12de899c08ac91fecfa7c7dfeb6d070e8ff`. 기존 설계 두 파일의 작성 전 SHA는 `de585ef67e5d24029ee4030cff897f778c1ee1c6fe211c5daf3ee94fce1c43c4`, `9ecaf5064d834b13b4a20adb6c4db048cb2429b8f1c420ce4e6ae0ca0391bab4`다. 이력 파일은 보존한다.
