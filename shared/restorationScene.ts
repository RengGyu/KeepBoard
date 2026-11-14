import type {EstimatedBoardGrid,EstimatedBoardPlacement} from './estimatedBoardStructure';
import type {DrawingPosition} from './drawingProjection';
import type {RestorationProfileV1,Family,SHA256,SourcePointer} from './restorationProfile';
export type ScopeKey=string;
export type EntityId = string;
export type GroupId = string;
export type RegionId = string;
export type ObservationRef = {
  taskId: string; observationRef: string;
  evidenceId: string; sourceSHA: SHA256; definitionSHA: SHA256;
  captureEpoch: string; transformId: string | null;
};
export type LivePieceRef = {
  assertionId: string; pieceId: string; field: string;
  ownerId: string | null;
};
export type Support =
  | { kind: 'observation'; ref: ObservationRef }
  | { kind: 'existing-placement'; ref: LivePieceRef; path: string }
  | { kind: 'claim'; claimId: string }
  | { kind: 'manual'; commandId: string };
export type Candidate<T> = {
  id: string; value: T; basis: 'observation' | 'manual' | 'inference';
  supports: Support[]; method?: string; constraintIds: string[];
};
export type Claim<T> =
  | { id: string; status: 'selected'; chosen: Candidate<T>;
      alternatives: Candidate<T>[] }
  | { id: string; status: 'unresolved' | 'conflict';
      candidates: Candidate<T>[]; reason: string };
export type RuleCheck = {
  constraintId: string;
  result: 'pass' | 'fail' | 'unknown' | 'not-applicable';
  appliesTo: string[]; sources: SourcePointer[];
};
export type SceneEntity = {
  id: EntityId; bindings: LivePieceRef[]; observations: ObservationRef[];
  componentId: string | null;
  boardSource?: { kind: 'literal' | 'spatial' | 'native-record' | 'manual';
    originalRef: string }; // exact validated existing board/record reference
  geometry?: GeometrySupport[];
  supportingAssertionIds?:string[];
  presentation?:{status:'placed'|'unassigned'|'retained';basis:'estimated'|'manual'|'native';cell?:{row:number;column:number};slot?:number|null;slotBasis?:EstimatedBoardPlacement['slotBasis'];position?:DrawingPosition;notes:string[]};
  physicalUnit: 'single' | 'group' | 'unknown';
  observedRole: string | null; requestAreaIds?:string[]; // copy/reference only; never rewritten by layout
  role: Claim<string>;
  removed: boolean;
};

export type Point = { x: number; y: number };
export type GeometrySupport = {
  evidenceId: string; sourceSHA: SHA256;
  coordinateSpace: 'normalized-original';
  shape: { kind: 'box'; x: number; y: number; width: number; height: number }
    | { kind: 'quad'; points: [Point, Point, Point, Point] }
    | { kind: 'visible-strip'; points: Point[] };
  extent: 'visible-support' | 'full-visible-object' | 'legacy-unspecified';
  transformId: string | null;
  quality: 'usable' | 'weak' | 'inconsistent'; reasons: string[];
};
export type Placement =
  | { space: 'native'; boardEntityId: EntityId;
      definitionSHA: SHA256; frameSHA: SHA256;
      areaId: string; anchorSlotId: string | null; coveredSlotIds: string[];
      addressValidation: 'valid' }
  | { space: 'board-relative'; boardEntityId: EntityId; frameId: string;
      x: number | null; y: number | null; side: string | null }
  | { space: 'region-relative'; regionId: RegionId;
      row: number | null; column: number | null }
  | { space: 'unlocated' };
export type SceneGroup = {
  id: GroupId; entityIds: EntityId[]; contextRoleIds?:string[];
  family: Family; role: Claim<string>;
  boardMembership: Claim<EntityId>; placement: Claim<Placement>;
  membershipEdit?:{commandId:string;kind:'split'|'merge';sourceGroupIds:string[]};
  presentation?:{boardEntityId?:string|null;grid?:EstimatedBoardGrid;slots:number[];slotBasis?:EstimatedBoardPlacement['slotBasis'];label?:string;side?:'near'|'far'|null;boardSide?:'A'|'B';color?:string|null;orderLevels?:string[][];orderUnresolved?:string[]};
  physicalOrder: Array<{ before: EntityId; after: EntityId; claimId: string }>;
};
export type SceneRegion = {
  id: RegionId;
  kind: 'observed-board-region' | 'display-region' | 'unlocated';
  boardEntityId: EntityId | null;
  displayContext?:{kind:'physical-board'|'shared-center'|'opposed-side'|'unknown-side';boardSide?:'A'|'B'};
  label: string; recipeId: string | null;
  groupIds: GroupId[]; support: GeometrySupport[];
  role: Claim<string>;
};
export type SceneFrame = {
  id: string; regionId: RegionId; boardEntityId: EntityId | null;
  geometry: Claim<GeometrySupport>;
  localUp: Claim<'top' | 'right' | 'bottom' | 'left'>;
  templateFrameId: string | null; templateFrameSHA: SHA256 | null;
};
export type SceneRelation =
  | { id: string; kind: 'left-of' | 'above' | 'neighbor-of';
      from: RegionId; to: RegionId; claim: Claim<true> }
  | { id: string; kind: 'overlaps' | 'attached-to' | 'tucked-under' | 'precedes' | 'same-visible-stack' | 'adjacent-to';
      from: EntityId; to: EntityId; claim: Claim<true> };

