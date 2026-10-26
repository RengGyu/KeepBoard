// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type AFeastForOdinReadout =
  {schema:"a-feast-for-odin-v1";kind:"goods";values:{"face": "front" | "back" | null; "printedName": string | null; "shape": string | null; "processedFace": string | null; "coveredSymbols": SymbolValue[] | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "shape": FieldBasis | null; "processedFace": FieldBasis | null; "coveredSymbols": 'user' | null}}
 | {schema:"a-feast-for-odin-v1";kind:"workers";values:{"observedColor": string | null; "actionSlot": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "actionSlot": FieldBasis | null; "owner": 'user' | null}}
 | {schema:"a-feast-for-odin-v1";kind:"boards";values:{"printedName": string | null; "sideLabel": string | null; "boardIdentity": string | null; "gridCell": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "boardIdentity": FieldBasis | null; "gridCell": 'user' | null}}
 | {schema:"a-feast-for-odin-v1";kind:"ships";values:{"observedColor": string | null; "itemType": string | null; "nominalValue": number | null; "emigration": string | null};sources:{"observedColor": FieldBasis | null; "itemType": FieldBasis | null; "nominalValue": FieldBasis | null; "emigration": 'user' | null}}
 | {schema:"a-feast-for-odin-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"a-feast-for-odin-v1";kind:null;values:{};sources:{}};
