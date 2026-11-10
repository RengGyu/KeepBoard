import test from 'node:test';import assert from 'node:assert/strict';
import {MemoryObjects} from '../server/objects';import {BlobObjects} from '../server/blobObjects';import {BlobStore} from '../server/blobStore';
import {createApp} from './fixtures/drawingTestApp';import {GeminiGameReader} from '../server/ai/geminiGameReader';import {cloudRunHostedScan,finishCloudJob} from '../server/cloudRuntime';
import defs from '../game-photo-definitions/index.json';
import {decodeCatanSceneReading} from '../server/ai/catanSceneReading';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=';
test('cloud workflow executes the pinned Gemini reader once and preserves its receipt and timing',async t=>{
 const o=new MemoryObjects();for(const method of ['read','write','remove','list'] as const)t.mock.method(BlobObjects.prototype,method,o[method].bind(o));
 const oldPrefix=process.env.KEEPBOARD_BLOB_PREFIX,oldCloud=process.env.KEEPBOARD_CLOUD_AI;process.env.KEEPBOARD_BLOB_PREFIX='synthetic';process.env.KEEPBOARD_CLOUD_AI='1';t.after(()=>{if(oldPrefix===undefined)delete process.env.KEEPBOARD_BLOB_PREFIX;else process.env.KEEPBOARD_BLOB_PREFIX=oldPrefix;if(oldCloud===undefined)delete process.env.KEEPBOARD_CLOUD_AI;else process.env.KEEPBOARD_CLOUD_AI=oldCloud;});
 let reads=0,legacyCalls=0,jobId='';
 t.mock.method(GeminiGameReader.prototype,'status',async function(this:GeminiGameReader){return {kind:this.identity.kind,available:true,cloudSupported:true,identity:this.identity};});
 t.mock.method(GeminiGameReader.prototype,'read',async()=>{reads++;return {raw:{version:'lightweight-observation-v1',coverage:'partial',completion:'complete',observations:[{ref:'one',imageIndex:0,panelRef:null,componentId:'terrain',bbox:{x:.1,y:.1,width:.3,height:.3},face:'front',quantity:1,rotationDegrees:null,properties:{variant:{state:'observed',value:'forest'}},referenceCandidates:[]}]},timings:{readerMs:7}};});
 // Catan board now uses the native illustrated-scene path, not generic read().
 t.mock.method(GeminiGameReader.prototype,'readCatanScene',async function(this:GeminiGameReader,...[request,definition,session,pack,evidence]:Parameters<GeminiGameReader['readCatanScene']>){
  reads++;
  const raw={candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({assertions:[{field:'components.observed',evidenceIds:[evidence[0].id],value:{version:2,coverage:'partial',components:[{id:'terrain',kind:'terrain',variant:'forest',quantity:1,evidenceId:evidence[0].id,region:{x:.1,y:.1,width:.3,height:.3},location:{type:'hex',id:'r1c1'}}]}}],warnings:[]})}]}}]};
  return {result:decodeCatanSceneReading(raw,{request,definition,session,pack,evidence,reader:this.identity,sourceImageSHA:request.images[0].sha256}),timings:{readerMs:7}};
 });
 t.mock.method(globalThis,'fetch',async()=>{legacyCalls++;throw Error('Unexpected legacy provider request');});
 // Use native HTTP so only external provider fetches are trapped.
 const {request}=await import('node:http');const app=await createApp({store:new BlobStore(o),cloud:{objects:o,dispatch:async id=>{jobId=id;}}}),server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));t.after(()=>{server.closeAllConnections();server.close();});
 const call=(path:string,body?:unknown):Promise<any>=>new Promise((resolve,reject)=>{const data=body===undefined?undefined:JSON.stringify(body),req=request({hostname:'127.0.0.1',port:(server.address() as any).port,path:'/api'+path,method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{}},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>{try{assert(res.statusCode!<300,text);resolve(JSON.parse(text));}catch(e){reject(e);}});});req.on('error',reject);req.end(data);});
 const v=await call('/sessions',{gamePackId:'catan-base',name:'synthetic workflow'}),p='/sessions/'+v.session.id,e=await call(p+'/evidence',{scope:'public',dataUrl:image}),definition=defs.games.find(d=>d.gameId==='catan')!;
 await call(p+'/analysis-jobs',{requestId:'cloud-once',evidenceIds:[e.createdEvidenceId],expectedCaptureEpoch:e.session.captureEpoch,reader:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'board'}});
 await cloudRunHostedScan(jobId);await cloudRunHostedScan(jobId);await finishCloudJob(jobId);
 assert.equal(reads,1);assert.equal(legacyCalls,0);
 const job=(await call(p+'/analysis-jobs')).jobs[0];assert.equal(job.state,'completed');assert.equal(job.timings.providerMs,7);assert(job.timings.totalMs>=0);
 const candidate=(await call(p)).session.assertions.find((a:any)=>a.status==='accepted'&&a.field==='board.layout');assert.equal(candidate.observationReceipts[0].reader.kind,'gemini-game-observation-v1');assert.equal(candidate.value.components[0].variant,'forest');
});
