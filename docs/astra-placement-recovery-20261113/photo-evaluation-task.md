TASK:
현재 자동 위치 복원을 원사진 기준으로 독립 대조한다. 다른 Astra가 설계/제품 구현 중이며 당신은 사진 근거·자동 배치 대조만 소유한다.

OUTCOME:
원사진에서 판정 가능한 사그라다 칸·로스트 시티 판/편/원정·버림·줄·세븐 원더스 판 소속을 확인하고, 현재 제품의 맞는 연결/오소속/미연결/유보를 분리한다. 이후 제공될 구현 후 결과도 같은 판정에 비교 가능하게 만든다. 모든 사진 속 실물 전수 정답을 새로 만드는 프로젝트로 확대하지 않는다.

CAPABILITY / MODEL / EFFORT:
사용자 명시 지정 gpt-6-astra/max, Normal/default. 새 세션. 다른 모델/Fast 임의 전환 금지.

AUTHORITY:
제품·기존 사진·원응답·기존 사진 원장 읽기 전용. docs/astra-placement-recovery-20261113/photo-evaluation/만 작성할 수 있다. 원본 픽셀 확인용 crop/diagnostic 이미지는 이 폴더나 별도 /tmp 아래만. 혼자 작업하지 않는다. 제품 구현과 타인 변경을 건드리지 않는다.

CONTEXT:
/Users/jeonggyuju/.codex/policies/WORKER_RUNTIME_RULES.md, PROJECT_CONTEXT.md를 읽는다. 기준 HEAD d1ab64635e6d240fdf9fa4154dcfe08562541a95. 현재9사례 경로는 docs/pro-review-20261113/data/cases, 원사진/팩은 같은 패킷의 manifest와 README를 따른다. docs/pro-implementation-20261113/supervisor/current-structures/ 및 replay-result.json은 현재 제품 파생 결과다. 실제 원사진을 열고 사진 판정과 응답 연결 평가를 구별한다. 기존 docs/pro-implementation-20261113/photo-audit/{README.md,ground-truth.json,placement-audit.csv,crop-manifest.json}에는 Sol 시각 판정과 유보가 있다. 이를 정답으로 무조건 복제하지 말고 원사진으로 핵심 판정/경계를 확인하며, 판단이 다르면 근거와 별도 정정을 남긴다. 기존 문서에 쓰인 연결 수는 정확도 인증이 아니다. 30초는 선행 기준이 아니다.

ALLOWED SCOPE:
사그라다 전경 격자/판 범위, LC baseline의 실제 판 후보·원정/버림 관계 및 다른 강도 응답의 좌표/누락 한계, 7W 판 소속을 사진으로 판정한다. 이미 있는 crop·원장·출처를 재사용한다. 사진의 가림/미관측 판과 응답의 틀린/빠진 bbox는 별도 표시한다. 기존9사례 중 사진 대응이 유효한 범위만 비교하고 유보를 억지 채점하지 않는다. 보고에는 사진 SHA·실물/관측 ID·판정/유보·근거를 연결한다. 수정 전 기준 판단과 비교방법을 먼저 고정해 감독에게 알린 뒤, 후속 구현 결과를 받으면 동일 기준으로 재대조할 준비를 한다.

FORBIDDEN:
제품/테스트/기존 자료 변경, .keepboard/·키·운영 데이터, 새 provider 판독/사진 외부 전송, commit/push/deploy·Sites 수정, 원값/geometry/누락판 자동 채우기, 연결 수를 정확도로 표현, 답/색/숫자 일치를 강제 대응 조건으로 쓰기, 수동 정정을 자동 결과로 평가. 사용자/감독의 선호 설계를 먼저 받아 그 설계에 맞춰 사진 판정을 바꾸지 않는다.

ACCEPTANCE:
실제 이미지 열기 증거와 간단한 재현 가능한 판단 원장·요약을 제공한다. 원사진에서 확정할 수 없는 범위는 유보한다. 제품의 자동 배치와 사람이 정정한 결과를 섞지 않는다. 새로운 전체 감사 체계나 중복 테스트 없이 해당 제품 문제를 판정할 최소 자료를 만든다.

ESCALATE IF:
사진·현재 파생 파일이 없거나 손상됐을 때, 출처를 동일 실물에 대응할 수 없을 때. 그 범위만 유보하고 다른 독립 범위는 계속한다.
