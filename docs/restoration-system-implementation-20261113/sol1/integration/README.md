# 최종 UI 통합 후속 — 재동결

**VERIFIED**: 소스1·직접 UI 검사2파일만 변경했다. [자기 delta](delta.patch), [전후 SHA/명령](freeze.json). 이전 sol1/freeze.json은 최초 동결 근거로 보존하며, 이 후속3파일의 현재 SHA는 integration/freeze.json이 우선한다.

- 미배정 accepted 관측: 제품 결함이 아닌 옛 테스트 탐색 경로였다. 패널 안 GenericComponents 직접 탐색을 현재의 실제 `빈 market 선택 → 새 accepted 응답 → 실물 상세 보기 클릭 → 기존 SplendorFields의 원 piece 선택 → 사람·영역 연결 열기`로 교정했다. 수량1/설명문단0/원실물 ID/onSelect·onChange/연결 source ID/쓰기0 단언을 유지하고 빈 필드 선택·실제 상세 선택·원값 불변을 추가 확인했다. GameEssentials의 제품 경로는 수정하지 않았다.
- 순서 설명: 실물마다 반복하던 ‘순서 묶음/묶음 안 미확정’을 제거하고 그룹의 접힌 `순서 근거`에 기존 orderLevels/orderUnresolved/physicalOrder를 표시한다. 원 실물과 정렬 순서는 유지한다. 반복 설명이 각 실물 DOM에 없고 근거는 접힌 그룹에 남는지 확인했다.
- spatial board 제목: bindings 없는 관측판은 원 실물 이름을 억지로 찾지 않고 의미 있는 region.label을 사용한다. ‘종류 ?’로 제목이 사라지던 라운드 트랙 경계를 직접 확인했다. 실제 binding이 있는 판의 기존 이름 표시는 유지한다.

검사: `node --import tsx --test tests/game-recognition-ui.test.ts tests/restoration-scene-ui.test.ts tests/restoration-scene-layout.test.ts` **15/15 PASS** ([로그](focused-tests.log)). 담당 범위 tsc **exit0** ([로그](typecheck.log)), diff whitespace 검사 exit0. 원값/owner/정식 칸/물리 순서·shared/server 변경0, provider/전체suite/build/commit/deploy0.

실제 Chrome 밀도·최종 전체 검사는 감독 소유다. 이 후속의 직접 확인은 실제 컴포넌트 이벤트/DOM 트리 회귀이며 실기기 캡처 완료로 주장하지 않는다. 소스를 재동결하고 소유권을 반환한다.

추가 LC 라벨/같은 판 A·B subregion 제목 후속은 [lc-labels/README.md](lc-labels/README.md)에서 별도 재동결했다. 그 두 파일의 최신 SHA는 lc-labels/freeze.json이며 관련 검사16/16·범위tsc0이다.

초기 빈 원점·집중 재진입 후속은 [initial-viewport/README.md](initial-viewport/README.md)에 별도 재동결했다. 해당 두 파일 최신 SHA는 initial-viewport/freeze.json이며 직접 검사12/12·범위tsc0이다.
