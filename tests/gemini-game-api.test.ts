import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server/index';
import {Store} from '../server/store';
import {GeminiGameReader} from '../server/ai/geminiGameReader';
import defs from '../game-photo-definitions/index.json';

const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=';
class FixtureGemini extends GeminiGameReader{
 calls=0;
 async status(){return {kind:'gemini-game-observation-v1' as const,available:true,cloudSupported:true as const,identity:this.identity};}
 async read(request:any){this.calls++;return {raw:{version:'lightweight-observation-v1',coverage:'partial',completion:'complete',observations:[{ref:'terrain-1',imageIndex:0,panelRef:null,componentId:'terrain',bbox:{x:.1,y:.1,width:.3,height:.3},face:'front',quantity:1,rotationDegrees:null,properties:{variant:{state:'observed',value:'forest'}},referenceCandidates:[]}]},timings:{readerMs:1}} as any;}
}

test('hosted Gemini job keeps old accepted state, saves reviewed candidate and refuses public hidden area',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-gemini-game-')),reader=new FixtureGemini(),store=new Store(root);let defaultCalls=0;
 const app=await createApp({store,geminiReader:reader,analyzer:async()=>{defaultCalls++;throw Error('default called');}}as any),server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+(server.address()as any).port;let revision:string|undefined;
 async function call(route:string,body?:unknown,method=body?'POST':'GET'){const response=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:body?JSON.stringify(body):undefined});const value=await response.json();if(value.session?.storageRevision)revision=value.session.storageRevision;return {status:response.status,body:value};}
 try{
  const capabilities=(await call('/recognition/readers')).body.readers;assert.equal(capabilities.find((r:any)=>r.kind==='gemini-game-observation-v1').available,true);
  const created=(await call('/sessions',{gamePackId:'catan-base',name:'synthetic hosted fixture'})).body,p='/sessions/'+created.session.id;
  const road={id:'old-road',kind:'road',variant:null,ownerId:null,quantity:1,location:{type:'edge',id:'r1c1.E'},region:null,evidenceId:null};
  assert.equal((await call(p,{answers:[{field:'board.layout',value:{version:2,coverage:'partial',components:[road]}}]},'PATCH')).status,200);
  const upload=(await call(p+'/evidence',{scope:'public',dataUrl:image})).body,definition=defs.games.find(d=>d.gameId==='catan')!;
  const body={requestId:'gemini-once',evidenceIds:[upload.createdEvidenceId],expectedCaptureEpoch:upload.session.captureEpoch,scope:'public',reader:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'board'}};
  assert.equal((await call(p+'/analysis-jobs',{...body,requestId:'hidden-invalid',reader:{...body.reader,areaId:'hand'}})).status,400);
  assert.equal((await call(p+'/analysis-jobs',body)).status,202);
  let job:any;for(let n=0;n<100;n++){job=(await call(p+'/analysis-jobs')).body.jobs[0];if(job.state==='completed')break;if(job.state==='failed')assert.fail('Gemini job failed');await new Promise(r=>setTimeout(r,10));}
  assert.equal(job.state,'completed');assert.equal(job.reader.kind,'gemini-game-observation-v1');assert.equal(reader.calls,1);assert.equal(defaultCalls,0);
  const view=(await call(p)).body,candidate=view.session.assertions.find((a:any)=>a.status==='candidate');assert(candidate);assert.equal(candidate.value.components[0].variant,'forest');assert.equal(candidate.observationReceipts[0].reader.kind,'gemini-game-observation-v1');
  assert.equal(view.session.assertions.find((a:any)=>a.field==='board.layout'&&a.status==='accepted').value.components[0].id,'old-road');
  const tile=candidate.value.components[0];tile.variant='pasture';tile.location={type:'hex',id:'r3c3'};
  const baseline=view.session.assertions.find((a:any)=>a.field==='board.layout'&&a.status==='accepted');
  assert.equal((await call(p,{answers:[{field:'board.layout',value:{version:2,coverage:'partial',components:[road,tile]},observationReview:{version:'native-observation-review-v1',sourceAssertionId:candidate.id,expectedBaselineAssertionId:baseline.id}}]},'PATCH')).status,200);
  assert.equal((await call(p+'/commit',{allowIncomplete:true})).status,200);assert.equal((await call(p+'/resume',{scope:'public'})).status,200);
  const reopened=(await call(p)).body.session.assertions.find((a:any)=>a.field==='board.layout'&&a.status==='accepted');assert.equal(reopened.value.components.length,2);assert.equal(reopened.value.components[1].variant,'pasture');assert.equal(reopened.observationReceipts[0].reader.kind,'gemini-game-observation-v1');
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}
});
