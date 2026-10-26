// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type StoneAgeReadout =
  {schema:"stone-age-v1";kind:"workers";values:{"observedColor": string | null; "workerZone": string | null; "actionSlot": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "workerZone": 'user' | null; "actionSlot": 'user' | null; "owner": 'user' | null}}
 | {schema:"stone-age-v1";kind:"goods";values:{"observedColor": string | null; "goodsType": string | null; "toolValue": number | null};sources:{"observedColor": FieldBasis | null; "goodsType": FieldBasis | null; "toolValue": FieldBasis | null}}
 | {schema:"stone-age-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardArea": string | null; "printedSymbols": SymbolValue[] | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardArea": 'user' | null; "printedSymbols": FieldBasis | null}}
 | {schema:"stone-age-v1";kind:"dice";values:{"observedColor": string | null; "dieValue": number | null; "toolUsed": string | null; "resolution": string | null};sources:{"observedColor": FieldBasis | null; "dieValue": FieldBasis | null; "toolUsed": 'user' | null; "resolution": 'user' | null}}
 | {schema:"stone-age-v1";kind:null;values:{};sources:{}};
