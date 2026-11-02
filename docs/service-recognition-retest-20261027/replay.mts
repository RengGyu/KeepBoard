// Offline replay of the four original HTTP-200/native-decode failures. No reader.read(), fetch or key access.
import {createHash} from 'node:crypto';
import {mkdir,readFile,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';

const sha=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
const args=process.argv.slice(2);
const value=(flag:string)=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
const output=value('--out');
if(!output||!path.isAbsolute(output)||output.startsWith('/Users/jeonggyuju/Project_folder/KeepBoard')||output.includes('/.keepboard'))throw Error('Use --out with a private absolute directory outside the repository');
await mkdir(output,{recursive:true,mode:0o700});
if(((await stat(output)).mode&0o777)!==0o700)throw Error('Replay output directory must be 0700');
process.env.KEEPBOARD_DATA_DIR=output;
process.chdir(output); // Before product imports; never resolve the operational Store.
const manifestPath=new URL('./manifest.json',import.meta.url);
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const [{catalogPacks},{photoDefinition},{effectiveRecognitionPack},{compileObservationTask},{decodeGeminiGameObservation,hostedVisibleProperty,GeminiGameReader},{assembleObservations}]=await Promise.all([
 import('../../gamepacks/catalog.ts'),import('../../server/photoDefinitions.ts'),import('../../shared/recognition.ts'),import('../../shared/lightweightRecognition.ts'),import('../../server/ai/geminiGameReader.ts'),import('../../server/ai/observationAssembly.ts')
]);
const targets=manifest.caseMetadata.filter((row:any)=>row.group==='P0');
if(targets.length!==4||new Set(targets.map((row:any)=>row.gameId)).size!==4)throw Error('Expected four distinct frozen P0 failures');
const reader=new GeminiGameReader();
const rows=[] as any[];
for(const historical of targets){
 const c=manifest.cases.find((row:any)=>row.gameId===historical.gameId);
 if(!c||sha(await readFile(c.path))!==c.sourceSHA||sha(await readFile(c.referencePath))!==c.referenceSHA)throw Error(`Frozen source/reference mismatch: ${historical.gameId}`);
 const nativeBytes=await readFile(historical.originalNativePath);
 if(sha(nativeBytes)!==historical.originalNativeSHA)throw Error(`Frozen native response mismatch: ${historical.gameId}`);
 const native=JSON.parse(nativeBytes.toString());
 const raw=catalogPacks.find((p:any)=>p.id===c.packId&&p.runtime?.source.gameId===c.gameId);
 if(!raw)throw Error(`Current pack missing: ${c.gameId}`);
 const pack=effectiveRecognitionPack(raw),definition=photoDefinition(pack),area=definition.areas.find((a:any)=>a.id===c.areaId);
 if(!area||area.partition!==c.partition)throw Error(`Current area/scope mismatch: ${c.gameId}`);
 const request=compileObservationTask({pack,definition,areaId:c.areaId,taskId:'offline-replay',scope:{partition:c.partition,ownerId:c.ownerId??null,captureEpoch:'offline-replay'},images:[{evidenceId:'offline-replay',inputId:'offline-replay',sha256:c.sourceSHA,width:c.width,height:c.height,transformId:null}]});
 for(const component of definition.components)if(request.allowedPropertyIds[component.id])request.allowedPropertyIds[component.id]=request.allowedPropertyIds[component.id].filter((id:string)=>hostedVisibleProperty(component,id));
 const wireText=native.candidates?.[0]?.content?.parts?.filter((p:any)=>typeof p.text==='string').map((p:any)=>p.text).join('');
 let rawItems:any[]=[];try{const parsed=JSON.parse(wireText);if(Array.isArray(parsed.items))rawItems=parsed.items;}catch{}
 const row:any={gameId:c.gameId,sourceSHA:c.sourceSHA,referenceSHA:c.referenceSHA,nativeSHA:historical.originalNativeSHA,originalDefinitionSHA:historical.originalDefinitionSHA,currentDefinitionSHA:definition.definitionSHA,rawItemCount:rawItems.length,nativeFinish:native.candidates?.[0]?.finishReason??null,stage:'native-decode',observationCount:0,candidateCount:0,unknownPropertyCount:0,deferredPropertyCount:0,observedValuePreserved:null,rawWirePreserved:null,error:null};
 try{
  const hostedWire:{id:'gemini-game-wire-v1';items:unknown[];deferred:{ref:string;property:string;reason:string}[]}={id:'gemini-game-wire-v1',items:[],deferred:[]};
  const result=decodeGeminiGameObservation(native,request,definition,hostedWire);
  row.stage='assembly';row.observationCount=result.observations.length;
  row.unknownPropertyCount=result.observations.reduce((n:number,o:any)=>n+Object.values(o.properties).filter((v:any)=>v.state==='unknown').length,0);
  row.deferredPropertyCount=hostedWire.deferred.length;
  row.rawWirePreserved=JSON.stringify(hostedWire.items)===JSON.stringify(rawItems);
  row.observedValuePreserved=rawItems.length===result.observations.length&&result.observations.every((o:any,i:number)=>{
   const item=rawItems[i];if(o.ref!==`item-${i+1}`||o.componentId!==item.kind||o.quantity!==item.quantity)return false;
   return Object.entries(o.properties).every(([id,p]:[string,any])=>{if(p.state!=='observed')return true;const a=item.attributes.find((a:any)=>a.id===id);if(!a||a.valueJson===null)return false;try{return JSON.stringify(p.value)===JSON.stringify(JSON.parse(a.valueJson));}catch{return false;}});
  });
  const assembled=assembleObservations({request,result,definition,pack,turnInstanceId:'offline-replay',reader:reader.identity,sourceImageSHA:c.sourceSHA,hostedWire});
  row.stage='complete';row.candidateCount=assembled.assertions.length;row.candidateFields=assembled.assertions.map((a:any)=>a.field);row.receiptObservationCount=assembled.observationReceipts[0]?.result.observations.length??null;row.receiptRawItemCount=assembled.observationReceipts[0]?.hostedWire?.items.length??null;row.receiptDeferredCount=assembled.observationReceipts[0]?.hostedWire?.deferred.length??null;
 }catch(error){row.error=error instanceof Error?error.message:String(error);}
 rows.push(row);
}
const report={version:'offline-p0-replay-v1',providerCalls:0,manifestSHA:sha(await readFile(manifestPath)),readerSourceSHA:sha(await readFile(new URL('../../server/ai/geminiGameReader.ts',import.meta.url))),assemblySourceSHA:sha(await readFile(new URL('../../server/ai/observationAssembly.ts',import.meta.url))),rows};
const destination=path.join(output,'offline-p0-replay.json');
await writeFile(destination,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({providerCalls:0,manifestSHA:report.manifestSHA,readerSourceSHA:report.readerSourceSHA,complete:rows.filter(r=>r.stage==='complete').length,failed:rows.filter(r=>r.stage!=='complete').length,out:destination}));
