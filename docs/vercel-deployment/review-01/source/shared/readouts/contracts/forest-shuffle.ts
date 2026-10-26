// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type ForestShuffleReadout =
  {schema:"forest-shuffle-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "usedSection": "whole" | "top" | "bottom" | "left" | "right" | null; "forestPosition": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "usedSection": 'user' | null; "forestPosition": 'user' | null}}
 | {schema:"forest-shuffle-v1";kind:"cave";values:{"printedName": string | null; "sideLabel": string | null; "areaType": string | null; "storedCount": number | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "areaType": 'user' | null; "storedCount": 'user' | null}}
 | {schema:"forest-shuffle-v1";kind:null;values:{};sources:{}};
