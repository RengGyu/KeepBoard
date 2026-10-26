import test from 'node:test';import assert from 'node:assert/strict';
import {MemoryObjects,ConflictError} from '../server/objects.ts';
import {BlobStore} from '../server/blobStore.ts';
import {PrivatePins} from '../server/privatePin.ts';
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
