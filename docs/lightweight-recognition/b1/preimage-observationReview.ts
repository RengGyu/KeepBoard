import type {Assertion,GamePack,Session,Value} from '../shared/types';
import type {NativeObservationReview} from '../shared/observationReview';
import {AnalysisJobError} from './analysisJobs';import {ConflictError} from './objects';
export function observationObjects(value:Value):any[]{const v=value as any;return v&&typeof v==='object'?(Array.isArray(v.components)?v.components:Array.isArray(v.pieces)?v.pieces:[...(v.groups??[]).flatMap((g:any)=>g.tiles??[]),...(v.loose??[])]):[];}
const key=(p:any)=>JSON.stringify([p.id,p.evidenceId??p.evidenceIds??null]);
function nativeTarget(pack:GamePack,a:Assertion){
 if(pack.id==='catan-base'){if(!a.ownerId&&['board.layout','components.observed'].includes(a.field))return 'board.layout';if(a.ownerId&&a.field==='player.components.observed')return a.field;}
 if(pack.id==='rummikub'&&['table.scene','rack.scene'].includes(a.field))return a.field;
}
const baseline=(s:Session,field:string,owner?:string)=>s.assertions.filter(a=>a.status==='accepted'&&a.field===field&&a.ownerId===owner).at(-1);
const local=(a:Assertion)=>a.status==='candidate'&&!!a.observationReceipts?.length;
const reviewNeeded=()=>{throw new AnalysisJobError('기존 기록이 있습니다. 실물 연결 또는 기존 판과 함께 정정한 뒤 반영해 주세요. 초안과 원본은 유지됩니다.',409);};
export function guardPartialObservationAccept(session:Session,pack:GamePack,a:Assertion){
 if(local(a)&&[a.field,nativeTarget(pack,a)].some(field=>field&&observationObjects(baseline(session,field,a.ownerId)?.value??null).length))reviewNeeded();
}
/** Exact IDs/source lineage only; this neither matches physical identities nor unions any values. */
export function observationAnswerContext(session:Session,pack:GamePack,field:string,value:Value,ownerId?:string,review?:NativeObservationReview){
 const current=baseline(session,field,ownerId),wanted=new Set(observationObjects(value).map(key));
 const sources=session.assertions.filter(a=>local(a)&&a.ownerId===ownerId&&(a.field===field||nativeTarget(pack,a)===field));
 let reviewed:Assertion|undefined;
 if(review!==undefined){
  if(!review||typeof review!=='object'||Object.keys(review).sort().join(',')!=='expectedBaselineAssertionId,sourceAssertionId,version'||review.version!=='native-observation-review-v1'||typeof review.sourceAssertionId!=='string'||review.expectedBaselineAssertionId!==null&&typeof review.expectedBaselineAssertionId!=='string')throw new AnalysisJobError('사진 검토 저장 형식을 확인하세요.');
  reviewed=sources.find(a=>a.id===review.sourceAssertionId);
  if(!reviewed||nativeTarget(pack,reviewed)!==field||(current?.id??null)!==review.expectedBaselineAssertionId)throw new ConflictError();
 }else if(observationObjects(current?.value??null).length&&sources.some(a=>observationObjects(a.value).some(p=>wanted.has(key(p)))))reviewNeeded();
 // Whole native review consumes that pending projection. Other pending local sources stay available.
 const consumed=new Set<string>(reviewed?[reviewed.id]:sources.filter(a=>{const objects=observationObjects(a.value);return objects.length>0&&objects.every(p=>wanted.has(key(p)));}).map(a=>a.id));
 return {reviewed,consumed};
}
