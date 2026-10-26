import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {createApp} from '../server/index';import {Store} from '../server/store';import {normalizeObservations} from '../server/ai/index';
import type {GamePack} from '../shared/types';import {captureProfile} from '../shared/photoCapture';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA4kAAAAASUVORK5CYII=';
async function fixture(game='splendor'){
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-photo-contract-'));let calls=0;
 const app=await createApp({ui:false,store:new Store(root,path.resolve('public')),analyzer:async input=>{calls++;const e=input.evidence[0];
  const field=game==='catan-base'?'components.observed':e.captureTarget?.areaId==='market'?'market.scene':'__photo.public';
  const value=game==='catan-base'?{version:2,coverage:'partial',components:[{id:'model-piece',kind:'terrain',variant:'forest',number:8,location:{type:'hex',id:'r1c1'}}]}:{version:'game-component-record-v1',pieces:[{id:'model-piece',componentId:field==='market.scene'?'development':'chips',variant:null,quantity:1,label:'합성 시험만',anchor:'',evidenceId:e.id,region:{x:.1,y:.1,width:.8,height:.8},...(field==='market.scene'?{readout:{schema:'splendor-v1',kind:'development',points:0,bonus:'blue',cost:{white:null,blue:0,green:6,red:null,black:null},requirements:null,color:null,level:null}}:{})}]};
  return normalizeObservations({assertions:[{field,value,evidenceIds:input.evidence.map(e=>e.id)}]},input.pack,input.evidence,input.session.turnInstanceId,input.session.players.map(p=>p.id));}});
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base='http://127.0.0.1:'+(server.address() as any).port;
 async function call(url:string,body?:unknown,method=body===undefined?'GET':'POST'){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
 const v=(await call('/api/sessions',{gamePackId:game,players:[{id:'p1',name:'합성 참가자',color:'red'}]})).body,p='/api/sessions/'+v.session.id;
 const target=(areaId:string)=>({version:1,gameId:captureProfile(v.pack as GamePack)!.gameId,sourceSHA:v.pack.runtime.source.sha256,areaId});
 async function done(){for(let i=0;i<100;i++){const j=(await call(p+'/analysis-jobs')).body.jobs[0];if(j&&!['queued','running'].includes(j.state))return j;await new Promise(r=>setTimeout(r,5));}throw Error('synthetic job deadline');}
 return {p,call,done,target,get calls(){return calls;},close:async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}};
}
test('legacy photo selected-part override → persistent candidate discovery → explicit apply/edit/save/resume/export/import preserves source, null/0 and cost',async()=>{
 const f=await fixture();try{
  await f.call(f.p,{answers:[{field:'turn',value:'사용자가 남긴 차례'}]},'PATCH');
  const u=(await f.call(f.p+'/evidence',{scope:'public',dataUrl:image})).body,eid=u.createdEvidenceId;
  const start=await f.call(f.p+'/analysis-jobs',{requestId:'selected-legacy',scope:'public',evidenceIds:[eid],expectedCaptureEpoch:u.session.captureEpoch,captureTarget:f.target('market')});assert.equal(start.status,202);
  const job=await f.done();assert.equal(job.state,'completed');assert.equal(job.candidateCount,1);assert.equal(f.calls,1);
  const v=(await f.call(f.p)).body;assert.equal(v.session.evidence[0].captureTarget,undefined,'request override does not migrate original');assert.equal(v.session.assertions.find((a:any)=>a.field==='turn').value,'사용자가 남긴 차례');
  const c=v.session.assertions.find((a:any)=>a.status==='candidate');assert.equal(c.field,'market.scene');assert.equal(v.session.assertions.some((a:any)=>a.status==='accepted'&&a.field==='market.scene'),false);
  assert.equal((await f.call(f.p+'/assertions/'+c.id+'/accept',{})).status,200);
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
  const v=(await f.call(f.p)).body,c=v.session.assertions.find((a:any)=>a.status==='candidate');assert.equal(c.field,'__photo.public');assert.equal(c.ownerId,undefined);
  await f.call(f.p+'/commit',{allowIncomplete:true});const r=(await f.call(f.p+'/resume',{scope:'public'})).body;assert.deepEqual(r.session.evidence[0].captureTarget,f.target('player'));
 }finally{await f.close();}
});
test('native Catan selected board retains partial scene candidate and saved turn on resume',async()=>{
 const f=await fixture('catan-base');try{
  const u=(await f.call(f.p+'/evidence',{scope:'public',dataUrl:image,captureTarget:f.target('board')})).body;
  assert.equal((await f.call(f.p+'/analysis-jobs',{requestId:'native-partial',scope:'public',evidenceIds:[u.createdEvidenceId],expectedCaptureEpoch:u.session.captureEpoch})).status,202);
  assert.equal((await f.done()).state,'completed');const v=(await f.call(f.p)).body,c=v.session.assertions.find((a:any)=>a.status==='candidate');assert.equal(c.field,'components.observed');assert.equal(c.value.components[0].location.id,'r1c1');
  await f.call(f.p+'/assertions/'+c.id+'/accept',{});await f.call(f.p+'/commit',{allowIncomplete:true});const r=(await f.call(f.p+'/resume',{scope:'public'})).body;assert.equal(r.session.turnInstanceId,v.session.turnInstanceId);assert.equal(r.session.assertions.find((a:any)=>a.field===c.field).value.components[0].variant,'forest');
 }finally{await f.close();}
});
