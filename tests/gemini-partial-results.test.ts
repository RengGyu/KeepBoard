import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogPacks} from '../gamepacks/catalog';
import {photoDefinition} from '../server/photoDefinitions';
import {compileObservationTask,type HostedObservationWire} from '../shared/lightweightRecognition';
import {buildGeminiGameBody,decodeGeminiGameObservation} from '../server/ai/geminiGameReader';
import {assembleObservations} from '../server/ai/observationAssembly';

// This test defines its own visible schema; it is not the source-pinned release policy.
const pack={...catalogPacks.find(p=>p.id==='catan-base')!};delete pack.photoReadingPolicy;
const base=photoDefinition(pack);
// Arbitrary visible fields verify generic behavior, independent of the photo corpus.
const definition={...base,components:[
 {id:'terrain',manualPropertyIds:['ownerId'],properties:[
  {id:'label',label:'Printed label',type:'text' as const,acquisition:'visible' as const,sourceText:'synthetic'},
  {id:'value',label:'Printed value',type:'integer' as const,min:0,max:12,acquisition:'visible' as const,sourceText:'synthetic'},
  {id:'active',label:'Visible mark',type:'boolean' as const,acquisition:'visible' as const,sourceText:'synthetic'},
 ]},
 {id:'number-token',manualPropertyIds:[],properties:[{id:'number',label:'Printed number',type:'integer' as const,min:0,max:12,acquisition:'visible' as const,sourceText:'synthetic'}]},
],areas:[{id:'board',partition:'common_public' as const,fields:['board.layout'],componentIds:['terrain','number-token']}]};
const request=compileObservationTask({pack,definition,areaId:'board',taskId:'synthetic',scope:{partition:'common_public',ownerId:null,captureEpoch:'epoch'},images:[{evidenceId:'photo',inputId:'photo',sha256:'b'.repeat(64),width:900,height:700,transformId:null}]});
const attribute=(id:string,valueJson:string|null,unknownReason:string|null=null)=>({id,valueJson,unknownReason});
const item=(attributes:unknown[],kind='terrain')=>({kind,box_1000:[10,20,110,120],face:'front',quantity:1,attributes});
const payload=(items:unknown[])=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({items})}]}}]});

test('one invalid visible value becomes unknown while other predictions stay unchanged',()=>{
 const native=payload([item([attribute('label','"possibly mistaken text"'),attribute('value','"7"'),attribute('active','false')]),item([attribute('number','2')],'number-token')]);
 const before=JSON.stringify(native),wire:HostedObservationWire={id:'gemini-game-wire-v1',items:[],deferred:[]};
 const result=decodeGeminiGameObservation(native,request,definition,wire);
 assert.equal(result.observations.length,2);
 assert.deepEqual(result.observations[0].properties.value,{state:'unknown',value:null,reason:'unreadable'});
 assert.deepEqual(result.observations[0].properties.label,{state:'observed',value:'possibly mistaken text'});
 assert.deepEqual(result.observations[0].properties.active,{state:'observed',value:false});
 assert.deepEqual(result.observations[1].properties.number,{state:'observed',value:2});
 assert.equal(JSON.stringify(native),before);
 assert.deepEqual(wire.items,JSON.parse(native.candidates[0].content.parts[0].text).items);
 assert.equal(wire.deferred.length,1);
});

test('literal null, invalid domains and missing visible fields remain unknown, never zero',()=>{
 for(const encoded of ['null','99','{"unexpected":true}']){
  const result=decodeGeminiGameObservation(payload([item([attribute('value',encoded)])]),request,definition);
  assert.equal(result.observations[0].properties.value.state,'unknown');
  assert.equal(result.observations[0].properties.label.state,'unknown');
 }
 const result=decodeGeminiGameObservation(payload([item([attribute('value','0')])]),request,definition);
 assert.deepEqual(result.observations[0].properties.value,{state:'observed',value:0});
});

