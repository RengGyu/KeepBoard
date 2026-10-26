// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type ThroughTheAgesReadout =
  {schema:"through-the-ages-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "cardArea": string | null; "construction": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "cardArea": 'user' | null; "construction": 'user' | null}}
 | {schema:"through-the-ages-v1";kind:"cubes";values:{"observedColor": string | null; "cubeType": string | null; "pool": string | null};sources:{"observedColor": FieldBasis | null; "cubeType": FieldBasis | null; "pool": 'user' | null}}
 | {schema:"through-the-ages-v1";kind:"boards";values:{"printedName": string | null; "sideLabel": string | null; "trackType": string | null; "displayValue": number | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "trackType": FieldBasis | null; "displayValue": FieldBasis | null}}
 | {schema:"through-the-ages-v1";kind:null;values:{};sources:{}};
