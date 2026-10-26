# CUA before — 실제 모바일 렌더

대상은 합성 전용 `http://127.0.0.1:4410`이다. fresh own Chrome tab `738444407`만 사용했다. source/서버 변경·실AI·파일 업로드·방 생성·기록 값 변경은 모두 0이다. fixture가 준비한 후보/저장값의 **레이아웃**을 보았으며 실제 판독 성공 근거가 아니다.

## Claude에 먼저 전달한 핵심

1. **후보 모달 닫기가 상단 메뉴에 가림:** `splendor-candidate-review-stable-390.jpg` / `splendor-candidate-review-360.jpg`. 390에서 dialog top24px, 닫기 rect x336/y36/44×44. 닫기 중앙의 `elementFromPoint`는 app-bar header이고 닫기 버튼에 포함되지 않는다. title도 가린다. 문서가 스크롤된 상태에서 후보 확인을 클릭하여 재현했다. 반면 `splendor-card-edit-390.jpg`/`360.jpg`의 개별 카드 body-portal 모달은 제목/닫기가 보인다.
2. **첫 화면의 핵심 내용 위치:** `splendor-candidates-first-390.jpg` / `splendor-applied-first-390.jpg`는 촬영 안내+후보를 지나야 적용된 카드에 도달한다. 첫 카드 시작은 화면 아래쪽이다. 사용자 불편 판단을 위한 실제 이미지이며 기능 누락 판정은 아니다.
3. `game-picker-390.jpg`에서 게임 검색/목록은 실제 클릭으로 열었다. `creation-before-start-390.jpg`는 검색 후 Splendor를 선택하고 생성 직전인 상태다. 생성하지 않았다.

## 추가 before

| 파일 | 직접 수행한 상태 |
|---|---|
| home-390.jpg | 합성 6보드 로비 첫 viewport |
| splendor-card-edit-390.jpg / -360.jpg | 적용된 시장 첫 카드 클릭. 점수/보너스/비용 입력 확인, 값 수정/저장은 안 함 |
| rummikub-rack-390.jpg | 하나 탭. 공용 개요+자기 받침대. 이 fixture의 첫 줄은5개이며 14개 한눈보기 시험으로 세지 않음 |
| rummikub-rack-zoom-390.jpg | 크게 보기 실제 클릭. 150% 표기와 가로 pan용 잘림 확인. pan/줌 클릭은 미실행 |
| wingspan-pin-locked-390.jpg | 두리 보호 탭. 잠금/4자리 입력/열기 표시, 실제 PIN 입력·해제는 안 함 |
| wingspan-no-pin-390.jpg | 하나 미설정 탭. 짧은 보호 안내와 편집 영역 |

`metrics.json`은 각 캡처의 read-only DOM 실측이다. 캡처한390/360 화면 모두 document `scrollWidth===clientWidth`였다. 이것은 실제 손가락·소프트 키보드 검증이 아니며, 모달 내부 세로 스크롤 범위와 페이지 scrollHeight를 따로 기록했다. 정해진10경로 전수·끝까지 연속 캡처 대신 감독이 지정한 핵심 before에 집중했다. Catan/Carcassonne 빈 판, 읽는 중 업로드, 방 생성/타인 공개판 before,320은 미수행이다.

`splendor-candidate-review-390.jpg`는 열기 직후 프레임이며, 제출 근거는 별도 **stable** 이미지다. 최초 viewport 호출은 과거 browser1 핸들이 남아 `Browser is not available: 1`이었고, 방금 생성된 탭이 속한 Chrome6 핸들을 사용하여 성공했다. PIN 탭 첫 locator는 잠금 아이콘이 접근성 이름에 포함되어 no_matches였고 실제 DOM 이름을 확인한 뒤 합성 두리 탭을 선택했다. 브라우저 재시작/기존 탭 조작 없음.

마지막 관측 자산: JS `index-Cjfd2fuZ.js`, CSS `index-u-JBb3AS.css`. `session.json`에 기록했다. 종료 시 viewport **1920×992 원복**. after 캡처 요청에 이어 쓰도록 own tab만 handoff 표시했다. before 자료는 Claude/감독에게 즉시 부분 전달 완료.
