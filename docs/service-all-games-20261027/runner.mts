// Offline plan first. Execute is reserved for a separately reviewed, approved case manifest.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,open,readFile,realpath,stat,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';

const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const args=process.argv.slice(2),arg=(key:string)=>{const i=args.indexOf(key);return i<0?undefined:args[i+1];};
const mode=arg('--mode');
const jobById=(jobs:any[],id:string)=>jobs.find(j=>j.id===id);
const stopStatus=(status:number)=>[401,402,403,429].includes(status)||status>=500;
const withinCap=(used:number,planned:number,cap:number)=>used+planned<=cap+1e-9;
const mayAttempt=(attempts:{gameId:string;reservedUsd:number}[],gameId:string,reserve:number,cap:number)=>attempts.length<119&&!attempts.some(a=>a.gameId===gameId)&&withinCap(attempts.reduce((n,a)=>n+a.reservedUsd,0),reserve,cap);
if(mode==='self-test'){
 assert.equal(jobById([{id:'a',requestId:undefined},{id:'b'}],'b')?.id,'b');
 assert.equal(jobById([{id:'a'}],'missing'),undefined);
 assert.equal(stopStatus(429),true);assert.equal(stopStatus(400),false);
 assert.equal(stopStatus(402),true);
 assert.equal(withinCap(19.9,.2,20),false);assert.equal(withinCap(19.8,.2,20),true);
 const attempts=Array.from({length:118},(_,n)=>({gameId:`g${n}`,reservedUsd:.1}));
 assert.equal(mayAttempt(attempts,'g118',.1,20),true);
 assert.equal(mayAttempt([...attempts,{gameId:'g118',reservedUsd:.1}],'g119',.1,20),false);
 assert.equal(mayAttempt(attempts,'g0',.1,20),false);
 assert.equal(mayAttempt(attempts,'g118',9,20),false);
 console.log(JSON.stringify({mode:'self-test',assertions:10,providerCalls:0}));process.exit(0);
}
if(mode!=='check'&&mode!=='execute')throw Error('Use --mode check, execute or self-test');
const root=arg('--data-dir'),manifestPath=arg('--manifest'),batchId=arg('--batch-id'),budget=Number(arg('--budget-usd'));
if(!root||!path.isAbsolute(root)||root.includes('/.keepboard')||root.startsWith('/Users/jeonggyuju/Project_folder/KeepBoard')||!manifestPath||!path.isAbsolute(manifestPath)||!batchId||!/^[a-zA-Z0-9_-]{1,60}$/.test(batchId)||!Number.isFinite(budget)||budget<=0||budget>20)throw Error('Use private absolute paths, a batch ID and --budget-usd up to 20');
const scriptSHA=sha(await readFile(new URL(import.meta.url))),manifestBytes=await readFile(manifestPath),manifestSHA=sha(manifestBytes),manifest=JSON.parse(manifestBytes.toString()) as {cases:any[]};
if(!Array.isArray(manifest.cases)||manifest.cases.length<1||manifest.cases.length>119)throw Error('Approved case count must be 1..119');
const ids=new Set<string>();for(const c of manifest.cases){if(!c||typeof c.gameId!=='string'||c.gameId==='catan'||c.gameId==='catan-base'||ids.has(c.gameId))throw Error('Unique non-Catan games required');ids.add(c.gameId);}
await mkdir(root,{recursive:true,mode:0o700});if(((await stat(root)).mode&0o777)!==0o700)throw Error('Private result root must be mode 0700');
process.env.KEEPBOARD_DATA_DIR=root;process.chdir(root); // Before any product import; no shared .env or .keepboard.
const [{catalogPacks},{photoDefinition},{effectiveRecognitionPack},{compileObservationTask},{imageDimensions},{buildGeminiGameBody,hostedVisibleProperty}]=await Promise.all([
 import('../../gamepacks/catalog.ts'),import('../../server/photoDefinitions.ts'),import('../../shared/recognition.ts'),import('../../shared/lightweightRecognition.ts'),import('../../server/localObservation.ts'),import('../../server/ai/geminiGameReader.ts')
]);
const privateWrite=(file:string,value:unknown)=>writeFile(file,JSON.stringify(value,null,2)+'\n',{mode:0o600});
const ledgerFile=path.join(root,'attempt-ledger.json');
let ledger:{attempts:{gameId:string;batchId:string;reservedUsd:number;at:string;status?:number}[]}={attempts:[]};
try{ledger=JSON.parse(await readFile(ledgerFile,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
if(!Array.isArray(ledger.attempts)||ledger.attempts.length>119)throw Error('Attempt ledger invalid');
const usedIds=new Set(ledger.attempts.map(a=>a.gameId));if(manifest.cases.some(c=>usedIds.has(c.gameId))||ledger.attempts.length+manifest.cases.length>119)throw Error('Global one-request-per-game/119 cap reached');
const plans=[] as any[];
for(const c of manifest.cases){
 if(typeof c.packId!=='string'||typeof c.sourceSHA!=='string'||typeof c.path!=='string'||!path.isAbsolute(c.path)||!['image/jpeg','image/png','image/webp'].includes(c.mime)||!Number.isInteger(c.width)||!Number.isInteger(c.height)||typeof c.areaId!=='string'||typeof c.partition!=='string'||typeof c.referencePath!=='string'||!path.isAbsolute(c.referencePath)||typeof c.referenceSHA!=='string')throw Error(`Invalid approved case shape: ${c.gameId}`);
 if([await realpath(c.path),await realpath(c.referencePath)].some(p=>p.split(path.sep).includes('.keepboard')))throw Error(`Private runtime data is not a benchmark input: ${c.gameId}`);
 const source=await readFile(c.path);if(sha(source)!==c.sourceSHA)throw Error(`Source SHA mismatch: ${c.gameId}`);
 const dimensions=imageDimensions(source);if(dimensions.width!==c.width||dimensions.height!==c.height)throw Error(`Source dimensions mismatch: ${c.gameId}`);
 if(sha(await readFile(c.referencePath))!==c.referenceSHA)throw Error(`Reference SHA mismatch: ${c.gameId}`);
 const raw=catalogPacks.find(p=>p.id===c.packId&&p.runtime?.source.gameId===c.gameId);if(!raw)throw Error(`Current pack missing: ${c.gameId}`);
 const pack=effectiveRecognitionPack(raw),definition=photoDefinition(pack),area=definition.areas.find(a=>a.id===c.areaId);
 if(!area||area.partition!==c.partition||(c.partition==='owner_private'?(!c.ownerId||typeof c.ownerId!=='string'):c.ownerId!==undefined))throw Error(`Area/owner scope mismatch: ${c.gameId}`);
 const request=compileObservationTask({pack,definition,areaId:c.areaId,taskId:'preflight-only',scope:{partition:area.partition,ownerId:c.ownerId??null,captureEpoch:'preflight-only'},images:[{evidenceId:'preflight-only',inputId:'preflight-only',sha256:c.sourceSHA,...dimensions,transformId:null}]});
 for(const component of definition.components)if(request.allowedPropertyIds[component.id])request.allowedPropertyIds[component.id]=request.allowedPropertyIds[component.id].filter(id=>hostedVisibleProperty(component,id));
 const body=buildGeminiGameBody(request,definition,source,c.mime),prompt=body.contents[0].parts[0].text;
 // Upper planning envelope, not a bill or provider-token guarantee.
 const inputPlanTokens=Buffer.byteLength(prompt)+8192,requestReserveUsd=(inputPlanTokens*.75+32768*3.75)/1_000_000;
 plans.push({gameId:c.gameId,packId:c.packId,packVersion:pack.version,nativeBridge:definition.nativeBridge??null,sourcePackSHA:pack.runtime?.source.sha256,sourceSHA:c.sourceSHA,sourceBytes:source.length,path:c.path,mime:c.mime,width:c.width,height:c.height,areaId:c.areaId,partition:c.partition,ownerId:c.ownerId??null,referencePath:c.referencePath,referenceSHA:c.referenceSHA,definitionSHA:definition.definitionSHA,allowedComponents:request.allowedComponents,allowedPropertyIds:request.allowedPropertyIds,promptSHA:sha(prompt),bodySHA:sha(JSON.stringify(body)),model:'gemini-3.8-flash',maxOutputTokens:32768,inputPlanTokens,requestReserveUsd});
}
const alreadyReserved=ledger.attempts.reduce((n,a)=>n+a.reservedUsd,0),planned=plans.reduce((n,p)=>n+p.requestReserveUsd,0);
if(!withinCap(alreadyReserved,planned,budget))throw Error('Planned global budget envelope exceeded');
const plan={version:1,scriptSHA,manifestSHA,batchId,budgetUsd:budget,previousAttempts:ledger.attempts.length,previousReservedUsd:alreadyReserved,plannedRequests:plans.length,plannedReserveUsd:planned,maxGlobalRequests:119,concurrency:1,retries:0,providerTimeoutMs:180000,pricingEstimate:{inputPerMillionUsd:.75,outputPerMillionUsd:3.75,imageAllowanceTokensPerCase:8192,note:'planning only; actual billing and image tokens unknown'},cases:plans};
const planPath=path.join(root,`plan-${batchId}.json`);
if(mode==='check'){
 const f=await open(planPath,'wx',0o600);await f.writeFile(JSON.stringify(plan,null,2)+'\n');await f.close();
 console.log(JSON.stringify({mode:'check',batchId,manifestSHA,scriptSHA,caseCount:plans.length,plannedReserveUsd:Number(planned.toFixed(4)),previousAttempts:ledger.attempts.length,maxGlobalRequests:119,providerCalls:0,planPath}));process.exit(0);
}
if(JSON.stringify(JSON.parse(await readFile(planPath,'utf8')))!==JSON.stringify(plan))throw Error('Source, definition, plan or script drift; no requests sent');
const keyFile=process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE;if(!keyFile||!path.isAbsolute(keyFile)||!(await stat(keyFile)).isFile())throw Error('Existing supplied key FILE path required; no requests sent');
const lockPath=path.join(root,'active.lock'),lock=await open(lockPath,'wx',0o600);
try{const claim=await open(path.join(root,`claim-${batchId}`),'wx',0o600);await claim.writeFile(JSON.stringify({scriptSHA,manifestSHA,at:new Date().toISOString()}));await claim.close();}
catch(error){await lock.close();await unlink(lockPath);throw error;}
const realFetch=globalThis.fetch.bind(globalThis),providerURL='https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';
let active:any=null,activeFolder='',providerCalls=0,systemicStop=false,providerStatus:number|null=null,nativeSHA:string|null=null,nativeFinish:string|null=null,usage:Record<string,number>|null=null;
globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
 const url=input instanceof Request?input.url:String(input);if(url.startsWith('http://127.0.0.1:'))return realFetch(input,init);
 if(url!==providerURL||!active||providerCalls>=1)throw Error('Unexpected external endpoint or second request blocked');
 const wireText=String(init?.body??''),wire=JSON.parse(wireText);
 if(sha(wireText)!==active.bodySHA||sha(Buffer.from(wire.contents?.[0]?.parts?.[1]?.inlineData?.data??'','base64'))!==active.sourceSHA)throw Error('Provider request/image drift blocked before send');
 const latest=JSON.parse(await readFile(ledgerFile,'utf8').catch((e:any)=>{if(e.code==='ENOENT')return '{"attempts":[]}';throw e;}));
 if(!mayAttempt(latest.attempts,active.gameId,active.requestReserveUsd,budget)){systemicStop=true;throw Error('Global attempt or planning budget cap reached');}
 latest.attempts.push({gameId:active.gameId,batchId,reservedUsd:active.requestReserveUsd,at:new Date().toISOString()});
 const tmp=ledgerFile+'.'+randomUUID()+'.tmp';await privateWrite(tmp,latest);await rename(tmp,ledgerFile);providerCalls++;
 await privateWrite(path.join(activeFolder,'request-description.json'),{bodySHA:active.bodySHA,promptSHA:active.promptSHA,sourceSHA:active.sourceSHA,definitionSHA:active.definitionSHA,generationConfig:wire.generationConfig});
 try{const response=await realFetch(input,init);providerStatus=response.status;
  const responseText=await response.clone().text();nativeSHA=sha(responseText);await writeFile(path.join(activeFolder,'native-response.json'),responseText,{mode:0o600});
  if(response.ok)try{const parsed=JSON.parse(responseText);nativeFinish=typeof parsed.candidates?.[0]?.finishReason==='string'?parsed.candidates[0].finishReason:null;usage=Object.fromEntries(Object.entries(parsed.usageMetadata??{}).filter(([,v])=>typeof v==='number')) as Record<string,number>;}catch{}
  if(stopStatus(response.status))systemicStop=true;
  if(response.status===400){try{const native=JSON.parse(responseText);if(JSON.stringify(native?.error?.details??[]).match(/API_KEY_INVALID|QUOTA|BILLING/))systemicStop=true;}catch{}}
  return response;
 }catch(error){systemicStop=true;throw error;}
}) as typeof fetch;

const {createApp}=await import('../../server/index.ts'),{Store}=await import('../../server/store.ts');
const summaries:any[]=[];
try{
 for(const c of plans){
  if(systemicStop)break;active=c;providerCalls=0;providerStatus=null;nativeSHA=null;nativeFinish=null;usage=null;
  activeFolder=path.join(root,'cases',c.gameId);await mkdir(activeFolder,{recursive:true,mode:0o700});
  const app=await createApp({store:new Store(activeFolder),ui:false}),server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+(server.address() as {port:number}).port+'/api';let revision:string|undefined;
  async function call(route:string,payload?:unknown,method=payload===undefined?'GET':'POST'){
   const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:payload===undefined?undefined:JSON.stringify(payload)}),value=await response.json() as any;
   if(value.session?.storageRevision)revision=value.session.storageRevision;if(!response.ok)throw Error(`Product API ${route}: ${response.status}`);return value;
  }
  let sessionPath:string|undefined;
  const summary:any={gameId:c.gameId,sourceSHA:c.sourceSHA,definitionSHA:c.definitionSHA,bodySHA:c.bodySHA,referenceSHA:c.referenceSHA,providerCalls:0,providerStatus:null,jobState:null,candidateCount:0,acceptedCount:0,modelValuesPreserved:null,receiptPreserved:null,saveReopen:null,purpose:'same-value candidate acceptance or native review; no owner/placement inference'};
  try{
   const players=c.ownerId?[{id:c.ownerId,name:'평가용 플레이어',color:'blue'}]:undefined;
   const created=await call('/sessions',{gamePackId:c.packId,gamePackVersion:c.packVersion,name:'isolated service photo comparison',recordingMode:'simple',...(players?{players}:{})}),p='/sessions/'+created.session.id;sessionPath=p;
   const bytes=await readFile(c.path);if(sha(bytes)!==c.sourceSHA)throw Error('Photo changed before upload');
   const upload=await call(p+'/evidence',{scope:c.ownerId?'player':'public',...(c.ownerId?{ownerId:c.ownerId}:{}),dataUrl:`data:${c.mime};base64,`+bytes.toString('base64')});
   const request={requestId:randomUUID(),evidenceIds:[upload.createdEvidenceId],expectedCaptureEpoch:upload.session.captureEpoch,scope:c.ownerId?'player':'public',...(c.ownerId?{ownerId:c.ownerId}:{}),reader:{kind:'gemini-game-observation-v1',definitionSHA:c.definitionSHA,areaId:c.areaId}};
   const started=await call(p+'/analysis-jobs',request);const jobId=started.job?.id;if(typeof jobId!=='string')throw Error('No public job ID');
   let job:any;for(let n=0;n<240;n++){const jobs=await call(p+'/analysis-jobs'+(c.ownerId?`?ownerId=${encodeURIComponent(c.ownerId)}`:''));job=jobById(jobs.jobs,jobId);if(job&&['completed','failed','stale','interrupted'].includes(job.state))break;await new Promise(resolve=>setTimeout(resolve,1000));}
   summary.jobState=job?.state??'timeout';summary.jobTimings=job?.timings??null;if(job?.state!=='completed')throw Error('Analysis job did not complete');
   const view=await call(p),candidates=(view.session.assertions as any[]).filter(a=>a.status==='candidate'&&a.observationReceipts?.some((r:any)=>r.reader?.kind==='gemini-game-observation-v1'));
   summary.candidateCount=candidates.length;await privateWrite(path.join(activeFolder,'candidates-before-apply.json'),candidates);
   if(!candidates.length){summary.saveReopen='not-applicable-no-candidate';continue;}
   for(const candidate of candidates){
    if(c.nativeBridge==='rummikub')await call(p,{answers:[{field:candidate.field,value:candidate.value,...(candidate.ownerId?{ownerId:candidate.ownerId}:{}),observationReview:{version:'native-observation-review-v1',sourceAssertionId:candidate.id,expectedBaselineAssertionId:null}}]},'PATCH');
    else await call(p+`/assertions/${encodeURIComponent(candidate.id)}/accept`,{},'POST');
   }
   await call(p+'/commit',{allowIncomplete:true,recordingMode:'simple'});await call(p+'/resume',{scope:c.ownerId?'owner':'public',...(c.ownerId?{ownerId:c.ownerId}:{})});
   const reopened=await call(p);await privateWrite(path.join(activeFolder,'reopened-session.json'),reopened);
   const accepted=(reopened.session.assertions as any[]).filter(a=>a.status==='accepted'&&candidates.some(q=>q.field===a.field&&q.ownerId===a.ownerId));
   summary.acceptedCount=accepted.length;summary.modelValuesPreserved=candidates.every(q=>{const a=accepted.find(x=>x.field===q.field&&x.ownerId===q.ownerId);return a&&JSON.stringify(a.value)===JSON.stringify(q.value);});
   summary.receiptPreserved=candidates.every(q=>{const a=accepted.find(x=>x.field===q.field&&x.ownerId===q.ownerId);return a&&q.observationReceipts?.every((r:any)=>a.observationReceipts?.some((saved:any)=>saved.request.taskId===r.request.taskId));});
   summary.saveReopen=accepted.length===candidates.length&&summary.modelValuesPreserved&&summary.receiptPreserved;
  }catch(error){summary.error=error instanceof Error?error.message:'unknown error';}
  finally{if(sessionPath){try{const snapshot=await call(sessionPath);await privateWrite(path.join(activeFolder,'session-after-job.json'),snapshot);const receipts=(snapshot.session?.assertions??[]).flatMap((a:any)=>a.observationReceipts??[]);await privateWrite(path.join(activeFolder,'receipts-after-job.json'),receipts);summary.receiptCount=receipts.length;}catch{summary.receiptCapture='unavailable';}}summary.providerCalls=providerCalls;summary.providerStatus=providerStatus;summary.nativeSHA=nativeSHA;summary.nativeFinish=nativeFinish;summary.usage=usage;await privateWrite(path.join(activeFolder,'summary.json'),summary);summaries.push(summary);server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
 }
}finally{await privateWrite(path.join(root,`result-${batchId}.json`),{batchId,manifestSHA,scriptSHA,systemicStop,summaries,attempts:JSON.parse(await readFile(ledgerFile,'utf8').catch((e:any)=>{if(e.code==='ENOENT')return '{"attempts":[]}';throw e;})).attempts.length});await lock.close();await unlink(lockPath);}
console.log(JSON.stringify({batchId,casesCompleted:summaries.length,planned:plans.length,systemicStop,providerAttempts:summaries.reduce((n,s)=>n+s.providerCalls,0),resultPath:path.join(root,`result-${batchId}.json`)}));
