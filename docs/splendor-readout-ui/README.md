# 스플렌더 카드 표시 통합 인계 (Claude)

2026-10-22 · claude-opus-5-5. 범위는 src와 focused UI 테스트다. shared/server, ui-polish.css, main.tsx는 수정하지 않았다(동결 유지).

## 바뀐 것
- **표시 기준:** 모든 표시는 shared의 `getSplendorReadout(piece)`만 쓴다. 저장된 readout이 있으면 그것을 쓰고, 없으면 helper가 기존 label을 엄격히 해석한다. UI에는 label 파서가 없다.
  - helper가 kind를 `unknown`으로 돌려주면 그대로 unknown 표시가 된다.
  - 다섯 색이 모두 null인 비용 map은 "비용 ?" 하나로 보여 준다.
  - 저장된 readout이 잘못되어 있으면, 기록 전체를 깨뜨리지 않고 읽지 못한 값으로 표시한다.
- **legacy 표시:** `source:'legacy-label'`인 값에는 "글에서 읽음" 표시를 붙이고, 접근성 문장에도 "글에서 읽은 값 · 확인 필요"를 넣는다.
  - 자동 확정은 하지 않는다. 기존처럼 후보 확인·적용을 명시적으로 해야 한다.
  - label에 없던 색은 0이 아니라 "?"로 남는다.
- **후보(GameEssentials):**
  - 스플렌더 후보는 간단한 카드(점수, 보너스 보석, 비용 보석+숫자)로 보여 준다. 긴 label과 카드마다의 "수량 모름"은 없다.
  - 처음에는 6개를 보여 주고, 7개 이상이면 "모두 보기 (n)"(aria-expanded)로 전체를 연다. 이 버튼은 모든 게임에 적용된다.
  - 다른 게임은 기존 그림과 문구 그대로다.
  - 같은 field와 같은 원본 사진 묶음의 반복 후보는 최신 하나만 기본으로 보여 준다. 시각이 같으면 목록에서 나중 것을 고른다.
  - 나머지 후보는 "이전 후보 n개" 펼침에서 그대로 확인·적용할 수 있다. 다른 사진에서 나온 후보는 각각 표시하며, 아무것도 삭제하지 않는다.
- **적용된 기록(GameBoardRecord):**
  - 판 위 배치 아이템은 mini 카드(56px)로 그린다.
  - 판 아래 "카드로 보기 · n개"에 모든 구성물을 읽기용 카드로 나열한다. 누르면 선택하고 수정 창이 열린다.
  - 스플렌더에서는 이 목록이 기존 미배치 줄을 대신한다. 배치 동작은 같다(선택한 뒤 판을 탭).
- **수정 창:**
  - 전용 입력:

    | 대상 | 고칠 수 있는 것 |
    |---|---|
    | 개발 카드 | 앞면/뒷면 더미, 레벨, 점수, 보너스 보석(모름 포함), 비용 5색 |
    | 귀족 | 점수, 필요 보너스 5색 |
    | 토큰 | 색(금 포함) |
  - 빈 칸은 모름(null)이고 0은 0이다. "빈 칸은 없음(0)" 버튼을 눌러야만 빈 칸이 0으로 바뀐다.
  - 원래 label은 "원문 메모" 펼침에 남겼다. 원본 보기, 수량, 위치는 기존 그대로다.
  - 구성물 종류를 바꿀 때 기존 판독 종류와 맞지 않으면, readout을 새 종류의 빈 값(`emptySplendorObservation`)으로 정리한다. 이전 숫자가 남아 보이지 않는다.
  - 저장 값은 shared 검증 규칙에 맞다: 종류별로 허용된 필드만 채운다.
- **동작 유지:** 후보 자동 확정 방지, 같은 field 초안 충돌 거절, 다른 field의 dirty 초안 유지, 전체 저장 flush는 바꾸지 않았다. 기존 game-recognition-ui 회귀가 통과한다.

## 파일
- **새 파일:**
  - `src/SplendorEditor.tsx`: 어댑터 `splendorView`, `readoutForComponent`, 전용 입력 `SplendorFields`
  - `tests/splendor-record-ui.test.ts`
- **수정:**
  - `src/SplendorReadout.tsx`: mini 크기, legacy 표시 추가
  - `src/splendor-readout.css`
  - `src/GameEssentials.tsx`: `splitCandidates`, 모두 보기, 스플렌더 카드, 전용 입력 연결
  - `src/game-essentials.css`
  - `src/GameBoardRecord.tsx`
  - `src/game-board-record.css`
- **변경 없음:** `src/GenericPieceArt.tsx`. 스플렌더 표시는 호출부에서 분기한다.

## 검증 (전체 로그와 실제 exit 기록)
| 명령 | exit | 로그 |
|---|---|---|
| `npx tsx --test tests/splendor-readout.test.ts tests/splendor-record-ui.test.ts tests/game-recognition-ui.test.ts tests/splendor-observation.test.ts tests/game-essentials-runtime-ui.test.ts tests/game-essentials-runtime-preservation-draft.test.ts` | 0 (24/24) | `focused-tests.log`, `focused-tests.exit` |
| `npx tsc --noEmit` | 0 (출력 없음) | `tsc.log`, `tsc.exit` |

- tsc는 중간 참고용이다. 최종 type/build는 양측 동결 후 감독이 한 번 통합 실행한다.
- 전체 suite와 build는 실행하지 않았다.
- fixture는 사진에 보이는 카드를 보고 만든 수동 props이며, 인식 성능의 증거가 아니다.

## 한계
- **UNCLEAR:** CUA·브라우저가 없어 390px 3열 카드, mini 배치, 수정 창 화면을 캡처하거나 확인하지 못했다.
- **기존 문구:** 다른 게임의 후보 미리보기에는 기존 "수량 모름" 표기가 그대로 있다. 다른 게임의 render는 바꾸지 않는다는 지시에 따른 것이다.
