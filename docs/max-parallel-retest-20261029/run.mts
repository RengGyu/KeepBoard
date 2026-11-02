import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {GeminiGameReader} from '../../server/ai/geminiGameReader.ts';
import {prepareScanObservation,analyzeScanUnit} from '../../server/scanObservation.ts';
import {commitAnalysisTask,digest,scopeVersion} from '../../server/analysisTask.ts';
import {photoDefinition} from '../../server/photoDefinitions.ts';
import {effectiveRecognitionPack} from '../../shared/recognition.ts';
const dir=new URL('./',import.meta.url),origin='https://keepboard-kappa.vercel.app';
const privateDir=process.env.HOME+'/Library/Application Support/KeepBoard/research/max-parallel-20261029';
await fs.mkdir(privateDir,{recursive:true,mode:0o700});
const hash=(b:any)=>createHash('sha256').update(b).digest('hex');
const plan=JSON.parse(await fs.readFile(new URL('../whole-detail-parallel-20261029/input-plan.json',dir),'utf8'));
const report:any={startedAt:new Date().toISOString(),status:'STARTED',modelCalls:0,retries:0,conditions:[],productionModelJobs:0,productEdits:0};
await fs.writeFile(new URL('single-attempt.claim',dir),report.startedAt,{flag:'wx'});
const save=()=>fs.writeFile(new URL('result.json',dir),JSON.stringify(report,null,2)+'\n');
const nativeFetch=globalThis.fetch;let revision:string|undefined,route:string|undefined,condition:any;
async function api(p:string,body?:any,method=body===undefined?'GET':'POST',raw=false){
 const r=await nativeFetch(origin+p,{method,headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
 const b=Buffer.from(await r.arrayBuffer());if(!r.ok)throw Error('Application HTTP '+r.status+' '+p.replace(/\/sessions\/[^/]+/,'/sessions/:id'));
 if(raw)return b;const v=JSON.parse(b.toString());if(v.session?.storageRevision)revision=v.session.storageRevision;return v;
}
try{
 const data=await Promise.all(plan.inputs.map(async(x:any)=>{const b=await fs.readFile(x.path);assert.equal(hash(b),x.sha256);return b;}));
 const made=await api('/api/sessions',{gamePackId:'catan-base',name:'최대 병렬 재시험 · 자체 임시 기록',recordingMode:'simple',players:[{id:'p1',name:'시험1',color:'red'},{id:'p2',name:'시험2',color:'blue'}]});
 route='/api/sessions/'+made.session.id;report.sessionId=made.session.id;const epoch=made.session.captureEpoch;await save();
 const ids:string[]=[],uploadRows:any[]=[],uploadStart=performance.now();
 async function transfer(i:number){
  const x=plan.inputs[i],meta={scope:'public',label:'최대 병렬 시험 '+x.id,expectedCaptureEpoch:epoch,width:x.width,height:x.height,...(i?{sourceEvidenceId:ids[0],sourceRegion:x.sourceRegion}:{})};
  const started=performance.now(),ticket=await api(route+'/upload-ticket',{...meta,contentType:x.mimeType}),putStart=performance.now();
  const r=await nativeFetch(ticket.signedUrl,{method:'PUT',headers:{'Content-Type':x.mimeType,'x-upsert':'false'},body:data[i],signal:AbortSignal.timeout(60000)});assert(r.ok,'signed upload failed');
  uploadRows[i]={index:i,id:x.id,ticketAndPutMs:performance.now()-started,putMs:performance.now()-putStart,sourceSHA:x.sha256};return {meta,ticket:ticket.ticket};
 }
 async function attach(i:number,t:any){const v=await api(route+'/evidence',{...t.meta,uploadTicket:t.ticket});ids[i]=v.createdEvidenceId;}
 // The parent evidence must exist before crop tickets. Writes stay serial for revision/CAS safety.
 await attach(0,await transfer(0));
 const transfers=await Promise.all([1,2,3,4].map(transfer));
 for(let i=1;i<5;i++)await attach(i,transfers[i-1]);
 report.upload={wallMs:performance.now()-uploadStart,putPeakUpperBound:4,parentDependency:true,attachmentConcurrency:1,rows:uploadRows};
 const view=await api(route),session=view.session,pack=effectiveRecognitionPack(session.gamePack),evidence=ids.map(id=>session.evidence.find((e:any)=>e.id===id));assert(evidence.every(Boolean));
 const acquire=performance.now();const downloads=await Promise.all(evidence.map(async(e:any,i:number)=>{const b=await api(e.url,undefined,'GET',true);assert.equal(hash(b),plan.inputs[i].sha256);return b;}));
 report.acquireParallelMs=performance.now()-acquire;
 const byteMap=new Map(evidence.map((e:any,i:number)=>[e.id,downloads[i]]));
 const readImage=async(e:any)=>({data:byteMap.get(e.id)!,mimeType:plan.inputs[ids.indexOf(e.id)].mimeType});
 process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE='/Users/jeonggyuju/.paseo/uploads/upload_6369b418-2c20-46c9-8a11-e5605bd97391/KeepBoader_Gemini_API';
 const reader=new GeminiGameReader(),definition=photoDefinition(pack),prepStart=performance.now();
 const scan=await prepareScanObservation({session,pack,evidence,selection:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'board'},taskId:'frozen-max-parallel-'+randomUUID(),reader,cloud:false,readImage});
 report.prepareWithVerifiedMemoryInputsMs=performance.now()-prepStart;report.inputPlan=scan.plan;await save();
 const requestHashes=new Map<number,string>();let halt=false;
 globalThis.fetch=async function(input:any,init:any){
  const url=String(input);if(!url.startsWith('https://generativelanguage.googleapis.com/'))return nativeFetch(input,init);
  if(halt)throw Error('Previous provider failure: no further dispatch');
  const body=JSON.parse(init.body),image=body.contents[0].parts.find((x:any)=>x.inlineData).inlineData;
  const imageSHA=hash(Buffer.from(image.data,'base64')),index=plan.inputs.findIndex((x:any)=>x.sha256===imageSHA);assert(index>=0);
  const requestSHA=hash(init.body);if(requestHashes.has(index))assert.equal(requestSHA,requestHashes.get(index));else requestHashes.set(index,requestSHA);
  condition.active++;condition.peak=Math.max(condition.peak,condition.active);report.modelCalls++;const t=performance.now();
  try{const r=await nativeFetch(input,init),b=Buffer.from(await r.arrayBuffer()),n=JSON.parse(b.toString());
   await fs.writeFile(privateDir+'/'+condition.id+'-'+index+'.native.json',b,{mode:0o600});
   const row={index,id:plan.inputs[index].id,http:r.status,ms:performance.now()-t,requestSHA,sourceSHA:imageSHA,rawSHA:hash(b),usage:n.usageMetadata??null,finish:n.candidates?.[0]?.finishReason,model:n.modelVersion};
   condition.calls[index]=row;condition.finishedOrder.push(index);console.log(JSON.stringify({phase:'provider',condition:condition.id,...row}));
   if(!r.ok||row.finish!=='STOP')halt=true;
   return new Response(b,{status:r.status,headers:r.headers});
  }catch(e){halt=true;throw e;}finally{condition.active--;}
 } as typeof fetch;
 for(const cap of [2,5]){
  condition={id:'cap-'+cap,concurrency:cap,peak:0,active:0,calls:new Array(5),finishedOrder:[]};report.conditions.push(condition);const results:any[]=new Array(5),start=performance.now();let next=0;
  await Promise.all(Array.from({length:cap},async()=>{while(next<5&&!halt){const index=next++;results[index]=await analyzeScanUnit({scan,index,session:structuredClone(session),pack,evidence,reader,readImage});}}));
  condition.readWallMs=performance.now()-start;condition.units=results.map(r=>r?.scanBundle?.units[0]);assert(!halt);assert.equal(results.filter(Boolean).length,5);assert(results.every(r=>r.scanBundle.units[0].state==='completed'));
  assert.deepEqual(results.map(r=>r.scanBundle.units[0].unitId),scan.plan.units.map((u:any)=>u.id));
  await fs.writeFile(privateDir+'/'+condition.id+'-results.json',JSON.stringify(results),{mode:0o600});
  let saved=structuredClone(session);const store={getSession:async()=>structuredClone(saved),saveSession:async(s:any)=>{saved=structuredClone(s);}},pins={configurationStamp:async()=> 'fixed-test-pin'};
  const task={prepared:{session,pack,evidence,purpose:'capture',sameStaticState:true,scanObservation:scan},epoch:session.captureEpoch,version:scopeVersion(session,pack),source:digest(evidence),pin:'fixed-test-pin'};
  const commitStart=performance.now(),committed=await commitAnalysisTask(store as any,pins as any,task as any,{id:'isolated-'+condition.id,sessionId:session.id} as any,structuredClone(results));assert.equal(committed.state,'completed');
  condition.localCommitMs=performance.now()-commitStart;
  const scene=saved.assertions.find((a:any)=>a.field==='board.layout'&&a.status==='accepted');assert(scene);
  condition.anchorRows=results[0].observationReceipts?.[0]?.result.observations.length;
  condition.projection={rows:scene.value.components.length,kinds:Object.fromEntries([...new Set(scene.value.components.map((x:any)=>x.kind))].map(k=>[k,scene.value.components.filter((x:any)=>x.kind===k).length]))};
  condition.rawKinds=results.map(r=>{const o=r.observationReceipts?.[0]?.result.observations??[];return {unit:r.scanBundle.units[0].unitId,rows:o.length,kinds:Object.fromEntries([...new Set(o.map((x:any)=>x.componentId))].map(k=>[k,o.filter((x:any)=>x.componentId===k).length]))};});
  const encoded=JSON.stringify(saved),reopened=JSON.parse(encoded);assert.equal(digest(reopened.assertions),digest(saved.assertions));condition.localJSONReopenExact=true;
  await fs.writeFile(privateDir+'/'+condition.id+'-saved.json',encoded,{mode:0o600});
  condition.usage={input:condition.calls.reduce((s:any,r:any)=>s+(r.usage?.promptTokenCount??0),0),output:condition.calls.reduce((s:any,r:any)=>s+(r.usage?.candidatesTokenCount??0),0),total:condition.calls.reduce((s:any,r:any)=>s+(r.usage?.totalTokenCount??0),0)};
  delete condition.active;await save();
 }
 report.status='COMPLETED';report.sameRequestBodies=true;report.under30=report.conditions[1].readWallMs<30000;
 report.limits=['Isolated actual reader/prepare/commit pipeline, not Vercel durable workflow or mobile end-to-end.','Verified photo downloads are timed separately; model workers read immutable verified buffers.','Same 5 request bodies, one run per condition; no accuracy/speed stability claim.','Cloud uploads are real; local commit/reopen is JSON persistence, not another production save test.'];
}catch(e){report.status='FAILED';report.error=e instanceof Error?e.message:String(e);process.exitCode=1;}
finally{globalThis.fetch=nativeFetch;try{if(route){await api(route,undefined,'DELETE');report.ownTestArchived=true;}}catch{report.archiveFailed=true;}await save();console.log(JSON.stringify({phase:'done',status:report.status,calls:report.modelCalls}));}
