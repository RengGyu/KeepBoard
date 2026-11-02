import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {catalogPacks} from '../../../gamepacks/catalog';
import {photoDefinition} from '../../../server/photoDefinitions';
import {compileObservationTask} from '../../../shared/lightweightRecognition';
import {normalizeScene} from '../../../shared/scene';
import {catanScenePrompt,catanSceneResponseSchema,decodeCatanSceneReading} from '../../../server/ai/catanSceneReading';
import type {Session,Evidence} from '../../../shared/types';

// Read-only source probe. No network, credentials, private data, or product writes.
const pack=catalogPacks.find(p=>p.id==='catan-base')!,definition=photoDefinition(pack);
const evidence=[{id:'synthetic-photo',kind:'photo',scope:'public',captureEpoch:'epoch',url:'/uploads/synthetic.png',label:'synthetic'}] as Evidence[];
const session={assertions:[],players:[{id:'p',name:'synthetic',color:'red'}],turnInstanceId:'turn'} as unknown as Session;
const request=compileObservationTask({pack,definition,areaId:'board',taskId:'offline-evidence',scope:{partition:'common_public',ownerId:null,captureEpoch:'epoch'},images:[{evidenceId:evidence[0].id,inputId:evidence[0].id,sha256:'a'.repeat(64),width:1000,height:800,transformId:null}]});
const reader={kind:'gemini-game-observation-v1',model:'gemini-3.8-flash',thinkingLevel:'LOW',mediaResolution:'MEDIA_RESOLUTION_HIGH',maxOutputTokens:32768} as const;
const row=(id:string,quantity:number|null)=>({id,kind:'road',variant:null,ownerId:null,quantity,location:{type:'edge',id:'r1c1.E'},region:{x:.1,y:.1,width:.1,height:.1},evidenceId:evidence[0].id,observedColor:'red'});
const components=[row('unknown-quantity',null),{...row('zero-quantity',0),location:{type:'unplaced',id:null}}];
const wire={assertions:[{field:'components.observed',value:{version:2,coverage:'partial',components},evidenceIds:[evidence[0].id]}],warnings:[]};
const native={candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(wire)}]}}]};
const before=JSON.stringify(native);
const decoded=decodeCatanSceneReading(native,{request,definition,pack,session,evidence,reader,sourceImageSHA:'a'.repeat(64)});
const prompt=catanScenePrompt(session,pack,evidence),schema=catanSceneResponseSchema(evidence);
const sparse={...components[0]};delete (sparse as any).variant;delete (sparse as any).ownerId;delete (sparse as any).evidenceId;
const sourceFiles=['server/ai/catanSceneReading.ts','server/ai/geminiGameReader.ts','server/ai/prompt.ts','server/ai/scenePrompt.ts','shared/scene.ts','server/scanObservation.ts','workflows/analyze.ts'];
const hashes=Object.fromEntries(await Promise.all(sourceFiles.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])));
const out={status:'OFFLINE_SOURCE_EVIDENCE_ONLY',providerCalls:0,productWrites:0,sourceSHA256:hashes,
  prompt:{characters:prompt.length,utf8Bytes:Buffer.byteLength(prompt),responseSchemaBytes:Buffer.byteLength(JSON.stringify(schema)),containsSerializedSceneSchema:prompt.includes('"propertyOrdering"'),componentRequiredFields:schema.properties.assertions.items.properties.value.properties.components.items.required},
  nativeNullQuantity:{inputQuantity:null,normalizedQuantity:normalizeScene({version:2,coverage:'partial',components:[components[0]]}).components[0].quantity,decodedSceneQuantity:(decoded.assertions[0].value as any).components[0].quantity,receiptQuantity:decoded.observationReceipts![0].result.observations[0].quantity,rawReceiptQuantity:((decoded.observationReceipts![0].hostedWire!.items[0] as any).value.components[0].quantity),inputMutated:JSON.stringify(native)!==before},
  zeroQuantity:{input:0,decodedScene:(decoded.assertions[0].value as any).components[1].quantity,receipt:decoded.observationReceipts![0].result.observations[1].quantity},
  illustrativeRowBytes:{full:Buffer.byteLength(JSON.stringify(components[0])),sparse:Buffer.byteLength(JSON.stringify(sparse)),removedFields:['variant:null','ownerId:null','evidenceId:known-single-photo'],note:'Synthetic string length only; not token count, live response reduction, or performance evidence.'},
  limitations:['No native live output usage metadata available in release.json.','No proposed decoder or prompt implemented.','No image recognition or elapsed-time experiment.']};
await writeFile(new URL('./offline-evidence.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
