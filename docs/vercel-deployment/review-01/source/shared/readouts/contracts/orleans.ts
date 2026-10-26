// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type OrleansReadout =
  {schema:"orleans-v1";kind:"followers";values:{"observedColor": string | null; "profession": string | null; "followerZone": string | null};sources:{"observedColor": FieldBasis | null; "profession": FieldBasis | null; "followerZone": 'user' | null}}
 | {schema:"orleans-v1";kind:"network";values:{"observedColor": string | null; "itemType": string | null; "location": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "itemType": FieldBasis | null; "location": 'user' | null; "owner": 'user' | null}}
 | {schema:"orleans-v1";kind:"development";values:{"face": "front" | "back" | null; "printedName": string | null; "itemType": string | null; "slot": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "itemType": FieldBasis | null; "slot": 'user' | null}}
 | {schema:"orleans-v1";kind:"events";values:{"face": "front" | "back" | null; "printedName": string | null; "eventLabel": string | null; "trackValue": number | null; "eventState": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "eventLabel": FieldBasis | null; "trackValue": FieldBasis | null; "eventState": 'user' | null}}
 | {schema:"orleans-v1";kind:null;values:{};sources:{}};
