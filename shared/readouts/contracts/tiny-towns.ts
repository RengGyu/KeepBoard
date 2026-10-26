// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type TinyTownsReadout =
  {schema:"tiny-towns-v1";kind:"resources";values:{"observedColor": string | null; "resourceType": string | null; "cell": string | null};sources:{"observedColor": FieldBasis | null; "resourceType": FieldBasis | null; "cell": 'user' | null}}
 | {schema:"tiny-towns-v1";kind:"buildings";values:{"observedColor": string | null; "buildingType": string | null; "cell": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "buildingType": FieldBasis | null; "cell": 'user' | null; "owner": 'user' | null}}
 | {schema:"tiny-towns-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "pattern": string | null; "selected": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "pattern": FieldBasis | null; "selected": 'user' | null}}
 | {schema:"tiny-towns-v1";kind:"hammer";values:{"observedColor": string | null; "holder": string | null};sources:{"observedColor": FieldBasis | null; "holder": 'user' | null}}
 | {schema:"tiny-towns-v1";kind:null;values:{};sources:{}};
