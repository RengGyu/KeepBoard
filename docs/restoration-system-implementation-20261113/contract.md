# Shared/backend → UI 구현 계약

T1–T4의 additive 계약이다. src와 shared/sceneLayout.ts는 Sol1 소유다. 값 편집·native·기존 renderer/편집기를 교체하지 않는다.

- `shared/restorationScene.ts`가 설계 contracts.md의 exported `SceneEntity/SceneGroup/SceneRegion/SceneFrame/SceneRelation/ScenePartitionState/RestorationStateV1/SceneCommand/SceneLayoutPlan`를 제공한다. `SceneEntity.geometry?:GeometrySupport[]`는 원본 좌표 근거이며 원 bbox를 바꾸지 않는다. stable scene entity ID와 기존 `bindings[{assertionId,pieceId,field,ownerId}]`를 함께 사용한다.
- `shared/restorationProfile.ts`: `compileRestorationProfile(pack, inputs?)`, `compatibleRestorationProfile(pack, profile)`. 현재·구판 각각 exact pack/version/source/edition으로 컴파일하며 current 팩으로 바꾸지 않는다. `pack.restorationProfile?`는 생성된 exact profile만 연결한다.
- `shared/sceneProjection.ts`: `projectRestorationScene({session,pack,scopeKey?:string,profile?,previous?}):ScenePartitionState`, `restorationScenesForView(session,pack):ScenePartitionState[]`. 기본 scopeKey는 public, 각 partition은 기존 fieldScope 저장 범위다. 이미 접근 허용된/redacted view의 session만 전달한다. 기존 persisted sidecar가 없으면 순수 파생하며 열기만으로 저장하지 않는다.
- 출력 group.entityIds → entity.bindings로 원 편집 대상에 이동한다. 실제 판이 없는 region은 kind=display-region/boardEntityId=null이다. physicalUnit group은 한 표현이며 복제하지 않는다. claim selected/alternatives와 unresolved/conflict는 값 정답 인증과 다르다.
- `scene.plan`은 기본 안정 순서 계획이며 UI는 Sol1 `layoutRestorationScene`로 가독 표시한다. sceneLayout는 계약 type을 import하고 viewport/pan을 원관측/의미 revision에 넣지 않는다. group/region은 안정 ID를 사용한다.
- 기존 PATCH `/api/sessions/:id`에 `sceneCommands?:SceneCommand[]`. `commandId/scopeKey/expectedSceneRevision` 필수. kind: assign-board(groupId,boardEntityId,selectedEntityIds?), set-role(groupId,roleId), split-group(groupId,parts), merge-groups(groupIds), set-frame(regionId,evidenceId,sourceSHA,corners,localUp), undo(targetCommandId). 반환은 기존 SessionView와 session.restoration의 새 partition이다. 기존 room expectedRevisions/PIN은 그대로 필수다.
- transaction은 clone 안에서 전건 검증/적용 후 한 번 저장. 동일 commandId는 재실행하지 않고 현재view 반환, stale/foreign/삭제 ref는409/무변경. native/명시 수동 예외를 자동 group 전파로 덮지 않는다. selectedEntityIds가 있으면 해당 차원을 명시 정정한다. 값은 기존 answers로만 바꾼다.
- commit/save-intent snapshot은 그 snapshot의 닫힌 scope sidecar를 포함한다. resume는 선택 partition만 복원하고 새 semanticRevision/undo 초기화. 미래 version은 보존하며 무지원 edit만 거절한다.

T5/T6/T8/T9의 추가 요청/보존/등록 계약은 같은 문서에 이어 기록하며, 기본 reader/model/강도·호출수·raw는 변경하지 않는다. 이 문서의 signature를 실제 export로 먼저 제공한 뒤 통합한다.

## 최신 scene frame의 표시 해석 (제품 export)
`SceneEntity.presentation?` = `{status:'placed'|'unassigned'|'retained', basis:'estimated'|'manual'|'native', cell?:{row,column},slot?:number|null,slotBasis?,position?:DrawingPosition,notes:string[]}`.
`SceneGroup.presentation?` = `{grid?:EstimatedBoardGrid,slots:number[],slotBasis?}`.
`projectRestorationScene`/`restorationScenesForView`가 최신 수동 frame을 source-qualified 기존 estimator에 transient override로 전달해 반환한다. UI는 이 hint를 우선 소비한다. grid의 manual-slot-order는 사진의 물리방향 확정이 아니다. retained position은 기존 정식/명시 수동 그대로이며 frame으로 덮지 않는다. 원관측·원bbox·값·canonical 주소는 불변이다.

