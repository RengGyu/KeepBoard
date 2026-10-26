// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type SevenWondersDuelReadout =
  {schema:"seven-wonders-duel-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "ageLabel": string | null; "overlap": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "ageLabel": FieldBasis | null; "overlap": 'user' | null; "cardArea": 'user' | null}}
 | {schema:"seven-wonders-duel-v1";kind:"wonders";values:{"face": "front" | "back" | null; "printedName": string | null; "wonderLabel": string | null; "owner": string | null; "constructed": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "wonderLabel": FieldBasis | null; "owner": 'user' | null; "constructed": 'user' | null}}
 | {schema:"seven-wonders-duel-v1";kind:"progress";values:{"observedColor": string | null; "pieceType": string | null; "trackPosition": string | null; "printedValue": number | null};sources:{"observedColor": FieldBasis | null; "pieceType": FieldBasis | null; "trackPosition": 'user' | null; "printedValue": FieldBasis | null}}
 | {schema:"seven-wonders-duel-v1";kind:"coins";values:{"observedColor": string | null; "nominalValue": number | null};sources:{"observedColor": FieldBasis | null; "nominalValue": FieldBasis | null}}
 | {schema:"seven-wonders-duel-v1";kind:null;values:{};sources:{}};
