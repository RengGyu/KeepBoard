// Named-box Terra run. Separate single claim; at most 6 calls, 0 retries. First call alone (schema-acceptance gate), then 5 concurrent.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {suppliedOpenAIKey} from '../terra-comparison/auth.mts';
import {decodeGeminiGameObservation} from '../../../server/ai/geminiGameReader.ts';
import {withNamedBox,withNamedBoxPrompt,namedToDecoderItems,OLD_BOX_SENTENCE,NEW_BOX_SENTENCE} from './namedBox.mts';
const root=path.dirname(new URL(import.meta.url).pathname),old=path.join(root,'../terra-comparison');
const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const save=async(p:string,v:unknown,mode=0o600)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n',{mode});
const prePath=path.join(root,'named-preflight.json'),endpoint='https://api.openai.com/v1/responses',model='gpt-6.1-terra';
const oldPre=JSON.parse(await fs.readFile(path.join(old,'preflight.json'),'utf8'));
const files=['namedBox.mts','run-named.mts'].map(f=>path.join(root,f));
if(!process.argv.includes('--execute')){
 const privateDir=await fs.mkdtemp('/private/tmp/kb-terra-named-20261030-');await fs.chmod(privateDir,0o700);const tasks=[];
 for(const t of oldPre.tasks){
  const oldWire=await fs.readFile(t.prefix+'.request.json','utf8');assert.equal(sha(oldWire),t.bodySHA,'frozen request drift');
  const o=JSON.parse(oldWire),body=structuredClone(o);
  body.input[0].content[0].text=withNamedBoxPrompt(o.input[0].content[0].text);body.text.format.schema=withNamedBox(o.text.format.schema);
  // Everything but the box sentence and box schema must be byte-identical.
  const strip=(b:any)=>{const c=structuredClone(b);c.input[0].content[0].text=c.input[0].content[0].text.replace(OLD_BOX_SENTENCE,'').replace(NEW_BOX_SENTENCE,'');delete c.text.format.schema.properties.items.items.properties.box_1000;return JSON.stringify(c);};
  assert.equal(strip(body),strip(o));assert.equal(sha(body.input[0].content[1].image_url),sha(o.input[0].content[1].image_url));
  const wire=JSON.stringify(body),out=path.join(privateDir,t.id);await fs.writeFile(out+'.request.json',wire,{mode:0o600});
  tasks.push({id:t.id,gameId:t.gameId,variant:t.variant,prefix:out,taskPath:t.prefix+'.task.json',taskSHA:sha(await fs.readFile(t.prefix+'.task.json')),inputSHA:t.inputSHA,referenceSHA:t.referenceSHA,
   bodySHA:sha(wire),previousTerraBodySHA:t.bodySHA,promptSHA:sha(body.input[0].content[0].text),schemaSHA:sha(JSON.stringify(body.text.format.schema))});
 }
 assert.equal(tasks.length,6);
 await save(prePath,{model,endpoint,privateDir,tasks,maxCalls:6,retries:0,order:'first task alone as schema-acceptance gate, then remaining 5 concurrently',
  delta:{promptSentenceBefore:OLD_BOX_SENTENCE,promptSentenceAfter:NEW_BOX_SENTENCE,schema:'items.box_1000: array[4]|null -> {ymin,xmin,ymax,xmax}|null (anyOf, strict); every other request byte identical incl. image, reasoning low, detail high, max_output_tokens 32768, store false, service_tier default'},
  conversion:'named keys -> [ymin,xmin,ymax,xmax] by key; no sort/swap/clamp; unchanged decodeGeminiGameObservation',
  runnerSHA:Object.fromEntries(await Promise.all(files.map(async f=>[path.basename(f),sha(await fs.readFile(f))]))),decoderSHA:sha(await fs.readFile('server/ai/geminiGameReader.ts')),preparedAt:new Date().toISOString()});
 console.log(JSON.stringify({prepared:6,inferenceCalls:0}));process.exit(0);
}
const pre=JSON.parse(await fs.readFile(prePath,'utf8'));
for(const f of files)assert.equal(sha(await fs.readFile(f)),pre.runnerSHA[path.basename(f)],'runner drift');
assert.equal(sha(await fs.readFile('server/ai/geminiGameReader.ts')),pre.decoderSHA,'decoder drift');
const tasks=[];for(const t of pre.tasks){const wire=await fs.readFile(t.prefix+'.request.json','utf8');assert.equal(sha(wire),t.bodySHA);assert.equal(sha(await fs.readFile(t.taskPath)),t.taskSHA);tasks.push({...t,wire,task:JSON.parse(await fs.readFile(t.taskPath,'utf8'))});}
const key=await suppliedOpenAIKey();
await fs.writeFile(path.join(pre.privateDir,'single-attempt.claim'),JSON.stringify({preflightSHA:sha(await fs.readFile(prePath)),maxCalls:6,retries:0}),{flag:'wx',mode:0o600});
const ledger:any[]=[];let writes=Promise.resolve(),active=0,peak=0;const persist=()=>{const c=structuredClone(ledger);writes=writes.then(()=>save(path.join(root,'named-ledger.json'),c));return writes;};
const call=async(t:any)=>{
 const row:any={id:t.id,bodySHA:t.bodySHA,modelRequested:model,state:'started',startedAt:new Date().toISOString()};ledger.push(row);await persist();
 const start=performance.now();peak=Math.max(peak,++active);
 try{
  const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:t.wire,signal:AbortSignal.timeout(180000),redirect:'error'});
  row.http=r.status;row.requestId=r.headers.get('x-request-id');
  if(!r.ok){row.state='http-failure';await r.body?.cancel();return row;} // no error body stored
  const bytes=Buffer.from(await r.arrayBuffer());await fs.writeFile(t.prefix+'.native.json',bytes,{mode:0o600});row.rawSHA=sha(bytes);
  const native=JSON.parse(bytes.toString());Object.assign(row,{responseId:native.id??null,modelReturned:native.model??null,status:native.status??null,serviceTier:native.service_tier??null,usage:native.usage??null});
  if(native.status!=='completed'||native.error){row.state='incomplete-or-error';return row;}
  const text=native.output.filter((x:any)=>x.type==='message').flatMap((m:any)=>m.content).map((p:any)=>{assert.equal(p.type,'output_text');return p.text;}).join('');
  const parsed=JSON.parse(text);await save(t.prefix+'.parsed.json',parsed);row.parsedSHA=sha(await fs.readFile(t.prefix+'.parsed.json'));
  const conv=namedToDecoderItems(parsed.items);row.boxContract=conv.report;
  try{const d=decodeGeminiGameObservation({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({items:conv.items})}]}}]},t.task.request,t.task.definition);
   await save(t.prefix+'.decoded.json',d);row.decodedSHA=sha(await fs.readFile(t.prefix+'.decoded.json'));row.state='decoded';row.observations=d.observations.length;}
  catch{row.state='decoder-rejected';}
  return row;
 }catch(e){row.state='request-or-parse-failure';row.errorName=(e as Error).name;return row;}
 finally{active--;row.ms=Math.round(performance.now()-start);row.finishedAt=new Date().toISOString();await persist();console.log(JSON.stringify({id:row.id,state:row.state,http:row.http,ms:row.ms,boxContract:row.boxContract}));}
};
const begin=performance.now();
const first=await call(tasks[0]);
if(first.state==='http-failure'||first.state==='request-or-parse-failure'||first.state==='incomplete-or-error'){await persist();await save(path.join(root,'named-execution.json'),{inferenceCalls:1,retries:0,stoppedAfterGate:true,gateState:first.state,gateHttp:first.http??null});process.exit(2);}
const t2=performance.now();await Promise.all(tasks.slice(1).map(call));
await persist();await save(path.join(root,'named-execution.json'),{inferenceCalls:ledger.length,retries:0,peakConcurrency:peak,gateMs:first.ms,batchWallMs:Math.round(performance.now()-t2),wallMs:Math.round(performance.now()-begin),productChanges:0,appSessionWrites:0});
