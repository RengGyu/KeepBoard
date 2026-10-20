import test from 'node:test';
import assert from 'node:assert/strict';
import { createScanUploadQueue } from '../src/scanUploads.ts';
import { emptyScanSelector, reserveScanFrame, settleScanFrame, stepScanSelector, type ScanFrame } from '../src/scanQuality.ts';
import { addSavedScanEvidence, createScanBatch, finishScanBatch } from '../src/scanBatch.ts';
import { parseServerTiming, recentScanTimings, recordScanTiming } from '../src/scanTiming.ts';
import type { Evidence } from '../shared/types.ts';

const tick = async () => { for (let i=0;i<5;i++) await Promise.resolve(); };
const photo = (id:string):Evidence => ({id,url:'/synthetic',kind:'photo',scope:'player',ownerId:'red',captureEpoch:'epoch',capturedAt:'now',label:'合成'});
const frame=(index:number):ScanFrame=>({width:3,height:3,gray:new Uint8Array(9).fill(100),mean:100,contrast:30,laplacianVariance:300,darkFraction:0,brightFraction:0,fingerprint:{cells:[50,120,70,160],hash:[0,1,0,1],color:[index*40,index*40,index*40],mean:100,aspect:1}});

test('slow serial uploads do not block subsequent stable captures; ending drains exact successes and claims AI once',async()=>{
 let now=0, selector=emptyScanSelector(); const captures:number[]=[]; let lastSavedAt=0;
 const pending:{current:{at:number;resolve:()=>void}|null}={current:null};
 let batch=createScanBatch({id:'run',sessionId:'synthetic',captureEpoch:'epoch',ownerId:'red',purpose:'capture',instruction:'',aiEnabled:true});
 const queue=createScanUploadQueue<number,Evidence>(async index=>{ await new Promise<void>(resolve=>{pending.current={at:now+2000,resolve};}); return photo(`photo-${index}`); },snapshot=>{
   for(const entry of snapshot.entries)if(entry.state==='saved') {selector=settleScanFrame(selector,entry.id,true);batch=addSavedScanEvidence(batch,entry.result!);lastSavedAt=now;}
 });
 for(now=0;now<=13000;now+=250){
   if(pending.current && pending.current.at<=now){const complete=pending.current;pending.current=null;complete.resolve();await tick();}
   if(captures.length===6)continue;
   const sample=frame(captures.length);const step=stepScanSelector(selector,sample,now);selector=step.state;
   if(step.reason==='ready'){const index=captures.length;const id=queue.enqueue(index,20);selector=reserveScanFrame(selector,sample,id,now);captures.push(now);}
 }
 await queue.drain();
 assert.deepEqual(captures,[1000,3000,5000,7000,9000,11000]);
 assert.equal(lastSavedAt,13000);assert.equal(selector.accepted.length,6);assert.equal(selector.reserved?.length,0);
 assert.equal(queue.snapshot().retainedBytes,0);assert.equal(queue.snapshot().entries.length,6);assert.throws(()=>queue.enqueue(7,1),/6장/);
 const finished=finishScanBatch(batch);assert.deepEqual(finished.evidenceIds,Array.from({length:6},(_,i)=>`photo-${i}`));
 assert.deepEqual(finishScanBatch(finished.batch).evidenceIds,[]);
 // Previous serialized contract: capture 1s, each 2s upload + 3s selector wait, final upload at 28s.
 assert.equal(1000+6*2000+5*3000,28000);
});

test('queued originals reserve duplicates/budget before upload, while stability accrues during cooldown',()=>{
 const first=frame(0), next=frame(1);let selector=reserveScanFrame(emptyScanSelector(),first,'pending',1000);
 assert.equal(selector.accepted.length,0);assert.equal(stepScanSelector(selector,first,3000).reason,'duplicate');
 let step=stepScanSelector(selector,next,1250);assert.equal(step.reason,'cooldown');
 step=stepScanSelector(step.state,next,2250);assert.equal(step.reason,'cooldown');
 assert.equal(stepScanSelector(step.state,next,3000).reason,'ready');
 selector=settleScanFrame(selector,'pending',false);assert.equal(selector.reserved?.length,0);
 step=stepScanSelector(selector,first,4000);assert.equal(stepScanSelector(step.state,first,5000).reason,'ready');
 for(let i=0;i<6;i++)selector=reserveScanFrame(selector,frame(i),`p-${i}`,6000+i);
 assert.equal(stepScanSelector(selector,next,10000).reason,'budget');
 assert.throws(()=>reserveScanFrame(selector,next,'seventh',11000),/6장/);
});

test('failure retains exact original for retry, successful payloads are freed and capacity is bounded',async()=>{
 const attempts:string[]=[];let fail=true;let active=0,maxActive=0;
 const queue=createScanUploadQueue<string,string>(async payload=>{attempts.push(payload);active++;maxActive=Math.max(maxActive,active);await tick();active--;if(payload==='original-1'&&fail)throw new Error('synthetic network failure');return payload;},()=>{},60);
 queue.enqueue('original-1',30);queue.enqueue('original-2',30);
 assert.throws(()=>queue.enqueue('too-large',31),/공간/);
 await queue.drain();assert.equal(queue.snapshot().retainedBytes,30);assert.equal(queue.snapshot().entries[0].state,'failed');
 assert.equal(queue.snapshot().entries[1].state,'saved');fail=false;queue.retryFailed();await queue.drain();
 assert.deepEqual(attempts,['original-1','original-2','original-1']);assert.equal(maxActive,1);assert.equal(queue.snapshot().retainedBytes,0);
 assert.equal(queue.snapshot().entries.length,2);assert.equal(queue.snapshot().entries.filter(e=>e.state==='saved').length,2);
});

test('drain waits for in-flight upload; stop cancels queued work and lets sent save settle once',async()=>{
 let resolve!:()=>void;const calls:number[]=[];
 const queue=createScanUploadQueue<number,number>(async value=>{calls.push(value);await new Promise<void>(done=>{resolve=done;});return value;});
 queue.enqueue(1,10);queue.enqueue(2,10);let drained=false;const done=queue.drain().then(()=>{drained=true;});
 await tick();assert.equal(drained,false);queue.stop();assert.equal(queue.snapshot().entries[1].state,'failed');
 resolve();await done;assert.equal(drained,true);assert.deepEqual(calls,[1]);assert.equal(queue.snapshot().entries[0].state,'saved');
 assert.throws(()=>queue.enqueue(3,10),/종료/);queue.retryFailed();assert.deepEqual(calls,[1]);
});

test('failed originals require explicit discard; removing failed reservation never deletes saved results',async()=>{
 const queue=createScanUploadQueue<number,number>(async value=>{if(value===2)throw new Error('failed');return value;});
 const saved=queue.enqueue(1,10),failed=queue.enqueue(2,10);await queue.drain();
 assert.equal(queue.snapshot().entries.length,2);assert.equal(queue.snapshot().retainedBytes,10);
 assert.deepEqual(queue.discardFailed(),[failed]);assert.equal(queue.snapshot().entries[0].id,saved);assert.equal(queue.snapshot().retainedBytes,0);
});

test('timing diagnostics contain bounded numeric stages, never arbitrary server header text',()=>{
 assert.deepEqual(parseServerTiming('queue;dur=1.5, provider;dur=234, session-name;dur=9, save;dur=NaN'),{queue:1.5,provider:234});
 for(let i=0;i<40;i++)recordScanTiming({stage:'photo-upload',ms:i,photos:1,bytes:20});
 assert.equal(recentScanTimings().length,30);assert.equal(recentScanTimings().at(-1)?.ms,39);
});
