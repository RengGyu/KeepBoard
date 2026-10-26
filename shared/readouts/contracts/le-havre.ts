// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type LeHavreReadout =
  {schema:"le-havre-v1";kind:"goods";values:{"observedColor": string | null; "goodsType": string | null; "processedFace": string | null; "nominalValue": number | null};sources:{"observedColor": FieldBasis | null; "goodsType": FieldBasis | null; "processedFace": FieldBasis | null; "nominalValue": FieldBasis | null}}
 | {schema:"le-havre-v1";kind:"buildings";values:{"face": "front" | "back" | null; "printedName": string | null; "buildingType": string | null; "occupiedBy": string | null; "owner": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "buildingType": FieldBasis | null; "occupiedBy": 'user' | null; "owner": 'user' | null}}
 | {schema:"le-havre-v1";kind:"workers";values:{"observedColor": string | null; "workerType": string | null; "location": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "workerType": FieldBasis | null; "location": 'user' | null; "owner": 'user' | null}}
 | {schema:"le-havre-v1";kind:"debt";values:{"observedColor": string | null; "itemType": string | null; "nominalValue": number | null};sources:{"observedColor": FieldBasis | null; "itemType": FieldBasis | null; "nominalValue": FieldBasis | null}}
 | {schema:"le-havre-v1";kind:null;values:{};sources:{}};
