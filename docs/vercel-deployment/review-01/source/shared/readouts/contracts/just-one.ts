// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type JustOneReadout =
  {schema:"just-one-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "selectedNumber": number | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "selectedNumber": 'user' | null; "cardArea": 'user' | null}}
 | {schema:"just-one-v1";kind:"boards";values:{"printedName": string | null; "sideLabel": string | null; "writtenWord": string | null; "revealState": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "writtenWord": FieldBasis | null; "revealState": 'user' | null}}
 | {schema:"just-one-v1";kind:null;values:{};sources:{}};
