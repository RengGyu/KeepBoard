import {createHash,randomUUID} from 'node:crypto';
import {activeAnalysisJob,type AnalysisJob} from '../shared/analysisJobs.ts';
import type {AnalysisResult} from '../shared/types.ts';
import {AnalysisJobError} from './analysisJobs.ts';
import type {AnalysisTask} from './analysisTask.ts';
import {ConflictError,readJSON,writeJSON,type Objects} from './objects.ts';
type Input=Omit<AnalysisJob,'id'|'state'|'createdAt'|'updatedAt'>&{requestId:string;signature:string;revision?:string};
interface Stored extends AnalysisJob{requestId:string;signature:string;revision?:string}
const retainedHistory=(j:Stored)=>!!j.observationReceipts?.length||Date.now()-Date.parse(j.updatedAt)<86400000;
export class CloudJobs{
 constructor(readonly objects:Objects,private dispatch:(id:string)=>Promise<void>){}
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
  try{await this.dispatch(j.id);}catch(e){await this.update(j.id,{state:'failed',error:'analysis-failed'});throw e;}return this.public(j);
 }
 async load(id:string){const r=await readJSON<{job:Stored;task:AnalysisTask}>(this.objects,'jobs/tasks/'+id+'.json');if(!r)throw new AnalysisJobError('작업을 찾을 수 없어요.',404);return r.value;}
 async savePrepared(id:string,task:AnalysisTask){const key='jobs/tasks/'+id+'.json',r=await readJSON<{job:Stored;task:AnalysisTask}>(this.objects,key);if(!r)throw Error('Missing task');if(r.value.task.prepared.scanObservation)return r.value.task;try{await writeJSON(this.objects,key,{...r.value,task},r.etag);return task;}catch(e){if(!(e instanceof ConflictError))throw e;return (await this.load(id)).task;}}
 async update(id:string,changes:Partial<AnalysisJob>){const {job}=await this.load(id),key=this.index(job.sessionId,job.ownerId);
  for(let i=0;i<4;i++){const r=await readJSON<Stored[]>(this.objects,key);if(!r)throw Error('Missing job index');const j=r.value.find(x=>x.id===id);if(!j)throw Error('Missing job');Object.assign(j,changes,{updatedAt:new Date().toISOString()});try{await writeJSON(this.objects,key,r.value,r.etag);return;}catch(e){if(!(e instanceof ConflictError)||i===3)throw e;}}
 }
 async batchResult(id:string,index:number){return (await readJSON<{state:string;startedAt?:string;result?:AnalysisResult;timings?:Record<string,number>}>(this.objects,`jobs/batches/${id}/${index}.json`))?.value;}
 async claimBatch(id:string,index:number){const key=`jobs/batches/${id}/${index}.json`;try{return await writeJSON(this.objects,key,{state:'started',startedAt:new Date().toISOString()},null);}catch(e){if(e instanceof ConflictError)return null;throw e;}}
 async finishBatch(id:string,index:number,etag:string,result:AnalysisResult,timings?:Record<string,number>){await writeJSON(this.objects,`jobs/batches/${id}/${index}.json`,{state:'completed',result,...(timings?{timings}:{})},etag);}
 async slot(id:string){const key='jobs/slots.json';for(let i=0;i<4;i++){const r=await readJSON<{id:string;until:number}[]>(this.objects,key),rows=(r?.value??[]).filter(x=>x.until>Date.now()&&x.id!==id);if(rows.length>=2)return false;try{await writeJSON(this.objects,key,[...rows,{id,until:Date.now()+300000}],r?.etag??null);return true;}catch(e){if(!(e instanceof ConflictError))throw e;}}return false;}
 async release(id:string){const key='jobs/slots.json';for(let i=0;i<4;i++){const r=await readJSON<{id:string;until:number}[]>(this.objects,key);if(!r||!r.value.some(x=>x.id===id))return;try{await writeJSON(this.objects,key,r.value.filter(x=>x.id!==id),r.etag);return;}catch(e){if(!(e instanceof ConflictError))throw e;}}}
}
