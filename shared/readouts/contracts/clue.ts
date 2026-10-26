// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type ClueReadout =
  {schema:"clue-v1";kind:"board";values:{"printedName": string | null; "sideLabel": string | null; "room": string | null; "passage": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "room": FieldBasis | null; "passage": FieldBasis | null}}
 | {schema:"clue-v1";kind:"figures";values:{"observedColor": string | null; "character": string | null; "location": string | null};sources:{"observedColor": FieldBasis | null; "character": FieldBasis | null; "location": 'user' | null}}
 | {schema:"clue-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "visibleTitle": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "visibleTitle": FieldBasis | null}}
 | {schema:"clue-v1";kind:"notes";values:{"observedColor": string | null; "recordType": string | null; "dieValue": number | null; "deduction": string | null};sources:{"observedColor": FieldBasis | null; "recordType": 'user' | null; "dieValue": FieldBasis | null; "deduction": 'user' | null}}
 | {schema:"clue-v1";kind:null;values:{};sources:{}};
