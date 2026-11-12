import type {GamePack} from './types';
import type {PhotoDefinition,ObservationRequest} from './lightweightRecognition';
export type ReadingTarget={version:'reading-target-v1';mode:'area';areaId:string}|{version:'reading-target-v1';mode:'public-scene';areaIds:string[];policySHA:string};
export interface RestorationPolicy {version:'restoration-policy-v1';packId:string;packVersion:string;sourceSHA:string;definitionSHA:string;policySHA:string;display:'native'|'fixed-slots'|'map-network'|'photo-layout';publicAreaIds:string[];areas:Record<string,Record<string,string[]>>;canonicalSpatial:boolean;limitations:string[]}
export function compatibleRestoration(pack:GamePack):RestorationPolicy|undefined{const p=pack.restorationPolicy;return p?.version==='restoration-policy-v1'&&p.packId===pack.id&&p.packVersion===pack.version&&p.sourceSHA===pack.runtime?.source.sha256&&/^[a-f0-9]{64}$/.test(p.definitionSHA)&&/^[a-f0-9]{64}$/.test(p.policySHA)?p:undefined;}
export function publicSceneTarget(pack:GamePack):ReadingTarget|undefined{const p=compatibleRestoration(pack);return p?.publicAreaIds.length?{version:'reading-target-v1',mode:'public-scene',areaIds:[...p.publicAreaIds],policySHA:p.policySHA}:undefined;}
/** Public scene is explicit metadata, never an invented capture area or a private union. */
export function readingAreas(pack:GamePack,d:PhotoDefinition,areaId:string,target?:ReadingTarget){
 if(!target||target.mode==='area'){
  if(target&&(target.version!=='reading-target-v1'||target.areaId!==areaId||Object.keys(target).some(k=>!['version','mode','areaId'].includes(k))))throw Error('판독 영역 선택이 다릅니다.');
  const a=d.areas.find(a=>a.id===areaId);if(!a)throw Error('촬영 영역이 없습니다.');return [a];
 }
 const p=compatibleRestoration(pack);
 if(target.mode!=='public-scene'||target.version!=='reading-target-v1'||!p||p.definitionSHA!==d.definitionSHA||target.policySHA!==p.policySHA||Object.keys(target).some(k=>!['version','mode','areaIds','policySHA'].includes(k))||JSON.stringify(target.areaIds)!==JSON.stringify(p.publicAreaIds))throw Error('공개 장면 정책·판본을 확인하세요.');
 const areas=target.areaIds.map(id=>d.areas.find(a=>a.id===id));if(!areas.length||areas.some(a=>!a||a.partition==='owner_private')||!target.areaIds.includes(areaId))throw Error('비공개 영역을 공개 장면에 넣을 수 없습니다.');return areas as PhotoDefinition['areas'];
}
export function requestAreas(request:ObservationRequest,d:PhotoDefinition){return request.readingTarget?.mode==='public-scene'?d.areas.filter(a=>request.readingTarget!.mode==='public-scene'&&request.readingTarget!.areaIds.includes(a.id)&&a.partition!=='owner_private'):d.areas.filter(a=>a.id===request.areaId);}
