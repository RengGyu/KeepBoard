// Explicit --prepare is model-free. --execute requires the supervisor's separate execution permission.
import {readFile,mkdir,open,writeFile} from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
import {LocalReader} from '../../server/ai/localReader.ts';import {createApp} from '../../server/index.ts';import {Store} from '../../server/store.ts';
import {prepareLocalObservation} from '../../server/localObservation.ts';import {digest} from '../../server/analysisTask.ts';
import {mapObservationRegion} from '../../shared/photoGeometry.ts';import {scoreNumberGrounding} from '../../server/ai/qwenNumberGrounding.ts';
import type {ObservationRequest,PhotoDefinition,LocalTaskProfile} from '../../shared/lightweightRecognition.ts';
const [mode,preparedFile,metadataFile,configFile,runRoot,publicReport]=process.argv.slice(2);
if(!['--prepare','--execute'].includes(mode)||!publicReport)throw Error('Expected --prepare|--execute prepared metadata config private-run-root report');
process.umask(0o077);
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex'),selfSHA=sha(await readFile(new URL(import.meta.url))),prepared=JSON.parse(await readFile(preparedFile,'utf8')),metadata=JSON.parse(await readFile(metadataFile,'utf8')),config=JSON.parse(await readFile(configFile,'utf8'));
const frozenFrameBytes=await readFile(metadata.privateFramePath),frozenFrame=JSON.parse(frozenFrameBytes.toString()),source=await readFile(prepared.plans[0].input.path);
if(sha(source)!==prepared.sourceSHA256||sha(source)!==metadata.sourceSHA256||sha(frozenFrameBytes)!==metadata.frameSHA256||sha(await readFile(metadata.privateGTPath))!==metadata.privateGTSHA256)throw Error('Frozen source/frame/GT bytes changed');
if(prepared.plans.length!==2||prepared.plans[0].mode!=='original'||prepared.plans[1].mode!=='catan-atlas'||config.timeoutMs!==600000)throw Error('Pinned mode/timeout changed');
const expectedBodies=['b10bac106a67b3b524f06da98857e6086f9304d77c5d024beef855edb12b2797','670605b0d4022d8dbf19f8229bf1a1008cbe7ccceea02f25aeb8a7e9c10eae57'];
for(const [i,c]of prepared.plans.entries())if(c.readerRequestBodySHA256!==expectedBodies[i]||sha(await readFile(c.input.path))!==c.input.sha256)throw Error('Prepared body/input changed');
await mkdir(runRoot,{recursive:true,mode:0o700});const store=new Store(path.join(runRoot,'store')),receiptDirectory=path.join(runRoot,'reader-receipts'),preparedPath=path.join(runRoot,'prepared.json');
const json=async(file:string)=>JSON.parse(await readFile(file,'utf8'));
const exclusive=async(file:string,data:unknown)=>{const f=await open(file,'wx',0o600);try{await f.writeFile(JSON.stringify(data,null,2)+'\n');}finally{await f.close();}};
const record=async(file:string,data:unknown)=>writeFile(file,JSON.stringify(data,null,2)+'\n',{mode:0o600});
let active:any,readingTask:string|undefined,attempts=0,base='';const originalFetch=globalThis.fetch;
class EvaluationReader extends LocalReader {
 async read(request:ObservationRequest,definition:PhotoDefinition,bytes:Buffer,mime:string,panels:{panelRef:string;inputRectangle:unknown}[]=[],profile?:LocalTaskProfile){
  if(mode!=='--execute'||!active||request.taskId!==active.taskId||request.images[0].evidenceId!==active.evidenceId||request.images[0].sha256!==active.inputSHA||JSON.stringify(profile)!==JSON.stringify(prepared.plans[active.index].taskProfile))throw Error('Unapproved task/input/profile; no model send');
  readingTask=request.taskId;try{return await super.read(request,definition,bytes,mime,panels,profile);}finally{readingTask=undefined;}
 }
}
const reader=new EvaluationReader({...config,receiptDirectory}),capability=await reader.numeralCapability();
if(!capability.available||prepared.plans.some((p:any)=>JSON.stringify(p.taskProfile)!==JSON.stringify(capability.profile)))throw Error('Runtime profile changed; no send');
globalThis.fetch=(async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 if(url.origin===new URL(config.endpoint).origin){
  if(['/health','/v1/models'].includes(url.pathname)&&(init?.method??'GET')==='GET')return originalFetch(input,init);
  if(url.pathname!=='/v1/chat/completions'||init?.method!=='POST'||typeof init.body!=='string'||mode!=='--execute'||!active||readingTask!==active.taskId||attempts>=2)throw Error('Blocked model request outside exact evaluation');
  const bodySHA=sha(init.body),expected=prepared.plans[active.index],body=JSON.parse(init.body),data=body.messages?.[0]?.content?.[1]?.image_url?.url;
  if(bodySHA!==expected.readerRequestBodySHA256||typeof data!=='string'||sha(Buffer.from(data.split(',')[1]??'','base64'))!==active.inputSHA)throw Error('Actual product body/input SHA differs; no send');
  const current=await reader.numeralCapability();if(!current.available||JSON.stringify(current.profile)!==JSON.stringify(expected.taskProfile))throw Error('Runtime pin changed immediately before send');
  await exclusive(path.join(runRoot,active.id+'-attempt.json'),{id:active.id,taskId:readingTask,bodySHA,inputSHA:active.inputSHA,sourceSHA:prepared.sourceSHA256,profile:current.profile,startedAt:new Date().toISOString(),retry:0});
  attempts++;console.log(JSON.stringify({phase:'model-send',id:active.id,attempts,maxAttempts:2,bodySHA}));return originalFetch(input,init);
 }
 if(!base||url.origin!==base)throw Error('Blocked network outside own evaluation server/model');
 return originalFetch(input,init);
})as typeof fetch;
let revision:string|undefined;
async function api(route:string,body?:unknown,method=body?'POST':'GET'){
 const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:body?JSON.stringify(body):undefined}),v=await r.json()as any;
 if(v.session?.storageRevision)revision=v.session.storageRevision;
 if(!r.ok)throw Error('Evaluation API '+r.status);return v;
}
const app=await createApp({store,localReader:reader,ui:mode==='--execute',uiHmr:false,analyzer:async()=>{throw Error('Paid/default reader is not permitted in this evaluation');}});
let saved:any;
try{saved=await json(preparedPath);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
if(mode==='--execute'&&!saved)throw Error('Prepare this exact runner first');
if(saved&&(saved.runnerSHA256!==selfSHA||saved.preparationSHA256!==sha(await readFile(preparedFile))))throw Error('Runner/preparation changed after prepare');
if(mode==='--execute')await exclusive(path.join(runRoot,'batch-attempt.json'),{runnerSHA256:selfSHA,preparationSHA256:saved.preparationSHA256,maxRequestsIncludingFailures:2,retry:0,concurrency:1,paid:0,startedAt:new Date().toISOString()});
const server=app.listen(saved?.port??0,'127.0.0.1');await new Promise<void>((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});base='http://127.0.0.1:'+(server.address()as any).port;
process.on('SIGTERM',()=>server.close());
const geometryDigest=(frame:any)=>{const {sourceEvidenceId,...geometry}=frame;return sha(JSON.stringify(geometry));};
try{
 if(mode==='--prepare'){
  if(!saved){
   const baseline={version:2,coverage:'partial',components:[{id:'evaluation-manual-road',kind:'road',variant:null,ownerId:null,quantity:1,location:{type:'edge',id:'r1c1.E'},region:null,evidenceId:null}]},cases=[];
   for(const [index,row]of prepared.plans.entries()){
    revision=undefined;const view=await api('/sessions',{gamePackId:'catan-base',name:row.id+' 숫자 평가 · 독립 합성 출발상태'}),sessionId=view.session.id,p='/sessions/'+sessionId;
    await api(p,{answers:[{field:'board.layout',value:structuredClone(baseline)}]},'PATCH');
    const upload=await api(p+'/evidence',{scope:'public',dataUrl:'data:image/jpeg;base64,'+source.toString('base64')}),evidenceId=upload.createdEvidenceId,frame={...structuredClone(frozenFrame),sourceEvidenceId:evidenceId},session=(await store.getSession(sessionId))!;
    const read=await store.readEvidence(session.evidence.find(e=>e.id===evidenceId)!);if(sha(read.data)!==prepared.sourceSHA256||geometryDigest(frame)!==geometryDigest(frozenFrame))throw Error('Stored source or frame geometry changed');
    const requestId='fixed-'+row.id+'-single-attempt',taskId=digest([sessionId,null,requestId,session.captureEpoch]);
    const selection={kind:'local-observation-v1',task:'catan-numerals-v1',definitionSHA:prepared.definitionSHA,areaId:'board',inputMode:row.mode,frame};
    const plan=await prepareLocalObservation({pack:session.gamePack!,evidence:session.evidence,captureEpoch:session.captureEpoch,selection,taskId,reader,cloud:false,readImage:e=>store.readEvidence(e)});
    if(plan.request.images[0].sha256!==row.input.sha256||JSON.stringify(plan.taskProfile)!==JSON.stringify(row.taskProfile))throw Error('Actual product plan differs from frozen input/profile');
    const accepted=session.assertions.find(a=>a.field==='board.layout'&&a.status==='accepted');if(!accepted)throw Error('Synthetic baseline missing');
    cases.push({id:row.id,index,sessionId,evidenceId,captureEpoch:session.captureEpoch,requestId,taskId,inputSHA:row.input.sha256,bodySHA:row.readerRequestBodySHA256,selection,baselineSHA:sha(JSON.stringify(accepted.value)),frameRebinding:{oldSourceEvidenceId:frozenFrame.sourceEvidenceId,newSourceEvidenceId:evidenceId,frameId:frozenFrame.frameId,geometryDigest:geometryDigest(frame),originalArtifactSHA:metadata.frameSHA256},jobBody:{requestId,scope:'public',expectedCaptureEpoch:session.captureEpoch,evidenceIds:[evidenceId],reader:selection}});
   }
   if(cases[0].baselineSHA!==cases[1].baselineSHA)throw Error('Independent baselines differ');
   saved={version:'number-comparison-product-run-v1',runnerSHA256:selfSHA,preparationSHA256:sha(await readFile(preparedFile)),port:(server.address()as any).port,privateStore:store.root,profile:capability.profile,sourceSHA:prepared.sourceSHA256,definitionSHA:prepared.definitionSHA,frameSHA:metadata.frameSHA256,GTArtifactSHA:metadata.privateGTSHA256,cases};await exclusive(preparedPath,saved);
  }
  for(const c of saved.cases){const s=(await store.getSession(c.sessionId))!,a=s?.assertions.find(a=>a.field==='board.layout'&&a.status==='accepted');if(!a||s.captureEpoch!==c.captureEpoch||s.assertions.some(a=>a.status==='candidate')||sha(JSON.stringify(a.value))!==c.baselineSHA||sha((await store.readEvidence(s.evidence.find(e=>e.id===c.evidenceId)!)).data)!==prepared.sourceSHA256)throw Error('Prepared case changed');}
  const bodyProof=await json(path.join(path.dirname(preparedFile),'body-verification.json'));if(bodyProof.networkSends!==0||bodyProof.actualProductTransportBody.some((r:any)=>!r.match))throw Error('Actual transport preparation proof missing');
  const report={status:'PREPARED_ONLY_NO_MODEL_SEND',runnerSHA256:selfSHA,preparationSHA256:saved.preparationSHA256,privatePreparation:preparedPath,privateRoot:runRoot,port:saved.port,cases:saved.cases.map((c:any)=>({id:c.id,sessionId:c.sessionId,evidenceId:c.evidenceId,captureEpoch:c.captureEpoch,inputSHA:c.inputSHA,bodySHA:c.bodySHA,frameRebinding:c.frameRebinding,baselineSHA:c.baselineSHA})),profile:capability.profile,modelRequests:0,paid:0,dispatch:'Explicit --execute only; wx batch+per-condition ledger blocks repeat. Exact runtime/profile/input/body checked before originalFetch.',stop:'N1 job failure/stale/interrupted/timeout or transport/OOM/truncation/wire failure stops N2. Valid empty or wrong numerals do not stop N2.',GTInModel:false,sourceOrRuntimeChanges:0,serverAfterPrepare:'Closed; execute restarts only this new evaluation server/port. Existing preview/model untouched.'};
  await record(publicReport,report);console.log(JSON.stringify({phase:'prepared',runnerSHA256:selfSHA,modelRequests:0,privatePreparation:preparedPath,port:saved.port}));server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));globalThis.fetch=originalFetch;
 }else{
  const results:any[]=[];
  for(const c of saved.cases){
   const s=(await store.getSession(c.sessionId))!;if(s.captureEpoch!==c.captureEpoch||s.assertions.some(a=>a.status==='candidate')||sha(JSON.stringify(s.assertions.find(a=>a.field==='board.layout'&&a.status==='accepted')!.value))!==c.baselineSHA)throw Error('Evaluation state changed before send');
   revision=undefined;await api('/sessions/'+c.sessionId);active=c;let job:any,exception:string|null=null;const start=performance.now();
   try{job=(await api('/sessions/'+c.sessionId+'/analysis-jobs',c.jobBody)).job;const deadline=Date.now()+650000;while(['queued','running'].includes(job.state)&&Date.now()<deadline){await new Promise(r=>setTimeout(r,1000));job=(await api('/sessions/'+c.sessionId+'/analysis-jobs')).jobs.find((j:any)=>j.id===job.id);}
   }catch(e){exception=e instanceof Error?e.message:'Evaluation error';}
   const elapsedMs=performance.now()-start;active=undefined;
   let completion:any=null;try{completion=await json(path.join(receiptDirectory,c.taskId+'.completion.json'));}catch{}
   const result={id:c.id,sessionId:c.sessionId,url:base+'/?session='+c.sessionId,jobId:job?.id??null,state:job?.state??'failed-before-job',error:exception,timings:job?.timings??{},completion,endToEndJobMs:elapsedMs,assemblyOnlyMs:'UNKNOWN_NOT_SEPARATELY_INSTRUMENTED',reviewAndSaveTiming:'PENDING_INDEPENDENT_UI',actualImageTokenCount:'UNKNOWN',totalMetalMemory:'UNKNOWN_NOT_MEASURED',cloudModelCostUSD:0,hardwareEnergyCost:'UNKNOWN'};
   results.push(result);await record(path.join(runRoot,c.id+'-result.json'),{...result,job});console.log(JSON.stringify({phase:'job-result',id:c.id,state:result.state,wallMs:elapsedMs,modelAttempts:attempts}));
   if(job?.state!=='completed'){await record(path.join(runRoot,'stop.json'),{after:c.id,reason:'Common job/transport/format failure; no automatic retry',N2:c.id==='N1'?'SKIPPED':'not-applicable'});break;}
  }
  // Only evaluation reads ground-truth values, after both conditions have finished or stopped.
  const truth=await json(metadata.privateGTPath);
  const points=truth.objects.filter((o:any)=>o.localizationEligible).map((o:any)=>{const c=o.center_pixels;return {id:o.id,center:{x:(Array.isArray(c)?c[0]:c.x)/metadata.sourceDimensions[0],y:(Array.isArray(c)?c[1]:c.y)/metadata.sourceDimensions[1]},number:o.number};});
  if(points.length!==18)throw Error('Frozen GT denominator changed');
  const summaries=[];
  for(const result of results){const recordJSON=await json(path.join(runRoot,result.id+'-result.json')),receipts=recordJSON.job?.observationReceipts??[],receipt=receipts[0];
   if(result.state!=='completed'||!receipt){summaries.push({...result,score:{status:'UNSCORABLE',denominator:18}});continue;}
   const predictions=receipt.result.observations.map((o:any)=>({bbox:mapObservationRegion(o,receipt.request,receipt.transforms)!,number:o.properties.number?.state==='observed'?o.properties.number.value:null})).filter((p:any)=>p.bbox);
   const score=scoreNumberGrounding(points,predictions);await record(path.join(runRoot,result.id+'-score.json'),score);const {rows,extras,...counts}=score;
   summaries.push({...result,score:{...counts,rawItemCount:receipt.nativeWire?.result.items.length??null,extraUnmatched:extras.length,deferred:receipt.nativeWire?.deferred.length??0,extraMeaning:'Unmatched region; direct visual adjudication still needed, not automatically a false positive.'}});
  }
  await record(publicReport,{status:'EXECUTED_BOUNDED_PRODUCT_PATH',runnerSHA256:selfSHA,base,pid:process.pid,privateRoot:runRoot,results:summaries,modelAttempts:attempts,maxAttempts:2,retry:0,concurrency:1,paid:0,GTArtifactSHA:metadata.privateGTSHA256,frameSHA:metadata.frameSHA256,sourceSHA:prepared.sourceSHA256,fullDenominator:18,atlasContainedCenterDenominator:18,limits:['Same one photo/two modes; no global accuracy or stable speed conclusion.','Job/reader timings exclude subsequent independent UI correction/save; calibration wall time is separately recorded.','No GT/count/frame/panel sent in compact body. Partial raw, unknown and accepted state remain separate.'],preview:'This evaluation server remains for independent UI review; existing51328 is untouched.'});console.log(JSON.stringify({phase:'finished',base,pid:process.pid,modelAttempts:attempts,paid:0}));
 }
}catch(error){active=undefined;await record(path.join(runRoot,'runner-error.json'),{message:error instanceof Error?error.message:'Runner failed',attempts,at:new Date().toISOString()});globalThis.fetch=originalFetch;server.closeAllConnections();server.close();throw error;}
