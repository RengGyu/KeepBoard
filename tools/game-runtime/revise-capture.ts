import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {GamePack} from '../../shared/types.ts';
import type {CaptureProfile} from '../../shared/photoCapture.ts';

type Row=Record<string,any>;

/** Canonical visibility and runtime bindings authorize capture; prose in a vision profile cannot widen it. */
/** A field the prior approved profile already let this same area photograph stays allowed while its binding keeps the same scope and visibility; nothing new is widened. */
export function buildCaptureProfile(spec:Row,pack:GamePack,vision:Row,visible:Record<string,string[]>,prior?:CaptureProfile):CaptureProfile {
 const runtime=pack.runtime,source=runtime?.source;
 if(!runtime||!source||source.gameId!==spec.game_id||source.editionId!==spec.edition.id)throw Error(`Capture source/edition mismatch: ${spec.game_id}`);
 const allowed=new Set<string>(spec.recognition_correction.photographable_field_ids);
 const areas:CaptureProfile['areas']=[];
 for(const area of spec.layout.areas){
  const partition=area.visibility==='public'&&area.scope==='public'?'common_public'
   :area.visibility==='public'&&area.scope==='player'?'player_public'
   :area.visibility==='owner'&&area.scope==='player'?'owner_private':null;
  if(!partition)continue;
  const before=prior?.areas.find(entry=>entry.id===area.id&&entry.partition===partition),approved=new Set(before?.fields??[]);
  const fields=runtime.fieldBindings.filter(binding=>{
   const original=spec.state_fields.find((field:Row)=>field.id===binding.sourceId);
   return binding.areaIds.includes(area.id)&&(allowed.has(binding.sourceId)||approved.has(binding.key))&&original?.acquisition.includes('photo')
    &&binding.scope===area.scope&&binding.visibility===area.visibility
    &&!['physical-only','opaque-preserve'].includes(binding.editor)&&pack.fields.some(field=>field.key===binding.key);
  }).flatMap(binding=>partition==='player_public'
   ?runtime.support.recording==='generic'&&binding.editor==='component-catalog'?['__photo.public']:[]
   :[binding.key]);
  const previous=vision.areas?.find((entry:Row)=>entry.id===area.id);
  areas.push({id:area.id,name:area.name,partition,fields:[...new Set(fields)],components:[...area.component_ids],
   instruction:previous?.capture_instruction??`${area.name}: ${area.anchor_contract??''} 읽을 수 없는 값은 미상으로 남기세요.`});
 }
 return {version:1,gameId:spec.game_id,packId:pack.id,editionId:source.editionId,sourceSHA:source.sha256,
  focus:vision.capture_focus??spec.name_ko,areas,visible:structuredClone(visible)};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const read=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
 const packs:GamePack[]=read('gamepacks/generated/game-essentials.json');
 const previous:Record<string,CaptureProfile>=read('shared/capture-profiles.json');
 // Only a revised source gets a rebuilt profile. An unchanged source keeps its exact profile bytes, so its photo definition and saved receipts stay pinned.
 const rebuilt:string[]=[];
 const profiles=Object.fromEntries(packs.map(pack=>{
  const id=pack.runtime!.source.gameId;
  if(previous[id]&&previous[id].sourceSHA===pack.runtime!.source.sha256&&!process.argv.includes('--all'))return [id,previous[id]];
  const spec=read(`docs/research/game-specs-120/games/${id}.json`),vision=read(`docs/vision-research-astra/games/${id}.json`);rebuilt.push(id);
  return [id,buildCaptureProfile(spec,pack,vision,previous[id]?.visible??{},previous[id])];
 }));
 if(packs.length!==120||Object.keys(profiles).length!==120)throw Error('Expected exact 120 capture profiles.');
 if(process.argv.includes('--write'))writeFileSync('shared/capture-profiles.json',JSON.stringify(profiles)+'\n');
 console.log(JSON.stringify({games:packs.length,areas:Object.values(profiles).reduce((n,p)=>n+p.areas.length,0),written:process.argv.includes('--write'),rebuilt}));
}
