// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type CockroachPokerReadout =
  {schema:"cockroach-poker-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "creature": string | null; "claimedCreature": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "creature": FieldBasis | null; "claimedCreature": 'user' | null; "cardArea": 'user' | null}}
 | {schema:"cockroach-poker-v1";kind:null;values:{};sources:{}};
