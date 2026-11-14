# C1 retained / C2–C4 shared 계약

- 기존 `SceneEntity/Group/Region`, `DrawingItem`과 canonical/manual 검증기를 재사용합니다. src·shared/sceneDisplay·sceneLayout은 Sol1 소유입니다.
- `projectRestorationScene`와 `restorationScenesForView`에 optional `boardContexts?: readonly SceneBoardContext[]`를 제공합니다. `SceneBoardContext = {packId:string;packVersion:string;sourceSHA:string|null;board:SpatialBoardView}`이며 정확한 pack pin이 맞는 context만 기존 `projectGenericDrawing`으로 검증합니다. SHA/frame/variant/slot/owner 검증은 기존 함수 그대로이고 pure shared 함수는 fetch하지 않습니다. 서버 context가 없으면 source photo/미확정으로 남습니다. asset 로딩은 semantic revision을 바꾸지 않는 display 재평가입니다.
- `estimateBoardStructure`는 게임별 추정 지원 여부와 무관하게 이미 검증된 `DrawingItem.position`의 manual/board/group를 retained로 보존합니다. 원값/canonical을 수정하지 않습니다.
- `SceneEntity.observedRole`은 explicit sourceAreaId/검증 scene region만. optional `requestAreaIds?:string[]`는 요청 문맥이며 실제 역할 아님. `SceneGroup.contextRoleIds?:string[]`는 field/request 기반 recipe 후보입니다. 실제 role claim/수동 set-role과 분리합니다.
- scope-wide unique source-qualified live join으로 scene/spatial 관계를 연결합니다. 기존 group.presentation `orderLevels?:EntityId[][]`, `orderUnresolved?:EntityId[]`에 알려진 부분순서를 전달하고 `physicalOrder`와 `plan.displayEntityOrder`는 같은 근거를 소비합니다. cycle은 unsatisfiedRelationIds와 미확정으로 남습니다. cross-group edge 때문에 group을 합치지 않습니다.
- optional profile topology: `kind?:'canonical-grid'|'display-grid'|'ordered-track'|'variable-lanes'|'pile-collection'|'tile-network'|'free-area'`, `unit?:'piece'|'physical-group'|'observed-pile'`, `rowCapacities?:number[]`, `slotMeaning?:'canonical-address'|'display-only'|'pile'`. 기존 rows/columns/slotIds/source pin은 유지합니다. display-grid와 pile slot은 점유/canonical 주소가 아닙니다.
- projector version과 실제 소비하는 validated scene/spatial/출처를 semantic fingerprint에 포함합니다. viewport/pan/selection/asset load는 제외합니다. 재투영에서 수동 묶음·역할·판·frame·보관은 live identity에 재연결하며 불가하면 optional `unappliedEdits`에 원결정+이유를 보존합니다. 전체 raw/provider 응답은 fingerprint에 넣지 않습니다.

## material 경계 확정
- `boardContexts`는 최종 entity/group presentation에만 적용합니다. 동일 입력의 asset 없음/valid/mismatch는 semantic entity/group/region IDs, membership, 역할 claim, geometry, sourceDigest/semanticRevision을 바꾸지 않습니다. 준비된 UI의 명령 대상은 context 없는 서버와 같습니다.
- 정상 server catalog/view는 exact packId/version/sourceSHA/editionId tuple의 현재 generated profile을 선택합니다. shared는 선택된 compatible pack profile을 previous보다 우선하며, 새 exact metadata가 없으면 호환 previous profile을 유지합니다. 이전 session.gamePack/snapshot/profile 원본은 mutate하지 않습니다. profileSHA 변경은 fingerprint 갱신과 수동 재연결을 일으킵니다. 다른 source/edition 자동 승격은 없습니다.
- 최종 photo adapter의 관계순서와 free/slot frame 태그는 Sol1 소유이며 본 구현은 validated 부분순서와 display hint만 제공합니다.
