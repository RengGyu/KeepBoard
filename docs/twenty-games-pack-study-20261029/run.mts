// Isolated study: current production body+decoder; no sessions, product writes or retries.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {catalogPacks} from '../../gamepacks/catalog.ts';
import {photoDefinition} from '../../server/photoDefinitions.ts';
import {effectiveRecognitionPack} from '../../shared/recognition.ts';
import {compileObservationTask} from '../../shared/lightweightRecognition.ts';
import {buildGeminiGameBody,decodeGeminiGameObservation,extractGeminiKey} from '../../server/ai/geminiGameReader.ts';
const root=path.dirname(new URL(import.meta.url).pathname), privateDir=path.join(os.homedir(),'Library/Application Support/KeepBoard/research/twenty-games-pack-study-20261029');
const sha=(x:Buffer|string)=>createHash('sha256').update(x).digest('hex');
const save=async(p:string,v:unknown)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n',{mode:0o600});
const args=process.argv.slice(2), execute=args.includes('--execute'), augment=args.includes('--augment');
if(execute&&args.includes('--initial-check'))throw Error('Reference freeze required');
const selected=JSON.parse(await fs.readFile(path.join(root,'selection-preflight.json'),'utf8')).cases;
const refs:any[]=args.includes('--initial-check')?selected:[];
for(const g of (args.includes('--initial-check')?[]:['sol1','sol2'])){const r=JSON.parse(await fs.readFile(path.join(root,'references-'+g+'.json'),'utf8'));refs.push(...(Array.isArray(r)?r:r.cases??r.games));}
const additions=augment?JSON.parse(await fs.readFile(path.join(root,'astra/augmentations.json'),'utf8')):null;
const addRows=additions?(Array.isArray(additions)?additions:additions.cases??additions.augmentations):[];
const cases=augment?selected.filter((c:any)=>addRows.some((a:any)=>a.gameId===c.gameId)):selected;
if(cases.length!==(augment?4:20))throw Error('Expected exact bounded call count');
const tasks=[];
for(const c of cases){
 const ref=refs.find(r=>r.gameId===c.gameId);if(!ref)throw Error('Reference absent '+c.gameId);
 const bytes=await fs.readFile(c.path);if(sha(bytes)!==c.sourceSHA)throw Error('Photo drift');
 const pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id===c.packId)!);const definition=photoDefinition(pack);
 const areaId=ref.areaId??c.areaId, partition=ref.partition??c.partition;
 const request=compileObservationTask({pack,definition,areaId,taskId:'twenty-study-'+c.gameId,scope:{partition,ownerId:partition==='owner_private'?'study-owner-'+c.gameId:null,captureEpoch:'study'},images:[{evidenceId:'photo-'+c.gameId,inputId:'photo-'+c.gameId,sha256:c.sourceSHA,width:c.width,height:c.height,transformId:null}]});
 const body=buildGeminiGameBody(request,definition,bytes,c.mime);
 const appendix=addRows.find((a:any)=>a.gameId===c.gameId);
 if(appendix){const text=appendix.promptAppendix??appendix.text;if(typeof text!=='string'||!text.length)throw Error('Appendix absent');body.contents[0].parts[0].text+='\n\n'+text;}
 const wire=JSON.stringify(body), variant=augment?'augmented':'baseline';
 const out=path.join(privateDir,c.gameId+'.'+variant);
 await fs.writeFile(out+'.request.json',wire,{mode:0o600});await save(out+'.task.json',{request,definition});
 tasks.push({gameId:c.gameId,sourceSHA:c.sourceSHA,bodySHA:sha(wire),referenceSHA:sha(JSON.stringify(ref)),areaId,partition,variant,out,wire,request,definition});
}
const plan={model:'gemini-3.8-flash',thinking:'LOW',resolution:'HIGH',maxOutputTokens:32768,maxConcurrency:5,retries:0,isolatedCurrentProductBodyAndDecoder:true,calls:tasks.length,cases:tasks.map(({wire,request,definition,...t})=>t)};
await save(path.join(root,args.includes('--initial-check')?'initial-request-check.json':augment?'augmented-plan.json':'baseline-plan.json'),plan);
console.log(JSON.stringify({prepared:tasks.length,execute,variant:augment?'augmented':'baseline'}));if(!execute)process.exit(0);
const keyfile=process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE;if(!keyfile)throw Error('Key path required');const key=extractGeminiKey(await fs.readFile(keyfile,'utf8'));
const ledgerPath=path.join(root,augment?'augmented-ledger.json':'baseline-ledger.json');let ledger:any[]=[];try{ledger=JSON.parse(await fs.readFile(ledgerPath,'utf8'));}catch{}
let next=0,stopped=false,active=0,peak=0;const allStart=performance.now();
async function worker(){while(next<tasks.length&&!stopped){const t=tasks[next++];if(ledger.some(r=>r.gameId===t.gameId))continue;const row:any={gameId:t.gameId,variant:t.variant,bodySHA:t.bodySHA,sourceSHA:t.sourceSHA,state:'started',startedAt:new Date().toISOString()};ledger.push(row);await save(ledgerPath,ledger);const start=performance.now();active++;peak=Math.max(peak,active);
 try{const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:t.wire,signal:AbortSignal.timeout(180000),redirect:'error'});const b=Buffer.from(await response.arrayBuffer());Object.assign(row,{httpStatus:response.status,ms:Math.round(performance.now()-start),rawSHA:sha(b)});await fs.writeFile(t.out+'.native.json',b,{mode:0o600});if(!response.ok){row.state='http-failure';stopped=true;}else{const native=JSON.parse(b.toString());row.usage=native.usageMetadata;row.finishReason=native.candidates?.[0]?.finishReason;row.modelVersion=native.modelVersion;const txt=native.candidates?.[0]?.content?.parts?.filter((p:any)=>p.text&&!p.thought).map((p:any)=>p.text).join('');await save(t.out+'.parsed.json',JSON.parse(txt));try{const result=decodeGeminiGameObservation(native,t.request,t.definition);await save(t.out+'.decoded.json',result);row.state='decoded';row.observations=result.observations.length;}catch(e){row.state='decode-failure';row.decodeError=(e as Error).message;}}
 }catch(e){row.state='request-or-parse-failure';row.error=(e as Error).name;row.ms=Math.round(performance.now()-start);stopped=true;}finally{active--;await save(ledgerPath,ledger);console.log(JSON.stringify(row));}
 }}
await Promise.all(Array.from({length:5},worker));await save(ledgerPath,ledger);await save(path.join(root,augment?'augmented-execution.json':'baseline-execution.json'),{ms:Math.round(performance.now()-allStart),peak,attempts:ledger.length,stopped,rows:ledger.map(({usage,...r})=>r)});
