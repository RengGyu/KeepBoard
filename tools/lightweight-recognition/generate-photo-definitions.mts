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
/** The historical contract (frozen before the runtime revision) and the one reviewed revision derived from it by tools/game-runtime/revise-inputs.ts contract. Only the reviewed revision is accepted. */
export const HISTORICAL_CONTRACT_SHA256='2423a7b0601bddb9c3759b0e9c60b5602cc6045a86437975e101984320d4464b';
export const APPROVED_CONTRACT={revision:'gamepack-revision-20261026',sha256:'00be673c319254b83941f88f09a8e33d4d1f29c0d8b5970d4080f72eb2c0c799'};
export function generateDefinitions(root:string){
 const contractFile='game-photo-definitions/contract.json',contractBytes=readFileSync(resolve(root,contractFile));
 if(sha(contractBytes)!==APPROVED_CONTRACT.sha256)throw Error('Approved contract hash changed; do not silently rebind saved games.');
 const contract=JSON.parse(contractBytes.toString());
 if(contract.source_revision?.previousContractSHA256!==HISTORICAL_CONTRACT_SHA256||contract.source_revision?.id!==APPROVED_CONTRACT.revision)throw Error('Contract revision does not chain from the historical contract.');
 const inputs=contract.inputs.filter((i:any)=>i.file.startsWith('shared/')||i.file==='gamepacks/generated/game-essentials.json').filter((i:any)=>!i.file.startsWith('server/'));
 // R3 changed only Splendor validation; its generated gem domain is unchanged. Keep both exact approved revisions.
 const approvedSplendorR3={contractSHA:'d12575cb8b481309455bc6c3ee13192bbc8155f1c9c9db371c7ae71977aad0e8',sha256:'13e0602322e51b0eee1bd032bb8eb5145c1ef4d6d3c96d76ecc02cf0f820d5c1'};
 // The null-quantity runtime fix does not change CATAN_NUMBERS or SCENE_VARIANTS.
 const approvedSceneNullQuantity={contractSHA:'d89b4925fa2c05c42043905983c957ad7e9585bdc80712718818cacf9c3b063a',sha256:'9bd7f06c90c5241b0324e6735b3c8c496941982ba39ef095acfcf42d3be91b42'};
 // Exact reviewed 2026-11-02 condition/inventory delta; all other revisions still reject.
 const approvedConditions:Record<string,{contractSHA:string;sha256:string}>={
  "gamepacks/generated/game-essentials.json": {
    "contractSHA": "9b9cc83f4281803b3a8b7b7cc1472e78791a10ca1f5cb5cf89012cc080753978",
    "sha256": "9ea8249443b9129c151de89a4ac67613716db1169b3cde16c795566a8702ffd0"
  },
  "shared/readouts/catalogs/05-campaign-combat.json": {
    "contractSHA": "13f18bfaa1100b37995cb5722ca134cb00ec7fc70a40a4c852bf36ff58b44a28",
    "sha256": "ba8705a587c5f662dc79ddc9e74a4f2fda03b5c84d1d9a07b304291f294e22a7"
  },
  "shared/readouts/catalogs/06-maps-tracks.json": {
    "contractSHA": "d32ed905f2e36132376ccb6e164127936d57ad56b6e287b50278a153e05ac921",
    "sha256": "3d4acd6e506e5edb859c368154dfa85cf56b5f909c88c7679b95bbe4308c05a4"
  },
  "shared/readouts/catalogs/03-workers-economy.json": {
    "contractSHA": "f9143917d9fa56b604c6ad436305133901c36ff3655b21630696da16092229c3",
    "sha256": "618e851122465457036cf360e6680598a30e80f1fe431cd562a551c7df6f7664"
  },
  "shared/readouts/catalogs/01-spatial-tiles.json": {
    "contractSHA": "d69a16fe3b408be5f8a961166e312c842b4212b317e1fe8a073abf77ca4d76c9",
    "sha256": "a384f0778a12f0855d4997b5586e55054f2386f102c4db53bbaed81a3300424a"
  },
  "shared/readouts/catalogs/02-cards-tableau.json": {
    "contractSHA": "645dc7ed62de8e28724f0f4b1094c69752bf53392e0ec9b36cf7fcd95bda947b",
    "sha256": "2b2f5499c517a96b94874cf22ea68415db4b35ce109ce858cb1c6f00692185ee"
  }
};
 const actualInputs=inputs.map((input:any)=>{
  const actualSHA=sha(readFileSync(resolve(root,input.file))),r3=input.file==='shared/splendor.ts'&&input.sha256===approvedSplendorR3.contractSHA&&actualSHA===approvedSplendorR3.sha256;
  const sceneNull=input.file==='shared/scene.ts'&&input.sha256===approvedSceneNullQuantity.contractSHA&&actualSHA===approvedSceneNullQuantity.sha256;
  const condition=approvedConditions[input.file],conditions=condition?.contractSHA===input.sha256&&condition.sha256===actualSHA;
  if(actualSHA!==input.sha256&&!r3&&!sceneNull&&!conditions)throw Error(`Pinned input changed: ${input.file}`);
  const reason=conditions?'Approved 2026-11-02: front-independent physical outline/visible side conditions, and source-backed Catan inventory metadata; domains and source identities unchanged.':r3?'Approved R3: retain observed card level with unknown kind; SPLENDOR_GEMS and generated definitions unchanged.':sceneNull?'Approved 2026-10-29 null quantity fix: preserve explicit unknown quantity; CATAN_NUMBERS, SCENE_VARIANTS and generated definitions unchanged.':null;
  return {file:input.file,sha256:actualSHA,...(reason?{approvedContractSHA256:input.sha256,revisionReason:reason}:{})};
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
     if(native==='catan'&&(['number','ratio'].includes(key)||key==='variant'&&id!=='container')||native==='rummikub'&&['number','color'].includes(key)||native==='splendor'&&['points','bonus','cost','requirements'].includes(key))property.faceOnly=true;
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
