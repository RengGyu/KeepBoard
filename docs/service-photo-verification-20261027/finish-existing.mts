// Finish the already completed isolated job. External requests are blocked; no model retry.
import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root='/private/tmp/keepboard-service-photo-20261027-run01';
process.env.KEEPBOARD_DATA_DIR=root;process.chdir(root);
const realFetch=fetch.bind(globalThis);let externalCalls=0;
globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{const url=input instanceof Request?input.url:String(input);if(!url.startsWith('http://127.0.0.1:')){externalCalls++;throw Error('No external calls allowed during continuation');}return realFetch(input,init);}) as typeof fetch;
const jobs=await Promise.all((await readdir(path.join(root,'analysis-jobs'))).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile(path.join(root,'analysis-jobs',f),'utf8'))));
assert.equal(jobs.length,1);assert.equal(jobs[0].state,'completed');
const {createApp}=await import('../../server/index.ts');const {Store}=await import('../../server/store.ts');
const app=await createApp({store:new Store(root),ui:false}),server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
const base='http://127.0.0.1:'+(server.address() as {port:number}).port+'/api',p='/sessions/'+jobs[0].sessionId;let revision:string|undefined;
async function call(route:string,payload?:unknown,method=payload===undefined?'GET':'POST'){const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:payload===undefined?undefined:JSON.stringify(payload)}),v=await r.json() as any;if(v.session?.storageRevision)revision=v.session.storageRevision;assert.equal(r.ok,true,route+' '+r.status);return v;}
const save=(file:string,v:unknown)=>writeFile(path.join(root,file),JSON.stringify(v,null,2)+'\n',{mode:0o600});
try{
 const listed=await call(p+'/analysis-jobs');assert.equal(listed.jobs.find((j:any)=>j.id===jobs[0].id)?.state,'completed');assert.equal(listed.jobs[0].requestId,undefined);
 const v=await call(p),candidate=v.session.assertions.find((a:any)=>a.status==='candidate'&&a.observationReceipts?.some((r:any)=>r.reader?.kind==='gemini-game-observation-v1'));assert.ok(candidate);await save('candidate-before-apply.json',candidate);
 const original=structuredClone(candidate.value);await call(p,{answers:[{field:'board.layout',value:original,observationReview:{version:'native-observation-review-v1',sourceAssertionId:candidate.id,expectedBaselineAssertionId:null}}]},'PATCH');
 await call(p+'/commit',{allowIncomplete:true});await call(p+'/resume',{scope:'public'});const reopened=await call(p);await save('reopened-session.json',reopened);
 const accepted=reopened.session.assertions.filter((a:any)=>a.status==='accepted'&&a.field==='board.layout').at(-1);assert.ok(accepted);assert.deepEqual(accepted.value.components,original.components);assert.ok(accepted.observationReceipts?.some((r:any)=>r.reader?.kind==='gemini-game-observation-v1'));assert.equal(externalCalls,0);
 const summary={providerCalls:JSON.parse(await readFile(path.join(root,'attempt-ledger.json'),'utf8')).providerCalls,jobState:jobs[0].state,jobTimings:jobs[0].timings,componentCount:original.components.length,allComponentFieldsPreserved:true,receiptAfterReopen:true,savedReopened:true,continuationExternalCalls:externalCalls,harnessIssue:'Original polling used private requestId omitted from public job API; continued completed job offline using job.id. No recognition retry.'};await save('summary.json',summary);console.log(JSON.stringify(summary));
}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
