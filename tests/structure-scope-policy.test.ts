import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogPacks} from '../gamepacks/catalog';
import {photoDefinition} from '../server/photoDefinitions';
import {compileObservationTask,type HostedObservationWire} from '../shared/lightweightRecognition';
import {publicSceneTarget} from '../shared/restoration';
import {observationGaps,observationPropertyApplicable} from '../shared/observationGaps';
import {buildGeminiGameBody,decodeLiteralObservationPayload} from '../server/ai/geminiGameReader';
import {compactTerraContract,compactTerraKinds,expandCompactTerraPayload,LEAN_TERRA_PROFILE} from '../server/ai/terraCompact';
const compile=(gameId:string,areaId:string,scene=false)=>{
 const pack=catalogPacks.find(p=>p.runtime?.source.gameId===gameId)!,definition=photoDefinition(pack),area=definition.areas.find(a=>a.id===areaId)!;
 const request=compileObservationTask({pack,definition,areaId,...(scene?{readingTarget:publicSceneTarget(pack)}:{}),scope:{partition:scene?'common_public':area.partition,ownerId:area.partition==='owner_private'?'owner':null,captureEpoch:'epoch'},taskId:'test',images:[{evidenceId:'photo',inputId:'photo',sha256:'a'.repeat(64),width:1200,height:800,transformId:null}]});
 return {pack,definition,request};
};
const row=(area:string|null,attributes:any[]=[])=>({kind:'boards',sourceAreaId:area,face:'front',quantity:0,box_1000:[0,0,200,300],attributes});
test('Azul current pinned data asks tile colour, not an anonymous tile name, and separates factory from personal board fields',()=>{
 const offer=compile('azul','offer'),wall=compile('azul','wall');
 assert.deepEqual(offer.request.allowedPropertyIds.tiles,['face','tileColor']);
 assert.deepEqual(offer.request.allowedPropertyIds.boards,['factoryLabel']);
 assert(!wall.request.allowedPropertyIds.boards.includes('factoryLabel'));
 assert(wall.request.allowedPropertyIds.boards.includes('boardSide'));assert(wall.request.allowedPropertyIds.boards.includes('scoreTrack'));
 assert.equal(offer.request.definitionSHA,offer.definition.definitionSHA);
 assert.throws(()=>compileObservationTask({...({pack:offer.pack,definition:offer.definition,areaId:'offer',taskId:'x',scope:offer.request.scope,images:offer.request.images}),pack:{...offer.pack,photoReadingPolicy:{...offer.pack.photoReadingPolicy!,definitionSHA:'0'.repeat(64)}}}),/정책/);
});
test('confirmed scene area removes only inapplicable unknown demands and preserves supplemental read values and raw wire',()=>{
 const {definition,request}=compile('azul','offer',true),wire={items:[row('offer',[{id:'boardSide',valueJson:'"gray"',unknownReason:null},{id:'scoreTrack',valueJson:null,unknownReason:'occluded'}]),row('wall')]};
 const trace:HostedObservationWire={id:'gemini-game-wire-v1',items:[],deferred:[]};
 const raw=decodeLiteralObservationPayload(wire,request,definition,trace);
 assert.deepEqual(raw.observations[0].properties.boardSide,{state:'observed',value:'gray'});
 assert(!Object.hasOwn(raw.observations[0].properties,'scoreTrack'));
 assert.equal(raw.observations[0].properties.factoryLabel.state,'unknown');
 assert(!Object.hasOwn(raw.observations[1].properties,'factoryLabel'));
 assert.equal(raw.observations[1].properties.scoreTrack.state,'unknown');
 assert.equal(raw.observations[0].quantity,0);assert.deepEqual(raw.observations[0].bbox,{x:0,y:0,width:.3,height:.2});assert.deepEqual(trace.items,wire.items);
 assert(trace.deferred.some(d=>d.property==='scoreTrack'&&d.reason==='inapplicable-source-area'));
 const receipt={request,result:raw,componentRefs:{'item-1':'factory','item-2':'wall'}} as any;
 // Reading an old receipt is pure: diagnostic unknowns are filtered without modifying its facts.
 receipt.result.observations[0].properties.scoreTrack={state:'unknown',value:null,reason:'occluded'};
 const old=structuredClone(receipt),gaps=observationGaps({observationReceipts:[receipt]},definition);
 assert(!gaps.get('factory')?.some(g=>g.property==='scoreTrack'));assert(gaps.get('wall')?.some(g=>g.property==='scoreTrack'));assert.deepEqual(receipt,old);
});
test('unassigned/invalid area and historical requests never suppress unknowns, unknown face is not back',()=>{
 const {definition,request}=compile('azul','offer',true);
 const raw=decodeLiteralObservationPayload({items:[row(null),row('private')]},request,definition);
 for(const o of raw.observations){assert.equal(o.sourceAreaId,null);assert.equal(o.properties.factoryLabel.state,'unknown');assert.equal(o.properties.scoreTrack.state,'unknown');}
 const historical=structuredClone(request);delete historical.propertyApplicability!.areaPropertyIds;
 const o={...raw.observations[0],sourceAreaId:'offer'};assert(observationPropertyApplicable(historical,o,'scoreTrack',definition));
 const hanabi=compile('hanabi','fireworks');const cards=['unknown','front','back'].map(face=>({kind:'cards',face,quantity:1,box_1000:null,attributes:[{id:'number',valueJson:null,unknownReason:'occluded'}]}));
 const decoded=decodeLiteralObservationPayload({items:cards},hanabi.request,hanabi.definition);
 assert.equal(decoded.observations[0].properties.number.state,'unknown');assert.equal(decoded.observations[1].properties.number.state,'unknown');assert(!Object.hasOwn(decoded.observations[2].properties,'number'));
});
test('both transports describe same area requirements while compact property codes and semantic values remain stable',()=>{
 const {definition,request}=compile('azul','offer',true),body=buildGeminiGameBody(request,definition,Buffer.from('offline'),'image/jpeg'),prompt=body.contents[0].parts[0].text!;
 assert(prompt.includes('Required properties by observed source area'));assert(prompt.includes('When sourceAreaId is null'));
 const contract=compactTerraContract(request,definition,prompt,LEAN_TERRA_PROFILE);assert(contract.prompt.includes('Required properties by observed source area'));assert(contract.prompt.includes('inapplicable to the observed area'));
 const kinds=compactTerraKinds(request,definition,LEAN_TERRA_PROFILE),board=kinds.find(k=>k.id==='boards')!,field=board.properties.find(p=>p.id==='factoryLabel')!;
 const payload={v:3,items:[{k:board.k,b:null,f:'f',q:0,u:'g',ar:'offer',a:[{p:field.p,v:'"工場"'}],x:[]}]};
 const expanded=expandCompactTerraPayload(payload,request,definition,LEAN_TERRA_PROFILE);assert.equal(expanded[0]!.sourceAreaId,'offer');assert.equal(expanded[0]!.attributes[0].valueJson,'"工場"');assert.equal(expanded[0]!.physicalUnit,'group');assert.equal(expanded[0]!.quantity,0);
 const legacy=structuredClone(request);delete legacy.propertyApplicability!.areaPropertyIds;
 assert.deepEqual(compactTerraKinds(legacy,definition,LEAN_TERRA_PROFILE),kinds);
});
test('important lower-card identities and unknown pile roles are not reduced by visual overlap or area names',()=>{
 for(const [game,area,component,props] of [['seven-wonders','city','age-cards',['printedName','ageLabel','cardColor']],['lost-cities','expeditions','cards',['suit','number','investments']],['dominion','supply','cards',['printedName','cardType']]] as const){
  const {request,definition}=compile(game,area);for(const id of props)assert(request.allowedPropertyIds[component].includes(id));
  const wire={items:[{kind:component,face:'front',quantity:null,box_1000:null,attributes:props.map(id=>({id,valueJson:null,unknownReason:'occluded'}))}]};
  const decoded=decodeLiteralObservationPayload(wire,request,definition);for(const id of props)assert.equal(decoded.observations[0].properties[id].state,'unknown');assert.equal(decoded.observations[0].quantity,null);
 }
});
