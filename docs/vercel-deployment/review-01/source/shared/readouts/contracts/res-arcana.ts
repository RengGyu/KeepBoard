// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type ResArcanaReadout =
  {schema:"res-arcana-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardArea": string | null; "useState": string | null; "storedEssences": SymbolValue[] | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardArea": 'user' | null; "useState": 'user' | null; "storedEssences": FieldBasis | null}}
 | {schema:"res-arcana-v1";kind:"places";values:{"face": "front" | "back" | null; "printedName": string | null; "tileType": string | null; "selectedSide": string | null; "useState": string | null; "storedEssences": SymbolValue[] | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "tileType": FieldBasis | null; "selectedSide": FieldBasis | null; "useState": 'user' | null; "storedEssences": FieldBasis | null}}
 | {schema:"res-arcana-v1";kind:"essences";values:{"observedColor": string | null; "essenceType": string | null; "target": string | null};sources:{"observedColor": FieldBasis | null; "essenceType": FieldBasis | null; "target": 'user' | null}}
 | {schema:"res-arcana-v1";kind:null;values:{};sources:{}};
