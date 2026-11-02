import test from 'node:test';import assert from 'node:assert/strict';
import {linkScanObservations,mergeObservedFacts} from '../shared/scanObservation';
const o=(unitId:string,ref:string,x:number,kind='number-token',value:number|null=8,sourceSHA='a')=>({unitId,observationRef:ref,sourceSHA,bbox:{x,y:.1,width:.05,height:.05},componentId:kind,properties:{number:value===null?{state:'unknown',value:null,reason:'unreadable'}:{state:'observed',value}},role:'crop'} as any);
test('same-source reciprocal overlap links repeats, not adjacent equal values or separate layers/photos',()=>{
 const links=linkScanObservations([o('a','item-1',.1),o('b','item-1',.101),o('b','item-2',.16),o('c','item-1',.1,'terrain'),o('d','item-1',.1,'number-token',8,'other')]);
 assert.equal(links.filter(x=>x.members.length===2).length,1);assert.equal(links.length,4);assert.equal(links.find(x=>x.members.length===2)!.status,'linked');
});
test('ambiguous neighbors and contrary values stay conflict; null never deletes known values',()=>{
 assert.equal(linkScanObservations([o('a','x',.1),o('b','x',.1),o('b','y',.1)])[0].status,'conflict');
 assert.equal(linkScanObservations([o('a','x',.1),o('b','x',.1,'number-token',9)])[0].status,'conflict');
 const base={number:6,variant:'forest',readout:{schema:'x',values:{points:2,cost:null}}};
 const r=mergeObservedFacts(base,{number:null,variant:'hills',readout:{schema:'x',values:{points:9,cost:0}}});
 assert.deepEqual(r.value,{number:6,variant:'forest',readout:{schema:'x',values:{points:2,cost:0}}});assert(r.conflicts.includes('variant'));assert(r.conflicts.includes('readout.values.points'));assert.equal(base.readout.values.cost,null);
});
test('overlap chains across three units and multiple anchor contenders never establish one identity',()=>{
 const links=linkScanObservations([o('a','x',.1),o('b','x',.106),o('c','x',.112)]);
 assert.equal(links.length,3);assert(links.every(l=>l.status==='conflict'&&l.conflicts.includes('ambiguous-source-correspondence')&&l.members.length===1));
});
