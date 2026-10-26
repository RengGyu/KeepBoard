// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type CharterstoneReadout =
  {schema:"charterstone-v1";kind:"board";values:{"printedName": string | null; "sideLabel": string | null; "charterLabel": string | null; "buildingLabel": string | null; "permanentState": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "charterLabel": FieldBasis | null; "buildingLabel": FieldBasis | null; "permanentState": 'user' | null}}
 | {schema:"charterstone-v1";kind:"workers";values:{"observedColor": string | null; "workerType": string | null; "owner": string | null; "actionSlot": string | null};sources:{"observedColor": FieldBasis | null; "workerType": FieldBasis | null; "owner": 'user' | null; "actionSlot": 'user' | null}}
 | {schema:"charterstone-v1";kind:"assets";values:{"observedColor": string | null; "assetType": string | null; "unlockState": string | null};sources:{"observedColor": FieldBasis | null; "assetType": FieldBasis | null; "unlockState": 'user' | null}}
 | {schema:"charterstone-v1";kind:"records";values:{"printedName": string | null; "sideLabel": string | null; "printedEntry": string | null; "confirmedChange": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "printedEntry": FieldBasis | null; "confirmedChange": 'user' | null}}
 | {schema:"charterstone-v1";kind:null;values:{};sources:{}};
