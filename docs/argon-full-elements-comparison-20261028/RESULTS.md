# 모델만 변경한 비교

**기존 클로드 Opus High의 최종 검토를 반영했습니다.** [검토 원문](opus-review.json). 참조와 검토 모두 AI 시각 해석이며 사람이 인증한 정답이 아닙니다. 실제 작업자 설정의 정정은 [출처 정정](provenance-errata.json)에 기록했습니다.

**출력 개수는 정확도가 아닙니다.** 같은 사진·프롬프트·출력 형식·LOW thinking·HIGH 해상도에서 모델만 바꿨습니다. 카탄은 별도 원사진 전수 대조, 나머지 30게임은 모든 영역/구성물 종류를 목록화하고 사진에 보이는 종류를 대조합니다. 가려진/사진에 없는 요소와 수동 상태는 미검증입니다.

## 응답 시간(초)

| 모델 | 완료 | 최소 | 최대 | 평균 | 중앙값 |
|---|---:|---:|---:|---:|---:|
| gemini-3.8-flash | 30 | 4.3 | 42.8 | 14.3 | 11.5 |
| gemini-4-argon | 30 | 9.8 | 119.3 | 37.3 | 28.1 |

## 30게임 비교

출력은 종류별 행 수입니다. 묶음/중복/영역 밖 결과가 섞일 수 있어 검출률로 나누지 않습니다.

| 게임 | 사진 대조 판정 | Flash 출력 | Argon 출력 |
|---|---|---|---|
| age-of-innovation | 개선 | map:1 | map:30 |
| anachrony | 개선·오류 혼재 | workers:6 | workers:13 |
| arcs | 개선 | map:1, pieces:15 | map:1, pieces:35 |
| ark-nova | 비슷 | cards:4, workers:4, tracks:3 | cards:18, workers:8, tracks:13 |
| arkham-lcg | 비슷 | locations:3, investigators:4, tokens:1 | investigators:3, locations:4, tokens:1 |
| barrage | 개선·오류 혼재 | structures:17, water:3 | water:5, structures:24 |
| blokus | 부분 개선(종류 존재만) | board:1 | board:1, pieces:13 |
| bohnanza | 개선 | fields:3 | cards:21, fields:3 |
| brass-birmingham | 개선·오류 혼재 | industries:20, links:16, resources:8 | industries:29, links:16, resources:19 |
| calico | 개선·오류 혼재 | boards:1, patches:4, scoring:10 | boards:4, patches:25, scoring:10 |
| carcassonne | 개선 | followers:24, tiles:3 | tiles:62, followers:24 |
| cascadia | 개선 | habitat:8, wildlife:21 | habitat:28, wildlife:31 |
| castles-burgundy | 개선·오류 혼재 | dice:3 | dice:3, money:7, goods:5, hexes:6 |
| charterstone | 비슷 | board:1, workers:1 | board:1, workers:7 |
| coup | 개선 | roles:7, coins:3 | roles:9, coins:8 |
| crew-deep-sea | 비슷 | cards:7 | cards:7 |
| dominant-species | 개선 | earth:28 | earth:29, elements:27, animals:22 |
| eclipse-second-dawn | 경미 악화(저신뢰) | sectors:4, ships:3, discs:1 | sectors:3, ships:10, discs:7 |
| everdell | 개선·오류 혼재 | cards:9, workers:14, events:2 | workers:14, cards:11, events:5 |
| expeditions | 개선·오류 혼재 | mechs:1, tiles:12 | tiles:14, mechs:1 |
| frosthaven | 개선 | map:1, figures:4 | map:1, figures:11 |
| grand-austria-hotel | 개선·오류 혼재 | guests:5, dice:7 | guests:10, dice:10 |
| le-havre | 개선·오류 혼재 | buildings:28, workers:3 | buildings:34, workers:9 |
| marvel-champions | 개선·오류 혼재 | identities:1, cards:6, tokens:12 | cards:9, tokens:15, identities:4 |
| pandemic | 개선 | pieces:6, disease:12 | pieces:9, disease:17 |
| stone-age | 판정 보류 | goods:5, workers:2 | workers:6, goods:2, cards:6 |
| terraforming-mars | 개선 | cubes:45, terrain:17 | terrain:49, cubes:44 |
| ticket-to-ride | 개선 | map:1, trains:22 | map:1, trains:85 |
| tiny-towns | 비슷 | resources:5, buildings:5 | resources:6, buildings:14 |
| twilight-imperium-4 | 개선 | systems:7, command:1, units:5 | systems:38, units:23, command:3 |

게임별 근거와 시간은 [CSV](comparison.csv), 카탄 실물별 대응은 [시각 대조](catan-visual-review.json), 게임 전체의 미시험 영역은 [범위 체크리스트](coverage-checklist.json)에 있습니다.

실행 상태: finished. 운영 모델·사용자 기록은 변경하지 않았습니다.
