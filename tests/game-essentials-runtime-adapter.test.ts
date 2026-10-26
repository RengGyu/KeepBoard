import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {adaptSpecification,effectiveProtectedOwners,physicalOnlyField} from '../shared/gameEssentials.ts';
import {rummikubPack} from '../gamepacks/rummikub.ts';
const fixture=JSON.parse(await readFile(new URL('../docs/game-essentials/runtime/fixtures/hanabi.json',import.meta.url),'utf8'));
test('adapter never lowers own-hidden/shared-secret to public input or treats preservation as its answer',()=>{
 const pack=adaptSpecification(fixture,'abc');assert.equal(physicalOnlyField(pack,'hand.scene'),true);assert.ok(!pack.fields.some(f=>f.key==='hand.scene'||f.key==='deck.scene'));assert.ok(pack.preservationTemplates.some(p=>p.sourceVisibility==='own-hidden'&&p.externalOnly));assert.equal(pack.runtime?.support.recognition,'manual');assert.equal(pack.runtime?.source.editionId,fixture.edition.id);
 assert.deepEqual([...effectiveProtectedOwners(pack,[{id:'p1',name:'P',color:'red'}],new Set())],[]);
 assert.deepEqual([...effectiveProtectedOwners(pack,[{id:'p1',name:'P',color:'red'}],new Set(['p1']))],['p1']);
});
test('required/ask remain selective, scalar choices and source lifetime are retained',()=>{
 const spec=structuredClone(fixture);spec.state_fields.push({id:'round',label:'현재 라운드',type:'number',scope:'public',visibility:'public',lifetime:'round',acquisition:['manual'],description:'기록',component_ids:[],area_ids:[]});spec.resume.required_field_ids=['round'];spec.recognition_correction.must_ask_field_ids=['turn'];
 const pack=adaptSpecification(spec,'hash');assert.equal(pack.fields.find(f=>f.key==='round')?.lifetime,'round');assert.deepEqual(pack.requirements.map(r=>r.fields[0]),['round','turn']);assert.equal(pack.requirements.length,2);
});
test('native Rummikub model fields remain native while preservation metadata joins a new pinned version',async()=>{
 const spec=JSON.parse(await readFile(new URL('../docs/game-essentials/runtime/fixtures/rummikub.json',import.meta.url),'utf8'));const before=JSON.stringify(rummikubPack),pack=adaptSpecification(spec,'1234567890abcdef',rummikubPack);
 assert.equal(pack.id,'rummikub');assert.equal(pack.fields.find(f=>f.key==='rack.scene')?.visibility,'owner');assert.equal(pack.runtime?.fieldBindings.find(b=>b.key==='rack.scene')?.editor,'native');assert.ok(pack.preservationTemplates.some(p=>p.id==='spec.pool.preserve'));assert.ok(pack.fields.some(f=>f.key==='currentPlayer'));assert.equal(JSON.stringify(rummikubPack),before);assert.notEqual(pack.version,rummikubPack.version);assert.deepEqual(pack,adaptSpecification(spec,'1234567890abcdef',rummikubPack));
});
