// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type MachiKoroReadout =
  {schema:"machi-koro-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "activationNumber": string | null; "cardColor": string | null; "landmarkState": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "activationNumber": FieldBasis | null; "cardColor": FieldBasis | null; "landmarkState": 'user' | null}}
 | {schema:"machi-koro-v1";kind:"coins";values:{"observedColor": string | null; "nominalValue": 1 | 5 | 10 | null};sources:{"observedColor": FieldBasis | null; "nominalValue": FieldBasis | null}}
 | {schema:"machi-koro-v1";kind:"dice";values:{"observedColor": string | null; "dieValue": number | null; "used": string | null};sources:{"observedColor": FieldBasis | null; "dieValue": FieldBasis | null; "used": 'user' | null}}
 | {schema:"machi-koro-v1";kind:null;values:{};sources:{}};
