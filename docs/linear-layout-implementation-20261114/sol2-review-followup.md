TASK: Astra 최종 검토에서 재현한 C3 수동 결정 재연결 두 결함을 수정한다.
OUTCOME: 자동 merge에 경쟁하는 수동 역할을 순서대로 덮어쓰지 않고 보존/미적용 이유로 남기며, source 갱신 시 이전 관측 순서가 수동 split에서 살아나 가짜 cycle을 만들지 않는다.
CAPABILITY / MODEL / EFFORT: C3 / gpt-6.1-sol / high, Normal. 동일 세션 실제설정 재확인.
AUTHORITY: A1 shared/sceneProjection.ts와 sceneStructure.ts 필요한 좁은 경계 및 직접 회귀/격리 HTTP. src/sceneDisplay/원자료는 읽기전용. 다른 작업자 변경을 되돌리지 않는다.
CONTEXT: PROJECT_CONTEXT.md; 본 task contract.md; astra-review/final-probe.mts 및 final-probe-results.json; 본인 동결 inventory/현재 diff. 전체 대화 대신 이 카드의 독립 반례만 사용.
ALLOWED SCOPE: 수동 claim의 재연결 합의/경쟁/미적용 보존 및 derived physicalOrder 재생성, 직접 tests와 sol2/review-followup 근거. 실제 수동 순서가 있으면 보존하고 새 관측·옛 관측·수동을 구분한다.
FORBIDDEN: 원값/ID/owner/raw/bbox/canonical 변경, 모호한 claim 자동선택, 판독/운영/.keepboard/키, 기본값변경, Git/배포/추가agent, 전체suite/build 반복.
ACCEPTANCE: 두 무료 probe RED→GREEN 기대회귀 추가; 상반 수동 role의 전체그룹 오적용0/원결정 보존, 새 precedes가 이전 자동physicalOrder와 가짜cycle 만들지 않음. 관련 C3/shared/HTTP+타입만 검증해 정확delta/SHA와 불확실성 인계. 기존 source 자료는 그대로 두고 새근거별도.
ESCALATE IF: 원 결정의 적용 대상이 분리/병합으로 모호하면 원결정과 이유를 남기고 근거 없는 선택 금지. 일반 범위내 구현은 자율 해결.
