import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {expandSpatialAddresses,type SpatialArea,type SpatialDefinition} from '../../shared/spatialDefinition.ts';
const canonical=(v:any):string=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
/** Build-time only: frozen research is verified, never imported by the production server. */
export function generateSpatialDefinitions(root:string){
 const read=(p:string)=>JSON.parse(readFileSync(resolve(root,p),'utf8')),bytes=(p:string)=>readFileSync(resolve(root,p));
 const dir='docs/slot-reading-data-20261109',index=read(dir+'/index.json'),schema=read(dir+'/schema.json'),photos=read('game-photo-definitions/index.json').games,packs=read('gamepacks/generated/game-essentials.json');
 const responseSchema={version:'spatial-observation-v1',...Object.fromEntries(['boardInstance','placement','relation','cellState','box'].map(k=>[k,schema.$defs[k]]))};
 const definitions:SpatialDefinition[]=index.games.map((row:any)=>{
  const file=dir+'/'+row.file,raw=read(file),{spatialDefinitionSHA,...body}=raw;
  if(sha(bytes(file))!==row.sha256||sha(canonical(body))!==spatialDefinitionSHA||spatialDefinitionSHA!==row.spatialDefinitionSHA||sha(bytes(dir+'/schema.json'))!==raw.pins.schemaSHA256)throw Error('Frozen spatial research hash mismatch: '+row.gameId);
  const p=packs.find((p:any)=>p.id===row.gameId),photo=photos.find((p:any)=>p.gameId===row.gameId);
  if(!p||!photo||p.version!==raw.pins.packVersion||p.runtime.source.sha256!==raw.pins.runtimeSourceSHA||photo.definitionSHA!==raw.pins.photoDefinitionSHA)throw Error('Spatial source/pack/photo mismatch: '+row.gameId);
  for(const [fileKey,hashKey]of [['specFile','specSHA256'],['readoutCatalogFile','readoutCatalogSHA256'],['boardFile','boardSHA256']])if(sha(bytes(raw.pins[fileKey]))!==raw.pins[hashKey])throw Error('Spatial input changed: '+raw.pins[fileKey]);
  const frames=raw.frames.map((f:any)=>{
   if(sha(bytes(f.sourceFile))!==f.sourceSHA256)throw Error('Spatial frame changed: '+f.id);
   const board=read(f.sourceFile);
   const areas:SpatialArea[]=f.areas.map((a:any)=>{
    const real=board.areas.find((x:any)=>x.id===a.id);if(!real)throw Error('Missing spatial area');
    const addresses=expandSpatialAddresses(a.addressing).map(([address,slotId])=>{const s=real.slots.find((s:any)=>s.id===slotId);if(!s)throw Error('Missing spatial slot '+slotId);return {address,slotId,x:s.x,y:s.y,w:s.w,h:s.h};});
    return {id:a.id,label:a.label,mode:a.mode,fieldKey:a.fieldKey,sourceAreaIds:a.sourceAreaIds,scope:a.scope,visibility:a.visibility,acceptedComponents:a.acceptedComponents,captureAreaIds:a.captureAreaIds,matchingBasis:a.matchingBasis,orientation:a.orientation,requiresScopedFieldBinding:a.requiresScopedFieldBinding,addressing:a.addressing,...(a.activation?{activation:a.activation}:{}),addresses,nameBasis:a.nameBasis,slotNameOverrides:a.slotNameOverrides??[]};
   });
   return {id:f.id,sourceSHA:f.sourceSHA256,viewBox:f.viewBox,placementFrame:f.placementFrame??'base',areas};
  });
  const compiled={version:'spatial-definition-v1' as const,gameId:row.gameId,packId:p.id,packVersion:p.version,sourceSHA:p.runtime.source.sha256,photoDefinitionSHA:photo.definitionSHA,spatialDefinitionSHA,researchFileSHA:row.sha256,schemaSHA256:raw.pins.schemaSHA256,responseSchemaSHA:sha(canonical(responseSchema)),status:row.status,editionId:photo.editionId,frames,structuralNamespaces:raw.structuralNamespaces,prompt:{common:raw.prompt.common,gameInstruction:raw.prompt.gameInstruction}};
  return {...compiled,definitionSHA:sha(canonical(compiled))};
 });
 return {version:'spatial-definition-index-v1',definitions,responseSchema};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){const root=process.cwd(),data=generateSpatialDefinitions(root);mkdirSync(resolve(root,'game-photo-definitions/spatial'),{recursive:true});writeFileSync(resolve(root,'game-photo-definitions/spatial/index.json'),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({games:data.definitions.length,ready:data.definitions.filter(d=>d.status==='ready').length,partial:data.definitions.filter(d=>d.status==='partial').length,excluded:data.definitions.filter(d=>d.status==='excluded').length}));}
