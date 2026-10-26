// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type DixitReadout =
  {schema:"dixit-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "illustrationCue": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "illustrationCue": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"dixit-v1";kind:"votes";values:{"observedColor": string | null; "voteValue": number | null; "voteState": string | null; "scoreValue": number | null};sources:{"observedColor": FieldBasis | null; "voteValue": FieldBasis | null; "voteState": 'user' | null; "scoreValue": FieldBasis | null}}
 | {schema:"dixit-v1";kind:null;values:{};sources:{}};
