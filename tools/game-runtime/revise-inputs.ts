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
  const entry:Row=old?structuredClone(old):{component_id:component.id,status:'unclear',variants:[],variant_count_is_quantity:false,color_role:'unknown',owner_color_supported:false,gap:'새로 분리한 구성물의 전용 그림은 미확인입니다. 실물과 원본을 기준으로 기록하세요.'};
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

export function recognitionSource(spec:Row,digest:string):Row {
 return {sha256:[digest],editionId:spec.edition.id,fields:spec.state_fields.map((field:Row)=>({
  id:field.id,type:field.type,scope:field.scope,visibility:field.visibility,
  photo:field.acquisition.includes('photo')&&spec.recognition_correction.photographable_field_ids.includes(field.id)
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
  if(!entry.sources.some((source:Row)=>source.sha256.includes(digest)))entry.sources.push(recognitionSource(spec,digest));
  entry.variants={...entry.variants,...Object.fromEntries(mapping.components.map((c:Row)=>[c.component_id,c.variants.map((v:Row)=>v.name)]))};recognition[id]=entry;
  const old=previous.find(target=>target.gameId===id);
  if(old)targets.push({...old,title:pack.title,editionId:spec.edition.id,edition:spec.edition.name,packVersion:pack.version,sourceSHA:digest,sourceSHAActual:digest,
   bindings:pack.runtime!.fieldBindings,components:spec.components,stateFields:spec.state_fields,layout:spec.layout,preservation:pack.preservationTemplates,sourceReferences:spec.sources,
   sourceURLs:spec.sources.map((s:Row)=>s.url).filter(Boolean).join(' | '),artSourceSHA:digest});
 }
 if(targets.length!==117)throw Error('Expected exact 117 typed readout targets.');
 write('tools/readouts/targets-117.source.json',targets);write('shared/recognition-index.json',recognition);
 console.log(JSON.stringify({games:packs.length,typedTargets:targets.length,legacySourcesRetained:true}));
}

function reviseContract(){
 const path='game-photo-definitions/contract.json',contract=read(path),previousSHA=sha(readFileSync(path));
 if(previousSHA!=='2423a7b0601bddb9c3759b0e9c60b5602cc6045a86437975e101984320d4464b')throw Error('Expected historical contract; refuse to overwrite a different revision.');
 const packs:GamePack[]=read('gamepacks/generated/game-essentials.json'),profiles=read('shared/capture-profiles.json');
 contract.source_revision={id:'gamepack-revision-20261026',authority:'User requested all gamepacks revised with rules-first common/player/private separation.',previousContractSHA256:previousSHA,previousContractFile:'docs/gamepack-revision-20261026/history/before-runtime-revision/game-photo-definitions/contract.json'};
 contract.games=contract.games.map((old:Row)=>{
  const pack=packs.find(p=>p.runtime!.source.gameId===old.game_id)!,profile=profiles[old.game_id],native=old.readout_definition.bridge;
  if(!pack||profile.sourceSHA!==pack.runtime!.source.sha256)throw Error(`Missing revised source profile: ${old.game_id}`);
  const typed=native?undefined:read(old.readout_definition.file)[old.game_id];
  if(typed&&typed.sourceSHA!==profile.sourceSHA)throw Error(`Regenerate typed readout: ${old.game_id}`);
  const policy=native?Object.fromEntries(pack.runtime!.components.map(c=>[c.id,old.component_field_policy[c.id]??{visible:[],manual:[]}]))
   :Object.fromEntries(typed.components.map((c:Row)=>[c.id,{visible:c.fields.filter((f:Row)=>f.acquisition==='visible').map((f:Row)=>f.id),manual:c.fields.filter((f:Row)=>f.acquisition==='manual').map((f:Row)=>f.id)}]));
  profile.visible=Object.fromEntries(Object.entries(policy).map(([id,p]:[string,any])=>[id,p.visible]));
  const photoFields=new Set(profile.areas.flatMap((a:Row)=>a.fields));
  return {...old,pack_version:pack.version,edition_id:profile.editionId,source_sha256:profile.sourceSHA,component_field_policy:policy,
   areas:profile.areas.map((a:Row,i:number)=>({id:a.id,partition:a.partition,allowed_fields:a.fields,components:a.components,definition_pointer:`/${old.game_id}/areas/${i}`,inference_accuracy:'UNMEASURED'})),
   manual_state_fields:pack.fields.filter(f=>!photoFields.has(f.key)).map(f=>f.key),
   physical_preserve:pack.runtime!.fieldBindings.filter(b=>['physical-only','opaque-preserve'].includes(b.editor)).map(b=>({field:b.key,editor:b.editor,scope:b.scope,visibility:b.visibility})),
   preservation_template_ids:pack.preservationTemplates.map(p=>p.id),
  };
 });
 write('shared/capture-profiles.json',profiles);
 for(const input of contract.inputs)input.sha256=sha(readFileSync(input.file));
 write(path,contract);
 console.log(JSON.stringify({games:contract.games.length,contractSHA:sha(readFileSync(path)),previousSHA}));
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 if(process.argv[2]==='inputs')reviseInputs();
 else if(process.argv[2]==='contract')reviseContract();
 else throw Error('Run after source freeze: revise-inputs.ts inputs | contract.');
}
