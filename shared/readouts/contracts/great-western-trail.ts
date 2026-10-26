// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type GreatWesternTrailReadout =
  {schema:"great-western-trail-v1";kind:"cattle";values:{"face": "front" | "back" | null; "printedName": string | null; "breed": string | null; "printedValue": number | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "breed": FieldBasis | null; "printedValue": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"great-western-trail-v1";kind:"pieces";values:{"observedColor": string | null; "pieceType": string | null; "owner": string | null; "location": string | null};sources:{"observedColor": FieldBasis | null; "pieceType": FieldBasis | null; "owner": 'user' | null; "location": 'user' | null}}
 | {schema:"great-western-trail-v1";kind:"tiles";values:{"face": "front" | "back" | null; "printedName": string | null; "tileType": string | null; "location": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "tileType": FieldBasis | null; "location": 'user' | null}}
 | {schema:"great-western-trail-v1";kind:"money";values:{"observedColor": string | null; "itemType": string | null; "nominalValue": number | null; "displayValue": number | null};sources:{"observedColor": FieldBasis | null; "itemType": FieldBasis | null; "nominalValue": FieldBasis | null; "displayValue": FieldBasis | null}}
 | {schema:"great-western-trail-v1";kind:null;values:{};sources:{}};
