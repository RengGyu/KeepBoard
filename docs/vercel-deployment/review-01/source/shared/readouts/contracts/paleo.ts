// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type PaleoReadout =
  {schema:"paleo-v1";kind:"people";values:{"face": "front" | "back" | null; "printedName": string | null; "personType": string | null; "abilities": string | null; "wounds": number | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "personType": FieldBasis | null; "abilities": FieldBasis | null; "wounds": FieldBasis | null}}
 | {schema:"paleo-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "backCue": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "backCue": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"paleo-v1";kind:"boards";values:{"printedName": string | null; "sideLabel": string | null; "boardType": string | null; "requirements": SymbolValue[] | null; "progressValue": number | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "boardType": FieldBasis | null; "requirements": FieldBasis | null; "progressValue": FieldBasis | null}}
 | {schema:"paleo-v1";kind:"progress";values:{"observedColor": string | null; "progressType": string | null; "pending": string | null};sources:{"observedColor": FieldBasis | null; "progressType": FieldBasis | null; "pending": 'user' | null}}
 | {schema:"paleo-v1";kind:null;values:{};sources:{}};
