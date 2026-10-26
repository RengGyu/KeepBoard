// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type CrewDeepSeaReadout =
  {schema:"crew-deep-sea-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "suit": string | null; "number": number | null; "cardType": string | null; "assignee": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "suit": FieldBasis | null; "number": FieldBasis | null; "cardType": FieldBasis | null; "assignee": 'user' | null}}
 | {schema:"crew-deep-sea-v1";kind:"tokens";values:{"observedColor": string | null; "tokenType": string | null; "communication": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "tokenType": FieldBasis | null; "communication": 'user' | null; "owner": 'user' | null}}
 | {schema:"crew-deep-sea-v1";kind:"log";values:{"printedName": string | null; "sideLabel": string | null; "mission": string | null; "attempts": number | null; "difficulty": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "mission": FieldBasis | null; "attempts": 'user' | null; "difficulty": 'user' | null}}
 | {schema:"crew-deep-sea-v1";kind:null;values:{};sources:{}};
