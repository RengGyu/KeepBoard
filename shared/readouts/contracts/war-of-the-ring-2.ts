// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type WarOfTheRing2Readout =
  {schema:"war-of-the-ring-2-v1";kind:"armies";values:{"observedColor": string | null; "faction": string | null; "unitType": string | null; "location": string | null};sources:{"observedColor": FieldBasis | null; "faction": FieldBasis | null; "unitType": FieldBasis | null; "location": 'user' | null}}
 | {schema:"war-of-the-ring-2-v1";kind:"dice";values:{"observedColor": string | null; "dieSymbol": string | null; "dieZone": string | null};sources:{"observedColor": FieldBasis | null; "dieSymbol": FieldBasis | null; "dieZone": 'user' | null}}
 | {schema:"war-of-the-ring-2-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"war-of-the-ring-2-v1";kind:"markers";values:{"observedColor": string | null; "markerType": string | null; "shownSide": string | null; "displayValue": number | null; "target": string | null};sources:{"observedColor": FieldBasis | null; "markerType": FieldBasis | null; "shownSide": FieldBasis | null; "displayValue": FieldBasis | null; "target": 'user' | null}}
 | {schema:"war-of-the-ring-2-v1";kind:null;values:{};sources:{}};
