// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type SkullReadout =
  {schema:"skull-v1";kind:"discs";values:{"face": "front" | "back" | null; "printedName": string | null; "discType": string | null; "owner": string | null; "stackPosition": number | null; "discArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "discType": FieldBasis | null; "owner": 'user' | null; "stackPosition": 'user' | null; "discArea": 'user' | null}}
 | {schema:"skull-v1";kind:"mats";values:{"printedName": string | null; "sideLabel": string | null; "successSide": string | null; "survival": string | null; "houseRule": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "successSide": FieldBasis | null; "survival": 'user' | null; "houseRule": 'user' | null}}
 | {schema:"skull-v1";kind:null;values:{};sources:{}};
