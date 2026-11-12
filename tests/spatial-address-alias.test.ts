import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSpatialResult} from '../shared/spatialObservation';
import {validateGenericRecord} from '../shared/genericRecord';
import {spatialFixture,board,placement,spatial,item,assemble,image} from './fixtures/spatial/builders';

const fixture=()=>{const f=spatialFixture('sagrada','window');const a=f.request.spatial!.frames[0].areas.find(a=>a.mode==='slot')!;return {f,a};};
const observations={observations:[{ref:'item-1',componentId:'dice'}]} as any;
test('canonical addresses stay unchanged; exact declared aliases normalize without changing literal zero/bbox/angle or raw input',()=>{
 const {f,a}=fixture(),cell=a.addresses[0];
 for(const address of [cell.address,cell.slotId]){
  const raw={items:[item('dice',[{id:'dieValue',valueJson:'0',unknownReason:null}])],spatial:spatial([board(f.request,a.id)],[placement(a.id,address,{boardRotationDegrees:60})])},before=JSON.stringify(raw);
  const {result,pieces}=assemble(f,raw),p=result.spatial!.placements[0];
  assert.equal(JSON.stringify(raw),before);assert.equal(p.anchorAddress,cell.address);assert.deepEqual(p.coveredAddresses,[cell.address]);assert.equal(p.coverageComplete,true);
  assert.equal(p.boardRotationDegrees,60);assert.equal(result.observations[0].properties.dieValue.value,0);assert.deepEqual(result.observations[0].bbox,{x:.1,y:.1,width:.1,height:.1});
  assert.equal(pieces[0].spatial!.resolved!.anchor!.slotId,cell.slotId);
  assert.equal(result.spatial!.deferred.some(d=>d.reason==='normalized-anchor-slot-id'),address!==cell.address);
  assert.equal(result.spatial!.deferred.some(d=>d.reason==='normalized-covered-slot-id'),address!==cell.address);
 }
});
test('duplicate slot IDs/duplicate target addresses are not aliases, and a canonical token never changes meaning',()=>{
 for(const collision of ['slot','target','canonical']as const){
  const {f,a}=fixture(),cell=a.addresses[0],other=a.addresses[1],alias=cell.slotId;
  if(collision==='slot')other.slotId=alias;
  if(collision==='target')other.address=cell.address;
  if(collision==='canonical')other.address=alias;
  const out=validateSpatialResult(spatial([board(f.request,a.id)],[placement(a.id,alias)]),f.request,observations);
  assert.equal(out.placements[0].anchorAddress,collision==='canonical'?alias:null);
  assert(!out.deferred.some(d=>d.reason.startsWith('normalized-')));
 }
});
test('normalization cannot turn a repeated footprint claim into certified coverage',()=>{
 const {f,a}=fixture(),cell=a.addresses[0],out=validateSpatialResult(spatial([board(f.request,a.id)],[placement(a.id,cell.slotId,{coveredAddresses:[cell.address,cell.slotId]})]),f.request,observations);
 assert.equal(out.placements[0].anchorAddress,cell.address);assert.deepEqual(out.placements[0].coveredAddresses,[cell.address]);assert.equal(out.placements[0].coverageComplete,false);
 assert(out.deferred.some(d=>d.reason==='invalid-covered-address'));
 const duplicate=validateSpatialResult(spatial([board(f.request,a.id)],[placement(a.id,cell.slotId,{coveredAddresses:[cell.slotId,cell.slotId]})]),f.request,observations);
 assert.equal(duplicate.placements.length,0);assert(duplicate.deferred.some(d=>d.reason==='invalid-placement'));
});
test('unknown/cross-area/cross-frame IDs and unregistered board instances remain unplaced',()=>{
 for(const invalid of ['unknown','cross-area','cross-frame','unregistered','out-of-scope']as const){
  const {f,a}=fixture(),alias=a.addresses[0].slotId;let token='not-declared';const b=board(f.request,a.id);
  if(invalid==='cross-area')token=f.request.spatial!.frames[0].areas.find(x=>x.id!==a.id&&x.addresses.length)!.addresses[0].slotId;
  if(invalid==='cross-frame'){
   const other=structuredClone(f.request.spatial!.frames[0]);other.id='other-frame';other.areas[0].addresses[0].slotId='only-in-other-frame';f.request.spatial!.frames.push(other);token='only-in-other-frame';
  }
  if(invalid==='unregistered'){b.orientationDegrees=null as any;token=alias;}
  if(invalid==='out-of-scope'){b.templateAreaIds=[];token=alias;}
  const out=validateSpatialResult(spatial([b],[placement(a.id,token)]),f.request,observations);
  assert.equal(out.placements[0].anchorAddress,null);assert.equal(out.placements[0].coveredAddresses,null);assert(!out.deferred.some(d=>d.reason.startsWith('normalized-')));
 }
});
test('named/free areas and photo-local coordinates cannot acquire fixed addresses through aliases',()=>{
 const {f,a}=fixture(),alias=a.addresses[0].slotId;
 a.mode='named-area';a.addressing={kind:'none'};
 const dynamic=validateSpatialResult(spatial([board(f.request,a.id)],[placement(a.id,alias)]),f.request,observations);
 assert.equal(dynamic.placements[0].namespace,'photo-local');assert.equal(dynamic.placements[0].anchorAddress,null);
 const local=validateSpatialResult(spatial([board(f.request,a.id)],[placement(a.id,alias,{namespace:'photo-local'})]),f.request,observations);
 assert.equal(local.placements[0].anchorAddress,null);assert(!local.deferred.some(d=>d.reason.startsWith('normalized-')));
});
test('a public player-board alias retains its local cell but grants no owner or private/player-field write',()=>{
 const {f,a}=fixture(),{pieces,assembled}=assemble(f,{items:[item('dice')],spatial:spatial([board(f.request,a.id)],[placement(a.id,a.addresses[0].slotId)])});
 const p=pieces[0];assert.equal(p.spatial!.resolved!.anchor!.address,a.addresses[0].address);assert.equal(p.spatial!.boundOwnerId,null);assert.equal(p.spatial!.source.ownerId,null);
 assert.equal(p.spatial!.source.partition,'player_public');assert.equal(assembled.assertions[0].field,'__photo.public');assert.equal(assembled.assertions[0].ownerId,undefined);
 assert.throws(()=>validateGenericRecord({version:'game-component-record-v1',pieces}as any,f.pack,'window.scene',[image.evidenceId]));
});
