TASK: 수락된 C1–C6 구현의 설계 경계와 최종 실제 diff를 검토한다.
OUTCOME: 표시 fallback이 정식 위치/역할로 오인되지 않는 계약, profile/관계/캐시 경계의 최소 수용조건과 최종 누락·회귀를 독립 근거로 제시한다.
CAPABILITY / MODEL / EFFORT: C4 / gpt-6-astra / max, Normal; 연구 프로필. 사용자 명시 의뢰. 실제 runtime 검증 후 시작.
AUTHORITY: 제품/기존자료 읽기전용 A0, 본 task/astra-review 문서만 A1. 다른 작업자는 제품 구현중이며 파일을 바꾸지 않는다.
CONTEXT: PROJECT_CONTEXT.md; docs/work-sessions.md; docs/linear-layout-diagnosis-20261114/{design.md,implementation-cards.md}; task/{sol1-task.md,sol2-task.md,contract.md(도착시)} 및 현재 diff. 원인 전체 재연구는 필요없다.
ALLOWED SCOPE: 지금은 C1–C5 경계에서 구현자 간 필요한 계약·설계 누락만 bounded 검토하고 task/astra-review/contract-review.md로 인계. 실제 동결 diff는 감독이 후속 전달하면 최종 read-only review. 유료호출 없는 소규모 반례 허용.
FORBIDDEN: 제품/팩/기존연구/GT 수정, source 가정으로 정답 만들기, 전체suite/build, provider/운영/.keepboard/키, Git/배포, 추가agent. 감독의 기대결론을 복제하지 않는다.
ACCEPTANCE: 실제 코드와 승인 설계에 근거한 material boundary만 파일/함수/실패조건/최소수정 제안으로 보고. 지금은 계약검토 완료후 종료하고, 최종소스 도착후 재개한다. 테스트통과와 실사진정확도 구분.
ESCALATE IF: 승인 설계의 모순 또는 자료부족을 발견하면 범위·판정불가를 명시한다.
