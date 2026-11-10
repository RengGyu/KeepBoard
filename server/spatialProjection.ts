import type {AnalysisResult} from '../shared/types';
/** Observation IDs can change once during scan fusion. Relations keep local refs plus stable actual IDs. */
export function remapSpatialRelations(result:AnalysisResult){
 const receipts=result.observationReceipts??[],ids=new Map(receipts.flatMap(r=>Object.entries(r.componentRefs).map(([ref,id])=>[r.request.taskId+':'+ref,id]as const)));
 for(const a of result.assertions)for(const p of (a.value as any)?.pieces??[])for(const s of [p.spatial,...(p.spatialAlternatives??[])].filter(Boolean))for(const r of s.relations){r.fromId=ids.get(s.source.taskId+':'+r.fromRef)??s.source.taskId+':'+r.fromRef;r.toId=ids.get(s.source.taskId+':'+r.toRef)??s.source.taskId+':'+r.toRef;}
 return result;
}
