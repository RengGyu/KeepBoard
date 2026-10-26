// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type AgricolaReadout =
  {schema:"agricola-v1";kind:"farm";values:{"face": "front" | "back" | null; "printedName": string | null; "spaceType": string | null; "houseMaterial": string | null; "gridCell": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "spaceType": FieldBasis | null; "houseMaterial": FieldBasis | null; "gridCell": 'user' | null}}
 | {schema:"agricola-v1";kind:"people";values:{"observedColor": string | null; "pieceType": string | null; "owner": string | null; "actionSlot": string | null};sources:{"observedColor": FieldBasis | null; "pieceType": FieldBasis | null; "owner": 'user' | null; "actionSlot": 'user' | null}}
 | {schema:"agricola-v1";kind:"goods";values:{"observedColor": string | null; "resourceType": string | null; "storage": string | null};sources:{"observedColor": FieldBasis | null; "resourceType": FieldBasis | null; "storage": 'user' | null}}
 | {schema:"agricola-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "useState": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "useState": 'user' | null}}
 | {schema:"agricola-v1";kind:null;values:{};sources:{}};
