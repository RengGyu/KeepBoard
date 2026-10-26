import test from 'node:test';import assert from 'node:assert/strict';
import {validateGenericRecord} from '../shared/genericRecord.ts';
import type {GamePack,Value} from '../shared/types.ts';
const pack={runtime:{fieldBindings:[{key:'map.scene',areaIds:['map'],componentIds:['tiles']}]}} as unknown as GamePack;
const piece={id:'one',componentId:'tiles',variant:null,quantity:null,label:'',anchor:'元の位置',evidenceId:null,region:null};
const record=(p:unknown)=>({version:'game-component-record-v1',pieces:[p]}) as Value;
test('v1 untouched records retain missing placement, order, null/zero and physical duplicates',()=>{const r={version:'game-component-record-v1',pieces:[piece,{...piece,id:'two',quantity:0}]};assert.deepEqual(validateGenericRecord(r as Value,pack,'map.scene',[]),r);assert(!Object.hasOwn(validateGenericRecord(r as Value,pack,'map.scene',[]).pieces[0],'placement'));});
test('optional manual placement is independent of the original photo crop',()=>{const p={...piece,evidenceId:'photo',region:{x:.2,y:.2,width:.3,height:.3},placement:{areaId:'map',x:.9,y:.1,rotation:270}};assert.deepEqual(validateGenericRecord(record(p),pack,'map.scene',['photo']).pieces[0],p);});
test('invalid/unknown placement is rejected without coercing the original',()=>{for(const placement of [{areaId:'other',x:.1,y:.2,rotation:0},{areaId:'map',x:NaN,y:.2,rotation:0},{areaId:'map',x:1.1,y:.2,rotation:0},{areaId:'map',x:.1,y:.2,rotation:45},null]){const p={...piece,placement};assert.throws(()=>validateGenericRecord(record(p),pack,'map.scene',[]));assert.deepEqual(p.placement,placement);}});
