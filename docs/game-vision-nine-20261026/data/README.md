# 9장 physical GT — 모델 응답 전 동결

**VERIFIED:** 지정한 01..09 원본은 모두 1170×1560, EXIF orientation 1이며 파일 SHA가 지정 basename과 일치한다. 각 사진을 따로 보고 수동 영역을 표시하고 9개 private overlay를 모두 직접 확인했다. 같은 판/세션의 연속 사진이며 9개의 독립 장면으로 취급하지 않는다.

소비 파일은 [index.json](index.json)의 `images[]`이다. 각 행에 `id/order`, 원본 `image`, private `groundTruth.path/sha256`, overlay locator/hash와 분모가 있다. GT는 기존 `game-literal-gt-v2`를 따른다. 사진·정답 객체·overlay는 repo 밖 0700 폴더/0600 파일로만 보관한다.

| 사진 | 위치 대상: 지형/원판/도둑 | 지형 값 | 숫자 값 | 숫자 미상 | 잘린 지형 |
|---|---|---:|---:|---:|---:|
| 01 | 19 / 18 / 1 | 19 | 18 | 0 | 2 |
| 02 | 19 / 18 / 1 | 19 | 18 | 0 | 2 |
| 03 | 19 / 18 / 1 | 19 | 18 | 0 | 0 |
| 04 | 19 / 18 / 1 | 19 | 17 | 1 | 1 |
| 05 | 19 / 18 / 1 | 19 | 17 | 1 | 1 |
| 06 | 19 / 18 / 1 | 19 | 18 | 0 | 1 |
| 07 | 19 / 18 / 1 | 19 | 18 | 0 | 1 |
| 08 | 19 / 18 / 1 | 19 | 18 | 0 | 0 |
| 09 | 19 / 18 / 1 | 19 | 18 | 0 | 1 |

04·05의 가린 숫자는 `attributes.number:null`, `valueScorable:false`, `readability.value:unobservable-occluded`로 기록했다. 원판 위치는 유지한다. 일부가 가려져도 직접 읽을 수 있으면 값 분모에 포함한다. 도둑은 값 분모가 아닌 종류·위치 대상(`kindScorable:true`)이다. 다른 사진의 숫자나 고정 재고 수로 답을 채우지 않았고, 사막에 없는 원판을 생성하지 않았다.

영역은 지형의 **육각 실물 전체 envelope**, 숫자의 **글자가 아닌 원판 전체**, 도둑의 **실물 silhouette envelope**를 수동 표시한 bbox이다. 가림·원근·흐림과 수동 오차가 있으며 정밀 분할 마스크가 아니다. 잘린 물체는 이미지 안에서 보이는 범위만 표시한다. ID는 사진별 주석 순서이며 게임 슬롯이나 사진 간 동일성 선언이 아니다. 정확한 인쇄 판본은 미확정이다.

[contract.json](contract.json)의 매칭 정책은 이전 승인본과 동일하다: geometry-only reciprocal unique maximum IoU ≥ 0.25, 동률은 ambiguous, 값/kind로 매칭하거나 동률을 풀지 않음. IoU와 center error는 연속값으로 별도 보고하며 0.25는 서비스 합격선이 아니다.

[verification.json](verification.json): 원본 decode/SHA/dims 9개, 고유 ID·유효 좌표 342개, private 권한·파일 해시 검사 PASS. 기존 GT/결과·제품 변경 0, 새 예측 열람 0, AI/API/OCR 호출 0. 이 데이터는 감독 검토 전 송신 허가를 대신하지 않는다.
