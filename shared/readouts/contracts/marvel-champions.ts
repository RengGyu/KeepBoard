// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type MarvelChampionsReadout =
  {schema:"marvel-champions-v1";kind:"identities";values:{"face": "front" | "back" | null; "printedName": string | null; "identitySide": string | null; "stage": number | null; "health": number | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "identitySide": FieldBasis | null; "stage": FieldBasis | null; "health": FieldBasis | null}}
 | {schema:"marvel-champions-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "exhaustion": string | null; "parent": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "exhaustion": 'user' | null; "parent": 'user' | null}}
 | {schema:"marvel-champions-v1";kind:"tokens";values:{"observedColor": string | null; "tokenType": string | null; "nominalValue": number | null; "target": string | null};sources:{"observedColor": FieldBasis | null; "tokenType": FieldBasis | null; "nominalValue": FieldBasis | null; "target": 'user' | null}}
 | {schema:"marvel-champions-v1";kind:null;values:{};sources:{}};
