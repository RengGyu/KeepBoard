import profiles from './capture-profiles.json';
import type {Evidence,FieldDefinition,GamePack,Value} from './types';
export interface CaptureTarget {version:1;gameId:string;sourceSHA:string;areaId:string}
export interface CaptureArea {id:string;name:string;partition:string;instruction:string;fields:string[];components:string[]}
export interface CaptureProfile {version:1;gameId:string;packId:string;editionId:string;sourceSHA:string;focus:string;areas:CaptureArea[];visible:Record<string,string[]>}
export function captureProfile(pack:GamePack):CaptureProfile|undefined {
 const source=pack.runtime?.source,p=source&&(profiles as Record<string,CaptureProfile>)[source.gameId];
 return p&&p.packId===pack.id&&p.editionId===source!.editionId&&p.sourceSHA===source!.sha256?p:undefined;
}
export function captureAreas(pack:GamePack,ownerId?:string){return captureProfile(pack)?.areas.filter(a=>ownerId?a.partition==='owner_private':a.partition==='common_public'||a.partition==='player_public')??[];}
/** Only a new upload is validated here. Old pinned records/photos are never migrated. */
export function validateCaptureTarget(raw:unknown,pack:GamePack,ownerId?:string):CaptureTarget|undefined {
 if(raw===undefined)return undefined;
 const p=captureProfile(pack),v=raw as CaptureTarget;
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['version','gameId','sourceSHA','areaId'].includes(k))||v.version!==1||!p||v.gameId!==p.gameId||v.sourceSHA!==p.sourceSHA||!captureAreas(pack,ownerId).some(a=>a.id===v.areaId))throw new Error('촬영할 부분과 공용·본인 범위를 다시 선택해 주세요.');
 return {version:1,gameId:v.gameId,sourceSHA:v.sourceSHA,areaId:v.areaId};
}
function targetArea(pack:GamePack,e:Evidence){
 const p=captureProfile(pack),t=e.captureTarget;
 return p&&t?.version===1&&t.gameId===p.gameId&&t.sourceSHA===p.sourceSHA?captureAreas(pack,e.ownerId).find(a=>a.id===t.areaId):undefined;
}
export function captureFields(pack:GamePack,evidence:Evidence[],fields:FieldDefinition[]){
 const areas=evidence.map(e=>targetArea(pack,e)).filter((a):a is CaptureArea=>!!a);
 return fields.filter(f=>areas.every(a=>a.fields.includes(f.key)));
}
export function captureComponentIds(pack:GamePack,evidence:Evidence[]):string[]|undefined {
 const areas=evidence.map(e=>targetArea(pack,e)).filter((a):a is CaptureArea=>!!a);
 return areas.length?areas[0].components.filter(id=>areas.every(a=>a.components.includes(id))):undefined;
}
/** Provider/mocked results must also respect the selected part before becoming candidates. */
export function validateCaptureObservation(pack:GamePack,field:string,value:Value,evidence:Evidence[]){
 if(!captureFields(pack,evidence,pack.fields).some(f=>f.key===field))throw new Error('선택한 촬영 부분 밖의 결과입니다.');
 const ids=captureComponentIds(pack,evidence);if(!ids||!value||typeof value!=='object'||Array.isArray(value))return;
 const entries=Array.isArray(value.pieces)?value.pieces:Array.isArray(value.components)?value.components:[];
 for(const p of entries)if(p&&typeof p==='object'&&!Array.isArray(p)){
  const id=p.componentId??p.kind;
  if(id!==undefined&&id!==null&&id!=='unknown'&&!ids.includes(String(id)))throw new Error('선택한 촬영 부분 밖의 구성물입니다.');
 }
}
export function capturePrompt(pack:GamePack,evidence:Evidence[]){
 const p=captureProfile(pack);if(!p)return '';
 const areas=evidence.map(e=>targetArea(pack,e)).filter((a):a is CaptureArea=>!!a);
 return `CURRENT GAME CAPTURE CONTRACT: ${JSON.stringify({gameId:p.gameId,edition:p.editionId,focus:p.focus,selectedParts:[...new Map(areas.map(a=>[a.id,a])).values()]})}\nOnly this game's authorized context and selected parts are in scope. Public player possessions have no inferred owner. Keep private originals private. Unseen is null, not 0; physical quantity is not printed cost. A partial view never clears saved state. Keep original crops; no inferred slot, identity, owner, history or hidden contents.`;
}
export function validateStaticPhotos(evidence:Evidence[],sameStaticState?:boolean){
 if(evidence.filter(e=>e.kind==='photo').length>1&&sameStaticState!==true)throw new Error('여러 사진이 같은 멈춘 판인지 확인해 주세요.');
}
