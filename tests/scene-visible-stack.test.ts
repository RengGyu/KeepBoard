import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {register} from 'node:module';
import {readFileSync} from 'node:fs';
import {withRestoration} from '../gamepacks/catalog';
import {projectRestorationScene} from '../shared/sceneProjection';
import {resolveSceneDisplay,sceneDisplayKey} from '../shared/sceneDisplay';
import {decodeSceneReading} from '../shared/sceneReading';
import type {Session,GamePack} from '../shared/types';
import type {GenericRecord} from '../shared/genericRecord';
import type {ScenePartitionState} from '../shared/restorationScene';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {RestorationSceneView}=await import('../src/RestorationSceneView');
const {PhotoLayoutBoard}=await import('../src/PhotoLayoutBoard');

// Saved literals supply normal source pins only. The supported relations/role below are synthetic, not photo truth.
function fixture(count:number,edges:[number,number][]){
 const data=JSON.parse(readFileSync('docs/real-photo-review-20261110/cases/final-pool-04/view.json','utf8'));
 const session=data.session as Session,pack=withRestoration(data.pack) as GamePack,a=session.assertions.find(a=>a.basis!=='rule')!,receipt=a.observationReceipts![0],observations=receipt.result.observations.slice(0,count);
 session.assertions=[a];delete session.restoration;
 (a.value as unknown as GenericRecord).pieces=(a.value as unknown as GenericRecord).pieces.filter(p=>observations.some(o=>receipt.componentRefs[o.ref]===p.id));
 receipt.result.observations=observations;
 const profile=projectRestorationScene({session,pack}).profile;
 receipt.request.scene={version:'scene-reading-v1',profileSHA:profile.pin.profileSHA,requested:['region'],allowedRoleIds:['discard'],roleHints:[],boardComponentIds:[],roleComponentIds:{discard:['cards']}};
 receipt.result.scene=decodeSceneReading({version:'scene-reading-v1',profileSHA:profile.pin.profileSHA,boardRefs:[],geometry:[],relations:[],regions:[{ref:'discard',imageIndex:0,boardRef:null,memberObservationRefs:observations.map(o=>o.ref),roleCandidates:['discard']}]},receipt.request,receipt.result,receipt.transforms);
 assert.equal(receipt.result.scene.deferred.length,0);
 const syntheticSHA='0'.repeat(64);
 receipt.request.spatial={version:'spatial-request-v1',schemaSHA256:syntheticSHA,responseSchemaSHA:syntheticSHA,definitionSHA:syntheticSHA,spatialDefinitionSHA:syntheticSHA,sourceSHA:receipt.request.sourceSHA,photoDefinitionSHA:receipt.request.definitionSHA,packVersion:pack.version,frames:[],structuralNamespaces:[],prompt:{common:'synthetic relation fixture',gameInstruction:''}};
 receipt.result.spatial={version:'spatial-observation-v1',boardInstances:[],placements:[],cellStates:[],deferred:[],relations:edges.map(([from,to])=>({fromRef:observations[from].ref,toRef:observations[to].ref,kind:'same-visible-stack',basis:'observed-visible-relation',partial:true}))};
 const scene=projectRestorationScene({session,pack});
 assert.equal(scene.relations.filter(r=>r.kind==='same-visible-stack').length,edges.length,'actual validated spatial relation dispatch');
 assert.equal(scene.profile.regions.find(r=>r.id==='discard')?.topology?.kind,'pile-collection');
 return {session,pack,scene};
}
const resolve=(f:ReturnType<typeof fixture>,scene=f.scene)=>resolveSceneDisplay({scene,pack:f.pack,assertions:f.session.assertions,evidence:f.session.evidence});
const nodes=(v:any):any[]=>!v||typeof v!=='object'?[]:Array.isArray(v)?v.flatMap(nodes):[v,...nodes(v.props?.children)];
function render(component:any,props:any){const internal=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,old=internal.H;internal.H={useState:(v:any)=>[typeof v==='function'?v():v,()=>{}],useRef:(v:any)=>({current:v}),useEffect(){}};try{return component(props);}finally{internal.H=old;}}
function actualView(f:ReturnType<typeof fixture>,scene=f.scene){
 const selected:any[]=[],tree=render(RestorationSceneView,{scene,pack:f.pack,assertions:f.session.assertions,evidence:f.session.evidence,busy:false,onSelect:(ref:any)=>selected.push(ref),onCommand:async()=>{throw Error('display must not write');}});
 const panels=nodes(tree).filter(n=>n.props?.['data-scene-content']),photos=panels.flatMap(p=>nodes(p).filter(n=>n.type===PhotoLayoutBoard));
 const buttons=[...panels.flatMap(p=>nodes(p).filter(n=>n.props?.['data-drawing-piece'])),...photos.flatMap(p=>nodes(render(PhotoLayoutBoard,p.props)).filter(n=>n.props?.['data-drawing-piece']))];
 return {tree,selected,buttons,stacks:panels.flatMap(p=>nodes(p).filter(n=>n.props?.['data-visible-stack'])),photos};
}
function assertOnce(f:ReturnType<typeof fixture>,scene=f.scene){const view=actualView(f,scene),keys=view.buttons.map(n=>sceneDisplayKey({assertionId:n.props['data-assertion-id'],pieceId:n.props['data-drawing-piece']})),expected=resolve(f,scene).parts.flatMap(p=>p.members.map(m=>sceneDisplayKey(m.ref)));assert.equal(keys.length,new Set(keys).size);assert.deepEqual([...keys].sort(),[...expected].sort());return view;}

