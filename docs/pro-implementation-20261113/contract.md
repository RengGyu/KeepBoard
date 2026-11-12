# P0/P1 shared → UI 계약

기존 estimator 입력/반환/metrics와 v1 override는 유지한다. 요청한 items만 출력/분모/미분류 대상이고 allAssertions는 현재 view의 허용 live 기록만 전달한다. 원값/geometry/canonical spatial은 변경하지 않는다.

## 추가 선택 필드

```ts
type StructurePieceRef={assertionId:string;pieceId:string};
type StructureAnchorRef=
 |{kind:'live-piece';assertionId:string;pieceId:string}
 |{kind:'observed-board';taskId:string;boardInstanceRef:string};
```

그룹/placement에 optional `anchorRef`, placement에 `attachedToRef`, `beforeRefs`, `basisByField`, `boardLocal`, `orderLevel`, `orderStatus`, `slotBasis`, `anchorCandidates`를 추가한다. 기존 string anchorPieceId/attachedToPieceId는 호환용으로 유지하지만 source-qualified 참조가 우선이다. order는 화면 정렬 숫자이며 orderStatus가 unknown/partial/cycle이면 실제 물리 총순서로 읽지 않는다.

LC 그룹은 `boardSide?:'A'|'B'`와 라벨 `관측편 A/B`를 사용한다. 기존 side near/far는 더 이상 자동으로 생성하지 않고 null이다. key는 `[sourceKey,qualifiedAnchorRef,role,lane]`. A/B는 수동 frame/관측 방향/안정된 판내 landmark 방향 근거가 있을 때만 제공하고 사진 중앙/사람 소유와 연결하지 않는다.

Sagrada slotBasis는 `canonical|relative-band|manual|unknown`이다. relative-band는 인쇄 round번호가 아니며 같은 slot의 여러 dice를 보존한다. 역할 미상/미사용 토큰은 favors 영역에 미연결로 보존하고 attached-to를 꾸며내지 않는다. grid의 manual-slot-order/observed-dice-lattice 의미는 유지한다.

## 선택적 수동 v2 저장

기존 v1의 공통 필드(areaId/groupId/order/slot/anchorPieceId/attachedToPieceId)를 그대로 포함하고 다음을 선택적으로 추가한다.

```ts
{version:'estimated-structure-override-v2', sourceKey:string,
 anchorRef?:StructureAnchorRef|null,
 attachedToRef?:StructurePieceRef|null,
 beforeRefs?:StructurePieceRef[],
 frame?:{corners:[{x:number,y:number},{x:number,y:number},
                  {x:number,y:number},{x:number,y:number}]}|null,
 active?:boolean}
```

sourceKey는 estimator가 출처 검증 후 제공한 opaque key를 그대로 쓴다. frame 코너는 원사진 normalized semantic TL/TR/BR/BL이며 UI에서 사용자가 명시한 것만 전달한다. AABB를 자동코너로 바꾸지 않는다. source가 불일치하거나 참조가 삭제/중복/다른 scope면 저장 원문은 유지하되 파생 관계는 unknown으로 남긴다. AI는 v1/v2 모두 생성 불가다. native 위치 편집으로 전환할 때 UI는 해당 구조 override를 해제하거나 v2.active=false로 비활성화한다. 값/메모/owner를 변경하지 않는다.

P0는 모든 live source-qualified 노드를 모은 뒤 Sol1 소유 `resolveEstimatedReference(source,targetId,live)`를 소비한다. legacy v1의 동일record 링크는 유지하고 cross-field는 양끝 source가 같고 대상이 유일할 때만 허용한다. qualified v2도 동일 범위·유일성 검사를 통과해야 한다.

frame/관계/방향을 확보하지 못하면 새 값/가상판을 만들지 않고 reasons와 candidates로 노출한다. observed board는 실제 receipt의 taskId+boardInstanceRef만 사용한다. 관측 관계가 충돌하거나 순환하면 저장 관계를 삭제하지 않고 unknown/cycle로 남긴다. 상세 타입은 실제 shared export를 기준으로 한다. UI/src/safety helper는 Sol1 소유다.

## UI용 출처 검증 결과 export

`structure.referenceRecords?: EstimatedReferenceRecord[]`를 제공한다(타입은 Sol1 safety helper의 `{assertionId,pieceId,evidenceId:string|null,sourceKey:string|null}`). null source는 cross-field 허용 근거가 아니다. UI는 기존 `resolveEstimatedReference(source, targetIdOrQualifiedRef, records)`로 후보를 거르고 sourceKey를 임의 조립하지 않는다. 이 배열은 이미 허용된 view의 live 기록만 담는다.

