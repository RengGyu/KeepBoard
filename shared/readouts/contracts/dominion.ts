// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type DominionReadout =
  {schema:"dominion-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"dominion-v1";kind:"zones";values:{"observedColor": string | null; "zoneRole": string | null; "resolved": string | null};sources:{"observedColor": FieldBasis | null; "zoneRole": 'user' | null; "resolved": 'user' | null}}
 | {schema:"dominion-v1";kind:null;values:{};sources:{}};
