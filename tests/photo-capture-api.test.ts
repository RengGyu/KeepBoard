import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {createApp} from './fixtures/drawingTestApp';import {Store} from '../server/store';import {normalizeObservations} from '../server/ai/index';
import type {GamePack} from '../shared/types';import {captureProfile} from '../shared/photoCapture';import {effectiveRecognitionPack} from '../shared/recognition';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA4kAAAAASUVORK5CYII=';
async function fixture(game='splendor',unscopedProvider=false){
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-photo-contract-')),store=new Store(root,path.resolve('public'));let calls=0;
 const observations=(input:any)=>{const e=input.evidence[0];
  const field=game==='catan-base'?'components.observed':e.captureTarget?.areaId==='market'?'market.scene':'__photo.public';
  const value=game==='catan-base'?{version:2,coverage:'partial',components:[{id:'model-piece',kind:'terrain',variant:'forest',number:8,location:{type:'hex',id:'r1c1'}}]}:{version:'game-component-record-v1',pieces:[{id:'model-piece',componentId:field==='market.scene'?'development':'chips',variant:null,quantity:1,label:'합성 시험만',anchor:'',evidenceId:e.id,region:{x:.1,y:.1,width:.8,height:.8},...(field==='market.scene'?{readout:{schema:'splendor-v1',kind:'development',points:0,bonus:'blue',cost:{white:null,blue:0,green:6,red:null,black:null},requirements:null,color:null,level:null}}:{})}]};
  if(unscopedProvider)return {summary:'합성 범위밖 응답',mode:'live',warnings:[],assertions:[{id:'untrusted',field:'__photo.public',value:{version:'game-component-record-v1',pieces:[{id:'untrusted-piece',componentId:'chips',variant:null,quantity:null,label:'합성',anchor:'',evidenceId:e.id,region:null}]},ownerId:undefined,evidenceIds:[e.id],basis:'observation',status:'candidate',updatedAt:new Date().toISOString()}]} as any;
  return normalizeObservations({assertions:[{field,value,evidenceIds:input.evidence.map((e:any)=>e.id)}]},input.pack,input.evidence,input.session.turnInstanceId,input.session.players.map((p:any)=>p.id));};
 const app=await createApp({ui:false,store,analyzer:async input=>{calls++;return observations(input);}});
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base='http://127.0.0.1:'+(server.address() as any).port;
 async function call(url:string,body?:unknown,method=body===undefined?'GET':'POST'){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
 const v=(await call('/api/sessions',{gamePackId:game,players:[{id:'p1',name:'합성 참가자',color:'red'}]})).body,p='/api/sessions/'+v.session.id;
 const target=(areaId:string)=>({version:1,gameId:captureProfile(v.pack as GamePack)!.gameId,sourceSHA:v.pack.runtime.source.sha256,areaId});
 async function done(){for(let i=0;i<100;i++){const j=(await call(p+'/analysis-jobs')).body.jobs[0];if(j&&!['queued','running'].includes(j.state))return j;await new Promise(r=>setTimeout(r,5));}throw Error('synthetic job deadline');}
 async function seedLegacyCandidate(evidenceId:string,areaId:string){
  const session=(await store.getSession(v.session.id))!,source=session.evidence.find(e=>e.id===evidenceId)!;
  // A prior reader override changed its analysis input, not the saved upload metadata.
  const result=observations({session,pack:effectiveRecognitionPack(session.gamePack!),evidence:[{...source,captureTarget:target(areaId)}]});
  assert.equal(result.assertions.length,1);assert.equal(result.assertions[0].status,'candidate');session.assertions.push(...result.assertions);await store.saveSession(session);
  return result.assertions[0];
 }
 return {p,call,done,target,seedLegacyCandidate,get calls(){return calls;},close:async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}};
}
test('legacy photo selected-part override automatically applies; optional edit/save/resume/export/import preserves source, null/0 and cost',async()=>{
 const f=await fixture();try{
  await f.call(f.p,{answers:[{field:'turn',value:'사용자가 남긴 차례'}]},'PATCH');
  const u=(await f.call(f.p+'/evidence',{scope:'public',dataUrl:image})).body,eid=u.createdEvidenceId;
  const start=await f.call(f.p+'/analysis-jobs',{requestId:'selected-legacy',scope:'public',evidenceIds:[eid],expectedCaptureEpoch:u.session.captureEpoch,captureTarget:f.target('market')});assert.equal(start.status,202);
  const job=await f.done();assert.equal(job.state,'completed');assert.equal(job.candidateCount,1);assert.equal(f.calls,1);
  const v=(await f.call(f.p)).body;assert.equal(v.session.evidence[0].captureTarget,undefined,'request override does not migrate original');assert.equal(v.session.assertions.find((a:any)=>a.field==='turn').value,'사용자가 남긴 차례');
  const c=v.session.assertions.find((a:any)=>a.status==='accepted'&&a.field==='market.scene');assert(c);assert.equal(v.session.assertions.some((a:any)=>a.status==='candidate'),false);assert.equal(c.value.pieces[0].evidenceId,eid);
  const corrected=structuredClone(c.value);corrected.pieces[0].quantity=0;
  assert.equal((await f.call(f.p,{answers:[{field:c.field,value:corrected}]},'PATCH')).status,200);
  assert.equal((await f.call(f.p+'/commit',{allowIncomplete:true})).status,200);
  const resumed=(await f.call(f.p+'/resume',{scope:'public'})).body,record=resumed.session.assertions.find((a:any)=>a.field===c.field&&a.status==='accepted').value;
  assert.equal(record.pieces[0].quantity,0);assert.equal(record.pieces[0].readout.cost.green,6);assert.equal(record.pieces[0].readout.cost.white,null);assert.equal(record.pieces[0].readout.cost.blue,0);assert.equal(record.pieces[0].evidenceId,eid);assert.deepEqual(record.pieces[0].region,c.value.pieces[0].region);
  const exported=(await f.call(f.p+'/export')).body;const imported=await f.call('/api/sessions/import',exported);assert.equal(imported.status,201);assert.equal(imported.body.session.evidence[0].captureTarget,undefined);assert.equal(imported.body.session.gamePackVersion,v.session.gamePackVersion);
 }finally{await f.close();}
});
test('two photos require explicit stopped-state confirmation; new metadata survives snapshots; private targets cannot enter public requests',async()=>{
 const f=await fixture();try{
  assert.equal((await f.call(f.p+'/evidence',{scope:'public',dataUrl:image,captureTarget:f.target('reserve')})).status,400);
  const uploads=[];for(let i=0;i<2;i++)uploads.push((await f.call(f.p+'/evidence',{scope:'public',dataUrl:image,captureTarget:f.target('player')})).body);
  const body={requestId:'same-static',scope:'public',evidenceIds:uploads.map(u=>u.createdEvidenceId),expectedCaptureEpoch:uploads[0].session.captureEpoch};
  assert.equal((await f.call(f.p+'/analysis-jobs',body)).status,400);assert.equal(f.calls,0);
  assert.equal((await f.call(f.p+'/analysis-jobs',{...body,captureTarget:f.target('reserve'),sameStaticState:true})).status,400);
  assert.equal((await f.call(f.p+'/analysis-jobs',{...body,sameStaticState:true})).status,202);assert.equal((await f.done()).state,'completed');assert.equal(f.calls,1);
  const v=(await f.call(f.p)).body,c=v.session.assertions.find((a:any)=>a.status==='accepted'&&a.field==='__photo.public');assert(c);assert.equal(c.ownerId,undefined);assert.equal(v.session.assertions.some((a:any)=>a.status==='candidate'),false);assert.deepEqual(new Set(c.evidenceIds),new Set(body.evidenceIds));
  assert.equal((await f.call(f.p+'/commit',{allowIncomplete:true})).status,200);const r=(await f.call(f.p+'/resume',{scope:'public'})).body;assert.deepEqual(r.session.evidence[0].captureTarget,f.target('player'));assert.deepEqual(r.session.evidence.map((e:any)=>e.id),body.evidenceIds);
 }finally{await f.close();}
});
test('native Catan selected board automatically applies its partial scene and keeps the saved turn on resume',async()=>{
 const f=await fixture('catan-base');try{
  const u=(await f.call(f.p+'/evidence',{scope:'public',dataUrl:image,captureTarget:f.target('board')})).body;
  assert.equal((await f.call(f.p+'/analysis-jobs',{requestId:'native-partial',scope:'public',evidenceIds:[u.createdEvidenceId],expectedCaptureEpoch:u.session.captureEpoch})).status,202);
  assert.equal((await f.done()).state,'completed');const v=(await f.call(f.p)).body,c=v.session.assertions.find((a:any)=>a.status==='accepted'&&a.field==='board.layout');assert(c);assert.equal(v.session.assertions.some((a:any)=>a.status==='candidate'),false);assert.equal(c.value.components[0].location.id,'r1c1');assert.deepEqual(c.evidenceIds,[u.createdEvidenceId]);
  assert.equal((await f.call(f.p+'/commit',{allowIncomplete:true})).status,200);const r=(await f.call(f.p+'/resume',{scope:'public'})).body;assert.equal(r.session.turnInstanceId,v.session.turnInstanceId);assert.equal(r.session.assertions.find((a:any)=>a.field===c.field).value.components[0].variant,'forest');assert.deepEqual(r.session.evidence[0].captureTarget,f.target('board'));
 }finally{await f.close();}
});

