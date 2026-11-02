# 119게임 실제 사진 제품 경로 실행기

`runner.mts`는 **오프라인 계획까지 준비된 상태**다. 실제 Gemini 호출은 아직 0회다. 감독이 사진 적합성·독립 시각 참조를 확인하고 승인된 사례 manifest를 동결한 뒤 실행할 수 있다.

입력은 `{ "cases": [...] }`이며 사례는 게임 ID 순서로 정렬한다. 각 사례의 필수 키는 `gameId, packId, sourceSHA, path, mime, width, height, areaId, partition, referencePath, referenceSHA`다. `owner_private` 영역만 합성 `ownerId`를 추가한다. `referencePath`의 바이트는 SHA만 확인하고 모델 요청에 넣지 않는다. 촬영 영역·공개 범위·허용 구성물·허용 속성은 **현재 제품 사진 정의**에서 고른다. 사진은 원본 바이트 그대로 업로드하며 사용자 정답·설명은 prompt에 추가하지 않는다.

제품 여정은 `createApp`의 별도 Store에서 `recordingMode: simple` 세션 → 사진 업로드 → `analysis-jobs` → 공개된 **job.id**로 조회 → 원후보 복제 → 제품 후보 확인 API → commit → resume다. 일반 게임은 후보 accept API를 쓰고, 루미큐브 native 후보는 같은 값을 `native-observation-review-v1` 표식으로 PATCH한다. 구성물의 소유자·배치 목적지를 자동으로 고르지 않는다. 따라서 저장 검사는 후보 값·관측 영수증 보존만 검증하고, 게임 전체 상태나 시각 정답을 판정하지 않는다. 후보가 없으면 적용은 비해당으로 기록한다.

각 요청은 제품 `buildGeminiGameBody`의 본문 SHA와 원본 사진 SHA를 전송 직전에 다시 확인한다. Gemini 고정 endpoint만 허용하고, 게임마다 최대 1회·전역 최대 119회·순차 실행·재시도 0이다. 401/402/403/429, 서버 오류와 네트워크 실패는 전체 배치를 멈춘다. 사례별 판독·조립·저장 오류는 원문을 비공개로 보존하고 다음 사례로 넘어간다. 공유 가능한 출력은 건수·상태·해시·사용량·지연·보존 여부만 담는다.

`--budget-usd 20`은 **계획 상한**이다. 공개 단가 입력 $0.75/M·출력 $3.75/M, prompt UTF-8 바이트 수 + 이미지 여유 8,192토큰, 출력 최대 32,768토큰으로 사례별 예약액을 계산한다. 실제 이미지 토큰과 청구액 보증이 아니며, 감독이 사진·계정 사용량과 금액을 검토해야 한다. 여러 부분 manifest가 같은 비공개 `--data-dir`를 사용하면 독점 ledger가 이미 시도한 게임과 총 예약액·119회 상한을 막는다.

오프라인 자체 검사:

```sh
node --import tsx docs/service-all-games-20261027/runner.mts --mode self-test
```

승인 사례 manifest가 준비되면, **먼저** 아래 검사 명령을 실행한다. `--data-dir`은 저장소 밖 소유자 전용 경로이고 `--batch-id`는 각 부분 배치에서 고유해야 한다.

```sh
node --import tsx docs/service-all-games-20261027/runner.mts --mode check --manifest /Users/jeonggyuju/Project_folder/KeepBoard/docs/service-all-games-20261027/approved-cases.json --data-dir /private/tmp/keepboard-service-all-games-20261027-v1 --batch-id batch-001 --budget-usd 20
```

감독이 실제 계획의 사진·정의·본문 SHA와 사용 권한·계정 비용을 확인한 뒤에만 같은 인자로 `--mode execute`를 사용한다. 키 파일 **경로**만 `KEEPBOARD_GEMINI_GAME_API_KEY_FILE` 환경변수에 전달하며 값은 출력하거나 저장하지 않는다. 각 사례의 `native-response.json`, `request-description.json`, `candidates-before-apply.json`, `session-after-job.json`, `receipts-after-job.json`, `reopened-session.json`, `summary.json`은 생성 가능한 단계마다 비공개 디렉터리에 남는다. 조립·검증 실패도 원응답과 세션에 남은 영수증을 보존한다. 실제 시각 정확도는 별도 동결된 독립 참조로 채점한다.

현재 오프라인 증거: 합성 1px Istanbul 사례에서 `self-test` 9개와 `check`가 종료 코드 0, 제공자 호출 0으로 통과했다. 이 합성 사례는 실제 정확도 근거가 아니다. 실제 승인 사례 manifest와 사진 복원은 진행 중이다.

잔액 복구 후 사용자가 남은21종을 명시적으로 재개했다. `v2` 실험은 기존98개 HTTP200 게임을 재요청하지 않으며, 원래 사진·참조·정의·요청 본문 해시가 같은 미처리21종만 새로 실행했다. 최초 실행 원본은 v1의 `executed-runner.mts`에 보존했고, 402 중단 회귀를 먼저 실패로 확인한 뒤 수정했다. 현재 self-test는10개이며 모델 호출은0이다. 기존·추가 실험의 합산 계획 예약액은$17.98542225로 기존$20 범위 안이다.
