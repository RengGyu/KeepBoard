// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type GalaxyTruckerReadout =
  {schema:"galaxy-trucker-v1";kind:"ships";values:{"face": "front" | "back" | null; "printedName": string | null; "partLabel": string | null; "connectorShape": string | null; "cell": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "partLabel": FieldBasis | null; "connectorShape": FieldBasis | null; "cell": 'user' | null}}
 | {schema:"galaxy-trucker-v1";kind:"contents";values:{"observedColor": string | null; "contentType": string | null; "parentSlot": string | null};sources:{"observedColor": FieldBasis | null; "contentType": FieldBasis | null; "parentSlot": 'user' | null}}
 | {schema:"galaxy-trucker-v1";kind:"flight";values:{"face": "front" | "back" | null; "printedName": string | null; "trackPosition": number | null; "currentAdventure": string | null; "remainingEffect": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "trackPosition": FieldBasis | null; "currentAdventure": FieldBasis | null; "remainingEffect": 'user' | null}}
 | {schema:"galaxy-trucker-v1";kind:"credits";values:{"observedColor": string | null; "itemType": string | null; "nominalValue": number | null};sources:{"observedColor": FieldBasis | null; "itemType": FieldBasis | null; "nominalValue": FieldBasis | null}}
 | {schema:"galaxy-trucker-v1";kind:null;values:{};sources:{}};
