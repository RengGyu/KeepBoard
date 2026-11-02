# 카탄 실제 사진: 솔 독립 판독과 서비스 비교

**VERIFIED — 한 장에서는 솔이 확실히 판단한 내용과 서비스 결과가 모두 일치했다. 모델이 읽은 38개 물체의 값·사진 영역은 후보 생성, 명시 적용, 저장·재열기까지 보존됐다.**

| 비교 항목 | 결과 | 의미 |
|---|---:|---|
| 물체 위치·종류 | 38/38 일치 | 지형 19 + 숫자 원판 18 + 도둑 1 |
| 지형 값 | 19/19 일치 | 독립 시각 참조와 비교 |
| 확실히 읽은 숫자 | 16/16 일치 | 솔이 6/9 판단을 보류한 2개 제외 |
| 보류 숫자 | 서비스는 각각 9 | 정답으로 승인하지 않음 |
| 원응답 → 관측 영수증 → 후보 | 38/38 보존 | 종류·값·수량·색·앞면·사진 영역·출처 확인 |
| 후보 → 저장·재열기 | 38/38 보존 | 물체 전체 필드와 관측 영수증 완전 일치 |
| Gemini 요청 | 1회, 재시도 0 | 약 24.16초, 정상 STOP |

## 실제로 검사한 경로

사용자 제공 사진 → 현재 Catan 게임팩/사진 정의 → 실제 Gemini `gemini-3.8-flash` → 제품 `analysis-jobs` → 후보 → 값을 바꾸지 않고 명시 적용 → commit → resume → 다시 조회.

실제 화면의 새 기록 생성과 같은 `recordingMode: 'simple'`을 사용했다. 사용자 운영 저장소 대신 비공개 임시 Store를 사용했고, 제품 코드는 수정하지 않았다. 이번 적용은 검증 세션에서 후보 값이 전달되는지 검사하기 위한 것이며, 사용자의 실사용 승인으로 취급하지 않는다.

모델은 도로·건물·항구도 허용된 서비스 지시문을 받았지만, 이 사진에서는 지형·숫자·도둑 38개만 반환했다. 이전 벤치마크는 지형·숫자·도둑만 요청했으므로, 이전 점수를 서비스 점수로 옮겨 쓰지 않았다.

**사진 속 위치와 게임판의 칸·모서리 좌표는 구별된다.** 사진 영역은 모두 보존됐지만, 보정 프레임이 없는 이번 요청의 38개 게임판 위치는 `unplaced`다. 자동으로 정확한 칸에 배치되는 것까지 검증한 결과는 아니다.

## 비교 방법과 한계

솔은 서비스 결과·기존 GT를 보지 않고 원사진에서 독립 참조 38개를 기록했다. 이 참조는 공인 정답이 아니다. 대략적인 물체 외접 상자로 종류·값과 무관하게 reciprocal unique 최대 IoU ≥ 0.25로 대응시켰고 38개 모두 유일하게 연결됐다. 숫자 `number-r3c4`, `number-r4c1`은 솔 참조가 null이므로 값 비교에서 제외했다. 전체 값·위치 대조는 [results.json](results.json)의 38개 행에 있다.

이번 결과는 **현재 로컬 제품 코드 + 실제 Gemini의 카탄 사진 한 장**에 대한 것이다. 배포 사이트, 브라우저 렌더, 다른 게임, 도로·건물이 놓인 사진의 인식 성능은 확인하지 않았다. 유료 요청을 추가하지 않았다.

## 실행기에서 발견한 문제

첫 실행기는 공개 작업 API에 없는 `requestId`로 완료 작업을 찾았다. 서비스 작업 자체는 약 24초에 정상 완료되어 후보를 저장했지만, 실행기는 대기했다. 해당 실행기 프로세스만 종료하고 `finish-existing.mts`로 같은 완료 작업을 읽어 적용·저장·재열기를 마쳤다. 이 후속 실행은 외부 fetch를 차단했고 외부 호출 0회를 확인했다.

`live-one.mts`의 후속 사용은 POST 응답의 공개 `job.id`로 조회하도록 교정했다. 이 교정본을 다시 유료 실행하지 않았다. 실행 당시 preflight의 script SHA는 `e437de28e88c5a0c2a1b6fb01aaf1ad30443870e36a0fa61be2f2a88dcee671c`이다.

## 근거

- 원사진 SHA: `823226a0c1ff53585406e8f9681601d56a2ba2365fb1fc2f574b5b372f0838d6`
- 사진 정의 SHA: `33f9ba8c58e1bde26f4eb25ce673228558a32997dece6c81bfefc2d87c25cdd4`
- 전송 본문 SHA: `203e548ce4655b8d38c2df82cdef13667e50b2df37182e93213ec5f70ba6f95c`
- 모델 보고명: `gemini-3.8-flash` (별도 버전 고정 주장은 하지 않음)
- 토큰: 입력 2,043 / 출력 3,846. 실제 청구액은 확인하지 않음.
- 비공개 실행 근거: `/private/tmp/keepboard-service-photo-20261027-run01/`의 `native-response.json`, `candidate-before-apply.json`, `reopened-session.json`, `summary.json`.
- 독립 참조: `/private/tmp/keepboard-service-photo-20261027-review/sol-visual-reference.json`.

재대조(외부 요청 없음):

```sh
python3 docs/service-photo-verification-20261027/audit.py /private/tmp/keepboard-service-photo-20261027-run01 /private/tmp/keepboard-service-photo-20261027-review/sol-visual-reference.json docs/service-photo-verification-20261027/results/results.json
```
