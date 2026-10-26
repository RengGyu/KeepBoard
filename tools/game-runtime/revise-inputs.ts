import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {GamePack} from '../../shared/types.ts';

type Row=Record<string,any>;
const sha=(bytes:string|Buffer)=>createHash('sha256').update(bytes).digest('hex');
const read=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
const write=(file:string,value:unknown)=>writeFileSync(file,JSON.stringify(value,null,2)+'\n');

/** Art is illustrative: keep old variants for old snapshots, never invent a newly separated printed identity. */
export function reconcileArtMapping(prior:Row,spec:Row,digest:string):Row {
 const mapping=structuredClone(prior),current=new Set(spec.components.map((c:Row)=>c.id));
 mapping.components=spec.components.map((component:Row)=>{
  const old=prior.components.find((entry:Row)=>entry.component_id===component.id);
  // A newly separated component gets only the shared 'unknown' placeholder, marked unresolved: no printed face is drawn without evidence.
  const entry:Row=old?structuredClone(old):{component_id:component.id,status:component.confidence==='unclear'?'unclear':'common-reuse',variants:[{name:'전용 그림 없음 · 실물 기준',layers:[{asset_id:'common.unknown'}],unresolved:true}],variant_count_is_quantity:false,
   quantity_display:{source:'runtime observed quantity only',null:'?',zero:'0',art_stack_layers:'material depth only'},rotation:{center:[60,60],allowed:'runtime direction; reflects only when scene/spec permits'},
   color_role:'unknown',owner_color_supported:false,gap:'새로 분리한 구성물의 전용 그림은 미확인입니다. 실물과 원본을 기준으로 기록하세요.'};
  delete entry.legacy;
  Object.assign(entry,{name:component.name,kind:component.kind,source_confidence:component.confidence,source_description:component.description,source_quantity:component.quantity});
  if(old&&old.kind!==component.kind)entry.status='unclear';
  return entry;
 });
 for(const old of prior.components.filter((entry:Row)=>!current.has(entry.component_id)))mapping.components.push({...structuredClone(old),legacy:true});
 mapping.source_sha256=digest;mapping.edition=structuredClone(spec.edition);
 mapping.areas=spec.layout.areas.map((area:Row)=>({...structuredClone(area),art_reference:prior.areas?.find((a:Row)=>a.id===area.id)?.art_reference??{asset_id:`common.area-${area.topology}`,use:'schematic zone only; not a printed game board',canonical_layout:false}}));
 return mapping;
}

/** A field keeps a photo permission the prior approved source granted it while its scope and visibility are unchanged; hidden, own-hidden and role-limited fields never get one. */
export function recognitionSource(spec:Row,digest:string,prior?:Row):Row {
 const approved=(field:Row)=>!!prior?.fields?.some((f:Row)=>f.id===field.id&&f.photo===true&&f.scope===field.scope&&f.visibility===field.visibility);
 return {sha256:[digest],editionId:spec.edition.id,fields:spec.state_fields.map((field:Row)=>({
  id:field.id,type:field.type,scope:field.scope,visibility:field.visibility,
  photo:field.acquisition.includes('photo')&&(spec.recognition_correction.photographable_field_ids.includes(field.id)||approved(field))
   &&(field.visibility==='public'&&['public','player'].includes(field.scope)||field.visibility==='owner'&&field.scope==='player'),
  componentIds:[...field.component_ids],areaIds:[...field.area_ids],
 }))};
}

