# 복원판 가독성 수정과 기존 5종 무료 확인

**VERIFIED — UI 수정·기존 5종 실제 앱 확인을 완료했다. 새 사진의 위치 정확도는 아직 미검증이다.**

기준 HEAD는 `64fc8abdc97c0e212a3c41bc08aacec0758919e3`이다. 사용자 승인대로 기존 구현솔·구현솔2를 `gpt-6.1-sol/high/Fast(service_tier=priority)`로 재사용했다. [실제 설정](runtime-verification.json), [UI 카드](sol1-task.md), [재생 카드](sol2-task.md). 새로운 Astra·유료 판독·운영 배포는 하지 않았다.

## 바뀐 제품

- 기존 `GenericPieceArt`와 심벌을 재사용해 읽힌 색·숫자를 강조했다. 알려진 색 코드는 한글로 표시한다. 게임 이름이나 자유 서술 문자열을 임의 번역하지 않는다.
- compact에서 보조 ‘없음’과 같은 숫자의 반복 표기를 숨긴다. 숫자 0과 서로 다른 값은 유지한다. 해당 원요청이 요구한 미상 속성에는 작은 `?`를 표시한다. 상세 편집·원 readout은 바꾸지 않는다.
- 순서/기술 설명은 닫힌 ‘배치 근거’와 길잡이에 보존했다. 확정하지 못한 판 위치는 ‘사진 기준 배열 · 판 위치 확인 필요’로 표시한다.
- 외부 min-height 대신 내부의 실제 내용 높이를 측정한다. 짧은 패널이 불필요하게 커지는 문제를 고쳤다. 끝 구역의 시작점까지 스크롤할 수 있게 표시 여유만 더해 jump가 이전 구역의 빈 공간에서 멈추지 않도록 했다. 집중 보기 재진입 시 사용자가 옮긴 위치도 유지한다.

제품 6파일·직접 UI 검사 3파일이다. shared 기하·3종 hand-written profile·생성 profile·backend·기본 판독 강도·구조 판독 기본값은 변경하지 않았다. [최종 소스 대조](supervisor/source-verification.json): 보호 7파일 SHA 불변, 작업자 최신 동결과 8파일 일치, 나머지 test 1파일은 감독의 trailing whitespace 정리만 있다. 동결은 [최초](sol1/freeze.json) → [미상/중복 숫자 후속](sol1/hanabi-followup/freeze.json) → [끝 구역 jump 후속](sol1/end-jump/freeze.json) 순으로 소비한다.

## 실제 화면에서 확인한 5종

기존 8장 중 나머지 5종을 현재 `Store/createApp/App`에 넣었다. 정적 모조 화면이 아니며 원사진·저장 팩·요청·receipt를 그대로 사용한다. **아래 수는 보존·표시한 원관측 수이며, 올바르게 배치한 수가 아니다.**

| 게임 | 표시·보존 원관측 | 실제 화면과 남은 차이 |
|---|---:|---|
| [루미큐브](supervisor/rummikub.png) | 58/58 | 기존 native TileFace/사진 줄·정정 경로. 새 합법 묶음을 만든 것은 아님 |
| [하나비](supervisor/hanabi.png) | 35/35 | 한글 색·큰 숫자·미상 표시. 현재는 긴 카드 목록이며 손패/버림/사람별 역할 복원은 부족 |
| [아줄](supervisor/azul.png) | 22/22 | 원래 판 3개·타일 19개를 표시. 정식 패턴 칸/벽/바닥 연결은 없음. 자유 서술 색·무늬 일부는 영문 유지 |
| [카르카손](supervisor/carcassonne.png) | 43/43 | 기존 타일 9개·말 34개가 보임. 연결 지도·회전·점수말 역할은 복원하지 못함 |
| [도미니언](supervisor/dominion.png) | 49/49 | 기존 카드/묶음 관측 목록. 이름·수량 미상이 많고 실제 공급 더미 구조 복원은 부족 |

합계 207개, source-qualified identity 중복/누락 0. 5종 모두 기존 응답의 정식 칸 연결은 0이다. 원요청 영역 이름(Hanabi fireworks, Azul pattern 등)이 남는 것도 새로 검증된 역할 판정이 아니다. 따라서 **3종 밖 호환·편집·저장 경로는 확인했지만, 120종 위치 복원 일반화 성공은 아니다.** [입력·HTTP 보존 근거와 재현 명령](sol2/README.md).

