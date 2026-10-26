import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import type {SessionView} from '../shared/types.ts';
const project=process.cwd(),bootstrap=await mkdtemp(path.join(os.tmpdir(),'kb-visual-import-'));process.chdir(bootstrap);
for(const key of ['OPENAI_API_KEY','GEMINI_API_KEY','GOOGLE_API_KEY','DEEPSEEK_API_KEY','KEEPBOARD_AI_GATEWAY_URL','KEEPBOARD_AI_ALIAS'])delete process.env[key];
const {createApp}=await import('../server/index.ts');const {Store}=await import('../server/store.ts');process.chdir(project);await rm(bootstrap,{recursive:true,force:true});
test('six visual families save/reopen exact placements via existing API; owner PIN/physical-only boundaries unchanged',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-visual-api-'));const app=await createApp({store:new Store(root,path.join(project,'public'))});const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const port=(server.address() as {port:number}).port;
 async function call(route:string,method='GET',body?:unknown,token?:string){const r=await fetch('http://127.0.0.1:'+port+route,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{'X-KeepBoard-Private-Token':token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};}
 try{
 for(const game of ['blokus','carcassonne','wingspan','splendor','monopoly','pandemic']){
  const created=await call('/api/sessions','POST',{gamePackId:game,players:[{id:'p1',name:'합성',color:'red'},{id:'p2',name:'둘',color:'blue'}]});assert.equal(created.status,201);const view=created.body as SessionView,prefix='/api/sessions/'+view.session.id;
  const binding=view.pack.runtime!.fieldBindings.find(b=>b.editor==='component-catalog'&&b.visibility==='public'&&b.areaIds.length)!;assert(binding);
  const ownerId=binding.scope==='player'?'p1':undefined;
  const value={version:'game-component-record-v1',pieces:[{id:'same-physical-id',componentId:binding.componentIds[0]??null,variant:null,quantity:null,label:'합성 기록',anchor:'원래 메모',evidenceId:null,region:null,placement:{areaId:binding.areaIds[0],x:.9,y:.2,rotation:90}}]};
  assert.equal((await call(prefix,'PATCH',{answers:[{field:binding.key,ownerId,value}]})).status,200);
  assert.equal((await call(prefix+'/commit','POST',{allowIncomplete:true})).status,200);
  const reopened=(await call(prefix)).body as SessionView;const a=reopened.session.assertions.find(a=>a.field===binding.key&&a.ownerId===ownerId&&a.status==='accepted')!;
  assert.deepEqual(a.value,value);assert.equal(reopened.pack.runtime!.source.sha256,view.pack.runtime!.source.sha256);assert.equal(reopened.pack.version,view.pack.version);
  assert.deepEqual(reopened.session.snapshots.at(-1)!.assertions.find(a=>a.field===binding.key&&a.ownerId===ownerId)!.value,value);
  const invalid=structuredClone(value);invalid.pieces[0].placement.areaId='other';assert.equal((await call(prefix,'PATCH',{answers:[{field:binding.key,ownerId,value:invalid}]})).status,400);
  const secret=view.pack.runtime!.fieldBindings.find(b=>b.editor==='physical-only');if(secret)assert.equal((await call(prefix,'PATCH',{answers:[{field:secret.key,ownerId:secret.scope==='player'?'p1':undefined,value}]})).status,400);
  if(game==='wingspan'){
   const hand=view.pack.runtime!.fieldBindings.find(b=>b.scope==='player'&&b.visibility==='owner'&&b.editor==='component-catalog')!;
   const privateValue=structuredClone(value);privateValue.pieces[0].componentId=hand.componentIds[0];privateValue.pieces[0].label='PRIVATE-P1';privateValue.pieces[0].placement.areaId=hand.areaIds[0];
   assert.equal((await call(prefix,'PATCH',{answers:[{field:hand.key,ownerId:'p1',value:privateValue}]})).status,200);
   assert.equal((await call(prefix+'/privacy/p1','PUT',{enabled:true,pin:'0007'})).status,200);
   assert(!JSON.stringify((await call(prefix)).body).includes('PRIVATE-P1'));
   assert.equal((await call(prefix,'PATCH',{answers:[{field:hand.key,ownerId:'p1',value:privateValue}]})).status,403);
   const token=(await call(prefix+'/privacy/p2/unlock','POST',{pin:'0007'})).body.token;assert(!token);
   const unlocked=(await call(prefix+'/privacy/p1/unlock','POST',{pin:'0007'})).body.token;assert(JSON.stringify((await call(prefix,'GET',undefined,unlocked)).body).includes('PRIVATE-P1'));
  }
 }
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}
});
