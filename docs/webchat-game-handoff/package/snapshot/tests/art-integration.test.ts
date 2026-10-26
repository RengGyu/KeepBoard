import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import path from 'node:path';
import {artGameId,assetURL,resolveArt,svgFragment,namespaceSVG,type ArtMapping,type ArtAsset} from '../src/artResolver.ts';
const root=path.resolve('public/game-art');
const mapping=async(id:string):Promise<ArtMapping>=>JSON.parse(await readFile(path.join(root,'games',id,'mapping.json'),'utf8'));
test('all 120 catalog entries and 437 categories resolve every declared preset to real SVG paths/adapters',async()=>{
 const catalog=JSON.parse(await readFile('src/artCatalog.json','utf8'));
 const coverage=JSON.parse(await readFile(path.join(root,'coverage.json'),'utf8'));
 const folders=await readdir(path.join(root,'games'));assert.equal(catalog.length,120);assert.deepEqual(new Set(catalog.map((c:any)=>c.id)),new Set(folders));
 const index=new Map<string,ArtAsset>(JSON.parse(await readFile(path.join(root,'assets.json'),'utf8')).assets.map((a:ArtAsset)=>[a.asset_id,a]));
 let count=0,presets=0;const statuses:Record<string,number>={},assetCounts:Record<string,number>={};const checked=new Set<string>();
 for(const asset of index.values())assetCounts[asset.classification]=(assetCounts[asset.classification]??0)+1;
 for(const row of catalog){const m=await mapping(row.id);assert.equal(m.name_ko,row.name);assert.equal(m.name_en,row.english);
  for(const c of m.components){count++;const before=JSON.stringify(c);assert.equal(new Set(c.variants.map(v=>v.name)).size,c.variants.length,`${row.id}: duplicate variant names`);
   statuses[c.status]=(statuses[c.status]??0)+1;assert(c.variants.length>0,`${row.id}/${c.component_id}: missing presets`);
   const source=c as typeof c & {source_confidence:string};
   assert.equal(c.status==='unclear',source.source_confidence==='unclear'||c.kind==='unknown',`${row.id}/${c.component_id}: preserve source uncertainty`);
   if(c.status==='unclear')assert.equal(resolveArt(m,{componentId:c.component_id,variant:c.variants[0]?.name}).unknown,true);
   for(const v of c.variants){presets++;const r=resolveArt(m,{componentId:c.component_id,variant:v.name,color:'#223344'});if(c.status!=='unclear')assert.equal(r.unknown,!!v.unresolved,`${row.id}/${c.component_id}/${v.name}`);
    for(const layer of [...v.layers,...c.hidden_layers??[]]){const asset=index.get(layer.asset_id);assert(asset,layer.asset_id);const url=assetURL(asset);if(!checked.has(url)){checked.add(url);const file=path.resolve('public','.'+url);await access(file);if(asset.classification!=='existing')svgFragment(await readFile(file,'utf8'));}}
   }assert.equal(JSON.stringify(c),before,'art resolution never edits facts, quantity or mapping');
  }
 }assert.equal(count,437);assert(presets>=count);assert.equal(coverage.planned_games,120);assert.equal(coverage.built_games,120);assert.equal(coverage.components,count);
 assert.deepEqual(statuses,coverage.statuses);assert.deepEqual(assetCounts,coverage.asset_counts);assert.deepEqual(coverage.unmade_components,[]);assert.deepEqual(coverage.unbuilt_game_ids,[]);
});
test('Catan aliases, dynamic adapters and Carcassonne retain exact named variants without inventing a missing tile',async()=>{
 assert.equal(artGameId('catan-base'),'catan');assert.equal(artGameId('azul'),'azul');
 const c=await mapping('catan');const forest=resolveArt(c,{kind:'terrain',variant:'forest'});assert.equal(forest.adapter?.props.variant,'forest');assert.equal(forest.adapter?.module,'src/ComponentArt.tsx');
 assert.equal(resolveArt(c,{kind:'terrain'}).unknown,true);assert.equal(resolveArt(c,{kind:'terrain',variant:'not-observed'}).unknown,true);
 const carc=await mapping('carcassonne');assert.equal(resolveArt(carc,{componentId:'tiles',variant:'road-bend'}).adapter?.module,'src/CarcassonneArt.tsx');assert.equal(resolveArt(carc,{componentId:'tiles'}).unknown,true);
});
test('owner colors, physical type colors, composed transforms, hidden fronts and unknown identities stay separate',async()=>{
 const tribes=await mapping('five-tribes');const c=tribes.components.find(c=>c.component_id==='tribes')!;
 const type=resolveArt(tribes,{componentId:c.component_id,variant:c.variants[0].name,color:'#0000ff'});assert.equal(type.color,'#c6a24f');
 const owned=await mapping('catan');const worker=owned.components.find(c=>c.owner_color_supported)!;assert(worker);assert.equal(resolveArt(owned,{componentId:worker.component_id,variant:worker.variants[0].name,color:'#0000ff'}).color,'#0000ff');
 const birds=await mapping('wingspan');const front=resolveArt(birds,{componentId:'birds'});assert.equal(front.layers.length,2);assert.equal(front.layers[1].transform,'translate(28 23) scale(.55)');
 const back=resolveArt(birds,{componentId:'birds',face:'back'});assert.deepEqual(back.layers,[{asset_id:'common.card-back'}]);assert(!back.layers.some(l=>l.asset_id==='common.symbol-bird'));
 assert.equal(resolveArt(birds,{componentId:'birds',face:'unknown'}).unknown,true);assert.equal(resolveArt(birds,{componentId:'missing'}).unknown,true);assert.equal(resolveArt(birds,{kind:'token'}).unknown,true,'ambiguous generic kinds never choose a first category');
 const azul=await mapping('azul');assert.equal(resolveArt(azul,{componentId:'tiles',variant:azul.components[0].variants[0].name,color:'#ff0000'}).color,undefined);
});
test('SVG composition scopes repeated clip/use IDs and rejects active/external content',()=>{
 const inner=svgFragment('<svg viewBox="0 0 120 120"><title>art</title><defs><clipPath id="a"><circle r="5"/></clipPath></defs><g clip-path="url(#a)"><use href="#a"/></g></svg>');
 const first=namespaceSVG(inner,'one-'),second=namespaceSVG(inner,'two-');assert(first.includes('id="one-a"'));assert(first.includes('url(#one-a)'));assert(first.includes('href="#one-a"'));assert(!second.includes('one-a'));assert(!first.includes('<title>'));
 for(const text of ['<svg><script/></svg>','<svg><image href="https://example.com"/></svg>','<svg onload="x()"></svg>'])assert.throws(()=>svgFragment(text));
 assert.throws(()=>assetURL({file:'../private.svg',classification:'common'} as ArtAsset));
});
