// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type HalligalliReadout =
  {schema:"halligalli-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "fruit": string | null; "fruitCount": number | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "fruit": FieldBasis | null; "fruitCount": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"halligalli-v1";kind:"bell";values:{"observedColor": string | null; "bellLocation": string | null; "pendingReaction": string | null};sources:{"observedColor": FieldBasis | null; "bellLocation": 'user' | null; "pendingReaction": 'user' | null}}
 | {schema:"halligalli-v1";kind:null;values:{};sources:{}};
