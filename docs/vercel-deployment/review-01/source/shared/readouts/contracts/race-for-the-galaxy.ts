// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type RaceForTheGalaxyReadout =
  {schema:"race-for-the-galaxy-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "cardArea": string | null; "goodsTarget": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "cardArea": 'user' | null; "goodsTarget": 'user' | null}}
 | {schema:"race-for-the-galaxy-v1";kind:"points";values:{"observedColor": string | null; "nominalValue": 1 | 5 | 10 | null; "chipZone": string | null};sources:{"observedColor": FieldBasis | null; "nominalValue": FieldBasis | null; "chipZone": 'user' | null}}
 | {schema:"race-for-the-galaxy-v1";kind:null;values:{};sources:{}};
