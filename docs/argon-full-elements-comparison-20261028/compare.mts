// Isolated model-only experiment. Never writes application sessions or changes production settings.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {catanScenePrompt,catanSceneResponseSchema} from '../../server/ai/catanSceneReading.ts';
import {buildGeminiGameBody,extractGeminiKey} from '../../server/ai/geminiGameReader.ts';
import {catalogPacks} from '../../gamepacks/catalog.ts';
import {photoDefinition} from '../../server/photoDefinitions.ts';
import {effectiveRecognitionPack} from '../../shared/recognition.ts';
import {compileObservationTask} from '../../shared/lightweightRecognition.ts';
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const args=process.argv.slice(2),option=(k:string)=>args[args.indexOf(k)+1];
const mode=option('--mode'),dir=option('--data-dir');
if(!['check','execute'].includes(mode)||!dir||!path.isAbsolute(dir)||dir.includes('/.keepboard'))throw Error('Use --mode check|execute --data-dir /private/tmp/...');
await fs.mkdir(dir,{recursive:true,mode:0o700});await fs.chmod(dir,0o700);
const save=async(name:string,data:unknown)=>fs.writeFile(path.join(dir,name),JSON.stringify(data,null,2)+'\n',{mode:0o600});
const models=['gemini-3.8-flash','gemini-4-argon'];
let cases:any[];
if(args.includes('--catan')){
 const view=JSON.parse(await fs.readFile('/private/tmp/kb-photo-no-result-20261028/latest-user-native-before.json','utf8'));
 cases=[{gameId:'catan-user',packId:'catan-base',path:'/private/tmp/kb-photo-flow-ui-data/uploads/430efca5-a94c-49f2-9b20-303e0e65e54d.jpeg',sourceSHA:'29f02bc870a2ef7cd4ec8425d50f4f6d552288564306c04c42664ae7bb6a3dee',mime:'image/jpeg',view}];
}else cases=JSON.parse(await fs.readFile(option('--manifest'),'utf8')).cases;
if(!cases.length||cases.length>30||new Set(cases.map(c=>c.gameId)).size!==cases.length)throw Error('Expected 1–30 distinct games');
const prepared=[];
for(const c of cases){
 const image=await fs.readFile(c.path);if(sha(image)!==c.sourceSHA)throw Error('Source drift '+c.gameId);
 let body:any;
 if(c.view){const {session,pack}=c.view;const evidence=session.evidence;body={contents:[{role:'user',parts:[{text:catanScenePrompt(session,pack,evidence)},{inlineData:{mimeType:c.mime,data:image.toString('base64')}}]}],generationConfig:{candidateCount:1,maxOutputTokens:32768,thinkingConfig:{thinkingLevel:'LOW'},mediaResolution:'MEDIA_RESOLUTION_HIGH',responseFormat:{text:{mimeType:'APPLICATION_JSON',schema:catanSceneResponseSchema(evidence)}}}};}
 else{
  const raw=catalogPacks.find(p=>p.id===c.packId);if(!raw)throw Error('Pack missing');const pack=effectiveRecognitionPack(raw);const definition=photoDefinition(pack);
  const request=compileObservationTask({pack,definition,areaId:c.areaId,taskId:'model-only-'+c.gameId,scope:{partition:c.partition,ownerId:c.ownerId??null,captureEpoch:'model-only'},images:[{evidenceId:'photo-'+c.gameId,inputId:'photo-'+c.gameId,sha256:c.sourceSHA,width:c.width,height:c.height,transformId:null}]});
  body=buildGeminiGameBody(request,definition,image,c.mime);
 }
 const wire=JSON.stringify(body);await fs.writeFile(path.join(dir,c.gameId+'.request.json'),wire,{mode:0o600});
 prepared.push({gameId:c.gameId,sourceSHA:c.sourceSHA,bodySHA:sha(wire),wire});
}
const plan={models,modelOnly:true,settings:{thinking:'LOW',imageResolution:'HIGH',maxOutputTokens:32768},automaticRetries:0,cases:prepared.map(({wire,...r})=>r),calls:prepared.length*models.length};
await save('plan.json',plan);console.log(JSON.stringify({mode,cases:prepared.length,calls:plan.calls,planSHA:sha(JSON.stringify(plan))}));
if(mode==='check')process.exit(0);
const keyPath=process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE;if(!keyPath)throw Error('Key file path required');
const key=extractGeminiKey(await fs.readFile(keyPath,'utf8'));
const ledgerPath=path.join(dir,'ledger.json');let ledger:any[]=[];try{ledger=JSON.parse(await fs.readFile(ledgerPath,'utf8'));}catch{}
for(const c of prepared)for(const model of models){
 if(ledger.some(x=>x.gameId===c.gameId&&x.model===model))continue;
 const row:any={gameId:c.gameId,model,bodySHA:c.bodySHA,sourceSHA:c.sourceSHA,state:'started',startedAt:new Date().toISOString()};ledger.push(row);await save('ledger.json',ledger);
 const start=performance.now();
 try{
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:c.wire,signal:AbortSignal.timeout(240000),redirect:'error'});
  const bytes=Buffer.from(await response.arrayBuffer());row.httpStatus=response.status;row.ms=Math.round(performance.now()-start);row.rawSHA=sha(bytes);await fs.writeFile(path.join(dir,c.gameId+'.'+model+'.native.json'),bytes,{mode:0o600});
  row.state=response.ok?'received':'http-failure';
  if(response.ok){try{const native=JSON.parse(bytes.toString());row.usage=native.usageMetadata;row.finishReason=native.candidates?.[0]?.finishReason;const text=native.candidates?.[0]?.content?.parts?.filter((p:any)=>p.text&&!p.thought).map((p:any)=>p.text).join('');const parsed=JSON.parse(text);await save(c.gameId+'.'+model+'.parsed.json',parsed);const objects=parsed.items??parsed.assertions?.flatMap((a:any)=>a.value?.components??[])??[];row.counts=objects.reduce((out:any,x:any)=>(out[x.kind]=(out[x.kind]??0)+1,out),{});}catch{row.state='parse-failure';}}
 }catch(e){row.state='network-failure';row.error=e instanceof Error?e.name:'unknown';row.ms=Math.round(performance.now()-start);}
 await save('ledger.json',ledger);console.log(JSON.stringify(row));
 if(['http-failure','network-failure'].includes(row.state))process.exit(2);
}
