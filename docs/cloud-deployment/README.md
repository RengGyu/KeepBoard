# Mac 없이 실행하는 KeepBoard — 배포 준비

**RECOMMENDATION: 기존 AWS 계정의 서울 Lightsail 1대 + 현재 Vercel 화면을 유지한다.** 새 DB나 게임 데이터 형식 변경 없이 서버·파일 Store·사진·작업·AI gateway를 같은 클라우드 VM에서 실행한다. **아직 리소스 생성·결제·키 등록·데이터 전송·운영 전환은 0회다.** [준비 manifest](manifest.json), [합성 검증](synthetic-verification.json), [후속 실행 절차](runbook.md), [이전·원복](migration-rollback.md).

현재 인증 확인은 [account-check.json](account-check.json)에 있다. AWS STS와 서울 Lightsail 조회, GitHub 인증, Google Cloud 활성 계정1개는 직접 확인했다. AWS 계정 끝4자리는6475이며 번호 전체는 해시만 기록했다. 서울 Lightsail 기존 인스턴스0·Route53 zone0이다. 기존 Vercel project는 `prj_HPh7BKpxtkcFNY6X40w3kbAyPL0V`/org `team_RgOQUIJZTU9MufwDOGzuJYA6`. 계정 인증과 읽기 성공은 새 리소스 쓰기 권한·결제 한도 보증이 아니다. Google Cloud 결제 읽기는 확인하지 못했다. 웹사이트의 다른 로그인 세션이나 다른 DNS 업체의 도메인 보유 여부는 **UNKNOWN**이다.

| Mac 의존 | 준비한 대체 |
|---|---|
| 4319 Express와 메모리 작업 큐 | Lightsail의 systemd 상시 실행. 기존 서버 코드 그대로, 단일 인스턴스 유지 |
| `/tmp/keepboard-preview/data` | VM의 영속 SSD `/var/lib/keepboard`. sessions/packs/uploads/analysis-jobs/PIN/방 기록을 같은 구조로 보존 |
| proxy4320 + 임시 tunnel | 고정 IPv4 + nginx의 공인 IP TLS 원점. Vercel의 `/api`·`/uploads` 2곳만 해당 HTTPS로 변경 |
| Mac gateway4330와 로컬 키 경로 | 같은 VM/프로세스의 loopback gateway + 비공개 환경변수 `DEEPSEEK_API_KEY`. 기존 `deepseek-flash`·vision·high·180초 제한 유지 |

`prepared/cloud-launch.mjs`는 기존 `gateway/server.mjs`와 `server/index.ts`를 가져와 실행한다. `KEEPBOARD_AI_GATEWAY_URL`이 이전 Store의 라우팅 파일보다 우선하므로 Mac URL을 참조하지 않는다. gateway는 인터넷에 공개하지 않는다. 운영 키가 없으면 런처는 실패하며 다른 모델로 대체하지 않는다. 키 없는 합성 검증만 명시적 `KEEPBOARD_SYNTHETIC_CHECK=1`을 사용하며 운영 unit에는 이 변수가 없다. 앱/업로드에 새 공개 권한을 만들지 않았다.

## 고정 HTTPS 원점과 비용

