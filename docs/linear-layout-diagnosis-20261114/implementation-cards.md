# 후속 구현 카드 초안

**RECOMMENDATION:** 아래는 감독이 후속 구현 범위와 담당자를 확정할 때 사용할 카드다. 이번 연구의 제품 읽기 전용 권한을 확대하거나 새 판독을 승인하는 문서가 아니다. 기존 세션/작업 분담은 `docs/work-sessions.md`를 따른다. 같은 파일을 쓰는 카드는 순서대로 진행한다.

각 실제 작업자에게는 `/Users/jeonggyuju/.codex/policies/WORKER_RUNTIME_RULES.md`와 해당 compact 카드만 전달한다. 프로젝트 지정 하위 작업 모델은 `gpt-6.1-sol / high`, Normal이며 실제/effective/runtime 설정을 확인한 뒤 전달한다. 이 연구의 Astra 런타임을 후속 구현 모델로 복제하지 않는다.

공통 불변 조건: 다른 작업자도 같은 코드베이스를 사용한다. 타인 변경을 되돌리지 않는다. 원값·bbox·ID/owner/canonical·receipt를 표시 추정으로 변경하지 않는다. 제품 구현 카드라도 운영 `.keepboard`/키 접근, 새 provider 호출, 기본 판독 모드/강도 변경, commit/push/deploy는 별도 범위가 아니면 금지다. `PROJECT_CONTEXT.md`와 카드가 지정한 기존 자료를 먼저 읽고, 해당 current diff에서 재사용 경계를 확인한다.

## 순서와 사용자에게 돌아가는 효과

| 순서 | 우선순위 | 카드 | 의존 | 완료 후 관찰할 변화 |
|---:|---|---|---|---|
| 1 | P0 | C1 — 기존 위치·표시기와 사진 fallback 연결 | 없음 | 저장 칸/수동 지도는 기존 위치를 쓰고, 미해결 관측은 사진 여러 줄로 읽을 수 있음 |
| 2 | P0 | C2 — 역할·scope 관계·부분 순서 연결 | C1의 display 입출력 | 요청 범위와 실제 역할이 분리되고, 유효한 cross-field/순서 관계가 화면까지 도달 |
| 3 | P0 | C3 — 파생 버전과 기존 수동 정정 재연결 | C1/C2의 실제 소비 입력 확정 | 저장된 옛 scene 때문에 개선이 안 보이는 현상 방지; 재열기에서 수동 정정 보존 |
| 4 | P1 | C4 — 기존 팩 의미 정규화 | C1/C2 | 표시용 격자·실제 칸·가변 줄·더미·지도 구분 |
| 5 | P1 | C5 — 구조별 공통 표시 조합 | C4 | 근거 있는 영역을 실제 구조로 표현; 정보 부족 영역은 미확정 유지 |
| 6 | 완료 확인 | C6 — 기존8종 실제 UI 확인 | C1–C5 | 데이터 보존과 실제 픽셀 표시를 함께 확인하고 제한을 분리 보고 |
| 조건부 | 후속 | C7 — 부족 정보 한 종류의 최소 판독 | 소비 경로 완료, 기존 권한 확인 | 새로운 정보가 필요한 부분만 한정해 검증 |

C1은 중간 가독성 개선이다. 그것만 끝내고 역할/더미/지도 복원이 완료되었다고 보고하지 않는다. C7의 새 호출 없이도 C1–C6의 코드 소비 문제는 기존 자료와 합성 계약으로 검증할 수 있다.

## C1 — 위치 우선순위와 기존 renderer 연결

