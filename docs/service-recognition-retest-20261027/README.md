# 판독 교정 재시험

## 최종 결과 — 2026-10-27

**[전후 수치·게임별 결과](results.md)** · [수치 JSON](results.json) · [독립 사진 대조](visual-review.json)

수정 대상 18종과 정상 대조군 6종의 같은 사진을 실제 서비스로 재시험했다. 처리 실패 4→0건, 판독 문제 14종의 빈 응답 8→1건, 동결한 개별 실물 표본 대응 29→50/76개다. 아직 누락 25개·동일성 불확실 1개와 카드 종류 오분류가 남는다. 이 수치는 전체 게임 정확도가 아니다. 최종 코드 719개 테스트와 빌드가 통과했다.

아래는 준비 당시 실행 절차와 이력이다. “아직 측정하지 않았다”는 준비 당시 상태이며 현재 결과는 위 최종 보고서를 기준으로 한다. 최종 v5 실험은 `/private/tmp/kb-service-retest-v5-Hm4kjd`에 보존했다. 마지막 디코더 경계 수정 후 요청 본문 및 실제 원응답 24건의 처리 결과가 동일함을 `verify-final.mts`로 오프라인 검증했다.

`manifest.json`은 기존 결과(`results/results.json`, SHA-256 `51a348efa740aa24c067bfb38c1ef7f60bb56e3f7b869a7f7926fb0872e21f9b`)에서 P0 처리 실패 4종, P1 판독 문제 14종과 기존 시각 표본 일치 6종을 고정한다. 대조군은 지도(`journeys-middle-earth`), 타일/공개 개인영역(`azul`), 카드 공급(`dominion`), 주사위(`king-of-tokyo`), 공개 개인판(`wingspan`), 비공개 본인 패(`lost-cities`)다. 모든 24행의 원본 사진과 독립 참조 파일 SHA-256을 manifest 작성 시 확인했다. 참조 파일은 평가에만 쓰이며 기존 제품 요청 본문에는 포함되지 않는다.

## 오프라인 원응답 재생

```sh
node --import tsx docs/service-recognition-retest-20261027/replay.mts \
  --out /private/tmp/kb-recognition-replay-v3
```

출력 디렉터리는 새 0700 개인 디렉터리여야 한다. 결과 `offline-p0-replay.json`은 0600이며 저장된 4개 Gemini 원응답만 현재 `decodeGeminiGameObservation` → `assembleObservations`에 통과시킨다. API 호출, 키 읽기, 실제 저장본 변경은 없다. 원문 전체와 참조 정답은 공유 보고서에 복사하지 않는다. `rawItemCount`, `observationCount`, `deferredPropertyCount`, `candidateCount`, 원문/유효 값/receipt 보존 여부를 비교한다. 도메인상 무효인 값은 unknown으로 보류될 수 있으므로 원문 속성 전부가 확정값이어야 한다는 주장은 하지 않는다. 결과에는 실행 당시 reader/assembly 파일 해시가 포함된다.

2026-10-27 오프라인 실행에서는 4/4개가 후보까지 조립됐다. 원문 실물 수와 관측 수는 각각 1/1, 27/27, 18/18, 43/43이며, 네 경우 모두 후보 assertion 1개씩 생성됐다. 속성 보류 수는 각각 2, 19, 14, 3이다. 실제 사진 재요청 결과나 판독 정확도는 아직 측정하지 않았다.

## 실제 서비스 재시험: root 실행 전용

제품 reader 수정이 동결된 뒤, 새로운 개인 0700 data-dir을 사용해 기존 `docs/service-all-games-20261027/runner.mts`의 `check`로 24개 사진·현재 게임팩 정의·요청 본문·예산 계획을 다시 고정한다. 이전 실험 디렉터리의 attempt ledger를 재사용하면 동일 gameId 재시도가 거절된다. `canary-001.json`과 `remaining-023.json`은 같은 24행을 1+23으로 나눈 불변 부분집합이다. 첫 요청의 형식/처리 결과를 확인한 뒤 나머지를 실행한다. 정답을 보고 모델 요청을 조정하지 않는다.

```sh
node --import tsx docs/service-all-games-20261027/runner.mts \
  --mode check --data-dir /private/tmp/kb-service-retest-v3 \
  --manifest "$PWD/docs/service-recognition-retest-20261027/manifest.json" \
  --batch-id recognition-retest-24 --budget-usd 20
```

`check`는 키를 읽거나 API를 호출하지 않는다. 출력된 `plan-recognition-retest-24.json`에서 24행의 현재 source/definition/body/prompt SHA, 전체 예약액, 모델 설정을 root가 검토한다. `20`은 기존 runner의 최대 계획 상한 예시이며 지출 승인액이나 실제 청구액이 아니다. 실행 키는 `KEEPBOARD_GEMINI_GAME_API_KEY_FILE` **파일 경로**로만 전달한다. 기존 파일 위치와 설정법은 [`docs/service-all-games-20261027/runner.md`](../service-all-games-20261027/runner.md) 및 [`docs/gemini-game-integration-20261026/README.md`](../gemini-game-integration-20261026/README.md)에 있다. 이 준비 작업은 키 파일 내용을 읽지 않았다.

실행을 1+23으로 나눌 때는 위 24행 계획을 총액 사전 검토에만 쓰고 아래처럼 같은 개인 data-dir에 canary를 따로 `check`한 뒤 root가 그 배치만 `execute`한다. **나머지 23행의 `check`는 canary의 attempt ledger가 기록된 뒤** 실행해야 한다. 각 배치의 `execute`에는 자기 `check`와 동일한 manifest, batch-id, budget 인자를 쓴다. `execute`는 이 작업자의 권한에 포함되지 않는다.

```sh
node --import tsx docs/service-all-games-20261027/runner.mts \
  --mode check --data-dir /private/tmp/kb-service-retest-v3 \
  --manifest "$PWD/docs/service-recognition-retest-20261027/canary-001.json" \
  --batch-id recognition-canary-001 --budget-usd 20
# root가 canary를 실행·검토한 뒤:
node --import tsx docs/service-all-games-20261027/runner.mts \
  --mode check --data-dir /private/tmp/kb-service-retest-v3 \
  --manifest "$PWD/docs/service-recognition-retest-20261027/remaining-023.json" \
  --batch-id recognition-remaining-023 --budget-usd 20
```

현재 `check` 근거: 24행 계획 0요청/예약액 약 $3.143, canary 1행 계획 0요청/예약액 약 $0.1307. runner 해시는 `77aad2e489ede48a2fe67e519816aaf1852fecc7d2974edf793d10f0cef208bb`이다. 실제 이미지 토큰·청구액은 계획값과 다를 수 있다.

새 결과는 동일 사진·참조의 기존 시각 판정과 게임별로 비교한다. 처리 실패 해소, 후보가 유지되는지, 잘못된 값/누락, 기존 정상 대조군의 회귀를 각각 표시한다. 참조의 일부 실물 표본과 자동 bbox 일치율은 게임 전체 정확도가 아니다. 저장·정정 조작 시간과 실제 청구액은 별도 측정 전까지 미상이다.
