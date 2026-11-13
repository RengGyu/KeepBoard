import type {GamePack} from './types';
import {sceneDigest} from './restorationIdentity';
export type SHA256 = string;
export type ScopeKey = string; // existing save/write scope: "public" or playerId
export type Family = 'grid' | 'track' | 'lane' | 'stack' | 'market'
  | 'network' | 'player-area' | 'free-area';
export type SourcePointer = {
  kind: 'pack' | 'spec' | 'spatial' | 'art' | 'rules';
  id: string; sha256?: SHA256; pointer?: string; section?: string;
};
export type ProfilePin = {
  profileId: string; profileVersion: string; profileSHA: SHA256;
  packId: string; packVersion: string;
  sourceSHA: SHA256 | null; // null only for explicitly supported legacy native packs
  editionId: string | null;
};
export type RegionRecipe = {
  id: string; label: string; family: Family;
  fieldKeys: string[]; allowedComponentIds: string[];
  partition: 'common_public' | 'player_public' | 'owner_private';
  repeat: 'single' | 'per-observed-board' | 'per-observed-group';
  anchor: 'observed-board' | 'shared-board' | 'optional-board' | 'none';
  topology?: {
    rows?: number; columns?: number; slotIds?: string[];
    networkRef?: string; assetStructure?:{sourceId:string;sourceSHA:string;pointers:string[]}; spatialDefinitionSHA?: SHA256;
  };
  preservedRelations: Array<'membership' | 'order' | 'overlap'
    | 'attachment' | 'tuck' | 'side' | 'adjacency'>;
  constraints: Array<{
    id: string; kind: 'role-compatible' | 'address-domain'
      | 'partial-order' | 'variant-applicability';
    parameters: Record<string, unknown>; sources: SourcePointer[];
  }>;
  sources: SourcePointer[];
};
export type RestorationProfileV1 = {
  version: 'restoration-profile-v1'; pin: ProfilePin;
  regions: RegionRecipe[];
  macro: { mode: 'shared-center' | 'opposed-sides' | 'observed-regions';
    preservePhotoAxes: boolean; neighborOrderNeedsEvidence: boolean };
  applicability: {
    variants: string[]; playerCountRange?: [number, number];
    unresolvedEditionPolicy: 'common-visual-only';
  };
  readingHints: Array<{ roleId: string; visibleCues: string[];
    distinguishFrom: string[]; preserveWhenUnknown: string[] }>;
  preservationLinks: Array<{ recipeId: string; templateId: string;
    relationKinds: RegionRecipe['preservedRelations'] }>;
};

