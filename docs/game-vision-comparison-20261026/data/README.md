# 동일 사진 game-literal 비교 입력 — 사전 동결

**VERIFIED:** 원본 SHA `82a495…`, 850×637 일치. [contract.json](contract.json)에 private GT locator/SHA, 좌표 계약, 평가 분모를 고정했다. 새 GT SHA는 `9ea4c49f2c752cc688259611a7b57e304bdb2bb9edaa07ea64de5b6b7176ff84`이다.

| 대상 | 관측·위치 분모 | GT 단위 | 한계 |
|---|---:|---|---|
| 지형 | 19 | 육각 실물 영역의 수동 polygon | 경계 일부가 말에 가림; 약 ±5px 근사 |
| 숫자 토큰 | 18 | 글자만이 아닌 원판 전체 bbox | 약 ±2.5px 근사·작은 외곽 여유 |
| 도둑 | 1 | 검은 실물 말 bbox | 약 ±3px 근사; 그림자 제외 |

원본과 확대 crop을 직접 보고 표시한 뒤 private overlay로 전부 확인했다. 지형/숫자 독립 라벨은 기존 GT에서 재사용하고 눈으로 재확인했다. 기존 GT SHA `61ee4343effc494d988a5098ba19f49431fa0e0f678fa2fb82439987cb0c48f6`와 원본은 바뀌지 않았다. 사막에 숫자 객체를 만들지 않았다. 정밀 분할 마스크·완전한 판본 확인을 뜻하지 않는다. 카드/소유자/도로/건물/항구/게임 슬롯은 이번 평가 밖이다.

[benchmark-manifest.json](benchmark-manifest.json)은 D1 Gemini 문맥 없음 / D2 Gemini 문맥 있음 / D3 DeepSeek 문맥 있음만 연결한다. [model-context.json](model-context.json)은 실제 분류·관측필드와 읽기 범위를 내보낸 **구현 문맥**이다. 전체 규칙서 이해나 사진 관측값이 아니며 정답·물체 수·슬롯·frame·GT를 포함하지 않는다. 출처 해시는 [provenance.json](provenance.json)에 있다. GT/사진/overlay는 repo 밖에만 있다.

**사전 수용 매칭 기준:** geometry-only reciprocal unique maximum IoU ≥ 0.25. 양쪽에서 서로가 유일한 최대 IoU 상대인 경우에만 대응하며, 값이나 종류(kind)는 매칭 선택·동률 해소에 쓰지 않는다. 동률은 AMBIGUOUS로 남긴다. polygon은 bbox envelope로 환산하며 IoU와 원본 픽셀 center error는 연속값으로 별도 보고한다. 0.25는 객체 대응 문턱이지 서비스 합격선이 아니다. 이전 0.5/global-within-kind 제안 계약은 `history/contract-459034008397.json`에 원바이트로 보존했다. 물리 GT·라벨은 불변이며, 이 수동 근사 GT로 픽셀 마스크 정밀도를 주장하지 않는다.

**UNKNOWN:** 정확한 인쇄 판본과 독립 heldout 성능. 이 사진은 이미 평가했던 development pilot이다. D4는 확인 frame이 없어 `NOT_RUN`이며 새 frame을 만들지 않았다.

[verification.json](verification.json): 원본/기존 GT 해시, 고유 ID, 38개 유효 좌표·범위, 라벨 보존, private 0700/0600, payload/GT 분리 검사 통과. 새 예측 파일 열람 0, API/AI/OCR 호출 0, 제품 변경 0.