test('retargeted saved candidate keeps both UI PATCH and explicit accept API usable without changing original upload target',async()=>{
 const f=await fixture();try{
  const u=(await f.call(f.p+'/evidence',{scope:'public',dataUrl:image,captureTarget:f.target('market')})).body;
  const c=await f.seedLegacyCandidate(u.createdEvidenceId,'player');assert.equal(c.field,'__photo.public');assert.equal(f.calls,0,'the compatibility case starts from a prior saved candidate, not a new read');
  const before=(await f.call(f.p)).body;assert.equal(before.session.assertions.find((a:any)=>a.id===c.id).status,'candidate');assert.deepEqual(before.session.evidence[0].captureTarget,f.target('market'));
  const accepted=await f.call(f.p+'/assertions/'+c.id+'/accept',{});
  const patch=await f.call(f.p,{answers:[{field:c.field,value:c.value}]},'PATCH');assert.equal(patch.status,200,'existing UI explicit apply path remains valid');
  assert.equal(accepted.status,200,JSON.stringify(accepted.body));
  assert.deepEqual(accepted.body.session.evidence[0].captureTarget,f.target('market'));assert.deepEqual(accepted.body.session.assertions.find((a:any)=>a.id===c.id).value,c.value);assert.equal(accepted.body.session.assertions.find((a:any)=>a.id===c.id).status,'accepted');
 }finally{await f.close();}
});
test('job completion still rejects unscoped provider output independently of stored candidate acceptance',async()=>{
 const f=await fixture('splendor',true);try{
  const u=(await f.call(f.p+'/evidence',{scope:'public',dataUrl:image,captureTarget:f.target('market')})).body;
  assert.equal((await f.call(f.p+'/analysis-jobs',{requestId:'unscoped-provider',scope:'public',evidenceIds:[u.createdEvidenceId],expectedCaptureEpoch:u.session.captureEpoch})).status,202);
  assert.equal((await f.done()).state,'failed');assert.equal((await f.call(f.p)).body.session.assertions.filter((a:any)=>a.status==='candidate').length,0);
 }finally{await f.close();}
});
