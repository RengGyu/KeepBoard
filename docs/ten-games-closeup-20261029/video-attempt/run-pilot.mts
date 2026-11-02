// Isolated W/C/D diagnostic. The evaluator reference is never loaded into a request.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {catalogPacks} from '../../../gamepacks/catalog.ts';
import {effectiveRecognitionPack} from '../../../shared/recognition.ts';
import {photoDefinition} from '../../../server/photoDefinitions.ts';
import {compileObservationTask} from '../../../shared/lightweightRecognition.ts';
import {buildGeminiGameBody,decodeGeminiGameObservation,extractGeminiKey} from '../../../server/ai/geminiGameReader.ts';

const root=path.dirname(new URL(import.meta.url).pathname);
const privateDir='/private/tmp/kb-ten-games-closeup-video-20261030';
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const save=async(p:string,v:unknown)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n',{mode:0o600});
const inputs=JSON.parse(await fs.readFile(path.join(root,'pilot-inputs.json'),'utf8'));
const preflightPath=path.join(root,'pilot-preflight.json');
const ledgerPath=path.join(root,'pilot-ledger.json');
const files=['server/ai/geminiGameReader.ts','shared/lightweightRecognition.ts','game-photo-definitions/index.json','gamepacks/catalog.ts'];
const sourceHashes=Object.fromEntries(await Promise.all(files.map(async p=>[p,sha(await fs.readFile(p))])));

if(!process.argv.includes('--execute')){
 assert.equal(sha(await fs.readFile(inputs.reference.path)),inputs.reference.sha256);
 const pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id===inputs.packId)!);
 const definition=photoDefinition(pack),tasks=[];
 for(const image of inputs.images){
  const bytes=await fs.readFile(image.path);assert.equal(sha(bytes),image.sha256);
  const request=compileObservationTask({pack,definition,areaId:inputs.areaId,taskId:'independent-closeup-pilot-'+image.variant,
   scope:{partition:inputs.partition,ownerId:null,captureEpoch:'independent-closeup-pilot'},
   images:[{evidenceId:'splendor-'+image.variant,inputId:'splendor-'+image.variant,sha256:image.sha256,width:image.width,height:image.height,transformId:null}]});
  const body=buildGeminiGameBody(request,definition,bytes,image.mimeType),wire=JSON.stringify(body);
  const prefix=path.join(privateDir,'pilot-'+image.variant);
  await fs.writeFile(prefix+'.request.json',wire,{mode:0o600});await save(prefix+'.task.json',{request,definition});
  tasks.push({variant:image.variant,inputSHA:image.sha256,bodySHA:sha(wire),promptSHA:sha(body.contents[0].parts[0].text!),configSHA:sha(JSON.stringify(body.generationConfig)),prefix});
 }
 assert.equal(new Set(tasks.map(t=>t.promptSHA)).size,1);assert.equal(new Set(tasks.map(t=>t.configSHA)).size,1);
 assert.equal(tasks.length,3);
 const preflight={version:'independent-closeup-pilot-preflight-v1',inputsSHA:sha(await fs.readFile(path.join(root,'pilot-inputs.json'))),referenceSHA:inputs.reference.sha256,
  sourceHashes,tasks,calls:3,concurrency:3,retries:0,model:'gemini-3.8-flash',thinking:'LOW',mediaResolution:'HIGH',maxOutputTokens:32768,
  samePromptAndConfig:true,GTInRequest:false,priorWholeResponseReused:false,reasonNoReuse:'New independently acquired video frame bytes; no exact previous request',
  keyReferenceConfigured:!!process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE,preparedAt:new Date().toISOString()};
 await save(preflightPath,preflight);console.log(JSON.stringify({prepared:3,samePromptAndConfig:true,modelCalls:0,keyReferenceConfigured:preflight.keyReferenceConfigured}));
 process.exit(0);
}

const preflight=JSON.parse(await fs.readFile(preflightPath,'utf8'));
assert.deepEqual(sourceHashes,preflight.sourceHashes,'Product source drift: do not silently change requests');
assert.equal(sha(await fs.readFile(path.join(root,'pilot-inputs.json'))),preflight.inputsSHA);
assert.equal(sha(await fs.readFile(inputs.reference.path)),preflight.referenceSHA);
const tasks=[];
for(const t of preflight.tasks){
 const wire=await fs.readFile(t.prefix+'.request.json','utf8');assert.equal(sha(wire),t.bodySHA);
 const payload=JSON.parse(wire),image=payload.contents[0].parts.find((p:any)=>p.inlineData).inlineData;
 assert.equal(sha(Buffer.from(image.data,'base64')),t.inputSHA);
 tasks.push({...t,wire,...JSON.parse(await fs.readFile(t.prefix+'.task.json','utf8'))});
}
assert.equal(tasks.length,3);
const keyfile=process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE;
assert(keyfile,'Existing credential file reference not configured; no call/claim created');
const key=extractGeminiKey(await fs.readFile(keyfile,'utf8'));
await fs.writeFile(path.join(privateDir,'pilot-single-attempt.claim'),JSON.stringify({createdAt:new Date().toISOString(),preflightSHA:sha(await fs.readFile(preflightPath)),calls:3,retries:0}),{flag:'wx',mode:0o600});
const ledger:any[]=[];let active=0,peak=0,writes=Promise.resolve();const start=performance.now();
const persist=()=>{const snapshot=structuredClone(ledger);writes=writes.then(()=>save(ledgerPath,snapshot));return writes;};
await Promise.all(tasks.map(async t=>{
 const row:any={variant:t.variant,inputSHA:t.inputSHA,bodySHA:t.bodySHA,state:'started',startedAt:new Date().toISOString()};
 ledger.push(row);await persist();active++;peak=Math.max(peak,active);const begin=performance.now();
 try{
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',{
   method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:t.wire,signal:AbortSignal.timeout(180000),redirect:'error'});
  const bytes=Buffer.from(await r.arrayBuffer());await fs.writeFile(t.prefix+'.native.json',bytes,{mode:0o600});
  Object.assign(row,{http:r.status,ms:Math.round(performance.now()-begin),rawSHA:sha(bytes)});
  const native=JSON.parse(bytes.toString());row.usage=native.usageMetadata??null;row.modelVersion=native.modelVersion??null;row.finish=native.candidates?.[0]?.finishReason??null;
  if(!r.ok){row.state='http-failure';return;}
  const text=native.candidates?.[0]?.content?.parts?.filter((p:any)=>p.text&&!p.thought).map((p:any)=>p.text).join('');
  await save(t.prefix+'.parsed.json',JSON.parse(text));
  const trace:any={id:'gemini-game-wire-v1',items:[],deferred:[]};
  const decoded=decodeGeminiGameObservation(native,t.request,t.definition,trace);
  await save(t.prefix+'.decoded.json',decoded);await save(t.prefix+'.trace.json',trace);
  row.state='decoded';row.observations=decoded.observations.length;row.decodedSHA=sha(await fs.readFile(t.prefix+'.decoded.json'));
 }catch(e){row.state='request-or-decode-failure';row.errorName=(e as Error).name;row.ms=Math.round(performance.now()-begin);}
 finally{active--;row.finishedAt=new Date().toISOString();await persist();console.log(JSON.stringify(row));}
}));
await persist();await save(path.join(root,'pilot-execution.json'),{attempts:ledger.length,retries:0,peak,wallMs:Math.round(performance.now()-start),model:'gemini-3.8-flash',productChanges:0,appSessionWrites:0});
