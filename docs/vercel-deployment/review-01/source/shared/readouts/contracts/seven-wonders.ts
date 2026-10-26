// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type SevenWondersReadout =
  {schema:"seven-wonders-v1";kind:"age-cards";values:{"face": "front" | "back" | null; "printedName": string | null; "ageLabel": string | null; "cardColor": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "ageLabel": FieldBasis | null; "cardColor": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"seven-wonders-v1";kind:"wonder";values:{"printedName": string | null; "sideLabel": string | null; "selectedSide": string | null; "stage": string | null; "underCard": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "selectedSide": FieldBasis | null; "stage": 'user' | null; "underCard": 'user' | null}}
 | {schema:"seven-wonders-v1";kind:"coins";values:{"observedColor": string | null; "nominalValue": number | null};sources:{"observedColor": FieldBasis | null; "nominalValue": FieldBasis | null}}
 | {schema:"seven-wonders-v1";kind:"military";values:{"observedColor": string | null; "ageLabel": string | null; "resultType": string | null; "nominalValue": number | null};sources:{"observedColor": FieldBasis | null; "ageLabel": FieldBasis | null; "resultType": FieldBasis | null; "nominalValue": FieldBasis | null}}
 | {schema:"seven-wonders-v1";kind:null;values:{};sources:{}};
