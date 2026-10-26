// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type WyrmspanReadout =
  {schema:"wyrmspan-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "cardArea": string | null; "target": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "cardArea": 'user' | null; "target": 'user' | null}}
 | {schema:"wyrmspan-v1";kind:"markers";values:{"observedColor": string | null; "markerType": string | null; "position": string | null; "displayValue": number | null};sources:{"observedColor": FieldBasis | null; "markerType": FieldBasis | null; "position": 'user' | null; "displayValue": FieldBasis | null}}
 | {schema:"wyrmspan-v1";kind:"resources";values:{"observedColor": string | null; "resourceType": "egg" | "coin" | "meat" | "gold" | "crystal" | "milk" | null; "storage": string | null; "targetCard": string | null};sources:{"observedColor": FieldBasis | null; "resourceType": FieldBasis | null; "storage": 'user' | null; "targetCard": 'user' | null}}
 | {schema:"wyrmspan-v1";kind:null;values:{};sources:{}};
