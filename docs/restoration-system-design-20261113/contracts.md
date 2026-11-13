# 제안 데이터 계약과 불변식

**RECOMMENDATION.** 아래는 구현 경계를 고정하기 위한 예시 타입이다. 제품 타입에 아직 추가하지 않았다. 실제 API에는 별도 runtime validator가 필요하며 TypeScript 타입만으로 입력을 신뢰하지 않는다. 기존 `GenericRecord`, native Catan/Rummikub, `ObservationReceipt`, `StructureAnchorRef`를 교체하지 않는다.

## 1. 복원 profile

```ts
type SHA256 = string;
type ScopeKey = string; // existing save/write scope: "public" or playerId
type Family = 'grid' | 'track' | 'lane' | 'stack' | 'market'
  | 'network' | 'player-area' | 'free-area';
type SourcePointer = {
  kind: 'pack' | 'spec' | 'spatial' | 'art' | 'rules';
  id: string; sha256?: SHA256; pointer?: string; section?: string;
};
type ProfilePin = {
  profileId: string; profileVersion: string; profileSHA: SHA256;
  packId: string; packVersion: string;
  sourceSHA: SHA256 | null; // null only for explicitly supported legacy native packs
  editionId: string | null;
};
type RegionRecipe = {
  id: string; label: string; family: Family;
  fieldKeys: string[]; allowedComponentIds: string[];
  partition: 'common_public' | 'player_public' | 'owner_private';
  repeat: 'single' | 'per-observed-board' | 'per-observed-group';
  anchor: 'observed-board' | 'shared-board' | 'optional-board' | 'none';
  topology?: {
    rows?: number; columns?: number; slotIds?: string[];
    networkRef?: string; spatialDefinitionSHA?: SHA256;
  };
  preservedRelations: Array<'membership' | 'order' | 'overlap'
    | 'attachment' | 'tuck' | 'side' | 'adjacency'>;
  constraints: Array<{
    id: string; kind: 'role-compatible' | 'address-domain'
      | 'partial-order' | 'variant-applicability';
    parameters: Record<string, unknown>; sources: SourcePointer[];
  }>;
  sources: SourcePointer[];
};
type RestorationProfileV1 = {
  version: 'restoration-profile-v1'; pin: ProfilePin;
  regions: RegionRecipe[];
  macro: { mode: 'shared-center' | 'opposed-sides' | 'observed-regions';
    preservePhotoAxes: boolean; neighborOrderNeedsEvidence: boolean };
  applicability: {
    variants: string[]; playerCountRange?: [number, number];
    unresolvedEditionPolicy: 'common-visual-only';
  };
  readingHints: Array<{ roleId: string; visibleCues: string[];
    distinguishFrom: string[]; preserveWhenUnknown: string[] }>;
  preservationLinks: Array<{ recipeId: string; templateId: string;
    relationKinds: RegionRecipe['preservedRelations'] }>;
};
```

`repeat`는 실제 관측 반복을 허용한다. 인원 범위·자산 좌석 수대로 빈 판 인스턴스를 만들라는 명령이 아니다. `topology.rows/columns`는 알려진 빈 template이고 점유 상태는 별도다. 파라미터는 constraint kind별 검증한다. 문자열 규칙을 실행식으로 eval하지 않는다. 새120팩 리서치 대신 기존 입력에서 기본 profile을 만들고 상세 recipe는 구조군별로 보강한다.

profile pin의 SHA는 source tuple, 참조 자산 SHA, semantic overrides, compiler version을 포함한 canonical JSON으로 계산한다. 모델 요청에도 같은 SHA를 넣는다. legacy native는 명시된 pack ID/version allowlist로만 sourceSHA null을 허용한다.

## 2. 참조와 provenance