function reviseInputs(){
 const packs:GamePack[]=read('gamepacks/generated/game-essentials.json'),previous:Row[]=read('tools/readouts/targets-117.source.json'),recognition:Row=read('shared/recognition-index.json');
 const targets:Row[]=[];
 if(packs.length!==120)throw Error('Expected exact 120 runtime packs.');
 for(const pack of packs){
  const id=pack.runtime!.source.gameId,file=`docs/research/game-specs-120/games/${id}.json`,bytes=readFileSync(file),spec=JSON.parse(bytes.toString()),digest=sha(bytes);
  if(pack.runtime!.source.sha256!==digest)throw Error(`Regenerate runtime before inputs: ${id}`);
  const artFile=`public/game-art/games/${id}/mapping.json`,mapping=reconcileArtMapping(read(artFile),spec,digest);write(artFile,mapping);
  const entry=recognition[id]??{sources:[],variants:{}};
  if(!entry.sources.some((source:Row)=>source.sha256.includes(digest)))entry.sources.push(recognitionSource(spec,digest,entry.sources.at(-1)));
  entry.variants={...entry.variants,...Object.fromEntries(mapping.components.map((c:Row)=>[c.component_id,c.variants.map((v:Row)=>v.name)]))};recognition[id]=entry;
  const old=previous.find(target=>target.gameId===id);
  if(old)targets.push({...old,title:pack.title,editionId:spec.edition.id,edition:spec.edition.name,packVersion:pack.version,sourceSHA:digest,sourceSHAActual:digest,
   bindings:pack.runtime!.fieldBindings,components:spec.components,stateFields:spec.state_fields,layout:spec.layout,preservation:pack.preservationTemplates,sourceReferences:spec.sources,
   sourceURLs:spec.sources.map((s:Row)=>s.url).filter(Boolean).join(' | '),artSourceSHA:digest});
 }
 if(targets.length!==117)throw Error('Expected exact 117 typed readout targets.');
 // The art index and its coverage summarize the per-game mappings; keep them in step (legacy components stay in a mapping for old saves but are not current categories).
 const index=read('public/game-art/games.json'),coverage=read('public/game-art/coverage.json'),mappings=index.games.map((g:Row)=>read(`public/game-art/games/${g.game_id}/mapping.json`));
 index.games=mappings;write('public/game-art/games.json',index);
 const current=mappings.flatMap((m:Row)=>m.components.filter((c:Row)=>!c.legacy));
 coverage.components=current.length;coverage.statuses=Object.fromEntries(Object.keys(coverage.statuses).concat(current.map((c:Row)=>c.status)).filter((k:string,i:number,all:string[])=>all.indexOf(k)===i).map((k:string)=>[k,current.filter((c:Row)=>c.status===k).length]));
 write('public/game-art/coverage.json',coverage);
 write('tools/readouts/targets-117.source.json',targets);writeFileSync('shared/recognition-index.json',JSON.stringify(recognition)+'\n'); // keeps the index's compact one-line form
 console.log(JSON.stringify({games:packs.length,typedTargets:targets.length,legacySourcesRetained:true}));
}

export const HISTORICAL_CONTRACT={file:'docs/gamepack-revision-20261026/history/before-runtime-revision/game-photo-definitions/contract.json',sha256:'2423a7b0601bddb9c3759b0e9c60b5602cc6045a86437975e101984320d4464b'};
const PHOTO_PUBLIC='__photo.public';
/** The contract file's own layout: indented JSON with one compact line per game row. */
export function contractText(contract:Row):string{
 const marker='"__games__"',body=JSON.stringify({...contract,games:marker},null,2);
 return body.replace(JSON.stringify(marker),'[\n'+contract.games.map((g:Row)=>'    '+JSON.stringify(g)).join(',\n')+'\n  ]')+'\n';
}

/** Fields a capture area photographs, plus the public personal catalogs that '__photo.public' routes into. */
export function photographedFields(pack:GamePack,profile:Row):Set<string>{
 const photo=new Set<string>(profile.areas.flatMap((a:Row)=>a.fields));
 for(const area of profile.areas)if(area.fields.includes(PHOTO_PUBLIC))for(const b of pack.runtime!.fieldBindings)if(b.areaIds.includes(area.id)&&b.scope==='player'&&b.visibility==='public'&&b.editor==='component-catalog')photo.add(b.key);
 return photo;
}

