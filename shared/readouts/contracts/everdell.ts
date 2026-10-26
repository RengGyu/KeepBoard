// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type EverdellReadout =
  {schema:"everdell-v1";kind:"workers";values:{"observedColor": string | null; "workerZone": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "workerZone": 'user' | null; "owner": 'user' | null}}
 | {schema:"everdell-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"everdell-v1";kind:"resources";values:{"observedColor": string | null; "resourceType": string | null; "storage": string | null};sources:{"observedColor": FieldBasis | null; "resourceType": FieldBasis | null; "storage": 'user' | null}}
 | {schema:"everdell-v1";kind:"events";values:{"face": "front" | "back" | null; "printedName": string | null; "eventType": string | null; "claimedBy": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "eventType": FieldBasis | null; "claimedBy": 'user' | null}}
 | {schema:"everdell-v1";kind:null;values:{};sources:{}};
