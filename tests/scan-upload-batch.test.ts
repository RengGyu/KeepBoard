import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {ScanUploadBatches} from '../server/scanUploadBatch';import {MemoryObjects} from '../server/objects';
test('server batch pins IDs and parent relationships, repeat returns same ticket, parent-closed subset only',async()=>{
 const root=await mkdtemp('/private/tmp/kb-upload-batch-');try{const batches=new ScanUploadBatches(root,new MemoryObjects()),items=[{clientPhotoId:'a',scope:'public',contentType:'image/png'},{clientPhotoId:'b',scope:'public',contentType:'image/png',parentClientId:'a',sourceRegion:{x:.1,y:.1,width:.2,height:.2}}];
 const manifest=await batches.mint('s','epoch','run',items),again=await batches.mint('s','epoch','run',items);assert.deepEqual(again,manifest);assert.notEqual(manifest.items[0].evidenceId,manifest.items[1].evidenceId);assert.equal(manifest.items[1].meta.sourceEvidenceId,manifest.items[0].evidenceId);
 assert.deepEqual(batches.closed(manifest,['b']).map(i=>i.clientPhotoId),[]);assert.deepEqual(batches.closed(manifest,['b','a']).map(i=>i.clientPhotoId),['a','b']);
 await assert.rejects(()=>batches.mint('s','epoch','run',[{...items[0],scope:'player'}]),/changed|바뀌/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('independent signed ticket requests overlap after parent IDs are frozen',async t=>{
 const {CloudUploads}=await import('../server/cloudUploads');let active=0,peak=0;
 t.mock.method(CloudUploads.prototype,'mint',async()=>{peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,3));active--;return {ticket:'synthetic'};});
 const batches=new ScanUploadBatches('/private/tmp/unused',new MemoryObjects());await batches.mint('s','e','run',Array.from({length:6},(_,i)=>({clientPhotoId:'p'+i,scope:'public',contentType:'image/png'})));assert.equal(peak,6);
});
