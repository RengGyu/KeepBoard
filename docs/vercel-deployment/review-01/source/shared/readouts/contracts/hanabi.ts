// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type HanabiReadout =
  {schema:"hanabi-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "suit": string | null; "number": number | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "suit": FieldBasis | null; "number": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"hanabi-v1";kind:"tokens";values:{"observedColor": string | null; "tokenType": string | null; "tokenSide": string | null};sources:{"observedColor": FieldBasis | null; "tokenType": FieldBasis | null; "tokenSide": FieldBasis | null}}
 | {schema:"hanabi-v1";kind:null;values:{};sources:{}};
