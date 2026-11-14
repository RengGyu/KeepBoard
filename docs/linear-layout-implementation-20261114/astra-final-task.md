TASK: 동결된 C1–C5 구현을 승인 설계·실제 diff·직접 회귀와 대조해 최종 기술 검토한다.
OUTCOME: material 결함/누락·회귀를 파일/함수/재현조건/최소수정으로 보고하거나, 확인한 경계와 남은 한계를 구분한 최종 검토서.
CAPABILITY / MODEL / EFFORT: C4 / gpt-6-astra / max, Normal(default). actual/effective/runtime 검증완료. 사용자 명시의뢰.
AUTHORITY: 제품·팩·기존자료 A0, task/astra-review 최종 문서·최소 무료 probe만 A1. 구현자는 소유권 반환. 타인 변경을 되돌리지 않는다.
CONTEXT: PROJECT_CONTEXT.md; docs/work-sessions.md; docs/linear-layout-diagnosis-20261114/{design.md,implementation-cards.md}; 본 task contract.md, sol1/{README.md,freeze.json}, sol2/{README.md,source-inventory.json}; 현재 git diff와 새 tests. 이전 계약 검토서는 재사용하되 실제 코드로 판정.
ALLOWED SCOPE: 승인 C1–C5의 위치/근거 우선순위·qualified 선택/단일 표시·관계와 부분순서·구조 fingerprint/수동 재연결·동일팩 profile/보존 경계 검토. root가 전체suite/build와 실제8 Chrome을 병행한다. 구현자 수치는 검토 근거이며 자동 수락 근거가 아니다. 재현이 필요한 material 경우만 bounded 실행한다.
FORBIDDEN: 제품/팩/기존실험/GT 수정, provider/키/운영 .keepboard 접근, 전체suite/build 중복, Git/배포, 추가agent, 읽기 부족을 임의 정답으로 보완. 범위 밖 새 renderer/전120 확장 검토로 확대금지.
ACCEPTANCE: final-review.md에 직접 확인/보고/미확인 구분과 기준 source SHA를 기록. 실제 지원되는 입력의 최종 component 소비, 기존정정/판본/scope보존, 원자료 부족의 유보를 구분. 합성검사를 실사진 정확도로 보고하지 않는다. 의미 있는 결함만 감독에게 먼저 간결히 통지하고 문서 마감한다.
ESCALATE IF: 코드/자료 부족으로 수용 판정 불가하면 정확 경계만 제시. routine style/추가목표를 차단조건으로 만들지 않는다.
