import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server/index';
import {Store} from '../server/store';
import {MemoryObjects} from '../server/objects';
import {LunaGameReader,TERRA_HIGH_IDENTITY} from '../server/ai/terraGameReader';
import {photoDefinition} from '../server/photoDefinitions';
import {catalogPacks} from '../gamepacks/catalog';
import {releaseTierFor} from '../shared/releaseSupport';
const gameIds=['catan-base','rummikub','sagrada','hanabi'];
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=';
async function fixture({flag='1',production=false,cloud=false}:{flag?:string|null;production?:boolean;cloud?:boolean}={}){
 const old={KEEPBOARD_TEST_MODE:process.env.KEEPBOARD_TEST_MODE,NODE_ENV:process.env.NODE_ENV};
 if(flag===null)delete process.env.KEEPBOARD_TEST_MODE;else process.env.KEEPBOARD_TEST_MODE=flag;
 process.env.NODE_ENV=production?'production':'development';
 const root=await mkdtemp(path.join(tmpdir(),'kb-test-reading-'));let calls=0,legacyCalls=0,keyReads=0,dispatches=0;
 const reader=new LunaGameReader({identity:TERRA_HIGH_IDENTITY,key:async()=>{keyReads++;return 'synthetic-not-a-key';},fetch:async(url,init)=>{
  calls++;assert.equal(String(url),'https://api.openai.com/v1/responses');const body=JSON.parse(String(init!.body)),prompt=body.input[0].content[0].text;
  assert.equal(body.model,'gpt-6.1-terra');assert.equal(body.reasoning.effort,'high');assert.equal(body.max_output_tokens,32768);assert.equal(body.input[0].content[1].detail,'high');
  let payload:unknown;
  if(prompt.includes('COMPONENT SCENE OUTPUT')){const evidenceId=body.text.format.schema.properties.assertions.items.properties.evidenceIds.items.enum[0];payload={assertions:[{field:'components.observed',evidenceIds:[evidenceId],value:{version:2,coverage:'partial',components:[{id:'terrain',kind:'terrain',variant:'forest',face:'front',quantity:1,location:{type:'hex',id:'r1c1'},region:{x:.1,y:.1,width:.2,height:.2},evidenceId}]}}],warnings:[]};}
  else{
   const match=prompt.match(/The allowed physical kinds and their own visible properties are (.+)\. Use each component's name/);assert(match);
   const kinds=JSON.parse(match[1]),id=prompt.includes('rummikub')?'numbers':prompt.includes('sagrada')?'dice':'cards',kind=kinds.find((k:any)=>k.id===id);assert(kind);
   const values:Record<string,string|number>=id==='numbers'?{color:'blue',number:7}:id==='dice'?{dieColor:'red',dieValue:5}:{suit:'red',number:2};
   const a=Object.entries(values).map(([id,value])=>{const p=kind.properties.find((p:any)=>p.id===id);assert(p);return {p:p.p,v:JSON.stringify(value)};});
   payload={v:3,items:[{k:kind.k,b:[100,100,300,300],f:'f',q:1,u:'s',a,x:[]}]};
  }
  return Response.json({model:'gpt-6.1-terra',status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text:JSON.stringify(payload)}]}],usage:{input_tokens:1,output_tokens:1,total_tokens:2}});
 }});
 const store=new Store(root),app=await createApp({store,terraHighReader:reader,analyzer:async()=>{legacyCalls++;return {mode:'live',summary:'synthetic analyzer',warnings:[],assertions:[]};},...(cloud?{cloud:{objects:new MemoryObjects(),dispatch:async()=>{dispatches++;}}}:{})}),server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+(server.address() as any).port;
 const call=async(route:string,body?:unknown,method=body?'POST':'GET')=>{const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 const create=async(gameId='catan-base')=>{const v=(await call('/sessions',{gamePackId:gameId,recordingMode:'simple'})).body,p='/sessions/'+v.session.id,e=await call(p+'/evidence',{scope:'public',dataUrl:image});assert.equal(e.status,200);const d=photoDefinition(catalogPacks.find(p=>p.id===gameId)!);return {p,v,e:e.body,d};};
 const wait=async(p:string,id:string)=>{for(let i=0;i<150;i++){const job=(await call(p+'/analysis-jobs')).body.jobs.find((j:any)=>j.id===id);if(!['queued','running'].includes(job.state)){const persisted=await call(p+'/analysis-jobs/'+id+'/progress?thin=1');if(persisted.body.job?.state===job.state)return job;}await new Promise(r=>setTimeout(r,5));}throw Error('mock completion deadline');};
 return {call,create,wait,store,get calls(){return calls;},get legacyCalls(){return legacyCalls;},get keyReads(){return keyReads;},get dispatches(){return dispatches;},close:async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));for(const k of ['KEEPBOARD_TEST_MODE','NODE_ENV'] as const)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];await rm(root,{recursive:true,force:true});}};
}
test('old development capability is removed; current pinned product capability is available',async()=>{
 const f=await fixture();try{const r=await f.call('/test-only/photo-reading');assert.equal(r.status,404);const catalog=(await f.call('/game-catalog')).body;for(const id of gameIds)assert.equal(catalog.find((p:any)=>p.id===id).releaseTier,'drawing');assert.equal(f.keyReads,0);}finally{await f.close();}
});
test('all4 real reader HTTP paths run upload→job→decoded observation→correction→save/reopen with immutable receipts',async()=>{
 const f=await fixture();try{for(const [index,id]of gameIds.entries()){
  const {p,e,d}=await f.create(id),areaId=id==='catan-base'?'board':id==='rummikub'?'table':id==='sagrada'?'draft':'fireworks';
  const body={requestId:'test-mode-once',evidenceIds:[e.createdEvidenceId],expectedCaptureEpoch:e.session.captureEpoch,reader:{kind:TERRA_HIGH_IDENTITY.kind,definitionSHA:d.definitionSHA,areaId}};
  const start=await f.call(p+'/analysis-jobs',body);assert.equal(start.status,202,JSON.stringify(start.body));const job=await f.wait(p,start.body.job.id);assert.equal(job.state,'completed',JSON.stringify(job));
  assert.equal((await f.call(p+'/analysis-jobs',body)).body.job.id,job.id);assert.equal(f.calls,index+1);
  const view=(await f.call(p)).body;assert.equal(releaseTierFor(view.pack),'drawing');assert.equal(releaseTierFor(view.session.gamePack),'drawing');
  const a=view.session.assertions.find((a:any)=>a.status==='accepted'&&a.observationReceipts?.length);assert(a,id);const receipts=structuredClone(a.observationReceipts),value=structuredClone(a.value);
  if(id==='catan-base'){assert.equal(value.components[0].variant,'forest');value.components[0].variant='pasture';}
  else if(id==='rummikub'){assert.equal(value.loose[0].number,7);value.loose[0].number=9;}
  else if(id==='sagrada'){assert.equal(value.pieces[0].readout.values.dieValue,5);value.pieces[0].readout.values.dieValue=6;}
  else{assert.equal(value.pieces[0].readout.values.number,2);value.pieces[0].readout.values.number=3;}
  assert.equal((await f.call(p,{answers:[{field:a.field,value}]},'PATCH')).status,200);assert.equal((await f.call(p+'/commit',{})).status,200);assert.equal((await f.call(p+'/resume',{scope:'public'})).status,200);
  const reopened=(await f.call(p)).body.session,record=reopened.assertions.find((x:any)=>x.status==='accepted'&&x.field===a.field);assert.deepEqual(record.value,value);assert.deepEqual(record.observationReceipts,receipts);assert(reopened.evidence.some((x:any)=>x.id===e.createdEvidenceId));assert.equal(releaseTierFor(reopened.gamePack),'drawing');
 }assert.equal(f.calls,4);assert.equal(f.legacyCalls,0);}finally{await f.close();}
});
test('product reading is independent of dev flags in local, production and cloud while the old endpoint stays absent',async()=>{
 for(const options of [{flag:null},{flag:'0'},{flag:'true'},{production:true},{cloud:true}]){const f=await fixture(options);try{
  assert.equal((await f.call('/test-only/photo-reading')).status,404);const {p,e}=await f.create();const body={requestId:'product',evidenceIds:[e.createdEvidenceId],expectedCaptureEpoch:e.session.captureEpoch};
  const submitted=await f.call(p+'/analysis-jobs',body);assert.equal(submitted.status,202);if(options.cloud){assert.equal(f.dispatches,1);}else assert.equal((await f.wait(p,submitted.body.job.id)).state,'completed');assert.equal(f.calls,0);assert.equal(f.keyReads,0);
 }finally{await f.close();}}
});
test('public product admission is not a four-game allowlist; legacy analyze stays available for a compatible pinned pack',async()=>{
 const f=await fixture();try{
  const other=await f.create('splendor');assert.equal((await f.call(other.p+'/analyze',{evidenceIds:[other.e.createdEvidenceId]})).status,200);assert.equal(f.legacyCalls,1);assert.equal(f.calls,0);
 }finally{await f.close();}
});
test('product admission retains exact epoch/definition/scope and PIN checks before any reader call',async()=>{
 const f=await fixture();try{
  const {p,e,d,v}=await f.create('rummikub'),body={requestId:'bad-epoch',evidenceIds:[e.createdEvidenceId],expectedCaptureEpoch:'other',reader:{kind:TERRA_HIGH_IDENTITY.kind,definitionSHA:d.definitionSHA,areaId:'table'}};
  assert.equal((await f.call(p+'/analysis-jobs',body)).status,409);
  assert.equal((await f.call(p+'/analysis-jobs',{...body,requestId:'bad-definition',expectedCaptureEpoch:e.session.captureEpoch,reader:{...body.reader,definitionSHA:'f'.repeat(64)}})).status,400);
  assert.equal((await f.call(p+'/analysis-jobs',{...body,requestId:'private-public',expectedCaptureEpoch:e.session.captureEpoch,reader:{...body.reader,areaId:'rack'}})).status,400);
  const owner=v.session.players[0].id,privatePhoto=await f.call(p+'/evidence',{scope:'player',ownerId:owner,dataUrl:image});assert.equal(privatePhoto.status,200);
  assert.equal((await f.call(p+'/privacy/'+owner,{enabled:true,pin:'1234'},'PUT')).status,200);
  assert.equal((await f.call(p+'/analysis-jobs',{...body,requestId:'locked',expectedCaptureEpoch:e.session.captureEpoch,ownerId:owner,evidenceIds:[privatePhoto.body.createdEvidenceId],reader:{...body.reader,areaId:'rack'}})).status,403);assert.equal(f.keyReads,0);assert.equal(f.calls,0);
 }finally{await f.close();}
});
