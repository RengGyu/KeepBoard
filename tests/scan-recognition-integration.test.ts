import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {catalogPacks} from '../gamepacks/catalog';import {photoDefinition} from '../server/photoDefinitions';
import {GeminiGameReader,decodeGeminiGameObservation} from '../server/ai/geminiGameReader';import {decodeCatanSceneReading} from '../server/ai/catanSceneReading';
import {prepareScanObservation,analyzeScan,projectScanResults} from '../server/scanObservation';
import {cropPhotoTransform,mapObservationRegion,projectPhotoPoint} from '../shared/photoGeometry';
import {assembleObservations} from '../server/ai/observationAssembly';import {normalizeScene} from '../shared/scene';import {commitAnalysisTask,digest,scopeVersion} from '../server/analysisTask';
import type {Session,Evidence} from '../shared/types';
const pack=catalogPacks.find(p=>p.id==='catan-base')!,definition=photoDefinition(pack);
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=','base64');
const evidence=(id:string,extra={})=>({id,kind:'photo',scope:'public',captureEpoch:'epoch',url:'/x',label:id,...extra}) as Evidence;
const state=(evidence:Evidence[])=>({id:'test',name:'synthetic',gamePackId:pack.id,gamePackVersion:pack.version,gamePack:pack,players:[],turnInstanceId:'turn',captureEpoch:'epoch',evidence,assertions:[],notes:{},activity:[],snapshots:[],preservations:[],stage:'capture'}) as unknown as Session;
const literal=(number:number|null=8)=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({items:[{kind:'number-token',box_1000:[100,100,200,200],face:'front',quantity:1,attributes:[{id:'number',valueJson:number===null?null:String(number),unknownReason:number===null?'occluded':null}]}]})}]}}]});
class MockReader extends GeminiGameReader{
 calls:string[]=[];active=0;peak=0;fail='';value:number|null=8;
 async status(){return {kind:'gemini-game-observation-v1' as const,available:true,cloudSupported:true as const,identity:this.identity};}
 async read(request:any,def:any,image:Buffer,mime:string,transforms:any[]=[]){this.calls.push(request.taskId);this.active++;this.peak=Math.max(this.peak,this.active);await new Promise(r=>setTimeout(r,2));this.active--;if(request.taskId.endsWith(this.fail)&&this.fail)throw Error('synthetic failure');return {raw:decodeGeminiGameObservation(literal(this.value),request,def,undefined,transforms),hostedWire:{id:'gemini-game-wire-v1' as const,items:[],deferred:[]},timings:{readerMs:2}};}
 async readCatanScene(request:any,def:any,session:any,p:any,e:any,image:Buffer,mime:string){this.calls.push(request.taskId);const raw={candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({assertions:[{field:'components.observed',value:{version:2,coverage:'partial',components:[{id:'n',kind:'number-token',number:8,quantity:1,face:'front',evidenceId:e[0].id,region:{x:.1,y:.1,width:.1,height:.1},location:{type:'hex',id:'r1c1'}}]},evidenceIds:[e[0].id]}],warnings:[]})}]}}]};return {result:decodeCatanSceneReading(raw,{request,definition:def,session,pack:p,evidence:e,reader:this.identity,sourceImageSHA:request.images[0].sha256}),timings:{readerMs:2}};}
}
const imageFor=(e:Evidence)=>Buffer.concat([bytes,Buffer.from(e.id)]);
const prepare=(s:Session,reader:MockReader,extra={})=>prepareScanObservation({session:s,pack,evidence:s.evidence,selection:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'board',...extra},taskId:'scan',reader,cloud:false,readImage:async(e:Evidence)=>({data:imageFor(e),mimeType:'image/png'})});
const run=(s:Session,reader:MockReader,scan:Awaited<ReturnType<typeof prepare>>)=>analyzeScan({scan,pack,session:s,evidence:s.evidence,reader,readImage:async(e:Evidence)=>({data:imageFor(e),mimeType:'image/png'})});
test('parallel scan keeps pinned source order when a later photo finishes first',async()=>{
 const finished:string[]=[];let active=0,peak=0;
 class ReorderedReader extends MockReader{
  async readCatanScene(...args:Parameters<MockReader['readCatanScene']>){
   active++;peak=Math.max(peak,active);
   try{await new Promise(r=>setTimeout(r,35));return await super.readCatanScene(...args);}
   finally{active--;finished.push(args[0].taskId);}
  }
  async read(request:any,def:any,image:Buffer,mime:string,transforms:any[]=[]){
   active++;peak=Math.max(peak,active);
   try{await new Promise(r=>setTimeout(r,request.taskId.endsWith('unit-0')?35:2));return await super.read(request,def,image,mime,transforms);}
   finally{active--;finished.push(request.taskId);}
  }
 }
 const reader=new ReorderedReader(),s=state(['a','b','c','d'].map(id=>evidence(id))),scan=await prepare(s,reader);
 const results=await run(s,reader,scan);
 assert.equal(peak,4);assert.equal(reader.calls.length,4);assert.equal(new Set(reader.calls).size,4);
 assert(finished[0].endsWith('unit-1'));
 assert.deepEqual(results.map(r=>r.scanBundle!.units[0].unitId),scan.plan.units.map(u=>u.id));
 assert.deepEqual(results.map(r=>r.observationReceipts![0].request.images[0].evidenceId),['a','b','c','d']);
 assert.deepEqual(results.map(r=>r.observationReceipts![0].sourceImageSHA),scan.plan.units.map(u=>u.sourceSHA));
});
test('crop coordinates round-trip, raw ref reused per unit is namespaced; valid result survives another failure',async()=>{
 const t=cropPhotoTransform({transformId:'crop',sourceSHA:'a'.repeat(64),inputSHA:'b'.repeat(64),sourceDimensions:{width:1000,height:800},inputDimensions:{width:400,height:300},region:{x:.2,y:.3,width:.4,height:.375}});
 const p={x:.7,y:.2};const round=projectPhotoPoint(t.forwardMatrix,projectPhotoPoint(t.inverseMatrix,p));assert(Math.hypot(round.x-p.x,round.y-p.y)<1e-12);
 const s=state([evidence('a'),evidence('b'),evidence('c')]),reader=new MockReader();reader.fail='unit-1';const scan=await prepare(s,reader),results=await run(s,reader,scan);
 assert.equal(reader.calls.length,3);assert.equal(new Set(reader.calls).size,3);assert(reader.peak<=2);assert.equal(results[1].scanBundle!.units[0].state,'failed');
 const rawBefore=JSON.stringify(results.map(r=>r.observationReceipts?.map(x=>x.result)));const projected=projectScanResults(s,pack,scan,results);assert.equal(JSON.stringify(results.map(r=>r.observationReceipts?.map(x=>x.result))),rawBefore);assert.equal(Object.keys(projected.observationReceipts!.at(-1)!.componentRefs).length,0);assert.equal(normalizeScene(projected.assertions[0].value).components.length,1);assert.equal(projected.observationReceipts!.length,2);assert.equal(projected.scanBundle!.units.length,3);
 assert.equal(projected.scanBundle!.links.filter(l=>l.status==='unlinked').length,1); // Same bytes can be equal yet other photos are never an identity proof without root lineage.
});
test('different-view observations remain raw/unlinked, baseline manual number and unrelated road survive target null/conflict',async()=>{
 const s=state([evidence('a')]);s.assertions=[{id:'base',field:'board.layout',value:{version:2,coverage:'partial',components:[{id:'n',kind:'number-token',number:6,quantity:1,location:{type:'hex',id:'r1c1'},evidenceId:null,region:null},{id:'road',kind:'road',quantity:1,location:{type:'unplaced',id:null},evidenceId:null,region:null}]},ownerId:undefined,basis:'user',status:'accepted',evidenceIds:[],updatedAt:'before'} as any];
 const reader=new MockReader(),scan=await prepare(s,reader,{target:{assertionId:'base',pieceId:'n'}});reader.value=null;
 let r=projectScanResults(s,pack,scan,await run(s,reader,scan));assert.equal(normalizeScene(r.assertions[0].value).components.find(c=>c.id==='n')!.number,6);
 reader.value=9;r=projectScanResults(s,pack,scan,await run(s,reader,scan));assert.equal(normalizeScene(r.assertions[0].value).components.find(c=>c.id==='n')!.number,6);assert.equal(normalizeScene(r.assertions[0].value).components.length,2);assert(r.scanBundle!.links.some(l=>l.status==='conflict'&&l.conflicts.includes('number')));
 assert.equal(s.assertions[0].basis,'user');
 const unknown=structuredClone(s);(unknown.assertions[0].value as any).components[0].number=null;reader.value=8;const supplemented=projectScanResults(unknown,pack,scan,await run(unknown,reader,scan));assert.equal(normalizeScene(supplemented.assertions[0].value).components.find(c=>c.id==='n')!.number,8);assert.equal(supplemented.scanBundle!.links[0].basis,'user-target');
});
test('single Catan remains automatic illustrated scene; raw bundle commits and survives user save JSON reopen, late edit rejects',async()=>{
 const s=state([evidence('a')]),reader=new MockReader(),scan=await prepare(s,reader),results=await run(s,reader,scan);let saved=structuredClone(s);
 const store={getSession:async()=>structuredClone(saved),saveSession:async(v:Session)=>{saved=structuredClone(v);}},pins={configurationStamp:async()=> 'pin'};
 const task={prepared:{session:s,pack,evidence:s.evidence,purpose:'capture',sameStaticState:true,scanObservation:scan},epoch:'epoch',version:scopeVersion(s,pack),source:digest(s.evidence),pin:'pin'} as any,job={id:'job',sessionId:s.id} as any;
 assert.equal((await commitAnalysisTask(store as any,pins as any,task,job,results)).state,'completed');
 const a=saved.assertions[0];assert.equal(a.status,'accepted');assert.equal(normalizeScene(a.value).components[0].location.id,'r1c1');assert.equal(a.observationReceipts![0].scanBundle!.units[0].state,'completed');
 const {answerField}=await import('../server/engine');answerField(saved,pack,'board.layout',a.value);
 const reopen=JSON.parse(JSON.stringify(saved));assert.equal(reopen.assertions[0].observationReceipts[0].result.observations[0].properties.number.value,8);
 const fresh=state([evidence('a')]);fresh.assertions=[{...a,id:'manual',basis:'user',value:{...a.value as any,components:normalizeScene(a.value).components.map(c=>({...c,number:2}))}}];saved=fresh;
 await assert.rejects(()=>commitAnalysisTask(store as any,pins as any,task,{...job,id:'late'},results),/바뀌/);assert.equal(normalizeScene(saved.assertions[0].value).components[0].number,2);
});
test('uploaded crop keeps original coordinates and evidence; wrong owner/epoch cannot join a scan',async()=>{
 const original=evidence('original'),crop=evidence('crop',{sourceEvidenceId:'original',sourceRegion:{x:.2,y:.3,width:.4,height:.4}}),s=state([original,crop]),reader=new MockReader();
 const scan=await prepareScanObservation({session:s,pack,evidence:[crop],selection:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'board'},taskId:'crop-scan',reader,cloud:false,readImage:async e=>({data:imageFor(e),mimeType:'image/png'})});
 const results=await run(s,reader,scan),receipt=results[0].observationReceipts![0],o=receipt.result.observations[0];assert.equal(receipt.request.images[0].evidenceId,'original');assert.equal(receipt.sourceImageSHA,scan.plan.units[0].sourceSHA);assert.notEqual(receipt.sourceImageSHA,receipt.request.images[0].sha256);
 const region=mapObservationRegion(o,receipt.request,receipt.transforms)!;assert(Math.abs(region.x-.24)<1e-10&&Math.abs(region.y-.34)<1e-10);assert.equal(receipt.result.observations[0].bbox!.x,.1);
 const projected=projectScanResults(s,pack,scan,results);assert.equal(normalizeScene(projected.assertions[0].value).components.length,1);assert.equal(normalizeScene(projected.assertions[0].value).components[0].location.type,'unplaced');assert(projected.observationReceipts!.length); // A disjoint same-root crop-only record is retained unplaced, not a guessed slot.
 await assert.rejects(()=>prepare({...s,evidence:[evidence('private',{scope:'player',ownerId:'p'})]},reader),/영역/);
 await assert.rejects(()=>prepare({...s,evidence:[evidence('old',{captureEpoch:'old'})]},reader),/현재 촬영/);
});
test('generic Splendor readouts stay typed with null versus zero; independent detail does not sum new inventory',async()=>{
 const p=catalogPacks.find(p=>p.runtime?.source.gameId==='splendor')!,def=photoDefinition(p),area=def.areas.find(a=>a.componentIds.includes('development')&&a.partition==='common_public')!;
 const s={...state([evidence('a'),evidence('b')]),gamePack:p,gamePackId:p.id,gamePackVersion:p.version};
 class SplendorReader extends MockReader{async read(request:any,definition:any){this.calls.push(request.taskId);const native={candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({items:[{kind:'development',box_1000:[100,100,200,200],face:'front',quantity:1,attributes:[{id:'points',valueJson:'0',unknownReason:null},{id:'bonus',valueJson:null,unknownReason:'unreadable'}]}]})}]}}]};return {raw:decodeGeminiGameObservation(native,request,definition),hostedWire:{id:'gemini-game-wire-v1' as const,items:[],deferred:[]},timings:{readerMs:0}};}}
 const reader=new SplendorReader(),scan=await prepareScanObservation({session:s,pack:p,evidence:s.evidence,selection:{kind:'gemini-game-observation-v1',definitionSHA:def.definitionSHA,areaId:area.id},taskId:'splendor-scan',reader,cloud:false,readImage:async e=>({data:imageFor(e),mimeType:'image/png'})}),results=await analyzeScan({scan,pack:p,session:s,evidence:s.evidence,reader,readImage:async e=>({data:imageFor(e),mimeType:'image/png'})});
 const result=projectScanResults(s,p,scan,results),pieces=(result.assertions[0].value as any).pieces;assert.equal(pieces.length,1);assert.equal(pieces[0].readout.points,0);assert.equal(pieces[0].readout.bonus,null);assert.equal(result.observationReceipts!.length,2);assert(result.scanBundle!.links.some(l=>!l.targetPieceId));
});
test('HTTP job repeats do not redispatch, multi photos save/reopen and preserve all receipt sources',async()=>{
 const {createApp}=await import('./fixtures/drawingTestApp');const {Store}=await import('../server/store');const root=await mkdtemp(path.join(os.tmpdir(),'kb-scan-http-'));const reader=new MockReader(),app=await createApp({store:new Store(root),geminiReader:reader});const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const port=(server.address() as any).port;
 const call=async(url:string,body?:any,method=body?'POST':'GET')=>{const r=await fetch(`http://127.0.0.1:${port}/api${url}`,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const d=await r.json();assert(r.ok,JSON.stringify(d));return d;};
 try{let v=await call('/sessions',{gamePackId:pack.id,players:[{id:'p',name:'합성',color:'red'}]}),id=v.session.id;const ids=[];for(let i=0;i<2;i++){v=await call(`/sessions/${id}/evidence`,{dataUrl:'data:image/png;base64,'+Buffer.concat([bytes,Buffer.from(String(i))]).toString('base64'),label:'synthetic-'+i,scope:'public'});ids.push(v.createdEvidenceId);}
  // Use different evidence records; same image bytes are not by themselves cross-view proof.
  const body={requestId:'scan-http',evidenceIds:[...new Set(ids)].reverse(),expectedCaptureEpoch:v.session.captureEpoch,scope:'public',sameStaticState:true,reader:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'board'}};
  const start=await call(`/sessions/${id}/analysis-jobs`,body);const again=await call(`/sessions/${id}/analysis-jobs`,body);assert.equal(start.job.id,again.job.id);
  let jobs:any;for(let i=0;i<60;i++){jobs=await call(`/sessions/${id}/analysis-jobs`);if(!['running','queued'].includes(jobs.jobs[0].state))break;await new Promise(r=>setTimeout(r,10));}
  assert.equal(jobs.jobs[0].state,'completed');assert.equal(jobs.jobs[0].scanBundle.plan.anchorEvidenceId,body.evidenceIds[0]);const calls=reader.calls.length;await call(`/sessions/${id}/analysis-jobs`,body);assert.equal(reader.calls.length,calls);
  await call(`/sessions/${id}/commit`,{allowIncomplete:true,recordingMode:'simple'});v=await call(`/sessions/${id}`);assert(v.session.snapshots.at(-1).assertions.some((a:any)=>a.observationReceipts?.length));
 }finally{await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}
});
test('durable cloud unit replay is not dispatched twice; completed sources survive a failed detail',async t=>{
 const {MemoryObjects}=await import('../server/objects'),{BlobObjects}=await import('../server/blobObjects'),{BlobStore}=await import('../server/blobStore'),{createApp}=await import('./fixtures/drawingTestApp'),{cloudAnalyzeBatch,cloudRunHostedScan,finishCloudJob}=await import('../server/cloudRuntime');
 const objects=new MemoryObjects();for(const method of ['read','write','remove','list'] as const)t.mock.method(BlobObjects.prototype,method,objects[method].bind(objects));
 const old=process.env.KEEPBOARD_STORAGE_PROVIDER,prefix=process.env.KEEPBOARD_BLOB_PREFIX,cloudFlag=process.env.KEEPBOARD_CLOUD_AI;process.env.KEEPBOARD_STORAGE_PROVIDER='blob';process.env.KEEPBOARD_BLOB_PREFIX='synthetic-scan';t.after(()=>{for(const [key,value]of Object.entries({KEEPBOARD_STORAGE_PROVIDER:old,KEEPBOARD_BLOB_PREFIX:prefix,KEEPBOARD_CLOUD_AI:cloudFlag}))if(value===undefined)delete process.env[key];else process.env[key]=value;});
 const mock=new MockReader();mock.fail='unit-1';t.mock.method(GeminiGameReader.prototype,'status',()=>mock.status());t.mock.method(GeminiGameReader.prototype,'readCatanScene',(...args:any[])=>mock.readCatanScene(...args as [any,any,any,any,any,Buffer,string]));t.mock.method(GeminiGameReader.prototype,'read',(...args:any[])=>mock.read(...args as [any,any,Buffer,string,any[]]));
 let jobId='';const app=await createApp({store:new BlobStore(objects),cloud:{objects,dispatch:async id=>{jobId=id;}}}),server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as any).port}/api`;
 const call=async(p:string,b?:any)=>{const r=await fetch(base+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});const v=await r.json();assert(r.ok,JSON.stringify(v));return v;};
 try{let v=await call('/sessions',{gamePackId:pack.id}),p='/sessions/'+v.session.id,ids=[];for(let i=0;i<2;i++){v=await call(p+'/evidence',{dataUrl:'data:image/png;base64,'+Buffer.concat([bytes,Buffer.from(String(i))]).toString('base64'),scope:'public'});ids.push(v.createdEvidenceId);}
  await call(p+'/analysis-jobs',{requestId:'durable',evidenceIds:ids,expectedCaptureEpoch:v.session.captureEpoch,sameStaticState:true,reader:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'board'}});
  await Promise.all([cloudRunHostedScan(jobId),cloudRunHostedScan(jobId)]);
  await cloudRunHostedScan(jobId);await finishCloudJob(jobId);
  assert.equal(mock.calls.length,2);const job=(await call(p+'/analysis-jobs')).jobs[0];assert.equal(job.state,'completed');assert.deepEqual(job.scanBundle.units.map((u:any)=>u.state),['completed','failed']);
  const saved=(await call(p)).session.assertions.find((a:any)=>a.field==='board.layout');assert(saved);assert.equal(normalizeScene(saved.value).components.length,1);assert.equal(saved.observationReceipts.length,1);assert.equal(saved.observationReceipts[0].scanBundle.units.length,2);
 }finally{await new Promise<void>(r=>server.close(()=>r()));}
});
