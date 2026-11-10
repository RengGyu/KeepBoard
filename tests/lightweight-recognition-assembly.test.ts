import test from 'node:test';import assert from 'node:assert/strict';import * as assembly from '../server/ai/observationAssembly';import defs from '../game-photo-definitions/index.json';import {catalogPacks} from '../gamepacks/catalog';import {effectiveRecognitionPack} from '../shared/recognition';import {compileObservationTask,type PhotoDefinition} from '../shared/lightweightRecognition';
function fixture(game:string,area:string){const definition=defs.games.find(d=>d.gameId===game) as PhotoDefinition,pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id===definition.packId)!),request=compileObservationTask({pack,definition,areaId:area,scope:{partition:definition.areas.find(a=>a.id===area)!.partition,ownerId:null,captureEpoch:'epoch'},images:[{evidenceId:'photo',inputId:'photo',sha256:'a'.repeat(64),width:800,height:600,transformId:null}],taskId:'task'});return {definition,pack,request};}
const reader={kind:'local-observation-v1',model:'fixture',modelRevision:'fixture',weightSHA:'a'.repeat(64),projectorSHA:'b'.repeat(64),runtimeRevision:'fixture',contextTokens:8192,maxOutputTokens:2048} as const;
const observation=(componentId:string,properties:any)=>({ref:componentId+'-1',imageIndex:0,panelRef:null,componentId,bbox:{x:.1,y:.1,width:.2,height:.2},face:'front' as const,quantity:null,rotationDegrees:null,properties,referenceCandidates:[]});const observed=(value:any)=>({state:'observed',value});
test('Catan bridge retains nullable quantity and separates geometry from manual location',()=>{assert.equal(typeof assembly.assembleObservations,'function');const f=fixture('catan','board'),o=observation('terrain',{variant:observed('forest')});const r=assembly.assembleObservations({...f,result:{version:'lightweight-observation-v1',observations:[o],coverage:'partial',completion:'complete'},turnInstanceId:'turn',reader,transforms:[]});assert.equal(r.assertions[0].field,'components.observed');const c=(r.assertions[0].value as any).components[0];assert.equal(c.variant,'forest');assert.equal(c.quantity,null);assert.deepEqual(c.location,{type:'unplaced',id:null});assert.equal(c.ownerId,null);assert.equal(r.assertions[0].observationReceipts![0].result.observations.length,1);});
test('Splendor marks map to nullable gem counts, never quantity or inferred zeros',()=>{assert.equal(typeof assembly.assembleObservations,'function');const f=fixture('splendor','market'),o=observation('development',{bonus:observed('blue'),points:observed(0),cost:observed([{symbol:'red',value:3}])});const r=assembly.assembleObservations({...f,result:{version:'lightweight-observation-v1',observations:[o],coverage:'partial',completion:'complete'},turnInstanceId:'turn',reader,transforms:[]});const p=(r.assertions[0].value as any).pieces[0];assert.equal(p.quantity,null);assert.equal(p.readout.points,0);assert.equal(p.readout.cost.red,3);assert.equal(p.readout.cost.white,null);assert.equal(p.readout.bonus,'blue');});
test('typed public possessions use unowned tray and leave manual properties null',()=>{assert.equal(typeof assembly.assembleObservations,'function');const f=fixture('sagrada','window'),o=observation('dice',{dieValue:observed(6),dieColor:observed('green')});const r=assembly.assembleObservations({...f,result:{version:'lightweight-observation-v1',observations:[o],coverage:'partial',completion:'complete'},turnInstanceId:'turn',reader,transforms:[]});assert.equal(r.assertions[0].field,'__photo.public');assert.equal(r.assertions[0].ownerId,undefined);const p=(r.assertions[0].value as any).pieces[0];assert.equal(p.readout.values.cell,null);assert.equal(p.readout.sources.cell,null);assert.equal(p.readout.values.dieValue,6);assert.equal(p.readout.values.dieColor,'green');});

test('Rummikub rack observations remain evidence instead of becoming unknown tiles',()=>{
 const definition=defs.games.find(d=>d.gameId==='rummikub') as PhotoDefinition;
 const pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id===definition.packId)!);
 const request=compileObservationTask({pack,definition,areaId:'rack',scope:{partition:'owner_private',ownerId:'review-owner',captureEpoch:'epoch'},images:[{evidenceId:'photo',inputId:'photo',sha256:'a'.repeat(64),width:800,height:600,transformId:null}],taskId:'rack-review'});
 const tile=observation('numbers',{number:observed(11),color:observed('orange')}),rack=observation('racks',{});
 const run=(observations:any[])=>assembly.assembleObservations({pack,definition,request,result:{version:'lightweight-observation-v1',observations,coverage:'partial',completion:'complete'},turnInstanceId:'turn',reader});
 const r=run([rack,tile]);
 assert.equal(r.assertions.length,1);
 assert.equal(r.assertions[0].ownerId,'review-owner');
 const loose=(r.assertions[0].value as any).loose;
 assert.equal(loose.length,1);
 assert.equal(loose[0].kind,'number');
 assert.equal(loose[0].number,11);
 assert.equal(loose[0].color,'orange');
 assert.deepEqual(r.observationReceipts![0].result.observations,[rack,tile]);
 assert(!Object.hasOwn(r.observationReceipts![0].componentRefs,rack.ref));
 assert.match(r.summary,/1개/);
 const onlyRack=run([rack]);
 assert.equal(onlyRack.assertions.length,0);
 assert.deepEqual(onlyRack.observationReceipts![0].result.observations,[rack]);
 assert.match(onlyRack.summary,/0개/);
});
