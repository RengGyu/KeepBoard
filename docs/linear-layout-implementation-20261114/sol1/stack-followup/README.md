# C5 가시 더미 표시 후속 — 동결

**VERIFIED:** `decodeSceneReading` + 기존 공간 관계 검증 → `projectRestorationScene` → `resolveSceneDisplay` → 실제 `RestorationSceneView`/기존 `EstimatedGroupBody`에서 지원된 same-visible-stack 회원을 소비한다. 종전에는 관계 유무가 모두 photo-rows로 같았다. 이제 지원된 두 회원은 **같은 가시 더미** 테두리/제목 아래 각각 선택 가능하며 관계 없는 singleton은 사진 배열에 남는다. 여러 독립 더미는 별개 표시한다. 새 렌더러·기하·원값·저장 형식 변경은 없다.

- `shared/sceneDisplay.ts`: 표시용 `visible-stack` part/관계 ID. 같은 사진·SHA·task/definition/epoch와 관측 support, 현재 허용 binding, 같은 기존 group/part를 확인한다. 연결 성분의 모든 쌍에 지원 관계가 있을 때만 묶는다. 사슬/불완전 clique/상충·근거 누락/다른 출처·owner·epoch/삭제 회원/부착 경쟁은 기존 표시로 유보한다. 수동·native·canonical·map·부분순서 adapter 우선순위는 그대로다.
- `src/RestorationSceneView.tsx`, `src/restoration-scene.css`: 기존 body에 얇은 더미 표시와 원사진 진입. 각 원 `assertionId+pieceId` 선택을 유지한다. 회원을 겹쳐 숨기거나 수량만큼 복제하지 않는다. 내부 순서·숨은 총수 미확정을 명시한다.
- `tests/scene-visible-stack.test.ts`: 저장된 literal/출처 pin과 합성 관계만 사용한다(사진 정답 아님). 실제 decoded+pile-collection → resolver → component, 관계 제거 대조, 원 ID exactly-once/선택, 별도 더미·singleton·group/null, 역순 관계 입력, chain/부분관계/충돌/foreign/deleted, 입력 불변, 기존 부분순서 우선을 직접 검사한다. `SpatialRequest` fixture는 실제 타입의 필수 pin/prompt 필드를 모두 제공한다.

## 검사

```
node --import tsx --test tests/scene-visible-stack.test.ts tests/scene-display.test.ts tests/restoration-scene-ui.test.ts tests/photo-layout-board.test.ts
# 32/32 PASS, fail/skip 0 — focused-tests.log
./node_modules/.bin/tsc --noEmit -p docs/linear-layout-implementation-20261114/sol1/stack-followup/tsconfig.json
# exit 0 — typecheck.log
```

새 검사 5개와 기존 actual native/manual/map/canonical/photo/부분순서·UI 검사 27개를 함께 실행했다. 최초 타입검사의 fixture 필수 필드 누락 1건을 교정했고 최종 타입검사는 0이다. 기존 동결 `sol1/{preimages,delta.patch,freeze.json}` 및 독립 검토 probe/results는 수정하지 않았다. 현재 시작본은 이 폴더의 `before.json`/`preimages`, 정확 후속 변경은 `delta.patch`, 최종 SHA는 `freeze.json`이다. 새 파일의 before SHA는 null이다.

**미확인:** 실사진 더미 정확도, 실제 브라우저/폰 픽셀 검수. 관측 관계가 없는 더미를 새로 추정하지 않는다. 완전한 쌍별 근거가 없는 연결이나 이미 다른 위치/순서 adapter가 담당하는 회원은 강제로 합치지 않는다. 유료 호출·Git 작업·Site·배포·전체 suite/build는 0. 공유 projection/types/profile/backend는 수정하지 않았다. 소스 동결·소유권 반환.