test('malformed visible unknown encodings preserve valid observations and original wire',()=>{
 for(const valueJson of [null,8,false,{unexpected:true}]){
  const native=payload([item([{id:'value',valueJson,unknownReason:null}]),item([attribute('number','8')],'number-token')]);
  const original=JSON.stringify(native),wire:HostedObservationWire={id:'gemini-game-wire-v1',items:[],deferred:[]};
  const result=decodeGeminiGameObservation(native,request,definition,wire);
  assert.equal(result.observations.length,2);
  assert.deepEqual(result.observations[0].properties.value,{state:'unknown',value:null,reason:'unreadable'});
  assert.deepEqual(result.observations[1].properties.number,{state:'observed',value:8});
  assert.equal(wire.deferred.length,1);
  assert.equal(JSON.stringify(native),original);
  assert.deepEqual(wire.items,JSON.parse(native.candidates[0].content.parts[0].text).items);
 }
});

test('a visible property of another allowed component is deferred without losing either object',()=>{
 const wire:HostedObservationWire={id:'gemini-game-wire-v1',items:[],deferred:[]};
 const result=decodeGeminiGameObservation(payload([item([attribute('number','8')]),item([attribute('number','4')],'number-token')]),request,definition,wire);
 assert.equal(result.observations.length,2);
 assert(!Object.hasOwn(result.observations[0].properties,'number'));
 assert.deepEqual(result.observations[1].properties.number,{state:'observed',value:4});
 assert.equal(wire.deferred[0].property,'number');
});

test('private fields, foreign components and truncated envelopes still reject the task',()=>{
 assert.throws(()=>decodeGeminiGameObservation(payload([item([attribute('ownerId','"invented-owner"')])]),request,definition));
 assert.throws(()=>decodeGeminiGameObservation(payload([item([],'unrequested-component')]),request,definition));
 const native=payload([item([])]);native.candidates[0].finishReason='MAX_TOKENS';
 assert.throws(()=>decodeGeminiGameObservation(native,request,definition));
});

test('request schema limits kinds and visible attributes to the selected scope',()=>{
 const body=buildGeminiGameBody(request,definition,Buffer.from('image'),'image/png');
 const schema=body.generationConfig.responseFormat.text.schema as any;
 const item=schema.properties.items.items;
 assert.deepEqual(item.properties.kind.enum,['terrain','number-token']);
 assert.deepEqual(item.properties.attributes.items.properties.id.enum,['label','value','active','number']);
 assert(!JSON.stringify(body).includes('ownerId'));
});

test('opaque component IDs carry their game-pack physical names without adding other-area labels',()=>{
 const namedPack=structuredClone(pack);
 namedPack.runtime!.components=[{id:'terrain',name:'Synthetic physical components',kind:'piece',variants:[]},{id:'number-token',name:'Synthetic printed discs',kind:'token',variants:[]},{id:'unrequested-component',name:'PRIVATE UNREQUESTED LABEL',kind:'card',variants:[]}];
 const req=compileObservationTask({pack:namedPack,definition,areaId:'board',taskId:'labels',scope:request.scope,images:request.images});
 const body=buildGeminiGameBody(req,definition,Buffer.from('image'),'image/png');
 assert(body.contents[0].parts[0].text!.includes('Synthetic physical components'));
 assert(body.contents[0].parts[0].text!.includes('Synthetic printed discs'));
 assert(!body.contents[0].parts[0].text!.includes('PRIVATE UNREQUESTED LABEL'));
});

test('assembled partial observations retain original wire and unknown reasons',()=>{
 const def=photoDefinition(pack),req=compileObservationTask({pack,definition:def,areaId:'board',taskId:'assembly',scope:{partition:'common_public',ownerId:null,captureEpoch:'epoch'},images:request.images});
 const native=payload([item([attribute('variant','"forest"')]),item([attribute('number','"8"')],'number-token')]);
 const wire:HostedObservationWire={id:'gemini-game-wire-v1',items:[],deferred:[]};
 const result=decodeGeminiGameObservation(native,req,def,wire);
 const assembled=assembleObservations({request:req,result,definition:def,pack,turnInstanceId:'turn',reader:{kind:'gemini-game-observation-v1',model:'gemini-3.8-flash',thinkingLevel:'LOW',mediaResolution:'MEDIA_RESOLUTION_HIGH',maxOutputTokens:32768},hostedWire:wire});
 assert.equal(assembled.observationReceipts?.[0].hostedWire?.items.length,2);
 assert.equal(assembled.observationReceipts?.[0].result.observations[1].properties.number.state,'unknown');
 assert(assembled.assertions.length>0);
});
