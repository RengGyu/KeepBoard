import test from 'node:test';import assert from 'node:assert/strict';
import {catalogPacks} from '../gamepacks/catalog';import {photoDefinition} from '../server/photoDefinitions';
import {compileObservationTask,type HostedObservationWire,type PhotoDefinition} from '../shared/lightweightRecognition';
import {decodeLiteralObservationPayload} from '../server/ai/geminiGameReader';
const pack={...catalogPacks.find(p=>p.id==='catan-base')!};delete pack.photoReadingPolicy;const base=photoDefinition(pack);
const fields=[
 {id:'label',type:'text'},{id:'printed',type:'text',faceOnly:true},
 {id:'choice',type:'text',options:[{value:'amber',label:'amber'}]},
 {id:'face',type:'text',options:[{value:'front',label:'front'},{value:'back',label:'back'}]},
 {id:'direction',type:'enum',options:[{value:'amber',label:'amber'}]},
 {id:'value',type:'integer'},{id:'quantity',type:'integer'},{id:'active',type:'boolean'},
] as const;
const definition:PhotoDefinition={...base,components:[{id:'terrain',manualPropertyIds:[],properties:fields.map(p=>({...p,label:p.id,acquisition:'visible',sourceText:'synthetic property types'}))}],areas:[{id:'board',partition:'common_public',fields:['board.layout'],componentIds:['terrain']}]};
const request=compileObservationTask({pack,definition,areaId:'board',taskId:'encoding',scope:{partition:'common_public',ownerId:null,captureEpoch:'synthetic'},images:[{evidenceId:'synthetic',inputId:'synthetic',sha256:'a'.repeat(64),width:1000,height:1000,transformId:null}]});
const attr=(id:string,valueJson:unknown,unknownReason:string|null=null)=>({id,valueJson,unknownReason});
function decode(attributes:unknown[],face='front'){
 const wire={items:[{kind:'terrain',face,quantity:1,box_1000:[100,100,200,200],attributes}]},before=JSON.stringify(wire),trace:HostedObservationWire={id:'gemini-game-wire-v1',items:[],deferred:[]};
 const result=decodeLiteralObservationPayload(wire,request,definition,trace);assert.equal(JSON.stringify(wire),before);assert.deepEqual(trace.items,wire.items);return {properties:result.observations[0].properties,trace};
}
test('bare text recovers exactly while already encoded text and raw wire stay unchanged',()=>{
 const {properties}=decode([attr('label','  ARC 2-3  '),attr('printed','"quoted exact"'),attr('choice','amber')]);
 assert.deepEqual(properties.label,{state:'observed',value:'  ARC 2-3  '});assert.deepEqual(properties.printed,{state:'observed',value:'quoted exact'});assert.deepEqual(properties.choice,{state:'observed',value:'amber'});
});
test('unknown/null and non-text domains are not recovered or guessed; valid zero/false remain literal',()=>{
 const p=decode([attr('label','text','occluded'),attr('printed',null,'occluded'),attr('direction','amber'),attr('value','seven'),attr('active','no')]).properties;
 for(const id of ['label','printed','direction','value','active'])assert.equal(p[id].state,'unknown');
 const v=decode([attr('value','0'),attr('active','false'),attr('label','"0"')]).properties;
 assert.deepEqual(v.value,{state:'observed',value:0});assert.deepEqual(v.active,{state:'observed',value:false});assert.deepEqual(v.label,{state:'observed',value:'0'});
 for(const value of [false,8,{},[],null])assert.equal(decode([attr('label',value)]).properties.label.state,'unknown');
});
test('recovered text still passes options, face-only, face equality and quantity equality validation',()=>{
 const p=decode([attr('choice','violet'),attr('printed','visible text'),attr('face','front'),attr('quantity','2')],'back').properties;
 for(const id of ['choice','face','quantity'])assert.equal(p[id].state,'unknown');
 assert.equal(Object.hasOwn(p,'printed'),false,'front-only text on a confirmed back is inapplicable, not a fabricated unknown');
});
test('malformed structured/quoted JSON and reserved or truncated literals never become text facts',()=>{
 for(const value of ['{"a":','[1,','"unfinished',"'unfinished",'`unfinished','nul','tru','fal','undefined','NaN','Infinity','-','1e','01','1.','null','true','false','   '])
  assert.equal(decode([attr('label',value)]).properties.label.state,'unknown',value);
});
