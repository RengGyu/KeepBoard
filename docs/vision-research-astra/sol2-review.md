# 전게임 이미지·보드 감사의 독립 판정

**격리 수정2파일을 검토했고 추가 필수 수정은 발견하지 않았다.** 주사위 종류의 중립 그림과 Wingspan 먹이 주사위의 소유색 처리가 좁게 고쳐졌다. 변경 SHA2개를 직접 대조하고 집중 검사5개를 실행해 exit0을 확인했다. 수정 후 실제 브라우저 화면은 연결 장애로 미확인이다. 기존 전체 렌더 성공을 수정판 전체 화면이나 실물 정확성 합격으로 사용하지 않는다.

## 직접 확인한 범위

`renders/final-all-metrics.json`의 exact120 ID·sourceSHA를 현재 고정 명세와 대조했다. 1,300 variant와441 board instance(일반437+native4) 기록이 있다. 현재 표본에서 읽힌 기계 오류와 게임별 판정은 [visual-reviews.json](visual-reviews.json), 색상 후보 전체는 [color-mapping-review.json](color-mapping-review.json)에 보존했다.

연구 worker가 직접 본 출력은6게임9파일이다: Sagrada categories/boards, SCOUT categories, Carcassonne categories/variants, SETI categories/boards, Wingspan variants, Clue variants. 직접 열지 않은 모든 그림을 눈 검수했다고 표시하지 않는다. `boards.png`는 실제SVG와 측정한DOM의 투영 sheet이며 전체 브라우저 화면 캡처가 아니다. sheet의 축소 글자 겹침을 제품 UI 잘림으로 단정하지 않았다. 합성 fixture의 숫자0도 제품이 미확인값을0으로 채웠다는 증거가 아니다.

등록532asset 중35Catan preview 실패는 harness에서 `component-art-preview.svg`를 복사하지 않은 문제였다. 이후 `renders/raw/decode.json`와 `final-summary.json`을 직접 대조해 raw518/등록532, decode 실패0이라는 worker 결과를 확인했다. 추가1개는 harness 보완이며 제품 그림 수정이 아니다. `all-metrics.json.raw`에는 초기517/35실패가 남으므로 최종 decode 파일을 사용한다. 이 검사 역시 게임별 의미 정확도 합격은 아니다.

worker 최종 눈 검토는7게임/나머지113 기계렌더이며, 아래 연구 worker의6게임9파일과 별도다. Catan 감사 fixture는 구형 예시를 기존 scene bridge로 변환하도록 보완되어 terrain19·edge road·vertex settlement의 순수 검사는 통과했으나 새 배치 화면은 없다. 초기 빈19칸을 제품 오류로 세지 않는다. 공유 baseline799/source878경로 동일은 worker 해시 보고이며 연구 worker는 변경2파일을 직접 검증했다.

## V001 — 주사위 종류가 동전 그림으로 보임

