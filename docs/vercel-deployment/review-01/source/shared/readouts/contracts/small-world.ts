// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type SmallWorldReadout =
  {schema:"small-world-v1";kind:"map";values:{"printedName": string | null; "sideLabel": string | null; "mapLabel": string | null; "regionType": string | null; "regionLabel": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "mapLabel": FieldBasis | null; "regionType": FieldBasis | null; "regionLabel": FieldBasis | null}}
 | {schema:"small-world-v1";kind:"races";values:{"observedColor": string | null; "raceType": string | null; "shownSide": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "raceType": FieldBasis | null; "shownSide": FieldBasis | null; "owner": 'user' | null}}
 | {schema:"small-world-v1";kind:"powers";values:{"observedColor": string | null; "itemType": string | null; "pairedRace": string | null; "location": string | null};sources:{"observedColor": FieldBasis | null; "itemType": FieldBasis | null; "pairedRace": 'user' | null; "location": 'user' | null}}
 | {schema:"small-world-v1";kind:"coins";values:{"observedColor": string | null; "nominalValue": number | null; "coinZone": string | null};sources:{"observedColor": FieldBasis | null; "nominalValue": FieldBasis | null; "coinZone": 'user' | null}}
 | {schema:"small-world-v1";kind:null;values:{};sources:{}};
