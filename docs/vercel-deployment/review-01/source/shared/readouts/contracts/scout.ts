// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type ScoutReadout =
  {schema:"scout-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "topNumber": number | null; "bottomNumber": number | null; "activeEnd": "top" | "bottom" | null; "handPosition": number | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "topNumber": FieldBasis | null; "bottomNumber": FieldBasis | null; "activeEnd": 'user' | null; "handPosition": 'user' | null}}
 | {schema:"scout-v1";kind:"tokens";values:{"observedColor": string | null; "tokenType": string | null; "nominalValue": number | null; "useState": string | null};sources:{"observedColor": FieldBasis | null; "tokenType": FieldBasis | null; "nominalValue": FieldBasis | null; "useState": 'user' | null}}
 | {schema:"scout-v1";kind:null;values:{};sources:{}};
