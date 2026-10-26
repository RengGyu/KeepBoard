// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type SixNimmtReadout =
  {schema:"six-nimmt-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "number": number | null; "penaltyIcons": number | null; "rowIndex": number | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "number": FieldBasis | null; "penaltyIcons": FieldBasis | null; "rowIndex": 'user' | null; "cardArea": 'user' | null}}
 | {schema:"six-nimmt-v1";kind:null;values:{};sources:{}};
