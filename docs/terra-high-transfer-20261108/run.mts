/** Terra-high rerun of the transfer12 TQ arm: same bytes except reasoning.effort low->high. 6 calls, peak 2, retries 0. */
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {suppliedOpenAIKey} from '../ten-games-closeup-20261029/terra-comparison/auth.mts';import {processResponse} from '../accuracy-improvement-20261106/implementation/runtime.mts';import {usageCost} from '../accuracy-improvement-20261106/implementation/pricing.mts';
const D=path.dirname(fileURLToPath(import.meta.url)),I=D+'/../accuracy-improvement-20261106/implementation',sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex'),load=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const mode=process.argv[2];assert(['prepare','execute'].includes(mode));
const pf=await load(I+'/transfer12-preflight.json'),tq=pf.jobs.filter((j:any)=>j.arm==='TQ');assert.equal(tq.length,6);
const work='/private/tmp/kb-terra-high-transfer-20261108';await fs.mkdir(work,{recursive:true,mode:0o700});
if(mode==='prepare'){
 const jobs=[];
 for(const j of tq){const bytes=await fs.readFile(j.bodyPath);assert.equal(sha(bytes),j.bodySHA);const body=JSON.parse(bytes.toString());assert.equal(body.reasoning.effort,'low');
  const hi={...body,reasoning:{...body.reasoning,effort:'high'}},wire=JSON.stringify(hi);
  const strip=(b:any)=>JSON.stringify({...b,reasoning:{...b.reasoning,effort:null}});assert.equal(strip(hi),strip(body),'only effort differs');
  const p=work+'/'+j.id.replace('-TQ-','-TH-')+'.request.json';await fs.writeFile(p,wire,{mode:0o600});
  const task=await load(j.taskPath);const reader={...j.reader,reasoningEffort:'high'};
  const tp=p.replace('.request.json','.task.json');await fs.writeFile(tp,JSON.stringify({...task,reader}),{mode:0o600});
  jobs.push({id:j.id.replace('-TQ-','-TH-'),fromJob:j.id,scene:j.scene,gameId:j.gameId,arm:'TH',repeat:j.repeat,reader,bodyPath:p,wireSHA:sha(wire),previousWireSHA:j.wireSHA,taskPath:tp,taskSHA:sha(await fs.readFile(tp)),sourceSHA:j.sourceSHA,model:j.model,effort:'high'});}
 await fs.writeFile(D+'/preflight.json',JSON.stringify({version:'terra-high-transfer-v1',delta:'reasoning.effort low->high only; image, prompt (incl. Q), schema, detail, max tokens, tier unchanged',jobs,peak:2,retries:0,timeoutMs:300000,providerCalls:0},null,2)+'\n');
 console.log(JSON.stringify({prepared:jobs.length}));process.exit(0);
}
const pre=await load(D+'/preflight.json');const key=await suppliedOpenAIKey();
await fs.writeFile(work+'/single-attempt.claim',JSON.stringify({preflightSHA:sha(await fs.readFile(D+'/preflight.json'))}),{flag:'wx',mode:0o600});
const ex:any={work,startedAt:new Date().toISOString(),rows:[],peak:0,retries:0};let active=0,next=0,halt=false;const start=performance.now();
async function run(j:any){
 const wire=await fs.readFile(j.bodyPath,'utf8');assert.equal(sha(wire),j.wireSHA);const task=await load(j.taskPath);
 const row:any={id:j.id,scene:j.scene,gameId:j.gameId,repeat:j.repeat,startedAt:new Date().toISOString()};ex.rows.push(row);active++;ex.peak=Math.max(ex.peak,active);const at=performance.now();
 try{
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:wire,signal:AbortSignal.timeout(300000),redirect:'error'});
  row.httpStatus=r.status;if([401,403,429].includes(r.status))halt=true;if(!r.ok){await r.body?.cancel();throw Error('http');}
  const native=await r.json();await fs.writeFile(work+'/'+j.id+'.response.json',JSON.stringify(native),{mode:0o600});
  Object.assign(row,{usage:native.usage,responseModel:native.model,responseEffort:native.reasoning?.effort,status:native.status,estimatedUSD:usageCost(j.model,native.usage)});
  const out=processResponse(task,native,j.id,j.reader);await fs.writeFile(work+'/'+j.id+'.json',JSON.stringify({jobId:j.id,state:'completed',...out}),{mode:0o600});row.state='completed';
 }catch(e){row.state='unavailable';row.error=(e as Error).message.slice(0,120);}
 finally{active--;row.providerMs=performance.now()-at;console.log(JSON.stringify({id:row.id,state:row.state,http:row.httpStatus,s:Math.round(row.providerMs/100)/10}));}
}
await Promise.all([0,1].map(async()=>{while(next<pre.jobs.length&&!halt)await run(pre.jobs[next++]);}));
ex.wallMs=performance.now()-start;ex.halt=halt;ex.calls=ex.rows.length;await fs.writeFile(D+'/result.json',JSON.stringify(ex,null,2)+'\n');
