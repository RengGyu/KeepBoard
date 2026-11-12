import type {GamePack} from '../shared/types';
import type {GameReadoutDefinition} from '../shared/readouts/types';
import type {PhotoDefinition} from '../shared/lightweightRecognition';
import type {CaptureProfile} from '../shared/photoCapture';
import {gameDataKey,gameDataPath,matchesReadout} from '../shared/readouts/identity';
export interface GameData {version:1;photo:PhotoDefinition;readout:GameReadoutDefinition|null;capture:CaptureProfile|null;generation:'current'|'retired'}
const matches=(d:PhotoDefinition,pack:GamePack)=>d?.packId===pack.id&&d.packVersion===pack.version&&d.gameId===pack.runtime?.source.gameId&&d.editionId===pack.runtime?.source.editionId&&d.sourceSHA===pack.runtime?.source.sha256;
export function createGameDataLoader(fetchData:(url:string)=>Promise<unknown>){
 const rows=new Map<string,GameData>(),pending=new Map<string,Promise<void>>();
 const find=(pack:GamePack)=>rows.get(gameDataKey(pack));
 const load=(pack:GamePack):Promise<void>=>{
  if(find(pack))return Promise.resolve();const key=gameDataKey(pack);if(pending.has(key))return pending.get(key)!;
  const task=Promise.resolve().then(()=>fetchData(gameDataPath(pack))).then(raw=>{
   const d=raw as GameData;
   if(d?.version!==1||!['current','retired'].includes(d.generation)||!matches(d.photo,pack)||d.readout!==null&&!matchesReadout(d.readout,pack)||d.capture!==null&&(!d.capture||d.capture.packId!==pack.id||d.capture.gameId!==pack.runtime?.source.gameId||d.capture.editionId!==pack.runtime?.source.editionId||d.capture.sourceSHA!==pack.runtime?.source.sha256))throw Error('요청한 게임·판본의 편집 데이터가 아닙니다. 기존 기록은 보존됩니다.');
   rows.set(key,structuredClone(d));
  }).finally(()=>{pending.delete(key);});pending.set(key,task);return task;
 };
 return {find,load};
}
const loader=createGameDataLoader(async url=>{const r=await fetch(url);if(!r.ok)throw Error('게임 편집 데이터를 불러오지 못했어요. 기존 기록은 보존됩니다.');return r.json();});
// These sparse maps are the browser adapters for photoCapture's existing synchronous API.
export const captureProfileCurrent:Record<string,CaptureProfile>={},captureProfileRetired:Record<string,CaptureProfile>={};
export const gameDataFor=loader.find;
export async function loadGameData(pack:GamePack){await loader.load(pack);const d=loader.find(pack)!;if(d.capture)(d.generation==='current'?captureProfileCurrent:captureProfileRetired)[d.capture.gameId]=d.capture;}
export const readoutDefinitionFor=(pack:GamePack)=>loader.find(pack)?.readout??undefined;
export const photoDefinitionFor=(pack:GamePack)=>loader.find(pack)?.photo;
export async function loadPhotoDefinitions(pack?:GamePack){if(!pack)throw Error('선택한 게임의 판본이 필요합니다.');await loadGameData(pack);}
