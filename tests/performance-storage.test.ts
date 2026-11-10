import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../server/store';
import {BlobStore} from '../server/blobStore';
import {MemoryObjects} from '../server/objects';
import {catanPack} from '../gamepacks/catan';
const project=process.cwd(),bootstrap=await mkdtemp(path.join(os.tmpdir(),'kb-perf-bootstrap-'));process.chdir(bootstrap);
const {createApp}=await import('../server/index');process.chdir(project);await rm(bootstrap,{recursive:true,force:true});

for(const backend of ['local','cloud'] as const)test(`${backend}: indexed original/snapshot photos read related sessions only; list is a card summary; save/reopen remains full`,async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-perf-')),objects=new MemoryObjects();
 const store=backend==='local'?new Store(root):new BlobStore(objects);
 const app=await createApp({store,...(backend==='cloud'?{cloud:{objects,dispatch:async()=>{}}}:{})});
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+(server.address() as {port:number}).port;
 const call=async(route:string,body?:unknown)=>{const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});assert(r.ok,await r.clone().text());return r.json();};
 try{
  const created=await call('/api/sessions',{example:true,gamePackVersion:catanPack.version,recordingMode:'simple'}),id=created.session.id;
  for(let n=0;n<8;n++)await call('/api/sessions',{gamePackVersion:catanPack.version});
  const session=(await store.getSession(id))!,url=await store.saveEvidence('data:image/png;base64,cGhvdG8=');
  const photo={id:'photo',url,scope:'public' as const,kind:'photo' as const,label:'visible',captureEpoch:session.captureEpoch,capturedAt:'now'};
  session.evidence.push(photo);session.notes.public='not-a-list-field';await store.saveSession(session);
  await call('/api/sessions/'+id+'/commit',{allowIncomplete:true});
  const saved=(await store.getSession(id))!;saved.evidence=[];await store.saveSession(saved);
  assert(saved.snapshots.some(s=>s.evidence.some(e=>e.url===url)));
  let lists=0,gets=0,metadataReads=0;const list=store.listSessions.bind(store),get=store.getSession.bind(store),read=(store as any).readJSON.bind(store);
  (store as any).readJSON=async(...args:any[])=>{metadataReads++;return read(...args);};
  store.listSessions=async(...args)=>{lists++;return list(...args);};store.getSession=async(...args)=>{gets++;return get(...args);};
  const fetched=await fetch(base+url);assert.equal(fetched.status,200);assert.equal(await fetched.text(),'photo');assert.equal(fetched.headers.get('cache-control'),'no-store');
  assert.equal(lists,0);assert.equal(gets,1,'one matching session JSON, independent of unrelated boards');
  assert.equal(metadataReads,2,'one reference lookup plus one session read');
  const rows=await call('/api/sessions'),row=rows.find((s:any)=>s.id===id);
  assert.equal(row.saved,true);assert.equal(row.room,false);
  for(const k of ['assertions','snapshots','evidence','notes','activity','gamePack','players'])assert(!Object.hasOwn(row,k),k);
  const fullBytes=Buffer.byteLength(JSON.stringify(await list())),summaryBytes=Buffer.byteLength(JSON.stringify(rows));assert(summaryBytes<fullBytes/10);
  console.log(JSON.stringify({backend,photo:{sessionLists:0,sessionReads:1,metadataReads:2},list:{fullBytes,summaryBytes,rows:rows.length}}));
  const reopened=await call('/api/sessions/'+id);assert.equal(reopened.session.notes.public,'not-a-list-field');assert.deepEqual(reopened.session.snapshots,saved.snapshots);
  // A shared URL does not bypass the pre-existing restriction from another private reference.
  const other=(await list()).find(s=>s.id!==id)!;other.evidence=[{...photo,scope:'player',ownerId:other.players[0].id}];await store.saveSession(other);
  const protect=await fetch(base+'/api/sessions/'+other.id+'/privacy/'+other.players[0].id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:true,pin:'0007'})});assert.equal(protect.status,200);
  assert.equal((await fetch(base+url)).status,403);
  const latestOther=(await store.getSession(other.id))!;latestOther.evidence=[];await store.saveSession(latestOther);assert.equal((await fetch(base+url)).status,200,'stale index entry grants nothing and does not retain a removed restriction');
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}
});

test('legacy index migration is one-time; independent cloud clients merge shared-photo references and reject unreferenced files',async()=>{
 const objects=new MemoryObjects(),a=new BlobStore(objects),b=new BlobStore(objects);
 const make=(id:string)=>({id,evidence:[{url:'/uploads/shared.png'}],snapshots:[]} as any);
 await Promise.all([a.saveSession(make('one')),b.saveSession(make('two'))]);
 assert.deepEqual((await a.sessionsForUpload('shared.png')).map(s=>s.id).sort(),['one','two']);
 assert.deepEqual(await a.sessionsForUpload('../shared.png'),[]);
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-perf-legacy-'));try{
  await mkdir(path.join(root,'sessions'));await writeFile(path.join(root,'sessions/old.json'),JSON.stringify(make('old')));
  const s=new Store(root);await s.prepareUploadReferences();assert.equal((await s.sessionsForUpload('shared.png'))[0].id,'old');
  const list=(s as any).list;(s as any).list=()=>{throw Error('must not repeat full migration');};await s.prepareUploadReferences();(s as any).list=list;
  assert.deepEqual(await s.sessionsForUpload('unknown.png'),[]);
 }finally{await rm(root,{recursive:true,force:true});}
});
