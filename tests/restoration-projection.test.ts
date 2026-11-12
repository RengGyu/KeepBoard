import test from 'node:test';import assert from 'node:assert/strict';
import {projectGenericDrawing,projectRummikubDrawing} from '../shared/drawingProjection';
import {spatialView} from '../shared/spatialPlacement';
import {fixture,spatialFixture,assemble,item,board,placement,spatial} from './fixtures/spatial/builders';
import {cropPhotoTransform} from '../shared/photoGeometry';
import type {Assertion,Evidence} from '../shared/types';
const evidence:Evidence={id:'synthetic-photo',url:'/uploads/synthetic.png',capturedAt:'now',captureEpoch:'synthetic-epoch',scope:'public',kind:'photo',label:''};
test('generic projection keeps values/null/0 and source coordinates, prioritizes a validated manual placement without cloning quantity',()=>{
 const f=fixture('blokus'),out=assemble(f,{items:[{...item(),quantity:0}]}),a=out.assembled.assertions[0],piece=out.pieces[0],before=JSON.stringify(a);
 const draw=projectGenericDrawing(a,[piece],[evidence]);assert.equal(draw.length,1);assert.equal(draw[0].value,piece);assert.equal(draw[0].value.quantity,0);assert.equal(draw[0].position.space,'photo');assert.equal(JSON.stringify(a),before);
 piece.placement={areaId:'manual',x:0,y:0,rotation:0};const b={viewBox:[0,0,100,100]as[number,number,number,number],areas:[{id:'manual',field:a.field,slots:[]}]};assert.equal(projectGenericDrawing(a,[piece],[evidence],b)[0].position.space,'manual');assert.equal(projectGenericDrawing(a,[piece],[evidence],{...b,areas:[]})[0].position.space,'photo');
 a.observationReceipts![0].componentRefs={};assert.equal(projectGenericDrawing(a,[piece],[evidence])[0].position.space,'unlocated');assert.equal(piece.quantity,0);
});
test('Rummikub proves source by componentRefs, maps crop once and keeps manual group order, never chooses first evidence',()=>{
 const f=fixture('rummikub','table');const t=cropPhotoTransform({transformId:'crop',sourceSHA:'b'.repeat(64),inputSHA:f.request.images[0].sha256,sourceDimensions:{width:1000,height:800},inputDimensions:{width:500,height:400},region:{x:.2,y:.3,width:.5,height:.5}});f.request.images[0].transformId=t.transformId;
 const {assembleObservations}=requireAssembly; // static module below
 const raw={version:'lightweight-observation-v1' as const,coverage:'partial' as const,completion:'complete' as const,observations:[{ref:'tile',imageIndex:0,panelRef:null,componentId:'numbers',bbox:{x:.1,y:.2,width:.2,height:.2},face:'front' as const,quantity:1,rotationDegrees:null,properties:{number:{state:'observed' as const,value:8}},referenceCandidates:[]}]};
 const out=assembleObservations({request:f.request,definition:f.definition,pack:f.pack,result:raw,transforms:[t],reader:identity,turnInstanceId:'turn',sourceImageSHA:'b'.repeat(64)}),a=out.assertions[0],scene=a.value as any,tile=scene.loose[0];a.evidenceIds=['other',evidence.id];tile.evidenceIds=['other',evidence.id];
 const draw=projectRummikubDrawing(a,scene,[{...evidence,id:'other'},evidence]);assert.equal(draw[0].position.space,'photo');if(draw[0].position.space==='photo'){assert.equal(draw[0].position.evidenceId,evidence.id);assert.equal(draw[0].position.sourceSHA,'b'.repeat(64));assert.deepEqual(draw[0].position.box,tile.region);assert(Math.abs(draw[0].position.box.x-.25)<1e-9);}
 scene.groups=[{id:'manual-group',label:'',tiles:[tile]}];assert.equal(projectRummikubDrawing(a,scene,[evidence]).length,1);assert.deepEqual(projectRummikubDrawing(a,scene,[evidence])[0].position,{space:'group',groupId:'manual-group',index:0});
});
import * as requireAssembly from '../server/ai/observationAssembly';import {TERRA_HIGH_IDENTITY as identity} from '../server/ai/terraGameReader';
test('unassigned public player board renders an instance without loosening spatial storage owner guards or frame pins',()=>{
 const f=spatialFixture('sagrada','window'),frame=f.request.spatial!.frames[0],area=frame.areas.find(a=>a.acceptedComponents.includes('dice'))!,out=assemble(f,{items:[item('dice')],spatial:spatial([board(f.request,area.id)],[placement(area.id,area.addresses[0].address)])}),a=out.assembled.assertions[0],p=out.pieces[0];
 const b={variant:frame.id,placementFrame:frame.placementFrame,assetSHA:frame.sourceSHA,viewBox:frame.viewBox,areas:frame.areas.map(a=>({id:a.id,field:a.fieldKey,accepts:a.acceptedComponents,slots:a.addresses.map(s=>({id:s.slotId,x:s.x,y:s.y,w:s.w,h:s.h}))}))};
 assert.equal(a.field,'__photo.public');assert.equal(spatialView(p,b,p.spatial!.resolved!.fieldKey),undefined);const d=projectGenericDrawing(a,[p],[evidence],b)[0];assert.equal(d.position.space,'board');assert.equal(p.spatial!.boundOwnerId,null);
 assert.equal(projectGenericDrawing(a,[p],[evidence],{...b,assetSHA:'changed'})[0].position.space,'photo');
 p.spatial!.source.partition='owner_private';assert.notEqual(projectGenericDrawing(a,[p],[evidence],b)[0].position.space,'board');
});
