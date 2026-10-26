// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type HansaTeutonicaReadout =
  {schema:"hansa-teutonica-v1";kind:"tradesmen";values:{"observedColor": string | null; "pieceType": string | null; "owner": string | null; "location": string | null};sources:{"observedColor": FieldBasis | null; "pieceType": FieldBasis | null; "owner": 'user' | null; "location": 'user' | null}}
 | {schema:"hansa-teutonica-v1";kind:"board";values:{"printedName": string | null; "sideLabel": string | null; "slotType": string | null; "slotLabel": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "slotType": FieldBasis | null; "slotLabel": FieldBasis | null}}
 | {schema:"hansa-teutonica-v1";kind:"bonus";values:{"observedColor": string | null; "bonusType": string | null; "useState": string | null};sources:{"observedColor": FieldBasis | null; "bonusType": FieldBasis | null; "useState": 'user' | null}}
 | {schema:"hansa-teutonica-v1";kind:null;values:{};sources:{}};
