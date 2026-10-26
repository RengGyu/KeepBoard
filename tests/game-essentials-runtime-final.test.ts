import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {generateRuntime} from '../tools/game-runtime/generate.ts';
import {expectedEssentialsComponents} from '../tools/game-specs/essentials-check.ts';
import {validateGenericRecord} from '../shared/genericRecord.ts';
import {resumeSnapshot} from '../server/runtimeResume.ts';
import type {GamePack,Session} from '../shared/types.ts';
import {buildLedger,acceptedSourceDigest} from '../tools/game-runtime/revision-ledger.ts';
const json=async(file:string)=>JSON.parse(await readFile(file,'utf8'));
const sha=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
const packs:GamePack[]=await json('gamepacks/generated/game-essentials.json');
// The approved source revision is recomputed from the frozen inventory and current sources; the stored ledger must match it exactly.
const ledger=await json('docs/gamepack-revision-20261026/revision.json');
test('revision ledger is reproducible and keeps the historical totals as its base',()=>{
 assert.deepEqual(buildLedger(),ledger);
 assert.deepEqual(ledger.base.totals,{stateFields:1360,artComponents:437,boardAreas:522,boardGames:119});
 assert.equal(ledger.base.specDigest,'ea56965f2f689d543d62b23fe5a2c180fdba852935cc15137b18e89ad4b78b0f');
 for(const row of Object.values<any>(ledger.games)){assert.notEqual(row.preimageSHA256,row.finalSHA256);assert(row.receipts.length>0);assert.equal(row.fullRulebookVerified,false,'no revision in this ledger claims a full rulebook read');}
});

test('final 120 runtime packs match frozen source bytes, pinned edition/bindings, and deterministic generator',async()=>{
 const freeze=await json('docs/game-essentials/data-freeze.json'),manifest=await json('gamepacks/generated/game-essentials.manifest.json');
 assert.equal(freeze.spec_digest,'ea56965f2f689d543d62b23fe5a2c180fdba852935cc15137b18e89ad4b78b0f');assert.equal(packs.length,120);assert(manifest.coverage.complete);
 let fields=0;for(const source of manifest.sources){const file=`docs/research/game-specs-120/games/${source.file}`,bytes=await readFile(file),spec=JSON.parse(bytes.toString());assert(acceptedSourceDigest(ledger,source.gameId,freeze.files[file],sha(bytes)),`${source.gameId}: neither frozen nor an approved revision`);assert.equal(source.sha256,sha(bytes));
  const pack=packs.find(p=>p.runtime?.source.gameId===source.gameId)!;assert(pack);assert.equal(pack.runtime!.source.sha256,source.sha256);assert.equal(pack.runtime!.source.editionId,spec.edition.id);
  assert.deepEqual(pack.runtime!.resume.requiredFieldIds,spec.resume.required_field_ids);assert.deepEqual(pack.runtime!.resume.mustAskFieldIds,spec.recognition_correction.must_ask_field_ids);
  for(const field of spec.state_fields){assert(pack.runtime!.fieldBindings.some(b=>b.sourceId===field.id),`${source.gameId}/${field.id}`);fields++;}
 }
 assert.equal(fields,ledger.totals.stateFields);assert.equal(sha(await readFile('gamepacks/generated/game-essentials.json')),manifest.outputSha256);
 const temp=await mkdtemp(path.join(os.tmpdir(),'kb-runtime-generation-'));try{await generateRuntime('docs/research/game-specs-120/games',path.join(temp,'packs.json'));assert.equal(sha(await readFile(path.join(temp,'packs.json'))),manifest.outputSha256);}finally{await rm(temp,{recursive:true,force:true});}
});

test('regenerated art source hashes match with only the exact approved F001 description correction',async()=>{
 const baseline=await json('docs/game-essentials/baseline.json');let categories=0,differentHashes=0;
 for(const entry of baseline){const current=await json(entry.path),mapping=await json(`public/game-art/games/${entry.game_id}/mapping.json`),revision=ledger.games[entry.game_id];
  // Unrevised games keep exactly the frozen components; a revised game's components are pinned by its ledger digest and may only add the listed IDs.
  if(!revision)assert.deepEqual(current.components,expectedEssentialsComponents(entry.game_id,entry.spec.components),entry.game_id);
  else assert.deepEqual(current.components.map((c:any)=>c.id).filter((id:string)=>!entry.spec.components.some((c:any)=>c.id===id)),revision.components.added,entry.game_id);
  assert.deepEqual(new Set(mapping.components.filter((c:any)=>!c.legacy).map((c:any)=>c.component_id)),new Set(current.components.map((c:any)=>c.id)));categories+=mapping.components.filter((c:any)=>!c.legacy).length;
  const currentHash=sha(await readFile(entry.path));if(mapping.source_sha256!==currentHash)differentHashes++;
  for(const component of mapping.components){const source=current.components.find((c:any)=>c.id===component.component_id);assert.equal(component.kind,source.kind);assert.equal(component.name,source.name);}
 }
 assert.equal(categories,ledger.totals.artComponents);assert.equal(differentHashes,0,'approved regeneration must match every current source hash');
});

test('generic records preserve duplicate instances, order, unknown vs zero and authorized photo regions',()=>{
 const pack=packs.find(p=>p.id==='ticket-to-ride')!,field='hand.scene',component=pack.runtime!.fieldBindings.find(b=>b.key===field)!.componentIds[0];
 const piece={componentId:component,variant:null,quantity:null,label:'같은 카드',anchor:'첫째',evidenceId:'photo',region:{x:.1,y:.2,width:.3,height:.2}};
 const raw={version:'game-component-record-v1',pieces:[{...piece,id:'a'},{...piece,id:'b',quantity:0}]};
 assert.deepEqual(validateGenericRecord(raw,pack,field,['photo']),raw);assert.throws(()=>validateGenericRecord(raw,pack,field,[]));assert.throws(()=>validateGenericRecord({...raw,pieces:[raw.pieces[0],raw.pieces[0]]},pack,field,['photo']));assert.throws(()=>validateGenericRecord({...raw,pieces:[{...raw.pieces[0],quantity:-1}]},pack,field,['photo']));
});

test('public restore retains a current shared original cited privately; owner restore retains a saved shared original',()=>{
 const pack=packs.find(p=>p.id==='ticket-to-ride')!,photo=(id:string)=>({id,scope:'public' as const,kind:'photo' as const,url:'/synthetic.png',capturedAt:'now',captureEpoch:'epoch',label:'source'});
 const fact=(id:string,evidenceId:string)=>({id,field:'hand.scene',ownerId:'p1',value:{},basis:'user' as const,status:'accepted' as const,evidenceIds:[evidenceId],updatedAt:'now'});
 const saved={id:'save',createdAt:'now',assertions:[fact('saved','saved-public')],evidence:[photo('saved-public')],notes:{p1:'old'},preservations:[]};
 const session={players:[{id:'p1',name:'one',color:'red'}],assertions:[fact('current','new-public')],evidence:[photo('new-public')],notes:{p1:'new'},preservations:[],snapshots:[saved],captureEpoch:'current',turnInstanceId:'turn'} as unknown as Session;
 resumeSnapshot(session,pack,'public');assert(session.evidence.some(e=>e.id==='new-public'));assert.equal(session.notes.p1,'new');const epoch=session.captureEpoch;
 resumeSnapshot(session,pack,'owner','p1');assert(session.evidence.some(e=>e.id==='saved-public'));assert.equal(session.notes.p1,'old');assert.equal(session.captureEpoch,epoch);assert.equal(session.turnInstanceId,'turn');
});