**확인:** `src/GenericPieceArt.tsx`는 variant가 없는 알려진 종류를 그릴 때 `kind==='dice'` 또는 cube만 입체 그림으로 보낸다. 현재8게임의 분류는 `kind==='die'`여서 token-shell로 간다. Sagrada `categories.png`에서 색 주사위와 은총 token이 같은 둥근 외형인 것을 직접 확인했다. 원본 Sagrada 사진은 입방체 주사위이고 공식 규칙도 색/눈을 구분한다([SA201 PDF p2–4](https://cdn.shopify.com/s/files/1/2319/3985/files/Sagrada_-_Rule_Book_FGG-SA201.pdf?v=1770446534)).

**최소 수정:** 알려진 종류 조건에 `die`를 추가하고 기존 `dice/cube` 호환을 유지. `variant:null` 자체는 유지하고 숫자/색/상용 subtype을 새로 채우지 않는다. neutral cube는 종류 대표 그림이며 눈은 typed 값과 원본으로 구별한다. 필요 이상의 아트 재제작/색 엔진은 없다.

**영향:** castles-burgundy, grand-austria-hotel, king-of-tokyo, machi-koro, sagrada, space-base, stone-age, war-of-the-ring-2. 공통 코드 경로의 영향은 확인했지만 각 게임을 별도 실사진으로 확인한 것은 아니다.

**최소 회귀:**8게임 `die + variant:null`이 cube 계열, 기존 token은 token-shell, known variant·native Catan/Rummikub·typed 값·저장값은 변화 없음. 숫자/색을 모르는 주사위에 특정 눈/소유색이 생기면 실패.

## V002 — owner 색상 메타데이터가 혼합 부품에 너무 넓음

**확인:** owner=true이면서 red/blue 픽셀 불변은72개였지만, 이 중 Blokus21개는 `physical-type-color; owner is separate`이므로 제외한다. 남은51개가 `color_role=owner`라는 선언과 불일치한다는 **기계 후보**다. 이것이51개 실물 표시 결함을 증명하지 않는다.

Wingspan의 먹이4토큰은 실제 출력에서 곡물/생선/열매/곤충 기호와 고정색을 유지한다. 이는 기호별 먹이를 뜻하므로 owner색으로 바뀌지 않아도 된다. 공식 규칙은 주사위 기호와 맞는 먹이를 공급에서 가져오게 하며 행동 큐브는 참가자 색으로 나눈다([공식 Food/Gain Food/Player Setup](https://wingspan.rulepop.com/#food-tokens)). 확장 통합 페이지이므로 여기서는 이 기본 역할 구분만 사용했다.

반대로 같은 `food` component에 묶인 “먹이 기호 주사위 예시”는 owner red/blue에 따라 바뀐다. 이것은 픽셀 비교상 성공이지만 개인 행동 큐브와 공용 먹이 기호를 같은 소유색 의미로 다루는 과도한 선언이다. 사진을 읽어 관측한 실제 주사위 색을 뜻하지 않는다. 현재 generic null-variant 경로는 별도 중립 그림이므로 이 문제를 모든 사진 후보가 실제 잘못 재칠된다는 주장으로 넓히지 않는다.

**최소 권고:** 이미 `artResolver.ts`가 지원하는 variant별 `color_role` / `owner_color_supported`를 사용한다. 공식 의미가 확인된 먹이 토큰/먹이 주사위는 고정 의미형, 행동큐브는 owner형을 유지한다. 같은 symbol asset 전체를 owner tint로 바꾸지 않는다. 소유자가 필요한 고정색 물체는 소유자 이름/별도 표시로 구별한다. Clue의 무기/기록지 등 혼합 component도 같은 분리가 필요할 수 있지만 이번에는 exact 판본 공식 대조 미완료로 보류한다.

나머지47개 candidate는 원명세의 부품 의미와 실제 쓰임을 좁게 대조한 뒤 메타데이터만 고칠지, owner 표시를 보완할지 결정한다. 51개를 한 번에 다시 칠할 근거는 없다.

## 게임별 판정과 재개 한계

수정 전 전수표는 **NEEDS_CORRECTION8 / INSUFFICIENT_EVIDENCE112 / whole-game PASS0**이었다. 최종 표에서는 해당8게임과 Wingspan을 **ISOLATED_FIX_VERIFIED_RENDER_PENDING9**, 나머지를 **INSUFFICIENT_EVIDENCE111**로 구분한다. 이는111게임의 앱 연결을 중단하라는 판정이 아니다. 알려진 표시 문제의 격리 수정과 검증하지 않은 실물 정확도를 분리했다. 구조 렌더 성공/실물 대조/사진 인식 성능을 각각 기록한다.

- Sagrada의 중립 square-mat는 실제4×5 창문이나 인쇄 제약을 그대로 재현한 판이 아니다. 창문 좌표와 pattern 원본을 함께 보존해야 한다.
- SETI free-table은 회전하는 층/부모 구역 관계를 표현하는 실제 태양계판이 아니다. 현재 수동 rotationState·원본을 유지한다.
- Carcassonne의 명시 variant는 타일·선/누운 말의 대표 그림을 구별한다. 다만 실제 타일의 모든 변·도시/들판 연결을 보장하지 않는다. River가 보이는 공개 사진을 기본판 전용 아트 인증으로 사용하지 않는다.
- SCOUT의 앞/뒷면·두 끝 숫자·순서 정보는 텍스트와 원본으로 보존해야 한다. 일반 카드 그림만으로 손패의 사용 방향을 알았다고 하지 않는다.

위 한계의 최소 대응은 사진/typed 읽힌 값/수동 정정을 함께 보여주는 것이다. 새로운 전체 보드 엔진이나 모든 구획 실사진 확보를 선행 요구하지 않는다. [게임별 계약](coverage.md)과 [구현 카드](partition-contract.md)를 사용한다.

## 최종 두 파일 검토·인계

[sol2-source-check.json](sol2-source-check.json)에 격리 snapshot 경로, before/after2개 SHA, 패치·입력·로그 hash를 고정했다. 공유 제품의2파일은 검토 시점에 before와 일치했다. 전체 snapshot을 다시 해시했다고 주장하지 않는다.

- `GenericPieceArt.tsx`: `die`만 기존 dice/cube 분기에 추가했다. known variant·null 수량·typed 값·저장값을 쓰는 경로는 바꾸지 않았다.
- `artResolver.ts`: Wingspan `food`의 `먹이 기호 주사위 예시` 하나를 복제해 fixed-semantic/owner=false/`#eee1c5`를 적용한다. 원 mapping을 수정하지 않는다. 이 색은 대표 재료색이며 실제 모든 판본의 인쇄색을 인증한 값이 아니다. 행동 큐브와 다른1,299 variant의 resolver 결과는 기존과 같다.
- **실제 실행:** `node --import tsx --test docs/game-visuals-full-audit/fix/renderer.test.ts` →5/5, exit0. [실행 로그](sol2-focused-test.log). JSX 요소·resolver 검증이며 after 브라우저 픽셀 검사가 아니다.
- **비차단 잔여:** 먹이4토큰은 여전히 component의 넓은 owner 메타데이터를 상속하지만 SVG 기호는 고정색이다. 지금 모두 다시 칠하지 않는다. 한국어 variant 이름이 바뀌면 해당 좁은 override와 검사도 함께 갱신한다.
- **후속 통합 확인:** 새 미리보기에서8게임의 중립 주사위와 Wingspan 먹이 주사위/행동 큐브를 확인한다. CUA browser2 unavailable로 after9게임 화면·viewport 원복은 미확인이라는 worker 보고를 유지한다. 이 때문에 전120게임 재렌더를 선행 마일스톤으로 추가하지 않는다.

연구 worker의 제품/팩/그림 수정0, 외부 모델 호출0. 격리 패치의 실제 제품 통합과 운영 검증은 후속 구현 담당 범위다.
