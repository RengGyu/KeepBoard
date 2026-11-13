TASK: 기존 복원 화면 가독성·세로 빈 패널 교정. 한국어로 작업·보고.
OUTCOME: 기존 아트/현재 값만으로 읽을 수 있는 카드·토큰 면, 한글 표시, 접힌 기술 설명, 기본/집중 보기의 실제 내용 노출. 같은 3종 기하 규칙은 동결한다.
CAPABILITY / MODEL / EFFORT: C2, 기존 구현솔 gpt-6.1-sol/high, 사용자 승인 Fast(service_tier=priority). 실제 설정 검증 후 전달.
AUTHORITY: A1. src/ 및 shared/sceneLayout.ts(표시 배치만), 직접 UI/layout tests, 이 작업 폴더 sol1/** 소유. 타 작업자가 함께 있으므로 타인의 변경을 되돌리지 말고 조정한다.
CONTEXT: PROJECT_CONTEXT.md, docs/work-sessions.md, docs/restoration-system-implementation-20261113/README.md와 contract.md. 현재 HEAD64fc8ab. 기존 GenericPieceArt/pieceFaceValues/pieceReadoutArt/GameComponentArt/realBoards/RestorationSceneView와 sceneLayout을 먼저 재사용 조사한다. 이번 사용자 요청은 무료 5종 확인과 그림 면·표시·세로 공백 개선이며 새로운 기하 추정법이 아니다.
ALLOWED SCOPE: 카드·주사위·타일의 기존 아트/심벌과 읽힌 색·숫자·면 메타데이터를 재사용해 compact 표시. blue/silver 같은 알려진 값은 표시만 한글로(원 readout/ID/형식 불변), 관련 없는 ‘없음’ 등 보조 값은 기존 상세 편집에 보존. 미상은 정직한 ?를 유지하며 읽히지 않은 제목/무늬를 생성하지 않는다. 사용자 의미가 있는 카드/묶음 이름은 남기고 ‘순서 근거·1묶음’ 등 기술 설명은 접힌 상세에 모은다. 세로·가로 첫 진입/jump/집중 보기에서 큰 빈 높이/빈 패널을 좁게 해결하되 구역 관계/실제판·미확정 구분과 모든 실물 선택 유지. Sol2는 read-only 5게임 fixture/harness를 준비한다. 제품 backend/shared projection은 읽기 전용.
FORBIDDEN: shared/estimatedBoardStructure.ts, estimatedGeometry/structureRelations, profile 데이터/판독문구/기본모델 변경, 새 gameId 분기/렌더러/자산 생성, 유료 호출·키/운영 .keepboard 읽기, 저장 성능 작업, Site/commit/push/deploy, 전체 suite/build, 추가 agent. 새 게임 좌표나 값을 보충하지 않는다.
ACCEPTANCE: 실제 그림 면에 색/숫자가 보임·원값 보존, 영문색→한글 표시 및 상세정보 보존, 기술 문구 접힘, 세로 빈 viewport 재현→교정, focus/pan/jump/정확 원ID 선택의 직접 회귀. 변경 관련 tests·범위 타입 확인, 정확 delta/SHA로 동결하고 감독 실제 Chrome에 인계. 테스트를 구현 복사로 부풀리지 않는다. 사용자 설명/추가 대규모 검증이 필요한 새 범위를 만들지 않는다.
ESCALATE IF: 원관측/위치/추정 관계 변경이 필요하거나 기존자산만으로 요청한 면을 표현할 수 없을 때 정확 경계를 전달. 새사진·실폰은 미검증으로 남긴다.
