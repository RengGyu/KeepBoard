import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server/index';
import {Store} from '../server/store';
import {catalogPacks} from '../gamepacks/catalog';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=';
async function fixture(approved:boolean,analyzer:any,simple=true){
 const root=await mkdtemp(path.join(tmpdir(),'kb-release-photo-')),store=new Store(root),pack={...catalogPacks.find(p=>p.id==='catan-base')!,...(approved?{releaseTier:'drawing' as const}:{})};
 if(!approved){delete pack.restorationPolicy;pack.version+='-photo-only-fixture';}
 const server=(await createApp({store,runtimePacks:[pack],analyzer})).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+(server.address() as any).port;
 const call=async(route:string,body?:unknown,method=body?'POST':'GET')=>{const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 const created=await call('/sessions',{gamePackId:pack.id,...(simple?{recordingMode:'simple'}:{})}),p='/sessions/'+created.body.session.id;
 return {pack,store,call,p,created:created.body,close:async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}};
}
test('photo-only upload is saved and reopenable immediately, including private scope, without admitting a reader or approving preservation',async()=>{
 let calls=0;const f=await fixture(false,async()=>{calls++;throw Error('must not read');},false);
 try{
  const upload=await f.call(f.p+'/evidence',{dataUrl:image,scope:'public'});assert.equal(upload.status,200);const id=upload.body.createdEvidenceId;
  const reopened=await f.call(f.p);assert(reopened.body.session.evidence.some((e:any)=>e.id===id));
  const list=await f.call('/sessions');assert.equal(list.body[0].saved,true);
  const job=await f.call(f.p+'/analysis-jobs',{requestId:'blocked',scope:'public',evidenceIds:[id],expectedCaptureEpoch:upload.body.session.captureEpoch});assert.equal(job.status,409);
  assert.equal((await f.call(f.p+'/analyze',{evidenceIds:[id]})).status,409);assert.equal(calls,0);
  const resumed=await f.call(f.p+'/resume',{scope:'public'});assert.equal(resumed.status,200);assert(resumed.body.session.evidence.some((e:any)=>e.id===id));assert(resumed.body.session.preservations.every((p:any)=>!p.restored&&!p.packed));
  // No snapshot or physical-completion approval is fabricated to make a photo record saved.
  assert.equal(resumed.body.session.snapshots.length,0);
  const owner=f.created.session.players[0].id;
  assert.equal((await f.call(f.p+'/evidence',{dataUrl:image,scope:'player',ownerId:owner})).status,200);
  const privateResume=await f.call(f.p+'/resume',{scope:'owner',ownerId:owner});assert.equal(privateResume.status,200);assert(privateResume.body.session.evidence.some((e:any)=>e.ownerId===owner));
  assert.equal((await f.call(f.p+'/commit',{})).status,200,'saving a photo record needs no incomplete/physical-completion acknowledgement');
 }finally{await f.close();}
});
test('late reading applies its result while preserving notes/turn edited after photo save',async()=>{
 let release!:()=>void,start!:()=>void;const ready=new Promise<void>(r=>start=r),gate=new Promise<void>(r=>release=r);
 const f=await fixture(true,async(input:any)=>{start();await gate;return {mode:'live',summary:'late',warnings:[],assertions:[{field:'turn.diceTotal',value:8,evidenceIds:input.evidence.map((e:any)=>e.id)},{field:'currentPlayer',value:input.session.players[1].id,evidenceIds:input.evidence.map((e:any)=>e.id)}]};});
 try{
  const upload=await f.call(f.p+'/evidence',{dataUrl:image,scope:'public'});
  const submit=await f.call(f.p+'/analysis-jobs',{requestId:'delayed',evidenceIds:[upload.body.createdEvidenceId],expectedCaptureEpoch:upload.body.session.captureEpoch,scope:'public'});assert.equal(submit.status,202);await ready;
  const changed=await f.call(f.p,{notes:{public:'계속 보관'},answers:[{field:'currentPlayer',value:f.created.session.players[0].id}]},'PATCH');assert.equal(changed.status,200);
  release();let job:any;for(let i=0;i<100;i++){job=(await f.call(f.p+'/analysis-jobs')).body.jobs[0];if(!['queued','running'].includes(job.state))break;await new Promise(r=>setTimeout(r,5));}
  assert.equal(job.state,'completed');const final=(await f.call(f.p)).body.session;assert.equal(final.notes.public,'계속 보관');assert(final.assertions.some((a:any)=>a.field==='currentPlayer'&&a.value===f.created.session.players[0].id));assert.equal(final.evidence.length,1);assert(final.assertions.some((a:any)=>a.field==='turn.diceTotal'&&a.value===8));
  assert.equal((await f.call('/sessions')).body[0].saved,true);
 }finally{release();await f.close();}
});
test('failed analysis leaves the same durable photo record saved and resumable',async()=>{
 let calls=0;const f=await fixture(true,async()=>{calls++;throw Error('synthetic offline failure');});
 try{
  const upload=await f.call(f.p+'/evidence',{dataUrl:image,scope:'public'}),id=upload.body.createdEvidenceId;
  assert.equal((await f.call(f.p+'/analysis-jobs',{requestId:'failure',evidenceIds:[id],expectedCaptureEpoch:upload.body.session.captureEpoch})).status,202);
  let job:any;for(let i=0;i<100;i++){job=(await f.call(f.p+'/analysis-jobs')).body.jobs[0];if(job.state==='failed')break;await new Promise(r=>setTimeout(r,5));}
  assert.equal(job.state,'failed');assert.equal(calls,1);assert.equal((await f.call('/sessions')).body[0].saved,true);
  const resumed=await f.call(f.p+'/resume',{scope:'public'});assert.equal(resumed.status,200);assert(resumed.body.session.evidence.some((e:any)=>e.id===id));
 }finally{await f.close();}
});
test('removing an old quality label does not erase pinned technical capability, saved drawing/receipt or manual corrections',async()=>{
 const {compileObservationTask}=await import('../shared/lightweightRecognition'),{photoDefinition}=await import('../server/photoDefinitions'),{assembleObservations}=await import('../server/ai/observationAssembly');
 const f=await fixture(true,async(input:any)=>{
  const definition=photoDefinition(input.pack),e=input.evidence[0],request=compileObservationTask({pack:input.pack,definition,taskId:'mock-legacy',areaId:'board',scope:{partition:'common_public',ownerId:null,captureEpoch:input.session.captureEpoch},images:[{evidenceId:e.id,inputId:e.id,sha256:'a'.repeat(64),width:1,height:1,transformId:null}]});
  return assembleObservations({pack:input.pack,definition,request,reader:{kind:'gemini-game-observation-v1',model:'gemini-3.8-flash',thinkingLevel:'LOW',mediaResolution:'MEDIA_RESOLUTION_HIGH',maxOutputTokens:32768},turnInstanceId:input.session.turnInstanceId,result:{version:'lightweight-observation-v1',coverage:'partial',completion:'complete',observations:[{ref:'digit',componentId:'number-token',imageIndex:0,panelRef:null,bbox:null,face:'front',quantity:1,rotationDegrees:null,properties:{number:{state:'observed',value:8}},referenceCandidates:[]}]}});
 });
 try{
  const upload=await f.call(f.p+'/evidence',{scope:'public',dataUrl:image}),body={requestId:'before-revoke',evidenceIds:[upload.body.createdEvidenceId],expectedCaptureEpoch:upload.body.session.captureEpoch};assert.equal((await f.call(f.p+'/analysis-jobs',body)).status,202);
  let job:any;for(let i=0;i<100;i++){job=(await f.call(f.p+'/analysis-jobs')).body.jobs[0];if(job.state==='completed')break;await new Promise(r=>setTimeout(r,5));}assert.equal(job.state,'completed');
  const assertion=(await f.call(f.p)).body.session.assertions.find((a:any)=>a.field==='board.layout'&&a.status==='accepted'),receipt=structuredClone(assertion.observationReceipts);assert.equal(assertion.value.components[0].number,8);
  delete f.pack.releaseTier;
  const capability=(await f.call(f.p)).body.pack;assert(capability.restorationPolicy,'technical capability is independent of the historical quality label');
  const value=structuredClone(assertion.value);value.components[0].number=9;assert.equal((await f.call(f.p,{answers:[{field:'board.layout',value}]},'PATCH')).status,200);
  assert.equal((await f.call(f.p+'/commit',{})).status,200);assert.equal((await f.call(f.p+'/resume',{scope:'public'})).status,200);
  const reopened=(await f.call(f.p)).body.session.assertions.find((a:any)=>a.field==='board.layout'&&a.status==='accepted');assert.equal(reopened.value.components[0].number,9);assert.deepEqual(reopened.observationReceipts,receipt);
 }finally{await f.close();}
});
