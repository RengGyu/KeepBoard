// Authorized twenty exact requests. No retries, fallback, operational store, or key persistence.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {TerraGameReader,extractOpenAIKey} from '../../server/ai/terraGameReader';import {analyzeScanUnit} from '../../server/scanObservation';
const out='docs/terra-ten-game-evaluation-20261030',sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const pre=JSON.parse(await fs.readFile(out+'/preflight.json','utf8'));
assert.equal(pre.calls.length,20);assert.equal(pre.maxCalls,20);assert.equal(pre.peak,2);assert.equal(pre.retries,0);
assert.equal(sha(await fs.readFile(out+'/selection.json')),pre.selectionSHA);assert.equal(sha(await fs.readFile(out+'/evaluation-preflight.json')),pre.referencePreflightSHA);
for(const f of pre.sourceFiles)assert.equal(sha(await fs.readFile(f.path)),f.sha256,'product source drift: '+f.path);
for(const c of pre.calls){assert.equal(sha(await fs.readFile(c.inputPath)),c.inputSHA);assert.equal(sha(await fs.readFile(c.taskPath)),c.taskSHA);assert.equal(sha(await fs.readFile(c.referencePath)),c.referenceSHA);assert.equal(sha(JSON.stringify(JSON.parse(await fs.readFile(c.requestPath,'utf8')))),c.bodySHA);}
const key=extractOpenAIKey(await fs.readFile('/Users/jeonggyuju/.paseo/uploads/upload_47060b91-43e5-46ca-b987-583d0c19327e/KeepBoard_OpenAI_API','utf8'));
await fs.writeFile(path.join(pre.privateDir,'run.claim'),JSON.stringify({at:new Date().toISOString(),preflightSHA:sha(await fs.readFile(out+'/preflight.json')),max:20}),{flag:'wx',mode:0o600});
let active=0,peak=0,calls=0,halt=false,next=0;const ledger:any[]=[],results:any[]=[];let writes=Promise.resolve();
const persist=()=>{const snapshot=JSON.stringify({calls,peak,retries:0,halt,rows:ledger,results},null,2)+'\n';writes=writes.then(()=>fs.writeFile(out+'/ledger.json',snapshot));return writes;};
const reader=new TerraGameReader({key:async()=>key,fetch:async(url,init)=>{
 const body=String(init!.body),bodySHA=sha(body),c=pre.calls.find((c:any)=>c.bodySHA===bodySHA);
 if(!c||String(url)!=='https://api.openai.com/v1/responses'||calls>=20||halt)throw Error('Request outside frozen approval or halted');
 await fs.writeFile(path.join(pre.privateDir,c.id+'.claim'),bodySHA,{flag:'wx',mode:0o600});calls++;active++;peak=Math.max(peak,active);assert(active<=2);
 const row:any={id:c.id,gameId:c.gameId,variant:c.variant,bodySHA,startedAt:new Date().toISOString()},start=performance.now();ledger.push(row);await persist();
 try{
  const response=await fetch(url,init);row.httpStatus=response.status;row.headersMs=performance.now()-start;
  if([401,403,429].includes(response.status))halt=true;
  const text=await response.clone().text(),file=path.join(pre.privateDir,c.id+'.provider-body.txt');await fs.writeFile(file,text,{mode:0o600});row.responseBytesSHA=sha(text);row.providerMs=performance.now()-start;
  if(response.ok){const native=JSON.parse(text),nativeFile=path.join(pre.privateDir,c.id+'.native.json');await fs.writeFile(nativeFile,JSON.stringify(native,null,2)+'\n',{mode:0o600});row.nativeSHA=sha(await fs.readFile(nativeFile));row.model=native.model;row.status=native.status;row.usage=native.usage??null;}
  return response;
 }catch{row.transportFailure=true;throw Error('Request failed; automatic retry forbidden');}
 finally{active--;row.finishedAt=new Date().toISOString();await persist();}
}});
const startedAt=new Date().toISOString(),start=performance.now();
// Two workers consume a fixed list; no nested analyzeScan fan-out.
await Promise.all(Array.from({length:2},async()=>{
 while(next<pre.calls.length&&!halt){const c=pre.calls[next++],task=JSON.parse(await fs.readFile(c.taskPath,'utf8')),unitStart=performance.now();
  const result=await analyzeScanUnit({...task,index:c.unitIndex,reader,readImage:async(e:any)=>{const input=pre.calls.find((r:any)=>r.gameId===c.gameId&&task.evidence[r.unitIndex].id===e.id);assert(input);return {data:await fs.readFile(input.inputPath),mimeType:input.mimeType};}});
  const file=path.join(pre.privateDir,c.id+'.result.json');await fs.writeFile(file,JSON.stringify(result,null,2)+'\n',{mode:0o600});
  const item={id:c.id,state:result.scanBundle?.units[0]?.state??'unknown',observationCount:result.observationReceipts?.[0]?.result.observations.length??0,totalUnitMs:performance.now()-unitStart,resultSHA:sha(await fs.readFile(file))};results.push(item);await persist();console.log(JSON.stringify(item));
 }
}));
const skipped=pre.calls.filter((c:any)=>!ledger.some(r=>r.id===c.id)).map((c:any)=>c.id),sourceDrift=[];
for(const f of pre.sourceFiles)if(sha(await fs.readFile(f.path))!==f.sha256)sourceDrift.push(f.path);
const report={startedAt,finishedAt:new Date().toISOString(),calls,peak,retries:0,wallMs:performance.now()-start,halt,skipped,rows:ledger,results,sourceDrift,providerCallsBudget:20,productWrites:0,credentialsPersisted:false};
await writes;await fs.writeFile(out+'/execution.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({completed:true,calls,peak,halt,skipped:skipped.length,sourceDrift}));
