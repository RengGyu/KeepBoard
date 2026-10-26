import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';

// Review-only harness. No settings, real images, model API or existing session access.
const snapshot='/private/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-photo-integration-f3wlxy9s/app';
const output='/Users/jeonggyuju/Project_folder/KeepBoard/docs/vision-research-astra/integration-review.behavior.json';
const moduleAt=(p:string)=>import(pathToFileURL(path.join(snapshot,p)).href);
const boot=await mkdtemp(path.join(os.tmpdir(),'kb-review-boot-'));
for(const name of ['OPENAI_API_KEY','GEMINI_API_KEY','GOOGLE_API_KEY','KEEPBOARD_AI_GATEWAY_URL','KEEPBOARD_DATA_DIR'])delete process.env[name];
const realFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input:input.url);
 if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw Error('Review forbids external network');
 return realFetch(input,init);
};
process.chdir(boot);
const {createApp}=await moduleAt('server/index.ts');
const {Store}=await moduleAt('server/store.ts');
process.chdir(snapshot);await rm(boot,{recursive:true,force:true});
const {normalizeObservations}=await moduleAt('server/ai/index.ts');
const {captureProfile}=await moduleAt('shared/photoCapture.ts');
const {validateComponentRecord}=await moduleAt('server/engine.ts');
const {emptyGameReadout}=await moduleAt('shared/readouts/registry.ts');
const {genericCandidateValue}=await moduleAt('server/ai/generic.ts');
const {effectiveRecognitionPack}=await moduleAt('shared/recognition.ts');
const packs=JSON.parse(await readFile(path.join(snapshot,'gamepacks/generated/game-essentials.json'),'utf8'));
for(const p of ['photo-capture-contract','photo-capture-api','photo-capture-ui','photo-capture-display','background-analysis-api','background-analysis-ui'])await moduleAt(`tests/${p}.test.ts`);
const observations:any[]=[];
test('independent: fresh source alias does not permit relinking existing observation facts',()=>{
 const pack=effectiveRecognitionPack(structuredClone(packs.find((p:any)=>p.id==='scout')));
 const evidence=[{id:'a',scope:'player',ownerId:'p1',captureEpoch:'one',kind:'photo'},{id:'b',scope:'player',ownerId:'p1',captureEpoch:'one',kind:'photo'}];
 const readout=emptyGameReadout(pack,'cards');readout.values.face='front';readout.sources.face='a';readout.values.topNumber=3;readout.sources.topNumber='a';
 const raw={version:'game-component-record-v1',pieces:[{id:'fresh',componentId:'cards',variant:null,quantity:null,label:'synthetic',anchor:'',evidenceId:'a',region:null,readout}]};
 const value=genericCandidateValue(raw,pack,'hand.scene',evidence,'p1',true);
 const session={players:[{id:'p1',name:'synthetic',color:'red'}],evidence,assertions:[{field:'hand.scene',ownerId:'p1',status:'candidate',value}]};
 const relinked=structuredClone(value);relinked.pieces[0].evidenceId='b';
 assert.throws(()=>validateComponentRecord(session,pack,'hand.scene',relinked,'p1'),/사진 관측값의 원본/);
 assert.equal(value.pieces[0].readout.sources.topNumber,'observation');assert.equal(value.pieces[0].quantity,null);
 observations.push({case:'existing-observation-relink',freshAliasAccepted:true,relinkRejected:true,quantity:null});
});
test('independent: retargeting an already tagged photo should preserve explicit candidate acceptance',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-review-retarget-'));let calls=0;
 const app=await createApp({ui:false,store:new Store(root,path.join(snapshot,'public')),analyzer:async(input:any)=>{
  calls++;const e=input.evidence[0];return normalizeObservations({assertions:[{field:'__photo.public',evidenceIds:[e.id],value:{version:'game-component-record-v1',pieces:[{id:'observed',componentId:'chips',variant:null,quantity:null,label:'synthetic chip',anchor:'',evidenceId:e.id,region:null}]}}]},input.pack,input.evidence,input.session.turnInstanceId,['p1']);
 }});
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+(server.address() as any).port;
 async function call(url:string,body?:any,method=body===undefined?'GET':'POST'){
  const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};
 }
 try{
  const initial=(await call('/api/sessions',{gamePackId:'splendor',players:[{id:'p1',name:'synthetic',color:'red'}]})).body,p='/api/sessions/'+initial.session.id,profile=captureProfile(initial.pack);
  const target=(areaId:string)=>({version:1,gameId:profile.gameId,sourceSHA:profile.sourceSHA,areaId});
  const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA4kAAAAASUVORK5CYII=';
  const u=(await call(p+'/evidence',{scope:'public',dataUrl:image,captureTarget:target('market')})).body;
  const started=await call(p+'/analysis-jobs',{scope:'public',requestId:'retarget',evidenceIds:[u.createdEvidenceId],expectedCaptureEpoch:u.session.captureEpoch,captureTarget:target('player')});assert.equal(started.status,202);
  let job:any;
  for(let i=0;i<100;i++){job=(await call(p+'/analysis-jobs')).body.jobs[0];if(job&&!['queued','running'].includes(job.state))break;await new Promise(r=>setTimeout(r,5));}
  assert.equal(job.state,'completed');const v=(await call(p)).body,c=v.session.assertions.find((a:any)=>a.status==='candidate');assert.equal(c.field,'__photo.public');
  const accepted=await call(p+'/assertions/'+c.id+'/accept',{});
  const edited=await call(p,{answers:[{field:c.field,value:c.value}]},'PATCH');
  observations.push({case:'retarget-tagged-photo',storedArea:v.session.evidence[0].captureTarget.areaId,requestArea:'player',jobState:job.state,candidateField:c.field,acceptStatus:accepted.status,acceptError:accepted.body.error,actualGenericUIAnswerStatus:edited.status,mockCalls:calls,realAICalls:0});
  await writeFile(output,JSON.stringify({observations,realModelCalls:0,productWrites:0},null,2)+'\n');
  assert.equal(accepted.status,200,'new candidate should be accepted under its request target, not the old upload target');
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}
});