```text
TASK: 전체 복원판에서 기존 native/manual/canonical/typed-map 위치를 먼저 표시하고,
      남은 관측에 기존 사진 배열 배치기를 연결한다.
OUTCOME: 동일 live binding의 단일 표시와 원 편집기 선택을 보장하는 공통 display
         resolver, 실제 UI 연결, 좁은 회귀 근거.
CAPABILITY / MODEL / EFFORT: C3 / gpt-6.1-sol / high, Normal. 실제 설정 확인 후 시작.
AUTHORITY: 후속 감독이 지정하는 제품 수정 A1. 이 카드 확정 전 현재 연구 권한은 A0.
CONTEXT: PROJECT_CONTEXT.md; docs/work-sessions.md;
         docs/linear-layout-diagnosis-20261114/{design.md,evidence.md};
         같은 폴더 counterexamples.mts의 A/B/C/D;
         src/{GameBoardRecord.tsx,PhotoLayoutBoard.tsx,realBoards.ts};
         shared/{drawingProjection.ts,spatialPlacement.ts,drawingLayout.ts}.
ALLOWED SCOPE: shared의 작은 순수 display resolver(신규 sceneDisplay.ts 권장),
         src/RestorationSceneView.tsx, 필요한 PhotoLayoutBoard qualified callback,
         shared/scenePresentation.ts 또는 estimatedBoardStructure.ts의 retained 경계,
         위 기능을 검증하는 기존 관련 테스트.
         소유 책임은 display 입력·우선순위·선택 mapping이다.
FORBIDDEN: 게임별 사진 ID/좌표 분기, raw 값/위치 수정, 모든 group을 사진 줄로 대체,
         current scene의 추정 칸을 canonical이라고 재명명, 전체 게임 renderer 재작성.
ACCEPTANCE: 아래 C1 조건을 충족하고 실제 사용 경로로 확인한다.
ESCALATE IF: 기존 asset/variant 계약으로 valid position을 결정할 수 없거나,
         기존 native/공개 미소유 판 body 재사용에 범위 밖 상태 변경이 필요할 때
         정확한 경계를 보고한다. 독립 fallback 작업은 계속한다.
```

C1의 완료 조건:

- 실제 사그라다 baseline의 유효18개를 SHA/frame 확인 후 canonical 경로로 표시한다. 기존 추정18개와 주소가 같다는 사실만으로 통과하지 않고, 선택된 근거/adapter를 확인한다. 원 spatial/value/owner는 그대로다.
- 합성 B의 수동 위치는 게임 추정 지원 여부에 관계없이 먼저 보존되고, 합성 D의 typed map2개는 기존 map adapter를 선택한다. 실제 옛 카르카손에 자동 지도가 생겼다고 보고하지 않는다.
- 실제 하나비35의 미해결 입력이 한 `.estimated-row`에 강제되는 경로를 벗어나 기존 `layoutDrawingItems` 결과를 소비한다. 새 semantic claim은 생성하지 않는다.
- scene 내 서로 다른 assertion에 같은 문자열 pieceId가 있어도 올바른 qualified 선택으로 원 편집기에 돌아간다. canonical/typed/attachment/photo 간 표시 중복·누락이 없다.
- 검증된 asset이 아직 없거나 mismatch면 원 데이터를 바꾸지 않고 미확정/사진 경로를 표시한다. asset 로딩 후 display만 갱신한다.
- adapter 결과 크기를 panel size에 반영한다. 여러 줄인데 기존 전체 entityCount 폭이 남는 문제까지 확인한다. 기존 native Rummikub/Catan과 이미 지원되는3종 구조를 일괄 fallback으로 바꾸지 않는다.

## C2 — 요청 영역과 관측 역할, 관계의 scope 연결

```text
TASK: request area를 관측 역할로 승격하는 fallback을 분리하고, 같은 permitted scope의
      live observation 참조로 region/관계를 연결해 실제 표시 순서까지 전달한다.
OUTCOME: 출처를 가진 role/membership/order adapter와 scope 내 unique receipt 처리.
CAPABILITY / MODEL / EFFORT: C3 / gpt-6.1-sol / high, Normal. 실제 설정 확인 후 시작.
AUTHORITY: 감독이 확정한 제품 수정 A1.
CONTEXT: PROJECT_CONTEXT.md; docs/work-sessions.md;
         docs/linear-layout-diagnosis-20261114/design.md의 역할/관계 절;
         counterexamples.mts E/F; shared/{sceneProjection.ts,structureRelations.ts,
         sceneReading.ts,restorationScene.ts}; 현재 C1 diff.
ALLOWED SCOPE: shared/sceneProjection.ts 및 필요한 관계 adapter/types,
         shared/scenePresentation.ts/sceneDisplay.ts의 부분 순서 소비,
         src/RestorationSceneView.tsx의 해당 소비 경계와 관련 테스트.
         소유 책임은 claim·source-qualified join·order다. C1과 같은 파일 동시 편집 금지.
FORBIDDEN: private/owner scope 확대, bare pieceId로 다른 receipt 연결,
         receipt-only 삭제 물체 부활, bbox 근접을 판/사람 소속으로 확정,
         overlap 연결 성분을 무조건 물리 더미화, 값 크기로 물리 순서 채우기.
ACCEPTANCE: E의 유효 precedes가 실제 UI 순서에 반영되고 F의 같은 scope cross-field
         관계가 살아남는다. 미확정 역할·cycle·모호 참조는 유보된다.
ESCALATE IF: 입력에 필요한 역할/관계가 없으면 입력 부족으로 명시한다.
         검증기를 완화하거나 새 판독으로 이 작업을 대신하지 않는다.
```

