// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type CodenamesReadout =
  {schema:"codenames-v1";kind:"words";values:{"face": "front" | "back" | null; "printedName": string | null; "word": string | null; "row": number | null; "column": number | null; "revealed": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "word": FieldBasis | null; "row": 'user' | null; "column": 'user' | null; "revealed": 'user' | null}}
 | {schema:"codenames-v1";kind:"key";values:{"face": "front" | "back" | null; "printedName": string | null; "visiblePattern": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "visiblePattern": FieldBasis | null}}
 | {schema:"codenames-v1";kind:"covers";values:{"face": "front" | "back" | null; "printedName": string | null; "coverType": string | null; "wordTarget": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "coverType": FieldBasis | null; "wordTarget": 'user' | null}}
 | {schema:"codenames-v1";kind:null;values:{};sources:{}};
