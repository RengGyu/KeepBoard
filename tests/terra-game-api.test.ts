import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {createApp} from './fixtures/drawingTestApp';import {Store} from '../server/store';import {TerraGameReader} from '../server/ai/terraGameReader';
import defs from '../game-photo-definitions/index.json';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=';
const envelope=(payload:unknown)=>({model:'gpt-6-luna',status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text:JSON.stringify(payload)}]}],usage:{input_tokens:1,output_tokens:1,total_tokens:2}});
test('actual Terra HTTP job uses native Catan and generic Splendor, once per intent; edits/receipts save and reopen',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-terra-api-'));let calls=0,legacyCalls=0;
 const reader=new TerraGameReader({key:async()=> 'synthetic',fetch:async(_url,init)=>{
  calls++;const body=JSON.parse(String(init!.body));assert.equal(body.model,'gpt-6-luna');assert.equal(body.reasoning.effort,'high');assert.equal(body.service_tier,'default');
  if(body.input[0].content[0].text.includes('COMPONENT SCENE OUTPUT')){
   const evidenceId=body.text.format.schema.properties.assertions.items.properties.evidenceIds.items.enum[0];
   return Response.json(envelope({summary:'native fixture',assertions:[{field:'components.observed',evidenceIds:[evidenceId],value:{version:2,coverage:'partial',components:[{id:'terrain',kind:'terrain',variant:'forest',face:'front',quantity:1,location:{type:'hex',id:'r1c1'},evidenceId,region:{x:.1,y:.1,width:.2,height:.2}},{id:'number',kind:'number-token',number:null,face:'front',quantity:1,location:{type:'hex',id:'r1c1'},evidenceId,region:{x:.15,y:.15,width:.05,height:.05}}]}}],warnings:[]}));
  }
  return Response.json(envelope({items:[{kind:'development',box_1000:{ymin:100,xmin:100,ymax:300,xmax:300},face:'front',quantity:1,attributes:[{id:'kind',valueJson:'"development"',unknownReason:null},{id:'bonus',valueJson:'"red"',unknownReason:null},{id:'points',valueJson:'0',unknownReason:null}]}]}));
 }});
 const app=await createApp({store:new Store(root),terraReader:reader,analyzer:async()=>{legacyCalls++;throw Error('legacy called');}}),server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+(server.address()as any).port;let revision:string|undefined;
 async function call(route:string,body?:unknown,method=body?'POST':'GET'){const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:body===undefined?undefined:JSON.stringify(body)}),v=await r.json();if(v.session?.storageRevision)revision=v.session.storageRevision;return {status:r.status,body:v};}
 try{
  assert.equal((await call('/recognition/readers')).body.readers.find((r:any)=>r.kind==='luna-game-observation-v1').available,true);
  for(const id of ['catan','splendor']){
   revision=undefined;const d=defs.games.find(d=>d.gameId===id)!;
   const created=await call('/sessions',{gamePackId:d.packId,name:'synthetic Terra integration'}),p='/sessions/'+created.body.session.id;
   const upload=await call(p+'/evidence',{scope:'public',dataUrl:image});assert.equal(upload.status,200);
   const task={requestId:'terra-once',evidenceIds:[upload.body.createdEvidenceId],expectedCaptureEpoch:upload.body.session.captureEpoch,reader:{kind:'luna-game-observation-v1',definitionSHA:d.definitionSHA,areaId:id==='catan'?'board':'market'}};
   const first=await call(p+'/analysis-jobs',task);assert.equal(first.status,202);const jobId=first.body.job.id;
   let job:any;for(let n=0;n<100;n++){job=(await call(p+'/analysis-jobs')).body.jobs[0];if(!['queued','running'].includes(job.state))break;await new Promise(r=>setTimeout(r,10));}
   assert.equal(job.state,'completed');assert.equal(job.reader.kind,'luna-game-observation-v1');
   assert.equal((await call(p+'/analysis-jobs',task)).body.job.id,jobId);assert.equal(calls,id==='catan'?1:2);
   const view=(await call(p)).body,a=view.session.assertions.find((a:any)=>a.status==='accepted'&&a.observationReceipts?.length);assert(a);
   const original=JSON.stringify(a.observationReceipts),value=structuredClone(a.value);
   if(id==='catan'){assert.equal(value.components[0].location.id,'r1c1');assert.equal(value.components[1].number,null);value.components[0].variant='pasture';}
   else{assert.equal(value.pieces[0].readout.points,0);assert.equal(value.pieces[0].readout.bonus,'red');value.pieces[0].readout.points=2;}
   assert.equal((await call(p,{answers:[{field:a.field,value}]},'PATCH')).status,200);
   assert.equal((await call(p+'/commit',{allowIncomplete:true})).status,200);assert.equal((await call(p+'/resume',{scope:'public'})).status,200);
   const reopened=(await call(p)).body.session.assertions.find((x:any)=>x.status==='accepted'&&x.field===a.field);
   assert.deepEqual(reopened.value,value);assert.equal(JSON.stringify(reopened.observationReceipts),original);assert.equal(reopened.observationReceipts[0].reader.kind,'luna-game-observation-v1');
   assert.match(reopened.observationReceipts[0].hostedWire.id,/^terra-/);
  }
  assert.equal(calls,2);assert.equal(legacyCalls,0);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}
});
