import test from 'node:test';import assert from 'node:assert/strict';
import {buildTerraGameBody,decodeTerraGameObservation} from '../server/ai/terraGameReader';
import {catalogPacks} from '../gamepacks/catalog';import {photoDefinition} from '../server/photoDefinitions';import {compileObservationTask,type TerraReaderIdentity} from '../shared/lightweightRecognition';
const profile='literal-named-detail-unit-original-v4' as TerraReaderIdentity['adapterVersion'];
const pack=catalogPacks.find(p=>p.id==='splendor')!,definition=photoDefinition(pack),area=definition.areas.find(a=>a.id==='player')!;
const request=compileObservationTask({pack,definition,areaId:area.id,taskId:'synthetic-detail',scope:{partition:area.partition,ownerId:null,captureEpoch:'fixed'},images:[{evidenceId:'image',inputId:'image',sha256:'a'.repeat(64),width:1000,height:800,transformId:null}]});
const component=definition.components.find(c=>c.properties.some(p=>p.type==='marks'&&request.allowedPropertyIds[c.id]?.includes(p.id)))!,field=component.properties.find(p=>p.type==='marks'&&request.allowedPropertyIds[component.id]?.includes(p.id))!;
const native=(value:unknown)=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({items:[{kind:component.id,box_1000:{ymin:10,xmin:20,ymax:200,xmax:300},physicalUnit:'single',quantity:1,face:'front',attributes:[{id:field.id,valueJson:JSON.stringify(value),unknownReason:null}]}]})}]}]});
test('detail profile preserves a literal symbol map as typed marks without altering provider evidence',()=>{
 const value={amber:3,cobalt:0,unreadable:null},n=native(value),before=structuredClone(n);
 const read=decodeTerraGameObservation(n,request,definition,[],profile);
 assert.deepEqual(read.raw.observations[0].properties[field.id],{state:'observed',value:[{symbol:'amber',value:3},{symbol:'cobalt',value:0},{symbol:'unreadable',value:null}]});
 assert.deepEqual(n,before);assert.deepEqual(read.hostedWire.providerResponse,before);assert.equal((read.hostedWire.items[0] as any).attributes[0].valueJson,JSON.stringify(value));
});
test('detail profile rejects lossy or malformed symbol maps, while old v2 decoding stays unchanged',()=>{
 for(const v of [{amber:'3'},{amber:-1},{amber:{value:3}},Object.fromEntries(Array.from({length:33},(_,i)=>['s'+i,1]))]){
  const r=decodeTerraGameObservation(native(v),request,definition,[],profile);assert.equal(r.raw.observations[0].properties[field.id].state,'unknown');
 }
 const old=decodeTerraGameObservation(native({amber:3}),request,definition,[],'literal-named-fill-unit-original-v2');assert.equal(old.raw.observations[0].properties[field.id].state,'unknown');
});
test('detail request keeps image and wire layout, supplies structured type contracts only for requested visible fields',()=>{
 const bytes=Buffer.from('synthetic-image'),old=buildTerraGameBody(request,definition,bytes,'image/png','literal-named-fill-unit-original-v2'),next=buildTerraGameBody(request,definition,bytes,'image/png',profile);
 assert.deepEqual(next.text.format.schema,old.text.format.schema);assert.deepEqual(next.input[0].content[1],old.input[0].content[1]);assert.deepEqual(next.reasoning,old.reasoning);
 const prompt=next.input[0].content[0].text!;assert(prompt.includes('"symbol"'));assert(prompt.includes('"value"'));assert(prompt.includes('individual visible marks'));assert(!prompt.includes('white:2'));
});
test('default reader fixes only lossless marks decoding while its request stays exactly v2',async()=>{
 const {TerraGameReader}=await import('../server/ai/terraGameReader');const reader=new TerraGameReader();assert.equal(reader.identity.adapterVersion,'literal-named-fill-unit-marks-v5');
 const image=Buffer.from('fixed');assert.deepEqual(buildTerraGameBody(request,definition,image,'image/png'),buildTerraGameBody(request,definition,image,'image/png','literal-named-fill-unit-original-v2'));
 const result=decodeTerraGameObservation(native({amber:7}),request,definition,[],reader.identity.adapterVersion);assert.deepEqual(result.raw.observations[0].properties[field.id],{state:'observed',value:[{symbol:'amber',value:7}]});
});
