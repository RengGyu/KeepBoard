# 모바일 UI 1차 수정 (격리 사본 src)

- **근거:** Sol1의 실제 CUA before 캡처(`captures/before/`, 390/360)를 직접 보고 판단했다. 이 문서는 수정 내용과 판단만 기록한다. after 캡처는 아직 없으며, **시각 PASS를 주장하지 않는다.**
- **patch:** `round1.patch`(sha256 `d903b8c9…`). 격리 사본 `$TMPDIR/keepboard-mobile-ui-claude/app` 기준이다.
- **preview:** http://127.0.0.1:4410(같은 세션 URL 유지). 새 번들은 `index-CYyX5V9R.js`, `index-VdwxpSl7.css`이고, before 번들은 `Cjfd2fuZ`, `u-JBb3AS`였다.

## 문제 → 원인 → 수정
1. **후보 확인 창 제목·닫기가 상단 앱 바에 가려짐**(390/360 둘 다)
   - 원인: `.main-content{position:relative;z-index:1}`이 stacking context를 만든다. 그 안에서 인라인으로 렌더되는 Modal(z100)은 z40 sticky 앱 바 아래에 갇힌다.
   - 카드 수정 창은 이미 body portal이라 정상이었고, 이 차이가 원인 판단과 일치했다.
   - 수정: `ui.tsx`의 `Modal`을 `document.body` portal로 바꿨다. SSR에서는 인라인을 유지한다. 포커스 가두기, Esc, 스크롤 잠금, 바깥 클릭 닫기는 그대로다.
   - 영향: 촬영, 사진 원본, 교역, 플레이어, 후보 확인 등 모든 Modal.
2. **빈 '기록 배치' 판(약 350×235)이 카드 목록보다 먼저 나옴**(후보 확인 창, 보드)
   - 수정: 놓인 구성물이 없고 선택한 구성물도 없으면 판을 한 줄 안내로 접는다. 구성물을 고르는 순간 판이 펼쳐지므로 기존 배치 동작은 그대로다.
   - 접근성: 접힌 안내에도 `… · 수동 기록 배치` 이름을 유지했다.
3. **보드 상단에서 '게임 기록'까지 거리가 김**
   - **촬영 안내:** 제목(보드 제목과 중복)과 긴 안내 문단 2개를 "촬영 안내" 접기로 옮겼다. 찍을 부분 select는 바로 보이게 남겼다.
   - **상단 버튼:** 상단 버튼 4개가 아이콘만 보였다. 모바일에서 라벨을 표시하고, 380px 이하에서는 아이콘 위·라벨 아래로 배치한다.
   - **중복 저장 버튼:** 상단 `저장`이 하단 sticky 저장과 중복되어 있었다. 숨김 규칙이 CSS 로드 순서상 `.button{display:inline-flex}`에 져서 보였던 것이다. 선택자 우선순위를 높여 모바일(≤900px)에서는 하단 저장 하나만 보이게 했다.
4. **홈 첫 화면의 대부분을 hero가 차지함**(보드 목록이 y≈730에서 시작)
   - 보드가 1개 이상일 때 모바일에서:
     - 사진 높이를 220px에서 120px로 줄였다.
     - 설명 문장을 숨겼다.
     - 통계 3개를 숨겼다. 같은 숫자가 바로 아래 필터 탭에 있다.
     - 예시 버튼을 작은 버튼으로 바꿨다.
   - 보드가 없을 때는 기존 그대로다.
5. **스플렌더 카드 수정 창의 '대표 그림 · 세부 모름' select**
   - 스플렌더 카드는 readout으로 그려서 쓰이지 않는 입력이다. 스플렌더에서만 숨겼다.

## 불필요 요소 검토 목록
| 요소 | 결정 | 이유 |
|---|---|---|
| 모바일 상단 `저장` | 숨김(≤900px) | 하단 sticky 저장과 중복 |
| 촬영 안내 제목 | 삭제 | 보드 제목·게임명과 중복 |
| 촬영 안내 문단 2개 | 접기 | 처음 한 번 필요한 보조 설명 |
| 찍을 부분 select | 유지 | 촬영 범위를 정하는 실제 입력 |
| 빈 기록 배치 판 | 조건부(빈 상태에서 접힘) | 놓을 것이 없을 때는 빈 공간만 차지 |
| 홈 통계 3개(보드 있을 때, 모바일) | 숨김 | 필터 탭 숫자와 중복. '게임 120'은 행동으로 이어지지 않음 |
| 홈 설명 문장(보드 있을 때, 모바일) | 숨김 | 재방문 사용자에게 반복 안내 |
| 홈 예시 버튼 | 유지(작게) | 예시 진입 경로를 보존 |
| 스플렌더 '대표 그림' select | 숨김(스플렌더만) | 카드 그림이 readout에서 결정됨 |

## 검사(격리 사본)
| 명령 | 결과 |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx tsx --test tests/game-essentials-runtime-ui.test.ts tests/splendor-record-ui.test.ts tests/rummikub-board-ui.test.ts tests/game-recognition-ui.test.ts tests/mobile-game-picker.test.ts tests/private-workspace.test.ts tests/board-ux.test.ts tests/quick-save.test.ts` | exit 0, 27/27 |
| `npm run build` | exit 0 |

- 처음 실행에서는 1건이 실패했다. 빈 판을 접으면서 aria 이름이 사라진 것이 원인이었다. baseline 사본에서는 같은 테스트가 통과하는 것을 확인했고, 이름을 유지하도록 고쳤다. tests 파일은 수정하지 않았다.

## 남은 일
- after 캡처: 390/360, 같은 URL.
- 방에서 다른 플레이어의 public 기록을 읽기 전용으로 보는 경로(감사 L2).
- Sol2 backend freeze를 결합한 연결 UI.