```ts
type EntityId = string;
type GroupId = string;
type RegionId = string;
type ObservationRef = {
  taskId: string; observationRef: string;
  evidenceId: string; sourceSHA: SHA256; definitionSHA: SHA256;
  captureEpoch: string; transformId: string | null;
};
type LivePieceRef = {
  assertionId: string; pieceId: string; field: string;
  ownerId: string | null;
};
type Support =
  | { kind: 'observation'; ref: ObservationRef }
  | { kind: 'existing-placement'; ref: LivePieceRef; path: string }
  | { kind: 'claim'; claimId: string }
  | { kind: 'manual'; commandId: string };
type Candidate<T> = {
  id: string; value: T; basis: 'observation' | 'manual' | 'inference';
  supports: Support[]; method?: string; constraintIds: string[];
};
type Claim<T> =
  | { id: string; status: 'selected'; chosen: Candidate<T>;
      alternatives: Candidate<T>[] }
  | { id: string; status: 'unresolved' | 'conflict';
      candidates: Candidate<T>[]; reason: string };
type RuleCheck = {
  constraintId: string;
  result: 'pass' | 'fail' | 'unknown' | 'not-applicable';
  appliesTo: string[]; sources: SourcePointer[];
};
type SceneEntity = {
  id: EntityId; bindings: LivePieceRef[]; observations: ObservationRef[];
  componentId: string | null;
  boardSource?: { kind: 'literal' | 'spatial' | 'native-record' | 'manual';
    originalRef: string }; // exact validated existing board/record reference
  physicalUnit: 'single' | 'group' | 'unknown';
  observedRole: string | null; // copy/reference only; never rewritten by layout
  role: Claim<string>;
  removed: boolean;
};
```

**ID 계약.** 기존 assertion/piece/task/observation ID는 바꾸지 않는다. sidecar의 stable `entity.id`만 추가한다. 첫 materialization 시 immutable receipt origin 또는 manual origin을 기준으로 ID를 만들고 binding을 저장한다. 이후 검증된 `answerField` rebase/linkOrigin/동일원본 fusion 대응만 같은 entity에 연결한다. `observationRef` 단독, bbox, 현재값, 배열 순번을 ID로 쓰지 않는다. 원천이 애매하면 두 entity를 유지한다. 다른 view의 alias merge는 별도 동일성 claim이 있어야 한다.

`physicalUnit=group`는 여러 실물을 한 관측행으로 읽었다는 뜻이며 자동 분해하지 않는다. 이 entity를 여러 개 렌더해 장수를 늘리지 않는다. 여러 binding이 동일 원천의 복제라면 주 표현은 하나, 미확정 별개 물체이면 합치지 않는다. 삭제 후 receipt-only 항목은 `removed` 또는 미참조 근거로 남아도 화면 실물로 복원하지 않는다.

**근거 계약.** `observation`은 모델 관측을 인용함, `manual`은 사용자의 해당 차원 선택, `inference`는 코드/모델의 구조 해석이다. rule check 통과가 ‘실제로 그렇다’를 증명하지 않는다. 정식 주소 검증도 다음 placement의 별도 성질이다. 수동값은 해당 차원에서 표시 우선이며 다른 관측 후보는 보존한다. 수동 소속 확인이 미확정 숫자·순서까지 확정하지 않는다.

## 3. geometry·판·구역·관계

