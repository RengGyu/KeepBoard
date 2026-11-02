// Frozen Gemini prompt/image/schema -> OpenAI transport only. No GT parsed here.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {suppliedOpenAIKey} from './auth.mts';
import {decodeGeminiGameObservation} from '../../../server/ai/geminiGameReader.ts';
const root=path.dirname(new URL(import.meta.url).pathname),old=path.join(root,'../video-attempt');
const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const save=async(p:string,v:unknown)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n',{mode:0o600});
const prePath=path.join(root,'preflight.json'),model='gpt-6.1-terra';
const access=JSON.parse(await fs.readFile(path.join(root,'access.json'),'utf8'));
assert(access.http===200&&access.returnedModel===model&&access.exactModelAccessible,'Exact model access must be established first');
if(!process.argv.includes('--execute')){
 const privateDir=await fs.mkdtemp('/private/tmp/kb-terra-closeup-20261030-');await fs.chmod(privateDir,0o700);
 const tasks=[],frozenFiles:Record<string,string>={};
 for(const [gameId,prefix]of [['splendor','pilot'],['quacks','quacks']]){
  const inputsPath=path.join(old,prefix+'-inputs.json'),priorPath=path.join(old,prefix+'-preflight.json');
  const inputs=JSON.parse(await fs.readFile(inputsPath,'utf8')),prior=JSON.parse(await fs.readFile(priorPath,'utf8'));
  frozenFiles[inputsPath]=sha(await fs.readFile(inputsPath));frozenFiles[priorPath]=sha(await fs.readFile(priorPath));
  assert.equal(sha(await fs.readFile(inputs.reference.path)),inputs.reference.sha256);
  frozenFiles[inputs.reference.path]=inputs.reference.sha256;
  assert.equal(sha(await fs.readFile('server/ai/geminiGameReader.ts')),prior.sourceHashes['server/ai/geminiGameReader.ts'],'Decoder drift');
  for(const t of prior.tasks){
   const oldWire=await fs.readFile(t.prefix+'.request.json','utf8');assert.equal(sha(oldWire),t.bodySHA);
   const gemini=JSON.parse(oldWire),parts=gemini.contents[0].parts,prompt=parts.find((x:any)=>typeof x.text==='string').text,image=parts.find((x:any)=>x.inlineData).inlineData;
   assert.equal(sha(Buffer.from(image.data,'base64')),t.inputSHA);assert.equal(sha(prompt),t.promptSHA);
   const inputImage=inputs.images.find((x:any)=>x.variant===t.variant);assert.equal(sha(await fs.readFile(inputImage.path)),t.inputSHA);
   const schema=gemini.generationConfig.responseFormat.text.schema;
   const body={model,store:false,service_tier:'default',max_output_tokens:32768,reasoning:{effort:'low'},
    input:[{role:'user',content:[{type:'input_text',text:prompt},{type:'input_image',image_url:`data:${image.mimeType};base64,${image.data}`,detail:'high'}]}],
    text:{format:{type:'json_schema',name:'game_observation',strict:true,schema}}};
   const wire=JSON.stringify(body),out=path.join(privateDir,gameId+'-'+t.variant);
   await fs.writeFile(out+'.request.json',wire,{mode:0o600});
   await fs.copyFile(t.prefix+'.task.json',out+'.task.json');await fs.chmod(out+'.task.json',0o600);
   assert.equal(sha(body.input[0].content[0].text!),sha(prompt));
   assert.equal(sha(JSON.stringify(body.text.format.schema)),sha(JSON.stringify(schema)));
   tasks.push({id:gameId+'-'+t.variant,gameId,variant:t.variant,prefix:out,inputSHA:t.inputSHA,referenceSHA:inputs.reference.sha256,
    bodySHA:sha(wire),promptSHA:t.promptSHA,schemaSHA:sha(JSON.stringify(schema)),geminiBodySHA:t.bodySHA,geminiPrefix:t.prefix});
  }
 }
 assert.equal(tasks.length,6);
 const preflight={model,endpoint:'https://api.openai.com/v1/responses',privateDir,tasks,frozenFiles,preparedAt:new Date().toISOString(),
  calls:6,maxConcurrency:6,retries:0,credential:'provided-upload',sameImageBytes:true,samePromptText:true,sameJSONSchemaContent:true,
  settings:{reasoningEffort:'low',imageDetail:'high',maxOutputTokens:32768,serviceTier:'default',store:false},
  delta:['Gemini contents/inlineData -> OpenAI input_text/input_image data URL','Gemini responseFormat -> OpenAI text.format json_schema, name+strict wrapper; schema content unchanged',
   'Gemini thinkingLevel LOW -> supported Terra reasoning.effort low; not equal computation','Gemini mediaResolution HIGH -> supported image detail high; preprocessing/tokenization not claimed equal',
   'max_output_tokens32768 also covers reasoning tokens in OpenAI; output-limit semantics differ','OpenAI model/endpoint/auth changed only in isolated test; store false and default service tier; no tools'],
  normalization:'Completed OpenAI assistant output_text -> parsed JSON -> mechanical Gemini decoder envelope (STOP), same unchanged visible-value decoder; provider raw remains separate',
  decoderSHA:sha(await fs.readFile('server/ai/geminiGameReader.ts')),runnerSHA:sha(await fs.readFile(new URL(import.meta.url))),GTInModelRequest:false};
 await save(prePath,preflight);console.log(JSON.stringify({prepared:6,model,sameImagePromptSchema:true,inferenceCalls:0}));process.exit(0);
}
const pre=JSON.parse(await fs.readFile(prePath,'utf8'));
assert.equal(pre.runnerSHA,sha(await fs.readFile(new URL(import.meta.url))));assert.equal(pre.decoderSHA,sha(await fs.readFile('server/ai/geminiGameReader.ts')));
for(const [p,h]of Object.entries(pre.frozenFiles))assert.equal(sha(await fs.readFile(p)),h);
const tasks=[];
for(const t of pre.tasks){const wire=await fs.readFile(t.prefix+'.request.json','utf8');assert.equal(sha(wire),t.bodySHA);tasks.push({...t,wire,...JSON.parse(await fs.readFile(t.prefix+'.task.json','utf8'))});}
assert.equal(tasks.length,6);const key=await suppliedOpenAIKey();
await fs.writeFile(path.join(pre.privateDir,'single-attempt.claim'),JSON.stringify({preflightSHA:sha(await fs.readFile(prePath)),calls:6,retries:0}),{flag:'wx',mode:0o600});
const ledger:any[]=[];let active=0,peak=0,writes=Promise.resolve();const beginAll=performance.now();
const persist=()=>{const copy=structuredClone(ledger);writes=writes.then(()=>save(path.join(root,'ledger.json'),copy));return writes;};
await Promise.all(tasks.map(async t=>{
 const row:any={id:t.id,gameId:t.gameId,variant:t.variant,inputSHA:t.inputSHA,bodySHA:t.bodySHA,referenceSHA:t.referenceSHA,modelRequested:model,state:'started',startedAt:new Date().toISOString()};
 ledger.push(row);await persist();const start=performance.now();peak=Math.max(peak,++active);
 try{
  const response=await fetch(pre.endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:t.wire,signal:AbortSignal.timeout(180000),redirect:'error'});
  row.http=response.status;row.requestId=response.headers.get('x-request-id');
  if(!response.ok){row.state='http-failure';await response.body?.cancel();return;} // No error body/header/auth output.
  const bytes=Buffer.from(await response.arrayBuffer());await fs.writeFile(t.prefix+'.native.json',bytes,{mode:0o600});row.rawSHA=sha(bytes);
  const native=JSON.parse(bytes.toString());row.responseId=native.id??null;row.modelReturned=native.model??null;row.status=native.status??null;row.serviceTier=native.service_tier??null;row.usage=native.usage??null;
  if(native.status!=='completed'||native.error){row.state='incomplete-or-error';return;}
  const messages=(native.output??[]).filter((x:any)=>x.type==='message');
  assert(messages.length>0&&messages.every((m:any)=>m.role==='assistant'&&m.status==='completed'));
  const parts=messages.flatMap((x:any)=>x.content);assert(parts.every((p:any)=>p.type==='output_text'&&typeof p.text==='string'));
  const text=parts.map((p:any)=>p.text).join(''),parsed=JSON.parse(text);await save(t.prefix+'.parsed.json',parsed);
  const trace:any={id:'gemini-game-wire-v1',items:[],deferred:[]};
  const decoded=decodeGeminiGameObservation({candidates:[{finishReason:'STOP',content:{parts:[{text}]}}]},t.request,t.definition,trace);
  await save(t.prefix+'.decoded.json',decoded);await save(t.prefix+'.trace.json',trace);
  row.state='decoded';row.observations=decoded.observations.length;row.parsedSHA=sha(await fs.readFile(t.prefix+'.parsed.json'));row.decodedSHA=sha(await fs.readFile(t.prefix+'.decoded.json'));
 }catch(e){row.state='request-or-parse-or-decode-failure';row.errorName=(e as Error).name;}
 finally{active--;row.ms=Math.round(performance.now()-start);row.finishedAt=new Date().toISOString();await persist();console.log(JSON.stringify(row));}
}));
await persist();await save(path.join(root,'execution.json'),{model,inferenceCalls:ledger.length,retries:0,peak,wallMs:Math.round(performance.now()-beginAll),productChanges:0,appSessionWrites:0});
