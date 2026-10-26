import test from 'node:test';
import assert from 'node:assert/strict';
import {observationGaps,GAP_REASON} from '../shared/observationGaps.ts';

const receipt=(observations:any[],refs:Record<string,string>)=>({version:'lightweight-observation-v1',request:{} as any,result:{version:'lightweight-observation-v1',coverage:'partial',completion:'complete',observations},reader:{} as any,frame:null,transforms:[],geometryCandidates:[],componentRefs:refs}) as any;

test('reader gaps come only from unknown properties and unknown quantity in the receipt, keyed by assembled piece',()=>{
 const gaps=observationGaps({observationReceipts:[receipt([
  {ref:'a',quantity:2,properties:{face:{state:'unknown',value:null,reason:'occluded'},tileColor:{state:'observed',value:'blue'}}},
  {ref:'b',quantity:null,properties:{}},
  {ref:'c',quantity:1,properties:{tileColor:{state:'observed',value:'red'}}},
  {ref:'orphan',quantity:null,properties:{face:{state:'unknown',value:null,reason:'unreadable'}}},
 ],{a:'piece-a',b:'piece-b',c:'piece-c'})]});
 assert.deepEqual(gaps.get('piece-a'),[{property:'face',reason:'occluded'}]);
 assert.deepEqual(gaps.get('piece-b'),[{property:null,reason:'quantity'}]);
 assert.equal(gaps.has('piece-c'),false,'a fully read piece asks nothing');
 assert.equal(gaps.size,2,'an observation without an assembled piece is not invented into one');
 assert.equal(GAP_REASON.occluded,'가림');
 assert.equal(observationGaps({}).size,0,'manual records have no reader gaps');
});
