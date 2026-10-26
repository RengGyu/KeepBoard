import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';
import {validateGenericRecord} from '../shared/genericRecord.ts';import {gameReadoutView,readoutDefinition} from '../shared/readouts/registry.ts';
import {effectiveRecognitionPack,recognitionFields} from '../shared/recognition.ts';import {genericCandidateValue} from '../server/ai/generic.ts';
const packs=JSON.parse(readFileSync('gamepacks/generated/game-essentials.json','utf8'));
const record=(pieces:any[])=>({version:'game-component-record-v1',pieces});
for(const file of readdirSync('tests/fixtures/readouts').filter(f=>f.endsWith('.json')))test(`${file}: fixture storage-boundary roundtrip, old/unknown/filled UI views and public/private evidence`,()=>{
 const f=JSON.parse(readFileSync('tests/fixtures/readouts/'+file,'utf8'));assert.equal(f.synthetic,true);
 const pack=effectiveRecognitionPack(packs.find((p:any)=>p.runtime?.source.gameId===f.gameId)),d=readoutDefinition(pack)!;
 for(const entry of f.entries){if(entry.collection==='blocked')continue;
  for(const kind of ['legacy','unknown','typed']){
   const p=entry[kind],input=record([p,{...p,id:p.id+'-separate-copy',quantity:0,region:null}]);const before=JSON.stringify(input);
   const output=validateGenericRecord(JSON.parse(before),pack,entry.fieldKey,f.evidenceIds,{playerIds:f.players.map((p:any)=>p.id)});
   assert.equal(JSON.stringify(output),before);assert.equal(output.pieces.length,2);assert.notEqual(output.pieces[0].id,output.pieces[1].id);
   assert.equal(gameReadoutView(pack,p).status,kind==='legacy'?'legacy':'structured',`${f.gameId}/${entry.componentId}/${kind} should display without mutation`);
   assert.equal(JSON.stringify(input),before);
  }
  const owner=entry.ownerId??undefined;
  const photo={id:'synthetic-photo',kind:'photo',scope:owner?'player':'public',...(owner?{ownerId:owner}:{})} as any;
  const allowed=recognitionFields(pack,owner);const field=allowed.find(v=>v.key===entry.fieldKey)??allowed.find(v=>pack.runtime!.fieldBindings.find(b=>b.key===v.key)?.componentIds.includes(entry.componentId)&&v.type==='json');
  if(!field)continue; // metadata-only components do not acquire permission through this schema.
  const raw=record([entry.freshAI]);const result:any=genericCandidateValue(raw,pack,field.key,[photo],owner,true);
  assert.equal(result.pieces[0].readout.schema,d.schema);assert.deepEqual(result.pieces[0].readout.values,entry.freshAI.readout.values);assert.notEqual(result.pieces[0].id,entry.freshAI.id);
  assert.throws(()=>genericCandidateValue(raw,pack,field.key,[{...photo,id:'not-the-source'}],owner,true));
  if(owner)assert.throws(()=>genericCandidateValue(raw,pack,field.key,[{...photo,ownerId:'another-player'}],owner,true));
  const injection=record([{...entry.freshAI,placement:{areaId:'__photo-public',x:.2,y:.2,rotation:0}}]);assert.throws(()=>genericCandidateValue(injection,pack,field.key,[photo],owner,true));
 }
});
