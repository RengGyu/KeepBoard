// Supervisor-authorized transport-only recovery, separate from immutable failed attempt ledger.
// First request gates remaining 19. Max 20, peak 2, one attempt each, retry 0.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {TerraGameReader,extractOpenAIKey} from '../../server/ai/terraGameReader';import {analyzeScanUnit} from '../../server/scanObservation';
const out='docs/terra-ten-game-evaluation-20261030',sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex'),pre=JSON.parse(await fs.readFile(out+'/preflight.json','utf8'));
assert.equal(pre.calls.length,20);assert.equal(pre.maxCalls,20);
assert.equal(sha(await fs.readFile(out+'/selection.json')),pre.selectionSHA);assert.equal(sha(await fs.readFile(out+'/evaluation-preflight.json')),pre.referencePreflightSHA);
for(const f of pre.sourceFiles)assert.equal(sha(await fs.readFile(f.path)),f.sha256,'product source drift: '+f.path);
for(const c of pre.calls){assert.equal(sha(await fs.readFile(c.inputPath)),c.inputSHA);assert.equal(sha(await fs.readFile(c.taskPath)),c.taskSHA);assert.equal(sha(await fs.readFile(c.referencePath)),c.referenceSHA);assert.equal(sha(JSON.stringify(JSON.parse(await fs.readFile(c.requestPath,'utf8')))),c.bodySHA);}
const originalExecutionSHA=sha(await fs.readFile(out+'/execution.json')),originalLedgerSHA=sha(await fs.readFile(out+'/ledger.json'));
const key=extractOpenAIKey(await fs.readFile('/Users/jeonggyuju/.paseo/uploads/upload_47060b91-43e5-46ca-b987-583d0c19327e/KeepBoard_OpenAI_API','utf8'));
await fs.writeFile(path.join(pre.privateDir,'recovery.run.claim'),JSON.stringify({at:new Date().toISOString(),preflightSHA:sha(await fs.readFile(out+'/preflight.json')),originalExecutionSHA,max:20}),{flag:'wx',mode:0o600});
let active=0,peak=0,calls=0,halt=false,next=1,firstSucceeded=false;const ledger:any[]=[],results:any[]=[];let writes=Promise.resolve();
const persist=()=>{const snapshot=JSON.stringify({calls,peak,retries:0,halt,firstSucceeded,rows:ledger,results},null,2)+'\n';writes=writes.then(()=>fs.writeFile(out+'/recovery-ledger.json',snapshot));return writes;};
const reader=new TerraGameReader({key:async()=>key,fetch:async(url,init)=>{
 const body=String(init!.body),bodySHA=sha(body),c=pre.calls.find((c:any)=>c.bodySHA===bodySHA);
 if(!c||String(url)!=='https://api.openai.com/v1/responses'||calls>=20||halt)throw Error('Outside frozen recovery approval');
 await fs.writeFile(path.join(pre.privateDir,'recovery.'+c.id+'.claim'),bodySHA,{flag:'wx',mode:0o600});calls++;active++;peak=Math.max(peak,active);assert(active<=2);
 const row:any={id:c.id,gameId:c.gameId,variant:c.variant,bodySHA,startedAt:new Date().toISOString()},start=performance.now();ledger.push(row);await persist();
 try{
  const response=await fetch(url,init);row.httpStatus=response.status;row.headersMs=performance.now()-start;
  if([401,403,429].includes(response.status))halt=true;
  const text=await response.clone().text(),file=path.join(pre.privateDir,'recovery.'+c.id+'.provider-body.txt');await fs.writeFile(file,text,{mode:0o600});row.responseBytesSHA=sha(text);row.providerMs=performance.now()-start;
  if(response.ok){const native=JSON.parse(text),nativeFile=path.join(pre.privateDir,'recovery.'+c.id+'.native.json');await fs.writeFile(nativeFile,JSON.stringify(native,null,2)+'\n',{mode:0o600});row.nativeSHA=sha(await fs.readFile(nativeFile));row.model=native.model;row.status=native.status;row.usage=native.usage??null;}
  return response;
 }catch(e:any){halt=true;row.transportFailure=true;row.error={name:e?.name??null,code:e?.code??null,causeCode:e?.cause?.code??null,syscall:e?.cause?.syscall??null};throw Error('Recovery transport failure; stop all pending requests');}
 finally{active--;row.finishedAt=new Date().toISOString();await persist();}
}});
async function one(c:any){
 const task=JSON.parse(await fs.readFile(c.taskPath,'utf8')),start=performance.now();
 const result=await analyzeScanUnit({...task,index:c.unitIndex,reader,readImage:async(e:any)=>{const im=pre.calls.find((r:any)=>r.gameId===c.gameId&&task.evidence[r.unitIndex].id===e.id);assert(im);return {data:await fs.readFile(im.inputPath),mimeType:im.mimeType};}});
 const file=path.join(pre.privateDir,'recovery.'+c.id+'.result.json');await fs.writeFile(file,JSON.stringify(result,null,2)+'\n',{mode:0o600});
 const item={id:c.id,state:result.scanBundle?.units[0]?.state??'unknown',observationCount:result.observationReceipts?.[0]?.result.observations.length??0,totalUnitMs:performance.now()-start,resultSHA:sha(await fs.readFile(file))};results.push(item);await persist();console.log(JSON.stringify(item));return item;
}
const startedAt=new Date().toISOString(),start=performance.now(),first=await one(pre.calls[0]),firstReceipt=ledger.find(r=>r.id===pre.calls[0].id);
firstSucceeded=first.state==='completed'&&firstReceipt?.httpStatus===200&&firstReceipt.status==='completed'&&!!firstReceipt.nativeSHA;
if(!firstSucceeded)halt=true;await persist();console.log(JSON.stringify({firstRequestGate:firstSucceeded,calls}));
if(firstSucceeded)await Promise.all(Array.from({length:2},async()=>{while(next<pre.calls.length&&!halt){const c=pre.calls[next++];await one(c);}}));
const skipped=pre.calls.filter((c:any)=>!ledger.some(r=>r.id===c.id)).map((c:any)=>c.id),sourceDrift=[];
for(const f of pre.sourceFiles)if(sha(await fs.readFile(f.path))!==f.sha256)sourceDrift.push(f.path);
assert.equal(sha(await fs.readFile(out+'/execution.json')),originalExecutionSHA);assert.equal(sha(await fs.readFile(out+'/ledger.json')),originalLedgerSHA);
const report={authorization:'supervisor message 07d5dd41-8013-44f9-b3dd-2204771eac6d',originalExecutionSHA,originalLedgerSHA,originalAttemptsPreserved:true,startedAt,finishedAt:new Date().toISOString(),calls,peak,retries:0,wallMs:performance.now()-start,firstSucceeded,halt,skipped,rows:ledger,results,sourceDrift,maxRecoveryCalls:20,productWrites:0,credentialsPersisted:false};
await writes;await fs.writeFile(out+'/recovery-execution.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({completed:true,calls,peak,halt,skipped:skipped.length,sourceDrift}));
