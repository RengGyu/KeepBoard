import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {GAME_READOUTS} from '../shared/readouts/catalog.ts';
import {effectiveRecognitionPack,recognitionFields} from '../shared/recognition.ts';
import {emptyGameReadout,validateGameReadout,setReadoutValue,readoutDefinition} from '../shared/readouts/registry.ts';
import {validateGenericRecord} from '../shared/genericRecord.ts';import {genericCandidateValue} from '../server/ai/generic.ts';
import {readoutRows} from '../shared/readouts/presentation.ts';
const expected=JSON.parse(readFileSync('tests/fixtures/readout-source-contracts.json','utf8'));
const packs=JSON.parse(readFileSync('gamepacks/generated/game-essentials.json','utf8'));
test('exactly remaining117 contracts; no modification/override of native or Splendor',()=>{
 assert.equal(Object.keys(GAME_READOUTS).length,117);assert.deepEqual(Object.keys(GAME_READOUTS).sort(),expected.map((x:any)=>x.gameId).sort());
 for(const id of ['catan','rummikub','splendor'])assert.equal(GAME_READOUTS[id],undefined);
});
for(const source of expected)test(`${source.gameId}: pinned descriptors, all original components, strict values and actual photo boundary`,()=>{
 const d=GAME_READOUTS[source.gameId];assert.ok(d,'game has new descriptor');assert.equal(d.sourceSHA,source.sourceSHA);assert.equal(d.editionId,source.editionId);assert.equal(d.packVersion,source.packVersion);
 assert.deepEqual(d.components.map(c=>c.id).sort(),source.components.map((c:any)=>c.id).sort());
 const pack=effectiveRecognitionPack(packs.find((p:any)=>p.id===source.runtimePackId)),before=JSON.stringify(pack);
 for(const c of d.components){assert.ok(c.fields.length>0);assert.equal(new Set(c.fields.map(f=>f.id)).size,c.fields.length);
  const blank=emptyGameReadout(pack,c.id);assert.deepEqual(validateGameReadout(blank,pack,c.id,null),blank);
  assert.throws(()=>validateGameReadout({...blank,extra:true},pack,c.id,null));assert.throws(()=>validateGameReadout({...blank,schema:'wrong-v1'},pack,c.id,null));
  const wrong=structuredClone(blank);wrong.values.invented=1;assert.throws(()=>validateGameReadout(wrong,pack,c.id,null));
  for(const f of c.fields.filter(f=>f.type==='integer')){let r=structuredClone(blank);if(f.faceOnly){r.values.face='front';r.sources.face='user';}
   if(f.min===undefined||f.min<=0){r=setReadoutValue(pack,r,f.id,0);assert.equal(r.values[f.id],0);r=setReadoutValue(pack,r,f.id,null);assert.equal(r.values[f.id],null);}
   for(const bad of [NaN,Infinity,1.25,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>setReadoutValue(pack,r,f.id,bad));
  }
  const allowed=recognitionFields(pack).find(f=>pack.runtime!.fieldBindings.find((b:any)=>b.key===f.key)?.componentIds.includes(c.id)&&f.type==='json');
  if(allowed){const p={id:'synthetic',componentId:c.id,variant:null,quantity:null,label:'원 label 유지',anchor:'원 anchor',evidenceId:'photo',region:null,readout:blank};
   const record={version:'game-component-record-v1',pieces:[p]};const out:any=genericCandidateValue(record,pack,allowed.key,[{id:'photo',kind:'photo',scope:'public'}] as any,undefined,true);
   assert.equal(out.pieces[0].quantity,null);assert.equal(out.pieces[0].label,p.label);assert.equal(out.pieces[0].readout.schema,d.schema);
   const manual=c.fields.find(f=>f.acquisition==='manual'&&f.type==='text');if(manual){const inject=structuredClone(record);inject.pieces[0].readout.values[manual.id]='몰래 채운 이력';inject.pieces[0].readout.sources[manual.id]='observation';assert.throws(()=>genericCandidateValue(inject,pack,allowed.key,[{id:'photo',kind:'photo',scope:'public'}] as any,undefined,true));}
  }
 }
 assert.equal(JSON.stringify(pack),before);
 for(const b of source.bindings.filter((b:any)=>['physical-only','opaque-preserve'].includes(b.editor)||['hidden','own-hidden','role-limited'].includes(b.visibility))){assert(!recognitionFields(pack).some(f=>f.key===b.key));assert(!recognitionFields(pack,'p1').some(f=>f.key===b.key));}
 const unsupported=structuredClone(pack);unsupported.runtime!.source.sha256='changed';assert.equal(readoutDefinition(unsupported),undefined);
});
