import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {PhotoDefinition} from '../../shared/lightweightRecognition.ts';
import type {PropertySpec,GameReadoutDefinition} from '../../shared/readouts/types.ts';
import {CATAN_NUMBERS,SCENE_VARIANTS,type SceneKind} from '../../shared/scene.ts';
import {RUMMIKUB_COLORS} from '../../shared/rummikub.ts';
import {SPLENDOR_GEMS} from '../../shared/splendor.ts';
export function canonicalJSON(value:unknown):string {if(Array.isArray(value))return '['+value.map(canonicalJSON).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalJSON((value as any)[k])).join(',')+'}';return JSON.stringify(value);}
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const read=(root:string,file:string)=>JSON.parse(readFileSync(resolve(root,file),'utf8'));
function nativeProperty(game:string,component:string,id:string):PropertySpec {
 const labels:Record<string,string>={face:'보이는 면',number:'인쇄 숫자',level:'카드 단계',kind:'구성물 종류',bonus:'보너스 보석',color:'관측 색',observedColor:'관측 색',variant:'인쇄 종류',cost:'필요 보석',requirements:'귀족 조건',quantity:'실물 수량',points:'점수',ratio:'교환 비율'};
 const base={id,label:labels[id]??id,acquisition:'visible' as const,sourceText:`Approved lightweight-recognition contract v1 native ${game}/${component}/${id}`};
 const enumeration=(values:readonly (string|number)[]):PropertySpec=>({...base,type:'enum',options:values.map(value=>({value,label:String(value)}))});
 if(id==='face')return enumeration(['front','back','unknown']);
 if(id==='number')return enumeration(game==='catan'?CATAN_NUMBERS:Array.from({length:13},(_,i)=>i+1));
 if(id==='level')return enumeration([1,2,3]);
 if(id==='kind')return enumeration(['development','deck']);
 if(id==='bonus')return enumeration(SPLENDOR_GEMS);
 if(id==='color')return enumeration(game==='rummikub'?RUMMIKUB_COLORS:[...SPLENDOR_GEMS,'gold']);
 if(id==='variant'){const options=SCENE_VARIANTS[component as SceneKind];return options?{...base,type:'enum',options}: {...base,type:'text'};}
 if(id==='cost'||id==='requirements')return {...base,type:'marks',options:SPLENDOR_GEMS.map(value=>({value,label:value})),faceOnly:true};
 if(id==='quantity'||id==='points')return {...base,type:'integer',min:0};
 if(id==='ratio')return enumeration([2,3]);
 return {...base,type:'text'};
}
export function generateDefinitions(root:string){
 const contractFile='game-photo-definitions/contract.json',contractBytes=readFileSync(resolve(root,contractFile));
 if(sha(contractBytes)!=='2423a7b0601bddb9c3759b0e9c60b5602cc6045a86437975e101984320d4464b')throw Error('Approved contract hash changed; do not silently rebind saved games.');
 const contract=JSON.parse(contractBytes.toString());
 const inputs=contract.inputs.filter((i:any)=>i.file.startsWith('shared/')||i.file==='gamepacks/generated/game-essentials.json').filter((i:any)=>!i.file.startsWith('server/'));
 // R3 changed only Splendor validation; its generated gem domain is unchanged. Keep both exact approved revisions.
 const approvedSplendorR3={contractSHA:'d12575cb8b481309455bc6c3ee13192bbc8155f1c9c9db371c7ae71977aad0e8',sha256:'13e0602322e51b0eee1bd032bb8eb5145c1ef4d6d3c96d76ecc02cf0f820d5c1'};
 const actualInputs=inputs.map((input:any)=>{
  const actualSHA=sha(readFileSync(resolve(root,input.file))),r3=input.file==='shared/splendor.ts'&&input.sha256===approvedSplendorR3.contractSHA&&actualSHA===approvedSplendorR3.sha256;
  if(actualSHA!==input.sha256&&!r3)throw Error(`Pinned input changed: ${input.file}`);
  return {file:input.file,sha256:actualSHA,...(r3?{approvedContractSHA256:input.sha256,revisionReason:'Approved R3: retain observed card level with unknown kind; SPLENDOR_GEMS and generated definitions unchanged.'}:{})};
 });
 const profiles=read(root,'shared/capture-profiles.json'),packs=read(root,'gamepacks/generated/game-essentials.json');
 const definitions:PhotoDefinition[]=contract.games.map((g:any)=>{
  const profile=profiles[g.game_id],pack=packs.find((p:any)=>p.id===g.pack_id);
  if(!profile||!pack||profile.sourceSHA!==g.source_sha256||profile.editionId!==g.edition_id||pack.version!==g.pack_version)throw Error(`Pinned source/edition/pack mismatch: ${g.game_id}`);
  const native=g.readout_definition.bridge??null;
  const typed:GameReadoutDefinition|undefined=native?undefined:read(root,g.readout_definition.file)[g.game_id];
  if(typed&&(typed.sourceSHA!==g.source_sha256||typed.editionId!==g.edition_id||typed.packVersion!==g.pack_version))throw Error(`Readout mismatch: ${g.game_id}`);
  const components=Object.entries(g.component_field_policy).map(([id,policy]:[string,any])=>{
   const typedComponent=typed?.components.find(c=>c.id===id);
   const properties:PropertySpec[]=policy.visible.map((key:string)=>{
    if(native){const property=nativeProperty(native,id,key);
     if(native==='catan'&&['variant','number','ratio'].includes(key)||native==='rummikub'&&['number','color'].includes(key)||native==='splendor'&&['points','bonus','cost','requirements'].includes(key))property.faceOnly=true;
     return property;} 
    const p=typedComponent?.fields.find(f=>f.id===key);if(!p||p.acquisition!=='visible')throw Error(`Missing visible property ${g.game_id}/${id}/${key}`);return structuredClone(p);
   });
   if(typedComponent&&policy.manual.some((key:string)=>!typedComponent.fields.some(f=>f.id===key&&f.acquisition==='manual')))throw Error(`Manual policy mismatch: ${g.game_id}/${id}`);
   const variants=native==='catan'?SCENE_VARIANTS[id as SceneKind]?.map(v=>v.value):undefined;
   return {id,properties,manualPropertyIds:[...policy.manual],...(variants?{variants}: {})};
  });
  const body={version:'game-photo-definition-v1' as const,gameId:g.game_id,packId:g.pack_id,packVersion:g.pack_version,editionId:g.edition_id,sourceSHA:g.source_sha256,nativeBridge:native,readoutSchema:typed?.schema??(native==='catan'?'scene-v2':native==='rummikub'?'rummikub-classic-v1':'splendor-v1'),areas:g.areas.map((a:any)=>({id:a.id,partition:a.partition,fields:[...a.allowed_fields],componentIds:[...a.components]})),components};
  return {...body,definitionSHA:sha(canonicalJSON(body))};
 });
 if(definitions.length!==120||new Set(definitions.map(d=>d.gameId)).size!==120||Object.keys(profiles).some(id=>!definitions.some(d=>d.gameId===id)))throw Error('Exact 120 capture game IDs required.');
 const index={version:'game-photo-definitions-v1',games:definitions};
 const manifest={version:'game-photo-definitions-manifest-v1',contractSHA:sha(contractBytes),inputs:actualInputs,indexSHA:sha(JSON.stringify(index,null,2)+'\n'),coverage:{games:120,nativeBridges:3,typedGames:117,inferenceAccuracy:'UNMEASURED'},games:contract.games.map((g:any)=>({gameId:g.game_id,manualStateFields:g.manual_state_fields,physicalPreserve:g.physical_preserve,preservationTemplateIds:g.preservation_template_ids,referenceSets:[],areas:g.areas.map((a:any)=>({areaId:a.id,support:a.allowed_fields.length&&a.components.some((id:string)=>g.component_field_policy[id]?.visible.length)?'literal-observation-candidate':'manual-or-preserve',accuracy:'UNMEASURED'}))}))};
 return {definitions,index,manifest};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){const root=process.cwd(),generated=generateDefinitions(root);mkdirSync(resolve(root,'game-photo-definitions'),{recursive:true});for(const [name,value]of [['index',generated.index],['manifest',generated.manifest]] as const)writeFileSync(resolve(root,`game-photo-definitions/${name}.json`),JSON.stringify(value,null,2)+'\n');console.log(JSON.stringify({games:generated.definitions.length,indexSHA:generated.manifest.indexSHA}));}
