// Same-image HTTP replay of preparation only: no model calls, no writes to the service.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {catalogPacks} from '../../gamepacks/catalog.ts';
import {photoDefinition} from '../../server/photoDefinitions.ts';
import {GeminiGameReader} from '../../server/ai/geminiGameReader.ts';
import {prepareScanObservation as current} from '../../server/scanObservation.ts';
const metadata=JSON.parse(await readFile(new URL('../release-next-20261029/stage.json',import.meta.url),'utf8'));
const priorFile=metadata.stage+'/server/scanObservation.ts';
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(await readFile(priorFile)),'bfbbc233354a58a1be68db9379b2f5f30c71171d10a476b53c17110fd1d64365');
const {prepareScanObservation:previous}=await import(pathToFileURL(priorFile).href);
const pack=catalogPacks.find(p=>p.id==='catan-base')!,definition=photoDefinition(pack);
const evidence={id:'fixed-original',kind:'photo',scope:'public',captureEpoch:'fixed-epoch',url:'/uploads/584d47d6-ca37-4053-abde-fe6b9cd28adb.jpeg',capturedAt:'2026-10-29',label:'same original preparation replay'} as const;
const session={id:'network-preparation-only',captureEpoch:evidence.captureEpoch,players:[],assertions:[],evidence:[evidence]};
const identity=new GeminiGameReader().identity,reader={identity,status:async()=>({available:true})};
const sourceSHA='28ce72a474b4cd06f0995427a53a1c8ab815e0c3e3fa656143f91836c8254dbc';
const results:unknown[]=[],plans:unknown[]=[];
// ABBA limits an obvious first-connection order bias; still a small replay, not a model benchmark.
for(const condition of ['previous','current','current','previous']){
 let reads=0;const networkMs:number[]=[];let imageBytes=0;
 const readImage=async()=>{
  reads++;const at=performance.now();const r=await fetch('https://keepboard-kappa.vercel.app'+evidence.url,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);
  const data=Buffer.from(await r.arrayBuffer());assert.equal(sha(data),sourceSHA);networkMs.push(performance.now()-at);imageBytes+=data.length;return {data,mimeType:'image/jpeg'};
 };
 const at=performance.now();
 const plan=await (condition==='previous'?previous:current)({session,pack,evidence:[evidence],selection:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'board'},taskId:'fixed-plan',reader,cloud:true,readImage} as any);
 results.push({condition,preparationWallMs:performance.now()-at,photoHTTPReads:reads,imageBytesDownloaded:imageBytes,networkMs});plans.push(plan);
}
for(const plan of plans)assert.deepEqual(plan,plans[0]);
const report={at:new Date().toISOString(),sourceSHA,modelCalls:0,serviceWrites:0,mode:'real-image HTTP replay; reader status stub; no provider generation',plansDeepEqual:true,requestAndPlanSHA:sha(JSON.stringify(plans[0])),results,limitations:['HTTP photo delivery is replayed, not the internal BlobStore readEvidence transport.','No model generation, recognition accuracy or end-to-end speed claim.','Two runs per condition; latency and cache/network effects remain variable.']};
await writeFile(new URL('./network-preparation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
