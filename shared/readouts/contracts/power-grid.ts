// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type PowerGridReadout =
  {schema:"power-grid-v1";kind:"plants";values:{"face": "front" | "back" | null; "printedName": string | null; "plantNumber": number | null; "fuelType": string | null; "citiesPowered": number | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "plantNumber": FieldBasis | null; "fuelType": FieldBasis | null; "citiesPowered": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"power-grid-v1";kind:"fuel";values:{"observedColor": string | null; "fuelType": string | null; "plantTarget": string | null; "fuelZone": string | null};sources:{"observedColor": FieldBasis | null; "fuelType": FieldBasis | null; "plantTarget": 'user' | null; "fuelZone": 'user' | null}}
 | {schema:"power-grid-v1";kind:"houses";values:{"observedColor": string | null; "cityLabel": string | null; "slot": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "cityLabel": FieldBasis | null; "slot": 'user' | null; "owner": 'user' | null}}
 | {schema:"power-grid-v1";kind:"money";values:{"observedColor": string | null; "nominalValue": number | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "nominalValue": FieldBasis | null; "owner": 'user' | null}}
 | {schema:"power-grid-v1";kind:null;values:{};sources:{}};
