TASK: Pro 설계 P0 부착 표시 + P1/P2 기존 정정/관계 UI 통합
OUTCOME: 순환/다단계 부착도 모든 실물이 선택 가능하고, 판별 관계/부분순서/상대 트랙과 수동 정정이 기존 보드·저장·재개에 연결된다.
CAPABILITY / MODEL / EFFORT: C3 / gpt-6.1-sol / high / Normal. 변경할 필요 없는 현재 compact 아트를 보존한다.
AUTHORITY: A1 제품/직접 테스트 수정. 커밋·푸시·Site·새 유료 호출 없음.
CONTEXT: 먼저 PROJECT_CONTEXT.md, docs/pro-review-return-20261113/README.md, original/KeepBoard_Review_d7e6d09/{design.md,implementation-plan.md,patch/minimum.patch}를 읽는다. 기존 src/EstimatedBoardView.tsx, src/GameBoardRecord.tsx, src/GenericPieceArt.tsx, shared 구조 계약/수동 override를 재사용. /Users/jeonggyuju/.codex/policies/WORKER_RUNTIME_RULES.md 적용.
ALLOWED SCOPE: src/EstimatedBoardView.tsx, src/estimated-board.css, src/GameBoardRecord.tsx 및 필요한 기존 정정 진입 최소 UI 파일, shared/estimatedStructureSafety.ts(P0 두 helper만 단독 소유), UI 관련 직접 tests, docs/pro-implementation-20261113/sol1/**. 첫 단계로 Pro safety helper를 검토·작성해 Sol2가 resolveEstimatedReference를 소비하게 제공한다. 공유 타입은 Sol2의 contract.md를 소비한다. UI는 새로운 geometry 추론을 넣지 않는다. P1-05 수동관계/위치 우선순위 충돌도 함께 고친다. 부족한 판 외곽/방향은 기존 원사진/좌표 정정 흐름의 한 번 입력을 판 묶음에 공유한다. 인쇄 라운드와 표시용 밴드를 구분한다. 참조는 assertion+piece 또는 실제 observed-board로 qualified 처리하고 v1 저장 호환 유지. 다른 field 부착도 현재 실물을 숨기지 않는다.
FORBIDDEN: 다른 작업자의 소스를 되돌리기/소유 shared 구조 수정, 새 렌더러/규칙심판/120종 확장/자동분할/새 모델 호출/키 열람/.keepboard 접근/전체 suite·빌드 중복/추가 에이전트. 혼자 작업하는 것이 아니다. 계약 의존은 짧게 통지하고 독립 작업을 계속한다.
ACCEPTANCE: 실제 EstimatedBoardView 렌더의 self/cycle/chain/cross-field에서 실물 ID마다 한 번 노출·선택·원값 불변, 판별 묶음 정정과 slot/부분순서 표시, native 위치 수정 후 stale structureOverride 우선순위 제거, 저장 callback/구판 호환을 직접 테스트. 관련 tests와 범위 타입검사, 변경/근거/제약 간략 인계. 전체 검사/실화면은 감독 소유.
ESCALATE IF: 필요한 shared 계약 누락·검증된 source/owner 경계를 완화해야 하는 경우·원관측을 변경해야 하는 설계 충돌만 알린다. 일반 실패·정정 UI 선택은 범위 안에서 해결한다.
