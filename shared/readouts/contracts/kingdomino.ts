// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type KingdominoReadout =
  {schema:"kingdomino-v1";kind:"dominoes";values:{"face": "front" | "back" | null; "printedName": string | null; "firstTerrain": string | null; "firstCrowns": number | null; "secondTerrain": string | null; "secondCrowns": number | null; "tileNumber": number | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "firstTerrain": FieldBasis | null; "firstCrowns": FieldBasis | null; "secondTerrain": FieldBasis | null; "secondCrowns": FieldBasis | null; "tileNumber": FieldBasis | null}}
 | {schema:"kingdomino-v1";kind:"markers";values:{"observedColor": string | null; "markerType": string | null; "selectedRow": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "markerType": FieldBasis | null; "selectedRow": 'user' | null; "owner": 'user' | null}}
 | {schema:"kingdomino-v1";kind:null;values:{};sources:{}};
