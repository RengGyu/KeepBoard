import test from 'node:test';import assert from 'node:assert/strict';
import {adaptTerraItems,terraBoxOrder} from './adapter.mts';
const it=(box:unknown,v='x')=>({kind:'development',box_1000:box,face:'front',quantity:1,attributes:[{id:'points',valueJson:v,unknownReason:null}]});
test('contract-order response keeps every box unchanged',()=>{const items=[it([238,231,385,349]),it([221,381,370,494]),it(null)];const a=adaptTerraItems(items);
 assert.equal(a.check.order,'declared');assert.equal(a.geometry,'contract');assert.deepEqual(a.items,items);});
test('alternate-order response: default withholds ALL boxes, including rows that look valid but are transposed',()=>{
 const items=[it([386,379,495,534]),it([257,414,514,375])];// first row passes min<max yet is transposed
 const a=adaptTerraItems(items);assert.equal(a.check.order,'ymin-xmin-xmax-ymax');assert.equal(a.geometry,'withheld');assert(a.items.every(i=>i.box_1000===null));
 const e=adaptTerraItems(items,'adopt-consistent-alternate');assert.equal(e.geometry,'remapped-alternate-order');assert.deepEqual(e.items.map(i=>i.box_1000),[[386,379,534,495],[257,414,375,514]]);});
test('mixed or malformed responses are withheld under both policies; nothing is guessed',()=>{
 for(const items of [[it([10,10,50,40]),it([60,10,40,50]),it([90,90,10,10])],[it([1,2,3])],[it([0,0,1001,5])]])for(const p of ['withhold-unless-declared','adopt-consistent-alternate'] as const){
  const a=adaptTerraItems(items as any,p);assert.equal(a.check.order,'unresolved');assert.equal(a.geometry,'withheld');assert(a.items.every(i=>i.box_1000===null));}});
test('all-ambiguous response follows the written contract',()=>{const items=[it([10,20,300,300])];assert.equal(terraBoxOrder(items).order,'ambiguous');assert.deepEqual(adaptTerraItems(items).items,items);});
test('kinds, values, faces, quantities and the input array are never modified',()=>{const items=[it([257,414,514,375],'"3"')],before=JSON.stringify(items);
 for(const p of ['withhold-unless-declared','adopt-consistent-alternate'] as const){const a=adaptTerraItems(items,p);assert.deepEqual(a.items.map(({box_1000,...r})=>r),items.map(({box_1000,...r})=>r));}
 assert.equal(JSON.stringify(items),before);});
