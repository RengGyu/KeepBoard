# 초기 빈 작업면 교정 — 재동결

**VERIFIED:** `RestorationSceneView`와 직접 UI 검사만 변경했다. 기존 layout 좌표/상대관계/읽는 크기/원 ID를 바꾸지 않는다.

- 기본 및 집중 첫 진입은 layout의 첫 실제 패널 위치에 맞춘다. 아직 사용자 이동이 없으면 최초 패널 측정이 완료될 때도 그 패널을 계속 보여 준다.
- ‘처음 위치’는 빈 canvas (0,0)가 아니라 같은 실제 패널로 이동한다.
- wheel/touch·mouse pan/키 이동/명시 jump 이후에는 측정·semantic rerender로 강제 초기화하지 않는다. 집중 Modal 재마운트/닫기에서도 마지막 pan을 복원한다.
- 위치 기억은 UI ref에만 있다. 원사진/scene/값/저장 데이터에는 쓰지 않는다. 기존 실물 선택은 원 assertion/piece ID로 이어진다.

직접 회귀: 원점에 패널이 없는 일반 fixture(첫 패널 top>1000), 기본·집중 진입, 처음 위치, 명시 jump, pan, 측정/semantic 갱신, 집중 재진입, 원 ID 선택·원자료 불변을 확인했다. 실제 React의 ref→effect commit 순서를 해당 UI fixture에서 재현했다.

`node --import tsx --test tests/restoration-scene-ui.test.ts tests/restoration-scene-layout.test.ts`: **12/12 PASS** ([tests.log](tests.log)). 범위 tsc **exit0** ([typecheck.log](typecheck.log)). 정확 명령/현재 SHA는 [freeze.json](freeze.json), 자기 delta는 [delta.patch](delta.patch).

새 provider/전체suite/build/git/Site/추가 agent 0. shared/backend/root 기준문서 변경0. 실제 Chrome 재확인은 감독 소유이며 이 직접 회귀를 브라우저 캡처 완료로 표현하지 않는다. 이 두 파일의 현재 SHA는 앞선 lc-labels/integration/최초 freeze보다 우선한다. 소스를 재동결하고 소유권을 반환한다.
