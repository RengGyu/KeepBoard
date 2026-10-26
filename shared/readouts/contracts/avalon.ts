// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type AvalonReadout =
  {schema:"avalon-v1";kind:"roles";values:{"face": "front" | "back" | null; "printedName": string | null; "visibleRoleLabel": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "visibleRoleLabel": FieldBasis | null}}
 | {schema:"avalon-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "revealedResult": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "revealedResult": FieldBasis | null}}
 | {schema:"avalon-v1";kind:"markers";values:{"observedColor": string | null; "markerType": string | null; "displayValue": number | null; "linkedPlayer": string | null};sources:{"observedColor": FieldBasis | null; "markerType": FieldBasis | null; "displayValue": FieldBasis | null; "linkedPlayer": 'user' | null}}
 | {schema:"avalon-v1";kind:null;values:{};sources:{}};
