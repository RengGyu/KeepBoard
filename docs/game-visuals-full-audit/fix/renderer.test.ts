import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {register} from 'node:module';
import React from 'react';

register('../../board-story/feedback/skip-css.mjs',import.meta.url);
// The isolated snapshot has no project tsconfig; tsx uses classic JSX there.
Object.assign(globalThis,{React});

const audit=path.resolve('docs/game-visuals-full-audit');
const snapshot=JSON.parse(fs.readFileSync(path.join(audit,'work-paths.json'),'utf8')).snapshot;
const data=JSON.parse(fs.readFileSync(path.join(snapshot,'audit/data.json'),'utf8'));
const {GenericPieceArt}=await import(pathToFileURL(path.join(snapshot,'src/GenericPieceArt.tsx')).href);
const {resolveArt}=await import(pathToFileURL(path.join(snapshot,'src/artResolver.ts')).href);
const {resolveArt:beforeResolve}=await import(pathToFileURL(path.join(audit,'fix/before/src/artResolver.ts')).href);
const packFor=(game:string)=>data.packs.find((p:any)=>p.runtime.source.gameId===game);
const mapFor=(game:string)=>data.games.find((g:any)=>g.game_id===game);
const category=(pack:any,id:string)=>GenericPieceArt({pack,piece:{id:'synthetic',componentId:id,variant:null,quantity:null},size:52});

test('all eight current kind=die categories use existing cube; non-die category choices stay unchanged',()=>{
 const dice=[];
 for(const pack of data.packs)for(const c of pack.runtime.components){
  const el=category(pack,c.id);
  const asset=el.props.mapping.components[0].variants[0].layers[0].asset_id;
  const old=c.kind==='card'?'common.card-shell':c.kind==='tile'||c.kind==='board'?'common.area-zone':c.kind==='dice'||c.kind==='cube'?'common.cube':'common.token-shell';
  assert.equal(asset,c.kind==='die'?'common.cube':old,`${pack.id}/${c.id}`);
  if(c.kind==='die')dice.push(pack.runtime.source.gameId);
 }
 assert.deepEqual(dice.sort(),['castles-burgundy','grand-austria-hotel','king-of-tokyo','machi-koro','sagrada','space-base','stone-age','war-of-the-ring-2'].sort());
});

test('dice alias, token choice, quantity null/zero, and explicit typed variant path are preserved',()=>{
 const pack=structuredClone(packFor('sagrada'));
 for(const kind of ['dice','token']){
  pack.runtime.components[0].kind=kind;
  assert.equal(category(pack,'dice').props.mapping.components[0].variants[0].layers[0].asset_id,kind==='dice'?'common.cube':'common.token-shell');
 }
 const piece={id:'synthetic',componentId:'dice',quantity:0,variant:'빨강 · 3',readout:{synthetic:true},region:{x:.1,y:.2,width:.3,height:.4}};
 const before=structuredClone(piece);
 const el=GenericPieceArt({pack:packFor('sagrada'),piece,mapping:mapFor('sagrada')});
 assert.equal(el.props.variant,piece.variant);
 assert.equal(el.props.mapping,mapFor('sagrada'));
 assert.deepEqual(piece,before);
});

test('only verified Wingspan food die resolves fixed material color; raw mapping is not rewritten',()=>{
 const mapping=mapFor('wingspan'),before=structuredClone(mapping);
 const name='먹이 기호 주사위 예시';
 for(const color of ['#bc6048','#3978bd']){
  const result=resolveArt(mapping,{componentId:'food',variant:name,color});
  assert.equal(result.unknown,false);
  assert.equal(result.color,'#eee1c5');
  assert.equal(result.variant.color_role,'fixed-semantic');
  assert.equal(result.variant.owner_color_supported,false);
 }
 for(const g of data.games)for(const c of g.components)for(const v of c.variants){
  if(g.game_id==='wingspan'&&c.component_id==='food'&&v.name===name)continue;
  for(const color of ['#bc6048','#3978bd'])assert.deepEqual(resolveArt(g,{componentId:c.component_id,variant:v.name,color}),beforeResolve(g,{componentId:c.component_id,variant:v.name,color}),`${g.game_id}/${c.component_id}/${v.name}`);
 }
 assert.deepEqual(mapping,before);
});

test('Wingspan action cube owner colors remain variable; food tokens remain fixed in actual resolver',()=>{
 const mapping=mapFor('wingspan');
 const actions=mapping.components.find((c:any)=>c.component_id==='actions');
 assert.ok(actions);
 for(const v of actions.variants){
  const red=resolveArt(mapping,{componentId:'actions',variant:v.name,color:'#bc6048'}),blue=resolveArt(mapping,{componentId:'actions',variant:v.name,color:'#3978bd'});
  assert.equal(red.color,'#bc6048');assert.equal(blue.color,'#3978bd');
 }
 for(const v of mapping.components.find((c:any)=>c.component_id==='food').variants.filter((v:any)=>v.name!=='먹이 기호 주사위 예시')){
  const red=resolveArt(mapping,{componentId:'food',variant:v.name,color:'#bc6048'}),blue=resolveArt(mapping,{componentId:'food',variant:v.name,color:'#3978bd'});
  assert.deepEqual(red,beforeResolve(mapping,{componentId:'food',variant:v.name,color:'#bc6048'}));
  assert.deepEqual(blue,beforeResolve(mapping,{componentId:'food',variant:v.name,color:'#3978bd'}));
 }
});

test('corrected audit-only Catan fixture uses the existing legacy scene bridge before SceneEditor',async()=>{
 const {createExampleAssertions}=await import(pathToFileURL(path.join(snapshot,'gamepacks/catan.ts')).href);
 const {toComponentScene}=await import(pathToFileURL(path.join(snapshot,'shared/sceneBridge.ts')).href);
 const players=[{id:'red',name:'합성 빨강',color:'#bc6048'},{id:'blue',name:'합성 파랑',color:'#3978bd'},{id:'white',name:'합성 흰색',color:'#fff9e9'}];
 const raw=createExampleAssertions(players,'synthetic-turn','synthetic-photo').find((a:any)=>a.field==='board.layout').value;
 const scene=toComponentScene(raw,'synthetic-photo');
 assert.equal(scene.components.filter((c:any)=>c.kind==='terrain').length,19);
 assert.ok(scene.components.some((c:any)=>c.kind==='road'&&c.location.type==='edge'));
 assert.ok(scene.components.some((c:any)=>c.kind==='settlement'&&c.location.type==='vertex'));
});