export type SceneLayoutPlan = {
  version: 'scene-layout-v1'; algorithmVersion: string;
  sourceDigest: SHA256;
  panels: Array<{ regionId: RegionId; band: number; lane: number;
    renderer: Family | 'native-catan' | 'native-rummikub' | 'legacy-field';
    upright: true; displayGroupOrder: GroupId[] }>;
  displayEntityOrder: Record<GroupId, EntityId[]>;
  unsatisfiedRelationIds: string[];
};
export type ScenePartitionState = {
  scopeKey: ScopeKey;
  semanticRevision: string; sourceDigest: SHA256; projectorVersion?:string;
  unappliedEdits?:{kind:string;id:string;reason:string;value:unknown}[];
  profile: RestorationProfileV1; // small resolved contract pinned on save
  entities: SceneEntity[]; regions: SceneRegion[]; groups: SceneGroup[];
  frames: SceneFrame[];
  viewRegistrations?:import('./sceneRegistration').SceneViewRegistration[];
  relations: SceneRelation[]; ruleChecks: RuleCheck[];
  plan: SceneLayoutPlan;
  questionDecisions: Array<{ questionKey: string; inputDigest: SHA256;
    action: 'answered' | 'skipped'; relatedClaimIds: string[] }>;
  bundleLinks: Array<{ preservationId: string; groupIds: GroupId[];
    entityIds: EntityId[]; preservedClaimIds: string[];
    missingEntityIds?:EntityId[]; validatedSourceDigest: SHA256; status: 'current' | 'needs-review' }>;
  lastCommand?: { id: string; expectedRevision: string; resultRevision: string;
    kind: string; undoPatch: SceneInverse }; // server-owned inverse only
  appliedCommandIds: string[];
  commandDigests?:Record<string,string>;
  commandPayloadDigests?:Record<string,string>;
};
export type SceneInverse = {
  ordersBefore?:Record<'entities'|'regions'|'groups'|'frames'|'relations',string[]>;
  entitiesBefore: SceneEntity[]; regionsBefore: SceneRegion[];
  groupsBefore: SceneGroup[]; framesBefore: SceneFrame[];
  relationsBefore: SceneRelation[];
  createdIdsToRemove: string[]; planBefore: SceneLayoutPlan;
};
export type RestorationStateV1 = {
  version: 'restoration-state-v1';
  partitions: Record<ScopeKey, ScenePartitionState>;
};
// Proposed additive fields, not a replacement for Assertion.value:
// Session.restoration?: RestorationStateV1
// Snapshot.restoration?: RestorationStateV1

export type SceneCommandBase = {
  commandId: string; scopeKey: ScopeKey; expectedSceneRevision: string;
};
export type SceneCommand = SceneCommandBase & (
  | { kind: 'assign-board'; groupId: GroupId; boardEntityId: EntityId;
      selectedEntityIds?: EntityId[] }
  | { kind: 'set-role'; groupId: GroupId; roleId: string }
  | { kind: 'split-group'; groupId: GroupId; parts: EntityId[][] }
  | { kind: 'merge-groups'; groupIds: GroupId[] }
  | { kind: 'set-frame'; regionId: RegionId; evidenceId: string;
      sourceSHA: SHA256; corners: [Point, Point, Point, Point];
      localUp: 'top' | 'right' | 'bottom' | 'left' | 'unknown' }
  | {kind:'register-view';registration:Omit<import('./sceneRegistration').SceneViewRegistration,'id'|'forwardMatrix'|'inverseMatrix'|'identityCandidates'|'confirmedIdentities'>}
  | {kind:'confirm-identity';registrationId:string;fromEntityId:string;toEntityId:string}
  | {kind:'question-decision';field:string;inputDigest:string;action:'answered'|'skipped'}
  | {kind:'link-preservation';preservationId:string;groupIds:string[]}
  | { kind: 'undo'; targetCommandId: string }
);
export type ScenePatchBody = {
  sceneCommands?: SceneCommand[];
  // Existing answers[]/assertions[] and room expectedRevisions remain supported.
};

