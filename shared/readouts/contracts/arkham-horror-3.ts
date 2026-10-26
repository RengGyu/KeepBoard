// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type ArkhamHorror3Readout =
  {schema:"arkham-horror-3-v1";kind:"map";values:{"face": "front" | "back" | null; "printedName": string | null; "neighborhood": string | null; "scenario": string | null; "connection": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "neighborhood": FieldBasis | null; "scenario": FieldBasis | null; "connection": 'user' | null}}
 | {schema:"arkham-horror-3-v1";kind:"pieces";values:{"observedColor": string | null; "pieceType": string | null; "printedValue": number | null; "target": string | null};sources:{"observedColor": FieldBasis | null; "pieceType": FieldBasis | null; "printedValue": FieldBasis | null; "target": 'user' | null}}
 | {schema:"arkham-horror-3-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"arkham-horror-3-v1";kind:"mythos";values:{"observedColor": string | null; "tokenSymbol": string | null; "resolution": string | null};sources:{"observedColor": FieldBasis | null; "tokenSymbol": FieldBasis | null; "resolution": 'user' | null}}
 | {schema:"arkham-horror-3-v1";kind:null;values:{};sources:{}};
