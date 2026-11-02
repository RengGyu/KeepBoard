# 자동 반영과 저장된 구후보 테스트 분리

**VERIFIED — 구현솔1, 2026-10-29.** 이번 후속 작업은 `tests/photo-capture-api.test.ts`, `tests/lightweight-recognition-review.test.ts`와 이 문서만 수정했다. 제품 코드는 수정하지 않았다.

## 시작점과 변경

`../full-test.log`의 두 파일에는 총 10개 사례 중 8개 실패가 있었다. 새 읽기가 `accepted`로 자동 반영된 뒤 예전 `candidate` 조회에서 `undefined.field/id`가 발생했다. 실패를 피하려고 원본·수동값·정정 보호 검사를 제거하지 않았다. 기존 10개 사례를 모두 유지하고 현재 동작을 확인하는 4개 사례를 추가했다.

- `photo-capture-api.test.ts`: 실제 새 읽기 3개 사례는 승인 API 없이 자동 반영된 결과를 검사한다. 선택 영역 override가 원래 업로드 메타데이터를 바꾸지 않음, 기존 차례 보존, 실제 evidence ID·region 보존, quantity=0/cost.blue=0/cost.white=null/cost.green=6, 저장·재개·내보내기·가져오기, 다중 사진 정지 상태 확인 및 비공개 영역 거절 검사를 유지한다. 카탄의 현재 반영 필드는 `board.layout`이다.
- 같은 파일의 retargeted 저장 후보 호환 사례는 임시 `Store`에 이전 후보를 직접 저장한다. `normalizeObservations`로 당시 분석 입력의 영역 override를 재현하고 실제 저장된 사진 메타데이터는 유지한다. 새 분석 호출 횟수가 0임을 확인한 뒤 explicit accept와 UI PATCH가 모두 200이며 원래 업로드 target·후보값이 보존되는지 검사한다. 범위 밖 provider 결과를 실패 처리하는 원래 사례도 유지한다.
- `lightweight-recognition-review.test.ts`: 과거 후보 accept/review/link를 검사하는 사례는 `compileObservationTask`와 `assembleObservations`로 실제 업로드 ID·이미지 SHA·현재 epoch/turn·원문 receipt가 있는 이전 후보를 만들어 `Store`에 저장한다. 새 작업이 후보를 만든다고 가정하지 않는다. 기존 baseline이 있으면 accept와 후보만의 PATCH가 409, 잘못된 baseline/source와 재사용 review도 409, 명시적 병합은 200, raw receipt 두 개 보존, 루미큐브 수동 그룹 순서·추가 타일 및 의도적 수동 삭제, typed link 중복 호출의 실물 중복 방지를 계속 검사한다. 기존 unknown-kind/level 사례도 유지한다.
- 새 로컬 읽기 3개 사례는 카탄·루미큐브·스플렌더의 첫 읽기 자동 반영과 승인 후보 부재를 검사한다. 이후 수동 정정한 상태에서 별도 사진을 읽으면 실물 목록·수동값을 그대로 두고 raw receipt만 추가하며, `componentRefs={}`와 `unlinked/targetPieceId=null`로 보관하는지 확인한다. 저장·재개 뒤 값·두 receipt·각 원사진 ID가 모두 남아야 한다.
- 새 동일 사진 재판독 사례는 수동 hills를 유지하면서 새 forest 원문을 별도 receipt에 보존하고, 같은 실물 ID에 `variant` 충돌이 기록되며, 저장·재개 후에도 둘 다 유지되는지 확인한다.

## 실행 근거

**VERIFIED:** `npx tsx --test tests/photo-capture-api.test.ts tests/lightweight-recognition-review.test.ts` — exit 0, **14/14 통과**, 실패·skip 0.

**VERIFIED:** `npx tsc --noEmit` — exit 0.

실제 API를 임시 로컬 서버·임시 Store와 합성 reader/analyzer로 호출했다. 외부 모델 호출·빌드·배포·커밋 0. 전체 suite는 감독관이 소유하며 이번 결과를 전체 릴리스 준비 완료로 해석하지 않는다. 이번 두 파일에서는 제품 수정이 필요한 결함을 발견하지 않았다.
