import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/index.ts';
import { Store } from '../server/store.ts';
import { catanPack } from '../gamepacks/catan.ts';
import { normalizeObservations } from '../server/ai/index.ts';
import { observationPrompt } from '../server/ai/prompt.ts';
import { createComponent, normalizeScene, type ComponentScene } from '../shared/scene.ts';
import { linkObservedColor } from '../shared/playerColors.ts';
import type { Evidence, SessionView, Value } from '../shared/types.ts';

const empty:ComponentScene={version:2,coverage:'partial',components:[]};

test('individual/all soft deletion and undo survive reload without modifying original session, snapshots or photos',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'keepboard-soft-delete-'));
 const server=(await createApp({store:new Store(directory)})).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const address=server.address();assert(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;
 async function call(route:string,method='GET',body?:unknown){const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});assert(response.ok,await response.clone().text());return response.json();}
 try{
   const views:SessionView[]=[];for(let i=0;i<3;i++)views.push(await call('/api/sessions','POST',{name:`synthetic-${i}`,gamePackVersion:catanPack.version,example:true}));
   const ids=views.map(v=>v.session.id),route=`/api/sessions/${ids[0]}`;
   await call(route+'/evidence','POST',{dataUrl:'data:image/png;base64,aGVsbG8=',scope:'player',ownerId:'red',expectedCaptureEpoch:views[0].session.captureEpoch});
   await call(route+'/commit','POST',{allowIncomplete:true});
   const filename=path.join(directory,'sessions',ids[0]+'.json');const original=await readFile(filename,'utf8');const uploads=await readdir(path.join(directory,'uploads'));
   assert.deepEqual((await call(route,'DELETE')).ids,[ids[0]]);assert.equal((await call('/api/sessions')).length,2);
   assert.equal((await call('/api/sessions?includeDeleted=true')).find((s:any)=>s.id===ids[0]).deletedAt!==undefined,true);
   assert.equal((await call(route)).session.snapshots.length,1);
   await call('/api/sessions/archive','POST',{hidden:false,ids:[ids[0]]});assert.equal((await call('/api/sessions')).length,3);
   await call(route,'DELETE');
   const all=await call('/api/sessions/archive','POST',{hidden:true});assert.deepEqual(all.ids.sort(),ids.slice(1).sort());assert.equal((await call('/api/sessions')).length,0);
   assert.equal((await new Store(directory).listSessions(true)).length,3,'metadata persists after Store reload');
   await call('/api/sessions/archive','POST',{hidden:false,ids:all.ids});assert.equal((await call('/api/sessions')).length,2,'undo restores only the current bulk operation');
   await call('/api/sessions/archive','POST',{hidden:false,ids:[ids[0]]});assert.equal((await call('/api/sessions')).length,3);
   assert.equal(await readFile(filename,'utf8'),original,'list operations never rewrite the source session');
   assert.deepEqual(await readdir(path.join(directory,'uploads')),uploads,'no photo purge');
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(directory,{recursive:true,force:true});}
});

test('saving and reopening never rotate epoch/turn; player name/color updates retain scene links, private state and notes',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'keepboard-player-edit-'));
 const server=(await createApp({store:new Store(directory)})).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const address=server.address();assert(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;
 async function call(route:string,method='GET',body?:unknown):Promise<SessionView>{const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});assert(response.ok,await response.clone().text());return response.json();}
 try{
   let view=await call('/api/sessions','POST',{name:'synthetic color update',gamePackVersion:catanPack.version,example:true});const route=`/api/sessions/${view.session.id}`;
   const epoch=view.session.captureEpoch,turn=view.session.turnInstanceId;
   view=await call(route,'PATCH',{notes:{red:'private fixture'},answers:[{field:'player.resources.counts',ownerId:'red',value:{lumber:4,brick:0,wool:null,grain:2,ore:1}}]});
   const facts=structuredClone(view.session.assertions.filter(a=>a.basis!=='rule'));
   const players=view.session.players.map(p=>p.id==='red'?{...p,name:'민수',color:'#2578bb'}:p);
   view=await call(route,'PATCH',{players});
   assert.deepEqual(view.session.assertions.filter(a=>a.basis!=='rule'),facts);
   assert.equal(view.session.notes.red,'private fixture');assert.equal(view.pack.fields.find(f=>f.key==='currentPlayer')?.options?.find(o=>o.value==='red')?.label,'민수');
   await call(route+'/commit','POST',{allowIncomplete:true});view=await call(route);
   assert.equal(view.session.captureEpoch,epoch);assert.equal(view.session.turnInstanceId,turn);assert.deepEqual(view.session.players,players);
   assert.deepEqual(view.session.assertions.filter(a=>a.basis!=='rule'),facts);assert.deepEqual(view.session.snapshots.at(-1)?.assertions.filter(a=>a.basis!=='rule'),facts);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(directory,{recursive:true,force:true});}
});

test('observed color survives normalization without fabricating owners; prompt treats ids as opaque and keeps configured colors',()=>{
 const evidence:Evidence[]=[{id:'photo',url:'/synthetic',label:'fixture',kind:'photo',scope:'public',captureEpoch:'epoch',capturedAt:'now'}];
 const piece=createComponent(empty,'road',{id:'unknown-blue',ownerId:'invented-player',observedColor:'blue',quantity:1,location:{type:'edge',id:'r1c1.NE'},evidenceId:'photo',region:{x:.1,y:.1,width:.2,height:.2}});
 const result=normalizeObservations({assertions:[{field:'components.observed',evidenceIds:['photo'],value:{...empty,components:[piece]}}]},catanPack,evidence,'turn',['red','blue']);
 const normalized=normalizeScene(result.assertions[0].value).components[0];assert.equal(normalized.ownerId,null);assert.equal(normalized.observedColor,'blue');assert.equal(normalized.evidenceId,'photo');assert.equal(normalized.region?.x,.1);
 const prompt=observationPrompt({players:[{id:'red',name:'민수',color:'#2578bb'}],assertions:[],turnInstanceId:'turn'} as any,catanPack,evidence);
 assert.match(prompt,/#2578bb/);assert.match(prompt,/ids\/names are opaque/);assert.match(prompt,/Never force the nearest default player/);
});

test('one explicit observed-color link updates matching unknown/old owner pieces atomically and preserves unrelated owners and sources',()=>{
 const road=(id:string,ownerId:string|null,color:string)=>createComponent(empty,'road',{id,ownerId,observedColor:color,quantity:1,location:{type:'edge',id:'r1c1.NE'},evidenceId:'photo',region:{x:.1,y:.1,width:.2,height:.2}});
 const scene={...empty,components:[road('source','wrong','blue'),road('unknown',null,'blue'),road('already-other','white','blue'),road('red',null,'red'),createComponent(empty,'terrain',{id:'terrain',variant:'pasture',observedColor:'blue',quantity:1})]};const before=structuredClone(scene);
 const next=linkObservedColor(scene,'source','actual-player');
 assert.deepEqual(next.components.map(c=>c.ownerId),['actual-player','actual-player','white',null,null]);
 assert.deepEqual(next.components.map(({ownerId,...rest})=>rest),scene.components.map(({ownerId,...rest})=>rest));assert.deepEqual(scene,before);
 assert.equal((next as unknown as Value)!==null,true);
});