```ts
type Point = { x: number; y: number };
type GeometrySupport = {
  evidenceId: string; sourceSHA: SHA256;
  coordinateSpace: 'normalized-original';
  shape: { kind: 'box'; x: number; y: number; width: number; height: number }
    | { kind: 'quad'; points: [Point, Point, Point, Point] }
    | { kind: 'visible-strip'; points: Point[] };
  extent: 'visible-support' | 'full-visible-object' | 'legacy-unspecified';
  transformId: string | null;
  quality: 'usable' | 'weak' | 'inconsistent'; reasons: string[];
};
type Placement =
  | { space: 'native'; boardEntityId: EntityId;
      definitionSHA: SHA256; frameSHA: SHA256;
      areaId: string; anchorSlotId: string | null; coveredSlotIds: string[];
      addressValidation: 'valid' }
  | { space: 'board-relative'; boardEntityId: EntityId; frameId: string;
      x: number | null; y: number | null; side: string | null }
  | { space: 'region-relative'; regionId: RegionId;
      row: number | null; column: number | null }
  | { space: 'unlocated' };
type SceneGroup = {
  id: GroupId; entityIds: EntityId[];
  family: Family; role: Claim<string>;
  boardMembership: Claim<EntityId>; placement: Claim<Placement>;
  physicalOrder: Array<{ before: EntityId; after: EntityId; claimId: string }>;
};
type SceneRegion = {
  id: RegionId;
  kind: 'observed-board-region' | 'display-region' | 'unlocated';
  boardEntityId: EntityId | null;
  label: string; recipeId: string | null;
  groupIds: GroupId[]; support: GeometrySupport[];
  role: Claim<string>;
};
type SceneFrame = {
  id: string; regionId: RegionId; boardEntityId: EntityId | null;
  geometry: Claim<GeometrySupport>;
  localUp: Claim<'top' | 'right' | 'bottom' | 'left'>;
  templateFrameId: string | null; templateFrameSHA: SHA256 | null;
};
type SceneRelation =
  | { id: string; kind: 'left-of' | 'above' | 'neighbor-of';
      from: RegionId; to: RegionId; claim: Claim<true> }
  | { id: string; kind: 'overlaps' | 'attached-to' | 'tucked-under' | 'precedes';
      from: EntityId; to: EntityId; claim: Claim<true> };
```

구현 validator는 ID namespace/존재/유형을 확인한다. `observed-board-region.boardEntityId`는 live board 관측, 유효한 기존 spatial/native 판 기록 또는 사용자 명시 추가판 entity여야 한다. `boardSource.originalRef`는 종류에 맞는 qualified 원참조이며 source-specific validator가 해석한다. 단순 표시 구역은 `null`이다. 사용자 ‘창문 구역 맞음’ 확인은 role의 manual claim이며 실물 board identity를 만들어 달라는 명령이 아니다. 구 native placement가 모순되면 자동 inference로 덮지 않고 conflict를 표시한다.

normalized-original은 좌상단 원점, x오른쪽/y아래, [0,1]이며 evidence와 sourceSHA가 맞아야 한다. crop/atlas geometry는 기존 transform으로 정확히 한 번 원본에 매핑한다. quad는 시계방향 점 순서를 검증하고 로컬 x/y 축의 의미·180도 ambiguity는 별도 frame claim에 둔다. 화면 upright 변환은 observation rotation에 기록하지 않는다.

wire의 quad 시작점은 이미지상 가장 위의 점(동률이면 x가 작은 점)으로 정규화한다. `localUp`의 top/right/bottom/left는 절대 나침반 방향이 아니라 그 quad의 0→1/1→2/2→3/3→0 변 중 판 template의 윗변을 가리킨다. 그러므로 비스듬한 판도 나타낼 수 있다. 방향이 불명하면 frame은 있어도 localUp claim은 unresolved다. manual four-corner UI에서 template의 좌상→우상→우하→좌하를 지정하면 해당 의미를 이 표현으로 변환한다.

구역 stable ID는 실제 판이 있으면 해당 entity와 recipe에서 이어진다. 판 없는 구역은 최초 그룹 seed에서 만들고 이후 구성원 대응이 유일할 때만 이관한다. 분할/병합은 old→new lineage를 기록한다. 매 렌더의 array index나 화면 위치로 ID를 다시 만들지 않는다.

## 4. 표시 계획과 저장 구조

