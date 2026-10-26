// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type TwilightStruggleReadout =
  {schema:"twilight-struggle-v1";kind:"map";values:{"printedName": string | null; "sideLabel": string | null; "countryLabel": string | null; "regionLabel": string | null; "battleground": string | null; "influence": SymbolValue[] | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "countryLabel": FieldBasis | null; "regionLabel": FieldBasis | null; "battleground": FieldBasis | null; "influence": FieldBasis | null}}
 | {schema:"twilight-struggle-v1";kind:"markers";values:{"observedColor": string | null; "trackType": string | null; "faction": string | null; "displayValue": number | null};sources:{"observedColor": FieldBasis | null; "trackType": FieldBasis | null; "faction": FieldBasis | null; "displayValue": FieldBasis | null}}
 | {schema:"twilight-struggle-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardArea": string | null; "persistentEffect": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardArea": 'user' | null; "persistentEffect": 'user' | null}}
 | {schema:"twilight-struggle-v1";kind:null;values:{};sources:{}};
