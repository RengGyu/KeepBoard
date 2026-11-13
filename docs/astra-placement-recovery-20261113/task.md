# 자동 위치 복원 — Astra max 작업 카드

TASK:
현재 자동 위치 복원의 원인을 원사진·현재 코드에서 찾고, 설계를 작성한 뒤 실제 제품 수정·필요 검증까지 완료한다. 수동 정정 성공을 자동 복원 개선으로 대체하지 않는다.

OUTCOME:
사그라다·로스트 시티·세븐 원더스의 기존 응답에서 원사진에 맞는 구조·판 소속을 더 많이 자동 복원한다. 올바른 연결과 오소속·미연결·사진 유보를 함께 보고한다. 기존 게임팩·평면 renderer·아트·저장/재개 흐름을 재사용한다. 설계만 제출하고 종료하지 않는다.

CAPABILITY / MODEL / EFFORT:
C4 원인/설계 + 제품 구현. 사용자 명시 요청으로 새 gpt-6-astra/max 세션, Normal/default. 이번 카드에 한해 AGENTS의 Sol/high 기본보다 최신 사용자 요청을 우선한다. Fast/다른 모델로 임의 변경하지 않는다. 필요시 독립 하위 작업을 제안하되 감독과 파일 소유권을 먼저 나눈다.

AUTHORITY:
A1 workspace 내부 가역 코드/문서/직접 테스트 수정. 제품 구현 소유: shared/estimatedBoardStructure.ts, shared/estimatedGeometry.ts, shared/structureRelations.ts 및 꼭 필요한 기존 투영/표시/저장 연결과 직접 테스트. 새 helper는 필요할 때만. docs/astra-placement-recovery-20261113/의 연구·설계·구현·근거 소유. 감독은 PROJECT_CONTEXT.md, docs/work-sessions.md, 최종 통합·GitHub/게시 여부를 소유한다. 당신은 혼자 작업하지 않는다. 타인 변경을 되돌리지 말고 조정한다.

CONTEXT:
먼저 /Users/jeonggyuju/.codex/policies/WORKER_RUNTIME_RULES.md, PROJECT_CONTEXT.md, docs/pro-implementation-20261113/README.md를 읽는다. 현재 HEAD d1ab64635e6d240fdf9fa4154dcfe08562541a95, 제품 커밋 a73acc2187f70e7a113321ca37002fa662868607. 작업 대상은 자동 배치이며 30초는 선행 목표가 아니다. 추정 배치는 허용되지만 사실/사람 소유/정식 칸과 분리한다.
관련 진입점:
- docs/pro-implementation-20261113/photo-audit/README.md, ground-truth.json, placement-audit.csv, crop-manifest.json: 실제 원사진 및 기존 Sol 시각 판정. 사람 인증은 아니므로 사진을 직접 열어 확인한다. 독립 재판정은 별도 파일로 남기고 원장을 덮지 않는다.
- docs/pro-review-20261113/: 원본 3사진·9응답·정확한 팩·구조 동결 입력. 기존 구조는 과거 결과이며 정답이 아니다.
- docs/pro-implementation-20261113/supervisor/{replay-current.mts,compare-current-anchors.py,current-photo-anchors.json,replay-result.json}: 현재 계산/실제 renderer 재생·전후 비교. 수동 correction 결과는 자동 count에 더하지 않는다.
- docs/pro-implementation-20261113/contract.md: 검증된 출처·qualified ref·override·관계·표시 구분.
- docs/pro-review-return-20261113/original/KeepBoard_Review_d7e6d09/{design.md,implementation-plan.md}: 채택한 Pro 설계의 근거. 무조건 patch 재적용하지 말고 현재 코드/실제 diff로 이미 구현된 것을 확인한다.

ALLOWED SCOPE:
1. 현재 입력→출처 확인→판 후보/역할/관계→구조→기존 renderer 흐름에서 자동 연결을 막거나 오배치시키는 원인을 좁혀 재현한다.
2. 코드·사진에서 얻은 근거로 기존 접근의 대안과 불확실성 처리를 설계하고 곧 구현한다. 설계 요약/수정 범위/계약/검증 방법을 먼저 파일로 기록하고 감독에게 알린 뒤, 별도 사용자 승인 대기 없이 구현을 계속한다.
3. 사진의 위치 관계와 관측된 구조를 일반화된 계산으로 복원한다. 확정할 수 없는 링크는 후보·표시 추정·미연결을 구별하며 근거를 남긴다. 누락 관측을 가짜로 채우지 않는다. 판 관측이 부족하면 현실적으로 가능한 표시 구조와 진짜 판 참조를 구분한다.
4. 기존 원값/ID/owner/원bbox/receipt/정식 칸/수동 정정 및 저장·재개를 보존한다. helper의 count만 올리고 실제 UI가 안 바뀌는 구현은 피한다.
5. 직접 회귀와 기존 9사례 무료 재생, 실제 React renderer 연결·입력 불변을 확인한다. 정확한 명령·결과·파일·한계를 간단히 남긴다.

FORBIDDEN:
.keepboard/·키·운영 데이터 접근/출력, 새 유료 provider 판독, 외부 사진 전송, 원사진/응답/기존 사진 정답 원장 변경, fixture 답/ID/특정 좌표 암기, 맞는 수치만 선별 보고, 모든 nearest-center 강제 귀속, 값·재고로 숨은 위치 정답 만들기, 출처 검증 제거, 120종 확장·새 renderer/저장 시스템·자동 분할·속도/모델 기본값 작업, 관계 복원을 사용자의 모든 카드 수동 입력으로 대체, 무관 리팩터/검사 확대. commit/push/deploy·외부 메시지·Sites 수정은 감독에게 넘긴다.

ACCEPTANCE:
- 원인→설계→실제 수정 흐름과 현재 코드 기준 재사용 지점을 명시한다.
- 수정 전후 같은 사진/응답에서 게임/영역별 자동 연결·원사진 일치·오소속·미연결·유보를 구분해 비교한다. 명확한 사진 근거가 없으면 정확도로 발표하지 않는다. 손실이 남으면 숨기지 않는다.
- 문제 재현과 일반적인 회전/이동/중복후보·가림 경계 회귀가 필요한 범위에서 통과한다. 사진별 정답 fixture만 맞추는 구현을 하지 않는다.
- 실제 제품 renderer로 3종을 보여주고 모든 기존 실물 ID·읽힌 값 및 정정/저장·재개 보존을 확인한다. 수동 보정 전 자동 화면을 근거로 한다.
- 집중 검사/타입을 실행하고 최종 변경 파일·명령·근거·남은 한계를 인계한다. 전체 suite/build·실제 브라우저는 감독이 최종 1회 수행한다.

ESCALATE IF:
원사진/정의 입력이 없거나 해석을 확정할 근거가 없을 때, 새 유료 판독/운영 수정이 꼭 필요할 때, 기존 사용자 의미를 바꾸거나 공통 계약을 크게 깨야 할 때. routine 구현 선택/가역 수정은 직접 해결한다. 원인/설계의 주요 발견은 짧게 중간 전달한다.
