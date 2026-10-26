# KeepBoard Vercel 완전 클라우드 배포 완료

**VERIFIED:** https://keepboard-kappa.vercel.app 의 UI·API·사진/기록 저장·분석 작업을 같은 Vercel 프로젝트로 전환했다. 기존 Mac backend를 일시 중지한 상태에서 공개 API 검증을 통과했다. 실제 AI 호출 0회, AWS 생성/유료 플랜 전환 0회.

- Production: `dpl_G7KsobFRw4ZHZU9iM9Ac7sEXab3R` / `keepboard-9fqht4j01-renggyus-projects.vercel.app`
- Preview: `dpl_GtvFXobD7pFBgGqZWd4Ynfm7RcM6` / `keepboard-i6zc2qhtv-renggyus-projects.vercel.app`
- Source SHA: `5598415fffdf1a86968095487d879867b8dd43f54cc0b9dfc23c50856c27139d`
- Patch SHA: `4cca036ca835b8d2344336d197451c18768b307db561cf6d8d60b13eb749bdc6`
- 동일 project `prj_HPh7BKpxtkcFNY6X40w3kbAyPL0V`, Hobby. 기존 dirty 공유 소스의 정확 25파일만 반영, 최종 1337경로 SHA 대조 drift0. 기존 vercel.json은 새 파일로 취급하지 않고 Mac rewrite 설정의 정확 preimage를 별도로 보존했다.

## 실행 구조와 핵심 변경

1. `server/blobObjects.ts:7` + `blobStore.ts`: private Blob의 강한 버전 읽기와 조건부 CAS로 여러 함수 인스턴스의 오래된 쓰기를 409로 거절한다. PIN 설정·unlock token·잠금도 private 저장소에서 공유한다. 기존 ID·고정 게임팩·스냅샷·null/0은 그대로다.
2. `server/cloudUploads.ts:9` + `src/api.ts`: 권한을 확인한 단기 티켓으로 사진/큰 가져오기 JSON을 private Blob에 직접 전송하고 세션·owner·촬영 epoch를 재검사해 연결한다. 사진은 기존 권한 API로 스트리밍하며 export도 스트리밍한다. Blob URL을 공개 원본으로 배포하지 않는다.
3. `server/cloudJobs.ts:14` + `workflows/analyze.ts`: 입력/결과는 private Blob, Workflow 전달 인수는 작업 ID뿐이다. 유료 호출 step은 `maxRetries=0`이며 create-only durable claim 뒤에만 실행한다. 불확실한 호출은 자동 재실행하지 않는다. 완료는 기존 accepted를 덮지 않고 candidate로만 추가한다.

공통 Express/UI를 유지했다. 서버 내 gateway transport가 환경변수 `DEEPSEEK_API_KEY`를 사용해 기존 `deepseek-flash/high`로 직접 요청하므로 Mac gateway/터널은 새 앱에 필요 없다. 해당 키와 Blob token은 encrypted 서버 환경변수만 사용하며 임시 비밀 파일은 삭제했다. 공개 JS/CSS는 production 키 등록 전 로컬 빌드와 byte-identical이다. production mock이 설정되면 실행을 거절한다. 기존 inline `/analyze`는 cloud에서 작업 API 사용을 안내하는 409이며 현재 앱은 durable 작업 API를 쓴다.

## 이전과 직접 검증

승인된 최신 allowlist **70파일·37,503,625B**를 `production-release-20261023` private namespace에 create-only 전송했다. 70개 모두 다시 읽은 byte SHA가 원본과 같고, 공개 검증 후에도 원본 집합·SHA는 그대로다. 키 설정 파일·원본 사진 코퍼스·연구 자료는 배포하지 않았다. 진행 중 기존 분석 작업/게이트웨이 연결은 0개였다. 기존 PIN 설정은 보존했고 Mac 메모리에만 있던 15분 unlock token은 이전하지 않으므로 다시 PIN을 입력해야 할 수 있다.

