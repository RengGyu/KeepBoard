// Offline only: check whether the unchanged production decoders can consume collected model responses.
import fs from 'node:fs/promises';
import path from 'node:path';
import {catalogPacks} from '../../gamepacks/catalog.ts';
import {photoDefinition} from '../../server/photoDefinitions.ts';
import {effectiveRecognitionPack} from '../../shared/recognition.ts';
import {compileObservationTask} from '../../shared/lightweightRecognition.ts';
import {decodeGeminiGameObservation} from '../../server/ai/geminiGameReader.ts';
import {decodeCatanSceneReading} from '../../server/ai/catanSceneReading.ts';
const dir=new URL('./',import.meta.url),read=async(p:any)=>JSON.parse(await fs.readFile(p,'utf8'));
const selection=(await read(new URL('selection.json',dir))).cases,models=['gemini-3.8-flash','gemini-4-argon'],rows=[];
for(const c of selection){
 const pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id===c.packId)!),definition=photoDefinition(pack);
 const request=compileObservationTask({pack,definition,areaId:c.areaId,taskId:'model-only-'+c.gameId,scope:{partition:c.partition,ownerId:c.ownerId??null,captureEpoch:'model-only'},images:[{evidenceId:'photo-'+c.gameId,inputId:'photo-'+c.gameId,sha256:c.sourceSHA,width:c.width,height:c.height,transformId:null}]});
 for(const model of models){
  const native=await read(path.join('/private/tmp/kb-argon-model-only-30-20261028',c.gameId+'.'+model+'.native.json'));
  try{const trace:any={id:'gemini-game-wire-v1',items:[],deferred:[]};const result=decodeGeminiGameObservation(native,request,definition,trace);rows.push({gameId:c.gameId,model,decoder:'literal',state:'valid',observations:result.observations.length,deferredAttributes:trace.deferred.length});}
  catch(e){rows.push({gameId:c.gameId,model,decoder:'literal',state:'rejected',reason:e instanceof Error?e.message:'unknown'});}
 }
}
const view=await read('/private/tmp/kb-photo-no-result-20261028/latest-user-native-before.json');
const job=(await read('/private/tmp/kb-photo-no-result-20261028/latest-user-structured-jobs.json')).jobs[0];
for(const model of models){
 const native=await read(path.join('/private/tmp/kb-argon-model-only-catan-20261028','catan-user.'+model+'.native.json'));
 try{const r=decodeCatanSceneReading(native,{request:job.observationReceipts[0].request,definition:photoDefinition(view.pack),pack:view.pack,session:view.session,evidence:view.session.evidence,reader:{...job.reader,model},sourceImageSHA:job.inputSHA});rows.push({gameId:'catan-user',model,decoder:'native-catan',state:'valid',assertions:r.assertions.length,observations:r.observationReceipts?.[0].result.observations.length});}
 catch(e){rows.push({gameId:'catan-user',model,decoder:'native-catan',state:'rejected',reason:e instanceof Error?e.message:'unknown'});}
}
const report={providerCalls:0,productionWrites:0,rows,valid:rows.filter(r=>r.state==='valid').length,rejected:rows.filter(r=>r.state==='rejected').length,limit:'Decoding validity only, not full save/reopen or visual correctness.'};
await fs.writeFile(new URL('decode-replay.json',dir),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({valid:report.valid,rejected:report.rejected,providerCalls:0}));