Route53 zone0만으로 도메인이 없다고 단정하지 않는다. **이번 우선안에는 도메인 구매가 필요 없다.** Lightsail에 고정 IPv4를 붙이고, [공식 Certbot IP 인증서 방식](https://letsencrypt.org/2026/03/11/shorter-certs-certbot.html)으로 `https://<고정IPv4>`를 만든다. Certbot5.4 이상·webroot·shortlived profile을 사용하고, staging 발급→별도 production 발급→실제 신뢰 체인/주소 검사 뒤 전환한다. 6일 인증서이므로 12시간마다 갱신 확인하고 성공 시 nginx를 reload하는 timer를 준비했다. 새 Cloudflare 계정·유료 DNS·도메인·상용 인증서는 추가하지 않는다. 무료 ACME 등록/약관 동의·실제 인증서 발급도 후속 승인에 포함돼야 한다. 발급/자동갱신과 Vercel의 실제 새 원점 접속은 **미실행**이다.

| 항목 | 계획 비용(USD/월, 세금·초과사용 제외) | 근거/범위 |
|---|---:|---|
| Lightsail `micro_3_0`, 1GB RAM·2vCPU·40GB SSD·IPv4·전송2TB | **7.00** | 기존 계정의 서울 `get-bundles` 실제값 + [공식 번들](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html) |
| Store용 기본 SSD40GB | **포함** | 별도 DB/블록 디스크/객체 저장소 생성 없음 |
| 부착된 고정 IPv4 | **추가0** | [공식 비용](https://docs.aws.amazon.com/en_en/lightsail/latest/userguide/amazon-lightsail-frequently-asked-questions-faq-billing-and-account-management.html). 미부착1시간 초과 시 $0.005/시간 부과 가능 |
| IP 인증서·DNS/도메인 | **0** | 무료 CA의 IP 인증서, DNS 구매 없음 |
| 현재 Vercel | **추가 리소스0** | 같은 프로젝트/자산에 원점2개만 변경. 기존 청구조건은 그대로 |
| AI | 기존 사용량 과금 별도 | 같은 모델/high. 이번 준비 호출0 |

**선택 구성의 기본 합계는 $7/월**이다. 공개 최저512MB 번들은 $5지만 현재80MB JSON 업로드·동시 분석2건의 메모리 안정성은 미측정이라 선택하지 않았다. 1GB도 실사진 동시부하를 보증한 값은 아니며 OOM이 관측될 때만 별도 증설 판단한다. 할인/무료체험은 총액에서 차감하지 않았다. 스냅샷·추가 디스크·로드밸런서·별도 DB를 자동 생성하지 않는다. 초과 트래픽·스냅샷을 나중에 사용할 경우 [AWS 공식 과금](https://aws.amazon.com/lightsail/pricing/)이 추가된다. 인스턴스를 stop만 하면 고정 월요금 의무가 없어지는 것으로 취급하지 않는다.

대안은 Render 유료 webservice+영속 disk다. [공식 가격](https://render.com/pricing/)의 $7 compute + $0.25/GB storage이며 서비스 HTTPS를 제공한다. 현재 Render 인증은 확인하지 못했고 신규 로그인/연결이 필요해 이번 실행안으로 선택하지 않았다. 무료 webservice는 [영속 disk 미지원](https://render.com/docs/free)이라 이 파일 Store를 그대로 보존할 대안이 아니다.

Vercel Functions로 파일 Store/단일 프로세스 큐를 그대로 옮기지는 않는다. [Functions 한도](https://vercel.com/docs/functions/limitations)와 현재 큐 구조가 다르며 저장 구조 개편이 필요하다. 반면 [외부 origin rewrite](https://vercel.com/docs/routing/rewrites)는 현재 앱 URL과 same-origin을 유지한다. [proxy 대기120초](https://vercel.com/docs/limits)는 새 jobPOST202+pollGET 경로와 양립한다. 긴 모델 응답은 VM의 작업 안에서 완료되므로 최초 HTTP 요청을 길게 붙들지 않는다. 구 inline 분석 API는 여전히120초 원점 대기 영향을 받을 수 있다.

## 준비 파일과 직접 확인 범위

부모 소스는 `c061328e56121b6b5a2ef5a13185fd722ae33688604181a8de685bb9d472b692`. allowlist로 server/shared/gamepacks/gateway/public/검수dist/잠금 package와 배포파일만 독립 복사했다. runtime tgz에는 운영 Store·키·env·gateway/.local·원본 연구/사진 corpus·Git·의존성 캐시가 없다. 원본 제품 수정0. [소스 근거 위치](source-notes.md).

실행은 `node docs/cloud-deployment/verify-local.mjs`이며 새 합성 Store·임시 포트에서 **9검증 그룹 exit0**이다. 프로덕션 앱/static/120catalog와 loopback gateway/high, 수동 저장→완전 재시작→복원/export, 이미지 bytes/PIN 보존 및 재잠금, 방 참가cookie 보존/타인 거절, queued 작업의 interrupted 복구를 직접 확인했다. 실제 모델·외부 upstream 요청0이다. 첫 harness는 기존 업로드 API의200을201로 기대해 실패했으며 기대값만200으로 교정 후 같은 경계를 통과했다. 제품은 고치지 않았다.

Python/Node/shell 준비파일 구문검사도 exit0이다. Docker daemon을 사용할 수 없어 **Docker image build0회**, 실제 Ubuntu/systemd/nginx/Certbot/IP 인증서·Vercel 새원점·Linux Node22.23.4는 미실행이다. 로컬 검증 Node는22.22.0이며 Linux 설치안은 현재22계열 LTS patch22.23.4를 공식 SHA와 함께 설치하도록 고정했다. 합성 성공을 클라우드 실행/키 유효성/실사진 정확도 성공으로 승격하지 않는다.

## 감독에게 필요한 마지막 승인 범위

기존 AWS6475 계정·서울에 **`keepboard-cloud` micro_3_0 1대($7/월 기본)**와 부착 고정IP1개를 만들고, 무료 IP TLS 발급/자동갱신, 기존 DeepSeek 키의 비공개 등록, 승인된 운영 Store의 SSH 이전과 짧은 쓰기 중단, 동일 Vercel 프로젝트의 API/uploads 원점2개 전환을 실행하는 정확 후속 카드가 필요하다. 현재 준비 카드는 이 실행을 허용하지 않아 진행하지 않았다. 실제 키를 채팅·명령행·문서에 요청할 필요는 없다. 다음 실행자가 blind secret 등록 경로를 사용한다.
