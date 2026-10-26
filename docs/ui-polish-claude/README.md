# UI 규격 정돈 인계 (Claude)

2026-10-22 · claude-opus-5-5. 현재 테마(하늘 배경, Jua, 젤리 버튼)는 유지했다. 표현 CSS만 바꿨다.

## 진단 (CSS 근거)
스타일이 세 층으로 쌓여 있다: `styles.css` 기본 → 게임클라이언트 덮어쓰기 → `lobby-theme.css`. 그 결과 아래가 섞여 있었다.
- **선 두께:** 젤리 secondary 버튼과 홈 검색은 2px이다. 입력·선택·칩은 1px, 게임 선택 버튼은 1.5px였다.
- **모서리:** 컨트롤과 칩이 8/10/12px로 제각각이었다.
- **패널:** 패널 모양이 두 가지로 섞여 있었다.

  | 모양 | 해당 패널 |
  |---|---|
  | 1px 테두리, 14–16px 모서리 | 보드 편집, 루미큐브, 상세 패널, PIN, 상태줄 |
  | 테두리 없음, 22px 모서리, 그림자 | 차례·메모, 플레이어 |
- **선택 표시:** 칩을 선택하면 1px 테두리 위에 inset 1px 링이 한 번 더 그려졌다.
- **제목 글꼴:** 페이지 제목은 Jua인데, 패널과 대화상자 제목은 DM Sans 700이었다.
- **겹침(실제 문제):** 작업 중 표시(`.mutation-indicator`: 데스크톱 top 14px, z 115)가 떠 있는 HUD 바(top 10px, 높이 60px) 가운데 내비게이션 위에 겹친다. 모바일에서는 top 64px라 바 아래 끝(8+56=64px)에 바로 붙는다.

## 정리 규칙 (`src/ui-polish.css`, 마지막에 불러옴)
- **선:** 1px는 구분선과 안쪽 카드에 쓴다. 2px는 누르거나 입력하는 모든 것에 쓴다: 입력, 선택, 텍스트 영역, PIN, 칩, 게임 선택 버튼과 검색.
- **모서리:**

  | 대상 | 모서리 |
  |---|---|
  | 버튼 | pill |
  | 컨트롤, 아이콘 버튼 | 14px |
  | 칩 | 12px |
  | 안쪽 카드(보관 항목, 상태줄, 게임 선택 패널) | 16px |
  | 패널, 첫 사진 카드 | 22px |
  | 대화상자 | 24px (모바일 시트는 22px 22px 0 0) |
- **패널:** 보드 편집, 루미큐브, 상세 패널, PIN, 저장됨 패널을 로비 패널 모양(테두리 없음, 하늘색 그림자)으로 맞췄다. 상태줄의 색 표시는 안쪽 왼쪽 막대로 바꿨다.
- **선택:** 칩은 2px 강조색 테두리 하나만 쓴다(이중 링 제거).
- **제목:** 대화상자, 차례·메모, 루미큐브, 보드 편집, 게임 기록, PIN 제목을 Jua로 바꿨다.
- **작업 중 표시:** 데스크톱은 top 80px, 모바일은 72px로 내려 HUD 바 아래에 둔다.

## 변경 파일
- `src/ui-polish.css`(새 파일)
- `src/main.tsx`: import 한 줄 추가

## 검증
| 명령 | 결과 |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx tsx --test tests/rummikub-board-ui.test.ts tests/game-essentials-runtime-ui.test.ts tests/mobile-game-picker.test.ts tests/board-ux.test.ts tests/quick-save.test.ts tests/private-workspace.test.ts tests/game-essentials-runtime-preservation-draft.test.ts` | exit 0 · 22/22 |
| `npm run build` | exit 0 (기존 청크 크기 경고만) |

## 미확인 (정직한 한계)
- **전후 캡처 없음:** 이 세션에는 CUA·브라우저 도구가 없다. 390/320/데스크톱 화면에서 아래 항목을 **직접 보지 못했다.** CSS 근거만으로 시각 검증을 했다고 주장하지 않는다.
  - 정렬, 잘림, 가로 넘침
  - 대화상자와 저장바 겹침
- **확인 권장:**
  1. 홈
  2. 새 보드 → 게임 선택 패널
  3. 카탄 보드 작업공간과 상세 패널
  4. 루미큐브 공용/개인과 확대 시트
  5. PIN 줄
  6. 사진 확대 대화상자
- **되돌리기:** `src/main.tsx`의 import 한 줄만 지우면 원래대로 돌아간다.
- **보류:** 스플렌더 표시는 감독 지시로 손대지 않았다. 새 파서, label 추정, GenericPieceArt·GameEssentials·GameBoardRecord 모두 변경하지 않았다.
