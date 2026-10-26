import test from 'node:test';import assert from 'node:assert/strict';
import {catanReviewScene} from '../src/catanObservationReviewModel.ts';
import {CATAN_TOPOLOGY,createComponent,type ComponentScene} from '../shared/scene.ts';
const empty=():ComponentScene=>({version:2,coverage:'partial',components:[]});
function fixture(entries:{ref:string;slot:string;kind?:string;quantity?:number|null}[]){
 const points=['r1c1','r1c3','r5c1','r5c3'].map(id=>CATAN_TOPOLOGY.byId.hex.get(id)!);
 const frame:any={frameId:'frame',sourceEvidenceId:'photo',sourceSHA:'a'.repeat(64),definitionSHA:'b'.repeat(64),coordinateSpace:'normalized-photo/catan-topology',orientation:0,confirmedByUser:true,correspondences:points.map(p=>({canonicalTopologyId:p.id,canonicalPoint:{x:p.x,y:p.y},photoPointNormalized:{x:(p.x+3)/6,y:(p.y+3)/6}}))};
 const source:any={id:'candidate',field:'components.observed',status:'candidate',evidenceIds:['photo'],value:{...empty(),components:entries.map(e=>createComponent(empty(),(e.kind??'terrain')as any,{id:e.ref,quantity:e.quantity===undefined?1:e.quantity,evidenceId:'photo',location:{type:'unplaced',id:null}}))},observationReceipts:[{frame,request:{version:'lightweight-observation-v1',gameId:'catan',definitionSHA:frame.definitionSHA,geometryFrameId:frame.frameId,images:[{evidenceId:'photo',sha256:frame.sourceSHA,transformId:null}]},componentRefs:Object.fromEntries(entries.map(e=>[e.ref,e.ref])),geometryCandidates:entries.map(e=>({observationRef:e.ref,frameId:frame.frameId,locationCandidate:{type:'hex',id:e.slot},method:'confirmed-frame',status:'candidate'})),transforms:[]}]};return source;
}
test('three independent locations apply while null/zero/bundle quantities stay visible unplaced; source remains immutable',()=>{
 const source=fixture([{ref:'a',slot:'r1c1'},{ref:'b',slot:'r1c2'},{ref:'c',slot:'r1c3'},{ref:'null',slot:'r2c1',quantity:null},{ref:'zero',slot:'r2c2',quantity:0},{ref:'bundle',slot:'r2c3',quantity:2}]),before=JSON.stringify(source);
 const result=catanReviewScene(source,empty(),true);assert.deepEqual(result.placedRefs,['a','b','c']);assert.equal(result.unresolved.length,3);for(const id of ['null','zero','bundle'])assert.equal(result.scene.components.find(c=>c.id===id)!.location.type,'unplaced');assert.equal(result.scene.components.length,6);assert.equal(JSON.stringify(source),before);
 assert.deepEqual(catanReviewScene(source,empty(),false).scene.components,source.value.components);
});
test('all same-layer slot contenders defer in either order, independent pieces and separate hex layers still apply',()=>{
 const entries=[{ref:'a',slot:'r1c1'},{ref:'b',slot:'r1c1'},{ref:'c',slot:'r1c2'},{ref:'n',slot:'r1c2',kind:'number-token'},{ref:'robber',slot:'r1c2',kind:'robber'}];
 for(const es of [entries,[...entries].reverse()]){const result=catanReviewScene(fixture(es),empty(),true);assert.deepEqual([...result.placedRefs].sort(),['c','n','robber']);assert.deepEqual(result.unresolved.map(x=>x.observationRef).sort(),['a','b']);for(const id of ['a','b'])assert.equal(result.scene.components.find(c=>c.id===id)!.location.type,'unplaced');}
});
test('accepted manual number and old IDs never replaced, conflicting destinations defer, missing/wrong frame is hard failure',()=>{
 const base=empty();base.components=[createComponent(base,'number-token',{id:'manual',number:8,quantity:1,location:{type:'hex',id:'r1c1'}})];const before=JSON.stringify(base),source=fixture([{ref:'observed',slot:'r1c1',kind:'number-token'},{ref:'free',slot:'r1c3'}]);
 const r=catanReviewScene(source,base,true);assert.deepEqual(r.scene.components.find(c=>c.id==='manual'),base.components[0]);assert.equal(r.scene.components.find(c=>c.id==='observed')!.location.type,'unplaced');assert.deepEqual(r.placedRefs,['free']);assert.equal(JSON.stringify(base),before);
 const conflict=fixture([{ref:'a',slot:'r1c1'}]);conflict.observationReceipts[0].geometryCandidates.push({...conflict.observationReceipts[0].geometryCandidates[0],locationCandidate:{type:'hex',id:'r1c3'}});assert.deepEqual(catanReviewScene(conflict,empty(),true).placedRefs,[]);
 source.observationReceipts[0].frame.sourceSHA='c'.repeat(64);assert.throws(()=>catanReviewScene(source,base,true),/frame|좌표/);
});