추가 기존 3종의 현재 화면: [사그라다 세로](supervisor/sagrada-portrait.png), [로스트 시티 가로](supervisor/lost-focus.png), [세븐 원더스 가로](supervisor/seven-focus.png). UI 변경은 기존 배치 수·관계의 정답 여부를 새로 인증하지 않는다. [수정 전 캡처의 출처](supervisor/before-captures.json)는 이전 커밋의 실제 앱 화면이며 새 사진이 아니다.

## 감독 검수

- 관련 통합 **40/40 PASS**, skip 0: [최종 로그](supervisor/final-integration-tests.log). 작업자 검사와 겹치므로 합산하지 않는다. 전체 1,468개 suite는 이번 UI 변경에서 재실행하지 않았다.
- `npm run build` **exit 0**: 전체 타입 검사와 Vite 빌드 포함. [최종 로그](supervisor/final-build.log). 기존 큰 chunk 안내는 남는다.
- 제품·검사·Markdown/JSON 인계의 `git diff --check` PASS. 동결 patch/log의 원문 공백은 보존한다. [제품 소스/보호 파일 SHA](supervisor/source-verification.json).
- 실제 Chrome 844×390 및 사그라다 390×844 확인. 끝 창문 구역 jump 후 scrollTop 833, 집중 보기→기본→집중 재진입에도 833을 유지했다. 이전 상한 599.5에 걸리던 문제를 해소했다. [DOM 근거](supervisor/browser-final.json). 실제 iPhone Safari/손가락 터치는 미검증이다.
- 별도 하나비 시험 사본에서 원 ID 카드 숫자 4→5를 기존 편집기로 변경→저장→reload. 다른 ID·원사진 좌표·receipt 원문은 유지됐다. 원 fixture는 수정하지 않았다. [변경 범위](supervisor/browser-save.json).
- 5종 HTTP commit→GET→public resume와 같은 값 재저장 보존 PASS. 새 provider 호출 0, 외부 fetch 0. [검사 결과](sol2/verification.json). 관측 보존과 사진 정답은 다른 검증이다.

## 다음 방향

무료 범위에서 가능한 가독성과 기존 5종 확인은 마쳤다. 기하 규칙은 더 늘리지 않았다. 이제 해결해야 할 것은 새 사진에서 필요한 판·역할·관계를 판독 입력이 제공하는지다. 현재 기본 판독과 선택형 ‘구조 함께 읽기’를 같은 새 장면에서 비교한 뒤, 실제 오소속·미연결과 필요한 값의 차이로 다음 수정을 정하는 것이 맞다. **기본 구조 모드나 high→medium 전환은 이번 근거로 결정하지 않았다.** 새 사진·새 유료 호출은 별도 작업이다.

실제 iPhone Safari 촬영→저장→재열기, 새 구조 schema/두 시점 정합 품질, 대형 저장 회귀도 남는다. 이번 UI 작업에서 해결했다고 보고하지 않는다. 도미니언 같은 미상 목록을 더 예쁘게 배열하는 일만으로 위치 문제를 해결할 수는 없다.

## 읽어 볼 diff와 흐름

1. `src/pieceFaceValues.ts::pieceFaceValues` / `src/GenericPieceArt.tsx`: 원값을 보존하고 compact 표기만 바꾼다. ‘없음’·미상·숫자 0을 구별한다. [직접 검사](../../tests/visible-piece-face.test.ts).
2. `src/RestorationSceneView.tsx`의 `panelContents` 측정 / `canvasWidth·canvasHeight`: 내용 높이와 표시 스크롤 범위를 분리한다. 패널 좌표를 바꿔 jump를 고치는 방식이 아니다. [끝 구역 회귀](../../tests/restoration-scene-ui.test.ts).

`저장된 관측 → 기존 face/receipt helper → 읽힌 값 또는 ? → 원 ID 선택 → 기존 편집/저장` 흐름이다. 측정과 색 이름 변경은 표시 경로에 머문다.

개발 영어: **value**(값), **unknown**(미상), **viewport**(보이는 영역), **preserve**(보존). “Keep the original value.” / “The position is still unknown.” / “We fixed the scroll limit.”

확인 질문: `?`를 보여 주는 것과 원값을 `?`로 저장하는 것은 왜 다를까? 가능하면 영어 두 문장으로 설명해 보면 된다.
