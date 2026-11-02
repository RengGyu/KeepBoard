// Exactly four already-frozen product requests. No retry, no fallback, immutable per-request claims.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {TerraGameReader} from '../../server/ai/terraGameReader';import {analyzeScanUnit} from '../../server/scanObservation';
const out='docs/terra-crop-fusion-20261030',pre=JSON.parse(await fs.readFile(out+'/preflight.json','utf8')),sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');assert.equal(pre.calls.length,4);assert.equal(sha(await fs.readFile(out+'/roi-plan.json')),pre.roiPlanSHA);
try{await fs.access(out+'/execution.json');throw Error('Four-call experiment already completed; no new requests');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
await fs.writeFile(path.join(pre.privateDir,'run.claim'),new Date().toISOString(),{flag:'wx',mode:0o600});let active=0,peak=0,calls=0;const ledger:any[]=[];let writes=Promise.resolve();
const persist=()=>{writes=writes.then(()=>fs.writeFile(path.join(pre.privateDir,'ledger.json'),JSON.stringify({calls,peak,retries:0,rows:ledger},null,2)+'\n',{mode:0o600}));return writes;};
const reader=new TerraGameReader({fetch:async(url,init)=>{
 const body=String(init!.body),bodySHA=sha(body),c=pre.calls.find((c:any)=>c.bodySHA===bodySHA);if(!c||String(url)!=='https://api.openai.com/v1/responses'||calls>=4)throw Error('Unapproved request');
 await fs.writeFile(path.join(pre.privateDir,c.id+'.claim'),bodySHA,{flag:'wx',mode:0o600});calls++;active++;peak=Math.max(peak,active);const start=performance.now(),row:any={id:c.id,bodySHA,startedAt:new Date().toISOString()};ledger.push(row);await persist();
 try{const response=await fetch(url,init);row.httpStatus=response.status;row.providerMs=performance.now()-start;if(response.ok){const native=await response.clone().json(),file=path.join(pre.privateDir,c.id+'.native.json');await fs.writeFile(file,JSON.stringify(native,null,2)+'\n',{mode:0o600});row.nativeSHA=sha(await fs.readFile(file));row.model=native.model;row.status=native.status;row.usage=native.usage??null;}return response;}
 catch{row.transportFailure=true;throw Error('Terra transport failed; no retry');}finally{active--;row.finishedAt=new Date().toISOString();await persist();}
}});
const start=performance.now();const results=await Promise.all(pre.calls.map(async(c:any)=>{
 assert.equal(sha(await fs.readFile(c.inputPath)),c.inputSHA);assert.equal(sha(await fs.readFile(c.referenceFile)),c.referenceSHA);const task=JSON.parse(await fs.readFile(c.taskPath,'utf8'));
 const result=await analyzeScanUnit({...task,index:c.unitIndex,reader,readImage:async(e:any)=>{const original=pre.calls.find((x:any)=>x.gameId===c.gameId&&x.unitIndex===task.evidence.findIndex((v:any)=>v.id===e.id));assert(original);return {data:await fs.readFile(original.inputPath),mimeType:original.mimeType};}});
 const file=path.join(pre.privateDir,c.id+'.result.json');await fs.writeFile(file,JSON.stringify(result,null,2)+'\n',{mode:0o600});return {id:c.id,state:result.scanBundle?.units[0].state,observations:result.observationReceipts?.[0]?.result.observations.length??0,resultPath:file,resultSHA:sha(await fs.readFile(file))};
}));await persist();const report={calls,peak,retries:0,wallMs:performance.now()-start,rows:ledger,results,privateDir:pre.privateDir};await fs.writeFile(out+'/execution.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
