import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {MemoryObjects,ConflictError,writeJSON} from '../server/objects.ts';
import {BlobStore} from '../server/blobStore.ts';
import {PrivatePins} from '../server/privatePin.ts';
import {CloudJobs} from '../server/cloudJobs.ts';
test('independent stores reject stale CAS and preserve existing sessions/zero/null',async()=>{
 const objects=new MemoryObjects(),a=new BlobStore(objects),b=new BlobStore(objects);
 const s:any={id:'synthetic',updatedAt:'',createdAt:'',snapshots:[],assertions:[],evidence:[],players:[],notes:{}};
 await a.saveSession(s);const left=await a.getSession(s.id),right=await b.getSession(s.id);left!.notes.public='left';right!.notes.public='right';
 await a.saveSession(left!);await assert.rejects(b.saveSession(right!),ConflictError);assert.equal((await b.getSession(s.id))!.notes.public,'left');
 const fresh=await b.getSession(s.id);(fresh as any).check={zero:0,unknown:null};await b.saveSession(fresh!);assert.deepEqual((await a.getSession(s.id) as any).check,{zero:0,unknown:null});
});
test('new function instances share PIN lock/unlock and byte-exact private uploads',async()=>{
 const o=new MemoryObjects(),a=new BlobStore(o),b=new BlobStore(o),pa=new PrivatePins(a.root,o),pb=new PrivatePins(b.root,o);
 await pa.configure('s','p',{enabled:true,pin:'2468'},'synthetic');const token=await pa.unlock('s','p','2468','synthetic');
 await pb.require('s','p',token);await pb.lock(token);await assert.rejects(pa.require('s','p',token));
 const url=await a.saveEvidence('data:image/png;base64,aGVsbG8=');assert.equal((await b.readEvidence({url} as any)).data.toString(),'hello');
});
test('cloud jobs retain old observation receipts across listing and the next start, while pruning ordinary history',async()=>{
 const objects=new MemoryObjects(),jobs=new CloudJobs(objects,async()=>{}),sessionId='synthetic',ownerId='owner';
 const key=`jobs/index/${sessionId}/${createHash('sha256').update(ownerId).digest('hex')}.json`;
 const old=new Date(Date.now()-86400001).toISOString();
 const stored=(id:string,receipt:boolean)=>({id,sessionId,ownerId,requestId:id,signature:id,evidenceIds:['e'],captureEpoch:'epoch',state:'completed' as const,createdAt:old,updatedAt:old,candidateCount:0,...(receipt?{observationReceipts:[{synthetic:true}]}:{})});
 await writeJSON(objects,key,[stored('with-receipt',true),stored('ordinary',false)],null);
 assert.deepEqual((await jobs.list(sessionId,ownerId)).map(j=>j.id),['with-receipt']);
 assert.deepEqual(await jobs.list(sessionId),[]);
 const input={sessionId,ownerId,requestId:'new',signature:'new',evidenceIds:['e'],captureEpoch:'epoch'};
 const next=await jobs.start(input,null,{} as any);assert.equal((await jobs.start(input,null,{} as any)).id,next.id);
 assert.deepEqual((await jobs.list(sessionId,ownerId)).map(j=>j.id),[next.id,'with-receipt']);
});