`structure.boardContexts?: {anchorRef:StructureAnchorRef,sourceKey:string,sourceRegion:ObservationBox,hasManualFrame:boolean,orientationDegrees:number|null}[]`는 실제 live/observed 판 후보만 담는다. sourceRegion은 원사진 bbox이며 semantic 코너가 아니다. corners를 자동으로 이 값에서 만들지 않는다. sourceKey와 관측 참조를 그대로 사용해 수동 v2를 작성할 수 있다.

## 최종 검증 경계와 저장 revision (2026-11-13)

- `anchorIdentity`는 속성 나열 순서가 아닌 `[kind,assertionId,pieceId]` 또는 `[kind,taskId,boardInstanceRef]` tuple로 비교한다. v2의 명시적 null은 기존 string 링크를 파생 결과에서 비운다. 삭제/foreign/중복으로 거절된 manual 링크는 원 q를 보존하고 placement와 표시 group의 legacy/qualified 링크를 null로 내려 준다.
- `answerField`는 기존대로 새 assertion ID를 만든다. 기존 accepted 실물의 component/evidence/bbox/spatial.source가 그대로이고 양 끝의 photo source가 검증된 경우에만 v2 qualified ref를 새 assertion으로 재식별한다. 다른 live field의 참조도 같은 조건이다. 후보·삭제·다른 출처는 승계하지 않는다. v1 string 참조는 기존 의미를 유지한다.
- 판 연결을 못 정해도 unclassified 표시 group 안에 관측 종류/역할/색·겹침 연결요소를 보존한다. anchor/position은 unknown, unassigned이며 placed에는 세지 않는다. 이는 판 소속·사람 소유·물리 총순서 확정이 아니다.
- Sagrada 수동 frame은 semantic 코너를 사용해 local 중심과 반복 lattice를 대조한다. 3D 주사위 bbox 네 코너가 한 셀 안이어야 한다는 조건은 사용하지 않는다. 중심이 셀 경계에 있거나 lattice와 충돌하면 미확정, 경계 가까이에 lattice 지지가 없으면 미확정이다. 수동 frame과 원 bbox는 보존한다. 격자 크기는 기존 board 자산에서 가져온다.
- track slot은 여전히 관측 band의 상대순위다. normalized receipt에 order cycle 보류가 있으면 파생 총순서를 확정하지 않는다. 원관계나 validator를 재작성하지 않는다.
- 실제 사진의 수동 코너 probe는 18→18 cells 보존을 확인한 사용성 검사다. 코너/셀 정답 인증이나 새 모델 성능 측정이 아니다. UI 연결·화면 최종검수와 동결 사진 소속 비교는 감독 통합 범위다.

## 판 미연결 항목의 역할 영역 제안 (후속)

`EstimatedBoardPlacement.suggestedAreaId?:string`와 `EstimatedBoardGroup.suggestedAreaId?:string`를 추가한다. 미분류 중에서도 선택 범위의 관측 종류/명시 sourceAreaId·field가 역할을 확인한 경우에만 제공한다. 판 연결 전 실제 areaId/placed 집계는 바꾸지 않는다. 역할도 불명확하거나 출처 역할이 충돌하면 이 필드는 없다.

UI의 명시적 판 선택은 같은 공유 함수 `estimatedBoardAnchorCorrection(placement, anchorRef)`를 사용한다. 반환형은 `{areaId:string,anchorRef:StructureAnchorRef|null,anchorPieceId:string|null}`이다. 선택한 anchorRef가 non-null이고 기존 areaId가 unclassified이면 검증된 suggestedAreaId로 함께 정정한다. 제안이 없으면 unclassified 유지, 선택 해제(null)는 영역을 자동 승격하지 않는다. UI는 기존 v2 sourceKey/groupId/값/순서를 유지한 채 이3필드만 합쳐 저장한다. 묶음 정정은 각 placement에 같은 함수를 적용한다. 판의 유효성/같은 출처 검증은 기존 estimator와 저장 계약을 그대로 사용한다.

저장된 manual/unclassified override를 재개한 경로도 같은 suggestedAreaId를 제공한다. 출처/참조가 유효한 live node에서만 역할 제안을 붙이며 원 q.areaId·분류·placed는 자동 변경하지 않는다. group 제안은 그 group의 모든 수동 placement 제안이 같은 경우에만 제공한다. 기존 UI의 명시적 동일 판 재선택 helper가 영역을 저장하는 동작은 동일하다.
