TASK: C5에서 검증된 same-visible-stack 관계를 표시기가 소비하지 않는 누락을 마감한다.
OUTCOME: 검증된 같은 visible stack 회원은 기존 표시 경로에서 같은 묶음으로 구분되고, 관계 없는 사진 줄과 의미가 구분된다. 모든 원실물은 한 번씩 선택 가능하다.
CAPABILITY / MODEL / EFFORT: C2 / gpt-6.1-sol / high, Normal(default). 실제 runtime/effective high 및 Normal 확인 완료.
AUTHORITY: A1. 같은 코드베이스에 Sol2가 shared 재조정 중이다. 다른 변경을 되돌리지 말고 조율한다.
CONTEXT: PROJECT_CONTEXT.md; docs/work-sessions.md; docs/linear-layout-diagnosis-20261114/implementation-cards.md C5; docs/linear-layout-implementation-20261114/astra-review/{final-stack-probe.mts,final-stack-results.json}. 이 probe는 지원 관계를 소비해야 한다는 회귀 경계이며 실사진 정답표가 아니다.
ALLOWED SCOPE: 기존 Sol1 소유 shared/sceneDisplay.ts, src/RestorationSceneView.tsx, 기존 PhotoLayoutBoard/표시 스타일의 좁은 연결 및 직접 tests, sol1/stack-followup 인계. Sol2 shared sceneProjection/sceneStructure/types/profile은 읽기만. 필요한 새 계약은 요청하되 기존 scene.relations를 우선 소비한다.
FORBIDDEN: 새 renderer/앱, 사진 기반 임의 stack 추론, 원값/bbox/ID/owner/canonical 수정, 숨은 장수 추정, provider/키/.keepboard/Git/배포/전체 suite/build/추가 agent.
ACCEPTANCE: 실제 decoded stack+pile-collection 입력→resolver→actual component에서 관계 제거 시와 구분되는 표시, 각 physical item exactly once·qualified 선택; singleton과 별도 pile 구분, chain/부분관계/충돌 또는 foreign/deleted 경계 유보, 입력 불변. 기존 actual native/manual/photo/partial order 경로 유지. 직접 관련 tests와 좁은 tsc만 실행, 정확 delta/SHA 인계. npx tsx 대신 node --import tsx 사용.
ESCALATE IF: 지원 관계의 의미가 기존 계약과 충돌하면 실제 반례/필요 signature만 전달. 일반 구현 판단은 자율 진행.
