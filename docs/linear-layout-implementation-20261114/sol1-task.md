TASK: C1/C5 위치 우선순위·공통 표시 연결을 구현한다.
OUTCOME: 전체 복원판이 기존 native/manual/canonical/typed-map을 우선 소비하고, 근거가 부족한 관측은 기존 사진 배열로 표시한다. 원 실물 단일 표시·qualified 선택·실제 panel 크기를 유지한다.
CAPABILITY / MODEL / EFFORT: C3 / gpt-6.1-sol / high, Normal(default). 감독의 실제 설정 확인 후 시작.
AUTHORITY: A1 제품 수정·관련 무료 검사. 같은 코드베이스에 다른 작업자가 있다. 타인 변경을 되돌리지 말고 조율한다.
CONTEXT: PROJECT_CONTEXT.md; docs/work-sessions.md; docs/linear-layout-diagnosis-20261114/{design.md,implementation-cards.md(C1/C5),evidence.md}; 현재 diff와 기존 GameBoardRecord/PhotoLayoutBoard/CarcassonneLayoutPreview/realBoards/drawingLayout 재사용.
ALLOWED SCOPE: src/RestorationSceneView.tsx, EstimatedBoardView.tsx, PhotoLayoutBoard.tsx, 필요한 기존 asset hook/스타일; 신규 shared/sceneDisplay.ts 및 display 전용 순수 helper; shared/sceneLayout.ts의 표시 결과 크기; 관련 UI/display tests; 본 task/sol1 문서. Sol2는 shared projection/presentation/types/profile/backend를 단독 소유한다. 해당 shared 파일 직접 수정 금지, 필요한 계약을 task/contract.md에 먼저 요청하고 UI 독립작업 계속. 새 resolver/반환 계약을 간결히 기록해 Sol2와 감독에게 전달한다.
FORBIDDEN: provider/키/.keepboard 접근, 기본 모드/강도 변경, 새 gameId bbox 휴리스틱·새 renderer/app, 원값/bbox/ID/owner/canonical 수정, 기존 연구/GT 수정, 전체suite/build 선행, Git/배포, 추가 agent. 모든 group 일괄 사진 fallback 금지.
ACCEPTANCE: 구현카드 C1/C5 조건 및 actual component 직접검사. 검증된 asset/variant 없으면 canonical 확정 대신 fallback, 로딩 뒤 display 갱신. typed map/valid stored position/지원3종/native 경로 보존. 혼합 adapter·attachment·같은 bareID의 다른 assertion 모두 누락/중복 없이 원 편집기 선택. panel 크기는 실제 adapter 결과. profile semantic 계약은 Sol2 제공값만 소비하며 정보부족은 미확정 유지. 좁은 테스트·타입·최종 파일 SHA와 남은 한계 인계. root가 8종 Chrome/전체통합을 수행한다.
ESCALATE IF: 기존 asset 계약으로 검증 불가하거나 공유 계약이 없으면 정확한 signature/반례만 통지, 독립 작업 계속. 일반 범위내 실패는 자율 해결.

소유 추가(감독): src/GameBoardRecord.tsx의 bodyOnly+readonly 경계에서 resolver가 검증한 DrawingItem[] optional 입력을 기존 board/realSurface로 표시하는 최소 연결. 일반 편집/native/원값은 유지하며 landscape/map 및 versioned manual frame 직접회귀를 포함한다.
