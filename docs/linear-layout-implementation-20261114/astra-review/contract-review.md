# 초기 공유 계약 검토

## 판정과 범위

**VERIFIED** — [초기 계약](../contract.md)은 실제 역할과 요청 문맥, canonical 주소와 표시용 slot, 원본과 파생 표시를 분리한다. 기존 타입·검증기 재사용 및 Sol1/Sol2 소유 경계도 명시되어 있다. 아래 세 항목은 C1–C5 연동 전에 명시할 material 계약 보완점이다. 진행 중인 구현의 결함 판정이나 최종 코드 수용 판정은 아니다.

- 검토 기준: `contract.md` SHA-256 `6437df1df7906b370b1b5b83fe7be09ab17056d1333360bc4bdb1b613e4d6c91`.
- **REPORTED** — supervisor가 실제 runtime Astra/max/Normal 검증 및 기존 8게임 actual App/free408 입력 보존 harness 준비를 전달했다. 이 검토에서는 이를 재검증하지 않았다.
- **VERIFIED** — 아래 최소 반례는 로컬 메모리에서 실행했다. 종료 코드 0, provider 호출 0, 읽은 session/pack의 전후 digest 동일. 제품·기존 데이터·기존 연구 산출물은 변경하지 않았다.

## 1. C1: asset 준비 여부와 semantic 명령 대상의 안정성

**VERIFIED — 근거.** 계약은 `boardContexts`를 `projectRestorationScene`에 전달하면서 asset 로딩을 semantic revision에서 제외한다. 현재 [projectRestorationScene](../../../shared/sceneProjection.ts)의 entity 수집은 `position.space === 'photo'`일 때 source geometry와 source lookup을 구성한다. 이어 retained 항목은 board/source·recipe·role·position space에 따른 seed로 그룹을 만들고, fallback 항목은 scope/source/field 등의 bucket으로 그룹을 만든다. 현재 [RestorationSceneView](../../../src/RestorationSceneView.tsx)는 scene revision과 group/region ID를 명령 대상으로 전달한다.

**UNCLEAR — 실패 조건.** `boardContexts`로 검증된 board/manual 위치를 이 semantic grouping 경로에 그대로 넣으면, 같은 입력에서도 asset 미준비/준비 사이의 group·region·membership 또는 photo geometry가 달라질 수 있다. revision만 같다고 보장하면 context 없는 서버와 브라우저의 명령 대상이 일치한다는 보장은 없다. 이는 기존 코드 구조로 확인한 통합 위험이며 새 구현에서 발생했다고 판정한 것은 아니다.

**RECOMMENDATION — 최소 계약 문구.** 동일한 원본·수동 결정에 대해 asset 미준비 → 준비 → pin 불일치는 entity/group/region ID, membership, 역할 claim, photo 원근거와 semantic revision을 바꾸지 않는다. 검증된 위치와 adapter·크기·표시 계획은 별도 display 평가에서 결정한다. presentation을 갱신할 때도 저장된 입력 scene을 직접 변이하지 않는다. semantic 변경이 정말 필요하다면 서버도 같은 변경과 revision을 인식해야 한다.

**수용 경계 / 소유.** Sol2는 semantic identity·원근거를 안정화하고 Sol1은 display 평가를 소비한다. 하나의 동일 scene을 세 asset 상태로 평가해 ID/membership/revision을 비교하고, 준비된 화면에서 발생한 기존 group/region 명령이 context 없는 서버의 같은 scene에 적용되는지 기존 harness에서 확인한다. 단순 revision 비교만으로 대체하지 않는다.

**C1 형식 호환 보충.** 현재 [realBoards](../../../src/realBoards.ts)와 [GameBoardRecord](../../../src/GameBoardRecord.tsx)는 `free-board-v1:<frame>` / `slot-board-v1:<frame>` 수동 배치 태그를 사용한다. 반면 현재 [projectGenericDrawing](../../../shared/drawingProjection.ts)의 manual 검증은 `layoutVariant`를 board variant와 비교한다. 따라서 board context 전달만으로 이 저장 형식까지 보존된다고 간주할 수 없다. 기존 frame 해석을 재사용해 대표 저장값을 수용 검사에 포함한다. 태그 제거로 좌표계를 동일시하지 않는다. 이 항목은 코드 경계 확인이며 저장 형식별 실행 검증은 아직 하지 않았다.

## 2. C2/C5: 부분순서를 실제 표시 adapter까지 전달

**VERIFIED — 근거.** 계약은 `orderLevels`, `physicalOrder`, `plan.displayEntityOrder`가 같은 관계 근거를 소비한다고 한다. 그러나 현재 [layoutDrawingItems](../../../shared/drawingLayout.ts)는 입력을 identity로 정렬한 뒤 사진 좌표로 row/member 순서를 정하고, [PhotoLayoutBoard](../../../src/PhotoLayoutBoard.tsx)는 이 함수를 직접 호출한다. 배열을 미리 정렬하는 것만으로는 `precedes`를 최종 화면에 보존할 수 없다.

**VERIFIED — 최소 반례.** 같은 assertion/context/photo의 두 항목을 `right(x=.7) → left(x=.1)` 순서로 전달했다. `layoutDrawingItems` 결과는 `left → right`였다. 이는 사진 배치기 자체의 오류를 뜻하지 않는다. 관계를 반영한 호출자 순서를 이 API가 보존한다는 가정이 성립하지 않음을 확인한다.

