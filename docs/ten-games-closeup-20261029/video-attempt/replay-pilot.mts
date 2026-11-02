// Saved responses only; fail closed if any external fetch is attempted.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {catalogPacks} from '../../../gamepacks/catalog.ts';import {effectiveRecognitionPack} from '../../../shared/recognition.ts';
import {photoDefinition} from '../../../server/photoDefinitions.ts';
import {GeminiGameReader,buildGeminiGameBody,decodeGeminiGameObservation} from '../../../server/ai/geminiGameReader.ts';
import {prepareScanObservation,analyzeScanUnit,projectScanResults} from '../../../server/scanObservation.ts';
const root=path.dirname(new URL(import.meta.url).pathname),priv='/private/tmp/kb-ten-games-closeup-video-20261030',sha=(b:any)=>createHash('sha256').update(b).digest('hex');
const plan=JSON.parse(await fs.readFile(path.join(root,'pilot-inputs.json'),'utf8')),pre=JSON.parse(await fs.readFile(path.join(root,'pilot-preflight.json'),'utf8'));
const pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id==='splendor')!),definition=photoDefinition(pack);
const images=new Map(await Promise.all(plan.images.map(async(i:any)=>[i.sha256,{...i,data:await fs.readFile(i.path)}])));
globalThis.fetch=async()=>{throw Error('External fetch forbidden in saved-response replay');};
class SavedReader extends GeminiGameReader{
 async status(){return {kind:'gemini-game-observation-v1' as const,available:true,cloudSupported:true as const,identity:this.identity};}
 async read(request:any,def:any,image:Buffer,mime:string,transforms:any[]=[]){
  const t=pre.tasks.find((t:any)=>t.inputSHA===sha(image));assert(t);
  assert.equal(sha(JSON.stringify(buildGeminiGameBody(request,def,image,mime))),t.bodySHA,'Replay must use exact same provider body');
  const native=JSON.parse(await fs.readFile(t.prefix+'.native.json','utf8')),trace:any={id:'gemini-game-wire-v1',items:[],deferred:[]};
  return {raw:decodeGeminiGameObservation(native,request,def,trace,transforms),hostedWire:trace,timings:{readerMs:0}};
 }
}
const reader=new SavedReader(),evidence:any[]=plan.images.map((i:any)=>({id:'splendor-'+i.variant,url:'/'+i.variant,kind:'photo',scope:'public',captureEpoch:'pilot',label:i.variant,
 ...(i.variant==='C'?{sourceEvidenceId:'splendor-W',sourceRegion:plan.sourceRegion}:{})}));
const session:any={id:'isolated-saved-closeup-pilot',name:'saved-response-replay',gamePack:pack,gamePackId:pack.id,gamePackVersion:pack.version,captureEpoch:'pilot',turnInstanceId:'turn',stage:'capture',players:[],evidence,assertions:[],notes:{},activity:[],preservations:[],snapshots:[]};
const readImage=async(e:any)=>{const i=plan.images.find((i:any)=>'splendor-'+i.variant===e.id);return {data:(images.get(i.sha256) as any).data,mimeType:i.mimeType};};
const scan=await prepareScanObservation({session,pack,evidence,selection:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'market'},taskId:'saved-closeup-pilot',reader,cloud:false,readImage});
const results=[];for(let index=0;index<scan.units.length;index++)results.push(await analyzeScanUnit({session,pack,scan,index,evidence,reader,readImage}));
assert(results.every(r=>r.scanBundle?.units[0].state==='completed'),'Saved unit replay failed; never report empty failure as projection success');
const rows=[];
for(const [label,indices]of [['W',[0]],['W+C',[0,1]],['W+D',[0,2]]] as const){
 const projection=projectScanResults(session,pack,scan,indices.map(i=>results[i]));
 const f=path.join(priv,'pilot-projection-'+label.replace('+','-')+'.json');await fs.writeFile(f,JSON.stringify(projection,null,2)+'\n',{mode:0o600});
 rows.push({condition:label,path:f,sha256:sha(await fs.readFile(f)),assertionFields:projection.assertions.map((a:any)=>a.field),receiptCount:projection.observationReceipts.length,
  groups:(projection.scanBundle.unresolvedGroups??[]).map((g:any)=>({status:g.status,reason:g.reason,members:g.members?.length??0})),
  editableObjects:projection.assertions.reduce((n:number,a:any)=>n+(a.value?.components?.length??a.value?.pieces?.length??0),0)});
}
await fs.writeFile(path.join(root,'pilot-projection.json'),JSON.stringify({calls:0,externalFetchForbidden:true,providerBodiesIdentical:true,rows,
 limitation:'Offline current projector only; no app session/store/UI save test. Independent D has no automatic cross-view registration; editable row count is not reading accuracy.'},null,2)+'\n');
console.log(JSON.stringify(rows));
