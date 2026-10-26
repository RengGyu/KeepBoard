# review-01 독립 의미 검토

이 변경은 단일 Node/파일 저장을 Vercel Functions·private Blob 조건부 쓰기(CAS)·Workflow로 옮긴다. **VERIFIED finding 1개: 동일 방 생성 요청의 다중 인스턴스 중복 방지에 구멍이 있다.** 제품 수정·배포·네트워크/실 AI 호출은 하지 않았다.

**R1 — 동일 생성 요청이 방 2개로 저장됨 · 이전 전 교정 권고**

- 위치: 동결 `server/index.ts:264`의 `/api/rooms`; 로컬 `queued` 구현 `index.ts:186`; `BlobStore.saveSession`의 새 개체 CAS `blobStore.ts:11`.
- 실제 경로: 함수 A/B가 같은 device hash와 clientRequestId를 받는다 → 각 인스턴스의 `queued('rooms:create')`는 서로를 기다리지 않는다 → 둘 다 `listSessions`에서 이전 생성본이 없음을 본다 → 각각 random UUID로 세션을 만들고 **서로 다른 Blob 키**에 저장한다. 각 키의 create-CAS는 모두 유효하므로 중복 생성 자체를 막지 못한다.
- [합성 재현](reproduce.mts): 실제 동결 `MemoryObjects`/`BlobStore`/`rooms.newRoom`을 사용하고, 두 인스턴스가 선조회를 끝낸 시점에 barrier를 풀었다. **예상 방1 / 실제 방2 / 반환 ID2**. `results.json`에 기록, 실행 exit **1**. 서버 route의 check→create 구간을 재현한 순수 모듈 검사이며 **HTTP/실제 Vercel 재현은 아니다**.
- 영향: 응답 유실 뒤 동일 요청 재전달이 겹치면 방·초대 정보가 둘로 갈린다. 방 정원·다른 사람 개인 데이터·기존 보드 손실이 발생했다고 주장하지 않는다.
- 최소 수정: 기존 Objects CAS로 `(device hash, clientRequestId)` 생성 의도를 원자적으로 확보하고, 재전달은 같은 안정적 session ID/승자 결과를 읽게 한다. 프로세스 로컬 큐나 개별 세션 키 CAS만으로 해결했다고 보지 않는다. 세션 본문/멤버/소유권 변경은 필요 없다.

**필수 경계의 직접 확인**

|경계|직접 근거|범위|
|---|---|---|
|저장 충돌|독립 BlobStore 두 개가 동일 세션을 읽은 뒤, 한 저장만 성공하고 다른 저장은 ConflictError; 최신 값 유지|keyless MemoryObjects 실제 구현으로 PASS|
|PIN 다중 인스턴스|인스턴스 A의 설정·unlock token을 B에서 확인, B의 lock 후 A에서도 접근 거절|동일 fixture에서 PASS; 실제 HTTP 사진 응답 검사는 아님|
|유료 호출 중복 억제|같은 요청의 CloudJobs.start가 같은 ID/dispatch1을 반환. 같은 batch claim을 재전달하면 mock provider 계수1|PASS. 실제 worker도 prior completed/claim 뒤 provider를 호출하며 `analyzeBatch.maxRetries=0` (`cloudRuntime.ts:12–21`, `workflows/analyze.ts:9–11`)로 연결됨. 외부 Workflow redelivery는 UNKNOWN|
|후보 명시 적용·receipt|commitAnalysisTask에 accepted로 위장한 분석 결과를 주어도 candidate로 저장됨. 기존 accepted 0과 다른 owner 수정 유지. 동일 job 재commit도 후보1개|PASS; 분석 결과의 자동 accepted 변환 없음|
|사진/방 권한|`index.ts:108–120`은 private 사진을 room actor/PIN 검사 뒤 전달. upload-ticket/token/evidence 각 경로에 권한 검사, `taskTarget`에서 owner/epoch/revision/PIN stamp/근거 재확인. job list는 owner/PIN 검사 뒤 반환|연결 소스 검토. HTTP/실제 Blob 직접 업로드는 미실행|

**REPORTED/UNKNOWN:** manifest가 typecheck0/집중18개/실 private Blob CAS 검증을 보고하지만 본 검토에서 재실행하지 않았다. manifest가 명시한 direct-upload HTTP, hosted compatibility, remote Linux preview, migration/production 미완료를 이미 구현된 결함으로 세지 않았다. snapshot에는 SDK 패키지 메타데이터가 있으나 현재 공용 node_modules에는 @vercel/blob/workflow가 없어 HTTP cloud entry를 실행하지 않았다. SDK를 stub하여 통과했다고 주장하지 않았고, fixture는 SDK 없는 실제 순수 모듈만 실행했다.

검토본: `review-01/manifest.json` 보고 digest `982cb801ddec15f0b24dbd1f676a743715545245d4e25fe6b03f0aca04c2e2bc`; **266개 파일 SHA 전부 일치**. 실제 읽은 파일과 SHA는 [inspected-source.json](inspected-source.json). 명령 `node --import tsx docs/vercel-deployment/review-sol/reproduce.mts`: 경계4 PASS + R1 FAIL, exit1. 원본 제품/동결본 수정0, 외부 호출0. 추가 범위 검토 없이 소유권 반환한다.

**판정:** 이 검토 범위에서는 R1을 교정하거나 중복 생성에 대한 실행 계약을 좁힌 뒤 다중 인스턴스 운영으로 이전할 것을 권고한다. 나머지 명시적 미완료 항목은 구현자의 잔여 작업이며, 본 보고는 전체 이전 완료 판정이 아니다.
