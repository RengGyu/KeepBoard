# 루미큐브 한눈보기·확대·선택형 PIN 프런트 인계

2026-10-22 · Claude(claude-opus-5-5). 범위: src와 관련 UI 테스트. backend와 shared는 Sol2 계약(`docs/rummikub-board-redesign/backend/handoff.md`)을 그대로 사용한다.

## 화면
- **공용판:**
  - 테이블 면 하나에 묶음을 실제 순서대로 배치한다. 28px 타일이다.
  - 따로 둔 타일 자리와 "+ 묶음"이 있다.
  - 긴 묶음(13개 run 등)은 묶음 안에서만 줄바꿈되며, 묶음과 순서 데이터는 그대로다.
- **개인 화면:**
  - 위: 공용판 개요(22px, 읽기 전용, "공용판으로").
  - 아래: 내 받침대. 기존 rack 그림을 받침으로 쓰고, 줄별로 42px 타일을 놓는다.
  - 다른 사람의 받침대는 넣지 않는다.
- **확대(묶음·줄을 누를 때):** 공용 `Modal`을 `document.body` portal로 띄운다. 고정 레이어, 포커스 가두기, Esc와 완료로 닫기가 된다. 받침대 레이어가 시트 위로 올라오지 않는다.
  - 큰 타일과 + 추가
  - 숫자 1–13, ?, 조커, 모름
  - Classic 4색과 모름
  - 앞·뒤, 옮길 곳
  - 앞으로·뒤로·여기서 나누기·빼기
  - 묶음 순서 이동·합치기
  - 근거 원본 보기
  - 조커가 대신하는 값
- **크게 보기:** 판 전체를 100–300%로 확대·축소하고, 그 안에서 가로·세로로 밀어 본다. 묶음을 누르면 확대 편집으로 이어진다.
- **빈 판:** "판을 찍어 주세요" / "내 받침대를 찍어 주세요", 찍기 버튼, 직접 놓기를 보여 준다. 사진은 있는데 타일이 없으면 "타일을 놓아 주세요"를 보여 준다.
- **뺀 것:**
  - GameEssentials("이어갈 기록·보관")
  - 원시 `analysisSummary`
  - 자동 인식과 후보 안내 문단
  - 숫자 밑 색 이름
  - capture-start 이미지 카드
- **남긴 것:**
  - 읽는 중, 실패, "새 타일이 없어요" 상태
  - 실패 시 "다시 읽기"
  - 기존 사진 재판독 "다시 읽기": AI가 켜져 있고 현재 epoch에 사진이 있을 때 헤더에 나온다. 범위는 최근 SCAN_LIMIT장이며, 먼저 `flush(PHOTO_INPUT_SAVE_OPTIONS)`를 한다.
- **색:**
  - 새 선택지는 `RUMMIKUB_COLORS` 4색과 모름뿐이다.
  - 저장된 green은 그 색 그대로 그리고, 작은 표식과 "초록 · 색 확인 필요"로 알린다. 사용자가 다른 색을 고를 때만 바뀐다.
- **PIN:**
  - 잠금은 `protectedOwnerIds`와 `unlockedOwnerIds`만으로 판단한다(`strictPrivate` 미사용). 적용 위치: SessionWorkspace, RummikubWorkspace, GameEssentials.
  - PIN이 없으면 바로 찍고 편집할 수 있다. 화면에는 한 줄 "비밀번호 걸기"와 "걸지 않으면 이 보드를 여는 사람이 볼 수 있어요."만 보인다.
  - 보호 중이면 "변경/해제"가 있고, 둘 다 기존 currentPin 절차를 거친다.
  - `setupRequiredOwnerIds` 화면은 호환용으로 남겼다.
- **동작 유지:** owner 분리, 순서, tile ID, 근거, undo, 명령(move/split/merge), 후보 확정(forceSave), global flush는 바꾸지 않았다.
  - 보드 안의 "타일 기록" 버튼은 없앴다. 저장은 기존 상단과 하단의 저장 버튼이 맡고, 둘 다 flush로 같은 저장을 한다.
  - 공용 개요의 기록 선택은 본편과 같은 `pickRummikubSource` 규칙을 쓴다.

## 파일
- `src/RummikubBoard.tsx`(새 파일): 타일과 받침대 그림, 보드 보기, 기록 선택 규칙, 색 상수
- `src/RummikubWorkspace.tsx`, `src/rummikub-workspace.css`
- `src/SessionWorkspace.tsx`: 루미큐브 연결, 문구, PIN 판단
- `src/PrivatePin.tsx`, `src/private-pin.css`
- `src/GameEssentials.tsx`: 잠금 판단만 수정
- `tests/rummikub-board-ui.test.ts`(새 파일)
- `tests/game-essentials-runtime-preservation-draft.test.ts`: 선택형 PIN에 맞춰 1개 테스트가 실제 PIN을 먼저 설정한 뒤 잠금을 확인하도록 했다. `protect` helper를 추가했다.

## 검증
- `npx tsc --noEmit`: exit 0
- `npx tsx --test tests/rummikub*.test.ts tests/quick-save.test.ts tests/board-ux.test.ts tests/game-essentials-runtime-ui.test.ts tests/game-essentials-runtime-preservation-draft.test.ts tests/mobile-game-picker.test.ts tests/private-pin.test.ts tests/private-workspace.test.ts`: exit 0, 54/54
- 새 테스트 4개가 확인하는 것:
  - 새 accepted와 구 candidate가 있으면 accepted를 표시한다.
  - 공용판 최소 문구: GameEssentials와 원시 summary가 없다.
  - 개인 화면은 공용판 위, 내 받침대 아래다. 다른 사람 받침대가 없고, PIN이 없으면 열리며, PIN이 있으면 잠긴다.
  - legacy green을 그대로 보존해 표시한다.
- 전체 suite와 build는 지시대로 실행하지 않았다. 통합 담당이 1회 실행한다.

## 한계
- **UNCLEAR:** 실제 브라우저 렌더링은 보지 못했다. 브라우저 도구가 없다. 확인하지 못한 항목:
  - 390과 320px의 가로 넘침
  - 외부 SVG `<use>` 표시
  - 확대 시트 겹침 해결
  - 크게 보기 pan
- **확대 방식:** 핀치 확대는 따로 구현하지 않았다. +/- 버튼과 스크롤 pan만 있다.
- **그림 경로:** 타일과 받침대 그림 경로는 `/game-art/...`로 고정되어 있다. 시안에서 쓴 방식과 같다.
