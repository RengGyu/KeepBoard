import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogPacks} from '../gamepacks/catalog';
import {photoDefinition} from '../server/photoDefinitions';
import {compileObservationTask,validateObservationResult} from '../shared/lightweightRecognition';
import {buildGeminiGameBody,decodeGeminiGameObservation,extractGeminiKey} from '../server/ai/geminiGameReader';
import {GeminiGameReader} from '../server/ai/geminiGameReader';
import {prepareHostedObservation} from '../server/hostedObservation';

const pack=catalogPacks.find(p=>p.id==='catan-base')!;
const definition=photoDefinition(pack);
const request=compileObservationTask({pack,definition,areaId:'board',taskId:'synthetic-task',scope:{partition:'common_public',ownerId:null,captureEpoch:'epoch'},images:[{evidenceId:'photo',inputId:'photo',sha256:'a'.repeat(64),width:850,height:637,transformId:null}]});
const item=(kind='terrain',attributes:{id:string;valueJson:string|null;unknownReason:string|null}[]=[{id:'variant',valueJson:'"forest"',unknownReason:null}])=>({kind,box_1000:[100,200,300,400],face:'front',quantity:1,attributes});
const payload=(items:unknown[])=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({items})}]}}]});

test('uploaded Gemini key formats preserve a complete synthetic token',()=>{
 const token='AQ.synthetic-token_1234567890';
 for(const label of ['GEMINI','GEMINIKEY','GEMINIAPI','GEMINIAPIKEY','GOOGLEAPIKEY']){
  assert.equal(extractGeminiKey(`${label}: ${token}`),token);
  assert.equal(extractGeminiKey(`${label}\n\`${token}\``),token);
 }
 assert.equal(extractGeminiKey(`\ufeff${JSON.stringify({api_key:token})}`),token);
 assert.throws(()=>extractGeminiKey(`some note ${token}`));
 assert.throws(()=>extractGeminiKey(`GEMINI: ${token}\nOTHER: second`));
});

test('Gemini task body keeps visible game scope and sufficient fixed output profile',()=>{
 const body=buildGeminiGameBody(request,definition,Buffer.from('image'),'image/png');
 assert.equal(body.generationConfig.thinkingConfig.thinkingLevel,'LOW');
 assert.equal(body.generationConfig.mediaResolution,'MEDIA_RESOLUTION_HIGH');
 assert.equal(body.generationConfig.maxOutputTokens,32768);
 const prompt=body.contents[0].parts[0].text!;
 assert.match(prompt,/road/);
 assert.doesNotMatch(prompt,/ownerId|currentPlayer|stolenFromPlayerId/);
 assert(!JSON.stringify(body).includes('a'.repeat(64)));
});

test('completed native observations preserve visible value and box, unknown stays null',()=>{
 const result=decodeGeminiGameObservation(payload([item(),item('number-token',[{id:'number',valueJson:null,unknownReason:'occluded'}])]),request,definition);
 assert.equal(result.observations.length,2);
 assert.deepEqual(result.observations[0].bbox,{x:.2,y:.1,width:.2,height:.2});
 assert.deepEqual(result.observations[0].properties.variant,{state:'observed',value:'forest'});
 assert.deepEqual(result.observations[1].properties.number,{state:'unknown',value:null,reason:'occluded'});
 assert.equal(validateObservationResult(result,request,definition).observations.length,2);
});

test('incomplete, invented manual field and invalid domain fail without usable candidate',()=>{
 assert.throws(()=>decodeGeminiGameObservation({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{"items":[]}'}]}}]},request,definition),/완료|잘렸/);
 assert.throws(()=>decodeGeminiGameObservation(payload([item('terrain',[{id:'ownerId',valueJson:'"p1"',unknownReason:null}])]),request,definition));
 assert.throws(()=>decodeGeminiGameObservation(payload([item('terrain',[{id:'variant',valueJson:'"purple"',unknownReason:null}])]),request,definition));
});

test('even a mistaken visible definition cannot turn owner or role into photo observations',()=>{
 const unsafe=structuredClone(definition),terrain=unsafe.components.find(c=>c.id==='terrain')!;
 terrain.properties.push({id:'role',label:'역할',type:'player',acquisition:'visible',sourceText:'synthetic'});
 const allowed={...request,allowedPropertyIds:{...request.allowedPropertyIds,terrain:[...request.allowedPropertyIds.terrain,'role']}};
 const body=buildGeminiGameBody(allowed,unsafe,Buffer.from('image'),'image/png');
 assert(!body.contents[0].parts[0].text?.includes('"id":"role"'));
 assert.throws(()=>decodeGeminiGameObservation(payload([item('terrain',[{id:'role',valueJson:'"p1"',unknownReason:null}])]),allowed,unsafe));
});

test('owner photo only compiles the selected private area and public photo cannot claim it',async()=>{
 const data=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=','base64');
 class Ready extends GeminiGameReader{async status(){return {kind:'gemini-game-observation-v1' as const,available:true,cloudSupported:true as const,identity:this.identity};}}
 const reader=new Ready(),e={id:'owner-photo',kind:'photo',scope:'player',ownerId:'p1',captureEpoch:'epoch'} as any;
 const selection={kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'hand'};
 const input={pack,evidence:[e],captureEpoch:'epoch',selection,taskId:'owner-synthetic',reader,readImage:async()=>({data,mimeType:'image/png'})};
 const planned=await prepareHostedObservation(input);
 assert.equal(planned.request.scope.partition,'owner_private');assert.equal(planned.request.scope.ownerId,'p1');
 assert(!planned.request.allowedComponents.includes('terrain'));
 await assert.rejects(()=>prepareHostedObservation({...input,evidence:[{...e,scope:'public',ownerId:undefined}]}),/영역/);
 await assert.rejects(()=>prepareHostedObservation({...input,captureEpoch:'new-epoch'}),/현재 촬영/);
});
