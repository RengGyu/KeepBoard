TASK:
사용자 승인한 restoration-system-design-20261113 T1–T10의 전체 가로 작업면·정정·진행/보존·부분읽기·다른시점 UI를 기존 제품에 구현한다. T3/T4 UI를 먼저 연결하고 T7/T8/T9 UI와 T10 직접검사를 이어가며 카드별 재승인 없이 진행한다.

OUTCOME:
기존 기록을 열면 여러 필드/판/판 미검출 무리를 전체 가로 평면에서 읽을 수 있고, 원 실물 선택→기존 값 편집 또는 묶음 관계 수정→기존 저장/재개까지 이어진다. 별도 viewer/시제품/타입만으로 완료하지 않는다.

CAPABILITY / MODEL / EFFORT:
C3 / gpt-6.1-sol / high / Fast(service_tier=priority). 사용자 이번 명시 승인. 다른 모델이나 속도 tier로 임의 변경하지 않는다.

AUTHORITY:
A1 workspace 제품 구현·직접 필요한 로컬 검사. 다른 작업자가 함께 있으므로 타인 변경을 되돌리지 말고 조정한다. Sol2는 shared/sceneLayout.ts 외 shared/프로필/server를 소유한다. root는 루트 기준문서·최종 실제 브라우저/통합검사를 소유한다.

CONTEXT:
WORKER_RUNTIME_RULES.md: /Users/jeonggyuju/.codex/policies/WORKER_RUNTIME_RULES.md
PROJECT_CONTEXT.md, docs/restoration-system-design-20261113/{README.md,implementation-plan.md,contracts.md,technical-design.md,walkthroughs.md,validation-plan.md}의 담당 카드/참조와 현재 코드/diff. 설계 때의 구현금지/Normal 문구는 이번 사용자 구현/Fast 승인으로 대체됐다. backend 계약은 docs/restoration-system-implementation-20261113/contract.md에 도착한다.

ALLOWED SCOPE:
shared/sceneLayout.ts, src/RestorationSceneView.tsx 및 기존 GameEssentials/GameBoardRecord/EstimatedBoardView/PhotoLayoutBoard/SessionWorkspace/api/스타일/필요 progress·preservation·ROI·멀티뷰 연결과 직접 UI tests. 기존 body/art/native/editor를 재사용하며 전체 scene 구역관계와 읽는 크기를 유지한다. backend export를 임의 stub하지 말고 최소 의존을 root에 전달하며, 도착 전 독립 layout/body 분리부터 진행한다. Sol2가 제공한 profile/scene/command/registration을 그대로 소비하고 UI에서 게임별 지식을 중복 추론하지 않는다. 실제 source UI 이벤트로 tap/pan/jump/selection→관계정정→dispatch가 이어지고 예전 상세 편집도 유지되게 한다. root는 필요 최종 실제 브라우저와 서버/통합을 담당하므로 개발용 정적 viewer·실행된 앱과 구현 상태를 구분해서 인계한다. 결과/명령은 sol1/에 간결히 기록한다.

FORBIDDEN:
.keepboard/·키·운영 데이터 접근/출력, 원사진/응답/고정정답 변경, 원값/원bbox/owner/native/수동 덮기, 전체를 축소하거나 세로 판목록을 전체 scene으로 명명, 별도 값 편집기·별도 저장 앱·120종 축소, 무단 provider 호출/외부 사진전송, commit/push/deploy/Sites 변경, 추가 agent, shared 계약·server·profile 파일 직접 수정.

ACCEPTANCE:
T3/T4 실제 앱의 주 보기에서 공용/양편/여러 도시의 상대관계를 읽는 크기로 표시하고 같은 assertion/piece 선택을 기존 편집기로 보낸다. 묶음 판/역할/frame/split/merge/undo가 실제 backend command와 연결된다. T7은 원본확대/기존ROI action을 재사용하고 T8은 중복설문 없이 기존 진행/실물정리 흐름을 scene에 연결, T9는 별도사진/등록/정합범위·경쟁을 구분한다. native/구판/기존 상세/수동 예외 유지. 변경 관련 직접 UI tests/typecheck만 실행하고 root 전체 suite/build 반복0. 실제 Safari가 없으면 미확인으로 남기되 기능은 가능한 범위 끝낸다. 최종 files/명령/실제행동/남은외부의존·SHA를 인계하고 ownership 반환.

ESCALATE IF:
실제 backend 계약 부재/충돌, 새 제품결정·다른 소유 파일 변경·provider 실호출/실기기 접근이 꼭 필요한 경우 정확히 알리고 독립 작업은 계속한다. 일반 fixture/타입 오류는 소유범위 내 자율 해결한다.
