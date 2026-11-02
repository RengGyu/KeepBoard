// Isolated product-path verification. --prepare has no provider calls. --run consumes the frozen two requests once.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {Store} from '../../server/store';import {createApp} from '../../server/index';
import {TerraGameReader,buildTerraGameBody} from '../../server/ai/terraGameReader';
import {prepareHostedObservation} from '../../server/hostedObservation';import {digest} from '../../server/analysisTask';
const out='docs/terra-integration-20261030',sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const mode=process.argv[2];if(!['--prepare','--run'].includes(mode))throw Error('Use --prepare or --run');
const privateDir=mode==='--prepare'?await fs.mkdtemp('/private/tmp/kb-terra-v1-'):JSON.parse(await fs.readFile(out+'/v1-preflight.json','utf8')).privateDir;
await fs.chmod(privateDir,0o700);const write=async(file:string,data:unknown)=>fs.writeFile(path.join(privateDir,file),JSON.stringify(data,null,2)+'\n',{mode:0o600});
const store=new Store(privateDir+'/store');let calls=0,active=0,peak=0;const ledger:any[]=[];
const reader=new TerraGameReader({fetch:async(url,init)=>{
 if(mode!=='--run'||calls>=2||String(url)!=='https://api.openai.com/v1/responses')throw Error('V1 request budget or endpoint mismatch');
 const body=String(init!.body),bodySHA=sha(body),frozen=JSON.parse(await fs.readFile(out+'/v1-preflight.json','utf8')),c=frozen.cases.find((c:any)=>c.bodySHA===bodySHA);if(!c)throw Error('V1 body differs from frozen original request');
 await fs.writeFile(path.join(privateDir,c.id+'.claim'),bodySHA,{flag:'wx',mode:0o600});calls++;active++;peak=Math.max(peak,active);
 const row:any={id:c.id,bodySHA,startedAt:new Date().toISOString()},start=performance.now();ledger.push(row);await write('ledger.json',{calls,peak,retries:0,rows:ledger});
 try{const response=await fetch(url,init);row.httpStatus=response.status;row.elapsedMs=performance.now()-start;
  if(response.ok){const native=await response.clone().json();await write(c.id+'.native.json',native);row.nativeSHA=sha(await fs.readFile(path.join(privateDir,c.id+'.native.json')));row.model=native.model;row.status=native.status;row.usage=native.usage??null;}
  return response;
 }catch{row.transportFailure=true;throw Error('Terra transport failed; no retry');}finally{active--;row.finishedAt=new Date().toISOString();await write('ledger.json',{calls,peak,retries:0,rows:ledger});}
}});
const app=await createApp({store,terraReader:reader,ui:mode==='--run',uiHmr:false}),server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
const base='http://127.0.0.1:'+(server.address()as any).port;
const call=async(route:string,body?:unknown)=>{const r=await fetch(base+'/api'+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}),value=await r.json();assert(r.ok,'Isolated product request status '+r.status);return value;};
if(mode==='--prepare'){
 const cases=[];
 for(const [id,file]of [['splendor','pilot-inputs.json'],['quacks','quacks-inputs.json']]){
  const input=JSON.parse(await fs.readFile('docs/ten-games-closeup-20261029/video-attempt/'+file,'utf8')),image=input.images.find((i:any)=>i.variant==='W'),data=await fs.readFile(image.path);assert.equal(sha(data),image.sha256);
  const v=await call('/sessions',{gamePackId:input.packId,name:'Terra V1 '+id+' · isolated real photo'}),route='/sessions/'+v.session.id,u=await call(route+'/evidence',{scope:'public',dataUrl:`data:${image.mimeType};base64,${data.toString('base64')}`}),evidence=u.session.evidence.filter((e:any)=>e.id===u.createdEvidenceId);
  const {photoDefinition}=await import('../../server/photoDefinitions'),definition=photoDefinition(v.pack),selection={kind:'terra-game-observation-v1' as const,definitionSHA:definition.definitionSHA,areaId:input.areaId},requestId='v1-'+id,taskId=digest([u.session.id,null,requestId,u.session.captureEpoch]);
  // Preparation checks only the injected availability, never reads a credential.
  const plan=await prepareHostedObservation({pack:v.pack,evidence,captureEpoch:u.session.captureEpoch,selection,taskId,reader:{...reader,identity:reader.identity,status:async()=>({kind:reader.identity.kind,available:true,cloudSupported:true,identity:reader.identity}),read:reader.read.bind(reader),readCatanScene:reader.readCatanScene.bind(reader)},readImage:e=>store.readEvidence(e)});
  const body=buildTerraGameBody(plan.request,definition,data,image.mimeType);await write(id+'.request.json',body);await write(id+'.task.json',plan);assert.equal(sha(await fs.readFile(input.reference.path)),input.reference.sha256);
  cases.push({id,sessionId:u.session.id,areaId:input.areaId,inputSHA:image.sha256,inputPath:image.path,referenceSHA:input.reference.sha256,referencePath:input.reference.path,bodySHA:sha(JSON.stringify(body)),requestId,evidenceId:u.createdEvidenceId,captureEpoch:u.session.captureEpoch,model:reader.identity.model,profile:reader.identity,condition:'original whole W; no resizing',requestUTF8Bytes:Buffer.byteLength(JSON.stringify(body))});
 }
 await fs.writeFile(out+'/v1-preflight.json',JSON.stringify({privateDir,maxCalls:2,authorizedMax:3,retries:0,catan:{state:'NOT_RUN',reason:'exact approved source SHA29f02bc… unavailable; no substituted photo'},cases,auth:'provided-upload, process memory only',preparedAt:new Date().toISOString()},null,2)+'\n');
 console.log(JSON.stringify({prepared:cases.length,providerCalls:0,privateDir}));server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));
}else{
 const preflight=JSON.parse(await fs.readFile(out+'/v1-preflight.json','utf8'));await fs.writeFile(path.join(privateDir,'run.claim'),new Date().toISOString(),{flag:'wx',mode:0o600});const start=performance.now();
 const jobs=await Promise.all(preflight.cases.map(async(c:any)=>{const v=await call('/sessions/'+c.sessionId),task={requestId:c.requestId,evidenceIds:[c.evidenceId],expectedCaptureEpoch:c.captureEpoch,reader:{kind:'terra-game-observation-v1',definitionSHA:c.profile?JSON.parse(await fs.readFile(path.join(privateDir,c.id+'.task.json'),'utf8')).definition.definitionSHA:undefined,areaId:c.areaId}};const j=await call('/sessions/'+c.sessionId+'/analysis-jobs',task);return {...c,jobId:j.job.id};}));
 await Promise.all(jobs.map(async(c:any)=>{
  for(let n=0;n<150;n++){const list=await call('/sessions/'+c.sessionId+'/analysis-jobs'),job=list.jobs.find((j:any)=>j.id===c.jobId);if(!['queued','running'].includes(job.state)){c.jobState=job.state;await write(c.id+'.job.json',job);const view=await call('/sessions/'+c.sessionId);await write(c.id+'.after.json',view);c.receipts=job.observationReceipts?.length??0;c.observations=job.observationReceipts?.reduce((n:number,r:any)=>n+r.result.observations.length,0)??0;break;}await new Promise(r=>setTimeout(r,2000));}
  c.url=base+'/?session='+c.sessionId;
 }));
 const result={providerCalls:calls,peak,retries:0,wallMs:performance.now()-start,privateDir,base,cases:jobs.map((c:any)=>({id:c.id,sessionId:c.sessionId,jobId:c.jobId,jobState:c.jobState,receipts:c.receipts,observations:c.observations,url:c.url})),ledger};await fs.writeFile(out+'/v1-execution.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 // No further model calls: the two-call claim budget is exhausted. Keep only the isolated UI available.
 process.on('SIGTERM',()=>{server.closeAllConnections();server.close(()=>process.exit(0));});
}
