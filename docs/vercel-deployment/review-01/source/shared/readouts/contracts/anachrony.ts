// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type AnachronyReadout =
  {schema:"anachrony-v1";kind:"workers";values:{"observedColor": string | null; "workerType": string | null; "fatigue": string | null; "exosuit": string | null; "actionSlot": string | null};sources:{"observedColor": FieldBasis | null; "workerType": FieldBasis | null; "fatigue": FieldBasis | null; "exosuit": 'user' | null; "actionSlot": 'user' | null}}
 | {schema:"anachrony-v1";kind:"buildings";values:{"face": "front" | "back" | null; "printedName": string | null; "buildingType": string | null; "slot": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "buildingType": FieldBasis | null; "slot": 'user' | null}}
 | {schema:"anachrony-v1";kind:"resources";values:{"observedColor": string | null; "resourceType": string | null; "debtTarget": string | null};sources:{"observedColor": FieldBasis | null; "resourceType": FieldBasis | null; "debtTarget": 'user' | null}}
 | {schema:"anachrony-v1";kind:"boards";values:{"printedName": string | null; "sideLabel": string | null; "boardType": string | null; "focusPosition": string | null; "trackValue": number | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "boardType": FieldBasis | null; "focusPosition": 'user' | null; "trackValue": FieldBasis | null}}
 | {schema:"anachrony-v1";kind:null;values:{};sources:{}};
