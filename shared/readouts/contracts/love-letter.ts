// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type LoveLetterReadout =
  {schema:"love-letter-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "character": string | null; "number": number | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "character": FieldBasis | null; "number": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"love-letter-v1";kind:"tokens";values:{"observedColor": string | null; "tokenType": string | null; "nominalValue": number | null};sources:{"observedColor": FieldBasis | null; "tokenType": FieldBasis | null; "nominalValue": FieldBasis | null}}
 | {schema:"love-letter-v1";kind:null;values:{};sources:{}};
