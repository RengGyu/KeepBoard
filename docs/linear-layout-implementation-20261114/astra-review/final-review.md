# C1–C5 동결 구현 최종 기술 검토

**FAILED — 동결본의 C1–C5 전체 수용은 아직 충족하지 않는다.** 수동 역할 보존 1건, 파생 순서 갱신 1건, 지원되는 더미 관계의 최종 표시 소비 1건을 직접 재현했다. 원본 assertion/사진을 손상했다는 판정은 아니다. 원기록을 보존하더라도 파생 scene의 수동 결정과 실제 표시가 달라지는 문제다.

**VERIFIED** — 검토 시작 시 Sol1/Sol2가 동결한 소스·검사 22파일의 SHA가 인계 SHA와 모두 일치했고, probe 후 재비교도 22/22 동일했다. 기준은 [final-source-pins.json](final-source-pins.json)이다. 제품/팩/기존 자료를 수정하지 않았고, 무료 메모리 probe와 이 검토 폴더 산출물만 작성했다. provider 호출 0, 전체 suite/build/Chrome 중복 실행 0.

**REPORTED** — actual/effective/runtime Astra/max/Normal은 supervisor가 재확인했다. supervisor가 전체 검사/build와 기존 8게임 실제 Chrome 검수를 병행한다. 이 문서는 그 결과나 실사진 위치 정확도를 대신 판정하지 않는다.

## R1 · P1 · 구조 갱신이 서로 다른 수동 역할을 하나로 덮어쓴다

**위치:** [sceneProjection.ts](../../../shared/sceneProjection.ts):81, `reconcileSceneSelections`의 group dimension 재연결.

**VERIFIED / FAILED — 재현.** 동일 scope의 두 live card를 각각 검증된 자동 region에 두고, 실제 `applySceneCommands`로 첫 그룹은 `discard`, 둘째는 `fireworks`로 정정했다. 이후 원값/ID를 유지하면서 검증된 scene region을 두 물체가 포함된 하나로 바꾸고 재투영했다.

| 확인 항목 | 결과 |
| --- | --- |
| 갱신 전 entity별 수동 역할 | `discard`, `fireworks` |
| 갱신 후 entity별 역할 | `fireworks`, `fireworks` |
| `sourceDigest` 갱신 | 됨 |
| `unappliedEdits` | 0 |
| 함수 입력 session digest | 불변 |

원인은 `matching`을 **한 물체라도 겹치는 현재 그룹 수**로 판정하기 때문이다. 이전 두 그룹 모두 같은 새 그룹 하나와 일치하므로 각 수동 claim을 순차 대입하고 마지막 값이 승리한다. 정정 대상이 아닌 다른 물체까지 역할을 넓히며, 앞선 정정을 유보 목록에도 남기지 않는다. 두 역할은 현재 Hanabi profile에서 card에 허용된 역할이며, 검증 우회나 임의 malformed scene을 사용하지 않았다.

**RECOMMENDATION — 최소 수정.** 수동 결정의 원래 live 대상 집합을 재연결 기준으로 삼는다. 여러 과거 그룹이 한 현재 그룹으로 모이거나 현재 그룹이 추가 물체를 포함할 때, 대상 전체에 claim을 무조건 적용하지 않는다. 정정된 대상별 그룹을 보존할 수 있으면 유지하고, 그렇지 않으면 원 대상/claim/이유를 `unappliedEdits`에 남긴다. 이 probe는 role을 재현했으며 같은 코드의 board/placement까지 실패했다고 확대 판정하지 않는다.

**재수용:** 위 정상 명령→구조 결합 경로에서 두 역할이 원 대상에 보존되거나 각각 정확한 미적용 결정으로 남아야 한다. claim 한 개가 조용히 사라지거나 다른 물체에 적용되면 실패다.

## R2 · P2 · 수동 분할 보존이 옛 자동 순서까지 보존한다

**위치:** [sceneProjection.ts](../../../shared/sceneProjection.ts):79, `reconcileSceneSelections`; [sceneStructure.ts](../../../shared/sceneStructure.ts), `resolveSceneOrder`.

**VERIFIED / FAILED — 재현.** 세 card의 관측 순서 `A → B`를 투영한 뒤 실제 `split-group` 명령으로 `[A,B]`와 `[C]`를 나눴다. 같은 source의 검증된 관계를 `B → A`로 교체하고 fresh/reused 투영을 비교했다.

| 확인 항목 | fresh | 이전 수동 분할을 재사용 |
| --- | ---: | ---: |
| 현재 관측 `precedes` 수 | 1 | 1 |
| A/B 그룹의 파생 physical edge | 현재 방향만 | 2방향 |
| 충돌 관계 수 | 0 | 1 |
| A/B의 미확정 순서 member 수 | 0 | 2 |

