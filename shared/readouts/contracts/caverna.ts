// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type CavernaReadout =
  {schema:"caverna-v1";kind:"tiles";values:{"face": "front" | "back" | null; "printedName": string | null; "tileType": string | null; "gridCell": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "tileType": FieldBasis | null; "gridCell": 'user' | null}}
 | {schema:"caverna-v1";kind:"dwarfs";values:{"observedColor": string | null; "weaponValue": number | null; "actionSlot": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "weaponValue": FieldBasis | null; "actionSlot": 'user' | null; "owner": 'user' | null}}
 | {schema:"caverna-v1";kind:"goods";values:{"observedColor": string | null; "goodsType": string | null; "goodsZone": string | null};sources:{"observedColor": FieldBasis | null; "goodsType": FieldBasis | null; "goodsZone": 'user' | null}}
 | {schema:"caverna-v1";kind:null;values:{};sources:{}};
