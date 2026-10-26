// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type ExpeditionsReadout =
  {schema:"expeditions-v1";kind:"tiles";values:{"face": "front" | "back" | null; "printedName": string | null; "locationLabel": string | null; "corruption": number | null; "connection": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "locationLabel": FieldBasis | null; "corruption": FieldBasis | null; "connection": 'user' | null}}
 | {schema:"expeditions-v1";kind:"mechs";values:{"observedColor": string | null; "mechType": string | null; "workerType": string | null; "location": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "mechType": FieldBasis | null; "workerType": FieldBasis | null; "location": 'user' | null; "owner": 'user' | null}}
 | {schema:"expeditions-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardArea": string | null; "upgradeState": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardArea": 'user' | null; "upgradeState": 'user' | null}}
 | {schema:"expeditions-v1";kind:"markers";values:{"observedColor": string | null; "markerType": string | null; "displayValue": number | null};sources:{"observedColor": FieldBasis | null; "markerType": FieldBasis | null; "displayValue": FieldBasis | null}}
 | {schema:"expeditions-v1";kind:null;values:{};sources:{}};
