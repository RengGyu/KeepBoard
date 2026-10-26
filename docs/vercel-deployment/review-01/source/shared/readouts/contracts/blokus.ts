// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type BlokusReadout =
  {schema:"blokus-v1";kind:"board";values:{"printedName": string | null; "sideLabel": string | null; "gridReference": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "gridReference": 'user' | null}}
 | {schema:"blokus-v1";kind:"pieces";values:{"observedColor": string | null; "shape": string | null; "occupiedCells": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "shape": FieldBasis | null; "occupiedCells": 'user' | null; "owner": 'user' | null}}
 | {schema:"blokus-v1";kind:null;values:{};sources:{}};
