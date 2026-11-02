import {isHostedReader} from '../shared/lightweightRecognition';
import type {Evidence,AnalysisResult} from '../shared/types';
import type {HostedReaderSelection,HostedReaderIdentity} from '../shared/lightweightRecognition';
import type {ScanTarget} from '../shared/scanObservation';
import {prepareScanObservation,analyzeScanUnit} from './scanObservation';
import {photoDefinition} from './photoDefinitions';
import {taskTarget,type AnalysisTask,digest} from './analysisTask';
import type {HostedObservationReader} from './ai/hostedReader';
import type {Store} from './store';import type {PrivatePins} from './privatePin';
export interface ScanIntent {version:'scan-intent-v1';taskId:string;selection:HostedReaderSelection&{target?:ScanTarget};evidenceIds:string[];reader:HostedReaderIdentity}
export interface ScanExecutionJobs {
 savePrepared(id:string,task:AnalysisTask):Promise<AnalysisTask>;
 batchResult(id:string,index:number):Promise<{state:string;startedAt?:string;result?:AnalysisResult}|undefined>;
 claimBatch(id:string,index:number):Promise<string|null>;
 finishBatch(id:string,index:number,claim:string,result:AnalysisResult,timings?:Record<string,number>):Promise<void>;
 update(id:string,changes:Partial<import('../shared/analysisJobs').AnalysisJob>):Promise<unknown>;
}
export function cachedScanImages(read:(e:Evidence)=>Promise<{data:Buffer;mimeType:string}>){
 const cache=new Map<string,ReturnType<typeof read>>();let bytes=0;
 return {read(e:Evidence){const key=digest([e.id,e.url,e.kind,e.scope,e.ownerId,e.captureEpoch,e.sourceEvidenceId,e.sourceRegion]);let pending=cache.get(key);if(!pending){pending=Promise.resolve().then(()=>read(e)).then(image=>{bytes+=image.data.length;return image;});cache.set(key,pending);}return pending;},metrics:()=>({uniqueReads:cache.size,imageBytes:bytes}),clear:()=>cache.clear()};
}
/** One execution shares preparation/image bytes, while every possibly billed unit has an independent durable claim. */
export async function runHostedScan(input:{id:string;task:AnalysisTask;jobs:ScanExecutionJobs;store:Store;pins:PrivatePins;reader:HostedObservationReader}){
 let task=structuredClone(input.task);const intent=task.prepared.scanIntent;
 if(!intent)throw Error('Hosted scan intent required');
 const images=cachedScanImages(e=>input.store.readEvidence(e)),start=performance.now();
 try{
  await taskTarget(input.store,input.pins,task);
  if(digest(input.reader.identity)!==digest(intent.reader))throw Error('Pinned reader identity changed');
  // Start unique source requests together. No bytes/base64 are persisted in the task or step return value.
  await Promise.all(task.prepared.evidence.map(images.read));
  if(!task.prepared.scanObservation){
   const selected=intent.evidenceIds.map(id=>task.prepared.evidence.find(e=>e.id===id)!);
   const scan=await prepareScanObservation({session:task.prepared.session,pack:task.prepared.pack,evidence:selected,selection:intent.selection,taskId:intent.taskId,reader:input.reader,cloud:false,readImage:images.read});
   task.prepared.scanObservation=scan;task=await input.jobs.savePrepared(input.id,task);
  }
  const scan=task.prepared.scanObservation!;
  photoDefinition(task.prepared.pack,scan.plan.definitionSHA);
  await taskTarget(input.store,input.pins,task);
  await input.jobs.update(input.id,{state:'running',timings:{prepareMs:performance.now()-start,...images.metrics()}});
  const owned=new Set<number>(),live=new Map<number,AnalysisResult>();
  await Promise.allSettled(scan.units.map(async(_unit,index)=>{
   const previous=await input.jobs.batchResult(input.id,index);if(previous)return;
   const claim=await input.jobs.claimBatch(input.id,index);if(!claim)return;owned.add(index);
   // A scope failure before dispatch is terminal and must not manufacture a provider request.
   let result:AnalysisResult;const timings:Record<string,number>={};
   try{await taskTarget(input.store,input.pins,task);result=await analyzeScanUnit({scan,index,pack:task.prepared.pack,session:task.prepared.session,evidence:task.prepared.evidence,reader:input.reader,readImage:images.read,timings});}
   catch{result={assertions:[],warnings:['범위가 바뀌어 이 단위의 읽기를 중단했습니다.'],summary:'원본 보관',mode:'live',scanBundle:{plan:scan.plan,units:[{unitId:scan.units[index].id,state:'interrupted',error:'stale',observationCount:0}],links:[]}};}
   live.set(index,result);await input.jobs.finishBatch(input.id,index,claim,result,timings);
  }));
  const stored=await Promise.all(scan.units.map((_,i)=>input.jobs.batchResult(input.id,i)));
  // A competing delivery may still own started units. It must not finalize partial in-flight work.
  if(stored.some(r=>r?.state!=='completed'||!r.result)){
   const waiting=stored.some((r,i)=>r?.state==='started'&&!owned.has(i)&&(!r.startedAt||Date.now()-Date.parse(r.startedAt)<300000));
   if(!waiting){const results=scan.units.map((u,i)=>stored[i]?.result??live.get(i)??{assertions:[],summary:'중단 · 자동 재시도 없음',warnings:[],mode:'live' as const,scanBundle:{plan:scan.plan,units:[{unitId:u.id,state:'interrupted' as const,error:'interrupted',observationCount:0}],links:[]}});
    await input.jobs.update(input.id,{state:'interrupted',error:'interrupted',observationReceipts:results.flatMap(r=>r.observationReceipts??[]),scanBundle:{plan:scan.plan,units:results.flatMap(r=>r.scanBundle?.units??[]),links:[]}});
   }
   return {task,results:null,metrics:images.metrics()};
  }
  return {task,results:stored.map(r=>r!.result!),metrics:images.metrics()};
 }finally{images.clear();}
}
