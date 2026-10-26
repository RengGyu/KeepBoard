// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type ArcsReadout =
  {schema:"arcs-v1";kind:"map";values:{"printedName": string | null; "sideLabel": string | null; "systemLabel": string | null; "spaceType": string | null; "connection": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "systemLabel": FieldBasis | null; "spaceType": FieldBasis | null; "connection": 'user' | null}}
 | {schema:"arcs-v1";kind:"pieces";values:{"observedColor": string | null; "pieceType": string | null; "damageState": string | null; "owner": string | null; "location": string | null};sources:{"observedColor": FieldBasis | null; "pieceType": FieldBasis | null; "damageState": FieldBasis | null; "owner": 'user' | null; "location": 'user' | null}}
 | {schema:"arcs-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardArea": string | null; "printedSymbols": SymbolValue[] | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardArea": 'user' | null; "printedSymbols": FieldBasis | null}}
 | {schema:"arcs-v1";kind:"tokens";values:{"observedColor": string | null; "tokenType": string | null; "slot": string | null; "displayValue": number | null};sources:{"observedColor": FieldBasis | null; "tokenType": FieldBasis | null; "slot": 'user' | null; "displayValue": FieldBasis | null}}
 | {schema:"arcs-v1";kind:null;values:{};sources:{}};
