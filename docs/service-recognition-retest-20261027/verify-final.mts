// Recheck captured live outputs after the decoder-only null-encoding correction. No network.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const data=process.argv[2];
assert(data&&path.isAbsolute(data)&&data.startsWith('/private/tmp/'));
const isolated=path.join(data,'final-offline-replay');
await mkdir(isolated,{mode:0o700});
process.env.KEEPBOARD_DATA_DIR=isolated;
process.chdir(isolated);
const [{catalogPacks},{photoDefinition},{effectiveRecognitionPack},{compileObservationTask},{buildGeminiGameBody,decodeGeminiGameObservation,hostedVisibleProperty}]=await Promise.all([
 import('../../gamepacks/catalog.ts'),import('../../server/photoDefinitions.ts'),import('../../shared/recognition.ts'),import('../../shared/lightweightRecognition.ts'),import('../../server/ai/geminiGameReader.ts')
]);
const sha=(x:Buffer|string)=>createHash('sha256').update(x).digest('hex');
const manifest=JSON.parse(await readFile(new URL('./manifest.json',import.meta.url),'utf8'));
const rows=[];
for(const c of manifest.cases){
 const folder=path.join(data,'cases',c.gameId);
 const summary=JSON.parse(await readFile(path.join(folder,'summary.json'),'utf8'));
 const receipts=JSON.parse(await readFile(path.join(folder,'receipts-after-job.json'),'utf8'));
 const nativeBytes=await readFile(path.join(folder,'native-response.json'));
 assert.equal(sha(nativeBytes),summary.nativeSHA);
 const pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id===c.packId)!);
 const definition=photoDefinition(pack);
 const request=receipts[0]?.request??compileObservationTask({pack,definition,areaId:c.areaId,taskId:'offline-final',scope:{partition:c.partition,ownerId:c.ownerId??null,captureEpoch:'offline-final'},images:[{evidenceId:'offline-final',inputId:'offline-final',sha256:c.sourceSHA,width:c.width,height:c.height,transformId:null}]});
 for(const component of definition.components)if(request.allowedPropertyIds[component.id])request.allowedPropertyIds[component.id]=request.allowedPropertyIds[component.id].filter((id:string)=>hostedVisibleProperty(component,id));
 const image=await readFile(c.path);
 assert.equal(sha(image),c.sourceSHA);
 assert.equal(sha(await readFile(c.referencePath)),c.referenceSHA);
 const body=buildGeminiGameBody(request,definition,image,c.mime);
 assert.equal(sha(JSON.stringify(body)),summary.bodySHA,`${c.gameId}: final request drift`);
 const trace:any={id:'gemini-game-wire-v1',items:[],deferred:[]};
 const result=decodeGeminiGameObservation(JSON.parse(nativeBytes.toString()),request,definition,trace);
 if(receipts.length){
  assert.deepEqual(result,receipts[0].result,`${c.gameId}: final decoded result changed`);
  assert.deepEqual(trace,receipts[0].hostedWire,`${c.gameId}: final trace changed`);
 }else assert.equal(result.observations.length,0,`${c.gameId}: unexpected receipt omission`);
 rows.push({gameId:c.gameId,nativeSHA:summary.nativeSHA,bodySHA:summary.bodySHA,observationCount:result.observations.length,identicalRequest:true,identicalDecodedOutput:true});
}
assert.equal(rows.length,24);
const report={providerCalls:0,readerSourceSHA:sha(await readFile(new URL('../../server/ai/geminiGameReader.ts',import.meta.url))),rows};
await writeFile(path.join(isolated,'verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({providerCalls:0,verified:rows.length,readerSourceSHA:report.readerSourceSHA}));
