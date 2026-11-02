# 초기 서비스의 가장 빠른 사진 판독 경로

2026-10-29 · **설계만 작성. 제품·설정·모델·프롬프트·팩·판독 출력 schema 변경, API 시험은 실행하지 않았다.** [이전 설계](README.md)와 [이전 계획](implementation-plan.md)은 이력으로 보존한다. 이번 문서가 초기 서비스의 속도 선택을 대체한다.

## 결정

**추천: 한 스캔의 확정된 최대 6개 요청을 즉시 모두 보내고, 같은 실행에서 준비한 이미지 bytes를 재사용한다. 스캔용 2-job admission 대기와 2개 wave는 제거한다.** 먼저 끝난 사진은 기존 원사진 관측 화면으로 보여주고, 편집판은 원래 index 기준으로 한 번 결합·저장한다. 업로드는 직접 PUT를 겹치고 사진 등록은 여러 번의 순차 저장 대신 한 번의 CAS 일괄 등록으로 줄인다.

가정은 **보통 1명의 활성 스캔, 간혹 소수 스캔이 겹치는 초기 서비스**다. 이는 계정 한도가 아니라 설계의 사용량 가정이다. 각 스캔은 N≤6, 각 단위 송신은 1회, 자동 유료 재시도는 0이다. 두 스캔이면 최대 12개 요청이 겹칠 수 있음을 인정한다. 기존과 같은 사용자·영역의 중복 job 재사용/다른 입력 거절은 유지하지만 서로 다른 사용자를 앱의 2-job 줄에 세우지는 않는다. Vercel·저장소·공급자 자체 제한은 그대로 적용된다. 로컬 서버에서 실행하는 **호스팅 API 경로**에도 같은 정책을 쓴다. M1의 로컬 Qwen 실행에 6개 동시 추론을 적용하는 설계는 아니다.

## 1. 직접 확인한 critical path

| 구간 | 현재 코드에서 확인한 동작 | 제안 |
|---|---|---|
| 사진 준비·전송 | [`sendGalleryFiles/saveRunPhoto`](../../src/SessionWorkspace.tsx), [`createScanUploadQueue`](../../src/scanUploads.ts): 파일 읽기는 전송과 일부 겹치지만 `api.evidence` 전체가 순차. ticket→PUT→등록→SessionView를 사진마다 기다림 | 준비된 파일의 ticket/PUT는 최대 N개 진행. 등록은 batch CAS 1회. 촬영 중 가능한 전송은 이미 시작하고 스캔 종료 후에 다시 보내지 않음 |
| 원본-crop 관계 | [`upload-ticket`, `/evidence`](../../server/index.ts): crop ticket 단계부터 원본이 session에 있어야 함 | 서버 발급 batch manifest에서 원본/자식의 예정 ID와 관계를 먼저 고정. bytes 전송에는 부모 등록을 기다리지 않고, 최종 일괄 등록에서 부모를 먼저 검증·materialize |
| job 시작 | [`POST analysis-jobs`](../../server/index.ts): `queued(session)` 안에서 사진을 읽고 `prepareScanObservation`을 끝낸 뒤 `jobs.start`/202 | 메타데이터·권한·revision·선택을 먼저 고정해 job을 생성. 이미지 준비는 durable 실행 안으로 이동. 202가 빨라지는 것과 모델이 빨라지는 것은 구별 |
| prepare | [`prepareScanObservation`](../../server/scanObservation.ts): 원본 promise cache는 있지만 단위 `for/await`가 순차. [`prepareHostedObservation`](../../server/hostedObservation.ts)가 bytes/SHA/크기를 읽음 | 선택 입력+필요한 부모 원본의 중복 없는 읽기를 병렬 시작. 결과 배열은 index 순서. 기존 cache를 실행 전체로 이어 사용 |
| 실행 시 재취득 | [`analyzeHostedObservation`](../../server/hostedObservation.ts)이 다시 `readImage`; cloud는 별도 step의 [`BlobStore.readEvidence`](../../server/blobStore.ts)로 재다운로드 | 같은 scan step에서 prepare와 analyze가 같은 promise/Buffer를 사용. 공급자 송신 전 SHA 검사는 유지. 다른 요청/서버에 메모리가 공유된다고 가정하지 않음 |
| 대기·dispatch | [`AnalysisJobs.drain`](../../server/analysisJobs.ts) active<2, [`CloudJobs.slot`](../../server/cloudJobs.ts) job 2개, [`analyzeWorkflow`](../../workflows/analyze.ts) 2개 wave | hosted scan에 한해 즉시 실행. N개 `Promise.allSettled`; anchor 결과를 기다렸다가 crop을 보내지 않음 |
| durable/저장 | 각 batch step에서 task/권한/claim/running 갱신, 마지막 `finishCloudJob`에서 index 순으로 읽고 commit | 준비+N요청을 한 scan step 안에서 실행. **단위별 durable claim/result는 유지**. running 공통 갱신은 1회, 최종 commit도 1회 |
| 화면 | [`createJobStatusPolling`](../../src/jobStatusPolling.ts): 10/20/30초 간격. [`SessionWorkspace`](../../src/SessionWorkspace.tsx)는 completed 뒤 session을 재조회 | 진행 중 단위 결과를 짧은 polling으로 노출. 완료 때만 전체 session 갱신. 응답 세대/owner/epoch 및 dirty 초안 보호 |

