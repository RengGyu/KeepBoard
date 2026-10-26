import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const temporary=await mkdtemp(path.join(tmpdir(),'keepboard-trial-contract-'));
process.chdir(temporary); process.env.KEEPBOARD_DATA_DIR=temporary;
globalThis.fetch=async()=>{throw new Error('Offline probe forbids network');};
const load=(p:string)=>import(pathToFileURL(path.join(root,p)).href);
const {validatePack}=await load('server/index.ts');
const {normalizeObservations,validateGeneratedPack}=await load('server/ai/index.ts');
const {normalizeSceneDetailed}=await load('shared/scene.ts');
const {editSceneSelection}=await load('shared/sceneEditing.ts');
const {groupSceneComponents}=await load('src/sceneGroups.ts');
const {sceneObservationInstructions}=await load('server/ai/scenePrompt.ts');
const {Store}=await load('server/store.ts');
const {catanPack}=await load('gamepacks/catan.ts');
const {compileProfile}=await load('docs/research/lightweight-game-onboarding/compile-profile.mjs');
const pack=compileProfile(JSON.parse(await readFile(path.join(here,'profile.json'),'utf8')));
validatePack(pack);validateGeneratedPack(structuredClone(pack));
assert.equal(pack.fields.filter((f:any)=>f.scope==='public'&&f.presentation==='scene').length,1);
assert.equal(pack.fields.filter((f:any)=>f.scope==='player'&&f.presentation==='scene').length,1);
const piece={id:'one',kind:'unknown',variant:'part-8',ownerId:'red',observedColor:'red',quantity:null,number:null,location:{type:'unplaced',id:null},region:{x:.1,y:.2,width:.1,height:.1},evidenceId:'public-photo',note:'합성 카드 A'};
const scene={version:2,coverage:'partial',components:[piece,{...piece,id:'two',quantity:1,note:'합성 카드 B'}]};
const normalized=normalizeSceneDetailed(scene,['public-photo']).scene;
assert.equal(normalized.components.length,2);assert.equal(normalized.components[0].quantity,null);
assert.deepEqual(normalized.components[0].region,piece.region);assert.equal(normalized.components[0].note,piece.note);
const publicEvidence=[{id:'public-photo',ownerId:undefined,scope:'public',captureEpoch:'epoch',kind:'photo'}];
const hiddenAttempt=normalizeObservations({assertions:[{field:'player.components.observed',ownerId:'red',value:scene,evidenceIds:['public-photo']}]},pack,publicEvidence,'turn',['red']);
assert.equal(hiddenAttempt.assertions.length,0);
const gaps={
  existingScenePromptHasCatan19:sceneObservationInstructions(pack).includes('19'),
  genericOwnerEditIsNoop:editSceneSelection(normalized,['one'],{ownerId:'blue'})===normalized,
  samePaletteDifferentNamedCardsGrouped:groupSceneComponents(normalized).some((g:any)=>g.ids.includes('one')&&g.ids.includes('two')),
};
assert.ok(gaps.existingScenePromptHasCatan19);
assert.ok(gaps.genericOwnerEditIsNoop);
assert.ok(gaps.samePaletteDifferentNamedCardsGrouped);
const storage:any={};
const image=await readFile(path.join(root,'assets/research/catan-new-photo/catan-korean-progress.jpg'));
for(const [name,p] of [['catan',catanPack],['lightweight',pack]] as const){
 const store=new Store(path.join(temporary,name),path.join(root,'public'));
 let start=performance.now();const url=await store.saveEvidence(`data:image/jpeg;base64,${image.toString('base64')}`);const imageWriteMs=performance.now()-start;
 const ev={id:'public-photo',url,scope:'public',kind:'photo',captureEpoch:'epoch',capturedAt:'2026-10-21T00:00:00Z',label:'공개 연구사진'};
 const assertions=[{id:'public',field:'components.observed',status:'accepted',basis:'user',value:scene,evidenceIds:[ev.id],updatedAt:ev.capturedAt},{id:'private',field:'player.components.observed',ownerId:'red',status:'accepted',basis:'user',value:{version:2,coverage:'catalog',components:[{...piece,id:'private-card',evidenceId:null,region:null,note:'합성 개인 카드'}]},evidenceIds:[],updatedAt:ev.capturedAt}];
 const s={id:`store-${name}`,name:'합성',createdAt:ev.capturedAt,updatedAt:ev.capturedAt,gamePackId:p.id,gamePackVersion:p.version,gamePack:p,captureEpoch:'epoch',turnInstanceId:'turn',stage:'saved',players:[{id:'red',name:'빨강',color:'#cf6656'}],evidence:[ev],assertions,preservations:[],snapshots:[{id:'snap',createdAt:ev.capturedAt,captureEpoch:'epoch',turnInstanceId:'turn',gamePackVersion:p.version,assertions:structuredClone(assertions),evidence:[ev],preservations:[],notes:{red:'합성 개인 메모'}}],notes:{red:'합성 개인 메모'},activity:[],example:false};
 start=performance.now();await store.saveSession(s);const metadataWriteMs=performance.now()-start;
 start=performance.now();const restored=await store.getSession(s.id);const metadataReadMs=performance.now()-start;
 assert.deepEqual(restored,JSON.parse(JSON.stringify(s)));
 assert.equal(restored.assertions.filter((a:any)=>!a.ownerId).length,1);
 assert.equal(restored.assertions.find((a:any)=>a.ownerId==='red').value.components[0].note,'합성 개인 카드');
 storage[name]={imageWriteMs,metadataWriteMs,metadataReadMs,metadataFileBytes:(await readFile(path.join(store.root,'sessions',`${s.id}.json`))).length,roundtrip:true,photoBytes:image.length};
}
await writeFile(path.join(here,'contract-probes.json'),JSON.stringify({status:'passed',checks:['generated pack passes current two validators','single public and single owner scene definition','generic IDs and unknown quantity preserved','original region and note preserved','public evidence cannot produce hidden owner scene','same synthetic public/private/notes/snapshot data and pinned pack survive both Store roundtrips'],observedProductGaps:gaps,storage,scope:'synthetic offline API/data helpers only, not browser/authentication/recognition'},null,2)+'\n');
console.log('CONTRACT PASS; 3 existing product gaps reproduced (not feature passes).');
