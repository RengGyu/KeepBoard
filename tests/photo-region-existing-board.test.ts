import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {catalogPacks} from '../gamepacks/catalog';import {photoDefinition} from '../server/photoDefinitions';import {createApp} from './fixtures/drawingTestApp';import {Store} from '../server/store';import {GeminiGameReader,decodeGeminiGameObservation} from '../server/ai/geminiGameReader';
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=','base64');
class Reader extends GeminiGameReader{
 calls=0;
 async status(){return {kind:'gemini-game-observation-v1' as const,available:true,cloudSupported:true as const,identity:this.identity};}
 async read(request:any,definition:any,_image:Buffer,_mime:string,transforms:any[]=[]){
  this.calls++;const crop=transforms.some(t=>t.kind==='crop');const die=(box:number[],number:number)=>({kind:'dice',box_1000:box,quantity:1,face:'front',attributes:[{id:'dieValue',valueJson:String(number),unknownReason:null}]});
  const items=crop?[die([400,400,600,600],9)]:[die([200,200,300,300],6),die([700,700,800,800],2)];
  const raw=decodeGeminiGameObservation({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({items})}]}}]},request,definition,undefined,transforms);
  return {raw,hostedWire:{id:'gemini-game-wire-v1' as const,items,deferred:[]},timings:{readerMs:1}};
 }
}
test('only the selected crop is read on an existing board: outside manual values and IDs survive conflict, save and reopen',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-roi-existing-')),reader=new Reader(),store=new Store(root),app=await createApp({store,geminiReader:reader}),server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${(server.address() as any).port}/api`;let revision:string|undefined;
 const call=async(route:string,body?:any,method=body?'POST':'GET')=>{const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:body?JSON.stringify(body):undefined});const v=await r.json();assert(r.ok,route+': '+r.status);if(v.session?.storageRevision)revision=v.session.storageRevision;return v;};
 const wait=async(route:string,id:string)=>{for(let i=0;i<100;i++){const job=(await call(route+'/analysis-jobs')).jobs.find((j:any)=>j.id===id);if(!['queued','running'].includes(job.state))return job;await new Promise(r=>setTimeout(r,10));}throw Error('fake reader job timeout');};
 try{
  let view=await call('/sessions',{gamePackId:'sagrada'}),route='/sessions/'+view.session.id;
  const pack=catalogPacks.find(p=>p.id==='sagrada')!,definition=photoDefinition(pack),selection={kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'window'};
  view=await call(route+'/evidence',{dataUrl:'data:image/png;base64,'+bytes.toString('base64'),scope:'public'});const original=view.createdEvidenceId,epoch=view.session.captureEpoch;
  const start=async(ids:string[],id:string)=>{const saved=await call(route+'/commit',{allowIncomplete:true,reading:{reader:selection,evidenceIds:ids}});const body={requestId:saved.saveIntentId??id,saveIntentId:saved.saveIntentId,evidenceIds:ids,reader:selection,scope:'public',sameStaticState:true,expectedCaptureEpoch:epoch};const job=(await call(route+'/analysis-jobs',body)).job;assert.equal((await wait(route,job.id)).state,'completed');return {job,body};};
  await start([original],'whole');view=await call(route);const accepted=(v:any)=>v.session.assertions.find((a:any)=>a.status==='accepted'&&a.value?.pieces?.length===2);let a=accepted(view);assert(a);const target=a.value.pieces.find((p:any)=>p.region.x<.5),outside=a.value.pieces.find((p:any)=>p.region.x>.5),edited=structuredClone(a.value),outsideEdit=edited.pieces.find((p:any)=>p.id===outside.id);outsideEdit.quantity=0;outsideEdit.readout.values.dieValue=null;outsideEdit.readout.sources.dieValue=null;outsideEdit.anchor='manual outside ROI';
  await call(route,{answers:[{field:a.field,value:edited}]},'PATCH');
  view=await call(route+'/evidence',{dataUrl:'data:image/png;base64,'+Buffer.concat([bytes,Buffer.from('crop')]).toString('base64'),scope:'public',sourceEvidenceId:original,sourceRegion:{x:0,y:0,width:.5,height:.5}});const crop=view.createdEvidenceId;
  const {job,body}=await start([crop],'roi');assert.equal((await call(route+'/analysis-jobs',body)).job.id,job.id,'redelivery reuses paid claim');view=await call(route);a=accepted(view);assert(a);assert.equal(a.value.pieces.length,2);assert.deepEqual(a.value.pieces.find((p:any)=>p.id===outside.id),outsideEdit);assert.equal(a.value.pieces.find((p:any)=>p.id===target.id).readout.values.dieValue,6,'conflicting crop does not replace original known value');assert(a.observationReceipts.at(-1).scanBundle.fusion.decisions.some((d:any)=>d.conflict));
  const expected=structuredClone(a.value);await call(route+'/commit',{allowIncomplete:true});view=await call(route);assert.deepEqual(accepted(view).value,expected);await call(route+'/resume',{});view=await call(route);assert.deepEqual(accepted(view).value,expected);assert.equal(reader.calls,2,'one original plus one crop, no redelivery call');
 }finally{await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}
});
