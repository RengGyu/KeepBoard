// One real product job, with a private native-response receipt. Check mode makes no provider call.
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,open,readFile,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';

const args=process.argv.slice(2);
const option=(name:string)=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
const mode=option('--mode'),root=option('--data-dir'),photo=option('--photo');
if(mode!=='check'&&mode!=='execute')throw Error('Use --mode check or --mode execute');
if(!root||!path.isAbsolute(root)||root.includes('/.keepboard')||!photo||!path.isAbsolute(photo))throw Error('Use absolute private --data-dir and authorized --photo paths');
const digest=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
const source=await readFile(photo),sourceSHA=digest(source);
if(sourceSHA!=='823226a0c1ff53585406e8f9681601d56a2ba2365fb1fc2f574b5b372f0838d6')throw Error('Authorized source SHA mismatch; no request sent');
const scriptSHA=digest(await readFile(new URL(import.meta.url)));
const planFile=path.join(root,'preflight.json');
if(mode==='check')await mkdir(root,{mode:0o700});
else {const info=await stat(root);if(!info.isDirectory()||(info.mode&0o777)!==0o700)throw Error('Private check directory is missing or not mode 0700');}
process.env.KEEPBOARD_DATA_DIR=root;
process.chdir(root); // All product imports happen after isolation from shared .env and .keepboard.
const [{catalogPacks},{photoDefinition},{effectiveRecognitionPack},{compileObservationTask},{imageDimensions},{buildGeminiGameBody,hostedVisibleProperty}]=await Promise.all([
 import('../../gamepacks/catalog.ts'),import('../../server/photoDefinitions.ts'),import('../../shared/recognition.ts'),
 import('../../shared/lightweightRecognition.ts'),import('../../server/localObservation.ts'),import('../../server/ai/geminiGameReader.ts')
]);
const pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id==='catan-base')!);
if(!pack)throw Error('Current Catan pack missing');
const definition=photoDefinition(pack),dimensions=imageDimensions(source);
const observation=compileObservationTask({pack,definition,areaId:'board',taskId:'preflight-only',scope:{partition:'common_public',ownerId:null,captureEpoch:'preflight-only'},images:[{evidenceId:'preflight-only',inputId:'preflight-only',sha256:sourceSHA,...dimensions,transformId:null}]});
for(const component of definition.components)if(observation.allowedPropertyIds[component.id])observation.allowedPropertyIds[component.id]=observation.allowedPropertyIds[component.id].filter(id=>hostedVisibleProperty(component,id));
const body=buildGeminiGameBody(observation,definition,source,'image/jpeg');
const requestBodySHA=digest(JSON.stringify(body)),promptSHA=digest(body.contents[0].parts[0].text);
const plan={version:1,scriptSHA,sourceSHA,sourceBytes:source.length,dimensions,packId:pack.id,packVersion:pack.version,sourceDefinitionSHA:pack.runtime?.source.sha256,definitionSHA:definition.definitionSHA,areaId:'board',reader:'gemini-game-observation-v1',model:'gemini-3.8-flash',requestBodySHA,promptSHA,generationConfig:body.generationConfig,maxProviderRequests:1,retries:0,providerTimeoutMs:180000,providerCalls:0};
const privateWrite=(name:string,value:unknown)=>writeFile(path.join(root,name),JSON.stringify(value,null,2)+'\n',{mode:0o600});
if(mode==='check'){
 await privateWrite('preflight.json',plan);
 console.log(JSON.stringify({mode:'check',sourceSHA,sourceBytes:source.length,dimensions,definitionSHA:definition.definitionSHA,requestBodySHA,promptSHA,model:plan.model,maxProviderRequests:1,providerCalls:0,dataDir:root}));
 process.exit(0);
}
const saved=JSON.parse(await readFile(planFile,'utf8'));
if(JSON.stringify(saved)!==JSON.stringify(plan))throw Error('Preflight source, definition, body or script changed; no request sent');
const keyFile=process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE;
if(!keyFile||!path.isAbsolute(keyFile)||!(await stat(keyFile)).isFile())throw Error('Set the existing supplied key FILE path; no request sent');
const claim=await open(path.join(root,'single-attempt.claim'),'wx',0o600);
await claim.writeFile(JSON.stringify({claimedAt:new Date().toISOString(),sourceSHA,requestBodySHA,maxProviderRequests:1}));await claim.close();
const realFetch=globalThis.fetch.bind(globalThis);
let providerCalls=0,nativeSHA:string|null=null,providerStatus:number|null=null;
const providerURL='https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';
globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
 const url=input instanceof Request?input.url:String(input);
 if(url.startsWith('http://127.0.0.1:'))return realFetch(input,init);
 if(url!==providerURL||providerCalls>=1)throw Error('Unexpected external endpoint or second provider request blocked');
 const sent=String(init?.body??''),wire=JSON.parse(sent);
 if(digest(sent)!==requestBodySHA||digest(Buffer.from(wire.contents?.[0]?.parts?.[1]?.inlineData?.data??'','base64'))!==sourceSHA)throw Error('Provider body/source drift blocked before send');
 providerCalls++;
 await privateWrite('attempt-ledger.json',{providerCalls,requestBodySHA,startedAt:new Date().toISOString()});
 await privateWrite('request-description.json',{requestBodySHA,promptSHA,generationConfig:wire.generationConfig,sourceSHA,imageSHA:sourceSHA,definitionSHA:definition.definitionSHA});
 const response=await realFetch(input,init);providerStatus=response.status;
 if(response.ok){const native=await response.clone().text();nativeSHA=digest(native);await writeFile(path.join(root,'native-response.json'),native,{mode:0o600});}
 return response;
}) as typeof fetch;