test('decoded supported pair uses a visible-stack bundle and actual existing body; unrelated singleton remains photo',()=>{
 const f=fixture(3,[[0,1]]),before=JSON.stringify(f),out=resolve(f),stack=out.parts.find(p=>p.kind==='visible-stack')!;
 assert.equal(stack.members.length,2);assert.equal(stack.visibleStack?.relationIds.length,1);assert.equal(out.parts.find(p=>p.kind==='photo-rows')?.members.length,1);
 const view=assertOnce(f);assert.equal(view.stacks.length,1);assert.equal(view.photos.length,1);assert.match(JSON.stringify(view.stacks[0]),/숨은 총수 미확정/);
 for(const button of view.buttons)button.props.onClick();
 assert.deepEqual(view.selected.map(sceneDisplayKey).sort(),out.parts.flatMap(p=>p.members.map(m=>sceneDisplayKey(m.ref))).sort(),'actual selection is assertion+piece qualified');
 const without=structuredClone(f.scene);without.relations=[];assert.notDeepEqual(resolve(f),resolve(f,without));assert.equal(assertOnce(f,without).stacks.length,0);assert.equal(JSON.stringify(f),before);
});

test('separate pair and complete clique are distinct bundles, including group units without quantity expansion',()=>{
 const f=fixture(6,[[0,1],[2,3],[3,4],[2,4]]);const target=f.scene.entities.find(e=>e.id===f.scene.relations[0].from)!;target.physicalUnit='group';
 const a=f.session.assertions[0],piece=(a.value as unknown as GenericRecord).pieces.find(p=>p.id===target.bindings[0].pieceId)!;piece.quantity=null;
 const before=JSON.stringify(f),out=resolve(f),stacks=out.parts.filter(p=>p.kind==='visible-stack');assert.deepEqual(stacks.map(s=>s.members.length),[2,3]);assert.equal(out.parts.find(p=>p.kind==='photo-rows')?.members.length,1);assert.equal(out.consumedEntityIds.length,6);assert.equal(assertOnce(f).stacks.length,2);
 const reversed=structuredClone(f.scene);reversed.relations.reverse();assert.deepEqual(resolve(f,reversed),out);assert.equal(JSON.stringify(f),before);
});

test('chain, conflicting claim, foreign source/owner, deleted endpoint and mixed group are deferred without hiding live items',()=>{
 const cases:{name:string;change:(s:ScenePartitionState)=>void}[]=[
  {name:'chain',change:s=>{const r=s.relations[0],other=s.entities.find(e=>![''+r.from,r.to].includes(e.id))!;s.relations.push({...structuredClone(r),id:'chain',from:r.to,to:other.id});}},
  {name:'claim conflict',change:s=>{const r=s.relations[0];r.claim={id:r.claim.id,status:'conflict',candidates:[],reason:'conflicting observation'};}},
  {name:'foreign source',change:s=>{const e=s.entities.find(e=>e.id===s.relations[0].to)!;e.observations=e.observations.map(o=>({...o,sourceSHA:'f'.repeat(64)}));}},
  {name:'foreign epoch',change:s=>{const e=s.entities.find(e=>e.id===s.relations[0].to)!;e.observations=e.observations.map(o=>({...o,captureEpoch:'other-epoch'}));}},
  {name:'missing support',change:s=>{const r=s.relations[0];if(r.claim.status==='selected')r.claim.chosen.supports=[];}},
  {name:'foreign owner',change:s=>{const e=s.entities.find(e=>e.id===s.relations[0].to)!;e.bindings=e.bindings.map(b=>({...b,ownerId:'foreign'}));}},
  {name:'deleted',change:s=>{s.entities.find(e=>e.id===s.relations[0].to)!.removed=true;}},
  {name:'different group',change:s=>{const id=s.relations[0].to,g=s.groups.find(g=>g.entityIds.includes(id))!,copy={...structuredClone(g),id:'other-group',entityIds:[id]};g.entityIds=g.entityIds.filter(i=>i!==id);s.groups.push(copy);s.regions[0].groupIds.push(copy.id);}},
 ];
 for(const c of cases){const f=fixture(3,[[0,1]]);c.change(f.scene);const before=JSON.stringify(f);assert.equal(resolve(f).parts.filter(p=>p.kind==='visible-stack').length,0,c.name);assert.equal(assertOnce(f).stacks.length,0,c.name);assert.equal(JSON.stringify(f),before,c.name);}
});

test('incomplete clique and conflicting extra edge do not collapse into a smaller supported stack',()=>{
 for(const conflict of [false,true]){const f=fixture(4,[[0,1],[1,2],[0,2],[2,3]]);if(conflict)f.scene.relations[3].claim={id:'conflict',status:'unresolved',candidates:[],reason:'unresolved'};const before=JSON.stringify(f);assert.equal(resolve(f).parts.filter(p=>p.kind==='visible-stack').length,0);assert.equal(assertOnce(f).buttons.length,4);assert.equal(JSON.stringify(f),before);}
});

test('supported order continues to use relation adapter, not a stack/photo override',()=>{
 const f=fixture(3,[[0,1]]),g=f.scene.groups.find(g=>g.entityIds.includes(f.scene.relations[0].from))!,wanted=[...g.entityIds].reverse();g.presentation={slots:[],orderLevels:wanted.map(id=>[id]),orderUnresolved:[]};g.physicalOrder=[{before:wanted[0],after:wanted[1],claimId:'known-order'}];f.scene.plan.displayEntityOrder[g.id]=wanted;
 const before=JSON.stringify(f),out=resolve(f);assert(out.parts.every(p=>p.kind==='relation-layout'));assert.deepEqual(out.parts.flatMap(p=>p.members.map(m=>m.entityId)),wanted);assert.equal(assertOnce(f).stacks.length,0);assert.equal(JSON.stringify(f),before);
});
