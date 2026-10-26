// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type SpaceBaseReadout =
  {schema:"space-base-v1";kind:"ships";values:{"face": "front" | "back" | null; "printedName": string | null; "sectorNumber": number | null; "mode": string | null; "underCard": string | null; "visibleAbility": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "sectorNumber": FieldBasis | null; "mode": 'user' | null; "underCard": 'user' | null; "visibleAbility": FieldBasis | null}}
 | {schema:"space-base-v1";kind:"markers";values:{"observedColor": string | null; "markerType": string | null; "displayValue": number | null; "targetCard": string | null};sources:{"observedColor": FieldBasis | null; "markerType": FieldBasis | null; "displayValue": FieldBasis | null; "targetCard": 'user' | null}}
 | {schema:"space-base-v1";kind:"dice";values:{"observedColor": string | null; "dieValue": number | null; "modifiedResult": string | null};sources:{"observedColor": FieldBasis | null; "dieValue": FieldBasis | null; "modifiedResult": 'user' | null}}
 | {schema:"space-base-v1";kind:null;values:{};sources:{}};
