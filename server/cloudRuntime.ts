import {runHostedScan} from './scanExecution';
import {analyzeScanUnit} from './scanObservation.ts';
import {BlobObjects} from './blobObjects.ts';import {BlobStore} from './blobStore.ts';
import {SupabaseObjects} from './supabaseObjects.ts';
import {CloudJobs} from './cloudJobs.ts';import {PrivatePins} from './privatePin.ts';
import {normalizeObservations,analyzeEvidence} from './ai/index.ts';
import {analysisBatches,taskTarget,commitAnalysisTask,type AnalysisTask} from './analysisTask.ts';
import {captureFields} from '../shared/photoCapture.ts';
import type {AnalysisResult} from '../shared/types.ts';
import {hostedReaderFor} from './ai/hostedReader';
import {analyzeHostedObservation} from './hostedObservation.ts';
export function cloudRuntime(){
 if(process.env.KEEPBOARD_MOCK_ANALYSIS==='1'&&process.env.VERCEL_ENV==='production')throw Error('Mock analysis is prohibited in production');
 process.env.KEEPBOARD_CLOUD_AI='1';
 const provider=process.env.KEEPBOARD_STORAGE_PROVIDER??'blob';
 if(!['blob','supabase'].includes(provider))throw Error('Unknown private storage provider');
 const objects=provider==='supabase'?SupabaseObjects.fromEnv():new BlobObjects(),store=new BlobStore(objects),pins=new PrivatePins(store.root,objects),jobs=new CloudJobs(objects,async()=>{throw Error('Dispatch is entry-only');});return {objects,store,pins,jobs};
}
export async function cloudAnalyzeBatch(id:string,index:number){
 const {store,pins,jobs}=cloudRuntime(),{task}=await jobs.load(id);const batch=analysisBatches(task)[index];if(!batch)throw Error('Invalid analysis batch');
 if(task.prepared.localObservation)throw Error('Local observation reader is not deployed in cloud; no fallback');
 if(task.prepared.scanIntent)throw Error('Hosted scan intent must use the scan execution step; no legacy fallback');
 const prior=await jobs.batchResult(id,index);if(prior?.state==='completed')return;
 await taskTarget(store,pins,task);
 const claim=await jobs.claimBatch(id,index);if(!claim)throw Error('Analysis was already claimed; never repeat a potentially billed request');
 await jobs.update(id,{state:'running'});
 let result:AnalysisResult;const timings:Record<string,number>={},readImage=async(e:AnalysisTask['prepared']['evidence'][number])=>store.readEvidence(e);
 if(process.env.KEEPBOARD_MOCK_ANALYSIS==='1')result=mockAnalysis(task,batch);
 else if(task.prepared.scanObservation)result=await analyzeScanUnit({scan:task.prepared.scanObservation,index,pack:task.prepared.pack,session:task.prepared.session,evidence:task.prepared.evidence,reader:hostedReaderFor(task.prepared.scanObservation.units[index].hosted!.reader),readImage,timings});
 else if(task.prepared.hostedObservation)result=await analyzeHostedObservation({plan:task.prepared.hostedObservation,pack:task.prepared.pack,session:task.prepared.session,evidence:batch,turnInstanceId:task.prepared.session.turnInstanceId,reader:hostedReaderFor(task.prepared.hostedObservation.reader),readImage,timings});
 else result=await analyzeEvidence({...task.prepared,evidence:batch,timings,readImage:async e=>{const b=await readImage(e);return {mimeType:b.mimeType,data:b.data.toString('base64')};}});
 await jobs.finishBatch(id,index,claim,result,timings);
}
function mockAnalysis(task:AnalysisTask,evidence:AnalysisTask['prepared']['evidence']):AnalysisResult{
 const pack=task.prepared.pack,field=captureFields(pack,evidence,pack.fields).find(f=>pack.runtime?.fieldBindings.some(b=>b.key===f.key&&b.editor==='component-catalog'));
 if(!field)return {assertions:[],summary:'합성 검수 작업 완료 · 실제 사진 판독 아님',warnings:[],mode:'manual'};
 const id=pack.runtime!.fieldBindings.find(b=>b.key===field.key)!.componentIds[0]??null;
 return normalizeObservations({assertions:[{field:field.key,evidenceIds:evidence.map(e=>e.id),value:{version:'game-component-record-v1',pieces:[{id:'synthetic-piece',componentId:id,variant:null,quantity:null,label:'합성 fixture · 실제사진 판독 아님',anchor:'',evidenceId:evidence[0].id,region:null}]}}]},pack,evidence,task.prepared.session.turnInstanceId,task.prepared.session.players.map(p=>p.id));
}
export async function finishCloudJob(id:string){const {store,pins,jobs}=cloudRuntime(),{job,task}=await jobs.load(id);const results:AnalysisResult[]=[],timings={...job.timings,providerMs:0,totalMs:Date.now()-Date.parse(job.createdAt)};for(let i=0;i<analysisBatches(task).length;i++){const r=await jobs.batchResult(id,i);if(r?.state!=='completed'||!r.result)throw Error('No completed result');results.push(r.result);timings.providerMs+=r.timings?.provider??0;}try{await jobs.update(id,{...await commitAnalysisTask(store,pins,task,job,results),timings});}catch(error){if(!task.prepared.scanObservation||(error as {status?:number}).status!==409)throw error;await jobs.update(id,{state:'stale',error:'stale',observationReceipts:results.flatMap(r=>r.observationReceipts??[]),scanBundle:{plan:task.prepared.scanObservation.plan,units:results.flatMap(r=>r.scanBundle?.units??[]),links:[]},timings});}await jobs.release(id);}
export async function failCloudJob(id:string){const {jobs}=cloudRuntime();await jobs.update(id,{state:'interrupted',error:'interrupted'});await jobs.release(id);}

export async function cloudRunHostedScan(id:string){const {store,pins,jobs}=cloudRuntime(),{task,job}=await jobs.load(id);const latest=(await jobs.list(job.sessionId,job.ownerId)).find(j=>j.id===id);if(latest&&!['queued','running'].includes(latest.state))return false;const run=await runHostedScan({id,task,jobs,store,pins,reader:hostedReaderFor(task.prepared.scanIntent!.reader)});return !!run.results;}
