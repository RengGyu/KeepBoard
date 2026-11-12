import type {Assertion} from './types';import type {DrawingItem} from './drawingProjection';import {observationPropertyApplicable} from './observationGaps';
export interface EstimatedBoardMetrics {placed:number;total:number;readKnown:number;readTotal:number;readUnknown:number;errorKnown:null;errorUnknown:number}
/** Current requested, applicable fields, not an inventory denominator or correctness score. */
export function estimatedBoardMetrics(items:readonly DrawingItem[],assertions:readonly Assertion[],placed:ReadonlySet<string>):EstimatedBoardMetrics{
 const physical=(i:DrawingItem)=>{const a=assertions.find(a=>a.id===i.assertionId);return JSON.stringify([a?.ownerId??null,(i.value as any).evidenceId??null,i.pieceId]);};
 let readKnown=0,readTotal=0;const seen=new Set<string>();
 for(const i of items){const a=assertions.find(a=>a.id===i.assertionId);if(!a)continue;const fields=new Set<string>();
  for(const r of a.observationReceipts??[]){if(!r?.request?.allowedPropertyIds||!r.componentRefs||!Array.isArray(r.result?.observations))continue;for(const o of r.result.observations){if(r.componentRefs[o.ref]!==i.pieceId)continue;for(const p of o.componentId?r.request.allowedPropertyIds[o.componentId]??[]:[])if(observationPropertyApplicable(r.request,o,p))fields.add(p);}}
  for(const p of fields){const key=JSON.stringify([physical(i),p]);if(seen.has(key))continue;seen.add(key);readTotal++;const v=i.value as any,values=v.readout?.values,value=p==='quantity'?v.quantity:p==='face'?(values?.face??v.face):values?.[p];if(value!==null&&value!==undefined)readKnown++;}
 }
 return {total:new Set(items.map(physical)).size,placed:new Set(items.filter(i=>placed.has(JSON.stringify([i.assertionId,i.pieceId]))).map(physical)).size,readKnown,readTotal,readUnknown:readTotal-readKnown,errorKnown:null,errorUnknown:readTotal};
}
