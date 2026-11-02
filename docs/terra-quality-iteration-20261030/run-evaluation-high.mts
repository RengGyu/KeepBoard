// Approved research only: max 9 requests, peak 2, retry 0. Never changes product/defaults.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {decodeTerraGameObservation,extractOpenAIKey} from '../../server/ai/terraGameReader';import {assembleObservations} from '../../server/ai/observationAssembly';
const out='docs/terra-quality-iteration-20261030',sha=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex'),preBytes=await fs.readFile(out+'/preflight-high.json'),pre=JSON.parse(preBytes.toString());
assert.equal(pre.version,'terra-quality-three-condition-high-v1');assert(pre.calls.every(c=>c.effort===(c.condition==='B'?'high':'low')));assert.equal(pre.maxCalls,9);assert.equal(pre.peak,2);assert.equal(pre.retries,0);assert.equal(pre.calls.length,9);assert.equal(pre.maxCalculatedUSD,2);
assert.equal(sha(await fs.readFile(out+'/selection.json')),pre.selectionSHA);assert.equal(sha(await fs.readFile(out+'/evaluation-preflight.json')),pre.referencePreflightSHA);
for(const f of pre.sourceFiles)assert.equal(sha(await fs.readFile(f.path)),f.sha256,'Reader source changed: '+f.path);
for(const c of pre.calls){assert.equal(sha(await fs.readFile(c.inputPath)),c.inputSHA);assert.equal(sha(await fs.readFile(c.taskPath)),c.taskSHA);assert.equal(sha(await fs.readFile(c.referencePath)),c.referenceSHA);assert.equal(sha(JSON.stringify(JSON.parse(await fs.readFile(c.requestPath,'utf8')))),c.bodySHA);}
const keyFile=process.argv[2];assert(keyFile,'Only the previously authorized uploaded key path may be supplied');
const key=extractOpenAIKey(await fs.readFile(keyFile,'utf8')); // memory only; never printed or persisted
await fs.writeFile(path.join(pre.privateDir,'execution.run.claim'),JSON.stringify({at:new Date().toISOString(),preflightSHA:sha(preBytes),max:9}),{flag:'wx',mode:0o600});
const rows:any[]=[],results:any[]=[];let active=0,peak=0,calls=0,next=1,halt=false,firstSucceeded=false,writes=Promise.resolve();
const price=(u:any)=>{if(!u||!Number.isFinite(u.input_tokens)||!Number.isFinite(u.output_tokens))return null;const cached=u.input_tokens_details?.cached_tokens??0,write=u.input_tokens_details?.cache_write_tokens??0,ordinary=u.input_tokens-cached-write;if(ordinary<0)return null;return(ordinary+cached*.05+write*1.25+u.output_tokens*5)/1e6;};
const plannedTotal=()=>pre.calls.reduce((n:number,c:any)=>n+(rows.find(r=>r.id===c.id)?.calculatedUSD??c.worstPlannedUSD),0);
const persist=()=>{const snap=JSON.stringify({calls,active,peak,retries:0,halt,firstSucceeded,calculatedCompletedUSD:rows.reduce((n,r)=>n+(r.calculatedUSD??0),0),reservedTotalUSD:plannedTotal(),rows,results},null,2)+'\n';writes=writes.then(()=>fs.writeFile(out+'/execution-ledger-high.json',snap));return writes;};
async function one(c:any){
 if(halt||calls>=9||plannedTotal()>2+1e-9){halt=true;return;}
 const body=JSON.stringify(JSON.parse(await fs.readFile(c.requestPath,'utf8')));assert.equal(sha(body),c.bodySHA);
 await fs.writeFile(path.join(pre.privateDir,c.id+'.claim'),c.bodySHA,{flag:'wx',mode:0o600});
 calls++;active++;peak=Math.max(peak,active);assert(active<=2);
 const row:any={id:c.id,gameId:c.gameId,condition:c.condition,effort:c.effort,bodySHA:c.bodySHA,inputSHA:c.inputSHA,startedAt:new Date().toISOString(),state:'started'},start=performance.now();rows.push(row);await persist();
 let native:any,result:any;
 try{
  let response:Response;
  try{response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body,signal:AbortSignal.timeout(240000),redirect:'error'});}
  catch(e:any){row.transportFailure=true;row.error={name:e?.name??null,code:e?.code??null,causeCode:e?.cause?.code??null};halt=true;throw Error('Transport failed; no retry or recovery');}
  row.httpStatus=response.status;row.headersMs=performance.now()-start;
  const text=await response.text();row.providerMs=performance.now()-start;row.responseBytesSHA=sha(text);
  await fs.writeFile(path.join(pre.privateDir,c.id+'.provider-body.txt'),text,{flag:'wx',mode:0o600});
  if(!response.ok){row.state='http-failed';if([401,403,429].includes(response.status))halt=true;throw Error('HTTP '+response.status);}
  native=JSON.parse(text);row.model=native.model;row.returnedEffort=native.reasoning?.effort??null;row.returnedServiceTier=native.service_tier??null;row.status=native.status;row.usage=native.usage??null;row.calculatedUSD=price(row.usage);row.incompleteReason=native.incomplete_details?.reason??null;
  const file=path.join(pre.privateDir,c.id+'.native.json');await fs.writeFile(file,JSON.stringify(native,null,2)+'\n',{flag:'wx',mode:0o600});row.nativeSHA=sha(await fs.readFile(file));
  assert.equal(native.model,pre.model);if((row.usage?.input_tokens??0)>c.reservedInputTokens||plannedTotal()>2+1e-9){halt=true;row.budgetOrInputStop=true;}
  const task=JSON.parse(await fs.readFile(c.taskPath,'utf8')),p=task.scan.units[c.unitIndex].hosted,decoded=decodeTerraGameObservation(native,p.request,p.definition,p.transforms);
  result=assembleObservations({request:p.request,result:decoded.raw,definition:p.definition,pack:task.pack,turnInstanceId:task.session.turnInstanceId,reader:{...p.reader,reasoningEffort:c.effort}as any,transforms:p.transforms,sourceImageSHA:p.sourceImageSHA,hostedWire:decoded.hostedWire});
  result.observationReceipts[0].scanUnitId=task.scan.units[c.unitIndex].id;
  result.scanBundle={plan:task.scan.plan,units:[{unitId:task.scan.units[c.unitIndex].id,state:'completed',observationCount:decoded.raw.observations.length,elapsedMs:row.providerMs}],links:[]};
  const resultFile=path.join(pre.privateDir,c.id+'.result.json');await fs.writeFile(resultFile,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  row.state='completed';row.observationCount=decoded.raw.observations.length;row.resultSHA=sha(await fs.readFile(resultFile));results.push({id:c.id,state:'completed',resultSHA:row.resultSHA,observationCount:row.observationCount});
 }catch(e:any){if(row.state==='started')row.state=native?'decode-or-incomplete-failed':'failed';row.failureMessage=String(e?.message??'failure').replaceAll(key,'[REDACTED]');results.push({id:c.id,state:row.state});}
 finally{active--;row.elapsedMs=performance.now()-start;row.finishedAt=new Date().toISOString();await persist();console.log(JSON.stringify({id:row.id,state:row.state,http:row.httpStatus??null,ms:row.providerMs??row.elapsedMs,observations:row.observationCount??null,calculatedUSD:row.calculatedUSD??null,calls}));}
}
const startedAt=new Date().toISOString(),start=performance.now();await one(pre.calls[0]);firstSucceeded=rows[0]?.state==='completed'&&rows[0]?.httpStatus===200;if(!firstSucceeded)halt=true;await persist();
console.log(JSON.stringify({firstGate:firstSucceeded,calls,halt}));
if(firstSucceeded&&!halt)await Promise.all(Array.from({length:2},async()=>{while(next<pre.calls.length&&!halt){const c=pre.calls[next++];await one(c);}}));
await writes;const sourceDrift=[];for(const f of pre.sourceFiles)if(sha(await fs.readFile(f.path))!==f.sha256)sourceDrift.push(f.path);
const report={authorization:pre.authorization,preflightSHA:sha(preBytes),startedAt,finishedAt:new Date().toISOString(),wallMs:performance.now()-start,calls,peak,retries:0,firstSucceeded,halt,skipped:pre.calls.filter((c:any)=>!rows.some(r=>r.id===c.id)).map((c:any)=>c.id),rows,results,calculatedUSD:rows.reduce((n,r)=>n+(r.calculatedUSD??0),0),unknownUsageRequests:rows.filter(r=>r.calculatedUSD===null||r.calculatedUSD===undefined).length,actualInvoiceUSD:null,creditBalance:null,sourceDrift,productWrites:0,credentialsPersisted:false};
await fs.writeFile(out+'/execution-high.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({finished:true,calls,peak,halt,completed:rows.filter(r=>r.state==='completed').length,calculatedUSD:report.calculatedUSD,sourceDrift}));
