import test from 'node:test';import assert from 'node:assert/strict';
import {catalogPacks} from '../gamepacks/catalog';import {photoDefinition} from '../server/photoDefinitions';
import {compileObservationTask} from '../shared/lightweightRecognition';
import {buildTerraGameBody,decodeTerraGameObservation} from '../server/ai/terraGameReader';
import {hostedReaderFor} from '../server/ai/hostedReader';
const pack=catalogPacks.find(p=>p.id==='sagrada')!,definition=photoDefinition(pack),area=definition.areas.find(a=>a.id==='window')!;
const request=compileObservationTask({pack,definition,areaId:area.id,taskId:'unit-claim',scope:{partition:area.partition,ownerId:null,captureEpoch:'epoch'},images:[{evidenceId:'photo',inputId:'photo',sha256:'a'.repeat(64),width:1024,height:768,transformId:null}]});
const item=(unit?:string,quantity:number|null=null)=>({kind:'dice',box_1000:{ymin:100,xmin:100,ymax:300,xmax:300},face:'front',quantity,attributes:[],...(unit?{physicalUnit:unit}:{})});
const envelope=(items:unknown[])=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({items})}]}]});
test('physical-unit claims are separate from quantity, with versioned source metadata and unmodified old responses',()=>{
 const body=buildTerraGameBody(request,definition,Buffer.from('image'),'image/png'),schema=body.text.format.schema as any;assert(schema.properties.items.items.required.includes('physicalUnit'));
 const wire=[item('single'),item('group'),item('unknown'),item('single',4),item(undefined,1)],native=envelope(wire),before=JSON.stringify(native),read=decodeTerraGameObservation(native,request,definition);
 assert.equal(read.hostedWire.id,'terra-game-wire-v2');assert.deepEqual(read.hostedWire.physicalUnits,{'item-1':'single','item-2':'group','item-3':'unknown','item-4':'unknown','item-5':'unknown'});assert.deepEqual(read.raw.observations.map(o=>o.quantity),[null,null,null,4,1]);assert.equal(JSON.stringify(native),before);assert(read.hostedWire.deferred.some(d=>d.ref==='item-4'&&d.property==='physicalUnit'));
 const legacy=decodeTerraGameObservation(envelope([item()]),request,definition);assert.equal(legacy.hostedWire.id,'terra-game-wire-v1');assert.equal(legacy.hostedWire.physicalUnits,undefined);
 assert.throws(()=>decodeTerraGameObservation(envelope([item('probably-single')]),request,definition));
});
test('a pinned pre-unit Terra job retains its original adapter and body shape',()=>{
 const legacy=hostedReaderFor({kind:'terra-game-observation-v1',model:'gpt-6.1-terra',api:'responses',reasoningEffort:'low',imageDetail:'high',maxOutputTokens:32768,adapterVersion:'literal-named-fill-original-v1',automaticRetries:0,timeoutMs:240000});
 assert.equal(legacy.identity.kind,'terra-game-observation-v1');assert.equal('adapterVersion' in legacy.identity&&legacy.identity.adapterVersion,'literal-named-fill-original-v1');
 const body=buildTerraGameBody(request,definition,Buffer.from('image'),'image/png','literal-named-fill-original-v1');assert.equal((body.text.format.schema as any).properties.items.items.properties.physicalUnit,undefined);
});
