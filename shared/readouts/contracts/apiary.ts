// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type ApiaryReadout =
  {schema:"apiary-v1";kind:"workers";values:{"observedColor": string | null; "strength": number | null; "workerZone": string | null};sources:{"observedColor": FieldBasis | null; "strength": FieldBasis | null; "workerZone": 'user' | null}}
 | {schema:"apiary-v1";kind:"tiles";values:{"face": "front" | "back" | null; "printedName": string | null; "tileType": string | null; "slot": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "tileType": FieldBasis | null; "slot": 'user' | null}}
 | {schema:"apiary-v1";kind:"goods";values:{"observedColor": string | null; "resourceType": string | null; "displayValue": number | null};sources:{"observedColor": FieldBasis | null; "resourceType": FieldBasis | null; "displayValue": FieldBasis | null}}
 | {schema:"apiary-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "useState": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "useState": 'user' | null}}
 | {schema:"apiary-v1";kind:null;values:{};sources:{}};
