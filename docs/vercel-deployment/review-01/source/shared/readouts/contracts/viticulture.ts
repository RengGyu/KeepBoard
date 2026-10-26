// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type ViticultureReadout =
  {schema:"viticulture-v1";kind:"workers";values:{"observedColor": string | null; "workerType": string | null; "workerZone": string | null; "owner": string | null};sources:{"observedColor": FieldBasis | null; "workerType": FieldBasis | null; "workerZone": 'user' | null; "owner": 'user' | null}}
 | {schema:"viticulture-v1";kind:"cards";values:{"face": "front" | "back" | null; "printedName": string | null; "cardType": string | null; "cardArea": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "cardType": FieldBasis | null; "cardArea": 'user' | null}}
 | {schema:"viticulture-v1";kind:"vineyard";values:{"printedName": string | null; "sideLabel": string | null; "itemType": string | null; "installedState": string | null; "fieldLabel": string | null};sources:{"printedName": FieldBasis | null; "sideLabel": FieldBasis | null; "itemType": FieldBasis | null; "installedState": 'user' | null; "fieldLabel": FieldBasis | null}}
 | {schema:"viticulture-v1";kind:"goods";values:{"observedColor": string | null; "goodsType": string | null; "quality": number | null; "storage": string | null};sources:{"observedColor": FieldBasis | null; "goodsType": FieldBasis | null; "quality": FieldBasis | null; "storage": 'user' | null}}
 | {schema:"viticulture-v1";kind:null;values:{};sources:{}};
