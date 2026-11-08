import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {createApp} from '../server/index';import {Store} from '../server/store';import {TerraGameReader} from '../server/ai/terraGameReader';
import {catalogPacks} from '../gamepacks/catalog';import {effectiveRecognitionPack} from '../shared/recognition';import {photoDefinition} from '../server/photoDefinitions';
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=','base64');
test('Terra group surface, refinement and retired parent remain nonadditive through subsequent HTTP jobs and save/resume',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-group-http-'));let calls=0,detail=false;
 const reader=new TerraGameReader({key:async()=> 'synthetic-fixture',fetch:async(_url,init)=>{
  calls++;const crop=JSON.parse(String(init!.body)).input[0].content[1].image_url!=='data:image/png;base64,'+image.toString('base64');return Response.json({model:'gpt-6-luna',status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({items:[{kind:'dice',physicalUnit:crop&&detail?'single':'group',box_1000:crop?(detail?{ymin:420,xmin:420,ymax:580,xmax:580}:{ymin:400,xmin:400,ymax:600,xmax:600}):{ymin:200,xmin:200,ymax:300,xmax:300},quantity:null,face:'front',attributes:[{id:'dieValue',valueJson:crop?'9':'6',unknownReason:null}]}]})}]}]});
 }}),pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id==='sagrada')!),definition=photoDefinition(pack),app=await createApp({store:new Store(root),terraReader:reader}),server=app.listen(0,'127.0.0.1');
 await new Promise<void>((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
 const base=`http://127.0.0.1:${(server.address() as any).port}/api`;let revision:string|undefined;
 const call=async(route:string,body?:any)=>{const r=await fetch(base+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:body?JSON.stringify(body):undefined}),v=await r.json();assert(r.ok,route+': '+r.status);if(v.session?.storageRevision)revision=v.session.storageRevision;return v;};
 try{
  let v=await call('/sessions',{gamePackId:pack.id});const p='/sessions/'+v.session.id;
  v=await call(p+'/evidence',{scope:'public',dataUrl:'data:image/png;base64,'+image.toString('base64')});const original=v.createdEvidenceId;
  v=await call(p+'/evidence',{scope:'public',dataUrl:'data:image/png;base64,'+Buffer.concat([image,Buffer.from('crop')]).toString('base64'),sourceEvidenceId:original,sourceRegion:{x:0,y:0,width:.5,height:.5}});const crop=v.createdEvidenceId;
  const body={requestId:'group-once',evidenceIds:[original,crop],scope:'public',sameStaticState:true,expectedCaptureEpoch:v.session.captureEpoch,reader:{kind:'luna-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'window'}},job=(await call(p+'/analysis-jobs',body)).job;
  let state='queued',latest:any;for(let i=0;i<150&&['queued','running'].includes(state);i++){latest=(await call(p+'/analysis-jobs')).jobs.find((j:any)=>j.id===job.id);state=latest.state;if(['queued','running'].includes(state))await new Promise(r=>setTimeout(r,10));}assert.equal(state,'completed',JSON.stringify(latest));
  assert.equal((await call(p+'/analysis-jobs',body)).job.id,job.id);assert.equal(calls,2);
  const accepted=(view:any)=>view.session.assertions.filter((a:any)=>a.status==='accepted'&&a.value?.version==='game-component-record-v1').at(-1);
  v=await call(p);const a=accepted(v),bundle=a.observationReceipts.at(-1).scanBundle,raw=JSON.stringify(a.observationReceipts.map((r:any)=>({result:r.result,wire:r.hostedWire})));
  assert.equal(a.value.pieces.length,1);assert.equal(a.value.pieces[0].quantity,null);assert.equal(a.value.pieces[0].readout.values.dieValue,6);assert.equal(bundle.links[0].relation,'same-visible-group-surface');assert.equal(bundle.fusion.refinements.length,0);assert(bundle.fusion.decisions.some((d:any)=>d.fieldPath==='readout.values.dieValue'&&d.conflict&&d.basis==='unresolved'));
  const wait=async(id:string)=>{let state='queued';for(let i=0;i<150&&['queued','running'].includes(state);i++){state=(await call(p+'/analysis-jobs')).jobs.find((j:any)=>j.id===id).state;if(['queued','running'].includes(state))await new Promise(r=>setTimeout(r,10));}assert.equal(state,'completed');};
  detail=true;await wait((await call(p+'/analysis-jobs',{...body,requestId:'refine'})).job.id);v=await call(p);assert.equal(accepted(v).value.pieces.length,1);assert.equal(accepted(v).observationReceipts.at(-1).scanBundle.fusion.refinements.length,1);
  await wait((await call(p+'/analysis-jobs',{...body,requestId:'parent-again',evidenceIds:[original]})).job.id);v=await call(p);const final=accepted(v),finalBundle=final.observationReceipts.at(-1).scanBundle;
  assert.equal(final.value.pieces.length,1);assert.equal(finalBundle.fusion.refinements.length,1);assert.equal(finalBundle.unresolvedGroups.length,1);assert.equal(calls,5);
  assert.equal(JSON.stringify(final.observationReceipts.slice(0,2).map((r:any)=>({result:r.result,wire:r.hostedWire}))),raw);
  await call(p+'/commit',{allowIncomplete:true,recordingMode:'simple'});await call(p+'/resume',{scope:'public'});v=await call(p);const reopened=accepted(v);
  assert.deepEqual(reopened.value,final.value);assert.deepEqual(reopened.observationReceipts.at(-1).scanBundle,finalBundle);assert.deepEqual(reopened.observationReceipts[0].scanBundle,bundle);assert.equal(calls,5);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}
});