/** One contract row from the revised source. Typed games keep the contract's convention of no explicit '__photo.public' field; native bridges keep their existing area fields. */
export function revisedContractGame(old:Row,pack:GamePack,profile:Row,typed:Row|undefined):Row{
 const native=old.readout_definition.bridge;
 if(profile.sourceSHA!==pack.runtime!.source.sha256)throw Error(`Missing revised source profile: ${old.game_id}`);
 if(!native&&(!typed||typed.sourceSHA!==profile.sourceSHA))throw Error(`Regenerate typed readout: ${old.game_id}`);
 const ids=pack.runtime!.components.map(c=>c.id),ordered=[...Object.keys(old.component_field_policy).filter(id=>ids.includes(id)),...ids.filter(id=>!(id in old.component_field_policy))];
 const policy=native?Object.fromEntries(ordered.map(id=>[id,old.component_field_policy[id]??{visible:[],manual:[]}]))
  :Object.fromEntries(typed!.components.map((c:Row)=>[c.id,{visible:c.fields.filter((f:Row)=>f.acquisition==='visible').map((f:Row)=>f.id),manual:c.fields.filter((f:Row)=>f.acquisition==='manual').map((f:Row)=>f.id)}]));
 const photo=photographedFields(pack,profile);
 return {...old,pack_version:pack.version,edition_id:profile.editionId,source_sha256:profile.sourceSHA,component_field_policy:policy,
  areas:profile.areas.map((a:Row,i:number)=>{const before=old.areas.find((x:Row)=>x.id===a.id&&x.partition===a.partition);
   return {id:a.id,partition:a.partition,allowed_fields:native&&before?[...before.allowed_fields]:a.fields.filter((f:string)=>native||f!==PHOTO_PUBLIC),components:a.components,definition_pointer:`/${old.game_id}/areas/${i}`,inference_accuracy:'UNMEASURED'};}),
  manual_state_fields:pack.fields.filter(f=>!photo.has(f.key)).map(f=>f.key),
  physical_preserve:pack.runtime!.fieldBindings.filter(b=>['physical-only','opaque-preserve'].includes(b.editor)).map(b=>({field:b.key,editor:b.editor,scope:b.scope,visibility:b.visibility})),
  preservation_template_ids:pack.preservationTemplates.map(p=>p.id),
 };
}

/** Always revises from the preserved historical contract, so the result depends only on that file and the current sources. Unchanged sources keep their exact rows. */
function reviseContract(){
 const path='game-photo-definitions/contract.json',historyBytes=readFileSync(HISTORICAL_CONTRACT.file),previousSHA=sha(readFileSync(path));
 if(sha(historyBytes)!==HISTORICAL_CONTRACT.sha256)throw Error('Historical contract copy changed; refuse to revise from it.');
 const contract=JSON.parse(historyBytes.toString()),packs:GamePack[]=read('gamepacks/generated/game-essentials.json'),profiles=read('shared/capture-profiles.json');
 const revised:string[]=[];
 contract.games=contract.games.map((old:Row)=>{
  const pack=packs.find(p=>p.runtime!.source.gameId===old.game_id),profile=profiles[old.game_id];
  if(!pack||!profile)throw Error(`Missing pack/profile: ${old.game_id}`);
  if(pack.version===old.pack_version&&pack.runtime!.source.sha256===old.source_sha256)return old;
  revised.push(old.game_id);
  const typed=old.readout_definition.bridge?undefined:read(old.readout_definition.file)[old.game_id];
  const row=revisedContractGame(old,pack,profile,typed);
  profile.visible=Object.fromEntries(Object.entries(row.component_field_policy).map(([id,p]:[string,any])=>[id,p.visible]));
  return row;
 });
 contract.source_revision={id:'gamepack-revision-20261026',authority:'User-approved rules-first revision (Cloud handoff 2026-10-26): common, public personal, owner-private and hidden areas separated per game from its source.',previousContractSHA256:HISTORICAL_CONTRACT.sha256,previousContractFile:HISTORICAL_CONTRACT.file,revisedGameIds:revised};
 writeFileSync('shared/capture-profiles.json',JSON.stringify(profiles)+'\n');
 // Inputs follow the files they pin, except shared/splendor.ts: its historical pin stays so the generator's approved R3 provenance still applies.
 for(const input of contract.inputs)if(input.file!=='shared/splendor.ts')input.sha256=sha(readFileSync(input.file));
 writeFileSync(path,contractText(contract));
 console.log(JSON.stringify({games:contract.games.length,revised,contractSHA:sha(readFileSync(path)),previousSHA}));
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 if(process.argv[2]==='inputs')reviseInputs();
 else if(process.argv[2]==='contract')reviseContract();
 else throw Error('Run after source freeze: revise-inputs.ts inputs | contract.');
}