수동 membership 그룹 복원 시 `structuredClone(old)`에 든 이전 `physicalOrder`를 그대로 복원한다. `resolveSceneOrder`는 현재 relation과 그 옛 edge를 합치므로, 현재 근거에는 없는 순환이 생긴다. 수동 분할 자체는 보존되지만 최신 근거에 따른 순서가 갱신되지 않는다. 새 UI는 이 잘못된 `orderUnresolved`를 실제 표시 근거로 소비한다.

**RECOMMENDATION — 최소 수정.** 수동 membership 결정과 파생 physical order를 분리해 복원한다. 현재 validated 관계 및 현재 저장된 명시 순서 근거에서 edge를 다시 만들고, 수동이라는 출처가 확인되는 edge만 별도로 보존한다. 원 관계가 사라졌는데 clone된 edge를 계속 독립 근거로 취급하지 않는다. 모든 순서 데이터를 일괄 삭제하는 수정도 피한다.

**재수용:** 수동 분할의 구성원은 유지하면서 `A → B`의 삭제/역전이 fresh와 같은 현재 부분순서로 반영되어야 한다. 현재 입력에 진짜 cycle이 있는 경우의 유보는 계속 유지한다.

## R3 · P2 · 검증된 visible-stack 관계를 실제 표시가 소비하지 않는다

**위치:** [sceneDisplay.ts](../../../shared/sceneDisplay.ts), `resolveSceneDisplay`; [RestorationSceneView.tsx](../../../src/RestorationSceneView.tsx), `renderPart`와 attachment/order dispatch.

**VERIFIED / FAILED — 재현.** 현재 지원하는 세 card 입력에 검증된 `discard` region과 첫 두 card 사이의 spatial `same-visible-stack` 관계를 넣었다. profile은 현재 생성본의 `pile-collection / observed-pile`이다. 관계가 scene에 1개 연결되는 것을 확인한 뒤, 관계 유무에 따른 resolver 및 실제 `RestorationSceneView → PhotoLayoutBoard` component 출력을 비교했다.

- 관계 유무에 따른 display plan: 동일.
- 실제 panel adapter: 모두 `photo-rows`.
- 실제 photo row와 원 ID 표시: 동일, 3개 모두 표시.
- 관계를 반영한 더미 membership 또는 그 순서 미확정 표시: 없음.

현재 resolver는 위치/typed-map/기존 estimator/부분순서만 dispatch한다. `topologyKind`는 태그이고, `same-visible-stack`은 shared scene에 저장된 뒤 UI에서 읽히지 않는다. 따라서 이것은 역할/더미 근거가 없는 옛 사진의 정당한 fallback과 다르다. visible membership 근거를 공급해도 표시가 변하지 않는 C5 누락이다. 이 probe는 카드의 상하 순서, 숨은 장수, 제삼 카드와의 관계를 제공하지 않았으며 그런 정보를 만들어야 한다는 요구가 아니다.

**RECOMMENDATION — 최소 수정.** 현재 허용 scope/source의 검증된 stack 관계를 기존 group/part 표시 경계로 전달해 알려진 visible membership을 표현한다. 순서가 없으면 순서 미확정을 표시하고, 관계 없는 관측은 미확정으로 남긴다. 원 ID별 선택/단일 표시를 보존한다. 일반 overlap의 전이 연결을 실제 더미로 승격하거나 새 게임별 renderer를 만드는 수정은 필요하지 않다.

**재수용:** 같은 입력에서 검증 관계의 존재가 실제 group 표시/근거에 반영되어야 한다. unrelated/ambiguous/foreign 관계에는 적용하지 않고, 3개 원 물체의 값/ID/단일 표시 및 선택을 유지한다.

## 확인한 경계와 근거의 수준

