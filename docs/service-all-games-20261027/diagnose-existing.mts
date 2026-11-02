// Reprocess existing native envelopes using the real decoder/assembler. No network and no model retries.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.argv[2];if(!root?.startsWith('/private/tmp/keepboard-service-all-games-'))throw Error('Private experiment directory required');
process.chdir(root);globalThis.fetch=(async()=>{throw Error('External calls disabled in offline diagnosis');}) as typeof fetch;
const {catalogPacks}=await import('../../gamepacks/catalog.ts'),{effectiveRecognitionPack}=await import('../../shared/recognition.ts'),{photoDefinition}=await import('../../server/photoDefinitions.ts'),{compileObservationTask}=await import('../../shared/lightweightRecognition.ts'),{decodeGeminiGameObservation,hostedVisibleProperty}=await import('../../server/ai/geminiGameReader.ts'),{assembleObservations}=await import('../../server/ai/observationAssembly.ts');
const results:any[]=[];
for(const file of (await readdir(root)).filter(f=>/^plan-.*\.json$/.test(f))){
 const plan=JSON.parse(await readFile(path.join(root,file),'utf8'));
 for(const c of plan.cases){
  const folder=path.join(root,'cases',c.gameId);let native:any;try{native=JSON.parse(await readFile(path.join(folder,'native-response.json'),'utf8'));}catch{continue;}
  const result:any={gameId:c.gameId,decode:'not-run',assembly:'not-run',nativeNullStringProperties:[]};
  if(native.error){
   result.failureStage=native.error.code===402?'provider-billing':'provider-http';result.providerCode=native.error.code;result.error=native.error.message;
   await writeFile(path.join(folder,'offline-diagnosis.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});results.push(result);continue;
  }
  try{
   const raw=catalogPacks.find(p=>p.id===c.packId)!;const pack=effectiveRecognitionPack(raw),definition=photoDefinition(pack,c.definitionSHA);
   const request=compileObservationTask({pack,definition,areaId:c.areaId,taskId:'offline-diagnosis',scope:{partition:c.partition,ownerId:c.ownerId,captureEpoch:'offline-diagnosis'},images:[{evidenceId:'offline-photo',inputId:'offline-photo',sha256:c.sourceSHA,width:c.width,height:c.height,transformId:null}]});
   for(const component of definition.components)if(request.allowedPropertyIds[component.id])request.allowedPropertyIds[component.id]=request.allowedPropertyIds[component.id].filter(id=>hostedVisibleProperty(component,id));
   try{const wire=JSON.parse(native.candidates[0].content.parts.map((p:any)=>p.text??'').join(''));result.nativeNullStringProperties=wire.items.flatMap((item:any,index:number)=>item.attributes.filter((p:any)=>p.valueJson==='null').map((p:any)=>({index,kind:item.kind,property:p.id,reason:p.unknownReason})));}catch{}
   const decoded=decodeGeminiGameObservation(native,request,definition);result.decode='passed';result.observations=decoded.observations.length;
   result.assembly='running';const assembled=assembleObservations({pack,definition,request,result:decoded,turnInstanceId:'offline-diagnosis',reader:{kind:'gemini-game-observation-v1',model:'gemini-3.8-flash',thinkingLevel:'LOW',mediaResolution:'MEDIA_RESOLUTION_HIGH',maxOutputTokens:32768},transforms:[],sourceImageSHA:c.sourceSHA});result.assembly='passed';result.assertions=assembled.assertions.length;
  }catch(e){result.failureStage=result.decode==='not-run'?'native-decode':'candidate-assembly';result.error=e instanceof Error?e.message:'unknown';}
  await writeFile(path.join(folder,'offline-diagnosis.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});results.push(result);
 }
}
await writeFile(path.join(root,'offline-diagnoses.json'),JSON.stringify(results,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({cases:results.length,failures:results.filter(r=>r.error),providerCalls:0}));
