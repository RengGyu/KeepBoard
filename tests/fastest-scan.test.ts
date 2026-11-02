import test from 'node:test';import assert from 'node:assert/strict';
import {catalogPacks} from '../gamepacks/catalog';import {photoDefinition} from '../server/photoDefinitions';
import {GeminiGameReader,decodeGeminiGameObservation} from '../server/ai/geminiGameReader';
import {prepareScanObservation,analyzeScan,projectScanResults} from '../server/scanObservation';
import type {Session,Evidence} from '../shared/types';
const pack=catalogPacks.find(p=>p.id==='catan-base')!,def=photoDefinition(pack);
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=','base64');
function state(n=6){const evidence=Array.from({length:n},(_,i)=>({id:'e'+i,kind:'photo',scope:'public',captureEpoch:'epoch',url:'/x'+i,label:'synthetic'}) as Evidence);return {id:'s',captureEpoch:'epoch',turnInstanceId:'turn',evidence,assertions:[],players:[],notes:{},activity:[],snapshots:[],gamePack:pack} as unknown as Session;}
class Reader extends GeminiGameReader{
 active=0;peak=0;calls:string[]=[];ended:string[]=[];
 async status(){return {kind:'gemini-game-observation-v1' as const,available:true,cloudSupported:true as const,identity:this.identity};}
 async read(req:any,d:any,_image?:Buffer,_mime?:string,transforms:any[]=[]){this.calls.push(req.taskId);this.peak=Math.max(this.peak,++this.active);const i=Number(req.taskId.split('-').at(-1));await new Promise(r=>setTimeout(r,(6-i)*4));this.active--;this.ended.push(req.taskId);if(i===3)throw Error('synthetic failure');const body={candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({items:[{kind:'number-token',box_1000:[100,100,200,200],face:'front',quantity:1,attributes:[{id:'number',valueJson:String(8+i),unknownReason:null}]}]})}]}}]};return {raw:decodeGeminiGameObservation(body,req,d,undefined,transforms),hostedWire:{id:'gemini-game-wire-v1' as const,items:[],deferred:[]},timings:{readerMs:1}};}
}
test('hosted scan starts all six selected units, settles failures and preserves indexed source receipts',async()=>{
 const s=state(),reader=new Reader(),readImage=async(e:Evidence)=>({data:Buffer.concat([bytes,Buffer.from(e.id)]),mimeType:'image/png'});
 // Explicit target uses literal path on all units without changing production reader behavior.
 const scan=await prepareScanObservation({session:s,pack,evidence:s.evidence,selection:{kind:'gemini-game-observation-v1',definitionSHA:def.definitionSHA,areaId:'board'},taskId:'scan',reader,cloud:false,readImage});
 for(const u of scan.plan.units)u.role='detail';
 const results=await analyzeScan({scan,pack,session:s,evidence:s.evidence,reader,readImage});
 assert.equal(reader.peak,6);assert.equal(reader.calls.length,6);assert.equal(new Set(reader.calls).size,6);assert.equal(reader.ended[0],'scan-unit-5');
 assert.deepEqual(results.map(r=>r.scanBundle!.units[0].unitId),scan.plan.units.map(u=>u.id));assert.equal(results[3].scanBundle!.units[0].state,'failed');
 assert.deepEqual(results.flatMap(r=>r.observationReceipts?.map(x=>x.request.images[0].evidenceId)??[]),['e0','e1','e2','e4','e5']);
});
test('projection keeps anchor under attribute conflict, crop-only objects, stable ids and immutable raw regardless result order',async()=>{
 const s=state(2);s.evidence[1]={...s.evidence[1],sourceEvidenceId:'e0',sourceRegion:{x:0,y:0,width:1,height:1}};
 const reader=new Reader(),readImage=async(e:Evidence)=>({data:Buffer.concat([bytes,Buffer.from(e.id)]),mimeType:'image/png'}),scan=await prepareScanObservation({session:s,pack,evidence:s.evidence,selection:{kind:'gemini-game-observation-v1',definitionSHA:def.definitionSHA,areaId:'board'},taskId:'scan',reader,cloud:false,readImage});
 // Assemble real decoder results with repeated refs/IDs in distinct units.
 const results=[] as any[];
 for(let i=0;i<2;i++){
  const p=scan.units[i].hosted!,response=await reader.read(p.request,p.definition,undefined,undefined,p.transforms);
  const {assembleObservations}=await import('../server/ai/observationAssembly');const r=assembleObservations({request:p.request,result:response.raw,pack,definition:p.definition,turnInstanceId:'turn',reader:p.reader,transforms:p.transforms,sourceImageSHA:p.sourceImageSHA});
  r.observationReceipts![0].scanUnitId=scan.units[i].id;
  if(i===1){const o=structuredClone(r.observationReceipts![0].result.observations[0]);o.ref='extra';o.bbox={x:.6,y:.6,width:.1,height:.1};r.observationReceipts![0].result.observations.push(o);const c=structuredClone((r.assertions[0].value as any).components[0]);c.id='extra';c.region=o.bbox;(r.assertions[0].value as any).components.push(c);r.observationReceipts![0].componentRefs.extra='extra';}
  r.scanBundle={plan:scan.plan,units:[{unitId:scan.units[i].id,state:'completed',observationCount:i?2:1}],links:[]};results.push(r);
 }
 const before=JSON.stringify(results),a=projectScanResults(s,pack,scan,results),b=projectScanResults(s,pack,scan,[...results].reverse());
 assert(JSON.stringify(results)===before,'projection must not mutate incoming raw/refs');
 assert.deepEqual(a.assertions.map(x=>x.value),b.assertions.map(x=>x.value));assert.deepEqual(a.scanBundle,b.scanBundle);
 const objects=(a.assertions[0].value as any).components;assert.equal(objects.length,2);assert.equal(objects[0].number,8);assert(a.scanBundle!.links.some(l=>l.conflicts.includes('number')));
});
test('multiple anchor observations survive an ambiguous many-to-one crop match independently',async()=>{
 const s=state(2);s.evidence[1]={...s.evidence[1],sourceEvidenceId:'e0',sourceRegion:{x:0,y:0,width:1,height:1}};const reader=new Reader(),readImage=async(e:Evidence)=>({data:Buffer.concat([bytes,Buffer.from(e.id)]),mimeType:'image/png'}),scan=await prepareScanObservation({session:s,pack,evidence:s.evidence,selection:{kind:'gemini-game-observation-v1',definitionSHA:def.definitionSHA,areaId:'board'},taskId:'many',reader,cloud:false,readImage});
 const {assembleObservations}=await import('../server/ai/observationAssembly');const results=scan.units.map((u,i)=>{const p=u.hosted!,obs=(ref:string,x:number)=>({ref,imageIndex:0,inputId:p.request.images[0].inputId,componentId:'number-token',face:'front',quantity:1,bbox:{x,y:.1,width:.1,height:.1},coordinateSpace:'input-normalized',properties:{number:{state:'observed',value:8}},attachments:[]});
 // Decoder supplies strict observation structure; duplicate a valid observation instead of inventing fields.
 return {u,p,i};});
 const output=[] as any[];for(const {u,p,i}of results){const response=await reader.read(p.request,p.definition,undefined,undefined,p.transforms),raw=structuredClone(response.raw);if(i===0){const extra=structuredClone(raw.observations[0]);extra.ref='second';raw.observations.push(extra);}const r=assembleObservations({request:p.request,result:raw,pack,definition:p.definition,turnInstanceId:'t',reader:p.reader,transforms:p.transforms,sourceImageSHA:p.sourceImageSHA});r.observationReceipts![0].scanUnitId=u.id;r.scanBundle={plan:scan.plan,units:[{unitId:u.id,state:'completed',observationCount:raw.observations.length}],links:[]};output.push(r);}
 const projected=projectScanResults(s,pack,scan,output);assert.equal((projected.assertions[0].value as any).components.length,2);assert.equal(projected.scanBundle!.links.filter(l=>!!l.targetPieceId).length,2);
});
