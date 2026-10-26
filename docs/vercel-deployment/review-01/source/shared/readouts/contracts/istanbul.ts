// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type IstanbulReadout =
  {schema:"istanbul-v1";kind:"places";values:{"face": "front" | "back" | null; "printedName": string | null; "placeLabel": string | null; "placeNumber": number | null; "gridCell": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "placeLabel": FieldBasis | null; "placeNumber": FieldBasis | null; "gridCell": 'user' | null}}
 | {schema:"istanbul-v1";kind:"people";values:{"observedColor": string | null; "personType": string | null; "stackLevel": number | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "personType": FieldBasis | null; "stackLevel": 'user' | null; "owner": 'user' | null}}
 | {schema:"istanbul-v1";kind:"goods";values:{"observedColor": string | null; "goodsType": string | null; "cartCapacity": number | null; "displayValue": number | null};sources:{"observedColor": FieldBasis | null; "goodsType": FieldBasis | null; "cartCapacity": FieldBasis | null; "displayValue": FieldBasis | null}}
 | {schema:"istanbul-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "itemType": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "itemType": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"istanbul-v1";kind:null;values:{};sources:{}};
