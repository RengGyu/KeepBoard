import {effectiveComponentStatePack} from './componentStatePack.ts';
import index from './recognition-index.json';
import type {FieldDefinition,GamePack} from './types';
import type {RuntimeFieldBinding} from './gameEssentials';
type SourceField={id:string;type:string;scope:string;visibility:string;photo:boolean;componentIds:string[];areaIds:string[]};
type CatalogEntry={sources:{sha256:string[];editionId:string;fields:SourceField[]}[];variants:Record<string,string[]>};
const catalog=index as Record<string,CatalogEntry>;
export const PHOTO_PUBLIC='__photo.public',PHOTO_OWNER='__photo.owner';
export const observationTray=(field:string)=>field===PHOTO_PUBLIC||field===PHOTO_OWNER;
const scalarKeys=new Set(['score','score-total','prestige','money','cash','coins','energy','health','threat','authority']);
const safe=(b:RuntimeFieldBinding)=>b.visibility==='public'&&['public','player'].includes(b.scope)||b.visibility==='owner'&&b.scope==='player';
const same=(a:string[],b:string[])=>a.length===b.length&&a.every(x=>b.includes(x));
export function recognitionCapability(pack:GamePack){
 if(pack.runtime?.support.recording==='native'||!pack.runtime&&pack.fields.some(f=>f.acquisition==='observe'))return {mode:'native' as const,bindings:[] as RuntimeFieldBinding[],excluded:[] as {key:string;reason:string}[],compatible:true};
 const runtime=pack.runtime,source=runtime?.source,entry=source&&catalog[source.gameId],version=source&&entry?.sources.find(s=>s.editionId===source.editionId&&s.sha256.includes(source.sha256));
 const excluded:{key:string;reason:string}[]=[],bindings:RuntimeFieldBinding[]=[];
 for(const b of runtime?.fieldBindings??[]){
  if(observationTray(b.key))continue;
  const f=pack.fields.find(f=>f.key===b.key),s=version?.fields.find(f=>f.id===b.sourceId);
  let reason='';
  if(!version)reason='고정 원명세의 사진 허용 근거 미연결';
  else if(!safe(b)||['physical-only','opaque-preserve'].includes(b.editor))reason='비밀·역할·실물 보관 또는 비구조 기록';
  else if(!s?.photo)reason='원명세가 사진 관측을 허용하지 않음';
  else if(!f||f.scope!==b.scope||f.visibility!==b.visibility||s.scope!==b.scope||s.visibility!==b.visibility||!same(s.componentIds,b.componentIds)||!same(s.areaIds,b.areaIds))reason='고정 필드·영역·종류 계약 불일치';
  else if(b.editor==='component-catalog'&&s.type==='component-scene'&&f.type==='json')bindings.push(b);
  else if(b.editor==='scalar'&&scalarKeys.has(b.sourceId)&&f.type==='number'&&s.type==='number')bindings.push(b);
  else reason='사진 scalar 허용목록 밖';
  if(reason)excluded.push({key:b.key,reason});
 }
 return {mode:bindings.length?'assisted' as const:'manual' as const,bindings,excluded,compatible:!!version};
}
export function effectiveRecognitionPack(raw:GamePack):GamePack{
 raw=effectiveComponentStatePack(raw);
 const c=recognitionCapability(raw);if(c.mode!=='assisted')return raw;
 const pack=structuredClone(raw),r=pack.runtime!;r.support.recognition='assisted';
 pack.fields=pack.fields.filter(f=>!observationTray(f.key));r.fieldBindings=r.fieldBindings.filter(b=>!observationTray(b.key));
 const add=(owner:boolean,ids:string[])=>{if(!ids.length)return;const key=owner?PHOTO_OWNER:PHOTO_PUBLIC,area=owner?'__photo-owner':'__photo-public';
  if(pack.fields.some(f=>f.key===key))return;
  const scope=owner?'player':'public',visibility=owner?'owner':'public';
  pack.fields.push({key,label:owner?'내 사진의 미귀속 실물':'사진의 미귀속 실물',description:'사진에서 확인했지만 원래 기록 영역에 연결되지 않은 실물입니다.',type:'json',scope,visibility,lifetime:'session',acquisition:'ask',group:'essentials'});
  r.fieldBindings.push({key,sourceId:key,label:owner?'내 사진의 미귀속 실물':'사진의 미귀속 실물',editor:'component-catalog',scope,visibility,lifetime:'session',areaIds:[area],componentIds:[...new Set(ids)]});
 };
 add(false,c.bindings.filter(b=>b.visibility==='public').flatMap(b=>b.componentIds));
 add(true,c.bindings.filter(b=>b.scope==='player').flatMap(b=>b.componentIds));
 return pack;
}
/** Private-photo public holdings stay in a private tray; never lower photo visibility. */
export function recognitionFields(raw:GamePack,ownerId?:string):FieldDefinition[]{
 const pack=effectiveRecognitionPack(raw),c=recognitionCapability(pack);if(c.mode!=='assisted')return [];
 const keys=new Set(c.bindings.filter(b=>ownerId?b.scope==='player'&&b.visibility==='owner':b.scope==='public'&&b.visibility==='public').map(b=>b.key));
 keys.add(ownerId?PHOTO_OWNER:PHOTO_PUBLIC);
 return pack.fields.filter(f=>keys.has(f.key));
}
export function canRecognizePhotos(pack:GamePack,ownerId?:string){const c=recognitionCapability(pack);return c.mode==='native'||recognitionFields(pack,ownerId).length>0;}
export function recognizedVariants(pack:GamePack,componentId:string){return catalog[pack.runtime?.source.gameId??'']?.variants[componentId]??[];}