C2의 좁은 확인:

- `sourceAreaId` 없는 옛 하나비/아줄은 `request.areaId`를 observation claim으로 갖지 않는다. request/field와 수동 set-role은 각각 자기 의미로 유지된다.
- 같은 receipt가 두 필드에 있어도 relation/group이 중복 생성되지 않고, 같은 source의 유일한 live entity만 연결된다. 다른 scope/epoch 및 삭제된 대상은 연결하지 않는다.
- `partialStructureOrder`를 재사용해 알려진 순서만 반영한다. branch·cycle에서 하나의 물리 total order를 만들어 저장하지 않는다.
- 기존 `attached-to` forest와 3종 추정 구조를 보존한다. boardRef null인 region도 표시하며 가짜 board를 만들지 않는다.

## C3 — 구조 입력/알고리즘 변경과 저장 scene 갱신

```text
TASK: 현재 sourceDigest가 놓치는 구조 입력과 알고리즘 버전을 포함하고,
      재계산 시 기존 수동 정정을 live entity에 재연결한다.
OUTCOME: 저장된 이전 scene의 자동 구조만 올바르게 갱신하는 버전/재연결 경로.
CAPABILITY / MODEL / EFFORT: C3 / gpt-6.1-sol / high, Normal. 실제 설정 확인 후 시작.
AUTHORITY: 감독이 확정한 제품 수정 A1.
CONTEXT: PROJECT_CONTEXT.md; docs/work-sessions.md;
         docs/linear-layout-diagnosis-20261114/{design.md,evidence.md};
         counterexamples.mts G; shared/{sceneProjection.ts,restorationIdentity.ts,
         restorationSnapshot.ts,restorationScene.ts}; C1/C2 실제 소비 목록.
ALLOWED SCOPE: source/display fingerprint, projector/adapter version,
         reconcileSceneSelections의 필요한 범위 및 관련 저장·재개 테스트.
         소유 책임은 파생 상태의 갱신과 기존 수동 결정 보존이다.
FORBIDDEN: 원 receipt/value/bbox/canonical/owner migration, 기존 scene 통째 삭제,
         native provider 원문 전체 hash를 새로운 runtime 의존으로 만들기,
         viewport/hover 변화로 semantic revision 변경.
ACCEPTANCE: 같은 request/value에서 validated scene 구조만 달라져도 fresh/reused
         projection이 같은 새 자동 구조를 만들고 기존 수동 선택은 보존한다.
ESCALATE IF: manual claim의 대응 live entity가 없거나 여러 후보면 적용 유보 이유를
         보고한다. 조용히 삭제하거나 가까운 물체로 대체하지 않는다.
```

C3의 좁은 확인은 G의 결과를 fresh2/reused2로 바꾸는 것, 알고리즘 버전만 바뀐 경우 재계산, 기존 split/merge·role·board·frame 정정과 보관 연결의 재열기 보존이다. 생존한 source identity를 대상으로 한다. 데이터 source가 제거된 경우는 “기존 정정 적용 불가”로 분리한다. 실제 저장 경로 테스트는 기존 격리 harness를 재사용하고 운영 Store에 접근하지 않는다.

## C4 — 기존 자료에서 팩 구조 의미 정규화

