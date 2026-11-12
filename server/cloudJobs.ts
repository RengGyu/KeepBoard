import {jobProgress,patchProgress,unitProgress,updateUnitProgress,completedUnitState,resizeProgress,type JobProgressDocument} from './jobProgress';
import {analysisBatches} from './analysisTask';
import {createHash,randomUUID} from 'node:crypto';
import {activeAnalysisJob,type AnalysisJob} from '../shared/analysisJobs.ts';
import type {AnalysisResult} from '../shared/types.ts';
import {AnalysisJobError} from './analysisJobs.ts';
import type {AnalysisTask} from './analysisTask.ts';
import {ConflictError,readJSON,writeJSON,type Objects} from './objects.ts';
type Input=Omit<AnalysisJob,'id'|'state'|'createdAt'|'updatedAt'>&{requestId:string;signature:string;revision?:string};
interface Stored extends AnalysisJob{requestId:string;signature:string;revision?:string}
const retainedHistory=(j:Stored)=>!!j.saveIntentId||!!j.observationReceipts?.length||Date.now()-Date.parse(j.updatedAt)<86400000;
export class CloudJobs{
 constructor(readonly objects:Objects,private dispatch:(id:string)=>Promise<void>){}
 private progressKey(id:string){if(!/^[-a-zA-Z0-9_]+$/.test(id))throw Error('Invalid job');return 'jobs/progress/'+id+'.json';}
 private async saveProgress(id:string,update:(old:JobProgressDocument|undefined)=>JobProgressDocument){const key=this.progressKey(id);for(let i=0;i<8;i++){const r=await readJSON<JobProgressDocument>(this.objects,key);try{await writeJSON(this.objects,key,update(r?.value),r?.etag??null);return;}catch(e){if(!(e instanceof ConflictError)||i===7)throw e;}}}
 async progress(id:string){const existing=await readJSON<JobProgressDocument>(this.objects,this.progressKey(id));if(existing)return existing.value.retainsHistory||Date.now()-Date.parse(existing.value.job.updatedAt)<86400000?existing.value:undefined;let loaded:Awaited<ReturnType<CloudJobs['load']>>;try{loaded=await this.load(id);}catch(e){if(e instanceof AnalysisJobError&&e.status===404)return;throw e;}const {task,job}=loaded,current=(await this.list(job.sessionId,job.ownerId)).find(j=>j.id===id);if(!current)return;const count=analysisBatches(task).length,next=jobProgress(current,count);for(let i=0;i<count;i++){const b=await this.batchResult(id,i);if(b)unitProgress(next,i,b.result?completedUnitState(b.result):'running');}patchProgress(next,current);await this.saveProgress(id,d=>d??next);return (await readJSON<JobProgressDocument>(this.objects,this.progressKey(id)))!.value;}
 private index(session:string,owner?:string){return 'jobs/index/'+session+'/'+createHash('sha256').update(owner??'public').digest('hex')+'.json';}
 private public(j:Stored):AnalysisJob{const {requestId,signature,revision,...value}=j;return value;}
 async list(session:string,owner?:string){return (await readJSON<Stored[]>(this.objects,this.index(session,owner)))?.value.filter(retainedHistory).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(j=>this.public(j))??[];}
 async start(input:Input,_run:unknown,task?:AnalysisTask){
  if(!task)throw new Error('Durable task is required');const key=this.index(input.sessionId,input.ownerId),r=await readJSON<Stored[]>(this.objects,key),all=(r?.value??[]).filter(j=>activeAnalysisJob(j)||retainedHistory(j));
  const prior=all.find(j=>j.requestId===input.requestId);if(prior){if(prior.signature!==input.signature)throw new AnalysisJobError('같은 작업 식별자로 다른 사진을 보낼 수 없어요.',409);return this.public(prior);}
  const active=all.find(activeAnalysisJob);if(active){if(active.signature!==input.signature||active.revision!==input.revision)throw new AnalysisJobError('이 영역의 사진을 읽고 있어요.',409);return this.public(active);}
  const at=new Date().toISOString(),j:Stored={...input,id:randomUUID(),state:'queued',createdAt:at,updatedAt:at};
  await writeJSON(this.objects,'jobs/tasks/'+j.id+'.json',{job:j,task},null);
  await writeJSON(this.objects,key,[...all,j],r?.etag??null);
  await this.saveProgress(j.id,()=>jobProgress(this.public(j),task?.prepared?analysisBatches(task).length:input.evidenceIds.length));
  try{await this.dispatch(j.id);}catch(e){await this.update(j.id,{state:'failed',error:'analysis-failed'});throw e;}return this.public(j);
 }
 async load(id:string){const r=await readJSON<{job:Stored;task:AnalysisTask}>(this.objects,'jobs/tasks/'+id+'.json');if(!r)throw new AnalysisJobError('작업을 찾을 수 없어요.',404);return r.value;}
 async savePrepared(id:string,task:AnalysisTask){const key='jobs/tasks/'+id+'.json',r=await readJSON<{job:Stored;task:AnalysisTask}>(this.objects,key);if(!r)throw Error('Missing task');if(r.value.task.prepared.scanObservation)return r.value.task;try{await writeJSON(this.objects,key,{...r.value,task},r.etag);await this.saveProgress(id,d=>{resizeProgress(d!,analysisBatches(task).length);return d!;});return task;}catch(e){if(!(e instanceof ConflictError))throw e;return (await this.load(id)).task;}}
 async update(id:string,changes:Partial<AnalysisJob>){const progress=await readJSON<JobProgressDocument>(this.objects,this.progressKey(id)),job=progress?.value.job??(await this.load(id)).job,key=this.index(job.sessionId,job.ownerId);
  for(let i=0;i<4;i++){const r=await readJSON<Stored[]>(this.objects,key);if(!r)throw Error('Missing job index');const j=r.value.find(x=>x.id===id);if(!j)throw Error('Missing job');Object.assign(j,changes,{timings:{...j.timings,...changes.timings,...(changes.state==='running'&&!j.timings?.jobStartedAt?{jobStartedAt:Date.now(),queueMs:Date.now()-Date.parse(j.createdAt)}:{}),...(changes.state&&!['queued','running'].includes(changes.state)?{jobDoneAt:Date.now()}:{})},updatedAt:new Date().toISOString()});try{await writeJSON(this.objects,key,r.value,r.etag);await this.saveProgress(id,d=>{const next=d??jobProgress(this.public(j),j.evidenceIds.length);patchProgress(next,this.public(j));return next;});return;}catch(e){if(!(e instanceof ConflictError)||i===3)throw e;}}
 }
 async batchResult(id:string,index:number){return (await readJSON<{state:string;startedAt?:string;result?:AnalysisResult;timings?:Record<string,number>}>(this.objects,`jobs/batches/${id}/${index}.json`))?.value;}
 async claimBatch(id:string,index:number){const key=`jobs/batches/${id}/${index}.json`;try{const claim=await writeJSON(this.objects,key,{state:'started',startedAt:new Date().toISOString()},null);await this.saveProgress(id,d=>{unitProgress(d!,index,'running');return d!;});return claim;}catch(e){if(e instanceof ConflictError)return null;throw e;}}
 async updateUnitProgress(id:string,index:number,update:import('../shared/analysisJobs').ScanUnitProgressUpdate){await this.saveProgress(id,d=>{if(!d)throw Error('Missing job progress');updateUnitProgress(d,index,update);return d;});}
 async finishBatch(id:string,index:number,etag:string,result:AnalysisResult,timings?:Record<string,number>){await writeJSON(this.objects,`jobs/batches/${id}/${index}.json`,{state:'completed',result,...(timings?{timings}:{})},etag);await this.saveProgress(id,d=>{unitProgress(d!,index,completedUnitState(result));return d!;});}
 async slot(id:string){const key='jobs/slots.json';for(let i=0;i<4;i++){const r=await readJSON<{id:string;until:number}[]>(this.objects,key),rows=(r?.value??[]).filter(x=>x.until>Date.now()&&x.id!==id);if(rows.length>=2)return false;try{await writeJSON(this.objects,key,[...rows,{id,until:Date.now()+300000}],r?.etag??null);return true;}catch(e){if(!(e instanceof ConflictError))throw e;}}return false;}
 async release(id:string){const key='jobs/slots.json';for(let i=0;i<4;i++){const r=await readJSON<{id:string;until:number}[]>(this.objects,key);if(!r||!r.value.some(x=>x.id===id))return;try{await writeJSON(this.objects,key,r.value.filter(x=>x.id!==id),r.etag);return;}catch(e){if(!(e instanceof ConflictError))throw e;}}}
}
