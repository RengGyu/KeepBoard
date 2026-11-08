import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogPacks} from '../gamepacks/catalog';
import {effectiveRecognitionPack} from '../shared/recognition';
import {photoDefinition} from '../server/photoDefinitions';
import {compileObservationTask} from '../shared/lightweightRecognition';
import {buildTerraGameBody,decodeTerraGameObservation,LUNA_IDENTITY,LunaGameReader} from '../server/ai/terraGameReader';
import {BASE_VISIBLE_UNIT_CONTRACT,INDIVIDUAL_RESIDUAL_CONTRACT} from '../server/ai/visibleUnitContract';
import {assembleObservations} from '../server/ai/observationAssembly';
import {prepareScanObservation,projectScanResults} from '../server/scanObservation';
import type {Evidence,Session,AnalysisResult} from '../shared/types';

test('the optional unit contract changes one generic paragraph and no provider, image, schema or property contract',()=>{
 for(const gameId of ['sagrada','codenames','six-nimmt']){
  const pack=catalogPacks.find(p=>p.id===gameId)!,definition=photoDefinition(pack),area=definition.areas[0];
  const request=compileObservationTask({pack,definition,areaId:area.id,taskId:'synthetic',scope:{partition:area.partition,ownerId:area.partition==='owner_private'?'synthetic-owner':null,captureEpoch:'epoch'},images:[{evidenceId:'photo',inputId:'photo',sha256:'a'.repeat(64),width:1000,height:1000,transformId:null}]});
  const original=buildTerraGameBody(request,definition,Buffer.from('synthetic'),'image/png');
  const candidate=buildTerraGameBody(request,definition,Buffer.from('synthetic'),'image/png',LUNA_IDENTITY.adapterVersion,{unitContract:'individual-residual-v1'});
  const restored=structuredClone(candidate),text=restored.input[0].content[0];
  assert.equal(text.text!.split(INDIVIDUAL_RESIDUAL_CONTRACT).length-1,1);
  text.text=text.text!.replace(INDIVIDUAL_RESIDUAL_CONTRACT,BASE_VISIBLE_UNIT_CONTRACT);
  assert.deepEqual(restored,original);
  assert.equal(original.model,LUNA_IDENTITY.model);assert.deepEqual(original.reasoning,{effort:LUNA_IDENTITY.reasoningEffort});
  for(const profile of ['literal-named-fill-original-v1','literal-compact-unit-original-v3'] as const)
   assert.throws(()=>buildTerraGameBody(request,definition,Buffer.from('synthetic'),'image/png',profile,{unitContract:'individual-residual-v1'}));
  assert.throws(()=>buildTerraGameBody(request,definition,Buffer.from('synthetic'),'image/png',undefined,{unitContract:'not-a-contract' as never}));
 }
});

test('same-response individuals and residual group keep their own values even with overlapping rectangles through assembly, fusion and JSON reopen',async()=>{
 const pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id==='sagrada')!),definition=photoDefinition(pack);
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=','base64');
 const evidence=[{id:'photo',kind:'photo',scope:'public',captureEpoch:'epoch',url:'/synthetic',label:'synthetic'} as Evidence];
 const session={id:'synthetic',gamePack:pack,captureEpoch:'epoch',turnInstanceId:'turn',players:[],evidence,assertions:[],notes:{},activity:[],snapshots:[]} as unknown as Session;
 const scan=await prepareScanObservation({session,pack,evidence,selection:{kind:'luna-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'window'},taskId:'mixed-units',reader:new LunaGameReader({key:async()=> 'synthetic'}),cloud:false,readImage:async()=>({data:bytes,mimeType:'image/png'})});
 const pinned=scan.units[0].hosted!;
 const item=(physicalUnit:string,box:number[],value:number|null)=>({kind:'dice',physicalUnit,quantity:null,face:'front',box_1000:{ymin:box[0],xmin:box[1],ymax:box[2],xmax:box[3]},attributes:[{id:'dieValue',valueJson:value===null?null:String(value),unknownReason:value===null?'occluded':null}]});
 // Boxes can overlap without a model-declared parent/child identity; never spread the group value.
 const native={status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({items:[item('single',[100,100,200,200],2),item('single',[300,100,400,200],null),item('group',[150,150,600,900],6)]})}]}]};
 const rawBefore=JSON.stringify(native),decoded=decodeTerraGameObservation(native,pinned.request,definition);
 const assembled=assembleObservations({request:pinned.request,result:decoded.raw,definition,pack,turnInstanceId:'turn',reader:pinned.reader,transforms:pinned.transforms,sourceImageSHA:pinned.sourceImageSHA,hostedWire:decoded.hostedWire});
 assembled.observationReceipts![0].scanUnitId=scan.units[0].id;
 assembled.scanBundle={plan:scan.plan,units:[{unitId:scan.units[0].id,state:'completed',observationCount:3}],links:[]};
 const result=projectScanResults(session,pack,scan,[assembled]),reopened=JSON.parse(JSON.stringify(result)) as AnalysisResult;
 const pieces=(reopened.assertions[0].value as any).pieces;
 assert.equal(pieces.length,3);assert.deepEqual(pieces.map((p:any)=>p.readout.values.dieValue),[2,null,6]);
 assert.deepEqual(pieces.map((p:any)=>p.quantity),[null,null,null]);
 assert.equal(reopened.scanBundle!.fusion!.refinements.length,0);
 assert.deepEqual(reopened.observationReceipts![0].hostedWire!.physicalUnits,{'item-1':'single','item-2':'single','item-3':'group'});
 assert.equal(reopened.observationReceipts![0].result.observations.length,3);
 const projection=(r:AnalysisResult)=>({values:r.assertions.map(a=>a.value),bundle:r.scanBundle,receipts:r.observationReceipts});
 assert.deepEqual(projection(projectScanResults(session,pack,scan,[assembled,assembled])),projection(result));
 assert.equal(JSON.stringify(native),rawBefore);
});
