// Construct genuine reader requests using frozen bytes; intercept transport before network.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {GeminiGameReader} from '../../server/ai/geminiGameReader.ts';import {photoDefinition} from '../../server/photoDefinitions.ts';import {effectiveRecognitionPack} from '../../shared/recognition.ts';
const mode=process.argv[2];assert(['before','after'].includes(mode));const dir=new URL('./',import.meta.url),root=process.env.HOME+'/Library/Application Support/KeepBoard/research/max-parallel-20261029';
const results=JSON.parse(await fs.readFile(root+'/cap-5-results.json','utf8')),session=JSON.parse(await fs.readFile(root+'/cap-5-saved.json','utf8'));session.assertions=session.assertions.filter((a:any)=>a.basis==='rule');
const pack=effectiveRecognitionPack(session.gamePack),definition=photoDefinition(pack),inputs=JSON.parse(await fs.readFile(new URL('../whole-detail-parallel-20261029/input-plan.json',dir),'utf8')).inputs;
const reader=new GeminiGameReader(),rows:any[]=[];let index=0;
const originalFetch=globalThis.fetch,oldFile=process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE,oldKey=process.env.GEMINI_API_KEY;
delete process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE;process.env.GEMINI_API_KEY='synthetic-no-network';
const sha=(x:any)=>createHash('sha256').update(x).digest('hex');
globalThis.fetch=async(url:any,init:any)=>{assert(String(url).startsWith('https://generativelanguage.googleapis.com/'));const body=JSON.parse(init.body);rows[index]={index,requestBodySHA:sha(init.body),modelURL:String(url),generationConfigSHA:sha(JSON.stringify(body.generationConfig))};throw Error('INTERCEPTED_NO_NETWORK');};
try{for(index=0;index<5;index++){
 const receipt=results[index].observationReceipts[0],bytes=await fs.readFile(inputs[index].path);assert.equal(sha(bytes),inputs[index].sha256);
 try{if(index===0)await reader.readCatanScene(receipt.request,definition,session,pack,session.evidence.filter((e:any)=>e.id===inputs[index].evidenceId||e.id===receipt.request.images[0].evidenceId),bytes,inputs[index].mimeType);else await reader.read(receipt.request,definition,bytes,inputs[index].mimeType,receipt.transforms);assert.fail('Transport unexpectedly completed');}catch(e){assert.equal((e as Error).message,'INTERCEPTED_NO_NETWORK');}
}}finally{globalThis.fetch=originalFetch;if(oldFile===undefined)delete process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE;else process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE=oldFile;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;}
const report={status:'PASS_NO_NETWORK',actualProviderCalls:0,intercepted:rows};
if(mode==='after'){const baseline=JSON.parse(await fs.readFile(new URL('reading-body-before.json',dir),'utf8'));assert.deepEqual(report,baseline,'The model request contract changed');}
await fs.writeFile(new URL('reading-body-'+mode+'.json',dir),JSON.stringify(report,null,2)+'\n');console.log(report.status,rows.length,'intercepted; real calls 0');
