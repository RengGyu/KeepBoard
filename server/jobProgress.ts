import type {AnalysisJob,ScanProgress} from '../shared/analysisJobs';
import type {AnalysisResult} from '../shared/types';
export interface JobProgressDocument{job:AnalysisJob;needsHydration?:boolean;retainsHistory?:boolean;total:number;units:ScanProgress['units']}
export function thinJob(job:AnalysisJob):AnalysisJob{const {observationReceipts:_r,scanBundle:_b,...small}=job;return small;}
export function jobProgress(job:AnalysisJob,count:number):JobProgressDocument{return {job:thinJob(job),retainsHistory:!!job.saveIntentId||!!job.observationReceipts?.length,total:count,units:Array.from({length:count},(_,index)=>({index,state:'pending'}))};}
export function patchProgress(doc:JobProgressDocument,changes:Partial<AnalysisJob>){if(changes.updatedAt&&changes.updatedAt<doc.job.updatedAt&&(!changes.state||['queued','running'].includes(changes.state)))return;if(!['queued','running'].includes(doc.job.state)&&changes.state&&['queued','running'].includes(changes.state))return;const updatedAt=changes.updatedAt&&changes.updatedAt>doc.job.updatedAt?changes.updatedAt:doc.job.updatedAt;doc.job={...doc.job,...thinJob(changes as AnalysisJob),updatedAt};if(Object.hasOwn(changes,'observationReceipts')||changes.saveIntentId)doc.retainsHistory=!!doc.job.saveIntentId||!!changes.observationReceipts?.length;const states=changes.scanBundle?.units;if(states)for(const [i,u]of states.entries())if(doc.units[i])doc.units[i].state=u.state;if(doc.job.state==='stale')for(const u of doc.units)delete u.preview;if(['failed','interrupted','stale'].includes(doc.job.state))for(const u of doc.units)if(['pending','running'].includes(u.state))u.state=doc.job.state==='failed'?'failed':'interrupted';}
export function completedUnitState(result:AnalysisResult):ScanProgress['units'][number]['state']{return result.scanBundle?.units[0]?.state??'completed';}
export function unitProgress(doc:JobProgressDocument,index:number,state:ScanProgress['units'][number]['state']){if(!Number.isSafeInteger(index)||index<0||index>=doc.total)throw Error('Invalid progress unit');if(doc.units[index].state!==state){doc.units[index].state=state;const now=new Date().toISOString();if(now>doc.job.updatedAt)doc.job.updatedAt=now;}}
export function receiptProgress(result:AnalysisResult){return (result.observationReceipts??[]).map(({hostedWire:_h,nativeWire:_n,scanBundle:_b,...r})=>r);}

export function resizeProgress(doc:JobProgressDocument,count:number){doc.total=count;doc.units=Array.from({length:count},(_,index)=>doc.units.find(u=>u.index===index)??{index,state:'pending'});delete doc.needsHydration;}

/** Small sidecar only. The writer is internal; all preview pins still bind to this job. */
export function updateUnitProgress(doc:JobProgressDocument,index:number,update:import('../shared/analysisJobs').ScanUnitProgressUpdate){
 const unit=doc.units[index];if(!unit||!['queued','running'].includes(doc.job.state)||!['pending','running'].includes(unit.state))return;
 if(update.preview){const p=update.preview;
  if(p.version!=='literal-preview-v1'||p.provisional!==true||p.captureEpoch!==doc.job.captureEpoch||p.ownerId!==(doc.job.ownerId??null)||p.definitionSHA!==doc.job.definitionSHA||!p.taskId||!p.sourceSHA||!p.inputSHA||!p.evidenceId||p.observations.length>64||Buffer.byteLength(JSON.stringify(p.observations))>65536)throw Error('Invalid preview scope or size');
  if(unit.preview&&['taskId','sourceSHA','inputSHA','evidenceId'].some(k=>(unit.preview as any)[k]!== (p as any)[k]))throw Error('Preview source changed');
  unit.preview=structuredClone(p);
 }
 if(Number.isSafeInteger(update.liveRows)&&update.liveRows!>=0){unit.liveRows=Math.max(unit.liveRows??0,update.liveRows!);doc.job.liveRows=doc.units.reduce((n,u)=>n+(u.liveRows??0),0);}
 if(update.timings){unit.timings??={};for(const [k,v]of Object.entries(update.timings))if(Number.isFinite(v)&&v>=0&&unit.timings[k]===undefined)unit.timings[k]=v;}
 const now=new Date().toISOString();if(now>doc.job.updatedAt)doc.job.updatedAt=now;
}
