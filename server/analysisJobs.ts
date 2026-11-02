import {isHostedReader} from '../shared/lightweightRecognition';
import {mkdir,readFile,readdir,rename,writeFile,unlink,open} from 'node:fs/promises';
import type {AnalysisTask} from './analysisTask';import type {AnalysisResult} from '../shared/types';
import path from 'node:path';import {randomUUID} from 'node:crypto';
import {activeAnalysisJob,type AnalysisJob} from '../shared/analysisJobs.ts';
type StoredJob=AnalysisJob&{requestId:string;signature:string;revision?:string};
export class AnalysisJobError extends Error{constructor(message:string,readonly status=400){super(message);}}
/** Single-process bounded scheduler. Recovery never repeats a potentially billed upstream call. */
export class AnalysisJobs {
 private jobs=new Map<string,StoredJob>();private queue:{id:string;run:(job:AnalysisJob)=>Promise<Partial<AnalysisJob>>}[]=[];private active=0;private hostedActive=0;private serial=Promise.resolve();private ready:Promise<void>;
 constructor(private root:string,private recovered?:(job:AnalysisJob)=>Promise<Partial<AnalysisJob>|undefined>){this.ready=this.recover();}
 private folder(){return path.join(this.root,'analysis-jobs');}
 private async save(j:StoredJob){await mkdir(this.folder(),{recursive:true});const f=path.join(this.folder(),j.id+'.json'),tmp=f+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify(j),{mode:0o600});await rename(tmp,f);}
 private async recover(){let files:string[];try{files=await readdir(this.folder());}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw e;}
  for(const file of files.filter(f=>/^[a-f0-9-]+\.json$/.test(f))){const j=JSON.parse(await readFile(path.join(this.folder(),file),'utf8')) as StoredJob;if(!activeAnalysisJob(j)&&Date.now()-Date.parse(j.updatedAt)>86400000){await unlink(path.join(this.folder(),file));continue;}if(activeAnalysisJob(j)){const receipt=await this.recovered?.(j);if(receipt)Object.assign(j,receipt);else{j.state='interrupted';j.error='interrupted';} j.updatedAt=new Date().toISOString();await this.save(j);}this.jobs.set(j.id,j);}
 }
 private public(j:StoredJob):AnalysisJob{const {requestId,signature,revision,...out}=j;return structuredClone(out);}
 async list(sessionId:string,ownerId?:string){await this.ready;return [...this.jobs.values()].filter(j=>j.sessionId===sessionId&&j.ownerId===ownerId&&Date.now()-Date.parse(j.updatedAt)<86400000).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(j=>this.public(j));}
 async start(input:Omit<StoredJob,'id'|'state'|'createdAt'|'updatedAt'>,run:(job:AnalysisJob)=>Promise<Partial<AnalysisJob>>,task?:AnalysisTask){await this.ready;let out!:AnalysisJob;const work=this.serial.catch(()=>{}).then(async()=>{
   for(const [id,j] of this.jobs)if(!activeAnalysisJob(j)&&Date.now()-Date.parse(j.updatedAt)>86400000){await unlink(path.join(this.folder(),id+'.json')).catch(()=>{});this.jobs.delete(id);}
   const same=[...this.jobs.values()].filter(j=>j.sessionId===input.sessionId&&j.ownerId===input.ownerId);const prior=same.find(j=>j.requestId===input.requestId);if(prior){if(prior.signature!==input.signature)throw new AnalysisJobError('같은 작업 식별자로 다른 사진을 보낼 수 없어요.',409);out=this.public(prior);return;}
   const running=same.find(j=>activeAnalysisJob(j));if(running){if(running.signature!==input.signature||running.revision!==input.revision)throw new AnalysisJobError('이 영역의 사진을 읽고 있어요. 완료 후 새 사진을 읽어 주세요.',409);out=this.public(running);return;}
   if(this.queue.length+this.active+this.hostedActive>=16)throw new AnalysisJobError('사진 읽기 작업이 많아요. 원본은 보관돼요. 잠시 후 시작해 주세요.',503);
   const now=new Date().toISOString(),j:StoredJob={...input,id:randomUUID(),state:'queued',createdAt:now,updatedAt:now};await this.save(j);this.jobs.set(j.id,j);if(task){await mkdir(path.join(this.folder(),'tasks'),{recursive:true});await writeFile(path.join(this.folder(),'tasks',j.id+'.json'),JSON.stringify({job:j,task}),{mode:0o600,flag:'wx'});}out=this.public(j);if(isHostedReader(task?.prepared.scanIntent?.selection)||task?.prepared.scanObservation?.units.every(u=>!!u.hosted)){this.hostedActive++;setImmediate(()=>void this.execute(j,run,true));}else{this.queue.push({id:j.id,run});setImmediate(()=>void this.drain());}
  });this.serial=work.then(()=>{},()=>{});await work;return out;}
 async load(id:string){return JSON.parse(await readFile(path.join(this.folder(),'tasks',id+'.json'),'utf8')) as {job:StoredJob;task:AnalysisTask};}
 async savePrepared(id:string,task:AnalysisTask){const f=path.join(this.folder(),'tasks',id+'.json'),current=await this.load(id);if(current.task.prepared.scanObservation)return current.task;const next={...current,task};await writeFile(f,JSON.stringify(next),{mode:0o600});return task;}
 async update(id:string,changes:Partial<AnalysisJob>){const j=this.jobs.get(id);if(!j)throw Error('Missing job');Object.assign(j,changes,{updatedAt:new Date().toISOString()});await this.save(j);}
 private batchPath(id:string,index:number){if(!/^[a-f0-9-]+$/.test(id)||!Number.isInteger(index)||index<0||index>5)throw Error('Invalid unit');return path.join(this.folder(),'units',id,index+'.json');}
 async batchResult(id:string,index:number){try{return JSON.parse(await readFile(this.batchPath(id,index),'utf8')) as {state:string;startedAt?:string;claim?:string;result?:AnalysisResult;timings?:Record<string,number>};}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw e;}}
 async claimBatch(id:string,index:number){const f=this.batchPath(id,index);await mkdir(path.dirname(f),{recursive:true});const claim=randomUUID();try{const file=await open(f,'wx',0o600);try{await file.writeFile(JSON.stringify({state:'started',claim,startedAt:new Date().toISOString()}));}finally{await file.close();}return claim;}catch(e){if((e as NodeJS.ErrnoException).code==='EEXIST')return null;throw e;}}
 async finishBatch(id:string,index:number,claim:string,result:AnalysisResult,timings?:Record<string,number>){const old=await this.batchResult(id,index);if(old?.state!=='started'||old.claim!==claim)throw Error('Unit claim changed');const f=this.batchPath(id,index),tmp=f+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify({state:'completed',result,timings}),{mode:0o600});await rename(tmp,f);}
 private async execute(j:StoredJob,run:(job:AnalysisJob)=>Promise<Partial<AnalysisJob>>,hosted=false){try{j.state='running';j.timings={...j.timings,queueMs:Date.now()-Date.parse(j.createdAt)};j.updatedAt=new Date().toISOString();await this.save(j);Object.assign(j,await run(this.public(j)));}catch(error){j.state=(error as {status?:number})?.status===409?'stale':'failed';j.error=j.state==='stale'?'stale':'analysis-failed';}finally{j.updatedAt=new Date().toISOString();try{await this.save(j);}finally{if(hosted)this.hostedActive--;else this.active--;void this.drain();}}}
 private async drain(){while(this.active<2&&this.queue.length){const task=this.queue.shift()!,j=this.jobs.get(task.id)!;this.active++;void this.execute(j,task.run).catch(()=>{j.state='failed';j.error='analysis-failed';});}}
}
