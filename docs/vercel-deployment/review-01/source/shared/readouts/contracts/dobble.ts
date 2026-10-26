// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type DobbleReadout =
  {schema:"dobble-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "visibleSymbols": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "visibleSymbols": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"dobble-v1";kind:null;values:{};sources:{}};
