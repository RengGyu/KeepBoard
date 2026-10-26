import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import type {GamePack,SessionView} from '../shared/types.ts';
const project=process.cwd(),bootstrap=await mkdtemp(path.join(os.tmpdir(),'kb-optional-bootstrap-'));
process.chdir(bootstrap);
const {createApp}=await import('../server/index.ts');const {Store}=await import('../server/store.ts');
process.chdir(project);await rm(bootstrap,{recursive:true,force:true});
const oldPacks:GamePack[]=JSON.parse(await readFile(new URL('../docs/game-essentials/runtime/fixture-packs.json',import.meta.url),'utf8'));
async function fixture(game='rummikub',historical=false){
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-optional-pin-')),store=new Store(root,path.join(project,'public'));
 const server=(await createApp({store,...(historical?{runtimePacks:oldPacks}:{})})).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const address=server.address();assert(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;
 async function call(route:string,method='GET',body?:unknown,token?:string){const r=await fetch(base+route,{method,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{'X-KeepBoard-Private-Token':token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
 const created=await call('/api/sessions','POST',{gamePackId:game,players:[{id:'p1',name:'One',color:'red'},{id:'p2',name:'Two',color:'blue'}]});assert.equal(created.status,201);const view=created.body as SessionView,prefix='/api/sessions/'+view.session.id;
 async function protect(owner='p1'){assert.equal((await call(`${prefix}/privacy/${owner}`,'PUT',{enabled:true,pin:'0042'})).status,200);return (await call(`${prefix}/privacy/${owner}/unlock`,'POST',{pin:'0042'})).body.token as string;}
 return {root,store,view,prefix,call,protect,photo:async(url:string,token?:string)=>(await fetch(base+url,{headers:token?{'X-KeepBoard-Private-Token':token}:{}})).status,cleanup:async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}};
}
const scene=(color:string|null='blue')=>({version:'rummikub-classic-v1',ownerId:'p1',coverage:'partial',groups:[{id:'rack',label:'first',tiles:[{id:'t1',kind:'number',color,number:7,face:'front',representedColor:null,representedNumber:null,evidenceIds:[],region:null,note:''}]}],loose:[]});

test('new and historically pinned unset owners can immediately write, scan, read, export/import without replacing packs',async()=>{
 for(const historical of [false,true]){const f=await fixture('rummikub',historical);try{
  assert.equal(f.view.pack.runtime?.privatePolicy,historical?'pin-before-content':'optional-pin');
  assert.deepEqual(f.view.privacy?.protectedOwnerIds,[]);assert.deepEqual(f.view.privacy?.setupRequiredOwnerIds,[]);
  const pinned=structuredClone(f.view.session.gamePack);
  assert.equal((await f.call(f.prefix,'PATCH',{answers:[{field:'rack.scene',ownerId:'p1',value:scene()}],notes:{p1:'unset owner note'}})).status,200);
  const photo=await f.call(f.prefix+'/evidence','POST',{scope:'player',ownerId:'p1',dataUrl:'data:image/png;base64,aGVsbG8='});assert.equal(photo.status,200);
  assert.equal(await f.photo(photo.body.session.evidence[0].url),200);
  assert.equal((await f.call(f.prefix+'/commit','POST',{allowIncomplete:true})).status,200);
  const exported=await f.call(f.prefix+'/export');assert.equal(exported.status,200);
  const imported=await f.call('/api/sessions/import','POST',exported.body);assert.equal(imported.status,201);assert.deepEqual(imported.body.privacy.protectedOwnerIds,[]);
  assert.deepEqual(imported.body.session.assertions.find((a:any)=>a.field==='rack.scene').value,scene());
  assert.deepEqual((await f.call(f.prefix)).body.session.gamePack,pinned);
 }finally{await f.cleanup();}}
});

test('setting PIN on the same record protects existing contents, photos, snapshots, AI and writes until explicit verified disable',async()=>{
 const f=await fixture('rummikub',true);try{
  assert.equal((await f.call(f.prefix,'PATCH',{answers:[{field:'rack.scene',ownerId:'p1',value:scene()}],notes:{p1:'protected-mark'}})).status,200);
  const uploaded=await f.call(f.prefix+'/evidence','POST',{scope:'player',ownerId:'p1',dataUrl:'data:image/png;base64,aGVsbG8='});assert.equal(uploaded.status,200);const e=uploaded.body.session.evidence[0];
  await f.call(f.prefix+'/commit','POST',{allowIncomplete:true});assert.equal((await f.call(f.prefix+'/export')).status,200);
  const token=await f.protect(),pinBytes=await readFile(path.join(f.root,'private-pins.json'),'utf8');
  for(const route of [f.prefix,'/api/sessions'])assert(!JSON.stringify((await f.call(route)).body).includes('protected-mark'));
  assert.equal((await f.call(f.prefix+'/export')).status,403);assert.equal(await f.photo(e.url),403);assert.equal(await f.photo(e.url,token),200);
  assert.equal((await f.call(f.prefix,'PATCH',{notes:{p1:'overwrite'}})).status,403);
  assert.equal((await f.call(f.prefix+'/analyze','POST',{evidenceIds:[e.id]})).status,403);
  assert.equal((await f.call(f.prefix+'/analyze','POST',{evidenceIds:[]},token)).status,400,'empty selection stops before any provider call');
  const token2=await f.protect('p2');assert.equal((await f.call(f.prefix,'PATCH',{notes:{p1:'wrong-owner'}},token2)).status,403);
  assert.equal((await f.call(f.prefix+'/resume','POST',{scope:'owner',ownerId:'p1'},token2)).status,403);
  assert.equal((await f.call(f.prefix+'/resume','POST',{scope:'owner',ownerId:'p1'},token)).status,200);
  assert.equal((await f.call(f.prefix,'PATCH',{notes:{p1:'updated'}},token)).status,200);
  const pinsNow=JSON.parse(await readFile(path.join(f.root,'private-pins.json'),'utf8'));assert.deepEqual(pinsNow[f.view.session.id].p1,JSON.parse(pinBytes)[f.view.session.id].p1);
  assert.equal((await f.call(f.prefix+'/privacy/p1','PUT',{enabled:false,currentPin:'9999'},token)).status,403);
  assert.equal((await f.call(f.prefix+'/privacy/p1','PUT',{enabled:false,currentPin:'0042'},token)).status,200);
  assert.equal((await f.call(f.prefix,'PATCH',{notes:{p1:'optional again'}})).status,200);
  assert.equal((await f.call(f.prefix)).body.privacy.protectedOwnerIds.includes('p1'),false);
  assert.equal(await f.photo(e.url),200);
 }finally{await f.cleanup();}
});

test('unsupported secret capture/import remains blocked with or without a PIN',async()=>{
 for(const [game,field] of [['hanabi','hand.scene'],['codenames','key-map']]){const f=await fixture(game);try{
  for(const configured of [false,true]){const token=configured?await f.protect():undefined;
   assert.equal((await f.call(f.prefix,'PATCH',{answers:[{field,ownerId:game==='hanabi'?'p1':undefined,value:'secret'}]},token)).status,400);
   assert.equal((await f.call(f.prefix+'/evidence','POST',{scope:'player',ownerId:'p1',dataUrl:'data:image/png;base64,aGVsbG8='},token)).status,403);
  }
  const imported=structuredClone(f.view.session);imported.assertions.push({id:'unsafe',field,value:'secret',ownerId:'p1',basis:'user',status:'accepted',evidenceIds:[],updatedAt:'now'});
  assert.equal((await f.call('/api/sessions/import','POST',{format:'keepboard/v1',session:imported,evidenceData:{}})).status,400);
  const withPhoto=structuredClone(f.view.session);withPhoto.evidence.push({id:'secret-photo',scope:'player',ownerId:'p1',kind:'photo',url:'/uploads/synthetic.png',capturedAt:'now',captureEpoch:withPhoto.captureEpoch,label:''});
  assert.equal((await f.call('/api/sessions/import','POST',{format:'keepboard/v1',session:withPhoto,evidenceData:{'secret-photo':'data:image/png;base64,aGVsbG8='}})).status,400);
 }finally{await f.cleanup();}}
});

test('legacy green accepted/candidate/snapshot survive unrelated writes while fresh or changed green is rejected',async()=>{
 const f=await fixture();try{
  const saved=(await f.store.getSession(f.view.session.id))!;const legacy=scene('green');legacy.groups[0].tiles[0].representedColor='green' as any;
  saved.assertions=[{id:'old',field:'rack.scene',ownerId:'p1',value:legacy as any,basis:'user',status:'accepted',evidenceIds:[],updatedAt:'now',turnInstanceId:saved.turnInstanceId}];
  saved.snapshots=[{id:'old-save',createdAt:'now',gamePackVersion:saved.gamePackVersion,turnInstanceId:saved.turnInstanceId,captureEpoch:saved.captureEpoch,assertions:structuredClone(saved.assertions),evidence:[],notes:{},preservations:[]}];
  await f.store.saveSession(saved);const beforeSnapshot=structuredClone(saved.snapshots);
  const moved=structuredClone(legacy);moved.groups[0].label='moved';moved.groups[0].tiles[0].note='same face';
  assert.equal((await f.call(f.prefix,'PATCH',{answers:[{field:'rack.scene',ownerId:'p1',value:moved}]})).status,200);
  const bad=scene('green');bad.groups[0].tiles[0].id='new';assert.equal((await f.call(f.prefix,'PATCH',{answers:[{field:'rack.scene',ownerId:'p1',value:bad}]})).status,400);
  const changed=scene('blue');assert.equal((await f.call(f.prefix,'PATCH',{answers:[{field:'rack.scene',ownerId:'p1',value:changed}]})).status,200);
  assert.equal((await f.call(f.prefix,'PATCH',{answers:[{field:'rack.scene',ownerId:'p1',value:scene('green')}]})).status,400);
  const stored=(await f.store.getSession(saved.id))!;assert.deepEqual(stored.snapshots,beforeSnapshot);
  assert.equal((await f.call(f.prefix+'/resume','POST',{scope:'owner',ownerId:'p1'})).status,200);
  assert.equal((await f.store.getSession(saved.id))!.assertions.find(a=>a.field==='rack.scene')!.value&&((await f.store.getSession(saved.id))!.assertions.find(a=>a.field==='rack.scene')!.value as any).groups[0].tiles[0].color,'green');
  // Historical candidate remains valid source material for an explicit user confirmation.
  const candidate=(await f.store.getSession(saved.id))!;candidate.assertions= candidate.assertions.map(a=>({...a,id:'candidate',status:'candidate'}));await f.store.saveSession(candidate);
  assert.equal((await f.call(f.prefix,'PATCH',{answers:[{field:'rack.scene',ownerId:'p1',value:legacy}]})).status,200);
 }finally{await f.cleanup();}
});
