import test from 'node:test';import assert from 'node:assert/strict';import {register} from 'node:module';import packs from '../gamepacks/generated/game-essentials.json';import {readFile} from 'node:fs/promises';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {GenericPieceArt}=await import('../src/GenericPieceArt');
const ledger=JSON.parse(await readFile('docs/gamepack-revision-20261026/revision.json','utf8'));const {resolveArt}=await import('../src/artResolver');
test('eight die categories use the existing cube; all other categories (the frozen 437 plus ledger additions) retain their earlier kind routing',()=>{
 let dice=0,total=0;
 for(const pack of packs as any[])for(const c of pack.runtime.components){
  const el=GenericPieceArt({pack,piece:{id:'synthetic',componentId:c.id,variant:null,quantity:null} as any}) as any;
  const old=c.kind==='card'?'common.card-shell':['tile','board'].includes(c.kind)?'common.area-zone':['dice','cube'].includes(c.kind)?'common.cube':'common.token-shell';
  assert.equal(el.props.mapping.components[0].variants[0].layers[0].asset_id,c.kind==='die'?'common.cube':old);if(c.kind==='die')dice++;total++;
 }assert.equal(dice,8);assert.equal(ledger.base.totals.artComponents,437);assert.equal(total,ledger.totals.artComponents);
});
test('Wingspan exact food die is fixed; action cube remains owner-colored; raw mapping unchanged',async()=>{
 const m=JSON.parse(await readFile('public/game-art/games/wingspan/mapping.json','utf8')),before=structuredClone(m);
 for(const color of ['#bc6048','#3978bd'])assert.equal(resolveArt(m,{componentId:'food',variant:'먹이 기호 주사위 예시',color}).color,'#eee1c5');
 for(const v of m.components.find((c:any)=>c.component_id==='actions').variants){assert.equal(resolveArt(m,{componentId:'actions',variant:v.name,color:'#bc6048'}).color,'#bc6048');assert.equal(resolveArt(m,{componentId:'actions',variant:v.name,color:'#3978bd'}).color,'#3978bd');}
 assert.deepEqual(m,before);
});
