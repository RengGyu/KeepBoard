// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type BarrageReadout =
  {schema:"barrage-v1";kind:"structures";values:{"observedColor": string | null; "structureType": string | null; "damHeight": number | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "structureType": FieldBasis | null; "damHeight": FieldBasis | null; "owner": 'user' | null}}
 | {schema:"barrage-v1";kind:"water";values:{"observedColor": string | null; "basin": string | null; "waterState": string | null};sources:{"observedColor": FieldBasis | null; "basin": 'user' | null; "waterState": 'user' | null}}
 | {schema:"barrage-v1";kind:"machinery";values:{"face": "front" | "back" | null; "printedName": string | null; "machineType": string | null; "wheelSlot": string | null; "linkedProject": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "machineType": FieldBasis | null; "wheelSlot": 'user' | null; "linkedProject": 'user' | null}}
 | {schema:"barrage-v1";kind:"engineers";values:{"observedColor": string | null; "itemType": string | null; "actionSlot": string | null; "nominalValue": number | null};sources:{"observedColor": FieldBasis | null; "itemType": FieldBasis | null; "actionSlot": 'user' | null; "nominalValue": FieldBasis | null}}
 | {schema:"barrage-v1";kind:null;values:{};sources:{}};
