// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.
import type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';
export type KanbanEvReadout =
  {schema:"kanban-ev-v1";kind:"cars";values:{"observedColor": string | null; "itemType": string | null; "upgradeState": string | null; "slot": string | null};sources:{"observedColor": FieldBasis | null; "itemType": FieldBasis | null; "upgradeState": 'user' | null; "slot": 'user' | null}}
 | {schema:"kanban-ev-v1";kind:"workers";values:{"observedColor": string | null; "workerType": string | null; "trackValue": number | null; "location": string | null};sources:{"observedColor": FieldBasis | null; "workerType": FieldBasis | null; "trackValue": FieldBasis | null; "location": 'user' | null}}
 | {schema:"kanban-ev-v1";kind:"markers";values:{"observedColor": string | null; "markerType": string | null; "displayValue": number | null};sources:{"observedColor": FieldBasis | null; "markerType": FieldBasis | null; "displayValue": FieldBasis | null}}
 | {schema:"kanban-ev-v1";kind:"goals";values:{"face": "front" | "back" | null; "printedName": string | null; "goalType": string | null; "completion": string | null};sources:{"face": FieldBasis | null; "printedName": FieldBasis | null; "goalType": FieldBasis | null; "completion": 'user' | null}}
 | {schema:"kanban-ev-v1";kind:null;values:{};sources:{}};
