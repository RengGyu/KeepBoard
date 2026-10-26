// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type HeatReadout =
  {schema:"heat-v1";kind:"cars";values:{"observedColor": string | null; "carColor": string | null; "gear": number | null; "position": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "carColor": FieldBasis | null; "gear": FieldBasis | null; "position": 'user' | null; "owner": 'user' | null}}
 | {schema:"heat-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "printedNumber": number | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "printedNumber": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"heat-v1";kind:"track";values:{"printedName": string | null; "sideLabel": string | null; "circuit": string | null; "curve": string | null; "direction": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "circuit": FieldBasis | null; "curve": FieldBasis | null; "direction": 'user' | null}}
 | {schema:"heat-v1";kind:null;values:{};sources:{}};
