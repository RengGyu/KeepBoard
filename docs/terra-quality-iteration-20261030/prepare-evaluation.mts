// Research only. Produces frozen requests, never authenticates or sends a request.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {effectiveRecognitionPack} from '../../shared/recognition';import {catalogPacks} from '../../gamepacks/catalog';import {photoDefinition} from '../../server/photoDefinitions';
import {prepareScanObservation} from '../../server/scanObservation';import {TerraGameReader,buildTerraGameBody} from '../../server/ai/terraGameReader';
import type {Session,Evidence} from '../../shared/types';
const out='docs/terra-quality-iteration-20261030',sha=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex');
const selection=JSON.parse(await fs.readFile(out+'/selection.json','utf8')),evaluation=JSON.parse(await fs.readFile(out+'/evaluation-preflight.json','utf8'));
assert.equal(sha(await fs.readFile(out+'/selection.json')),evaluation.selectionSHA);assert.equal(selection.cases.length,3);
await fs.writeFile(path.join(selection.privateDir,'prepare.claim'),'no calls',{flag:'wx',mode:0o600});
const write=async(name:string,v:any)=>{const p=path.join(selection.privateDir,name);await fs.writeFile(p,JSON.stringify(v,null,2)+'\n',{flag:'wx',mode:0o600});return p;};
const calls:any[]=[];
for(const c of selection.cases){
 const reference=evaluation.rows.find((r:any)=>r.gameId===c.gameId);assert.equal(sha(await fs.readFile(reference.referencePath)),reference.referenceSHA);
 const original=await fs.readFile(c.sourcePath),crop=await fs.readFile(c.cropPath);assert.equal(sha(original),c.sourceSHA);assert.equal(sha(crop),c.cropSHA);
 const [x,y,x2,y2]=c.roiPx,pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id===c.gameId)!),definition=photoDefinition(pack);
 const evidence=[{id:c.gameId+'-whole',kind:'photo',url:c.sourcePath,scope:'public',captureEpoch:'independent-epoch',label:'whole'},
  {id:c.gameId+'-roi',kind:'photo',url:c.cropPath,scope:'public',captureEpoch:'independent-epoch',label:'physical ROI',sourceEvidenceId:c.gameId+'-whole',sourceRegion:{x:x/c.width,y:y/c.height,width:(x2-x)/c.width,height:(y2-y)/c.height}}]as Evidence[];
 const session={id:c.gameId+'-quality-evaluation',captureEpoch:'independent-epoch',turnInstanceId:'independent-turn',gamePack:pack,gamePackId:pack.id,gamePackVersion:pack.version,assertions:[],evidence,players:[],notes:{},activity:[],preservations:[],snapshots:[],stage:'capture'}as unknown as Session;
 const reader=new TerraGameReader({key:async()=>{throw Error('Offline preparation cannot authenticate');}}),readImage=async(e:Evidence)=>({data:e.id.endsWith('-whole')?original:crop,mimeType:e.id.endsWith('-whole')?'image/jpeg':'image/png'});
 const scan=await prepareScanObservation({session,pack,evidence,selection:{kind:'terra-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:c.areaId},taskId:c.gameId+'-independent-v1',reader,cloud:false,readImage});
 const taskPath=await write(c.gameId+'.task.json',{session,pack,scan,evidence});
 const bodies:any[]=[];
 for(const [condition,unitIndex,effort]of [['A',0,'low'],['B',0,'medium'],['C',1,'low']]as const){
  const pinned=scan.units[unitIndex].hosted!,im=await readImage(evidence[unitIndex]),body=buildTerraGameBody(pinned.request,pinned.definition,im.data,im.mimeType);body.reasoning.effort=effort;bodies.push(body);
  const stripped=structuredClone(body);stripped.input[0].content[1].image_url='IMAGE';
  const nonImageUTF8=Buffer.byteLength(JSON.stringify(stripped));
  // Conservative planning allowance, not a server-enforced tokenizer guarantee. Terra 6.1 image table is not explicit.
  const inputPlanningUpper=nonImageUTF8+16384;assert(inputPlanningUpper<=32768,'Planning input allowance exceeded; stop before paid run');
  const requestPath=await write(c.gameId+'.'+condition+'.request.json',body);
  calls.push({id:c.gameId+'-'+condition,gameId:c.gameId,condition,effort,unitIndex,bodySHA:sha(JSON.stringify(body)),inputPath:unitIndex?c.cropPath:c.sourcePath,inputSHA:sha(im.data),sourceSHA:c.sourceSHA,mimeType:im.mimeType,width:pinned.request.images[0].width,height:pinned.request.images[0].height,roiPx:c.roiPx,areaId:c.areaId,partition:c.partition,ownerId:null,taskPath,taskSHA:sha(await fs.readFile(taskPath)),requestPath,referencePath:reference.referencePath,referenceSHA:reference.referenceSHA,nonImageUTF8,inputPlanningUpper,reservedInputTokens:32768,maxOutputTokens:32768,worstPlannedUSD:(32768*1.25+32768*5)/1e6});
 }
 const a=structuredClone(bodies[0]),b=structuredClone(bodies[1]),d=structuredClone(bodies[2]);b.reasoning.effort=a.reasoning.effort;assert.deepEqual(a,b);a.input[0].content[1].image_url='IMAGE';d.input[0].content[1].image_url='IMAGE';assert.deepEqual(a,d);
}
const order=['carcassonne-A','sagrada-B','carcassonne-B','sagrada-A','ticket-to-ride-A','ticket-to-ride-B','sagrada-C','carcassonne-C','ticket-to-ride-C'];
const files=['server/ai/terraGameReader.ts','server/ai/geminiGameReader.ts','server/ai/observationAssembly.ts','server/ai/response.ts','shared/lightweightRecognition.ts','shared/photoGeometry.ts','game-photo-definitions/index.json','gamepacks/generated/game-essentials.json'];
const pre={version:'terra-quality-three-condition-v1',frozenAt:new Date().toISOString(),authorization:'0beda3e6-5b39-4557-8b70-31d4d3a6e0fb',selectionSHA:sha(await fs.readFile(out+'/selection.json')),referencePreflightSHA:sha(await fs.readFile(out+'/evaluation-preflight.json')),privateDir:selection.privateDir,calls:order.map(id=>calls.find(c=>c.id===id)),maxCalls:9,peak:2,retries:0,maxCalculatedUSD:2,worstPlannedUSD:calls.reduce((n,c)=>n+c.worstPlannedUSD,0),inputEstimateCaveat:'UTF8 bytes for non-image body +16384 image/framing allowance; explicit gpt-6.1-terra image token multiplier not established by official table. Not a hard provider input cap or actual-bill guarantee.',model:'gpt-6.1-terra',sameABExceptEffort:true,sameACExceptImage:true,productDefaultEffort:'low',externalUpscale:false,sourceFiles:await Promise.all(files.map(async p=>({path:p,sha256:sha(await fs.readFile(p))}))),apiCalls:0};
await fs.writeFile(out+'/preflight.json',JSON.stringify(pre,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({calls:0,prepared:9,preflightSHA:sha(await fs.readFile(out+'/preflight.json')),worstPlannedUSD:pre.worstPlannedUSD,maxNonImageUTF8:Math.max(...calls.map(c=>c.nonImageUTF8)),maxInputPlanningUpper:Math.max(...calls.map(c=>c.inputPlanningUpper))}));
