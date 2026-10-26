// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type TapestryReadout =
  {schema:"tapestry-v1";kind:"buildings";values:{"observedColor": string | null; "buildingType": string | null; "buildingZone": string | null; "cell": string | null};sources:{"observedColor": FieldBasis | null; "buildingType": FieldBasis | null; "buildingZone": 'user' | null; "cell": 'user' | null}}
 | {schema:"tapestry-v1";kind:"tiles";values:{"printedName": string | null; "sideLabel": string | null; "tileType": string | null; "editionMark": string | null; "cell": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "tileType": FieldBasis | null; "editionMark": FieldBasis | null; "cell": 'user' | null}}
 | {schema:"tapestry-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "cardArea": string | null; "stage": number | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "cardArea": 'user' | null; "stage": 'user' | null}}
 | {schema:"tapestry-v1";kind:"markers";values:{"observedColor": string | null; "trackType": string | null; "displayValue": number | null};sources:{"observedColor": FieldBasis | null; "trackType": FieldBasis | null; "displayValue": FieldBasis | null}}
 | {schema:"tapestry-v1";kind:null;values:{};sources:{}};
