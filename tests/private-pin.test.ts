import {catanPack} from '../gamepacks/catan.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../server/store.ts';
import {PrivatePins} from '../server/privatePin.ts';
// Server startup must not load the project's real .env in a synthetic test.
const project=process.cwd(),bootstrap=await mkdtemp(path.join(os.tmpdir(),'kb-pin-bootstrap-'));process.chdir(bootstrap);
const {createApp}=await import('./fixtures/drawingTestApp');process.chdir(project);await rm(bootstrap,{recursive:true,force:true});
async function fixture(){
 const root=await mkdtemp(path.join(os.tmpdir(),'keepboard-pin-')),store=new Store(root),app=await createApp({store});
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const address=server.address();assert(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;
 const call=async(route:string,method='GET',body?:unknown,token?:string)=>{const response=await fetch(base+route,{method,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{'X-KeepBoard-Private-Token':token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
 const created=await call('/api/sessions','POST',{gamePackVersion:catanPack.version,example:true,recordingMode:'simple'}),id=created.body.session.id,owner=created.body.session.players[0].id,other=created.body.session.players[1].id;
 const session=await store.getSession(id);assert(session);session.notes[owner]='synthetic-owner-secret';await store.saveSession(session);
 const prefix=`/api/sessions/${id}`;
 await call(prefix,'PATCH',{answers:[{field:'player.resources.counts',ownerId:owner,value:{lumber:7,brick:0,wool:0,grain:0,ore:0}},{field:'player.resources.total',ownerId:owner,value:7}]});
 const image=await call(prefix+'/evidence','POST',{scope:'player',ownerId:owner,label:'synthetic-private-image',dataUrl:'data:image/png;base64,aGVsbG8='});
 const photo=image.body.session.evidence.find((e:any)=>e.id===image.body.createdEvidenceId);assert(photo);
 return {root,store,call,id,owner,other,prefix,photo,raw:(route:string,token?:string)=>fetch(base+route,{headers:token?{'X-KeepBoard-Private-Token':token}:{}}),cleanup:async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}};
}
test('PIN 0007 is salted/hashed; locked responses including lists/snapshots/images/export exclude private data while public facts remain',async()=>{
 const f=await fixture();try{
  await f.call(f.prefix+'/commit','POST',{allowIncomplete:true});
  for(const pin of ['7','12345','abcd',7])assert.equal((await f.call(f.prefix+`/privacy/${f.owner}`,'PUT',{enabled:true,pin})).status,400);
  assert.equal((await f.call(f.prefix+`/privacy/${f.owner}`,'PUT',{enabled:true,pin:'0007'})).status,200);
  const records=JSON.parse(await readFile(path.join(f.root,'private-pins.json'),'utf8'));const stored=records[f.id][f.owner];assert(stored.salt&&stored.hash);assert(!JSON.stringify(records).includes('0007'));assert(!JSON.stringify(await f.store.getSession(f.id)).includes(stored.hash));
  for(const route of [f.prefix,'/api/sessions']){const result=await f.call(route);const text=JSON.stringify(result.body);assert(!text.includes('synthetic-owner-secret'));assert(!text.includes('synthetic-private-image'));if(route===f.prefix){assert(result.body.session.assertions.some((a:any)=>a.field==='board.layout'));assert(result.body.session.assertions.some((a:any)=>a.field==='player.resources.total'&&a.ownerId===f.owner));assert(!result.body.session.assertions.some((a:any)=>a.field==='player.resources.counts'&&a.ownerId===f.owner));assert(!result.body.session.snapshots[0].notes[f.owner]);}}
  assert.equal((await f.call(f.photo.url)).status,403);assert.equal((await f.call(f.prefix+'/export')).status,403);
  const unlock=await f.call(f.prefix+`/privacy/${f.owner}/unlock`,'POST',{pin:'0007'});assert.equal(unlock.status,200);const token=unlock.body.token;assert(typeof token==='string');
  const reopened=new PrivatePins(f.root);assert((await reopened.owners(f.id)).has(f.owner));assert.equal((await reopened.allowed(f.id,token)).size,0,'a new server instance starts locked');assert(typeof await reopened.unlock(f.id,f.owner,'0007','synthetic-reopen')==='string');
  const opened=await f.call(f.prefix,'GET',undefined,token);assert.equal(opened.body.session.notes[f.owner],'synthetic-owner-secret');assert(opened.body.session.evidence.some((e:any)=>e.id===f.photo.id));
  assert(!JSON.stringify(opened.body).includes(stored.hash));assert(!JSON.stringify(opened.body).includes(stored.salt));
  const image=await f.raw(f.photo.url,token);assert.equal(image.status,200);assert.equal(image.headers.get('cache-control'),'no-store');assert.equal(await image.text(),'hello');
  assert(!JSON.stringify((await f.call('/api/sessions','GET',undefined,token)).body).includes('synthetic-owner-secret'),'list never keeps unlocked private content');
  assert.equal((await f.call(f.prefix+'/export','GET',undefined,token)).status,403,'protected full export is deliberately disabled');
  await f.call(f.prefix+'/privacy/lock','POST',{},token);assert(!JSON.stringify((await f.call(f.prefix,'GET',undefined,token)).body).includes('synthetic-owner-secret'));
 }finally{await f.cleanup();}
});
test('wrong PIN/other-owner tokens cannot edit private fields, notes, evidence, accept candidates or change protection',async()=>{
 const f=await fixture();try{
  const session=await f.store.getSession(f.id);assert(session);session.assertions.push({id:'private-candidate',field:'player.resources.counts',ownerId:f.owner,value:{lumber:9},basis:'observation',status:'candidate',evidenceIds:[f.photo.id],updatedAt:new Date().toISOString()});session.preservations.push({id:'private-bundle',templateId:'private-bundle',ownerId:f.owner,label:'synthetic-private-bundle',description:'',conditions:[],container:'secret box',packed:false,restored:false,restoreAfter:[]});await f.store.saveSession(session);
  await f.call(f.prefix+`/privacy/${f.owner}`,'PUT',{enabled:true,pin:'0007'});
  const wrong=await f.call(f.prefix+`/privacy/${f.owner}/unlock`,'POST',{pin:'9999'});assert.equal(wrong.status,403);assert(!wrong.body.token);
  await f.call(f.prefix+`/privacy/${f.other}`,'PUT',{enabled:true,pin:'1234'});const other=(await f.call(f.prefix+`/privacy/${f.other}/unlock`,'POST',{pin:'1234'})).body.token;
  for(const token of [undefined,other]){
   assert.equal((await f.call(f.prefix,'PATCH',{notes:{[f.owner]:'stolen'}},token)).status,403);
   assert.equal((await f.call(f.prefix,'PATCH',{answers:[{field:'player.resources.counts',ownerId:f.owner,value:{lumber:1}}]},token)).status,403);
   assert.equal((await f.call(f.prefix+'/evidence','POST',{scope:'player',ownerId:f.owner,dataUrl:'data:image/png;base64,aGVsbG8='},token)).status,403);
   assert.equal((await f.call(f.prefix+'/evidence','POST',{scope:'public',sourceEvidenceId:f.photo.id,dataUrl:'data:image/png;base64,aGVsbG8='},token)).status,403);
   assert.equal((await f.call(f.prefix+`/evidence/${f.photo.id}`,'DELETE',undefined,token)).status,403);
   assert.equal((await f.call(f.prefix+'/analyze','POST',{evidenceIds:[f.photo.id]},token)).status,403);
   assert.equal((await f.call(f.prefix+'/assertions/private-candidate/accept','POST',{},token)).status,403);
   assert.equal((await f.call(f.prefix,'PATCH',{assertions:[{id:'private-candidate',field:'player.resources.total'}]},token)).status,403);
   assert.equal((await f.call(f.prefix+'/preservations/private-bundle','PATCH',{container:'changed'},token)).status,403);
   assert.equal((await f.call(f.prefix,'PATCH',{players:session.players.filter(p=>p.id!==f.owner)},token)).status,403);
   assert.equal((await f.call(f.prefix+`/privacy/${f.owner}`,'PUT',{enabled:false},token)).status,403);
  }
  const token=(await f.call(f.prefix+`/privacy/${f.owner}/unlock`,'POST',{pin:'0007'})).body.token;
  const second=await f.call('/api/sessions','POST',{gamePackVersion:catanPack.version,example:true});const otherSession=second.body.session;otherSession.notes[f.owner]='different-session-secret';await f.store.saveSession(otherSession);await f.call(`/api/sessions/${otherSession.id}/privacy/${f.owner}`,'PUT',{enabled:true,pin:'0011'});assert(!JSON.stringify((await f.call(`/api/sessions/${otherSession.id}`,'GET',undefined,token)).body).includes('different-session-secret'));
  assert.equal((await f.call(f.prefix,'PATCH',{notes:{[f.owner]:'updated'}},token)).status,200);
  assert.equal((await f.call(f.prefix,'PATCH',{players:session.players.filter(p=>p.id!==f.owner)},token)).status,409,'protected owner cannot be orphaned through player deletion');
  assert.equal((await f.call(f.prefix+`/privacy/${f.owner}`,'PUT',{enabled:false,currentPin:'0007'},token)).status,200);
  assert.equal((await f.call(f.prefix)).body.session.notes[f.owner],'updated');
 }finally{await f.cleanup();}
});
test('public save/turn actions keep locked private records; legacy resume cannot overwrite them without unlocking',async()=>{
 const f=await fixture();try{
  const session=await f.store.getSession(f.id);assert(session);session.assertions.push({id:'private-temporal',field:'player.development.playedThisTurnType',ownerId:f.owner,value:'knight',basis:'user',status:'accepted',evidenceIds:[],updatedAt:new Date().toISOString(),turnInstanceId:session.turnInstanceId});await f.store.saveSession(session);
  await f.call(f.prefix+`/privacy/${f.owner}`,'PUT',{enabled:true,pin:'0007'});
  assert.equal((await f.call(f.prefix+'/commit','POST',{allowIncomplete:true})).status,200);
  assert.equal((await f.call(f.prefix+'/resume','POST',{})).status,403);
  assert.equal((await f.call(f.prefix+'/next-turn','POST',{playerId:f.other})).status,200);
  const stored=await f.store.getSession(f.id);assert(stored);assert(stored.assertions.some(a=>a.id==='private-temporal'));assert.equal(stored.notes[f.owner],'synthetic-owner-secret');assert(stored.evidence.some(e=>e.id===f.photo.id));
 }finally{await f.cleanup();}
});
test('attempts are limited, protection change revokes tokens, and unprotected legacy records keep working',async()=>{
 const f=await fixture();try{
  assert.equal((await f.call(f.prefix)).body.session.notes[f.owner],'synthetic-owner-secret');
  await f.call(f.prefix+`/privacy/${f.owner}`,'PUT',{enabled:true,pin:'0007'});
  const token=(await f.call(f.prefix+`/privacy/${f.owner}/unlock`,'POST',{pin:'0007'})).body.token;
  assert.equal((await f.call(f.prefix+`/privacy/${f.owner}`,'PUT',{enabled:true,currentPin:'0007',pin:'0011'},token)).status,200);
  assert(!JSON.stringify((await f.call(f.prefix,'GET',undefined,token)).body).includes('synthetic-owner-secret'));
  for(let n=0;n<5;n++)await f.call(f.prefix+`/privacy/${f.owner}/unlock`,'POST',{pin:'9999'});
  assert.equal((await f.call(f.prefix+`/privacy/${f.owner}/unlock`,'POST',{pin:'0011'})).status,429);
 }finally{await f.cleanup();}
});
