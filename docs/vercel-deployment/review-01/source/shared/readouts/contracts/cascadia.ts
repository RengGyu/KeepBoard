// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type CascadiaReadout =
  {schema:"cascadia-v1";kind:"habitat";values:{"face": "front" | "back" | null; "printedName": string | null; "habitats": string | null; "wildlifeIcons": string | null; "rotation": number | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "habitats": FieldBasis | null; "wildlifeIcons": FieldBasis | null; "rotation": 'user' | null}}
 | {schema:"cascadia-v1";kind:"wildlife";values:{"observedColor": string | null; "animal": string | null; "targetTile": string | null};sources:{"observedColor": FieldBasis | null; "animal": FieldBasis | null; "targetTile": 'user' | null}}
 | {schema:"cascadia-v1";kind:"scoring";values:{"face": "front" | "back" | null; "printedName": string | null; "animal": string | null; "variantLabel": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "animal": FieldBasis | null; "variantLabel": FieldBasis | null}}
 | {schema:"cascadia-v1";kind:"nature";values:{"observedColor": string | null; "tokenType": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "tokenType": FieldBasis | null; "owner": 'user' | null}}
 | {schema:"cascadia-v1";kind:null;values:{};sources:{}};