API의 전체 순차 호출을 `Promise.all`로만 바꾸면 여러 SessionView/revision 쓰기가 충돌한다. 필요한 것은 **bytes 전송의 병렬화와 상태 등록의 일괄화**다. 원본→자식 관계는 일괄 등록 내부의 논리 순서로 유지하며 불필요한 네트워크 직렬 순서와 구별한다.

### 실측과 코드 추론의 구분

- **VERIFIED:** [새 실험](../max-parallel-retest-20261029/README.md), [result](../max-parallel-retest-20261029/result.json), [checks](../max-parallel-retest-20261029/checks.json)는 같은 body SHA 5쌍에서 2동시 73.503초, 5동시 49.201초다. 입력 14,509토큰씩, 출력 19,316/20,278토큰이며 캐시/사고 보고도 달랐다. 조건별 1회이므로 33.1%를 안정적 병렬화 효과로 약속하지 않는다.
- **VERIFIED:** 실제 5장 업로드·등록 45.487초, 별도 5장 GET+SHA 11.079초. 준비 0.016초는 이미 취득한 메모리 bytes 기준이다. 49.2초 역시 격리 판독 실행기이며 운영 종단이 아니다. 이 수치를 그대로 더해 새 제품 시간을 예측하지 않는다.
- **VERIFIED:** 5동시의 가장 빠른 단위 응답은 약 10.714초, anchor는 49.165초였다. 이는 공급자 응답 시간이며 UI 첫 그림 측정값이 아니다. 같은 입력의 2동시 anchor는 35.269초로 달랐다.
- **INFERRED:** 현 polling이면 상대 시점 약 10→30→60초에 확인할 수 있어 49초에 끝난 job을 늦게 발견할 수 있다. 실제 사용자에게 정확히 11초가 추가됐다는 측정은 없다.
- **UNKNOWN:** 운영 배포의 실효 동시 한도·step 시간/메모리 한도·부하, 새 batch 등록 및 단일 scan step의 종단 시간. 현재 소스 [`nitro.config.ts`](../../nitro.config.ts)는 maxDuration 300을 선언하고 reader는 HTTP timeout 180초다. 실제 배포 설정과 전체 prepare/저장 여유는 별도 확인해야 한다.

