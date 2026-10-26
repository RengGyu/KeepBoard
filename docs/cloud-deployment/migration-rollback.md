# 데이터 이전·원복 — 절차만 준비

## 범위와 불변

준비 단계는 운영 Store/사진/PIN/설정/키 본문을 읽거나 전송하지 않았다. 현재 source를 새로 생성한 DB로 바꾸지 않는다. 당시 운영 파일을 그대로 보존하며 pinned gamePack/version·session/evidence ID·snapshot·배치·quantity/null/0·개인 owner·방 membership/초대값/PIN hash를 재작성하지 않는다. API export/import는 PIN/방 제한 및 새 ID 생성 때문에 전체 이전 수단으로 사용하지 않는다.

후속 승인된 이전 대상은 `/tmp/keepboard-preview/data`의 sessions/packs/uploads/session-list/private-pins/analysis-jobs 등 **앱 데이터 전체**다. AI credential이 들어 있을 수 있는 `ai-settings.json`, 이전 Mac 경로인 `ai-routing.json`은 파일 이전에서 분리하고 Mac 원본 그대로 보관한다. 현재 유효 alias/model/high는 새 gateway의 공개 설정파일+운영 env로 연결한다. 이 준비에서 해당 두 파일의 본문은 확인하지 않았다. 새로운 미분류 설정/credential 파일이 발견되면 내용을 출력하지 말고 정확 경로·범위를 감독에게 보고한 뒤 허용목록을 결정한다. `gateway/.local`, `.env`, OS credential은 runtime artifact나 data archive에 섞지 않는다.

## 안전한 단일 writer cutover

1. 실행 직전 opaque pathSHA→fileSHA/count/bytes 기준을 만들고 소스/현재backend/PID/routing을 기록한다. 기존 기록 개수를71로 강제하지 않는다. 사용자 쓰기가 있으면 새 기준으로 정리하며 오래된 Store로 복원하지 않는다.
2. 짧은 점검 시간을 알리고 old backend의 쓰기를 중단한다. 이미 과금된 작업은 가능하면 완료를 기다리고, 중단된 작업은 새 서버에서 interrupted로 처리한다. 자동 재과금/재호출하지 않는다. old/new가 같은 기록을 동시에 수정하는 기간을 만들지 않는다. 이 단계에는 현재 PID의 즉시확인·종료권한이 필요하며 이번 준비에서는 하지 않았다.
3. 원본을 지우지 않고 권한제한된 별도 migration archive/SSH 통로로 복사한다. photos/PIN/방 토큰이 든 archive는 비공개 사용자 데이터이며 코드·문서·Vercelstage·공개registry에 포함하지 않는다. `rsync -a` 등으로 SSH 전송하되 `--delete`와 기존 경로 덮어쓰기를 사용하지 않는다. 새 `/var/lib/keepboard`가 빈 대상인지 확인한다. 데이터가 있으면 다른 임시경로로 받아 비교·판정한다.
4. 새 서버를 시작하기 **전에** 복사 대상의 opaque 파일목록/bytes/SHA가 모두 같은지 확인한다. 파일 내용을 로그로 출력하지 않는다. 사용자 ID/사진URL을 원래대로 둔다. 소유권keepboard와 필요한 모드0600/디렉터리0700을 설정한다. 필요하면 당시 허용된 분류 기준에 따라 임시파일을 별도 보관하며 자동 삭제하지 않는다.
5. 클라우드 app+gateway를 같은 영속 경로에서 시작해 health/고정model/high, 업로드 인증 및 PIN/방 보호를 점검한다. startup이 queued/running job을 interrupted로 바꾸는 것은 의도된 복구이므로 시작 전 exact hash와 시작 후 허용된 job 상태 변경을 구분한다. 기존 unlocked PIN 토큰은 메모리값이므로 재입력이 필요하지만 PIN hash는 유지된다. 기존 Vercel origin과 cookie 경로가 같아 방의 기기 식별cookie는 유지한다.
6. 정상 IP TLS 원점 검증→Vercel destination2개 전환→실제 same-origin 흐름 확인 뒤 새 Store만 authoritative로 정한다. 공개 후 신규 쓰기는 cloud에만 받는다. 불명확한 stale원점·이중writer가 보이면 자동 병합하지 않는다.

## rollback 분기

- **공개 전환 전:** 클라우드가 공개 사용자 쓰기를 받지 않았다면 기존 Mac 데이터가 authoritative다. 새 서버를 멈추고 원래 Vercel route/서버를 유지·재시작한다. 새 리소스는 문제 원인/자료 확인 뒤 이번에 만든 `keepboard-cloud`와 `keepboard-cloud-ip`만 정리할 별도 정확 지시를 따른다. 임의로 계정의 다른 리소스를 삭제하지 않는다.
- **전환 후 신규 쓰기 없음:** 당시 route backup으로 되돌리고 같은 oldStore를 재개할 수 있다. 실제로 새 쓰기가 없다는 당시 opaque 비교 근거가 필요하다. 예전71파일 해시를 무조건 현재 기준으로 사용하지 않는다.
- **전환 후 cloud 신규 쓰기 있음:** Mac의 낡은 Store로 바로 되돌리지 않는다. 신규 쓰기를 잠시 멈추고 cloud의 현재 데이터/해시를 별도 보존한 뒤, 새 파일·변경 파일·삭제 의미를 검토해 데이터 수렴 계획을 먼저 승인받는다. 코드/route rollback과 데이터 rollback을 구분한다. 전체 옛 Store 덮어쓰기는 금지다.
- VM 재부팅/앱 재배포는 `/var/lib/keepboard`를 지우지 않지만 **인스턴스 삭제는 기본 디스크를 잃을 수 있다.** resource 삭제 전 authoritative 데이터의 보존을 먼저 확인한다. 자동 snapshot은 추가 비용이라 이번 $7안에서 임의 활성화하지 않았다. 원래 Mac 사본은 cutover 검증이 끝나도 즉시 삭제하지 않는다.

기존 공개 배포 `dpl_5aKfWTfqFsmqSSRfP6auC2gh8Vds`와 [routing 원본](../game-photo-integration/release/staging/.vercel/output/config.json)은 현재 Mac tunnel 기준이다. 미래 복원 시 tunnel이 여전히 살아 있다고 가정하지 말고 실제 health를 확인한다. Vercel alias rollback만으로 데이터 수렴이 해결됐다고 주장하지 않는다.
