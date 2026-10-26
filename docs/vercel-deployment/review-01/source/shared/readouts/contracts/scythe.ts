// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type ScytheReadout =
  {schema:"scythe-v1";kind:"units";values:{"observedColor": string | null; "unitType": string | null; "owner": string | null; "location": string | null; "transport": string | null};sources:{"observedColor": FieldBasis | null; "unitType": FieldBasis | null; "owner": 'user' | null; "location": 'user' | null; "transport": 'user' | null}}
 | {schema:"scythe-v1";kind:"resources";values:{"observedColor": string | null; "resourceType": string | null; "territory": string | null};sources:{"observedColor": FieldBasis | null; "resourceType": FieldBasis | null; "territory": 'user' | null}}
 | {schema:"scythe-v1";kind:"buildings";values:{"observedColor": string | null; "itemType": string | null; "origin": string | null; "location": string | null};sources:{"observedColor": FieldBasis | null; "itemType": FieldBasis | null; "origin": 'user' | null; "location": 'user' | null}}
 | {schema:"scythe-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"scythe-v1";kind:"tracks";values:{"observedColor": string | null; "trackType": string | null; "displayValue": number | null; "starMeaning": string | null};sources:{"observedColor": FieldBasis | null; "trackType": FieldBasis | null; "displayValue": FieldBasis | null; "starMeaning": 'user' | null}}
 | {schema:"scythe-v1";kind:null;values:{};sources:{}};