```ts
type SceneLayoutPlan = {
  version: 'scene-layout-v1'; algorithmVersion: string;
  sourceDigest: SHA256;
  panels: Array<{ regionId: RegionId; band: number; lane: number;
    renderer: Family | 'native-catan' | 'native-rummikub' | 'legacy-field';
    upright: true; displayGroupOrder: GroupId[] }>;
  displayEntityOrder: Record<GroupId, EntityId[]>;
  unsatisfiedRelationIds: string[];
};
type ScenePartitionState = {
  scopeKey: ScopeKey;
  semanticRevision: string; sourceDigest: SHA256;
  profile: RestorationProfileV1; // small resolved contract pinned on save
  entities: SceneEntity[]; regions: SceneRegion[]; groups: SceneGroup[];
  frames: SceneFrame[];
  relations: SceneRelation[]; ruleChecks: RuleCheck[];
  plan: SceneLayoutPlan;
  questionDecisions: Array<{ questionKey: string; inputDigest: SHA256;
    action: 'answered' | 'skipped'; relatedClaimIds: string[] }>;
  bundleLinks: Array<{ preservationId: string; groupIds: GroupId[];
    entityIds: EntityId[]; preservedClaimIds: string[];
    validatedSourceDigest: SHA256; status: 'current' | 'needs-review' }>;
  lastCommand?: { id: string; expectedRevision: string; resultRevision: string;
    kind: string; undoPatch: SceneInverse }; // server-owned inverse only
  appliedCommandIds: string[];
};
type SceneInverse = {
  entitiesBefore: SceneEntity[]; regionsBefore: SceneRegion[];
  groupsBefore: SceneGroup[]; framesBefore: SceneFrame[];
  relationsBefore: SceneRelation[];
  createdIdsToRemove: string[]; planBefore: SceneLayoutPlan;
};
type RestorationStateV1 = {
  version: 'restoration-state-v1';
  partitions: Record<ScopeKey, ScenePartitionState>;
};
// Proposed additive fields, not a replacement for Assertion.value:
// Session.restoration?: RestorationStateV1
// Snapshot.restoration?: RestorationStateV1
```

계획은 **화면 픽셀값이 아닌 패널 배치/안정적 순서**를 저장한다. 글자/판/카드 크기는 renderer가 현재 viewport에 맞춰 읽을 수 있는 기준으로 정한다. 전체 scene을 화면폭에 축소하는 fallback은 쓰지 않는다. `displayEntityOrder`는 물리 order의 증거가 아니며 불명인 구간을 UI에서 구별한다.

`sourceDigest`에는 현재 유효 기록·관측 참조·profile·semantic edit를 넣는다. viewport pan/zoom은 넣지 않으며 사용자 기기의 임시 상태로 둔다. 파생 graph를 저장하는 이유는 구 snapshot 재열기의 의미/그룹 안정성이다. 원사진/receipt 본문은 참조로만 둔다. hash로 dedupe할지 여부는 기존 codec의 실제 저장크기 측정 뒤 결정한다.

sidecar partition은 기존 `fieldScope`/저장 scope에 맞는다. 공개 사진의 unbound 실물은 public partition 안에 남을 수 있다. viewer는 접근 가능한 partition을 합성하되 private 참조는 graph/labels/questions/계획에서 함께 제거한다. 공개인 player field를 보여주는 기존 동작은 유지하면서 쓰기 권한은 별도로 검사한다. foreign scope를 지시하는 relation을 영속화하기보다 허용된 viewer 합성에서만 파생시키는 것이 v1의 기본이다.

`bundleLinks`는 기존 Preservation의 template/container/packed/restored를 복제하지 않고 실제 묶음과 장면을 잇는다. T1–T4는 빈 배열도 허용하고 T8에서 채운다. 단순 표시순서 변경은 링크를 무효화하지 않는다. 구성원 또는 보존에 중요한 물리 관계가 달라졌을 때만 needs-review로 바꾸며, 이미 했던 포장 행위의 packed 사실 자체를 지우거나 새 그룹까지 포장됐다고 확대하지 않는다.

