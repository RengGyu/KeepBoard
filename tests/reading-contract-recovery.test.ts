import test from 'node:test';import assert from 'node:assert/strict';
import {catalogPacks}from'../gamepacks/catalog';import{effectiveRecognitionPack}from'../shared/recognition';import{photoDefinition}from'../server/photoDefinitions';import{compileObservationTask}from'../shared/lightweightRecognition';import{decodeLiteralObservationPayload,buildGeminiGameBody}from'../server/ai/geminiGameReader';import{assembleObservations}from'../server/ai/observationAssembly';
function fixture(game:string){const pack=effectiveRecognitionPack(catalogPacks.find(p=>p.runtime?.source?.gameId===game)!),definition=photoDefinition(pack),area=definition.areas.find(a=>a.partition==='common_public')??definition.areas[0],request=compileObservationTask({pack,definition,areaId:area.id,scope:{partition:area.partition,ownerId:null,captureEpoch:'contract-test'},taskId:'contract-test',images:[{evidenceId:'photo',inputId:'photo',sha256:'a'.repeat(64),width:1000,height:800,transformId:null}]});return{pack,definition,request};}
function decode(game:string,kind:string,property:string,value:unknown,face='front'){
 const f=fixture(game),wire={items:[{kind,box_1000:[100,100,300,300],face,quantity:null,attributes:[{id:property,valueJson:JSON.stringify(value),unknownReason:null}]}]},trace:any={id:'gemini-game-wire-v1',items:[],deferred:[]};const raw=decodeLiteralObservationPayload(wire,f.request,f.definition,trace);return{...f,raw,trace,wire};
}
test('opted-in printed numeric text preserves numeric literal as text, including ranges and zero, never quantity',()=>{
 for(const value of [3,0,'2–4']){const f=decode('machi-koro','cards','activationNumber',value);assert.deepEqual(f.raw.observations[0].properties.activationNumber,{state:'observed',value:String(value)});assert.equal(f.raw.observations[0].quantity,null);const a=assembleObservations({...f,result:f.raw,turnInstanceId:'test',reader:{kind:'gemini-game-observation-v1',model:'gemini-3.8-flash',thinkingLevel:'LOW',mediaResolution:'MEDIA_RESOLUTION_HIGH',maxOutputTokens:32768}});assert.equal((a.assertions[0].value as any).pieces[0].readout.values.activationNumber,String(value));}
 const body=buildGeminiGameBody(fixture('machi-koro').request,fixture('machi-koro').definition,Buffer.from('test'),'image/png');assert.match(body.contents[0].parts[0].text!,/text values are JSON strings/);
});
test('3D visible terrain description is not a hidden front; actual front-only identities stay blocked',()=>{
 const f=decode('gloomhaven','map','featureType','coffin terrain','unknown');assert.deepEqual(f.raw.observations[0].properties.featureType,{state:'observed',value:'coffin terrain'});assert.equal(f.raw.observations[0].face,'unknown');
 const hidden=decode('machi-koro','cards','activationNumber',3,'back');assert.equal(Object.hasOwn(hidden.raw.observations[0].properties,'activationNumber'),false);assert(hidden.trace.deferred.some((d:any)=>d.reason==='inapplicable-back-face'));assert.deepEqual(hidden.trace.items,hidden.wire.items);
 const uncertain=decode('machi-koro','cards','activationNumber',3,'unknown');assert.deepEqual(uncertain.raw.observations[0].properties.activationNumber,{state:'unknown',value:null,reason:'ambiguous'});assert(uncertain.trace.deferred.some((d:any)=>d.reason==='front-not-visible'));
});
test('unrelated text, invalid enums and typed numbers are not repaired by numeric-text preservation',()=>{
 assert.equal(decode('gloomhaven-jaws','map','pageLabel',2).raw.observations[0].properties.pageLabel.state,'unknown');
 assert.equal(decode('arkham-horror-3','map','face','Rivertown').raw.observations[0].properties.face.state,'unknown');
 assert.equal(decode('hanabi','cards','number','2').raw.observations[0].properties.number.state,'unknown');
 for(const value of [true,2.5,Number.MAX_SAFE_INTEGER+1])assert.equal(decode('machi-koro','cards','activationNumber',value).raw.observations[0].properties.activationNumber.state,'unknown');
});
