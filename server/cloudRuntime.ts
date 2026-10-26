import {BlobObjects} from './blobObjects.ts';import {BlobStore} from './blobStore.ts';
import {CloudJobs} from './cloudJobs.ts';import {PrivatePins} from './privatePin.ts';
import {normalizeObservations,analyzeEvidence} from './ai/index.ts';
import {analysisBatches,taskTarget,commitAnalysisTask,type AnalysisTask} from './analysisTask.ts';
import {captureFields} from '../shared/photoCapture.ts';
import type {AnalysisResult} from '../shared/types.ts';
export function cloudRuntime(){
 if(process.env.KEEPBOARD_MOCK_ANALYSIS==='1'&&process.env.VERCEL_ENV==='production')throw Error('Mock analysis is prohibited in production');
 process.env.KEEPBOARD_CLOUD_AI='1';
 const objects=new BlobObjects(),store=new BlobStore(objects),pins=new PrivatePins(store.root,objects),jobs=new CloudJobs(objects,async()=>{throw Error('Dispatch is entry-only');});return {objects,store,pins,jobs};
}
export async function cloudAnalyzeBatch(id:string,index:number){
 const {store,pins,jobs}=cloudRuntime(),{task}=await jobs.load(id);const batch=analysisBatches(task)[index];if(!batch)throw Error('Invalid analysis batch');
 if(task.prepared.localObservation)throw Error('Local observation reader is not deployed in cloud; no fallback');
 const prior=await jobs.batchResult(id,index);if(prior?.state==='completed')return;
 await taskTarget(store,pins,task);
 const claim=await jobs.claimBatch(id,index);if(!claim)throw Error('Analysis was already claimed; never repeat a potentially billed request');
 await jobs.update(id,{state:'running'});
 let result:AnalysisResult;
 if(process.env.KEEPBOARD_MOCK_ANALYSIS==='1')result=mockAnalysis(task,batch);
 else result=await analyzeEvidence({...task.prepared,evidence:batch,readImage:async e=>{const b=await store.readEvidence(e);return {mimeType:b.mimeType,data:b.data.toString('base64')};}});
 await jobs.finishBatch(id,index,claim,result);
}
function mockAnalysis(task:AnalysisTask,evidence:AnalysisTask['prepared']['evidence']):AnalysisResult{
 const pack=task.prepared.pack,field=captureFields(pack,evidence,pack.fields).find(f=>pack.runtime?.fieldBindings.some(b=>b.key===f.key&&b.editor==='component-catalog'));
 if(!field)return {assertions:[],summary:'합성 검수 작업 완료 · 실제 사진 판독 아님',warnings:[],mode:'manual'};
 const id=pack.runtime!.fieldBindings.find(b=>b.key===field.key)!.componentIds[0]??null;
 return normalizeObservations({assertions:[{field:field.key,evidenceIds:evidence.map(e=>e.id),value:{version:'game-component-record-v1',pieces:[{id:'synthetic-piece',componentId:id,variant:null,quantity:null,label:'합성 fixture · 실제사진 판독 아님',anchor:'',evidenceId:evidence[0].id,region:null}]}}]},pack,evidence,task.prepared.session.turnInstanceId,task.prepared.session.players.map(p=>p.id));
}
export async function finishCloudJob(id:string){const {store,pins,jobs}=cloudRuntime(),{job,task}=await jobs.load(id);const results:AnalysisResult[]=[];for(let i=0;i<analysisBatches(task).length;i++){const r=await jobs.batchResult(id,i);if(r?.state!=='completed'||!r.result)throw Error('No completed result');results.push(r.result);}await jobs.update(id,await commitAnalysisTask(store,pins,task,job,results));await jobs.release(id);}
export async function failCloudJob(id:string){const {jobs}=cloudRuntime();await jobs.update(id,{state:'interrupted',error:'interrupted'});await jobs.release(id);}
