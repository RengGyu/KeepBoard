// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type AkropolisReadout =
  {schema:"akropolis-v1";kind:"tiles";values:{"face": "front" | "back" | null; "printedName": string | null; "district": string | null; "shape": string | null; "height": number | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "district": FieldBasis | null; "shape": FieldBasis | null; "height": 'user' | null}}
 | {schema:"akropolis-v1";kind:"stones";values:{"observedColor": string | null; "itemType": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "itemType": FieldBasis | null; "owner": 'user' | null}}
 | {schema:"akropolis-v1";kind:null;values:{};sources:{}};
