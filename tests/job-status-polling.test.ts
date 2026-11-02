import test from 'node:test';
import assert from 'node:assert/strict';
import type {AnalysisJob} from '../shared/analysisJobs';
import {createJobStatusPolling} from '../src/jobStatusPolling';

const job=(id:string,state:AnalysisJob['state'])=>({id,state} as AnalysisJob);

function fixture(read:()=>Promise<AnalysisJob|null>){
  let now=0,next=0,hidden=false,visibility=()=>{};
  const timers=new Map<number,{at:number,run:()=>void}>();
  let completed=0,errors=0,current:AnalysisJob|null=null;
  const poller=createJobStatusPolling({
    read,onJob:value=>{current=value;},onCompleted:async()=>{completed++;},onError:()=>{errors++;},
    visible:()=>!hidden,subscribeVisibility:change=>{visibility=change;return()=>{visibility=()=>{};};},
    schedule:(run,delay)=>{const id=++next;timers.set(id,{at:now+delay,run});return id as unknown as ReturnType<typeof setTimeout>;},
    cancel:timer=>{timers.delete(timer as unknown as number);},
  });
  const flush=async()=>{for(let i=0;i<4;i++)await Promise.resolve();};
  return {poller,flush,
    async advance(ms:number){const end=now+ms;while(true){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;timers.delete(next[0]);next[1].run();await flush();}now=end;},
    hide(value:boolean){hidden=value;visibility();},
    get completed(){return completed;},get errors(){return errors;},get current(){return current;},
  };
}

test('idle, completed, and failed work each require one discovery read, then no reads for 60 seconds',async()=>{
  for(const result of [null,job('done','completed'),job('failed','failed')]){
    let reads=0;const f=fixture(async()=>{reads++;return result;});f.poller.start();await f.flush();await f.advance(60000);
    assert.equal(reads,1);assert.equal(f.completed,result?.state==='completed'?1:0);f.poller.stop();
  }
});

test('active checks back off, pause while hidden, and refresh completed board exactly once',async()=>{
  let reads=0;const f=fixture(async()=>{reads++;return job('work',reads<3?'running':'completed');});
  f.poller.start();await f.flush();assert.equal(reads,1);
  f.hide(true);await f.advance(60000);assert.equal(reads,1);
  f.hide(false);await f.flush();assert.equal(reads,2);
  await f.advance(20000);assert.equal(reads,3);assert.equal(f.completed,1);
  await f.advance(60000);assert.equal(reads,3);assert.equal(f.completed,1);f.poller.stop();
});

test('failed read stops automatic checks; explicit refresh and a new job restart checks',async()=>{
  let reads=0;const f=fixture(async()=>{reads++;if(reads===1)throw Error('offline');return reads===2?null:job('new','running');});
  f.poller.start();await f.flush();await f.advance(60000);assert.equal(reads,1);assert.equal(f.errors,1);
  f.poller.refresh();await f.flush();await f.advance(60000);assert.equal(reads,2);
  f.poller.accept(job('new','queued'));await f.advance(10000);assert.equal(reads,3);f.poller.stop();
});

test('a new job still gets checked if its timer fires during a slow discovery request',async()=>{
  let finishDiscovery:(job:AnalysisJob|null)=>void=()=>{};let reads=0;
  const f=fixture(()=>{reads++;return reads===1?new Promise(resolve=>{finishDiscovery=resolve;}):Promise.resolve(job('new','completed'));});
  f.poller.start();f.poller.accept(job('new','queued'));
  await f.advance(10000);assert.equal(reads,1);
  finishDiscovery(null);await f.flush();
  await f.advance(20000);assert.equal(reads,2);assert.equal(f.completed,1);f.poller.stop();
});

test('a stuck active job stops after ten automatic checks, including visibility resumes',async()=>{
  let reads=0;const f=fixture(async()=>{reads++;return job('stuck','running');});
  f.poller.start();await f.flush();await f.advance(600000);
  assert.equal(reads,11,'one discovery plus ten bounded status checks');assert.equal(f.errors,1);
  f.hide(true);f.hide(false);await f.advance(600000);assert.equal(reads,11,'tab changes cannot restart the exhausted budget');
  f.poller.refresh();await f.flush();assert.equal(reads,12,'explicit refresh reads status once');
  await f.advance(600000);assert.equal(reads,12,'manual refresh does not restart automatic polling');
  f.poller.accept(job('next','queued'));await f.advance(10000);assert.equal(reads,13,'a distinct new job gets its own budget');f.poller.stop();
});

test('a late completion refresh failure cannot report an error after scope disposal',async()=>{
  let rejectRefresh:(error:Error)=>void=()=>{},errors=0;
  const f=createJobStatusPolling({
    read:async()=>job('finished','completed'),onJob:()=>{},
    onCompleted:()=>new Promise<void>((_,reject)=>{rejectRefresh=reject;}),
    onError:()=>{errors++;},visible:()=>true,subscribeVisibility:()=>()=>{},
    schedule:(run,delay)=>setTimeout(run,delay),cancel:timer=>clearTimeout(timer),
  });
  f.start();await Promise.resolve();await Promise.resolve();f.stop();
  rejectRefresh(Error('late failure'));await Promise.resolve();await Promise.resolve();
  assert.equal(errors,0);
});

test('hosted scan discovers first completed unit after one second and remains bounded through its deadline',async()=>{
 let reads=0;const f=fixture(async()=>{reads++;return {...job('fast','running'),reader:{kind:'gemini-game-observation-v1'},createdAt:new Date().toISOString()} as AnalysisJob;});f.poller.start();await f.flush();await f.advance(1000);assert.equal(reads,2);await f.advance(30000);assert(reads>10);f.hide(true);const n=reads;await f.advance(60000);assert.equal(reads,n);f.poller.stop();
});

test('late progress discovery for job A is not accepted after job B was explicitly started in the same scope',async()=>{
 let resolve!:(value:AnalysisJob)=>void;let pendingProgress='';const displayed:string[]=[];
 const poller=createJobStatusPolling({read:async()=>{const job=await new Promise<AnalysisJob>(r=>{resolve=r;});pendingProgress=job.id;return job;},onJob:j=>{if(j?.id===pendingProgress)displayed.push(pendingProgress);},onCompleted:async()=>{},onError:()=>{},visible:()=>true,subscribeVisibility:()=>()=>{},schedule:(r,d)=>setTimeout(r,d),cancel:clearTimeout});
 poller.start();poller.accept(job('B','queued'));resolve(job('A','running'));for(let i=0;i<5;i++)await Promise.resolve();assert.deepEqual(displayed,[]);poller.stop();
});
