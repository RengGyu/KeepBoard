import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveArt,type ArtMapping} from '../src/artResolver.ts';
import {validateGenericRecord} from '../shared/genericRecord.ts';
import type {GamePack,Value} from '../shared/types.ts';
import {expectedEssentialsComponents} from '../tools/game-specs/essentials-check.ts';

test('variant color policy separates fixed type, owner and unresolved legacy without editing stored inputs',()=>{
 const mapping={game_id:'sample',components:[{component_id:'mixed',status:'mixed',owner_color_supported:true,color_role:'variant',variants:[
  {name:'red resource',layers:[{asset_id:'common.cube'}],color:'#b85040',color_role:'fixed-semantic',owner_color_supported:false},
  {name:'player cube',layers:[{asset_id:'common.cube'}],color_role:'owner',owner_color_supported:true},
  {name:'old cube',layers:[{asset_id:'common.unknown'}],unresolved:true},
 ]}]} as unknown as ArtMapping;
 const before=JSON.stringify(mapping);const input={componentId:'mixed',variant:'old cube',color:'#123456'};const old=structuredClone(input);
 for(const color of ['#112233','#bbccdd'])assert.equal(resolveArt(mapping,{componentId:'mixed',variant:'red resource',color}).color,'#b85040');
 assert.equal(resolveArt(mapping,{componentId:'mixed',variant:'player cube',color:'#112233'}).color,'#112233');
 assert.equal(resolveArt(mapping,input).unknown,true);assert.equal(resolveArt(mapping,{componentId:'mixed'}).unknown,true);
 assert.deepEqual(input,old);assert.equal(JSON.stringify(mapping),before);
});

test('an explicit reversible token face keeps the opposite identity; legacy/unknown never choose it',()=>{
 const mapping={game_id:'sample',components:[{component_id:'trade',status:'mixed',owner_color_supported:false,color_role:'fixed-semantic',variants:[
  {name:'good',layers:[{asset_id:'good'}],back_variant:'commodity'},
  {name:'commodity',layers:[{asset_id:'commodity'}],back_variant:'good'},
  {name:'legacy',layers:[{asset_id:'common.unknown'}],unresolved:true},
 ]}]} as unknown as ArtMapping;
 assert.deepEqual(resolveArt(mapping,{componentId:'trade',variant:'good',face:'back'}).layers,[{asset_id:'commodity'}]);
 assert.equal(resolveArt(mapping,{componentId:'trade',variant:'legacy',face:'back'}).unknown,true);
 assert.equal(resolveArt(mapping,{componentId:'trade',face:'back'}).unknown,true);
});

test('all 20 corrections retain quantities, IDs and legacy names while explicit dice cover actual type×face combinations',async()=>{
 const corrections=JSON.parse(await readFile('docs/game-art/fidelity-corrections.json','utf8'));
 assert.equal(Object.keys(corrections).length,20);
 for(const [key,plan] of Object.entries(corrections) as [string,any][]){
  const [game,componentId]=key.split(':');const m=JSON.parse(await readFile(`public/game-art/games/${game}/mapping.json`,'utf8'));
  const c=m.components.find((x:any)=>x.component_id===componentId);assert(c);assert.equal(c.fidelity_correction.finding_id,plan.finding_id);
  const registry=JSON.parse(await readFile('public/game-art/assets.json','utf8')).assets;
  const before=JSON.stringify(c);
  for(const v of c.variants){const a=resolveArt(m,{componentId,variant:v.name,color:'#cc2244'}),b=resolveArt(m,{componentId,variant:v.name,color:'#2255cc'});
   if(v.unresolved){assert(a.unknown);assert(b.unknown);continue;}
   assert(!a.unknown,`${key}/${v.name}`);if(v.color_role==='fixed-semantic')assert.equal(a.color,b.color,`${key}/${v.name} fixed color`);
   if(v.color_role==='owner'){assert.equal(a.color,'#cc2244');assert.equal(b.color,'#2255cc');
    assert(v.layers.some((l:any)=>registry.find((r:any)=>r.asset_id===l.asset_id)?.owner_color_supported),`${key}/${v.name} SVG supports owner color`);
   }
  }
  assert.equal(JSON.stringify(c),before);
 }
 const sagrada=JSON.parse(await readFile('public/game-art/games/sagrada/mapping.json','utf8')).components.find((x:any)=>x.component_id==='dice');
 const dice=sagrada.variants.filter((v:any)=>!v.unresolved);assert.equal(dice.length,30);assert.equal(new Set(dice.map((v:any)=>v.color)).size,5);
 for(const color of new Set(dice.map((v:any)=>v.color)))assert.deepEqual(dice.filter((v:any)=>v.color===color).map((v:any)=>v.face_value),[1,2,3,4,5,6]);
 const tokyo=JSON.parse(await readFile('public/game-art/games/king-of-tokyo/mapping.json','utf8')).components.find((x:any)=>x.component_id==='dice').variants.filter((v:any)=>!v.unresolved);
 assert.equal(tokyo.length,12);for(const type of ['base','extra'])assert.deepEqual(tokyo.filter((v:any)=>v.die_type===type).map((v:any)=>v.face_value),[1,2,3,'energy','claw','heart']);
});

