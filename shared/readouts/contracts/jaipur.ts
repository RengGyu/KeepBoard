// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type JaipurReadout =
  {schema:"jaipur-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "goodsType": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "goodsType": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"jaipur-v1";kind:"tokens";values:{"observedColor": string | null; "tokenType": string | null; "printedValue": number | null; "supplyPosition": string | null};sources:{"observedColor": FieldBasis | null; "tokenType": FieldBasis | null; "printedValue": FieldBasis | null; "supplyPosition": 'user' | null}}
 | {schema:"jaipur-v1";kind:null;values:{};sources:{}};
