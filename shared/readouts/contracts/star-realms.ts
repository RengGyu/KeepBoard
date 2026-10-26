// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type StarRealmsReadout =
  {schema:"star-realms-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "cardArea": string | null; "outpost": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "cardArea": 'user' | null; "outpost": FieldBasis | null}}
 | {schema:"star-realms-v1";kind:"authority";values:{"observedColor": string | null; "cardValue": number | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "cardValue": FieldBasis | null; "owner": 'user' | null}}
 | {schema:"star-realms-v1";kind:null;values:{};sources:{}};
