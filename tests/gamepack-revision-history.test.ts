import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const json=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
const sha=(file:string)=>createHash('sha256').update(readFileSync(file)).digest('hex');
const H='docs/gamepack-revision-20261026/history/before-runtime-revision/';
const ledger=json('docs/gamepack-revision-20261026/revision.json');
const conditionCorrections=json('docs/recognition-conditions-20261102/condition-corrections.json').corrections;
function afterApprovedPropertyCorrections(original:any){
 const expected=structuredClone(original);
 for(const c of expected.components)for(const p of c.properties){
  if(conditionCorrections.some((r:any)=>r.gameId===expected.gameId&&r.componentId===c.id&&r.propertyId===p.id))delete p.faceOnly;
  if(expected.gameId==='catan'&&c.id==='container'&&p.id==='variant')delete p.faceOnly;
  if(expected.gameId==='machi-koro'&&c.id==='cards'&&p.id==='activationNumber')p.literalNumberText=true;
  if(expected.gameId==='gloomhaven'&&c.id==='map'&&p.id==='featureType'){delete p.faceOnly;p.label='보이는 문·장애물·지형(입체물 포함)';}
 }
 const canonical=(v:any):string=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
 for(const r of json('tools/readouts/visible-choice-ranges.json').changes.filter((r:any)=>r.gameId===expected.gameId)){
  const p=expected.components.find((c:any)=>c.id===r.componentId).properties.find((p:any)=>p.id===r.propertyId);
  p.correctionChoices=Object.fromEntries(['min','max','options'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]]));
 }
 const {definitionSHA,...body}=expected;expected.definitionSHA=createHash('sha256').update(canonical(body)).digest('hex');return expected;
}
const revised=new Set(Object.keys(ledger.games));

test('the preserved history files still hash to the manifest recorded before the revision',()=>{
 for(const f of json(H+'manifest.json').files)assert.equal(sha(H+f.path),f.sha256,f.path);
});

test('unrevised games keep their exact historical capture profile, contract row and photo definition; revised ones chain from history',()=>{
 const oldProfiles=json(H+'shared/capture-profiles.json'),profiles=json('shared/capture-profiles.json');
 const oldContract=json(H+'game-photo-definitions/contract.json'),contract=json('game-photo-definitions/contract.json');
 const oldIndex=json(H+'game-photo-definitions/index.json'),index=json('game-photo-definitions/index.json');
 assert.deepEqual(Object.keys(profiles).sort(),Object.keys(oldProfiles).sort());
 assert.deepEqual(contract.source_revision.revisedGameIds.slice().sort(),[...revised].sort());
 assert.equal(contract.source_revision.previousContractSHA256,'2423a7b0601bddb9c3759b0e9c60b5602cc6045a86437975e101984320d4464b');
 for(const id of Object.keys(profiles)){
  const row=contract.games.find((g:any)=>g.game_id===id),old=oldContract.games.find((g:any)=>g.game_id===id);
  const def=index.games.find((g:any)=>g.gameId===id),oldDef=oldIndex.games.find((g:any)=>g.gameId===id);
  if(revised.has(id)){
   assert.equal(profiles[id].sourceSHA,ledger.games[id].finalSHA256,id);assert.equal(oldProfiles[id].sourceSHA,ledger.games[id].preimageSHA256,id);
   assert.notEqual(def.definitionSHA,oldDef.definitionSHA,id);
   for(const area of oldProfiles[id].areas){const now=profiles[id].areas.find((a:any)=>a.id===area.id);if(now&&now.partition===area.partition)for(const f of area.fields)if(row.manual_state_fields.includes(f))assert.fail(`${id}/${area.id}: a previously photographed field became manual-only`);}
  }else{
   assert.deepEqual(profiles[id],oldProfiles[id],id);assert.deepEqual(row,old,id);assert.deepEqual(def,afterApprovedPropertyCorrections(oldDef),id);
  }
 }
});

test('every pack version a revision replaced stays resolvable for saves that pinned it, and new boards never start from it',async()=>{
 const {legacyPack,builtinPacks,retiredPacks}=await import('../gamepacks/catalog.ts');
 const frozen=json('docs/gamepack-revision-20261026/history/before-runtime-revision/frozen-inventory.json');
 for(const id of revised){
  const version=frozen.games[id].packVersion,pack=legacyPack(id,version);
  assert(pack,`${id}@${version} must stay resolvable`);assert.equal(pack!.runtime?.source.sha256,ledger.games[id].preimageSHA256);
  assert(!builtinPacks().some(p=>p.id===id&&p.version===version),'retired versions are not offered for new boards');
 }
 assert.equal(new Set(retiredPacks.map(p=>p.id+'@'+p.version)).size,retiredPacks.length);
});
