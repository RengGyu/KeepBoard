// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type AzulReadout =
  {schema:"azul-v1";kind:"tiles";values:{"face": "front" | "back" | null; "printedName": string | null; "tileColor": string | null; "tileZone": string | null; "rowIndex": number | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "tileColor": FieldBasis | null; "tileZone": 'user' | null; "rowIndex": 'user' | null}}
 | {schema:"azul-v1";kind:"boards";values:{"printedName": string | null; "sideLabel": string | null; "boardSide": string | null; "factoryLabel": string | null; "scoreTrack": number | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "boardSide": FieldBasis | null; "factoryLabel": FieldBasis | null; "scoreTrack": FieldBasis | null}}
 | {schema:"azul-v1";kind:"first";values:{"observedColor": string | null; "tokenLabel": string | null; "tokenZone": string | null};sources:{"observedColor": FieldBasis | null; "tokenLabel": FieldBasis | null; "tokenZone": 'user' | null}}
 | {schema:"azul-v1";kind:"score";values:{"observedColor": string | null; "trackValue": number | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "trackValue": FieldBasis | null; "owner": 'user' | null}}
 | {schema:"azul-v1";kind:null;values:{};sources:{}};
