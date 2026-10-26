// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type DavinciCodeReadout =
  {schema:"davinci-code-v1";kind:"tiles";values:{"face": "front" | "back" | null; "printedName": string | null; "tileColor": string | null; "number": number | null; "position": number | null; "revealed": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "tileColor": FieldBasis | null; "number": FieldBasis | null; "position": 'user' | null; "revealed": 'user' | null}}
 | {schema:"davinci-code-v1";kind:null;values:{};sources:{}};
