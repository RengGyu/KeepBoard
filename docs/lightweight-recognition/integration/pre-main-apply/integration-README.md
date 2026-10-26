# 최종 격리 통합 검사·공유 적용 사전대조

**VERIFIED — round2:** `npm test` **674/674, fail0/skip0/cancel0**, `npm run typecheck` exit0, 표준 `npm run build` exit0. [최종 결과·명령·로그 SHA](round2/verification.json). 검사 중 소스 해시 변경0, dist는 격리 stage의676파일이다. 공유 제품 적용·배포는 하지 않았다.

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

이는 읽기 전용 사전대조다. 이후 별도 적용 승인 직전에 모든 preimage를 다시 확인해야 하며, 다른 사용자 값이면 덮어쓰지 않는다. N1/N2 도구와 결과는 별도 평가 자료다.
