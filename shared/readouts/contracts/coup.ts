// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type CoupReadout =
  {schema:"coup-v1";kind:"roles";values:{"face": "front" | "back" | null; "printedName": string | null; "visibleRole": string | null; "roleState": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "visibleRole": FieldBasis | null; "roleState": 'user' | null}}
 | {schema:"coup-v1";kind:"coins";values:{"observedColor": string | null; "nominalValue": number | null; "coinZone": string | null};sources:{"observedColor": FieldBasis | null; "nominalValue": FieldBasis | null; "coinZone": 'user' | null}}
 | {schema:"coup-v1";kind:null;values:{};sources:{}};
