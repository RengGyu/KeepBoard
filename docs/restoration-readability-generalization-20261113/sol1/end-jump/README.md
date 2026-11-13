# 끝 구역 jump 스크롤 한도 후속

**VERIFIED — 관련15/15, 범위 타입 exit0, 소스 재동결.**

기존 canvas는 마지막 패널의 끝까지만 높이가 있어, viewport보다 짧은 마지막 패널의 위쪽으로 jump하면 브라우저 최대 scroll에 clamp됐다. 패널/관계/자연높이는 그대로 두고, 현재 viewport 크기를 관측해 각 패널 시작점+viewport 크기까지 표시 canvas만 확장한다. 넘치는 끝 여백은 실제 판이나 관측 공간이 아니다. focus DOM 교체 때는 새 viewport 측정이 반영된 뒤 기존 위치를 복원해 중간 clamp 위치를 저장하지 않는다. 이미 사용자가 옮긴 viewport는 측정/재렌더 때 강제로 초기화하지 않는다.

직접 회귀는 390px viewport, 마지막 패널 y845/실내용390, 집중 viewport660에서 브라우저식 최대 scroll clamp를 구현해 기본/집중 jump와 focus 재진입이 패널 위쪽으로 정렬되는 것을 검사한다. 이 fixture의 panel 좌표/높이는 변경 전후 같고, pan·처음 위치·정확 tool ID 선택·scene/raw 불변도 검사한다. 기존 자연높이/부분순서/focus/편집 연결 회귀를 함께 유지했다. 실제 Chrome 재검수는 감독 담당이다.

```
node --import tsx --test tests/restoration-scene-ui.test.ts tests/restoration-scene-layout.test.ts
./node_modules/.bin/tsc --noEmit -p docs/restoration-readability-generalization-20261113/sol1/tsconfig.json
```
[집중 로그](focused-tests.log) · [범위 타입](typecheck.log) · [delta](delta.patch) · [정확 SHA](freeze.json)

소유 변경은 `src/RestorationSceneView.tsx`와 직접 UI test 1파일뿐이다. 시작 preimage는 감독의 ‘사진 기준 배열 · 판 위치 확인 필요’/select ‘위치 확인 필요’ 문구를 포함하며 그대로 보존했다. `tests/visible-piece-face.test.ts`의 감독 whitespace 교정도 수정하지 않았다. shared 기하/profile/backend 변경0, 유료호출/전체suite/build0. 이전 freeze/원자료는 보존한다.