const {createApp}=await import('../../server/index.ts');
const {Store}=await import('../../server/store.ts');
const app=await createApp({store:new Store(root),ui:false});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
const base='http://127.0.0.1:'+(server.address() as {port:number}).port+'/api';
let revision:string|undefined;
async function call(route:string,payload?:unknown,method=payload===undefined?'GET':'POST'){
 const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:payload===undefined?undefined:JSON.stringify(payload)});
 const value=await response.json() as any;if(value.session?.storageRevision)revision=value.session.storageRevision;
 if(!response.ok)throw Error(`Product API ${route} returned ${response.status}`);
 return value;
}
const report:Record<string,unknown>={sourceSHA,definitionSHA:definition.definitionSHA,requestBodySHA,providerCalls:0,providerStatus:null,nativeSHA:null,jobState:null,candidateCount:0,modelValuesPreserved:false,regionsPreserved:false,savedReopened:false};
try{
 const created=await call('/sessions',{gamePackId:pack.id,gamePackVersion:pack.version,name:'isolated real photo verification',recordingMode:'simple'}),p='/sessions/'+created.session.id;
 const upload=await call(p+'/evidence',{scope:'public',dataUrl:'data:image/jpeg;base64,'+source.toString('base64')});
 const request={requestId:randomUUID(),evidenceIds:[upload.createdEvidenceId],expectedCaptureEpoch:upload.session.captureEpoch,scope:'public',reader:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'board'}};
 report.sessionId=created.session.id;report.evidenceId=upload.createdEvidenceId;
 const started=performance.now(),submitted=await call(p+'/analysis-jobs',request);
 let job:any;for(let n=0;n<240;n++){const jobs=await call(p+'/analysis-jobs');job=jobs.jobs.find((j:any)=>j.id===submitted.job.id);if(job&&['completed','failed','stale','interrupted'].includes(job.state))break;await new Promise(resolve=>setTimeout(resolve,1000));}
 report.jobState=job?.state??'timeout';report.jobElapsedMs=Math.round(performance.now()-started);report.jobTimings=job?.timings??null;
 if(job?.state!=='completed')throw Error('Analysis job did not complete');
 const view=await call(p),assertions=view.session.assertions as any[],candidate=assertions.find(a=>a.status==='candidate'&&a.observationReceipts?.some((r:any)=>r.reader?.kind==='gemini-game-observation-v1'));
 report.candidateCount=assertions.filter(a=>a.status==='candidate').length;
 report.componentCount=candidate?.value?.components?.length??0;
 if(!candidate)throw Error('No source-linked candidate to review');
 await privateWrite('candidate-before-apply.json',candidate);
 const original=structuredClone(candidate.value),components=original.components as any[];
 await call(p,{answers:[{field:'board.layout',value:original,observationReview:{version:'native-observation-review-v1',sourceAssertionId:candidate.id,expectedBaselineAssertionId:null}}]},'PATCH');
 await call(p+'/commit',{allowIncomplete:true});await call(p+'/resume',{scope:'public'});
 const reopened=await call(p);await privateWrite('reopened-session.json',reopened);
 const accepted=(reopened.session.assertions as any[]).filter(a=>a.status==='accepted'&&a.field==='board.layout').at(-1),actual=accepted?.value?.components as any[]|undefined;
 const byId=new Map((actual??[]).map(c=>[c.id,c]));
 report.modelValuesPreserved=components.every(c=>{const v=byId.get(c.id);return v&&['kind','variant','number','quantity','face','observedColor'].every(k=>JSON.stringify(v[k]??null)===JSON.stringify(c[k]??null));});
 report.regionsPreserved=components.every(c=>JSON.stringify(byId.get(c.id)?.region??null)===JSON.stringify(c.region??null));
 report.savedReopened=!!accepted&&actual?.length===components.length;
 report.receiptAfterReopen=!!accepted?.observationReceipts?.some((r:any)=>r.reader?.kind==='gemini-game-observation-v1');
}catch(error){report.error=error instanceof Error?error.message:'unknown error';}
finally{
 report.providerCalls=providerCalls;report.providerStatus=providerStatus;report.nativeSHA=nativeSHA;
 await privateWrite('summary.json',report);server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));
 console.log(JSON.stringify(report));
}
if(report.error||!report.modelValuesPreserved||!report.regionsPreserved||!report.savedReopened||!report.receiptAfterReopen)process.exitCode=1;
