// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type PandemicReadout =
  {schema:"pandemic-v1";kind:"pieces";values:{"observedColor": string | null; "pieceType": string | null; "location": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "pieceType": FieldBasis | null; "location": 'user' | null; "owner": 'user' | null}}
 | {schema:"pandemic-v1";kind:"disease";values:{"observedColor": string | null; "diseaseColor": string | null; "markerType": string | null; "shownSide": string | null};sources:{"observedColor": FieldBasis | null; "diseaseColor": FieldBasis | null; "markerType": FieldBasis | null; "shownSide": FieldBasis | null}}
 | {schema:"pandemic-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"pandemic-v1";kind:null;values:{};sources:{}};
