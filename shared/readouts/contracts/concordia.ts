// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type ConcordiaReadout =
  {schema:"concordia-v1";kind:"colonists";values:{"observedColor": string | null; "colonistType": string | null; "owner": string | null; "location": string | null};sources:{"observedColor": FieldBasis | null; "colonistType": FieldBasis | null; "owner": 'user' | null; "location": 'user' | null}}
 | {schema:"concordia-v1";kind:"houses";values:{"observedColor": string | null; "pieceType": string | null; "owner": string | null; "location": string | null};sources:{"observedColor": FieldBasis | null; "pieceType": FieldBasis | null; "owner": 'user' | null; "location": 'user' | null}}
 | {schema:"concordia-v1";kind:"goods";values:{"observedColor": string | null; "goodsType": string | null; "nominalValue": number | null; "storageSlot": string | null};sources:{"observedColor": FieldBasis | null; "goodsType": FieldBasis | null; "nominalValue": FieldBasis | null; "storageSlot": 'user' | null}}
 | {schema:"concordia-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "godSymbol": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "godSymbol": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"concordia-v1";kind:null;values:{};sources:{}};
