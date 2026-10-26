// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type SpiritIslandReadout =
  {schema:"spirit-island-v1";kind:"lands";values:{"printedName": string | null; "sideLabel": string | null; "moduleLabel": string | null; "landNumber": number | null; "location": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "moduleLabel": FieldBasis | null; "landNumber": FieldBasis | null; "location": 'user' | null}}
 | {schema:"spirit-island-v1";kind:"figures";values:{"observedColor": string | null; "figureType": string | null; "spirit": string | null; "land": string | null};sources:{"observedColor": FieldBasis | null; "figureType": FieldBasis | null; "spirit": 'user' | null; "land": 'user' | null}}
 | {schema:"spirit-island-v1";kind:"markers";values:{"observedColor": string | null; "markerType": string | null; "markerZone": string | null};sources:{"observedColor": FieldBasis | null; "markerType": FieldBasis | null; "markerZone": 'user' | null}}
 | {schema:"spirit-island-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"spirit-island-v1";kind:null;values:{};sources:{}};