## T6 선택 구조 co-output
기존 HostedReaderSelection에 `scene?:true` 추가. 생략하면 기존 요청/strict v3는 그대로이며 추가 호출 없다. prepare가 exact pack profile에서 `request.scene:SceneReadingRequestV1`을 고정한다. Terra v7/Gemini 모두 `scene-reading-v1` schema를 명시할 때만 추가한다. `ObservationResult.scene?`와 `HostedObservationWire.scene?`에 검증 결과/원wire를 각각 보존한다. geometry는 normalized-original+evidenceId/sourceSHA/transformId로 1회 변환되며 잘못된 조각은 deferred, literal은 유지한다. Atlas의 패널 없는 frame 추정은 하지 않고 보류한다. 실provider schema 수용/품질·지연은 아직 미측정이다.

T4 재전달은 scene 명령뿐 아니라 동반 answers/assertions/name/notes 등 전체 저장 의도의 digest를 비교한다(expectedRevisions 제외). 같은 commandId+다른 의도는409이며 새 값이 조용히 버려지지 않는다.

## T8/T9 추가 SceneCommand (기존 PATCH/권한 그대로)
- `{kind:'question-decision',field,inputDigest,action:'answered'|'skipped'}`: `sceneQuestionInputDigest(partition,field)`로 현재 입력에 pin. answered는 기존 accepted 필드 필요. skipped는 같은 입력의 반복 질문만 숨기고 ready/필수완료를 참으로 만들지 않는다.
- `{kind:'link-preservation',preservationId,groupIds}`: 같은 범위의 기존 Preservation과 실제 묶음 연결. packed/restored는 바꾸지 않는다. 구성원·역할·중요 관계 변경은 needs-review, 화면순서 변경만으로 무효화하지 않는다. `actions[].scene?`에 scope/group/entity refs + providerRequired:false 제공.
- `{kind:'register-view',registration:{stateKey,fromBoardEntityId,toBoardEntityId,fromEvidenceId,fromSourceSHA,toEvidenceId,toSourceSHA,confirmedSameState:true,correspondences:[{from:{x,y},to:{x,y}},...]}}`: 현재 `session.turnInstanceId` stateKey, 두 실제 관측판의 원본 좌표 대응4개 이상 필요. 판별 homography이며 전체 테이블 정합이 아니다. `partition.viewRegistrations?`에 proof/행렬/identityCandidates 보관. 후보만으로 실물 합치지 않는다.
- `{kind:'confirm-identity',registrationId,fromEntityId,toEntityId}`: reciprocal-unique 후보에서만 사용자의 명시 확인 기록. 원값/원관측/각 실물 ID는 그대로 남는다. 경쟁/이동상태/미등록 view는 별도로 남는다. 실제 다른시점 정합 품질은 별도 자료 없이 UNKNOWN이다.
모두 commandId/scopeKey/expectedSceneRevision 공통 필수. 이 workflow 명령은 장면 undo 대상으로 추가하지 않는다. 기존 values editor/보관 행동·same-source crop flow를 대체하지 않는다.

표시 보존 추가: `SceneGroup.presentation`은 기존 adapter의 `label?`, `side?:near|far|null`, `boardSide?:A|B`, `color?:string|null`, `orderLevels?:EntityId[][]`, `orderUnresolved?:EntityId[]`도 제공한다. 같은 판 패널 안의 양편/색띠/부분순서 문맥이며 사람 소유나 물리 완전순서를 새로 확정하지 않는다. label/color는 관측/기존 표시 의미를 참조하며 원값을 교정하지 않는다.

실제 protocol trace ID는 선택 모드에서만 `gemini-game-scene-wire-v1` / `terra-game-scene-wire-v1`이다. literal transport의 기존 v3/reader identity는 그대로이며 request.scene.version/profileSHA와 원 providerResponse를 함께 pin한다. 생략 모드 wire ID도 변경하지 않는다. `values` 모드의 scene 요청은 frame/visible-support를 요청하지 않는다.

선택 게임 로딩 경계: 전체 generated120 lookup은 server가 사용하는 `gamepacks/catalog.ts::withRestorationProfile/withRestoration`에서만 한다. 현재/주입 runtime/저장팩 모두 pack ID·version·source·edition exact tuple + profile guard 뒤 선택된 profile 하나만 pack에 붙인다. shared compiler/projector는 그 pack.restorationProfile 또는 순수 metadata fallback만 소비하며 전체 generated JSON을 import하지 않는다. 구판을 current pack으로 대체하지 않는다.
