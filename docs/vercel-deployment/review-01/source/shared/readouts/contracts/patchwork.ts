// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type PatchworkReadout =
  {schema:"patchwork-v1";kind:"patches";values:{"face": "front" | "back" | null; "printedName": string | null; "shape": string | null; "reflected": boolean | null; "buttonIncome": number | null; "timeCost": number | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "shape": FieldBasis | null; "reflected": 'user' | null; "buttonIncome": FieldBasis | null; "timeCost": FieldBasis | null}}
 | {schema:"patchwork-v1";kind:"buttons";values:{"observedColor": string | null; "nominalValue": number | null; "buttonZone": string | null};sources:{"observedColor": FieldBasis | null; "nominalValue": FieldBasis | null; "buttonZone": 'user' | null}}
 | {schema:"patchwork-v1";kind:"markers";values:{"observedColor": string | null; "markerType": string | null; "trackPosition": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "markerType": FieldBasis | null; "trackPosition": 'user' | null; "owner": 'user' | null}}
 | {schema:"patchwork-v1";kind:null;values:{};sources:{}};
