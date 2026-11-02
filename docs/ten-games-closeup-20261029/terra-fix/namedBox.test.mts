import test from 'node:test';import assert from 'node:assert/strict';
import {namedToDecoderItems,withNamedBox,withNamedBoxPrompt,OLD_BOX_SENTENCE,NEW_BOX_SENTENCE,NAMED_BOX_SCHEMA} from './namedBox.mts';
import {decodeGeminiGameObservation} from '../../../server/ai/geminiGameReader.ts';
const it=(b:unknown)=>({kind:'development',box_1000:b,face:'front',quantity:1,attributes:[]});
test('named box converts by key, never by position or size',()=>{
 const {items,report}=namedToDecoderItems([it({xmax:534,ymin:386,ymax:495,xmin:379}),it(null)]);
 assert.deepEqual(items.map(i=>i.box_1000),[[386,379,495,534],null]);assert.deepEqual(report,{named:1,nulls:1,malformed:0,orderViolations:0});});
test('a named box with min>=max is reported and NOT repaired',()=>{const {items,report}=namedToDecoderItems([it({ymin:500,xmin:10,ymax:400,xmax:20})]);
 assert.deepEqual(items[0].box_1000,[500,10,400,20]);assert.equal(report.orderViolations,1);});
test('legacy arrays and partial objects are malformed and passed through for the decoder to reject',()=>{
 const {items,report}=namedToDecoderItems([it([1,2,3,4]),it({ymin:1,xmin:2,ymax:3}),it({ymin:1,xmin:2,ymax:3,xmax:4,extra:5})]);
 assert.equal(report.malformed,3);assert.deepEqual(items[0].box_1000,[1,2,3,4]);});
test('only the box sentence and box_1000 schema change',()=>{
 const p='A. '+OLD_BOX_SENTENCE+' B.';assert.equal(withNamedBoxPrompt(p),'A. '+NEW_BOX_SENTENCE+' B.');assert.throws(()=>withNamedBoxPrompt('none'));
 const schema={type:'object',properties:{items:{type:'array',items:{type:'object',properties:{kind:{type:'string'},box_1000:{type:['array','null']}}}}}};
 const n=withNamedBox(schema);assert.deepEqual(n.properties.items.items.properties.box_1000,NAMED_BOX_SCHEMA);assert.deepEqual(n.properties.items.items.properties.kind,{type:'string'});assert.deepEqual(schema.properties.items.items.properties.box_1000,{type:['array','null']});});
test('converted wire passes the unchanged decoder; an order violation is still rejected by it',async()=>{
 const fs=await import('node:fs/promises');const t=JSON.parse(await fs.readFile('/private/tmp/kb-terra-closeup-20261030-UR00lK/splendor-D.task.json','utf8'));
 const wire=(items:any[])=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({items})}]}}]});
 const ok=namedToDecoderItems([{kind:'development',box_1000:{ymin:100,xmin:200,ymax:300,xmax:400},face:'front',quantity:1,attributes:[]}]).items;
 const d=decodeGeminiGameObservation(wire(ok),t.request,t.definition);assert.deepEqual(d.observations[0].bbox,{x:.2,y:.1,width:.2,height:.2});
 const bad=namedToDecoderItems([{kind:'development',box_1000:{ymin:300,xmin:200,ymax:100,xmax:400},face:'front',quantity:1,attributes:[]}]).items;
 assert.throws(()=>decodeGeminiGameObservation(wire(bad),t.request,t.definition));});