snapshot에는 그 snapshot에 포함된 assertion/evidence에 대한 닫힌 sidecar subset을 저장한다. live session의 다른 scope를 통째로 복제하지 않는다. 같은 snapshot을 resume하면 선택된 partition만 복원한다. 원본 receipt의 과거 captureEpoch는 그대로이고 session의 새 captureEpoch와 혼동하지 않는다. sidecar/새 프로토콜의 미래 버전은 파싱 실패로 자동 삭제하지 않는다.

resume는 저장된 graph/선택/계획을 복원한 뒤 live partition에 새 semanticRevision을 발급하고 `lastCommand` undo 정보는 비운다. 과거 edit 요청의 재시도는 새 revision과 맞지 않으므로 재실행하지 않는다. profile/값·관계의 의미는 저장본대로지만 이전 화면의 명령 수명까지 되살리지 않는다.

## 5. 수정 command: 기존 PATCH 확장

```ts
type SceneCommandBase = {
  commandId: string; scopeKey: ScopeKey; expectedSceneRevision: string;
};
type SceneCommand = SceneCommandBase & (
  | { kind: 'assign-board'; groupId: GroupId; boardEntityId: EntityId;
      selectedEntityIds?: EntityId[] }
  | { kind: 'set-role'; groupId: GroupId; roleId: string }
  | { kind: 'split-group'; groupId: GroupId; parts: EntityId[][] }
  | { kind: 'merge-groups'; groupIds: GroupId[] }
  | { kind: 'set-frame'; regionId: RegionId; evidenceId: string;
      sourceSHA: SHA256; corners: [Point, Point, Point, Point];
      localUp: 'top' | 'right' | 'bottom' | 'left' | 'unknown' }
  | { kind: 'undo'; targetCommandId: string }
);
type ScenePatchBody = {
  sceneCommands?: SceneCommand[];
  // Existing answers[]/assertions[] and room expectedRevisions remain supported.
};
```

처리 순서:

1. 기존 `change` queue 안에서 actor/write scope/revision, live refs, profile compatibility 확인.
2. clone에서 기존 answers와 sceneCommands를 검증. 관련 assertion 교체가 있으면 old→new ID map을 한 번 생성한다. 같은 field에 충돌하는 답은 하나로 명시 정리하거나 거부한다.
3. 기존 provenance proof를 만족하는 piece binding만 rebase. legacy estimated refs와 새 stable entity의 live binding을 함께 갱신한다.
4. group/role/frame의 선택 차원만 manual claim으로 쓰고 자동 종속 관계를 재계산한다. 기존 수동 예외는 command에 명시 포함하지 않으면 유지한다. 현재 native 위치와 충돌하면 conflict를 알리고 native를 지우지 않는다.
5. sourceDigest/semanticRevision 갱신 후 한 번 저장. 반환은 기존 최신 SessionView + scene state. 하나라도 실패하면 clone을 버리고 초안은 클라이언트에 유지한다.

동일 commandId 재전송은 다시 적용하지 않고 현재 view와 적용된 상태를 반환한다. room revision 이외에도 scene revision을 검사해 로컬 모드의 stale group 선택을 막는다. idempotency 기록은 임의로 삭제해 재시도를 중복 실행시키지 않는다. `undo`는 바로 이전 scene-only 의미 수정의 inverse만 허용하고, 이후 다른 의미 수정이 생겼다면 과거 snapshot으로 전체 rollback하지 않는다. 기존 field answer가 함께 포함된 복합수정은 기존 값 편집 이력으로 되돌리고 scene-only undo를 제공하지 않는다. `SceneInverse`는 변경된 항목의 이전값과 새로 만든 ID만 가지며 원사진/값 전체 복사본이 아니다. pan/zoom은 undo를 막지 않는다. profile 변경·새 분석·범위 복원은 새 의미 revision이다.

