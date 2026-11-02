import type {GameRuntimeMetadata} from './gameEssentials';
import type {RoomMetadata,RoomAccess,SavedScope} from './rooms';
export type Value = string | number | boolean | null | Value[] | { [key: string]: Value };
export type Scope = 'public' | 'player';
export type Stage = 'capture' | 'questions' | 'pack' | 'saved' | 'restore';
export interface Player { id: string; name: string; color: string }
export interface Option { value: string; label: string }
export interface FieldDefinition {
  key: string; label: string; description: string; scope: Scope;
  type: 'text' | 'number' | 'boolean' | 'select' | 'json';
  options?: Option[]; acquisition: 'observe' | 'ask' | 'preserve';
  visibility?: 'public' | 'owner'; lifetime?: 'session' | 'turn' | 'round' | 'phase' | 'campaign';
  ui?: { level: 'primary' | 'detail'; order: number; showWhen?: Condition; editor?: 'resource-counts' | 'development-counts' | 'player' | 'default' };
  group: string; sourceId?: string; preservationId?: string; presentation?: 'scene';
}
export interface Condition { field?: string; owner?: '$owner' | 'public' | string; op: 'eq' | 'neq' | 'exists' | 'gt' | 'and' | 'or' | 'not'; value?: Value; conditions?: Condition[] }
export interface Requirement { id: string; scope: Scope; fields: string[]; when?: Condition; reason: string; priority: number; sourceId?: string }
export interface DerivedRule { id: string; scope: Scope; when: Condition; field: string; value: Value; reason: string; sourceId?: string }
export interface PreservationTemplate { id: string; label: string; description: string; scope: Scope; conditions: string[]; restoreAfter: string[]; when?: Condition; visualFields?: string[];externalOnly?:boolean;sourceVisibility?:string;orderSensitive?:boolean;method?:string }
export interface GamePack {
  runtime?:GameRuntimeMetadata;
  id: string; version: string; title: string; edition: string; description: string;
  sources: { id: string; title: string; url: string; section: string }[];
  placement?: { topology: string; slots: { kind: string; locationTypes: ('hex' | 'edge' | 'vertex' | 'area' | 'unplaced')[] }[] };
  // Complete base-set inventory, not an expected count for a partial photograph.
  catanNumberInventory?: { values: number[]; sourceId: string };
  fields: FieldDefinition[]; requirements: Requirement[]; derivedRules: DerivedRule[];
  preservationTemplates: PreservationTemplate[]; supportGaps: string[];
}
import type {CaptureTarget} from './photoCapture';
export interface Evidence {
  id: string; url: string; capturedAt: string; captureEpoch: string;
  label: string; scope: Scope; ownerId?: string;
  kind: 'photo' | 'note' | 'example'; width?: number; height?: number;
  sourceEvidenceId?: string; sourceRegion?: {x:number;y:number;width:number;height:number}; captureTarget?: CaptureTarget;
}
export interface Assertion {
  id: string; field: string; value: Value; ownerId?: string;
  basis: 'observation' | 'user' | 'rule' | 'example';
  status: 'candidate' | 'accepted' | 'conflict';
  evidenceIds: string[]; confidence?: number; reason?: string;
  turnInstanceId?: string; updatedAt: string;
  // Normalized coordinates in evidenceIds[0]; other photos may support the value.
  region?: { x: number; y: number; width: number; height: number };
  analysisJobId?: string;
  observationReceipts?: import('./lightweightRecognition').ObservationReceipt[];
}
export interface Question {
  id: string; field: string; ownerId?: string; label: string; description: string;
  type: FieldDefinition['type']; options?: Option[]; reason: string;
  ui?: FieldDefinition['ui']; acquisition: FieldDefinition['acquisition']; priority: number; sourceId?: string; preservationId?: string;
}
export interface Preservation {
  id: string; templateId: string; label: string; description: string; ownerId?: string;
  conditions: string[]; container: string; packed: boolean; restored: boolean; restoreAfter: string[];
}
export interface Activity { id: string; at: string; type: string; message: string }
export interface Snapshot {
  savedScope?:SavedScope;
  id: string; createdAt: string; captureEpoch: string; turnInstanceId: string;
  gamePackVersion: string; assertions: Assertion[]; evidence: Evidence[];
  preservations: Preservation[]; notes: Record<string,string>;
}
export interface Session {
  room?:RoomMetadata;
  id: string; name: string; createdAt: string; updatedAt: string;
  gamePackId: string; gamePackVersion: string; gamePack?: GamePack;
  captureEpoch: string; turnInstanceId: string; stage: Stage; players: Player[];
  evidence: Evidence[]; assertions: Assertion[]; preservations: Preservation[];
  snapshots: Snapshot[]; notes: Record<string,string>; activity: Activity[];
  deletedAt?: string; // List metadata only; source session/snapshot files are retained.
  recordingMode?: 'simple'; // Explicit UI recording workflow; pinned detailed packs remain unchanged.
  example: boolean; analysisSummary?: string; analysisSummaryOwnerId?: string | null;
}
export interface BriefingItem { field?: string; text: string; ownerId?: string; evidenceIds: string[]; basis: Assertion['basis'] }
export interface RestoreDifference { field: string; label: string; expected: Value; observed: Value; ownerId?: string }
export interface PlannedAction {
  id: string; kind: 'inspectEvidence' | 'requestView' | 'askFields' | 'proposeAssertions' | 'preparePack' | 'requestCommit';
  ownerId?: string; label: string; description: string; fields: string[];
  evidenceIds: string[]; priority: number;
}
export interface SessionView {
  analysis?:{mode:AnalysisResult['mode'];warnings:string[]};
  roomAccess?:RoomAccess;
  privacy?: {protectedOwnerIds:string[];unlockedOwnerIds:string[];setupRequiredOwnerIds?:string[]};
  session: Session; pack: GamePack; questions: Question[];
  derived: Assertion[]; briefing: BriefingItem[]; ready: boolean;
  progress: { resolved: number; total: number }; differences: RestoreDifference[];
  actions?: PlannedAction[];
}
export interface AnalysisResult { assertions: Assertion[]; summary: string; mode: 'live' | 'example' | 'manual'; warnings: string[]; observationReceipts?: import('./lightweightRecognition').ObservationReceipt[]; scanBundle?:import('./scanObservation').ScanBundleReceipt }
export interface AISettings { provider: 'gemini' | 'openai' | 'gateway'; model: string; apiKey?: string; baseUrl?: string }
export interface AIStatus { configured: boolean; provider: AISettings['provider']; model: string; baseUrl?: string; alias?: string; upstreamProvider?: string; reasoningEffort?: string }