test('F001 baseline exception accepts only its exact description and rejects all neighboring component changes',async()=>{
 const baseline=JSON.parse(await readFile('docs/game-essentials/baseline.json','utf8'));
 const old=baseline.find((x:any)=>x.game_id==='agricola').spec.components;const before=JSON.stringify(old);
 const current=JSON.parse(await readFile('docs/research/game-specs-120/games/agricola.json','utf8')).components;
 assert.deepEqual(current,expectedEssentialsComponents('agricola',old));assert.equal(JSON.stringify(old),before);
 for(const mutate of [(c:any[])=>c[0].description+='x',(c:any[])=>c[1].description+='x',(c:any[])=>c[1].quantity=0,(c:any[])=>c[1].id='other',(c:any[])=>c.reverse()]){
  const wrong=structuredClone(current);mutate(wrong);assert.notDeepEqual(wrong,expectedEssentialsComponents('agricola',old));
 }
 assert.deepEqual(expectedEssentialsComponents('other',old),old);
 const changedBaseline=structuredClone(old);changedBaseline[1].description+='x';assert.deepEqual(expectedEssentialsComponents('agricola',changedBaseline),changedBaseline);
});

 test('the previous pinned pack and legacy record keep identity, order, zero, null and placement',async()=>{
 const pack=JSON.parse(await readFile('docs/game-fidelity-audit/corrections/agricola-pack-before.json','utf8')) as GamePack;
 const binding=pack.runtime!.fieldBindings.find((b:any)=>b.componentIds?.includes('people'));assert(binding);
 const record={version:'game-component-record-v1',pieces:[
  {id:'old-2',componentId:'people',variant:'가족 원반',quantity:0,label:'old',anchor:'bag',evidenceId:null,region:null},
  {id:'old-1',componentId:'people',variant:null,quantity:null,label:'unknown',anchor:'',evidenceId:null,region:null},
 ]};
 if(binding.areaIds.length)Object.assign(record.pieces[0],{placement:{areaId:binding.areaIds[0],x:.2,y:.7,rotation:90}});
 const original=JSON.stringify(pack);assert.deepEqual(validateGenericRecord(record as unknown as Value,pack,binding.key,[]),record);assert.equal(JSON.stringify(pack),original);
 const claims=JSON.parse(await readFile('docs/game-fidelity-audit/review/claims.json','utf8'));
 const plans=JSON.parse(await readFile('docs/game-art/fidelity-corrections.json','utf8'));
 for(const [key,plan] of Object.entries(plans) as [string,any][]){
  const [game,id]=key.split(':');const old=claims.find((g:any)=>g.gameId===game).mappedComponents.find((c:any)=>c.component_id===id);
  const current=JSON.parse(await readFile(`public/game-art/games/${game}/mapping.json`,'utf8')).components.find((c:any)=>c.component_id===id);
  for(const v of old.variants){const retained=current.variants.find((x:any)=>x.name===v.name);assert(retained,`${key}/${v.name}`);
   if(!plan.keep_legacy_names?.includes(v.name)){assert.equal(retained.unresolved,true);assert.equal(resolveArt({game_id:game,components:[current]} as ArtMapping,{componentId:id,variant:v.name}).unknown,true);}
  }
 }
});
