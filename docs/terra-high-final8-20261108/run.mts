/** FINAL 8 photos x 2: Terra-low+Q (TLQ) vs Terra-high+Q (THQ). Only reasoning.effort differs between arms. Peak 2, retries 0. */
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {suppliedOpenAIKey} from '../ten-games-closeup-20261029/terra-comparison/auth.mts';import {processResponse} from '../accuracy-improvement-20261106/implementation/runtime.mts';import {usageCost} from '../accuracy-improvement-20261106/implementation/pricing.mts';import {buildQ} from '../accuracy-goal-20261106/implementation/iteration2/q-body.mts';
const D=path.dirname(fileURLToPath(import.meta.url)),A=D+'/../accuracy-goal-20261106',F=A+'/implementation/final',sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex'),load=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const mode=process.argv[2];assert(['prepare','execute'].includes(mode));const work='/private/tmp/kb-terra-high-final8-20261108';await fs.mkdir(work,{recursive:true,mode:0o700});
if(mode==='prepare'){
 const card=await load(A+'/iteration2-execution-card.json'),files=(await fs.readdir(F+'/requests')).sort();assert.equal(files.length,16);const jobs=[];
 for(const f of files){const m=f.match(/^FINAL-(final-pool-\d+)-baseline-r([12])\.json$/)!;const scene=m[1],repeat=+m[2];const base=await load(F+'/requests/'+f);assert.equal(base.model,'gpt-6.1-terra');assert.equal(base.reasoning.effort,'low');const task=await load(F+'/tasks/'+scene+'.json');
  for(const [arm,effort] of [['TLQ','low'],['THQ','high']] as const){const body=buildQ(base,card);body.reasoning={...body.reasoning,effort};const check=structuredClone(body);check.reasoning.effort='low';assert.deepEqual(check,buildQ(base,card));
   const id=`${scene}-${arm}-r${repeat}`,wire=JSON.stringify(body),bodyPath=work+'/'+id+'.request.json',taskPath=work+'/'+id+'.task.json',reader={...task.reader,reasoningEffort:effort};await fs.writeFile(bodyPath,wire,{mode:0o600});await fs.writeFile(taskPath,JSON.stringify({...task,reader}),{mode:0o600});
   jobs.push({id,scene,arm,repeat,effort,reader,bodyPath,wireSHA:sha(wire),taskPath,baselineRequest:f});}}
 const ordered=[...jobs.filter(j=>j.repeat===1),...jobs.filter(j=>j.repeat===2)];
 await fs.writeFile(D+'/preflight.json',JSON.stringify({version:'terra-high-final8-v1',delta:'FINAL baseline request + Q paragraph (buildQ); TLQ vs THQ differ only in reasoning.effort',jobs:ordered,peak:2,retries:0,timeoutMs:300000,providerCalls:0,note:'FINAL photos already used once; comparison only, not fresh validation'},null,2)+'\n');console.log(JSON.stringify({jobs:ordered.length}));process.exit(0);
}
const pre=await load(D+'/preflight.json');const key=await suppliedOpenAIKey();await fs.writeFile(work+'/single-attempt.claim',JSON.stringify({preflightSHA:sha(await fs.readFile(D+'/preflight.json'))}),{flag:'wx',mode:0o600});
const ex:any={work,startedAt:new Date().toISOString(),rows:[],peak:0,retries:0};let active=0,next=0,halt=false,writes=Promise.resolve();const start=performance.now();
const persist=()=>{const t=JSON.stringify(ex,null,2)+'\n';writes=writes.then(()=>fs.writeFile(D+'/result.json',t));return writes;};
async function run(j:any){const wire=await fs.readFile(j.bodyPath,'utf8');assert.equal(sha(wire),j.wireSHA);const task=await load(j.taskPath);const row:any={id:j.id,scene:j.scene,arm:j.arm,repeat:j.repeat,startedAt:new Date().toISOString()};ex.rows.push(row);active++;ex.peak=Math.max(ex.peak,active);const at=performance.now();
 try{const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:wire,signal:AbortSignal.timeout(300000),redirect:'error'});row.httpStatus=r.status;if([401,402,403,429].includes(r.status))halt=true;if(!r.ok){await r.body?.cancel();throw Error('http');}
  const native=await r.json();await fs.writeFile(work+'/'+j.id+'.response.json',JSON.stringify(native),{mode:0o600});Object.assign(row,{usage:native.usage,responseModel:native.model,responseEffort:native.reasoning?.effort,status:native.status,estimatedUSD:usageCost('gpt-6.1-terra',native.usage)});
  assert.equal(native.reasoning?.effort,j.effort);const out=processResponse(task,native,j.id,j.reader);await fs.writeFile(work+'/'+j.id+'.json',JSON.stringify({jobId:j.id,state:'completed',...out}),{mode:0o600});row.state='completed';
 }catch(e){row.state='unavailable';row.error=(e as Error).message.slice(0,120);}
 finally{active--;row.providerMs=performance.now()-at;await persist();console.log(JSON.stringify({id:row.id,state:row.state,http:row.httpStatus,s:Math.round(row.providerMs/100)/10}));}}
await Promise.all([0,1].map(async()=>{while(next<pre.jobs.length&&!halt)await run(pre.jobs[next++]);}));
ex.wallMs=performance.now()-start;ex.halt=halt;ex.calls=ex.rows.length;ex.unattempted=pre.jobs.slice(next).map((j:any)=>j.id);await persist();