export interface RestorationProfileInputs {asset?:{id:string;sha256:string;data:{areas?:any[];tableModel?:unknown;tableZones?:unknown;numericTracks?:unknown;network?:unknown}};semantic?:{source?:SourcePointer;macro?:RestorationProfileV1['macro'];regionHints?:Record<string,{label?:string;repeat?:RegionRecipe['repeat'];family?:Family;anchor?:RegionRecipe['anchor'];preservedRelations?:RegionRecipe['preservedRelations']}>};}
export const RESTORATION_PROFILE_COMPILER='restoration-profile-1';
const families:Family[]=['grid','track','lane','stack','market','network','player-area','free-area'];
const nativeLegacy:Record<string,string[]>={'catan-base':['1.2.0'],'rummikub':['1.0.0','1.1.0']};
export function compatibleRestorationProfile(pack:GamePack,profile:RestorationProfileV1|undefined):boolean{
 if(!profile||profile.version!=='restoration-profile-v1'||!profile.pin||profile.pin.packId!==pack.id||profile.pin.packVersion!==pack.version||profile.pin.sourceSHA!==(pack.runtime?.source.sha256??null)||profile.pin.editionId!==(pack.runtime?.source.editionId??null)||!Array.isArray(profile.regions))return false;
 return profile.pin.profileSHA===sceneDigest({...profile,pin:{...profile.pin,profileSHA:''}})&&profile.regions.every(r=>families.includes(r.family)&&r.fieldKeys.every(key=>pack.fields.some(f=>f.key===key)));
}
/** Exact pinned pack only. No catalog lookup, no occupancy or inferred player instances. */
export function compileRestorationProfile(pack:GamePack,inputs:RestorationProfileInputs={}):RestorationProfileV1{
 if(!Object.keys(inputs).length&&compatibleRestorationProfile(pack,pack.restorationProfile))return structuredClone(pack.restorationProfile!);
 const sourceSHA=pack.runtime?.source.sha256??null,native=sourceSHA===null&&nativeLegacy[pack.id]?.includes(pack.version),regions:RegionRecipe[]=[],source:SourcePointer={kind:'pack',id:pack.id,sha256:sourceSHA??sceneDigest({id:pack.id,version:pack.version}),pointer:'runtime.fieldBindings'};
 const bindings:{key:string;label:string;scope:string;visibility:string;editor:string;componentIds:string[];areaIds:string[]}[]=pack.runtime?.fieldBindings??pack.fields.filter(f=>f.presentation==='scene'||f.type==='json').map(f=>({key:f.key,label:f.label,scope:f.scope,visibility:f.visibility??'public',editor:'native',componentIds:[],areaIds:[f.key]}));
 for(const b of bindings){
  const field=pack.fields.find(f=>f.key===b.key);if(!field||['physical-only','opaque-preserve','scalar'].includes(b.editor))continue;
  const partition=field.scope==='public'?'common_public':field.visibility==='public'?'player_public':'owner_private';
  for(const areaId of b.areaIds.length?b.areaIds:[b.key]){let id=areaId;if(regions.some(r=>r.id===id&&r.partition!==partition))id=partition+':'+areaId;const existing=regions.find(r=>r.id===id);if(existing){existing.fieldKeys=[...new Set([...existing.fieldKeys,b.key])];existing.allowedComponentIds=[...new Set([...existing.allowedComponentIds,...b.componentIds])];continue;}
   const art=inputs.asset?.data.areas?.find(a=>a.field===b.key&&(!a.accepts?.length||a.accepts.some((id:string)=>b.componentIds.includes(id)))),hint=inputs.semantic?.regionHints?.[areaId],slots=art?.slots??[],xs=new Set(slots.map((s:any)=>s.x)),ys=new Set(slots.map((s:any)=>s.y));let family:Family=hint?.family??(slots.length&&xs.size>1&&ys.size>1?'grid':slots.length?'track':art?.ordered?'lane':field.scope==='player'?'player-area':'free-area');
   let topology:RegionRecipe['topology']=slots.length?{slotIds:slots.map((s:any)=>s.id),...(family==='grid'?{rows:ys.size,columns:xs.size}:{})}:undefined;
   const pointers=['tableModel','tableZones','numericTracks','network'].filter(k=>inputs.asset?.data[k as keyof typeof inputs.asset.data]!==undefined);if(inputs.asset&&pointers.length){const target=topology??{};target.assetStructure={sourceId:inputs.asset.id,sourceSHA:inputs.asset.sha256,pointers};if(inputs.asset.data.network)target.networkRef=inputs.asset.id+'#/network';topology=target;}
   regions.push({id,label:hint?.label??field.label,family,fieldKeys:[b.key],allowedComponentIds:[...b.componentIds],partition,repeat:hint?.repeat??(field.scope==='player'?'per-observed-board':'per-observed-group'),anchor:hint?.anchor??(native?'shared-board':'optional-board'),...(topology?{topology}:{}),preservedRelations:hint?.preservedRelations??['membership','order','overlap','attachment'],constraints:[{id:id+':role',kind:'role-compatible',parameters:{componentIds:[...b.componentIds]},sources:[source]}],sources:[source,...(inputs.semantic?.source?[inputs.semantic.source]:[]),...(inputs.asset?[{kind:'art' as const,id:inputs.asset.id,sha256:inputs.asset.sha256,pointer:'areas'}]:[])]});
  }
 }
 const profile:RestorationProfileV1={version:'restoration-profile-v1',pin:{profileId:pack.id+':restoration',profileVersion:RESTORATION_PROFILE_COMPILER,profileSHA:'',packId:pack.id,packVersion:pack.version,sourceSHA,editionId:pack.runtime?.source.editionId??null},regions,macro:inputs.semantic?.macro??{mode:'observed-regions',preservePhotoAxes:true,neighborOrderNeedsEvidence:true},applicability:{variants:[],unresolvedEditionPolicy:'common-visual-only'},readingHints:regions.map(r=>({roleId:r.id,visibleCues:[r.label,...r.allowedComponentIds.map(id=>pack.runtime?.components.find(c=>c.id===id)?.name??id)],distinguishFrom:regions.filter(o=>o.id!==r.id&&o.allowedComponentIds.some(id=>r.allowedComponentIds.includes(id))).map(o=>o.id),preserveWhenUnknown:['physical-object','literal-values','unknown-role','hidden-face']})),preservationLinks:pack.preservationTemplates.flatMap(p=>regions.filter(r=>r.partition==='common_public'?(p.scope==='public'):(p.scope==='player')).map(r=>({recipeId:r.id,templateId:p.id,relationKinds:r.preservedRelations})))};
 // Unknown legacy sources retain visual recipes without gaining canonical topology.
 if(sourceSHA===null&&!native)for(const r of profile.regions){r.anchor='none';delete r.topology;}
 profile.pin.profileSHA=sceneDigest({...profile,pin:{...profile.pin,profileSHA:''}});return profile;
}