| 경계 | 이번 검토 결과 |
| --- | --- |
| C1 위치 우선순위 및 asset 준비 | **VERIFIED — 코드:** semantic 투영과 board context presentation 평가가 분리되었다. UI는 기존 native/manual/canonical/typed-map body를 선택한다. manual free/slot frame 해석도 기존 helper를 재사용한다. **REPORTED — 실행:** Sol1의 실제 component/로컬 asset 검사, Sol2의 asset 준비 명령 HTTP 검사가 통과한 로그·검사 코드를 읽었다. 이 검토가 Sagrada 화면을 다시 실행했다고 보고하지 않는다. |
| C1 qualified 원 선택/단일 표시 | **VERIFIED — 코드:** photo callback과 canonical 제외에 qualified ref가 도입되었다. **VERIFIED — 직접 실행:** R3의 실제 component에서 원 3개 ID가 각 한 번 표시된다. **REPORTED:** 기존 408 전체 경계는 supervisor harness가 담당한다. |
| C2 역할/관계 | **VERIFIED — 코드 및 직접 실행:** 요청 context 분리, validated source join, `precedes`와 `same-visible-stack`의 scene 연결을 확인했다. same-group 부분순서는 UI에서 photo 재정렬 경로를 우회한다. 모든 cross-group 관계의 최종 픽셀 배치까지 통과 판정하지 않는다. |
| C3 구조 fingerprint/정정 보존 | **VERIFIED — 코드/직접 실행:** projector version과 검증 구조를 digest에 넣고 재투영한다. 그러나 R1/R2로 수동 결정 보존 및 최신 파생 순서 수용 조건이 실패한다. |
| C3 저장/재개/scope | **VERIFIED — 코드:** 부분 snapshot closure는 원 결정 payload가 섞이지 않도록 `unappliedEdits`를 제거한다. **REPORTED — 실행:** 기존 HTTP 9검사의 commit/reopen/resume·수동 role/board/frame·preservation 결과를 읽었으며 독립 HTTP 재실행은 하지 않았다. |
| C4 profile 의미와 exact pin | **VERIFIED — 직접 파일 대조:** 생성 120개 중 변경은 Hanabi/Azul/Carcassonne/Dominion 4개이고 다른 116개는 동일하다. 모든 packId/version/sourceSHA/editionId tuple은 불변, 네 source의 art SHA도 실제 asset과 일치한다. [대조 결과](final-profile-check.json). Hanabi display-grid, Azul 1..5/5×5/7, Carcassonne map/track, Dominion pile 의미가 구별된다. |
| C4 기존 저장 view의 profile 선택 | **VERIFIED — 코드:** catalog가 exact tuple의 generated profile을 선택하고 projector가 이를 previous보다 우선한다. 다른 tuple의 최신 profile로 자동 교체하지 않는다. **REPORTED:** 정상 HTTP 저장 view/과거 snapshot pin 보존 검사를 확인했다. |
| C5 충분/부족 입력 | **VERIFIED — 코드:** canonical/typed-map/기존 구조와 bbox fallback이 분리되고 원 quantity만큼 실물을 생성하지 않는다. R3의 충분한 supported stack 입력은 아직 최종 표시에서 소비되지 않는다. 옛 사진의 역할/칸/지도 좌표 부족을 이 누락과 혼동하지 않는다. |

Sol1 집중 로그는 43 pass / 0 fail / 0 skip, Sol2 집중 로그는 20 / 0 / 0, HTTP 로그는 9 / 0 / 0이다. **VERIFIED**는 로그의 해당 내용을 직접 읽었다는 뜻이며, 실행 주체와 당시 결과는 **REPORTED**이다. 통과 수치가 위 독립 반례를 반박하지 않는다. R1의 서로 다른 수동 역할을 가진 자동 그룹 결합, R2의 분할 후 기존 순서 교체, R3의 stack 관계를 가진 최종 component 소비는 해당 검사에서 다루지 않았다.

## 직접 probe와 불확실성

```sh
TSX_DISABLE_CACHE=1 node --import tsx docs/linear-layout-implementation-20261114/astra-review/final-probe.mts
TSX_DISABLE_CACHE=1 node --import tsx docs/linear-layout-implementation-20261114/astra-review/final-stack-probe.mts
```

두 명령은 exit 0이며 이는 **결함 재현 assertion이 통과했다**는 의미다. 제품 수용 통과가 아니다. [갱신 probe/결과](final-probe.mts), [JSON 결과](final-probe-results.json), [최종 component probe](final-stack-probe.mts), [stack 결과](final-stack-results.json). 기존 fixture는 읽고 메모리에서 최소 입력을 구성했으며 실행 전후 원 fixture byte 동일, 투영/표시 전후 메모리 source digest 동일을 확인했다. 실제 HTTP/브라우저/실폰에서 위 반례를 재현한 것은 아니다.

**UNCLEAR — 별도 음성 검사 N1.** transform 없는 저장 receipt의 `sourceImageSHA`만 바꾸고 request image SHA를 유지하면 fresh/reused sourceDigest가 같고 reused는 참조 검증 오류를 낸다. 소비하는 source override가 fingerprint에서 빠진 코드 경계는 확인했다. 다만 이 모순된 provenance 변경을 정상 제품 입력 경로가 생성하는지는 확인하지 않았으므로 위 material 3건이나 추가 차단조건에 포함하지 않는다. 결과 파일에는 숨기지 않고 음성 검사로 구분했다.

**인계:** material 3건을 supervisor에게 먼저 통지했다. 최소 수정 후 각 반례와 직접 영향받는 경계만 재확인하면 된다. 전체 suite/build·기존 8게임 실제 Chrome·새 캡처의 최종 결과는 supervisor 소유이며, 새 사진 정확도·실기기 가독성·전120종 동작 완료는 이 검토로 주장하지 않는다. 이 검토는 기록된 동결 SHA에 대한 것으로, 후속 수정본의 통과 판정은 포함하지 않는다.

**VERIFIED — 마감 시점 변경 감지.** 결함 통지·probe 완료 후 최종 파일 점검에서 `shared/sceneProjection.ts`가 검토 기준 SHA와 달라졌다. 이후 수정 내용은 이 문서의 동결본 판정에 포함하지 않았고, 마감 시 SHA는 `final-source-pins.json`의 `closingSourceChanges`에 별도 보존했다. 이 차이를 이 검토자의 제품 수정으로 기록하지 않는다.
