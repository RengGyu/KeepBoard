# C3 수동 결정 재연결 후속

**VERIFIED — R1/R2 교정.** 원자료·Astra probe/results는 그대로 보존했습니다. 제품 delta는 `shared/sceneProjection.ts` 한 파일입니다. UI·기본 판독·provider·저장 원값·ID·owner·bbox·canonical은 수정하지 않았습니다.

- **R1:** 대상 그룹/차원별 수동 결정을 먼저 수집합니다. 서로 다르면 마지막 결정을 고르지 않고 conflict candidates 및 `unappliedEdits(reason=manual-reconnection-conflict)`에 **원 claim과 원 대상 entityIds**를 남깁니다. 합의하더라도 새 그룹 전체의 live 멤버를 덮을 때만 적용하며, 부분 결정은 `live-group-expanded`로 보존합니다. 합의된 수동 supports를 모두 유지합니다. old group 배열을 뒤집어도 경쟁 역할의 선택 결과는 같습니다.
- **R2:** 수동 split/merge의 멤버십이 관측 순서를 수동 순서로 승격하지 않습니다. 복원한 그룹의 physicalOrder는 현재 파생 edge에서 다시 시작하고 최신 precedes를 적용합니다. 명시적으로 manual basis가 붙은 precedes claim은 live 대상에서 보존하므로 실제 수동 순서와 새 관측이 충돌하면 여전히 진짜 cycle/미확정입니다.
- projector version을 `scene-projector-3`으로 올려 이전 파생 캐시도 재평가합니다. 원 receipt/value 및 과거 snapshot을 재작성하지 않습니다. 이미 과거 코드가 덮어써 원결정 자체가 없어진 자료에서 결정을 추측해 복구하지는 않습니다.

## 직접 근거

- `red.log`: 새 직접 회귀 4/4 실패로 기존 덮어쓰기·stale order·manual relation 보존 실패를 재현.
- `focused.log`: `node --import tsx --test tests/linear-scene-refresh.test.ts tests/linear-scene-contract.test.ts tests/restoration-system-projection.test.ts` — **24/24 PASS**, 2.59초. 기존 실제9사례 입력 불변/고유참조/부분순서/프로필/자산 경계 포함.
- `http.log`: `node --import tsx --test tests/linear-scene-refresh-http.test.ts tests/linear-scene-http.test.ts tests/restoration-system-http.test.ts` — **11/11 PASS**, 11.40초. 새 2건은 실제 PATCH→구조 갱신→commit→reopen→resume에서 충돌·미적용 원결정과 최신 순서가 보존되고 literal observations/value/ID/owner/note가 불변임을 확인합니다. localhost 실행 권한만 별도 허용했습니다.
- `typecheck.log`: `npx tsc --noEmit` — **exit2**, 본인 소유 오류0. 병행 작업의 `tests/scene-visible-stack.test.ts:28`에서 incomplete `SpatialRequest` fixture TS2740 한 건입니다. 타소유 파일은 수정하지 않았습니다. 마지막 본인 테스트 변경은 non-null 타입 단언만으로 실행 동작은 동일합니다.
- 원 동결본과의 정확한 제품 delta는 `followup.patch`, 파일 SHA는 `source-inventory.json`. 기존 상위 inventory는 이전 동결 근거로 보존하며 이번 inventory가 해당 제품 파일의 최신 pin입니다.

## 범위와 남은 사항

전체 suite/build/새 provider 호출/실운영 접근/커밋·배포는 0입니다. 실제 사진 정확도나 UI 완성 판정이 아닙니다.

Astra 보충 probe **R3-source-mismatch는 이번 두 material 카드에 포함되지 않아 미수정**입니다. receipt의 sourceImageSHA가 기존 transform과 불일치할 때 fingerprint/기존 graph 재사용 문제가 별도로 남아 있습니다. 이를 해결했다고 보고하지 않습니다. 이전 probe 및 원 입력은 수정하지 않았습니다.
