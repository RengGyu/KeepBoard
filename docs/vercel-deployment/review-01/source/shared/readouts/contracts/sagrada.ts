// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type SagradaReadout =
  {schema:"sagrada-v1";kind:"dice";values:{"observedColor": string | null; "dieColor": string | null; "dieValue": number | null; "dieZone": string | null; "cell": string | null};sources:{"observedColor": FieldBasis | null; "dieColor": FieldBasis | null; "dieValue": FieldBasis | null; "dieZone": 'user' | null; "cell": 'user' | null}}
 | {schema:"sagrada-v1";kind:"windows";values:{"printedName": string | null; "sideLabel": string | null; "patternLabel": string | null; "selectedSide": string | null; "cellConstraint": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "patternLabel": FieldBasis | null; "selectedSide": FieldBasis | null; "cellConstraint": FieldBasis | null}}
 | {schema:"sagrada-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"sagrada-v1";kind:"tokens";values:{"observedColor": string | null; "tokenType": string | null; "tokenZone": string | null; "targetTool": string | null};sources:{"observedColor": FieldBasis | null; "tokenType": FieldBasis | null; "tokenZone": 'user' | null; "targetTool": 'user' | null}}
 | {schema:"sagrada-v1";kind:null;values:{};sources:{}};
