// Read-only product preparation; exact original pixels, no provider/authentication.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {effectiveRecognitionPack} from '../../shared/recognition';import {catalogPacks} from '../../gamepacks/catalog';import {photoDefinition} from '../../server/photoDefinitions';
import {prepareScanObservation} from '../../server/scanObservation';import {TerraGameReader,buildTerraGameBody} from '../../server/ai/terraGameReader';
import type {Session,Evidence} from '../../shared/types';
const out='docs/terra-ten-game-evaluation-20261030',sha=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex');
try{await fs.access(out+'/preflight.json');throw Error('Preflight exists; never replace frozen experiment');}catch(e){if((e as any).code!=='ENOENT')throw e;}
const plan=JSON.parse(await fs.readFile(out+'/selection.json','utf8')),evaluation=JSON.parse(await fs.readFile(out+'/evaluation-preflight.json','utf8'));
assert.equal(plan.cases.length,10);assert.equal(evaluation.rows.length,10);assert.equal(sha(await fs.readFile(out+'/selection.json')),evaluation.selectionSHA);
const write=async(name:string,v:any)=>fs.writeFile(path.join(plan.privateDir,name),JSON.stringify(v,null,2)+'\n',{mode:0o600}),calls:any[]=[];
for(const c of plan.cases){
 const original=await fs.readFile(c.path);assert.equal(sha(original),c.sourceSHA);const reference=evaluation.rows.find((r:any)=>r.gameId===c.gameId);assert.equal(sha(await fs.readFile(reference.referencePath)),reference.referenceSHA);
 const cropPath=path.join(plan.privateDir,c.gameId+'.roi.png'),start=performance.now();
 const imageInfo=JSON.parse(execFileSync('python3',['-B','-c','from PIL import Image; import sys,json; im=Image.open(sys.argv[1]); im.crop(tuple(map(int,sys.argv[3:7]))).save(sys.argv[2],"PNG"); print(json.dumps({"mime":"image/"+{"JPEG":"jpeg","PNG":"png","WEBP":"webp"}[im.format],"width":im.width,"height":im.height}))',c.path,cropPath,...c.roiPx.map(String)],{encoding:'utf8'}));await fs.chmod(cropPath,0o600);
 assert.equal(imageInfo.width,c.width);assert.equal(imageInfo.height,c.height);const preprocessingMs=performance.now()-start,crop=await fs.readFile(cropPath),[x,y,x2,y2]=c.roiPx;
 const pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id===c.gameId)!),definition=photoDefinition(pack),scope=c.partition==='owner_private'?'player':'public';
 const evidence=[{id:c.gameId+'-whole',kind:'photo',url:c.path,scope,...(c.ownerId?{ownerId:c.ownerId}:{}),captureEpoch:'frozen-epoch',label:'whole'},
  {id:c.gameId+'-roi',kind:'photo',url:cropPath,scope,...(c.ownerId?{ownerId:c.ownerId}:{}),captureEpoch:'frozen-epoch',label:'ROI',sourceEvidenceId:c.gameId+'-whole',sourceRegion:{x:x/c.width,y:y/c.height,width:(x2-x)/c.width,height:(y2-y)/c.height}}] as Evidence[];
 const session={id:c.gameId+'-isolated-evaluation',captureEpoch:'frozen-epoch',turnInstanceId:'frozen-turn',gamePack:pack,gamePackId:pack.id,gamePackVersion:pack.version,assertions:[],evidence,players:c.ownerId?[{id:c.ownerId,name:'시험 소유자'}]:[],notes:{},activity:[],preservations:[],snapshots:[],stage:'capture'} as unknown as Session;
 const reader=new TerraGameReader({key:async()=>{throw Error('prepare cannot authenticate');}}),readImage=async(e:Evidence)=>({data:e.id.endsWith('-whole')?original:crop,mimeType:e.id.endsWith('-whole')?imageInfo.mime:'image/png'});
 const scan=await prepareScanObservation({session,pack,evidence,selection:{kind:'terra-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:c.areaId},taskId:c.gameId+'-ten-game-v2',reader,cloud:false,readImage});
 await write(c.gameId+'.task.json',{session,pack,scan,evidence});const bodies:any[]=[];
 for(const [i,variant] of ['whole','roi'].entries()){
  const p=scan.units[i].hosted!,im=await readImage(evidence[i]),body=buildTerraGameBody(p.request,p.definition,im.data,im.mimeType);bodies.push(body);await write(c.gameId+'.'+variant+'.request.json',body);
  calls.push({id:c.gameId+'-'+variant,gameId:c.gameId,variant,unitIndex:i,bodySHA:sha(JSON.stringify(body)),inputSHA:sha(im.data),sourceSHA:c.sourceSHA,inputPath:variant==='whole'?c.path:cropPath,mimeType:im.mimeType,width:p.request.images[0].width,height:p.request.images[0].height,definitionSHA:definition.definitionSHA,areaId:c.areaId,partition:c.partition,ownerId:c.ownerId,roiPx:c.roiPx,preprocessingMs,taskPath:path.join(plan.privateDir,c.gameId+'.task.json'),taskSHA:sha(await fs.readFile(path.join(plan.privateDir,c.gameId+'.task.json'))),requestPath:path.join(plan.privateDir,c.gameId+'.'+variant+'.request.json'),referencePath:reference.referencePath,referenceSHA:reference.referenceSHA});
 }
 const strip=(body:any)=>{const v=structuredClone(body);v.input[0].content[1].image_url='IMAGE';return v;};assert.deepEqual(strip(bodies[0]),strip(bodies[1]));
}
const files=['server/ai/terraGameReader.ts','server/ai/geminiGameReader.ts','server/ai/observationAssembly.ts','server/scanObservation.ts','server/observationFusion.ts','server/hostedObservation.ts','server/photoDefinitions.ts','shared/scanObservation.ts','shared/photoGeometry.ts','shared/recognition.ts','shared/lightweightRecognition.ts','game-photo-definitions/index.json','gamepacks/generated/game-essentials.json'];
const sourceFiles=await Promise.all(files.map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
const pre={version:'terra-ten-v2-preflight',frozenAt:new Date().toISOString(),privateDir:plan.privateDir,selectionSHA:sha(await fs.readFile(out+'/selection.json')),referencePreflightSHA:sha(await fs.readFile(out+'/evaluation-preflight.json')),calls,maxCalls:20,peak:2,retries:0,model:readerIdentity(),sameBodyWithinPairExceptImage:true,externalUpscale:false,sourceFiles,apiCalls:0};
function readerIdentity(){return new TerraGameReader({key:async()=>{throw Error('offline');}}).identity;}
await fs.writeFile(out+'/preflight.json',JSON.stringify(pre,null,2)+'\n');console.log(JSON.stringify({games:10,requests:calls.length,peak:2,retries:0,preflightSHA:sha(await fs.readFile(out+'/preflight.json')),bodyEquality:true,providerCalls:0}));