Preview 실제 HTTP 7단계 PASS: 5MB private 직접 업로드/API stream byte 동일, 응답 후 Workflow mock 완료·재접속 조회·같은 요청 재사용, candidate→명시 accept→저장→resume/reload, 7MB export, 큰 직접 import의 고정팩/근거/사진/스냅샷 보존, PIN 사진 403→200→잠금403.

Production 실제 HTTP 5단계 PASS: public health와 high 설정/mock false, 수동 저장·사진·스냅샷·재개·재열기, 사진 bytes 포함 export, PIN 사진/보호 export 제한, 유료 호출 없는 작업 조회. 명시 합성 Splendor 한 개만 추가했다(`eabaf4f4-43e9-402e-bd18-fa0ba725829d`). 실제 모델·실사진 정확도를 확인한 것은 아니다. 새 실제 브라우저 화면 확인은 이 worker가 수행하지 않았다.

전체 합성 회귀 **597/597 exit0**는 방 중복 생성 수정까지 포함한다. 최종 ETag/HTTP409 delta는 타입0·집중 검사 및 최종 실제 preview/production 경로로 확인했다. 로컬 타입/빌드0, 최신 원격 Linux 빌드 READY. 검증 범위를 `verification.json`에 분리했다.

개발 중 발견·교정: 서로 다른 함수가 같은 방 생성 요청을 받으면 방2개가 생기는 경로를 실제 두 HTTP 인스턴스로 RED→GREEN 재현하고 stable ID+create-only CAS로 수정했다. JSON 압축 GET이 약한 `W/` ETag를 반환해 ifMatch가 실패하는 SDK 경계도 실제 Blob에서 발견했다. `Accept-Encoding: identity`로 같은 원본 strong ETag를 받고 weak이면 거절하도록 교정했다. 별도 head로 새 버전을 섞거나 weak를 강제로 승격하지 않는다.

## 무료 한도와 원복

현재 private Blob 총 102객체/65,717,473B(합성 preview 포함), 저장 한도1GB보다 작다. 월별 operation·전송·Workflow 실제 billing 잔여량은 미조회다. [Blob 공식 한도](https://vercel.com/docs/vercel-blob/usage-and-pricing)는 저장1GB, simple10,000/advanced2,000회, 전송10GB/월이며 [Workflow](https://vercel.com/docs/workflows/pricing)는 이벤트50,000회/월·쓰기1GB/월이다. 유료 업그레이드는 하지 않았다. 한도 초과 시 서비스가 제한될 수 있다.

이전 backend PID6133은 **SIGSTOP/T**로 원복용 보존, proxy64200/tunnel64203/gateway18287은 그대로다. 이 프로세스들은 현재 공개 앱 실행에 필요 없다. 새 cloud 쓰기가 생겼으므로 옛 전체 Store를 되돌리는 원복은 금지한다. 먼저 cloud/구 Mac 양쪽 쓰기를 차단하고 cloud 변경 파일을 버전·SHA로 대조해 별도로 반입한 후에만 이전 alias/Mac backend를 재개한다. 충돌은 자동 덮어쓰지 않는다. 상세 범위는 `migration/PLAN.md`, 기존 소스 preimage는 `migration/source-before/`, 원본은 `/tmp/keepboard-preview/data`에 그대로 있다.

[공식 Functions 제한](https://vercel.com/docs/functions/limitations)의 요청/버퍼 응답4.5MB 제한을 직접 업로드와 스트리밍으로 처리한다. 구성 근거는 [Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk), [Express Workflow](https://workflow-sdk.dev/docs/getting-started/express), [step retry](https://workflow-sdk.dev/docs/foundations/errors-and-retries)다.

`source-manifest.json`, `integrated.patch`, `preview-stage.json`, `verification.json` 및 `migration/*`가 최종 인계 근거다. 공유 node_modules는 변경하지 않았으며 다음 로컬 작업 전 변경된 package-lock에 맞춰 `npm ci`가 필요하다. 운영 배포는 격리 allowlist 사본의 원격 Linux npm 설치·빌드를 사용했다. 파일 소유권을 반환한다.
