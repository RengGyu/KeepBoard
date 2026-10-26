from pathlib import Path
import json
D=Path(__file__).parent;A=Path(json.loads((D/'baseline.json').read_text())['isolation'])
def put(p,s):
 t=A/p;t.parent.mkdir(parents=True,exist_ok=True);t.write_text(s)
put('shared/analysisJobs.ts', '''export type AnalysisJobState='queued'|'running'|'completed'|'failed'|'stale'|'interrupted';
export interface AnalysisJob {id:string;sessionId:string;ownerId?:string;evidenceIds:string[];captureEpoch:string;state:AnalysisJobState;createdAt:string;updatedAt:string;candidateCount?:number;mode?:'live'|'manual'|'example';error?:'analysis-failed'|'stale'|'interrupted'}
export const activeAnalysisJob=(j:AnalysisJob)=>j.state==='queued'||j.state==='running';
''')
put('server/analysisJobs.ts', '''import {mkdir,readFile,readdir,rename,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';import {randomUUID} from 'node:crypto';
import {activeAnalysisJob,type AnalysisJob} from '../shared/analysisJobs.ts';
type StoredJob=AnalysisJob&{requestId:string;signature:string};
export class AnalysisJobError extends Error{constructor(message:string,readonly status=400){super(message);}}
/** Single-process bounded scheduler. Recovery never repeats a potentially billed upstream call. */
export class AnalysisJobs {
 private jobs=new Map<string,StoredJob>();private queue:{id:string;run:()=>Promise<Partial<AnalysisJob>>}[]=[];private active=0;private serial=Promise.resolve();private ready:Promise<void>;
 constructor(private root:string){this.ready=this.recover();}
 private folder(){return path.join(this.root,'analysis-jobs');}
 private async save(j:StoredJob){await mkdir(this.folder(),{recursive:true});const f=path.join(this.folder(),j.id+'.json'),tmp=f+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify(j),{mode:0o600});await rename(tmp,f);}
 private async recover(){let files:string[];try{files=await readdir(this.folder());}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw e;}
  for(const file of files.filter(f=>/^[a-f0-9-]+\\.json$/.test(f))){const j=JSON.parse(await readFile(path.join(this.folder(),file),'utf8')) as StoredJob;if(!activeAnalysisJob(j)&&Date.now()-Date.parse(j.updatedAt)>86400000){await unlink(path.join(this.folder(),file));continue;}if(activeAnalysisJob(j)){j.state='interrupted';j.error='interrupted';j.updatedAt=new Date().toISOString();await this.save(j);}this.jobs.set(j.id,j);}
 }
 private public(j:StoredJob):AnalysisJob{const {requestId,signature,...out}=j;return structuredClone(out);}
 async list(sessionId:string,ownerId?:string){await this.ready;return [...this.jobs.values()].filter(j=>j.sessionId===sessionId&&j.ownerId===ownerId&&Date.now()-Date.parse(j.updatedAt)<86400000).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(j=>this.public(j));}
 async start(input:Omit<StoredJob,'id'|'state'|'createdAt'|'updatedAt'>,run:()=>Promise<Partial<AnalysisJob>>){await this.ready;let out!:AnalysisJob;const work=this.serial.catch(()=>{}).then(async()=>{
   const same=[...this.jobs.values()].filter(j=>j.sessionId===input.sessionId&&j.ownerId===input.ownerId);const prior=same.find(j=>j.requestId===input.requestId);if(prior){if(prior.signature!==input.signature)throw new AnalysisJobError('같은 작업 식별자로 다른 사진을 보낼 수 없어요.',409);out=this.public(prior);return;}
   const running=same.find(j=>activeAnalysisJob(j));if(running){if(running.signature!==input.signature)throw new AnalysisJobError('이 영역의 사진을 읽고 있어요. 완료 후 새 사진을 읽어 주세요.',409);out=this.public(running);return;}
   if(this.queue.length+this.active>=16)throw new AnalysisJobError('사진 읽기 작업이 많아요. 원본은 보관돼요. 잠시 후 시작해 주세요.',503);
   const now=new Date().toISOString(),j:StoredJob={...input,id:randomUUID(),state:'queued',createdAt:now,updatedAt:now};await this.save(j);this.jobs.set(j.id,j);this.queue.push({id:j.id,run});out=this.public(j);setImmediate(()=>void this.drain());
  });this.serial=work.then(()=>{},()=>{});await work;return out;}
 private async drain(){while(this.active<2&&this.queue.length){const task=this.queue.shift()!,j=this.jobs.get(task.id)!;this.active++;void(async()=>{try{j.state='running';j.updatedAt=new Date().toISOString();await this.save(j);const result=await task.run();Object.assign(j,result);}catch(error){j.state=error instanceof AnalysisJobError&&error.status===409?'stale':'failed';j.error=j.state==='stale'?'stale':'analysis-failed';}finally{j.updatedAt=new Date().toISOString();try{await this.save(j);}finally{this.active--;void this.drain();}}})();}}
}
''')
p=A/'server/privatePin.ts';s=p.read_text().replace("import {randomBytes,scrypt", "import {createHash,randomBytes,scrypt");s=s.replace(' async owners(id:string)'," async configurationStamp(id:string,owner?:string){const r=owner?(await this.records())[id]?.[owner]:undefined;return createHash('sha256').update(JSON.stringify(r??null)).digest('hex');}\n async owners(id:string)");p.write_text(s)
