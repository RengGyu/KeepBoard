import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {catalogPacks} from '../gamepacks/catalog';import {effectiveRecognitionPack} from '../shared/recognition';import {photoDefinition} from '../server/photoDefinitions';import {createApp} from '../server/index';import {Store} from '../server/store';import {GeminiGameReader,decodeGeminiGameObservation} from '../server/ai/geminiGameReader';
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=','base64');
class Reader extends GeminiGameReader{
 calls=0;block=false;started:()=>void=()=>{};release:Promise<void>=Promise.resolve();
 async status(){return {kind:'gemini-game-observation-v1' as const,available:true,cloudSupported:true as const,identity:this.identity};}
 async read(request:any,definition:any,_image:Buffer,_mime:string,transforms:any[]=[]){this.calls++;if(this.block){this.started();await this.release;}const crop=transforms.some(t=>t.kind==='crop'),native={candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({items:[{kind:'dice',box_1000:crop?[400,400,600,600]:[200,200,300,300],quantity:1,face:'front',attributes:[{id:'dieValue',valueJson:crop?'9':'6',unknownReason:null}]}]})}]}}]};return {raw:decodeGeminiGameObservation(native,request,definition,undefined,transforms),hostedWire:{id:'gemini-game-wire-v1' as const,items:JSON.parse(native.candidates[0].content.parts[0].text).items,deferred:[]},timings:{readerMs:1}};}
}
test('real loopback generic job preserves fusion through PATCH/save/reopen and rejects a late result after editing',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-fusion-http-')),reader=new Reader(),pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id==='sagrada')!),definition=photoDefinition(pack),store=new Store(root),app=await createApp({store,geminiReader:reader}),server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${(server.address()as any).port}/api`;let revision:string|undefined;
 const call=async(route:string,body?:any,method=body?'POST':'GET')=>{const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:body?JSON.stringify(body):undefined}),v=await r.json();assert(r.ok,route+': '+r.status+' '+JSON.stringify(v));if(v.session?.storageRevision)revision=v.session.storageRevision;return v;};
 let unblock=()=>{};
 try{
  let v=await call('/sessions',{gamePackId:pack.id}),p='/sessions/'+v.session.id;
  v=await call(p+'/evidence',{dataUrl:'data:image/png;base64,'+bytes.toString('base64'),scope:'public'});const original=v.createdEvidenceId;
  v=await call(p+'/evidence',{dataUrl:'data:image/png;base64,'+Buffer.concat([bytes,Buffer.from('crop')]).toString('base64'),scope:'public',sourceEvidenceId:original,sourceRegion:{x:0,y:0,width:.5,height:.5}});const crop=v.createdEvidenceId;
  const body={evidenceIds:[original,crop],sameStaticState:true,expectedCaptureEpoch:v.session.captureEpoch,scope:'public',reader:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'window'}};
  const wait=async(id:string)=>{for(let i=0;i<150;i++){const job=(await call(p+'/analysis-jobs')).jobs.find((j:any)=>j.id===id);if(!['queued','running'].includes(job.state))return job;await new Promise(r=>setTimeout(r,10));}throw Error('fake job timeout');};
  const job=(await call(p+'/analysis-jobs',{...body,requestId:'first'})).job;assert.equal((await wait(job.id)).state,'completed');
  const accepted=(view:any)=>view.session.assertions.filter((a:any)=>a.status==='accepted'&&a.value?.version==='game-component-record-v1').at(-1);
  v=await call(p);let a=accepted(v);assert.equal(a.value.pieces.length,1);assert.equal(a.value.pieces[0].readout.values.dieValue,6);const field=a.field,raw=JSON.stringify(a.observationReceipts.map((r:any)=>r.result));assert(a.observationReceipts.at(-1).scanBundle.fusion.decisions.some((d:any)=>d.fieldPath==='readout.values.dieValue'&&d.conflict&&d.basis==='unresolved'));
  const edited=structuredClone(a.value);edited.pieces[0].readout.values.dieValue=null;edited.pieces[0].readout.sources.dieValue=null;edited.pieces[0].quantity=0;edited.pieces[0].anchor='manual location';
  await call(p,{answers:[{field,value:edited}]},'PATCH');await call(p+'/commit',{allowIncomplete:true,recordingMode:'simple'});v=await call(p);a=accepted(v);assert.deepEqual(a.value,edited);assert.equal(JSON.stringify(a.observationReceipts.map((r:any)=>r.result)),raw);assert(v.session.snapshots.at(-1).assertions.some((x:any)=>x.observationReceipts?.at(-1)?.scanBundle?.fusion));
  const next=(await call(p+'/analysis-jobs',{...body,requestId:'second'})).job;assert.equal((await wait(next.id)).state,'completed');v=await call(p);assert.deepEqual(accepted(v).value,edited);assert(accepted(v).observationReceipts.at(-1).scanBundle.fusion.decisions.some((d:any)=>d.basis==='user-protected'));
  reader.block=true;reader.release=new Promise<void>(r=>{unblock=r;});const started=new Promise<void>(r=>{reader.started=r;});const late=(await call(p+'/analysis-jobs',{...body,requestId:'late'})).job;await started;
  v=await call(p);const last=structuredClone(accepted(v).value);last.pieces[0].quantity=3;await call(p,{answers:[{field,value:last}]},'PATCH');unblock();assert.equal((await wait(late.id)).state,'stale');v=await call(p);assert.deepEqual(accepted(v).value,last);assert.equal(reader.calls,6);
 }finally{unblock();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}
});
