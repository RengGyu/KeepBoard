// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type FiveTribesReadout =
  {schema:"five-tribes-v1";kind:"tiles";values:{"face": "front" | "back" | null; "printedName": string | null; "tileKind": string | null; "printedValue": number | null; "gridCell": string | null; "owner": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "tileKind": FieldBasis | null; "printedValue": FieldBasis | null; "gridCell": 'user' | null; "owner": 'user' | null}}
 | {schema:"five-tribes-v1";kind:"tribes";values:{"observedColor": string | null; "tribeColor": string | null; "location": string | null};sources:{"observedColor": FieldBasis | null; "tribeColor": FieldBasis | null; "location": 'user' | null}}
 | {schema:"five-tribes-v1";kind:"ownership";values:{"observedColor": string | null; "pieceType": string | null; "owner": string | null; "location": string | null};sources:{"observedColor": FieldBasis | null; "pieceType": FieldBasis | null; "owner": 'user' | null; "location": 'user' | null}}
 | {schema:"five-tribes-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"five-tribes-v1";kind:"coins";values:{"observedColor": string | null; "nominalValue": number | null; "bidOrder": number | null};sources:{"observedColor": FieldBasis | null; "nominalValue": FieldBasis | null; "bidOrder": 'user' | null}}
 | {schema:"five-tribes-v1";kind:null;values:{};sources:{}};
