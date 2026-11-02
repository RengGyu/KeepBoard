// Single-claim runner for one prepared plan. Peak <=3, retries 0. Stops launching on 401/403/429 or quota errors.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {suppliedOpenAIKey} from '../ten-games-closeup-20261029/terra-comparison/auth.mts';
import {decodeGeminiGameObservation} from '../../server/ai/geminiGameReader.ts';
import {namedToDecoderItems} from '../ten-games-closeup-20261029/terra-fix/namedBox.mts';
const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const planPath=process.argv[process.argv.indexOf('--plan')+1];assert(planPath&&process.argv.includes('--execute'));
const plan=JSON.parse(await fs.readFile(planPath,'utf8'));assert(plan.calls.length<=plan.maxCalls&&plan.peak<=3);
const ledgerPath=path.join(path.dirname(planPath),path.basename(planPath,'.json')+'-ledger.json');
for(const c of plan.calls){assert.equal(sha(await fs.readFile(c.requestPath)),c.bodySHA);assert.equal(sha(await fs.readFile(c.taskPath)),c.taskSHA);}
const key=await suppliedOpenAIKey();
await fs.writeFile(path.join(plan.privateDir,'single-attempt.claim'),JSON.stringify({planSHA:sha(await fs.readFile(planPath)),calls:plan.calls.length,retries:0}),{flag:'wx',mode:0o600});
const ledger:any[]=[];let stop=false,writes=Promise.resolve();
const persist=()=>{const c=structuredClone(ledger);writes=writes.then(()=>fs.writeFile(ledgerPath,JSON.stringify(c,null,2)+'\n'));return writes;};
const queue=[...plan.calls];let active=0,peak=0;const begin=performance.now();
async function one(c:any){
 const row:any={id:c.id,bodySHA:c.bodySHA,state:'started',startedAt:new Date().toISOString()};ledger.push(row);await persist();
 const start=performance.now();peak=Math.max(peak,++active);
 try{
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:await fs.readFile(c.requestPath,'utf8'),signal:AbortSignal.timeout(240000),redirect:'error'});
  row.http=r.status;row.requestId=r.headers.get('x-request-id');
  if(!r.ok){row.state='http-failure';if([401,403,429].includes(r.status))stop=true;await r.body?.cancel();return;}
  const bytes=Buffer.from(await r.arrayBuffer());const base=path.join(plan.privateDir,c.id);await fs.writeFile(base+'.native.json',bytes,{mode:0o600});row.rawSHA=sha(bytes);
  const n=JSON.parse(bytes.toString());Object.assign(row,{modelReturned:n.model??null,status:n.status??null,usage:n.usage??null});
  if(n.status!=='completed'||n.error){row.state='incomplete-or-error';return;}
  const text=n.output.filter((x:any)=>x.type==='message').flatMap((m:any)=>m.content).map((p:any)=>p.text).join('');
  const parsed=JSON.parse(text);await fs.writeFile(base+'.parsed.json',JSON.stringify(parsed,null,2),{mode:0o600});
  const conv=namedToDecoderItems(parsed.items);row.boxContract=conv.report;const task=JSON.parse(await fs.readFile(c.taskPath,'utf8'));
  try{const d=decodeGeminiGameObservation({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({items:conv.items})}]}}]},task.request,task.definition);
   await fs.writeFile(base+'.decoded.json',JSON.stringify(d,null,2),{mode:0o600});row.decodedSHA=sha(await fs.readFile(base+'.decoded.json'));row.state='decoded';}catch{row.state='decoder-rejected';}
 }catch(e){row.state='request-or-parse-failure';row.errorName=(e as Error).name;}
 finally{active--;row.ms=Math.round(performance.now()-start);await persist();console.log(JSON.stringify({id:row.id,state:row.state,http:row.http,ms:row.ms,box:row.boxContract}));}
}
await Promise.all(Array.from({length:plan.peak},async()=>{while(queue.length&&!stop)await one(queue.shift());}));
await persist();await fs.writeFile(path.join(path.dirname(planPath),path.basename(planPath,'.json')+'-execution.json'),JSON.stringify({calls:ledger.length,notLaunched:queue.map(c=>c.id),stoppedOnAuthOrQuota:stop,peak,wallMs:Math.round(performance.now()-begin),retries:0},null,2)+'\n');
