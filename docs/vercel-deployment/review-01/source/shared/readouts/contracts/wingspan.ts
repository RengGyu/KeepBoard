// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type WingspanReadout =
  {schema:"wingspan-v1";kind:"birds";values:{"face": "front" | "back" | null; "printedName": string | null; "habitat": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "habitat": 'user' | null; "cardArea": 'user' | null}}
 | {schema:"wingspan-v1";kind:"eggs";values:{"observedColor": string | null; "targetBird": string | null; "eggColor": string | null};sources:{"observedColor": FieldBasis | null; "targetBird": 'user' | null; "eggColor": FieldBasis | null}}
 | {schema:"wingspan-v1";kind:"food";values:{"observedColor": string | null; "itemType": string | null; "foodSymbol": string | null; "foodZone": string | null};sources:{"observedColor": FieldBasis | null; "itemType": FieldBasis | null; "foodSymbol": FieldBasis | null; "foodZone": 'user' | null}}
 | {schema:"wingspan-v1";kind:"goals";values:{"face": "front" | "back" | null; "printedName": string | null; "goalType": string | null; "selectedSide": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "goalType": FieldBasis | null; "selectedSide": FieldBasis | null}}
 | {schema:"wingspan-v1";kind:"actions";values:{"observedColor": string | null; "cubeZone": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "cubeZone": 'user' | null; "owner": 'user' | null}}
 | {schema:"wingspan-v1";kind:null;values:{};sources:{}};
