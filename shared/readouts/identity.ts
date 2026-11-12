import type {GamePack} from '../types';
import type {GameReadoutDefinition} from './types';
export function matchesReadout(d:GameReadoutDefinition|undefined|null,pack:GamePack):d is GameReadoutDefinition{
 const s=pack.runtime?.source;return !!d&&!!s&&d.gameId===s.gameId&&s.editionId===d.editionId&&s.sha256===d.sourceSHA&&pack.id===d.runtimePackId&&pack.version===d.packVersion;
}
/** Exact pinned source/version; unknown editions never fall back to the current game. */
export const gameDataKey=(pack:GamePack)=>JSON.stringify([pack.id,pack.version,pack.runtime?.source.gameId,pack.runtime?.source.editionId,pack.runtime?.source.sha256]);
export function gameDataPath(pack:GamePack){
 const s=pack.runtime?.source;if(!s||!s.gameId||!pack.version||!/^[a-f0-9]{64}$/.test(s.sha256))throw Error('게임의 고정 판본을 확인할 수 없어요. 기존 기록은 보존됩니다.');
 return `/game-data/${encodeURIComponent(s.gameId)}/${s.sha256}-${encodeURIComponent(pack.version)}.json`;
}
