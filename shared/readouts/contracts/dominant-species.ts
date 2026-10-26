// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type DominantSpeciesReadout =
  {schema:"dominant-species-v1";kind:"earth";values:{"face": "front" | "back" | null; "printedName": string | null; "terrain": string | null; "overlay": string | null; "location": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "terrain": FieldBasis | null; "overlay": FieldBasis | null; "location": 'user' | null}}
 | {schema:"dominant-species-v1";kind:"animals";values:{"observedColor": string | null; "pieceType": string | null; "species": string | null; "location": string | null};sources:{"observedColor": FieldBasis | null; "pieceType": FieldBasis | null; "species": FieldBasis | null; "location": 'user' | null}}
 | {schema:"dominant-species-v1";kind:"elements";values:{"observedColor": string | null; "elementType": string | null; "junction": string | null};sources:{"observedColor": FieldBasis | null; "elementType": FieldBasis | null; "junction": 'user' | null}}
 | {schema:"dominant-species-v1";kind:"actions";values:{"observedColor": string | null; "itemType": string | null; "actionSlot": string | null; "useState": string | null};sources:{"observedColor": FieldBasis | null; "itemType": FieldBasis | null; "actionSlot": 'user' | null; "useState": 'user' | null}}
 | {schema:"dominant-species-v1";kind:null;values:{};sources:{}};
