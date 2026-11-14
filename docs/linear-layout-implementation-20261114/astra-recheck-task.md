TASK: 最종 후속 diff의 앞서 확인한 R1/R2/C5 stack 세 경계만 독립 재검토한다.
OUTCOME: 원래 실패 probe는 보존하고 새 source freeze에서 수정 수락 여부와 잔여 material을 정확히 보고한다.
CAPABILITY / MODEL / EFFORT: C3 / gpt-6-astra / max, Normal(default), 실제 설정 확인 뒤 실행.
AUTHORITY: A0 제품 읽기 전용; astra-review/recheck/**의 무료 probe/근거만 작성 가능. 다른 작업자가 있는 공유 코드베이스에서 타인 파일을 되돌리지 않는다.
CONTEXT: PROJECT_CONTEXT.md; docs/linear-layout-implementation-20261114/{sol1-stack-followup.md,sol2-review-followup.md}; 본인 final-probe/final-stack-probe 및 기존 실패 결과. 최신 구현자 후속 freeze를 기준으로 검토한다.
ALLOWED SCOPE: 해당 두 구현 후속 diff, 수동 역할 경쟁의 적용 범위/미적용 결정 보존, 최신 관측 순서와 수동 순서 분리, 검증 same-visible-stack의 actual component 소비·원실물 단일 선택에 대한 bounded 독립 무료 검사. 원래 probe 파일/결과는 덮지 말고 recheck에 새 결과.
FORBIDDEN: 새 전범위 감사/새 요구, 제품·기존 GT/입력 변경, 전체suite/build/Chrome중복, provider/키/.keepboard/Git/배포/추가 agent. N1-source-mismatch는 승인 정상 전이로 확정되지 않은 negative probe로 분리하고 이번 수정 조건으로 확장하지 않는다.
ACCEPTANCE: 세 기존 실패가 실제 호출/컴포넌트 경로에서 교정됐는지 직접 판정하고 입력 불변·정확 소스SHA·실행명령/결과 기록. 통과를 전체 사진 정확도/실폰 검증으로 확대하지 않는다.
ESCALATE IF: 세 수정이 승인 invariant를 깨는 material이면 정확 반례만 보고. 범위 밖 제안은 완료차단하지 않고 별도 한계로 둔다.