```text
TASK: profile의 slot 좌표 모양과 실제 게임 구조를 구분하는 최소 topology 계약을
      만들고 하나비/아줄/카르카손/도미니언의 기존 자료를 연결한다.
OUTCOME: source pin이 있는 구조 recipe와 정확한 regenerated profile.
CAPABILITY / MODEL / EFFORT: C3 / gpt-6.1-sol / high, Normal. 실제 설정 확인 후 시작.
AUTHORITY: 감독이 확정한 제한된 제품/팩 수정 A1.
CONTEXT: PROJECT_CONTEXT.md; docs/work-sessions.md;
         docs/linear-layout-diagnosis-20261114/design.md의 팩 의미 표;
         shared/restorationProfile.ts; tools/game-runtime/generate-restoration-profiles.ts;
         public/game-art/real-boards/{hanabi,azul,carcassonne,dominion}/board.json;
         game-photo-definitions/spatial/index.json; 기존3종 semantic source.
ALLOWED SCOPE: profile type/compiler, 위4종에 필요한 최소 semantic source,
         generated/restoration-profiles.json의 해당 유효 diff와 관련 compiler 확인.
         기존 board asset은 우선 재사용하며 의미가 없다는 증거 없이 재작성하지 않는다.
FORBIDDEN: 전 게임 수작업 계약/새 게임 확장, 한 사진 bbox/ID 상수,
         인쇄/표시용 슬롯을 canonical로 승격, hidden count/owner 생성.
ACCEPTANCE: 하나비 display grid, 아줄 pattern capacities1..5/wall/floor,
         카르카손 tile-map과 score track, 도미니언 slot=pile 단위를 구별한다.
         compiler/profile 버전·exact pack/source pin을 검증한다.
ESCALATE IF: 기존 자료가 구조의 의미를 말해 주지 않으면 unknown capability로 둔다.
         임의 규칙/edition 지식을 추가하기 전에 필요한 정확한 자료만 보고한다.
```

C4는 renderer와 독립적인 팩 데이터 작업이지만 `restorationProfile.ts` 변경이 C1/C2 types에 영향을 줄 수 있으므로 계약을 먼저 합의한다. 하나비25 표시 슬롯에35관측을 순서대로 채우지 않는 것, 아줄 첫 행만 선택되지 않는 것, 도미니언 카드 단위와 pile 단위를 혼동하지 않는 것을 대표 반례로 확인한다. 자료를 넘어선 최적화/규칙 엔진은 만들지 않는다.

## C5 — 구조별 표시 조합과 유보

```text
TASK: 정규화된 recipe와 실제 claim을 함께 받아 격자/가변 줄/더미/지도 표현을
      기존 renderer와 공통 adapter로 조합한다.
OUTCOME: family 이름만 있으나 일자 row로 떨어지는 경로를 근거 기반 dispatch로 교체.
CAPABILITY / MODEL / EFFORT: C3 / gpt-6.1-sol / high, Normal. 실제 설정 확인 후 시작.
AUTHORITY: 감독이 확정한 제품 수정 A1.
CONTEXT: PROJECT_CONTEXT.md; docs/work-sessions.md;
         docs/linear-layout-diagnosis-20261114/design.md;
         C1 display resolver, C2 관계 adapter, C4 profile;
         src/{EstimatedBoardView.tsx,PhotoLayoutBoard.tsx,GameBoardRecord.tsx},
         shared/readouts/carcassonneLayout.ts 및 기존 typed map preview.
ALLOWED SCOPE: 공통 display adapter와 실제 UI dispatch/panel 크기,
         필요한 작은 공통 lane/pile body, 직접 관련 테스트.
         소유 책임은 구조가 충분한 경우의 표시이며 관측 생산은 아니다.
FORBIDDEN: 현재 네 게임 사진만을 위한 새 gameId 분기, 기존 raw 역할 자동 재작성,
         불충분한 edge/회전으로 정식 지도 좌표 생성, bbox로 소유 확정,
         모르는 값/장수 보완, native renderer 교체.
ACCEPTANCE: 충분한 입력은 해당 구조를 표시하고, 부족한 입력은 이유를 남겨
         사진 배열로 돌아간다. 같은 physicalUnit group은 복제하지 않는다.
ESCALATE IF: 필요한 방향 인접/더미 경계 계약이 없으면 renderer의 입력 결핍으로
         기록하고 C7의 최소 추가 정보에 넘긴다. 구조 요청을 몰래 켜지 않는다.
```

C5 확인에는 실제 아줄 입력의 canonical 미확정 유지와 별도 올바른 frame/slot 합성 입력의 board 표시를 함께 둔다. 마찬가지로 현재 카르카손 원사진은 자동 지도 완료 기준으로 삼지 않고, 기존 typed 위치 입력이 map으로 가는 것을 검증한다. 도미니언은 “49관측=49더미”를 금지하고 원 single/group 단위를 유지한다. 모든 표시에서 실제 source ref와 근거 수준을 추적할 수 있어야 한다.

## C6 — 기존8종의 실제 UI와 근거 확인

