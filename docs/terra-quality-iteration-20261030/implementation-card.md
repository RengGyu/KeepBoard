# 구현솔 인계 카드 — 첫 일반 개선 slice

**TASK:** 이미 읽은 관측의 결합 손실과 중복 편집물을 줄인다. 처음부터 없는 관측이나 숨은 수량을 복원한 것으로 간주하지 않는다.

**OUTCOME:** 동결 전후 오프라인 재생, 소스 diff/hash, 집중 회귀, 실제 격리 HTTP 저장재개 결과. Astra가 독립 평가한 뒤 필요한 최소 수정만 반복한다.

**CAPABILITY / MODEL / EFFORT:** 기존 구현솔 `gpt-6.1-sol/high`. `/Users/jeonggyuju/.codex/policies/WORKER_RUNTIME_RULES.md` 준수. 다른 작업자의 변경을 되돌리지 않는다.

**AUTHORITY / OWNERSHIP:** 감독이 승인한 구현솔 단독 제품 소유권. 주 파일 `server/observationFusion.ts`; 필요할 때만 `shared/scanObservation.ts`, `shared/lightweightRecognition.ts`, `server/scanObservation.ts`, Terra decoder, `src/ScanObservationResults.tsx`와 직접 테스트. Sol2의 `GameBoardRecord`/보드 아트/게임팩 제외. Astra는 연구·평가 파일만 쓴다.

## 1. 먼저 구현할 불변조건

- 원관측으로 남긴 묶음과 현재 편집물 동일성 경쟁자를 분리한다. refinement로 편집물에서 퇴역한 묶음은 이후 single을 `partialParent`로 보류시키는 활성 경쟁자로 쓰지 않는다.
- 유효한 다른 묶음·다수 부모·인접 single·같은 단위의 서로 다른 객체는 계속 구분한다. 퇴역 부모를 이유로 모든 crop 관측을 무조건 추가하지 않는다.
- refinement는 부분 관계다. `exhaustive=false`, 잔여 수량 null; 숨은 구성·재고·정답 개수로 채우지 않는다.
- raw와 transform/owner/epoch/definition/source SHA를 보존한다. 수동값·삭제·null·0 보호, 결정적 순서, 동일 단위 재전달 idempotence를 유지한다.

## 2. 이어서 검토할 좁은 일반 보완

**묶음↔묶음:** 같은 등록 원본·영역·소유/epoch에서 상호 유일하고 경계가 온전한 가시 영역 대응은 하나의 가시 더미/묶음 편집 단위로 연결할 수 있다. 이는 개별 내용물 identity가 아니다. 가시 윗면의 값과 출처, unknown 수량을 유지한다. 인접 더미·다대일·경계 잘림·서로 다른 source에는 적용하지 않는다. 기존 contract보다 커지면 1단계를 먼저 반환한다.

**서로 다른 종류:** 겹침만으로 병합하지 않는다. 상호 유일한 동일 footprint의 single 후보에 충분한 기하 근거가 있을 때만 anchor와 종류 충돌 제안으로 국소 보존하고 확정 중복 편집물을 피하는 최소안을 검토한다. 판 위 말·타일 위 토큰·인접 동종이 정상 공존해야 한다. 충분한 근거가 없으면 자동 병합하지 않고 미확정으로 반환한다. 선택한 기하 규칙은 새 검증 출력 전에 고정하고 사진별 tolerance로 조정하지 않는다.

## 3. 수용 검사

1. 퇴역 부모/활성 부모/여러 부모/한 부모 여러 child를 독립 합성 기하로 구분한다.
2. 같은 단위 인접 동일 물체, 정상 board+piece 중첩, 같은 원본 group↔group, group↔single 혼동, 다른 source/owner/epoch를 검사한다.
3. 가독 0, unknown null, 사용자가 지운 물체, 수동 보정, 보충 값과 진짜 충돌, crop 경계 및 source 누락을 보존한다.
4. 완료 순서 역전·재전달·저장재개에서 같은 입력 응답 집합은 같은 의미 결과를 낸다.
5. 고정 10게임 raw 수와 실제 편집 회수·묶음 표면값·중복·오연결·보류를 각각 전후 집계한다. raw를 unresolved에 남긴 것만으로 성공 처리하지 않는다. 원래 GT 의심 항목은 동결 점수와 별도 주석을 유지한다.

**FORBIDDEN:** 모델/프롬프트/정답 수량·좌표/팩/아트 변경, 유료 호출, 자동 추가 판독, 사용자 필수 확인 단계, 포괄적 새 reconciliation 플랫폼.

**ESCALATE IF:** 저장호환·새 schema·소유권 충돌이 필수일 때 정확한 범위만 반환. 첫 slice 구현은 승인된 범위로 즉시 진행하며 전체 연구 문서·새 실험을 기다리지 않는다.