**RECOMMENDATION — 최소 계약 문구.** 검증된 부분순서를 최종 adapter가 소비한다. 해당 제약이 있는 항목에서는 사진 좌표 정렬이 관계를 덮어쓰지 않는다. 기존 order/lane 표시를 선택하거나, 관계를 반영한 최종 표시 계획을 adapter가 그대로 소비하도록 경계를 정한다. 관계 없는 항목 사이의 표시용 tie-break는 물리적 전체 순서로 기록하지 않는다. cross-group 관계는 그룹을 합치지 않고, cycle/미해결은 기존 미확정 표현을 유지한다.

**수용 경계 / 소유.** Sol2가 관계와 부분순서를 제공하고 Sol1이 실제 표시에서 보존한다. 사진의 좌우 순서와 유효 `precedes`가 반대인 작은 입력을 실제 컴포넌트까지 통과시켜 표시 순서를 확인한다. projection 배열만 확인하는 테스트로 대체하지 않는다. 기존 세 게임의 grouping 보존은 supervisor의 기존 회귀 harness에 연결한다.

## 3. C3/C4: projector 무효화와 새 profile 선택은 별개

**VERIFIED — 근거.** 현재 [withRestorationProfile](../../../gamepacks/catalog.ts)은 저장된 pack에 호환 profile이 있으면 이를 유지한다. [projectRestorationScene](../../../shared/sceneProjection.ts)은 호환 explicit profile 다음으로 `previous.profile`을 우선한다. [compatibleRestorationProfile](../../../shared/restorationProfile.ts)은 pack/source/edition 및 profile hash를 검증하지만 최신 compiler 결과라는 조건은 검증하지 않는다. 따라서 projector version을 바꾸는 것만으로 같은 pack의 수정된 topology가 기존 scene에 선택된다고 보장할 수 없다.

**VERIFIED — 최소 반례.** 기존 fixture를 메모리에 복제하고 exact pack pin을 유지한 채 profile version을 합성 값으로 변경하고 hash를 재계산했다. 새 profile은 호환 검증을 통과했다. 이를 pack에 넣고 `previous` scene과 함께 투영하면 이전 profile이 선택되었고, explicit `profile` 인자로 전달하면 새 profile이 선택되었다. 이 검사는 선택 경로의 차이를 보여준다. 실제 생성될 C4 profile의 결과를 검사한 것은 아니다.

**RECOMMENDATION — 최소 계약 문구.** 동일 pack/version/source/edition에서 기존 저장 scene을 현재 view로 재평가할 때 어떤 profile을 선택하는지 정의한다. 새 topology를 적용할 목적이라면 정상 catalog/view 경로가 그 profile을 명시적으로 선택하고, profile pin 변경을 digest에 반영하며 수동 선택을 live identity에 재연결하거나 `unappliedEdits`로 보존한다. 원본 snapshot과 과거 pin은 provenance로 유지한다. 다른 edition/source로의 자동 승격이나 gameId만으로 profile 교체는 하지 않는다. 과거 profile을 계속 선택하는 정책이라면, 기존 view에도 C4 표시 의미를 적용하는 별도 파생 경계를 명시해야 한다.

**수용 경계 / 소유.** Sol2 소유. 이전 profile을 가진 저장 pack과 previous scene을 정상 view 경로로 읽었을 때 의도한 동일-pack profile/topology가 선택되는지 확인한다. explicit profile을 강제로 넣은 단위 검사만으로 대체하지 않는다. 최초 갱신 후 동일 입력의 digest가 안정적이고, 수동 결정 보존/미적용 이유와 edition 불일치 거부를 함께 확인한다.

## 직접 검증 기록과 다음 인계

최소 반례는 `TSX_DISABLE_CACHE=1 node --import tsx --input-type=module`에서 기존 `layoutDrawingItems`, `projectRestorationScene`, `compatibleRestorationProfile`, `sceneDigest`, `withRestoration`를 import하여 실행했다. profile 입력은 `docs/real-photo-review-20261110/cases/final-pool-04/view.json`을 읽기만 했다. 출력 요약:

```json
{
  "scope": "bounded contract review, not implementation acceptance",
  "providerCalls": 0,
  "photoOrder": { "input": ["right", "left"], "output": ["left", "right"] },
  "profileSelection": {
    "exactPackPinUnchanged": true,
    "newProfileValid": true,
    "previousProfileStillSelected": true,
    "explicitProfileSelectsNew": true
  },
  "inputUnchanged": true
}
```

검증 시 소스 SHA-256:

| 파일 | SHA-256 |
| --- | --- |
| `shared/sceneProjection.ts` | `f738212ca5bc2c1d1f8461d0b2ac02949c6b2117d2bd8439a0d58009ea42c1bf` |
| `shared/drawingLayout.ts` | `3e0f9f83c060f09e51fddd9b832d4d8b1285d09efd44755a9fb817061aab3cbd` |
| `gamepacks/catalog.ts` | `201d58263d1d3a31d5c07dd097854ec0403c11b7db358cba340198240048b5be` |

**UNCLEAR** — 현재 구현자는 진행 중이다. 위 소스 스냅샷 이후의 수정, 최종 UI, 저장→재개 결과, 기존 8게임/408 입력 보존은 이 문서에서 통과 판정하지 않는다. 계약 검토는 여기서 종료하고 supervisor가 동결 diff와 실제 검증 근거를 전달하면 별도 최종 검토를 재개한다. 이번 작업의 유일한 파일 변경은 이 문서다.