```text
TASK: 수정된 제품에 기존8종 저장 자료를 연결해 실제 UI 결과와 입력 보존을 확인한다.
OUTCOME: 원사진/화면 대응, 실제 표시 ID/근거 분기, 한계가 구분된 짧은 인계 근거.
CAPABILITY / MODEL / EFFORT: C2 / gpt-6.1-sol / high, Normal. 실제 설정 확인 후 시작.
AUTHORITY: 감독이 확정한 검증 권한. 제품 수정은 맡지 않으며 필요시 소유자에게 반례 전달.
CONTEXT: PROJECT_CONTEXT.md; docs/work-sessions.md;
         docs/linear-layout-diagnosis-20261114/{replay.mts,counterexamples.mts,evidence.md};
         docs/restoration-readability-generalization-20261113/sol2/{fixtures.mts,README.md};
         docs/pro-review-20261113/data/cases/; 현재 구현 diff.
ALLOWED SCOPE: 감독이 지정한 새 검증 task 폴더의 최소 harness/결과/캡처.
         기존 격리 서버/fixture를 재사용하며 실제 component와 browser 화면을 확인한다.
FORBIDDEN: 원사진/응답/GT 수정, 운영 Store 접근, provider 호출, 새 렌더러를 정적
         검수 화면에 따로 만들어 제품 결과로 보고, 전체 suite/build를 선행 마일스톤화.
ACCEPTANCE: 모든408 원 binding의 단일 표시와 올바른 선택, 원값/출처 보존,
         C1–C5의 실제 adapter/근거 표시, 기존 native/3종 구조 유지.
         아줄/로스트 시티는 새 캡처의 실제 pixels와 화면 경계도 확인한다.
ESCALATE IF: 캡처/브라우저를 열 수 없으면 코드 확인과 미확인 화면을 분리한다.
         DOM 개수만으로 픽셀 완전성이나 실기기 가독성 완료를 주장하지 않는다.
```

현재 연구 스크립트는 결함 재현값을 assert하므로 수정 후 그대로 PASS를 요구하지 않는다. 새 기대값은 위 카드의 동작으로 바꾸고, 기존 실제 자료와 synthetic fixture를 계속 구분한다. 전8종 정확도 재채점, 새 사진 세트, 숫자로 정한 새 성능 목표는 이 카드 범위가 아니다.

## C7 — 부족한 정보 한 종류만 후속 확인

```text
TASK: 구현 후에도 부족한 역할/칸/더미/방향 인접 중 한 종류를 가장 작은 판독으로 확인한다.
OUTCOME: 기존 출력에 없던 정확한 정보와 실제 소비 성공/유보를 분리한 결과.
CAPABILITY / MODEL / EFFORT: C2 / gpt-6.1-sol / high, Normal. 실제 설정 확인 후 시작.
AUTHORITY: 현재 연구 권한에는 없음. 감독이 기존 사용자 권한을 확인해 특정 입력,
         요청 계약, 호출 수를 허용한 경우에만 실행한다.
CONTEXT: PROJECT_CONTEXT.md; docs/work-sessions.md;
         docs/linear-layout-diagnosis-20261114/design.md의 최소 후속 실험 표;
         해당 game의 기존 definition/profile, 구현된 renderer 입력 계약.
ALLOWED SCOPE: 선택된 기존 사진/필요한 한 근접사진과 한 요청의 별도 결과.
         기존 source/응답은 보존하고 이번 관측만 별도 출처로 기록한다.
FORBIDDEN: 기본 강도/전체 구조 모드 변경, 전8종 일괄 재판독, 자동 반복/모델 교체,
         unknown을 규칙 세팅/외부 상식으로 채움, 소비되지 않는 추가 필드 수집.
ACCEPTANCE: 새 정보가 literal/validation/scene/UI 중 어디까지 도달했는지 증거를 낸다.
         불충분하면 정확한 미확정 이유를 남긴다. 합법 상태/숨은 수량/사람 소유는
         직접 근거 없이 완료 기준으로 만들지 않는다.
ESCALATE IF: 필요한 정보가 현 scene/spatial 계약으로 표현되지 않으면 최소 versioned
         입력 계약만 먼저 설계한다. 호출을 먼저 해서 해결하려 하지 않는다.
```

최소 완료 보고는 **바뀐 행동 → 실제 확인 → 남은 정보 부족** 순서로 한다. 읽기 실패, 구조 의미 부족, 전달 단절, 표시 미소비를 한 가지 “AI 정확도” 문제로 합쳐 보고하지 않는다.
