// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type CastlesBurgundyReadout =
  {schema:"castles-burgundy-v1";kind:"hexes";values:{"face": "front" | "back" | null; "printedName": string | null; "hexType": string | null; "tileColor": string | null; "cell": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "hexType": FieldBasis | null; "tileColor": FieldBasis | null; "cell": 'user' | null}}
 | {schema:"castles-burgundy-v1";kind:"goods";values:{"face": "front" | "back" | null; "printedName": string | null; "goodsType": string | null; "goodsZone": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "goodsType": FieldBasis | null; "goodsZone": 'user' | null}}
 | {schema:"castles-burgundy-v1";kind:"dice";values:{"observedColor": string | null; "dieValue": number | null; "used": string | null};sources:{"observedColor": FieldBasis | null; "dieValue": FieldBasis | null; "used": 'user' | null}}
 | {schema:"castles-burgundy-v1";kind:"money";values:{"observedColor": string | null; "itemType": string | null; "trackValue": number | null};sources:{"observedColor": FieldBasis | null; "itemType": FieldBasis | null; "trackValue": FieldBasis | null}}
 | {schema:"castles-burgundy-v1";kind:null;values:{};sources:{}};
