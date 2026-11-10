import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogPacks} from '../gamepacks/catalog';
import {photoDefinition} from '../server/photoDefinitions';
import {compileObservationTask} from '../shared/lightweightRecognition';
import {decodeLiteralObservationPayload} from '../server/ai/geminiGameReader';
import {emptyGameReadout,setReadoutValue} from '../shared/readouts/registry';

function context(gameId:string,componentId:string){
 const pack=catalogPacks.find(p=>p.runtime?.source.gameId===gameId)!,definition=photoDefinition(pack);
 const area=definition.areas.find(a=>a.componentIds.includes(componentId)&&a.partition==='common_public')??definition.areas.find(a=>a.componentIds.includes(componentId))!;
 const request=compileObservationTask({pack,definition,areaId:area.id,taskId:'synthetic',scope:{partition:area.partition,ownerId:area.partition==='common_public'?null:'p',captureEpoch:'epoch'},images:[{evidenceId:'photo',inputId:'photo',sha256:'a'.repeat(64),width:900,height:700,transformId:null}]});
 return {pack,definition,request};
}
test('physical tile outline and visible side remain observable on back or uncertain face',()=>{
 for(const [game,kind,property,value]of [['patchwork','patches','shape','L'],['akropolis','tiles','shape','three joined hexes'],['monopoly','property','mortgageFace','mortgaged']] as const){
  const {pack,definition,request}=context(game,kind);
  for(const face of ['back','unknown']){
   const result=decodeLiteralObservationPayload({items:[{kind,box_1000:[10,10,200,200],face,quantity:1,attributes:[{id:property,valueJson:JSON.stringify(value),unknownReason:null}]}]},request,definition);
   assert.deepEqual(result.observations[0].properties[property],{state:'observed',value});
  }
  let readout=emptyGameReadout(pack,kind);readout=setReadoutValue(pack,readout,'face','back');readout=setReadoutValue(pack,readout,property,value);
  assert.equal(readout.values[property],value);
 }
});
test('confirmed back printing is inapplicable while uncertain face and explicitly occluded values stay unknown',()=>{
 const {definition,request}=context('patchwork','patches');
 for(const [face,attributes]of [['back',[{id:'printedName',valueJson:'"unseen"',unknownReason:null}]],['front',[{id:'printedName',valueJson:null,unknownReason:'occluded'}]]] as const){
  const result=decodeLiteralObservationPayload({items:[{kind:'patches',box_1000:[10,10,200,200],face,quantity:1,attributes}]},request,definition);
  if(face==='back')assert.equal(Object.hasOwn(result.observations[0].properties,'printedName'),false);
  else assert.deepEqual(result.observations[0].properties.printedName,{state:'unknown',value:null,reason:'occluded'});
 }
 const uncertainFront=decodeLiteralObservationPayload({items:[{kind:'patches',box_1000:[10,10,200,200],face:'unknown',quantity:1,attributes:[{id:'printedName',valueJson:null,unknownReason:'occluded'}]}]},request,definition);
 assert.deepEqual(uncertainFront.observations[0].properties.printedName,{state:'unknown',value:null,reason:'occluded'});
 const occluded=decodeLiteralObservationPayload({items:[{kind:'patches',box_1000:[10,10,200,200],face:'unknown',quantity:1,attributes:[{id:'shape',valueJson:null,unknownReason:'occluded'}]}]},request,definition);
 assert.deepEqual(occluded.observations[0].properties.shape,{state:'unknown',value:null,reason:'occluded'});
 const catan=photoDefinition(catalogPacks.find(p=>p.id==='catan-base')!);
 assert.equal(catan.components.find(c=>c.id==='container')!.properties.find(p=>p.id==='variant')!.faceOnly,undefined);
});
