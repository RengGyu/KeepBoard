import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
// Execute the actual orchestrator body with deterministic step doubles. The Vercel
// build separately checks durable compilation; these tests do not emulate replay.
async function orchestrator(steps:Record<string,unknown>){
 const source=await readFile(new URL('../workflows/analyze.ts',import.meta.url),'utf8');
 const body=source.slice(0,source.indexOf('\nasync function batchPlan'));
 const compiled=ts.transpileModule(body,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports:Record<string,any>={};
 vm.runInNewContext(compiled,{exports,require:()=>({sleep:async()=>{}}),...steps});
 return exports.analyzeWorkflow as (id:string)=>Promise<void>;
}
test('cloud scan uses two units per wave, joins all failures before release, never commits a failed wave',async()=>{
 let active=0,peak=0,commits=0,releasedAt=-1;const calls:number[]=[];
 const run=await orchestrator({batchPlan:async()=>({count:5,concurrency:2}),reserve:async()=>true,
  analyzeBatch:async(_id:string,index:number)=>{calls.push(index);active++;peak=Math.max(peak,active);try{await Promise.resolve();if(index===0)throw Error('dispatch failed');await new Promise(r=>setTimeout(r,15));}finally{active--;}},
  commit:async()=>{commits++;},interrupted:async()=>{releasedAt=active;}});
 await run('job');assert.equal(peak,2);assert.equal(releasedAt,0);assert.equal(commits,0);assert.deepEqual(calls,[0,1]);
});
test('cloud successful waves retain each pinned index exactly once and commit once after the final unit',async()=>{
 let active=0,peak=0,commits=0,reserves=0;const calls:number[]=[];
 const run=await orchestrator({batchPlan:async()=>({count:5,concurrency:2}),reserve:async()=>{reserves++;return true;},
  analyzeBatch:async(_id:string,index:number)=>{calls.push(index);active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,index%2?1:8));active--;},
  commit:async()=>{assert.equal(active,0);commits++;},interrupted:async()=>assert.fail('unexpected failure')});
 await run('job');assert.equal(peak,2);assert.equal(commits,1);assert.equal(reserves,3);assert.deepEqual(calls,[0,1,2,3,4]);
});
test('non-scan analysis keeps sequential execution',async()=>{
 let active=0,peak=0;
 const run=await orchestrator({batchPlan:async()=>({count:3,concurrency:1}),reserve:async()=>true,
  analyzeBatch:async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,1));active--;},commit:async()=>{},interrupted:async()=>assert.fail('unexpected failure')});
 await run('legacy');assert.equal(peak,1);
});
