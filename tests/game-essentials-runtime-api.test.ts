import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type {GamePack,SessionView} from '../shared/types.ts';
import {rummikubPack} from '../gamepacks/rummikub.ts';
const packs:GamePack[]=JSON.parse(await readFile(new URL('../docs/game-essentials/runtime/fixture-packs.json',import.meta.url),'utf8'));
// Import the server from a fresh directory so no real .env/settings/Store can be loaded.
const project=process.cwd(),bootstrap=await mkdtemp(path.join(os.tmpdir(),'kb-runtime-bootstrap-'));process.chdir(bootstrap);
const {createApp}=await import('../server/index.ts');const {Store}=await import('../server/store.ts');process.chdir(project);await rm(bootstrap,{recursive:true,force:true});
async function fixture(game='ticket-to-ride',fullCatalog=false){
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-essentials-')),store=new Store(root,path.join(project,'public')),app=await createApp({store,...(fullCatalog?{}:{runtimePacks:packs})});const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const address=server.address();assert(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;
 async function call(route:string,method='GET',body?:unknown,token?:string){const r=await fetch(base+route,{method,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{'X-KeepBoard-Private-Token':token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
 const created=await call('/api/sessions','POST',{gamePackId:game,players:[{id:'p1',name:'하나',color:'red'},{id:'p2',name:'둘',color:'blue'}]});assert.equal(created.status,201);const prefix=`/api/sessions/${created.body.session.id}`;
 async function unlock(owner:string){assert.equal((await call(`${prefix}/privacy/${owner}`,'PUT',{enabled:true,pin:'0007'})).status,200);return (await call(`${prefix}/privacy/${owner}/unlock`,'POST',{pin:'0007'})).body.token as string;}
 return {call,prefix,view:created.body as SessionView,store,unlock,cleanup:async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}};
}
const record=(id:string,componentId:string,label='합성')=>({version:'game-component-record-v1',pieces:[{id,componentId,variant:null,quantity:null,label,anchor:'사진 왼쪽',evidenceId:null,region:null}]});
test('historical metadata stays pinned while unset PIN is optional and configured private writes/photos/list/export stay protected',async()=>{
 const f=await fixture();try{
  assert.equal((await f.call(f.prefix,'PATCH',{notes:{public:'공용 메모'}})).status,200);
  assert.equal(f.view.pack.runtime?.privatePolicy,'pin-before-content');assert.deepEqual(f.view.privacy?.setupRequiredOwnerIds,[]);
  const binding=f.view.pack.runtime!.fieldBindings.find(b=>b.key==='hand.scene')!;
  assert.equal((await f.call(f.prefix,'PATCH',{answers:[{field:'hand.scene',ownerId:'p1',value:record('tile',binding.componentIds[0])}]})).status,200);
  assert.equal((await f.call(f.prefix,'PATCH',{notes:{p1:'private'}})).status,200);
  assert.equal((await f.call(f.prefix+'/evidence','POST',{scope:'player',ownerId:'p1',dataUrl:'data:image/png;base64,aGVsbG8='})).status,200);
  const token=await f.unlock('p1');
  assert.equal((await f.call(f.prefix,'PATCH',{answers:[{field:'hand.scene',ownerId:'p1',value:record('copy',binding.componentIds[0],'rack-secret')}],notes:{p1:'rack-note'}},token)).status,200);
  await f.call(f.prefix+'/commit','POST',{allowIncomplete:true});
  for(const route of [f.prefix,'/api/sessions'])assert.ok(!JSON.stringify((await f.call(route)).body).includes('rack-secret'));
  assert.equal((await f.call(f.prefix+'/export')).status,403);assert.equal((await f.call(`${f.prefix}/privacy/p1`,'PUT',{enabled:false,currentPin:'0007'},token)).status,200);
  const reopened=await f.call(f.prefix);assert.equal(reopened.body.pack.version,f.view.pack.version);assert.equal(reopened.body.pack.runtime.source.sha256,f.view.pack.runtime!.source.sha256);
 }finally{await f.cleanup();}
});
test('unsupported own-hidden/role secrets cannot enter fields/import/AI/photos; physical steps remain',async()=>{
 for(const [game,field] of [['hanabi','hand.scene'],['codenames','key-map']]){const f=await fixture(game);try{
  assert.ok(f.view.session.preservations.length);assert.equal((await f.call(f.prefix,'PATCH',{answers:[{field,value:'do-not-collect',ownerId:game==='hanabi'?'p1':undefined}]})).status,400);
  const token=await f.unlock('p1');assert.equal((await f.call(f.prefix+'/evidence','POST',{scope:'player',ownerId:'p1',dataUrl:'data:image/png;base64,aGVsbG8='},token)).status,403);
  assert.equal((await f.call(f.prefix+'/analyze','POST',{})).status,400);
  const imported=structuredClone(f.view.session);imported.assertions.push({id:'bad',field,value:'do-not-collect',basis:'user',status:'accepted',ownerId:'p1',updatedAt:'now',evidenceIds:[]});assert.equal((await f.call('/api/sessions/import','POST',{format:'keepboard/v1',session:imported,evidenceData:{}})).status,400);
 }finally{await f.cleanup();}}
});
test('public/owner resume preserve other partitions and global clocks; source refs of retained private survive',async()=>{
 const f=await fixture();try{
  const token1=await f.unlock('p1'),token2=await f.unlock('p2');const b=f.view.pack.runtime!.fieldBindings.find(b=>b.key==='hand.scene')!;
  for(const [owner,token] of [['p1',token1],['p2',token2]])await f.call(f.prefix,'PATCH',{answers:[{field:'hand.scene',ownerId:owner,value:record(owner,b.componentIds[0],`old-${owner}`)}]},token);
  await f.call(f.prefix,'PATCH',{answers:[{field:'turn',value:'p1'}]});await f.call(f.prefix+'/commit','POST',{allowIncomplete:true});
  for(const [owner,token] of [['p1',token1],['p2',token2]])await f.call(f.prefix,'PATCH',{answers:[{field:'hand.scene',ownerId:owner,value:record(owner,b.componentIds[0],`new-${owner}`)}]},token);
  const before=(await f.store.getSession(f.view.session.id))!;const publicResume=await f.call(f.prefix+'/resume','POST',{});assert.equal(publicResume.status,200);
  const after=(await f.store.getSession(before.id))!;assert.ok(JSON.stringify(after.assertions).includes('new-p1'));assert.ok(JSON.stringify(after.assertions).includes('new-p2'));assert.equal(after.turnInstanceId,before.turnInstanceId);
  await f.call(f.prefix,'PATCH',{answers:[{field:'turn',value:'p2'}]});const clock=(await f.store.getSession(before.id))!;
  assert.equal((await f.call(f.prefix+'/resume','POST',{scope:'owner',ownerId:'p1'},token2)).status,403);
  assert.equal((await f.call(f.prefix+'/resume','POST',{scope:'owner',ownerId:'p1'},token1)).status,200);const own=(await f.store.getSession(before.id))!;
  assert.ok(JSON.stringify(own.assertions).includes('old-p1'));assert.ok(JSON.stringify(own.assertions).includes('new-p2'));assert.equal(own.assertions.find(a=>a.field==='turn')?.value,'p2');assert.equal(own.captureEpoch,clock.captureEpoch);assert.equal(own.turnInstanceId,clock.turnInstanceId);
 }finally{await f.cleanup();}
});
test('native historical metadata remains pinned and explicit native versions stay available',async()=>{
 const f=await fixture('rummikub');try{assert.equal(f.view.pack.runtime?.privatePolicy,'pin-before-content');assert.ok(f.view.session.preservations.some(p=>p.templateId==='spec.pool.preserve'));
  for(const version of ['1.0.0',rummikubPack.version]){const old=await f.call('/api/sessions','POST',{gamePackId:'rummikub',gamePackVersion:version});assert.equal(old.status,201);assert.equal(old.body.pack.runtime,undefined);assert.equal(old.body.pack.version,version);}
 }finally{await f.cleanup();}
});

test('production 120 catalog uses optional PIN metadata while a configured current record remains protected',async()=>{
 const f=await fixture('catan-base',true);try{
  const catalog=await f.call('/api/game-catalog');assert.equal(catalog.body.length,120);assert.equal(f.view.pack.runtime?.privatePolicy,'optional-pin');
  assert.equal((await f.call(f.prefix,'PATCH',{notes:{p1:'unset-owner'}})).status,200);
  await f.unlock('p1');assert.equal((await f.call(f.prefix,'PATCH',{notes:{p1:'must-not-enter'}})).status,403);
  const r=await f.call('/api/sessions','POST',{gamePackId:'rummikub'});assert.equal(r.body.pack.runtime.privatePolicy,'optional-pin');assert.notEqual(r.body.pack.version,rummikubPack.version);
 }finally{await f.cleanup();}
});