export const isRestorationState=(v:unknown):v is RestorationStateV1=>!!v&&typeof v==='object'&&(v as any).version==='restoration-state-v1'&&!!(v as any).partitions&&typeof (v as any).partitions==='object'&&!Array.isArray((v as any).partitions);
export const selectedClaim=<T>(claim:Claim<T>):T|undefined=>claim.status==='selected'?claim.chosen.value:undefined;
export function sceneClaim(id:string,value:undefined,basis?:'observation'|'manual'|'inference',supports?:Support[],reason?:string):{id:string;status:'unresolved';candidates:never[];reason:string};
export function sceneClaim<const T>(id:string,value:T,basis?:'observation'|'manual'|'inference',supports?:Support[],reason?:string):Claim<Exclude<T,undefined>>;
export function sceneClaim<T>(id:string,value:T|undefined,basis:Candidate<T>['basis']='inference',supports:Support[]=[],reason='not-established'):Claim<Exclude<T,undefined>>{return value===undefined?{id,status:'unresolved',candidates:[],reason}:{id,status:'selected',chosen:{id:id+':choice',value:value as Exclude<T,undefined>,basis,supports,constraintIds:[]},alternatives:[]};}
/** Validate a persisted closed graph, never trust TypeScript types or repair foreign refs. */
export function validateScenePartition(p:ScenePartitionState){
 const fail=():never=>{throw Error('복원 장면의 범위·참조·버전을 확인하세요. 원기록은 유지됩니다.');};
 if(!p||typeof p.scopeKey!=='string'||!p.semanticRevision||!/^[a-f0-9]{64}$/.test(p.sourceDigest)||!p.profile?.pin||![p.entities,p.regions,p.groups,p.frames,p.relations,p.ruleChecks,p.appliedCommandIds,p.questionDecisions,p.bundleLinks].every(Array.isArray))return fail();
 const unique=(xs:{id:string}[])=>xs.every(x=>x&&typeof x.id==='string'&&x.id.length>0)&&new Set(xs.map(x=>x.id)).size===xs.length;
 if(![p.entities,p.regions,p.groups,p.frames,p.relations].every(unique))return fail();const es=new Set(p.entities.map(e=>e.id)),gs=new Set(p.groups.map(g=>g.id)),rs=new Set(p.regions.map(r=>r.id)),boards=new Set(p.entities.filter(e=>e.boardSource).map(e=>e.id));
 const claim=(c:Claim<unknown>)=>{if(!c||!['selected','unresolved','conflict'].includes(c.status)||c.status==='selected'&&(!c.chosen||!Array.isArray(c.alternatives))||c.status!=='selected'&&!Array.isArray(c.candidates))fail();};
 for(const e of p.entities){if(!Array.isArray(e.bindings)||!Array.isArray(e.observations)||e.bindings.some(b=>(b.ownerId??'public')!==p.scopeKey)||!['single','group','unknown'].includes(e.physicalUnit))fail();claim(e.role);}
 for(const g of p.groups){if(!g.entityIds.every(id=>es.has(id))||new Set(g.entityIds).size!==g.entityIds.length)fail();claim(g.role);claim(g.boardMembership);claim(g.placement);const b=selectedClaim(g.boardMembership);if(b&&!boards.has(b))fail();const q=selectedClaim(g.placement);if(q?.space==='native'&&(!boards.has(q.boardEntityId)||q.addressValidation!=='valid')||q?.space==='board-relative'&&!boards.has(q.boardEntityId)||q?.space==='region-relative'&&!rs.has(q.regionId))fail();for(const e of g.physicalOrder)if(!g.entityIds.includes(e.before)||!g.entityIds.includes(e.after))fail();}
 for(const r of p.regions){if(!r.groupIds.every(id=>gs.has(id))||r.kind==='observed-board-region'&&(!r.boardEntityId||!boards.has(r.boardEntityId))||r.kind!=='observed-board-region'&&r.boardEntityId!==null)fail();claim(r.role);}
 for(const f of p.frames)if(!rs.has(f.regionId)||f.boardEntityId!==null&&!boards.has(f.boardEntityId))fail();for(const r of p.relations)if(['left-of','above','neighbor-of'].includes(r.kind)?!rs.has(r.from)||!rs.has(r.to):!es.has(r.from)||!es.has(r.to))fail();
 if(p.plan?.version!=='scene-layout-v1'||p.plan.panels.some(panel=>!rs.has(panel.regionId)||panel.displayGroupOrder.some(id=>!gs.has(id))))fail();
}
