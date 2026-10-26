// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type ClankCatacombsReadout =
  {schema:"clank-catacombs-v1";kind:"tiles";values:{"face": "front" | "back" | null; "printedName": string | null; "tileLabel": string | null; "rooms": string | null; "location": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "tileLabel": FieldBasis | null; "rooms": FieldBasis | null; "location": 'user' | null}}
 | {schema:"clank-catacombs-v1";kind:"pawns";values:{"observedColor": string | null; "pieceType": string | null; "location": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "pieceType": FieldBasis | null; "location": 'user' | null; "owner": 'user' | null}}
 | {schema:"clank-catacombs-v1";kind:"cubes";values:{"observedColor": string | null; "cubeZone": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "cubeZone": 'user' | null; "owner": 'user' | null}}
 | {schema:"clank-catacombs-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardArea": string | null; "cardType": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardArea": 'user' | null; "cardType": FieldBasis | null}}
 | {schema:"clank-catacombs-v1";kind:null;values:{};sources:{}};
