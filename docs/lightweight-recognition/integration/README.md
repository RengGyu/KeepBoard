# 최종 통합 검사·공유 적용 결과

**현재 상태 — 공유 59파일 반영·main 표준 빌드 통과.** 기존18파일은 비공개 백업에 보존했다. 범위 밖 소스487파일 변경0, 대상59 postSHA 불일치0. [적용 영수증](main-apply-4vzz3xw8.json) · [최종 빌드](main-build-round2/verification.json) · [로컬 실행·제약](local-run.md). main 기존 의존성 미설치로 실패한 첫 [빌드 로그](main-build/build.log)와 [결과](main-build/verification.json)도 보존했다.

승인된 의존성 복원은 최종 stage resolved node_modules를 비공개 위치에 복사·검증하고 main의 실제 디렉터리로 옮겼다. 기존 main deps는 별도 백업했다. 파일28,938개·심볼릭링크41개 일치, 설치된 lock 경로504개의 버전 불일치0, package/lock 바이트와 기존 stage deps 경로·내용 불변이다. [복원 근거·백업 위치](main-dependency-copy-round2/verification.json). main에는 임시 위치 symlink를 남기지 않았다.

**재현가능성 제한:** 변경하지 않은 현재 lock으로 `npm ci --ignore-scripts --no-audit --no-fund`를 실행하면 chokidar/readdirp 배치 검증에서 EUSAGE가 난다. [실패 로그](main-dependency-restore-round2/npm-ci.log). 이번에는 이미 검사한 resolved tree를 그대로 복사했으며 lock 구조수정·새버전 설치는 하지 않았다. 깨끗한 npm ci 재현 성공을 주장하지 않는다.

이전 적용 전 인계는 [역사본](pre-main-apply/integration-README.md)에 보존했다. 아래 round2 통과는 격리 stage 검사 결과다. 실제 N1/N2 결과의 정정·명시 반영·저장·재열기 검수는 [Sol1 보고](../number-comparison-ui/README.md)에 연결한다. 원 strict 점수16/18은 변경하지 않았다. N1 미대응 항목은 실제 토큰의 박스가 고정 GT 중심을 근소하게 벗어난 위치 실패이며 물리적 가짜 검출로 단정하지 않는다.

**VERIFIED — 격리 stage round2:** `npm test` **674/674, fail0/skip0/cancel0**, `npm run typecheck` exit0, 표준 `npm run build` exit0. [최종 결과·명령·로그 SHA](round2/verification.json). 검사 중 소스 해시 변경0, dist는 격리 stage의676파일이다. 이후 위 공유 적용과 main build를 완료했다. 배포는 하지 않았다.

**첫 결과도 보존:** [round1](round1/verification.json)은673건 중668pass/5fail, type/build0이다. [원인 분류](round1/failure-analysis.json)를 삭제하거나 통과로 바꾸지 않았다.

- 공개 아트 ZIP 누락은 기존 baseline SHA `e8271b7e115219042cc6ce1653a1b55e8c7ae5bcb7fe00a18b67e8da89ca7d21`과 안전한656개 archive 경로를 대조해 stage에만 복원했다. 기존623개 asset 변경0. 해당 단독 검사1/1 통과.
- 생성기 입력 pin3건과 legacy/local 후보 호환1건은 Sol1의 [별도 승인된5파일 delta](../sol1-integration-ui-def-implementation.json)로 수정됐다. 검증 담당자는 제품 소스를 편집하지 않았다. 원contract/index는 불변이다.

전송 테스트는 임시 mock HTTP, Cloud persistence는 MemoryObjects임을 확인했다. 검증 프로세스에는 비밀·선택적 D2 입력 환경변수를 제외하고 fetch를 loopback fixture로 제한했다. 기존 운영·모델·preview 포트는 차단했다. 전체 검사에서 실제 모델·외부 API 요청0이다. 검사 통과는 실제 사진 판독 정확도 근거가 아니다.

## 적용 사전대조

[최종 union-preflight v2](union-preflight-v2.json)는 각 파일의 최초 공유 preimage / 현재 공유 SHA / 최종 stage postSHA와 소유 manifest chain을 기록한다. Sol1 최종5파일 delta를 포함하고 round2 검사 source map과 일치한다. 최초 `union-preflight.json` v1은 이전 근거로만 보존하며 적용 기준으로 사용하지 않는다.

- **59파일:** 제품37, 테스트18, 정의3, 생성기1.
- 공유 상태: 새 파일 없음41 / 최초 preimage 일치18 / 충돌0 / 이미 최종값0.
- manifest 대 최종 검사 소스 불일치0, stage drift0.
- 모델 가중치·환경설정·GT·원본/모델 raw·private Store·preview/설치/진단 도구는 제품 필수 적용 목록에서 제외한다. 전체 stage를 복사하지 않는다.

위 목록은 적용 전 사전대조 기록이다. 승인된 스크립트가 실행 직전 모든 preimage를 재검증하고 정확59파일만 반영했다. N1/N2 도구와 결과는 별도 평가 자료이며 적용하지 않았다. 배포·기존 서버/모델 재시작·추가 추론은 하지 않았다.
