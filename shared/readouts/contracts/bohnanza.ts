// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type BohnanzaReadout =
  {schema:"bohnanza-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "beanType": string | null; "goldBack": boolean | null; "handOrder": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "beanType": FieldBasis | null; "goldBack": FieldBasis | null; "handOrder": 'user' | null}}
 | {schema:"bohnanza-v1";kind:"fields";values:{"printedName": string | null; "sideLabel": string | null; "beanType": string | null; "overlapCount": number | null; "fieldIndex": number | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "beanType": FieldBasis | null; "overlapCount": FieldBasis | null; "fieldIndex": 'user' | null}}
 | {schema:"bohnanza-v1";kind:null;values:{};sources:{}};
