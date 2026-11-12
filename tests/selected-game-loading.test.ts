import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {selectedGameData,gameDataAssets} from '../tools/readouts/client-assets';
import {createGameDataLoader} from '../src/gameData';
import {gameDataKey,gameDataPath} from '../shared/readouts/identity';
import {prepareWorkspace} from '../src/workspacePreparation';
import {GAME_READOUTS} from '../shared/readouts/catalog';
import {readoutDefinition} from '../shared/readouts/registry';
import {catalogPacks} from '../gamepacks/catalog';
import type {GamePack} from '../shared/types';
const assets=await gameDataAssets();
const pack=catalogPacks.find(p=>p.id==='sagrada')!;
const oldRows=JSON.parse(await readFile('shared/readouts/retired.json','utf8'));
const oldDef=oldRows.azul,oldBase=catalogPacks.find(p=>p.id==='azul')!;
const retired={...oldBase,id:oldDef.runtimePackId,version:oldDef.packVersion,runtime:{...oldBase.runtime!,source:{...oldBase.runtime!.source,gameId:oldDef.gameId,editionId:oldDef.editionId,sha256:oldDef.sourceSHA}}} as GamePack;
const payload=(p:GamePack)=>{const a=assets.get(gameDataPath(p));assert(a,'pinned asset missing');return JSON.parse(a.source);};
const defer=()=>{let resolve!:(v:unknown)=>void,reject!:(e:Error)=>void;return {promise:new Promise<unknown>((a,b)=>{resolve=a;reject=b;}),resolve:(v:unknown)=>resolve(v),reject:(e:Error)=>reject(e)};};
test('one exact current/retired payload, not an all-game download; failures/unknown editions cannot poison other cache keys',async()=>{
 const calls:string[]=[],delayed=defer();let fail=true;
 const l=createGameDataLoader(async url=>{calls.push(url);if(url===gameDataPath(retired))return delayed.promise;if(fail){fail=false;throw Error('offline');}const a=assets.get(url);if(!a)throw Error('404');return JSON.parse(a.source);});
 await assert.rejects(l.load(pack));assert.equal(l.find(pack),undefined);await Promise.all([l.load(pack),l.load(pack)]);assert.equal(calls.length,2);assert.deepEqual(l.find(pack)!.readout,GAME_READOUTS.sagrada);assert.deepEqual(l.find(pack)!.photo,payload(pack).photo);
 const old=l.load(retired);await Promise.resolve();assert.equal(l.find(retired),undefined);assert.deepEqual(l.find(pack)!.readout,GAME_READOUTS.sagrada);delayed.resolve(payload(retired));await old;assert.deepEqual(l.find(retired)!.readout,oldDef);assert.notEqual(gameDataKey(pack),gameDataKey(retired));assert.equal(calls.length,3);await l.load(pack);assert.equal(calls.length,3);
 const unknown={...pack,version:'unknown-version'};await assert.rejects(l.load(unknown));assert.equal(l.find(unknown),undefined);assert.deepEqual(l.find(retired)!.readout,oldDef);
 const wrong=createGameDataLoader(async()=>payload(pack));await assert.rejects(wrong.load(retired),/판본/);assert.equal(wrong.find(retired),undefined);
});
test('actual Vite client registry/photo/capture adapters preserve exact descriptors and strict correction/save semantics',async()=>{
 const server=await createServer({configFile:false,plugins:[selectedGameData()],server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'}),original=globalThis.fetch,calls:string[]=[];
 globalThis.fetch=(async(url:any)=>{calls.push(String(url));const asset=assets.get(String(url));return new Response(asset?.source??'',{status:asset?200:404,headers:{'Content-Type':'application/json'}});}) as typeof fetch;
 try{
  const client=await server.ssrLoadModule('/src/gameData.ts'),registry=await server.ssrLoadModule('/shared/readouts/registry.ts'),capture=await server.ssrLoadModule('/shared/photoCapture.ts'),photos=await server.ssrLoadModule('/src/photoDefinitions.ts');
  assert.equal(registry.readoutDefinition(pack),undefined);await client.loadGameData(pack);assert.deepEqual(registry.readoutDefinition(pack),readoutDefinition(pack));assert.deepEqual(photos.photoDefinitionFor(pack),payload(pack).photo);assert.deepEqual(capture.captureProfile(pack),payload(pack).capture);assert.equal(calls.length,1);
  let r=registry.emptyGameReadout(pack,'dice');assert.equal(r.values.dieValue,null);r=registry.setReadoutValue(pack,r,'dieValue',0);assert.equal(r.values.dieValue,0);r=registry.setReadoutValue(pack,r,'dieValue',2);r=registry.setReadoutValue(pack,r,'dieColor','yellow');const before=JSON.stringify(r),saved=JSON.parse(before);assert.deepEqual(registry.validateGameReadout(saved,pack,'dice','photo'),saved);assert.equal(JSON.stringify(r),before);assert.throws(()=>registry.validateGameReadout({...saved,schema:'future'},pack,'dice','photo'));
  await client.loadGameData(retired);assert.deepEqual(registry.readoutDefinition(retired),oldDef);assert.equal(calls.length,2);const old=registry.emptyGameReadout(retired,oldDef.components[0].id);assert.deepEqual(registry.validateGameReadout(JSON.parse(JSON.stringify(old)),retired,oldDef.components[0].id,'photo'),old);assert.deepEqual(registry.readoutDefinition(pack),GAME_READOUTS.sagrada);
  const generic=await server.ssrLoadModule('/shared/genericRecord.ts');const piece={id:'saved-piece',componentId:'dice',variant:null,quantity:0,label:'saved',anchor:'',evidenceId:'photo',region:null,readout:saved},record={version:'game-component-record-v1',pieces:[piece]},encoded=JSON.stringify(record);assert.deepEqual(generic.validateGenericRecord(JSON.parse(encoded),pack,'draft.scene',['photo']),record);assert.equal(JSON.stringify(record),encoded);
  const carc=catalogPacks.find(p=>p.id==='carcassonne')!;await client.loadGameData(carc);let boolean=registry.emptyGameReadout(carc,'tiles');boolean=registry.setReadoutValue(carc,boolean,'face','front');boolean=registry.setReadoutValue(carc,boolean,'road',false);assert.equal(registry.validateGameReadout(JSON.parse(JSON.stringify(boolean)),carc,'tiles','photo').values.road,false);
  await assert.rejects(client.loadGameData({...retired,version:'not-known'}));assert.equal(registry.readoutDefinition({...retired,version:'not-known'}),undefined);assert.equal(JSON.stringify(r),before);
 }finally{globalThis.fetch=original;await server.close();}
});
test('all emitted readout descriptors are JSON-identical to authoritative current/retired definitions; sources remain untouched',()=>{
 for(const a of assets.values()){const d=JSON.parse(a.source);assert(!Array.isArray(d));assert(!('games'in d));if(d.readout){const expected=[GAME_READOUTS[d.readout.gameId],oldRows[d.readout.gameId]].find(r=>r?.sourceSHA===d.readout.sourceSHA&&r.packVersion===d.readout.packVersion);assert.deepEqual(d.readout,expected);}}
});
test('prepare happens before replacing the current view: failed or out-of-order games do not overwrite a draft',async()=>{
 const original={pack,record:{number:0,known:false,unknown:null,notes:'editing'}},before=JSON.stringify(original);let current=original,token=0;const a=defer(),b=defer();
 const switchTo=async(next:typeof original,p:Promise<unknown>)=>{const generation=++token;await prepareWorkspace(next,async()=>{await p;});if(generation===token)current=next;};
 const first=switchTo({...original,pack:retired},a.promise),second=switchTo({...original,record:{...original.record,notes:'current'}},b.promise);b.resolve(null);await second;a.resolve(null);await first;assert.equal(current.record.notes,'current');
 await assert.rejects(prepareWorkspace({...original,pack:{...pack,version:'missing'}},async()=>{throw Error('404');}));assert.equal(current.record.notes,'current');assert.equal(JSON.stringify(original),before);
});
test('independently loaded read-only Rummikub board requests its own styles without loading its editing workspace',async()=>{
 const server=await createServer({configFile:false,plugins:[selectedGameData()],server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
 try{const transformed=await server.transformRequest('/src/RummikubBoard.tsx');assert(transformed);assert.match(transformed.code,/import\s*["'][^"']*rummikub-workspace\.css/);assert.doesNotMatch(transformed.code,/from\s*["'][^"']*RummikubWorkspace/);}finally{await server.close();}
});
