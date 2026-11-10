import test from 'node:test';
import assert from 'node:assert/strict';
import * as support from '../shared/releaseSupport';
import {catalogPacks} from '../gamepacks/catalog';
import {catalogSummary} from '../shared/gameEssentials';
import {compileObservationTask,type HostedObservationWire} from '../shared/lightweightRecognition';
import {photoDefinition} from '../server/photoDefinitions';
import {decodeLiteralObservationPayload} from '../server/ai/geminiGameReader';
import {observationGaps,observationPropertyApplicable} from '../shared/observationGaps';

const compile=(pack:any,areaId:string)=>{const definition=photoDefinition(pack),area=definition.areas.find(a=>a.id===areaId)!;return {definition,request:compileObservationTask({pack,definition,areaId,taskId:'fixture',scope:{partition:area.partition,ownerId:area.partition==='owner_private'?'owner':null,captureEpoch:'epoch'},images:[{evidenceId:'photo',inputId:'photo',sha256:'a'.repeat(64),width:1000,height:800,transformId:null}]})};};
test('all shipped packs default to photo; only explicit drawing policy admits a new reading',()=>{
 for(const pack of catalogPacks){assert.equal(support.releaseTierFor(pack),'photo');assert.equal(support.drawingEnabled(catalogSummary(pack)),false);}
 const fixture={...catalogPacks[0],releaseTier:'drawing' as const};assert.equal(support.drawingEnabled(fixture),true);assert.equal(support.drawingEnabled(catalogSummary(fixture)),true);
});
test('area policy filters only requested fields and retains exact definition/source/version guards',()=>{
 const pack=catalogPacks.find(p=>p.runtime?.source.gameId==='hanabi')!,{definition,request}=compile(pack,'fireworks');
 assert.deepEqual(request.allowedPropertyIds.cards,['face','suit','number']);assert.equal(request.definitionSHA,definition.definitionSHA);
 const legacy={...pack};delete legacy.photoReadingPolicy;assert(compile(legacy,'fireworks').request.allowedPropertyIds.cards.includes('printedName'));
 const tokens=compile(pack,'tokens').request;assert(tokens.allowedPropertyIds.tokens.includes('tokenSide'));
 assert.throws(()=>compile({...pack,photoReadingPolicy:{...pack.photoReadingPolicy,definitionSHA:'0'.repeat(64)}},'fireworks'),/정책/);
});
test('explicit back front-only fields are inapplicable; unknown face remains a real unknown and zero is preserved',()=>{
 const pack=catalogPacks.find(p=>p.runtime?.source.gameId==='hanabi')!,{definition,request}=compile(pack,'fireworks');
 const trace:HostedObservationWire={id:'gemini-game-wire-v1',items:[],deferred:[]};
 const wire={items:['back','unknown','front'].map(face=>({kind:'cards',box_1000:null,face,quantity:0,attributes:[{id:'number',valueJson:null,unknownReason:'unreadable'}]}))};
 const raw=decodeLiteralObservationPayload(wire,request,definition,trace);
 assert.equal(Object.hasOwn(raw.observations[0].properties,'number'),false);
 assert.equal(raw.observations[1].properties.number.state,'unknown');assert.deepEqual(raw.observations[1].properties.number,{state:'unknown',value:null,reason:'unreadable'});
 assert.equal(Object.hasOwn(raw.observations[2].properties,'printedName'),false);assert.equal(raw.observations[0].quantity,0);assert.deepEqual(trace.items,wire.items);
 assert.equal(observationPropertyApplicable(request,raw.observations[0],'number',definition),false);
 const receipt={request,result:raw,componentRefs:{'item-1':'back','item-2':'unknown','item-3':'front'}} as any;
 const gaps=observationGaps({observationReceipts:[receipt]},definition);assert(!gaps.get('back')?.some(g=>g.property==='number'));assert(gaps.get('unknown')?.some(g=>g.property==='number'));
 // Existing receipt values survive; an unasked diagnostic unknown does not become a correction demand.
 receipt.result.observations[2].properties.printedName={state:'unknown',value:null,reason:'unreadable'};
 assert(!observationGaps({observationReceipts:[receipt]},definition).get('front')?.some(g=>g.property==='printedName'));
});
test('policy generation is reproducible with pinned historical definitions and old receipts stay intact',async()=>{
 const {readFileSync}=await import('node:fs'),{generateReleaseReading}=await import('../tools/lightweight-recognition/generate-release-reading.mts');
 assert.deepEqual(generateReleaseReading(),JSON.parse(readFileSync('gamepacks/generated/release-reading.json','utf8')));
 const legacy={request:{allowedPropertyIds:{cards:['number','face']}},result:{observations:[{ref:'old',componentId:'cards',face:'back',quantity:1,properties:{number:{state:'unknown',value:null,reason:'wrong-face'},face:{state:'observed',value:'back'}}}]},componentRefs:{old:'old-card'}} as any;
 const frozen=structuredClone(legacy);assert.equal(observationGaps({observationReceipts:[legacy]}).size,0);assert.deepEqual(legacy,frozen);
 legacy.result.observations[0].face='unknown';assert(observationGaps({observationReceipts:[legacy]}).get('old-card')?.some(g=>g.property==='number'));
});
test('an optional current definition cannot reinterpret an older receipt with a different definition hash',()=>{
 const d=photoDefinition(catalogPacks.find(p=>p.runtime?.source.gameId==='hanabi')!),request={definitionSHA:d.definitionSHA,allowedPropertyIds:{cards:['number']}};
 const observation={componentId:'cards',face:'back' as const,properties:{number:{state:'unknown' as const,value:null,reason:'unreadable' as const}}};
 assert.equal(observationPropertyApplicable(request,observation,'number',d),false);
 assert.equal(observationPropertyApplicable(request,observation,'number',{...d,definitionSHA:'b'.repeat(64)}),true);
});
