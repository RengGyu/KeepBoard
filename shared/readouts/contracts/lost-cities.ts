// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type LostCitiesReadout =
  {schema:"lost-cities-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "suit": string | null; "number": number | null; "investments": boolean | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "suit": FieldBasis | null; "number": FieldBasis | null; "investments": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"lost-cities-v1";kind:"board";values:{"printedName": string | null; "sideLabel": string | null; "selectedSide": string | null; "laneLabel": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "selectedSide": FieldBasis | null; "laneLabel": FieldBasis | null}}
 | {schema:"lost-cities-v1";kind:null;values:{};sources:{}};
