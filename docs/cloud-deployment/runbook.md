# 후속 A3 실행 순서 — 지금 실행하지 않음

아래는 기존 서비스의 교체/리소스 비용/키 등록/데이터 전송 승인 후 실행할 구체 순서다. 현재 서비스나 source를 바꾸는 자동 훅은 준비 코드에 없다.

1. `account-check.json`의 계정 SHA·region·실제$7 bundle, cloud artifact SHA와 부모c061, 현재 Vercel project/org 및 운영 baseline을 다시 확인한다. 기존71기록 수를 미래에도 고정 기대하지 않는다. 자연 사용자 쓰기를 보존하는 당시 opaque hash 기준을 새로 만든다.
2. SSH 관리자의 현재 공인 IPv4/32를 확보하고 다음을 **승인 후** 실행한다. 존재하는 같은 이름을 덮지 않고 현재 계정 SHA·가격을 다시 검증한다. 리소스 생성권한/한도 실패면 그대로 보고하고 다른 프로젝트·더 비싼 번들로 우회하지 않는다.

```sh
python3 docs/cloud-deployment/create-after-approval.py --approved-create <ADMIN_IPV4>/32
```

대상은 `create-instance.json`의 `keepboard-cloud`, 서울a, Ubuntu24.04, `micro_3_0`, dualstack이다. 고정IP `keepboard-cloud-ip`를 즉시 부착한다. 공개포트는 관리IP의22와 전체80/443뿐이며4319·4330은 열지 않는다. Default SSH key가 없다면 AWS가 리전 기본키를 생성할 수 있다. 키의 비공개 확보/SSH hostkey 확인은 후속 승인된 관리 경로로만 하며 출력/아티팩트 포함 금지다. 리소스 API는 비동기이므로 작업 receipt·running 상태를 확인한 뒤 설치한다. 중간 실패 시 새 이름의 리소스만 검사하고 기존 리소스를 변경하지 않는다.

3. `keepboard-cloud-runtime.tgz`와 SHA를 SSH로 새VM에 전송한다. `/opt/keepboard/releases/<runtimeDigest앞12자리>/app`에 풀고 **새 서버의** `/opt/keepboard/current`를 그 경로로 연결한다. tgz에는 Store나 키가 없다. Linux 서비스 설치는 그 새VM에서만 한다.

```sh
sudo sh /opt/keepboard/current/deploy/host-install.sh --approved-new-host
```

이 스크립트는 nginx/snapd와 공식 Node22.23.4 Linux 바이너리(SHASUM검사)를 설치하고 lockfile로 `npm ci --include=dev`한다. tsx가 기존 devDependency이므로 `--omit=dev`로 실행하지 않는다. 이미 검수한 dist를 사용하고 서버에서 UI를 다시 빌드하지 않는다. systemd app 파일·갱신timer와 HTTP challenge 서버까지만 설치하며 앱이나 키를 자동 시작/생성하지 않는다.

4. 기존 DeepSeek credential의 **값을 모델·로그에 노출하지 않는 승인된 SSH 경로**로 `/etc/keepboard.env`에 `DEEPSEEK_API_KEY`만 등록한다(root0600). 운영 alias는 기존의 deepseek-flash/high이며 gateway4330은 같은 프로세스의127.0.0.1이다. 원본 로컬 credential 파일은 그대로 둔다. 모델call로 검증하지 말고 whitelist 설정 상태와 routing만 먼저 확인한다.
5. [이전 절차](migration-rollback.md)대로 쓰기 중단→파일 Store를 빈 영속 디렉터리로 이전·해시 대조한다. `sudo systemctl enable --now keepboard`로 시작한다. 원본 포맷/ID/PIN/방을 재작성하지 않는다. 최초 cloud synthetic smoke는 별도 임시 Store에서 하고, 운영 Store에 fixture를 합치지 않는다.
6. `STATIC_IP`를 실제 부착 IPv4로 지정하고 공식 CA staging만 먼저 요청한다. **새 무료 ACME 등록과 약관동의도 승인범위**에 있어야 한다. 이메일을 등록하지 않는 자동 방식을 명시했으며 갱신은 timer가 담당한다.

```sh
sudo env STATIC_IP=<ATTACHED_IPV4> sh /opt/keepboard/current/deploy/issue-ip-tls.sh staging
sudo env STATIC_IP=<ATTACHED_IPV4> sh /opt/keepboard/current/deploy/issue-ip-tls.sh production
```

staging은 별도 경로의 비신뢰 인증서라 nginx에서 쓰지 않는다. production은 `/etc/letsencrypt/live/<IP>/`의 인증서만 읽는다. Certbot≥5.4 여부를 먼저 검사한다. `curl https://<IP>/api/health`를 **검증 우회 없이** 통과해야 한다. 실제 SAN/IP·만료·issuer 확인, `certbot renew --dry-run` 성공 및 `systemctl list-timers keepboard-cert-renew.timer` 확인도 필요하다. staging 성공만으로 Vercel을 전환하지 않는다. `--insecure`/자체서명/임시 tunnel로 우회하지 않는다.
7. 새 원점의 health·settings whitelist(model/high)·상태 저장/업로드 인증·전달된 Host/Origin·room-cookie/PIN 동작을 확인한다. 단순 gateway alias 상태는 실제 key의 provider 유효성을 보증하지 않는다. 실제 AI 요청은 별도 허용이 있을 때만 한다.
8. `prepare-vercel-stage.py`는 신뢰된 IP TLS/health/high를 확인한 뒤 같은 project의 clean static 사본을 만들고 `/api`·`/uploads`의 destination만 바꾼다. 자산은 기존674개와 같은 SHA여야 한다.

```sh
python3 docs/cloud-deployment/prepare-vercel-stage.py https://<ATTACHED_IPV4>
/Users/jeonggyuju/.npm/_npx/67eb4586ca667318/node_modules/.bin/vercel deploy --prebuilt --prod --cwd docs/cloud-deployment/vercel-stage
```

9. 기존 `https://keepboard-kappa.vercel.app`에서 공개 자산/health/설정high·업로드 보호·재접속 jobGET·수동 저장/reload/복원 및 실제 모바일 room/PIN 흐름을 확인한다. 이 시점의 Vercel route 목적지에 trycloudflare/Mac주소가 남으면 완료가 아니다. Store 전송전 해시와 비교하되 승인된 smoke/사용자 새 쓰기를 구분한다.
10. 새 클라우드가 authoritative인 것을 감독이 수용한 뒤에만 기존 Mac6133/proxy/tunnel/gateway를 별도 정확권한으로 종료할 수 있다. 이번 준비는 이 PID들을 종료하거나 바꾸지 않았다. 클라우드 재시작과 Mac 오프라인 상태의 공개 동작을 후속 검증하고 이전 데이터를 보관한다.

실제 resource 생성/SSH/인증서 발급/새 원점 routing은 현재 모두 미실행이다. IP·발급·쓰기권한은 생성 이후에만 최종 확인할 수 있으므로 해당 gate 실패 시 공개 전환을 중단한다.
