// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type SetiReadout =
  {schema:"seti-v1";kind:"system";values:{"printedName": string | null; "sideLabel": string | null; "layerLabel": string | null; "sectorLabel": string | null; "rotationState": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "layerLabel": FieldBasis | null; "sectorLabel": FieldBasis | null; "rotationState": 'user' | null}}
 | {schema:"seti-v1";kind:"probes";values:{"observedColor": string | null; "role": "probe" | "orbiter" | "lander" | null; "parentSpace": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "role": 'user' | null; "parentSpace": 'user' | null; "owner": 'user' | null}}
 | {schema:"seti-v1";kind:"technology";values:{"observedColor": string | null; "itemType": string | null; "slot": string | null; "technologyState": string | null};sources:{"observedColor": FieldBasis | null; "itemType": FieldBasis | null; "slot": 'user' | null; "technologyState": 'user' | null}}
 | {schema:"seti-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"seti-v1";kind:"resources";values:{"observedColor": string | null; "resourceType": string | null; "displayValue": number | null};sources:{"observedColor": FieldBasis | null; "resourceType": FieldBasis | null; "displayValue": FieldBasis | null}}
 | {schema:"seti-v1";kind:null;values:{};sources:{}};
