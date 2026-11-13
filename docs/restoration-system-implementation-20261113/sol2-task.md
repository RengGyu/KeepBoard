TASK:
사용자 승인한 restoration-system-design-20261113 T1–T10의 shared/backend 구현을 의존 순서대로 끝낸다. 첫 묶음 T1/T2/T4a/T4b 다음 T5/T6/T8/T9의 backend를 이어가며 카드별 재승인 없이 진행한다.

OUTCOME:
기존 관측과 자산에서 전체 장면을 생성하고, 실제판/표시구역·값/관계/표시를 구분한다. 여러 필드 묶음 정정의 원자성·idempotency·저장/재열기/재개, 실행 profile·선택 구조 관측·진행/보존·다른시점 등록을 실제 기존 제품 경로에 연결한다. 타입/계약·시제품만으로 완료하지 않는다.

CAPABILITY / MODEL / EFFORT:
C3 / gpt-6.1-sol / high / Fast(service_tier=priority). 사용자 이번 명시 승인. 다른 모델이나 속도 tier로 임의 변경하지 않는다.

AUTHORITY:
A1 workspace 제품 구현·직접 필요한 로컬 검사. 다른 작업자가 함께 있으므로 타인 변경을 되돌리지 말고 조정한다. Sol1은 src/UI 및 shared/sceneLayout.ts를 소유한다. root는 루트 기준문서·최종 브라우저/통합검사를 소유한다.

CONTEXT:
WORKER_RUNTIME_RULES.md: /Users/jeonggyuju/.codex/policies/WORKER_RUNTIME_RULES.md
PROJECT_CONTEXT.md, docs/restoration-system-design-20261113/{README.md,implementation-plan.md,contracts.md,technical-design.md,walkthroughs.md,validation-plan.md}의 담당 카드와 참조, 현재 코드/diff. 설계 때의 구현금지/Normal 문구는 이번 사용자 구현/Fast 승인으로 대체됐다. 관측/정답 원장은 읽기 전용 회귀 근거다.

ALLOWED SCOPE:
shared/restorationScene.ts, restorationProfile.ts, sceneProjection.ts 및 해당 기존 drawing/structure adapter, shared/types/privacy/lightweightRecognition; profile source/생성기/catalog exact 연결; server의 scene transaction/persistence/reader/actions/registration 및 관련 직접 tests. 기존 단건/배치 API·scope·native·구판을 재사용한다. UI가 소비할 최소 계약은 docs/restoration-system-implementation-20261113/contract.md에 먼저 기록하고 실제 export를 빠르게 제공한다. shared/sceneLayout.ts와 src는 Sol1 소유이며 직접 수정하지 않는다. T1–T4 계약 도착/완료, 후속 T5–T9 계약 변화를 root에 알리되 일반 구현은 계속한다. 결과와 명령은 sol2/에 간결히 기록한다. 공급자 호출 없이 기존 응답/합성자료로 검증 가능한 구현을 끝낸다. 다른 시점 정합은 범위가 제한된 등록 근거와 유일/경쟁 identity를 실제 코드로 처리하되 자료 부족의 실사진 성능은 구분한다.

FORBIDDEN:
.keepboard/·키·운영 데이터 접근/출력, 원사진/기존 응답/고정 정답 수정, 원값/원bbox/owner/native/수동 덮기, 판 없는 구역을 실제판으로 승격, 거리만으로 강제소속, 전체 축소, 지원120종 축소, 무단 provider 호출/외부 사진전송, commit/push/deploy, 추가 agent, 모델/강도 기본값 변경. 별도 저장 앱·새 값 편집기·전120규칙 재조사를 만들지 않는다.

ACCEPTANCE:
담당 T1–T9의 제품 export와 HTTP 경로가 실제 동작한다. 기존9응답의 ID/값/출처/native/수동 보존; 정확한120 profile/구판 fallback; cross-field group 수정→commit/reopen/resume와 재전달/stale/undo 검증. 유효 literal은 optional structure 실패에도 유지. 진행/보존은 기존 필드와 중복하지 않고 같은 묶음에 연결. 다른 시점은 등록/동일성/상태가 분리되며 근거 없는 합산0. 변경 관련 tests/typecheck를 실행하되 root의 전체 suite/build를 반복하지 않는다. 새 사진 정확도·실기기 성능을 합성검사로 완료 선언하지 않는다. 최종 changed files/검증 명령/남은 외부자료 의존·SHA만 인계하고 source ownership 반환.

ESCALATE IF:
설계 모순, 실제 소비 경계로 인해 다른 소유 파일 변경 필요, 새 provider 호출이나 외부 자료가 필요할 때 정확한 blocker를 알린다. 해당 항목 외 구현은 계속하며 테스트 fixture 오류 등 일반 문제는 자율 해결한다.
