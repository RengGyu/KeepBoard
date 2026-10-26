// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type CalicoReadout =
  {schema:"calico-v1";kind:"patches";values:{"face": "front" | "back" | null; "printedName": string | null; "patchColor": string | null; "pattern": string | null; "cell": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "patchColor": FieldBasis | null; "pattern": FieldBasis | null; "cell": 'user' | null}}
 | {schema:"calico-v1";kind:"boards";values:{"printedName": string | null; "sideLabel": string | null; "borderLabel": string | null; "objective": string | null; "cell": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "borderLabel": FieldBasis | null; "objective": FieldBasis | null; "cell": 'user' | null}}
 | {schema:"calico-v1";kind:"scoring";values:{"observedColor": string | null; "itemType": string | null; "printedCondition": string | null; "acquired": string | null};sources:{"observedColor": FieldBasis | null; "itemType": FieldBasis | null; "printedCondition": FieldBasis | null; "acquired": 'user' | null}}
 | {schema:"calico-v1";kind:null;values:{};sources:{}};