scene 지원 controls는 전체 보기와 상세 보기 모두 같은 resolved claim/dispatch를 사용한다. 새 manual command가 명시 선택한 동일 차원의 과거 override를 대체할 때만 sidecar의 최신 claim을 우선한다. 자동 전파는 legacy manual 예외를 보호하고 native 주소를 재작성하지 않는다. 단순 source/value 수정은 기존 editor/answer를 통한다.

## 6. 새 reader 구조 확장

기존 strict wire v3의 추가 key를 무조건 허용하지 않는다. 아래 이름은 **새 protocol 제안**이고 reader identity/스키마 hash에 버전이 명시되어야 한다. 요청의 `scene`가 없으면 기존 decoder로 처리한다.

```ts
type SceneReadingRequestV1 = {
  version: 'scene-reading-v1'; profileSHA: SHA256;
  requested: Array<'board-presence' | 'region' | 'frame' | 'visible-support' | 'relations'>;
  roleHints: RestorationProfileV1['readingHints'];
  allowedRoleIds: string[];
};
type SceneReadingResultV1 = {
  version: 'scene-reading-v1'; profileSHA: SHA256;
  boardRefs: Array<{ ref: string; literalObservationRef: string;
    frame: { corners: [Point, Point, Point, Point]; localUp: string | null } | null }>;
  regions: Array<{ ref: string; imageIndex: number; boardRef: string | null;
    memberObservationRefs: string[]; roleCandidates: string[] }>;
  geometry: Array<{ observationRef: string;
    extent: 'visible-support' | 'full-visible-object';
    quad: [Point, Point, Point, Point] | null;
    rotationDegrees: number | null }>;
  relations: Array<{ kind: 'overlaps' | 'tucked-under' | 'attached-to' | 'precedes';
    fromObservationRef: string; toObservationRef: string }>;
  deferred: Array<{ ref: string | null; reason: string }>;
};
```

wire 좌표는 request image 기준 normalized [0,1]로 선언하고 assembly에서 기존 transform을 거쳐 저장한다. 위 `GeometrySupport`는 변환 후 원본 좌표다. `boardRefs.literalObservationRef`는 유효 literal의 board component 또는 유효 기존 spatial boardRef에 연결되어야 한다. region만 있는 결과로 실제 board를 생성하지 않는다. board frame이 판본 미일치이면 로컬 geometry 근거로는 남기되 native 주소 검증에 쓰지 않는다.

decoder는 각 region/edge/geometry의 ref 존재, 요청 role 허용, image scope를 검증하고 잘못된 조각만 deferred로 남긴다. 누락은 빈 공간/물체 부재라는 뜻이 아니다. truncated 응답은 완료 정도를 보존한다. literal 값 preview와 valid rows는 구조 실패 때문에 폐기하지 않는다. 기존 observation receipt 결과는 수정하지 않고 새 protocol 결과와 provenance를 병행 저장한다.

구체 JSON 예시는 **가상의 관측**이며 현재 사진의 정답/fixture가 아니다.

```json
{
  "version": "scene-reading-v1",
  "profileSHA": "example-only-not-a-valid-hash",
  "boardRefs": [],
  "regions": [
    {
      "ref": "region-a",
      "imageIndex": 0,
      "boardRef": null,
      "memberObservationRefs": ["card-a", "card-b"],
      "roleCandidates": ["city-tableau"]
    }
  ],
  "geometry": [],
  "relations": [
    {"kind": "overlaps", "fromObservationRef": "card-a", "toObservationRef": "card-b"}
  ],
  "deferred": [{"ref": "region-a", "reason": "board-not-observed"}]
}
```

이 결과는 ‘도시 카드 후보 무리’를 그릴 수 있게 한다. 다섯 번째 불가사의 판, 특정 사람의 도시, 실제 군사 이웃, 카드값을 만들어 내는 결과가 아니다.
