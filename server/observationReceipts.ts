import type {Session,Value} from '../shared/types';
import type {ObservationReceipt} from '../shared/lightweightRecognition';
function objects(value:Value){const v=value as any;return v&&typeof v==='object'?(Array.isArray(v.components)?v.components:Array.isArray(v.pieces)?v.pieces:[...(v.groups??[]).flatMap((g:any)=>g.tiles??[]),...(v.loose??[])]):[];}
const source=(p:any)=>JSON.stringify([p.id,p.evidenceId??p.evidenceIds??null]);
/** Metadata only. Call after the value and destination permissions have been validated. */
export function receiptsForValue(session:Session,value:Value,ownerId?:string):ObservationReceipt[]{
 const wanted=new Set(objects(value).map(source)),out:ObservationReceipt[]=[];
 for(const a of session.assertions){
  if(!objects(a.value).some((p:any)=>wanted.has(source(p))))continue;
  for(const r of a.observationReceipts??[])if((r.request.scope.ownerId===null||r.request.scope.ownerId===ownerId)&&!out.some(x=>x.request.taskId===r.request.taskId))out.push(structuredClone(r));
 }
 return out;
}
