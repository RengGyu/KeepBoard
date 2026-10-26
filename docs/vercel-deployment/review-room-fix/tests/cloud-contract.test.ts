import test from 'node:test';import assert from 'node:assert/strict';
import {MemoryObjects,ConflictError,writeJSON} from '../server/objects.ts';
import {CloudUploads} from '../server/cloudUploads.ts';import {CloudJobs} from '../server/cloudJobs.ts';
import {BlobStore} from '../server/blobStore.ts';import {createApp} from '../server/index.ts';
test('upload tickets preserve original scope/owner/epoch and do not reassign bytes',async()=>{
 const o=new MemoryObjects(),u=new CloudUploads(o),meta={scope:'player',ownerId:'p1',contentType:'image/png',label:'synthetic'};
 const t=await u.mint('evidence',meta,'s','e');await o.write(t.pathname,Buffer.from('synthetic'),null,'image/png');
 assert.match(await u.evidence(t.ticket,'s','e',meta),/^\/uploads\//);
 for(const [s,e,m] of [['other','e',meta],['s','old',meta],['s','e',{...meta,ownerId:'p2'}],['s','e',{...meta,scope:'public'}]] as const)await assert.rejects(u.evidence(t.ticket,s,e,m));
 await assert.rejects(u.imported(t.ticket));
});
test('durable job requests and batch claims are shared, CAS-conflicting starts cannot both dispatch',async()=>{
 const o=new MemoryObjects();let calls=0;const a=new CloudJobs(o,async()=>{calls++;}),b=new CloudJobs(o,async()=>{calls++;});
 const input={sessionId:'s',requestId:'same',signature:'same',revision:'revision',evidenceIds:['e'],captureEpoch:'epoch'},task={} as any;
 const starts=await Promise.allSettled([a.start(input,null,task),b.start(input,null,task)]);assert.equal(starts.filter(x=>x.status==='fulfilled').length,1);assert.equal(calls,1);
 const j=(await b.list('s'))[0];assert.equal((await b.start(input,null,task)).id,j.id);assert.equal(calls,1);
 const claims=await Promise.all([a.claimBatch(j.id,0),b.claimBatch(j.id,0)]);assert.equal(claims.filter(Boolean).length,1);
 await a.finishBatch(j.id,0,claims.find(Boolean)!,{assertions:[],summary:'synthetic',warnings:[],mode:'manual'});assert.equal((await b.batchResult(j.id,0))?.state,'completed');assert.equal(await b.claimBatch(j.id,0),null);
 assert.equal(await a.slot('one'),true);assert.equal(await b.slot('two'),true);assert.equal(await a.slot('three'),false);await b.release('one');assert.equal(await a.slot('three'),true);
});
test('independent cloud API instances persist private bytes, gate PIN/epoch, and reject stale editor revision',async()=>{
 const o=new MemoryObjects(),a=await createApp({store:new BlobStore(o),cloud:{objects:o,dispatch:async()=>{}}}),b=await createApp({store:new BlobStore(o),cloud:{objects:o,dispatch:async()=>{}}});
 const servers=[a,b].map(app=>app.listen(0,'127.0.0.1'));await Promise.all(servers.map(s=>new Promise<void>(r=>s.once('listening',r))));
 const call=async(i:number,path:string,body?:unknown,method=body===undefined?'GET':'POST',headers:Record<string,string>={})=>{const r=await fetch('http://127.0.0.1:'+(servers[i].address() as any).port+path,{method,headers:{'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 try{
 const first=await call(0,'/api/sessions',{gamePackId:'splendor',players:[{id:'p1',name:'synthetic',color:'red'}]});assert.equal(first.status,201);const p='/api/sessions/'+first.body.session.id,revision=first.body.session.storageRevision;
 assert.equal((await call(1,p,{notes:{public:'newer'}},'PATCH',{'X-KeepBoard-Revision':revision})).status,200);
 assert.equal((await call(0,p,{notes:{public:'stale'}},'PATCH',{'X-KeepBoard-Revision':revision})).status,409);
 assert.equal((await call(0,p)).body.session.notes.public,'newer');
 assert.equal((await call(0,p+'/privacy/p1',{enabled:true,pin:'2468'},'PUT')).status,200);
 const meta={scope:'player',ownerId:'p1',contentType:'image/png',label:'synthetic'};
 assert.equal((await call(1,p+'/upload-ticket',meta)).status,403);
 const unlocked=await call(1,p+'/privacy/p1/unlock',{pin:'2468'}),h={'X-KeepBoard-Private-Token':unlocked.body.token};
 const ticket=await call(0,p+'/upload-ticket',meta,'POST',h);assert.equal(ticket.status,200);await o.write(ticket.body.pathname,Buffer.from('synthetic'),null,'image/png');
 const attached=await call(1,p+'/evidence',{...meta,uploadTicket:ticket.body.ticket},'POST',h);assert.equal(attached.status,200);assert.equal(attached.body.session.evidence.length,1);
 assert.equal((await call(0,p+'/evidence',{...meta,scope:'public',uploadTicket:ticket.body.ticket},'POST',h)).status,400);
 const again=await call(0,p+'/evidence',{...meta,uploadTicket:ticket.body.ticket},'POST',h);assert.equal(again.status,200);assert.equal(again.body.session.evidence.length,1);
 const photo=attached.body.session.evidence[0].url;
 const response=await fetch('http://127.0.0.1:'+(servers[1].address() as any).port+photo);assert.equal(response.status,403);
 const authorized=await fetch('http://127.0.0.1:'+(servers[0].address() as any).port+photo,{headers:h});assert.equal(authorized.status,200);assert.equal(await authorized.text(),'synthetic');
 const locked=await call(0,p+'/privacy/lock',{},'POST',h);assert.equal(locked.status,200);assert.equal((await call(1,p+'/upload-ticket',meta,'POST',h)).status,403);
 }finally{for(const s of servers){s.closeAllConnections();await new Promise<void>(r=>s.close(()=>r()));}}
});
test('same room create intent racing in two HTTP function instances returns one durable room',async()=>{
 const o=new MemoryObjects(),stores=[new BlobStore(o),new BlobStore(o)];let reads=0,release!:()=>void;const both=new Promise<void>(r=>release=r);
 for(const s of stores){const list=s.listSessions.bind(s);s.listSessions=async deleted=>{const rows=await list(deleted);if(++reads<=2){if(reads===2)release();await both;}return rows;};}
 const apps=await Promise.all(stores.map(store=>createApp({store,cloud:{objects:o,dispatch:async()=>{}}}))),servers=apps.map(a=>a.listen(0,'127.0.0.1'));await Promise.all(servers.map(s=>new Promise<void>(r=>s.once('listening',r))));
 try{const responses=await Promise.all(servers.map(async server=>{const base='http://127.0.0.1:'+(server.address() as any).port,r=await fetch(base+'/api/rooms',{method:'POST',headers:{Origin:base,Cookie:'kb_device='+'a'.repeat(64),'Content-Type':'application/json'},body:JSON.stringify({gamePackId:'splendor',capacity:2,me:{name:'synthetic',color:'#ff0000'},clientRequestId:'same-create'})});return {status:r.status,body:await r.json()};}));
 assert.deepEqual(responses.map(r=>r.status),[201,201]);assert.equal(new Set(responses.map(r=>r.body.session.id)).size,1);assert.equal((await new BlobStore(o).listSessions(true)).length,1);
 }finally{for(const s of servers){s.closeAllConnections();await new Promise<void>(r=>s.close(()=>r()));}}
});