Vercel 공식 문서는 함수 실행 시간·메모리·요청 크기에 제한이 있음을 명시한다. 따라서 이미지는 계속 signed PUT로 보내고, job/step 인수에는 큰 base64를 넣지 않는다. 공개 일반 한도는 현재 계정의 허용량을 증명하지 않는다. [공식 Functions Limits, 확인 2026-10-29](https://vercel.com/docs/functions/limitations). 설치된 `workflow@5.2.3`의 공식 동봉 문서 `node_modules/workflow/docs/foundations/{workflows-and-steps,errors-and-retries}.mdx`도 직접 확인했다. 기본 retry를 상속하지 않고 새 scan step에 `maxRetries=0`을 명시해야 한다.

## 2. 제안 타임라인

```text
현재
파일1 ticket→PUT→등록→view → 파일2 … → 파일N …
  → POST job [사진별 prepare/GET] → job-slot 대기
  → [0,1 둘 다 종료] → [2,3 둘 다 종료] → [4,5 종료]
  → 결합/저장 → 다음 상태 확인 → session GET → 편집 그림

추천
촬영/선택 중: 준비된 사진 ticket→PUT ─┐
                             …     ├─ 독립 bytes 전송 겹침
                             N개 ──┘
  → 선택 종료·성공 사진 일괄 등록 CAS 1회 + job 고정/즉시 dispatch
  → 한 scan step: unique GET 병렬 → plan/SHA 고정 저장
  → 0 ───────────────────────────────┐
    1 ───────────────────┐           │  각 단위 claim 1회
    2 ─────────┐         │           │  끝난 즉시 결과 저장/미리보기
    …          │         │           │
    N-1 ───┐   │         │           │
  → 전체 terminal 확인 → 결정적 결합 → CAS 저장 1회 → 편집판 갱신
```

두 시간이 다르다. **첫 관측 그림**은 첫 성공 단위의 원사진 bbox/값 미리보기다. **최종 편집판**은 모든 단위가 terminal이 된 뒤 결합·저장된 그림이다. crop이 먼저 끝나도 확인하지 않은 hex/edge 위치를 먼저 꾸며 그리지 않는다. 첫 미리보기는 현재 원사진 overlay를 자동으로 보여주는 읽기 전용 상태이며 별도 승인 버튼은 없다. 기존 저장판의 편집은 유지한다. 최초 사용자의 새 판은 최종 결합 후 기존 편집기로 자동 전환한다.

이 선택은 중간 결과를 여러 번 accepted에 쓰는 비용과 초안 충돌을 피한다. 스캔 중간에 자동 저장본을 계속 교체하는 기능은 첫 구현에서 제외한다. 먼저 끝난 사진 내용을 **보여주되 최종 완료로 표시하지 않는다.** 전량 결과가 필요 없는 저장/나가기 동작도 막지 않으며, 사용자가 새 상태로 넘어가면 늦은 최종 결과는 stale/raw로 남는다.

**30초는 보장하지 않는다.** 구성물/필수 속성/출력 계약을 줄이지 않는 이번 범위에서 anchor 자체 49초는 스케줄만으로 없앨 수 없다. 목표는 앱이 더한 줄서기·재취득·폴링 지연을 제거하고, 부분 응답부터 사용자가 볼 수 있게 하는 것이다.

## 3. 결합 규칙: 빠른 도착을 정답 우선순위로 쓰지 않기

이전 설계의 원문 보존·정상 anchor 보존·속성별 충돌·crop-only 추가 원칙은 유지한다. 다음을 새 실행 방식의 불변조건으로 고정한다.

1. `unitId/index`, source/input SHA, root evidence, owner/epoch/area/definition, crop transform은 송신 전에 고정한다. 첫 응답·마지막 응답을 anchor로 바꾸지 않는다. 동일 원본 crop과 다른 시점 사진을 구분한다.
2. 실제 정상화된 anchor 구성물을 먼저 투영하고, 이미 저장된/수동 non-null은 보호한다. crop의 색/종류 충돌로 anchor 물체를 없애지 않는다. 일부 속성만 상충하면 그 주장만 남긴다. baseline null에는 같은 물체의 알려진 보충값이 합의할 때만 채운다. null/unknown과 0은 다르다.
3. 완료된 부분집합 미리보기는 raw/원본 좌표로 표현한다. 최종 투영은 **처음 고정한 baseline + 모인 전체 응답 집합에서 다시 계산**한다. 임시 투영에 도착 순서대로 append하지 않는다. 같은 집합이면 완료 순서와 cap에 무관한 ID·값·refs를 만든다.
4. 같은 root·area의 강한 일대일 중복만 한 물체로 묶는다. 서로 분리된 crop-only 기록은 추가 가능하되 위치 불명은 unplaced다. 약한 겹침/이음새/다대일 대응/다른 시점은 raw에 남기고 개수를 추측하지 않는다. 수량 null/묶음을 낱개로 확장하지 않는다. 도로 edge/건물 vertex의 새 기하 추론은 하지 않는다.
5. `terrain.number`도 읽힌 숫자다. 실제 원판이 한 지형에 유일하게 대응하고 값이 비충돌인 **새 투영**에서만 `attachedToId`와 독립 원판 표현으로 중복을 정리한다. 기존 수동 inline은 자동 이관하지 않는다. 대응/값 상충이면 inline을 보존하고 crop 주장을 raw에 둔다. 원판 bbox를 지형 중심으로 대체하지 않는다.
6. 최종 CAS가 revision/owner/epoch/원본 변경을 발견하면 accepted를 덮지 않는다. 진행 미리보기도 같은 화면 세대인지 검사한다. 서버 revision이 그대로여도 편집기의 로컬 dirty 초안은 응답으로 교체하지 않는다. 사용자 편집 중 모델 최종 결과가 저장됐으면 기존 초안 저장 경로를 유지하고 새 raw 근거도 보존한다. 새 화면/새 판에 과거 progress를 끼워 넣지 않는다.

현재 cap5의 16개 제외는 속성/종류 충돌 분기로, cap2의 숫자 17개는 inline으로 확인됐다. 이는 [이전 검토의 실제 재생](README.md#1-새-증거에서-확인한-것)을 재사용한 근거다. 새 cap·preview·batch 설계가 이미 검증됐다는 뜻은 아니다.

## 4. 한도·실패와 유일한 대안

429가 오면 해당 단위를 terminal 실패로 남기고 상태 코드/가능한 Retry-After만 기록한다. 이미 전송된 다른 단위는 결과를 회수하고 미전송 단위가 있다면 중지한다. 자동 재시도·계정/모델 변경·cap2로 조용한 재실행은 하지 않는다. 동일 job/unit 재전달은 기존 완료 결과를 재사용하거나 interrupted다. 실패한 전체 스캔을 자동으로 다시 보내지 않는다. 성공 관측과 원본을 저장하므로 사용자의 추가 확인을 필수화하지 않는다.

이미지 전송 실패는 유료 판독 실패와 분리한다. 성공 PUT를 다시 전송하지 않고 남은 등록만 재개할 수 있게 한다. 원본 전송이 실패한 crop은 다른 독립 사진처럼 재해석하지 않는다. 성공한 의존성 폐쇄 부분집합만 등록/분석하고 빠진 사진을 상태에 남긴다. CAS 충돌은 원본 bytes를 보존하며 새 revision에 유료 작업을 재발행하지 않는다.

**대안 1개:** 운영 step의 실효 시간/메모리 한도가 단일 scan step에 맞지 않으면, 기존 per-unit durable step N개를 **모두 한 번에 dispatch**한다. job-slot 대기와 2개 wave는 이 대안에서도 제거한다. prepare를 병렬화하되 step 간 이미지 메모리 재사용을 주장하지 않는다. 재다운로드/step 시작 비용은 남지만 장애 격리는 기존 방식에 가깝다. 실제 한도 부족이 확인될 때만 이 대안을 선택하며 임의로 2동시를 복원하지 않는다. 선택은 모델 송신 전 실행 환경 검토에서 한다. 이미 송신한 job의 timeout/429를 계기로 대안 경로에 같은 요청을 재발행하지 않는다.

일괄 업로드 transport, job의 prepare 전/후 상태, 진행 결과 조회는 현재 코드에 없는 **내부 API 계약 추가**다. 모델의 입력/출력 계약·게임팩·기존 저장판 schema를 바꾸자는 뜻이 아니다. 이 차이는 [구현 계획](fastest-implementation-plan.md)에 명시했다. 계정 한도/새 경로 실측은 UNKNOWN으로 남기고, 속도 이득을 미리 숫자로 약속하지 않는다.

사용자 설명: **“한 스캔의 사진은 최대 6장까지 함께 읽고 먼저 나온 부분부터 보여드립니다. 사진마다 반복하던 저장과 재다운로드도 줄입니다. 서로 다르게 읽힌 값 때문에 정상 말이 사라지지 않게 하며, 느린 전체판 판독 자체의 시간까지 30초 안으로 보장하는 것은 아닙니다.”**
