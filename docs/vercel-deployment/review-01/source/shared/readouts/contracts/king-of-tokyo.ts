// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type KingOfTokyoReadout =
  {schema:"king-of-tokyo-v1";kind:"monsters";values:{"observedColor": string | null; "monster": string | null; "health": number | null; "points": number | null; "tokyo": string | null};sources:{"observedColor": FieldBasis | null; "monster": FieldBasis | null; "health": FieldBasis | null; "points": FieldBasis | null; "tokyo": 'user' | null}}
 | {schema:"king-of-tokyo-v1";kind:"dice";values:{"observedColor": string | null; "dieSymbol": string | null; "kept": string | null};sources:{"observedColor": FieldBasis | null; "dieSymbol": FieldBasis | null; "kept": 'user' | null}}
 | {schema:"king-of-tokyo-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "printedCost": number | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "printedCost": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"king-of-tokyo-v1";kind:"energy";values:{"observedColor": string | null; "energyZone": string | null; "target": string | null};sources:{"observedColor": FieldBasis | null; "energyZone": 'user' | null; "target": 'user' | null}}
 | {schema:"king-of-tokyo-v1";kind:null;values:{};sources:{}};
