import restorationProfiles from './generated/restoration-profiles.json';
import {compatibleRestorationProfile,type RestorationProfileV1} from '../shared/restorationProfile';
import generated from './generated/game-essentials.json';
import retired from './generated/retired-packs.json';
import reading from './generated/release-reading.json';
import restoration from './policies/restoration/index.json';
import type {RestorationPolicy} from '../shared/restoration';
export function withRestorationProfile(pack:GamePack):GamePack{if(compatibleRestorationProfile(pack,pack.restorationProfile))return pack;const profile=restorationProfiles.profiles.find(p=>p.pin.packId===pack.id&&p.pin.packVersion===pack.version&&p.pin.sourceSHA===(pack.runtime?.source.sha256??null)&&p.pin.editionId===(pack.runtime?.source.editionId??null)) as unknown as RestorationProfileV1|undefined;return profile&&compatibleRestorationProfile(pack,profile)?{...pack,restorationProfile:profile}:pack;}
export const withRestoration=(pack:GamePack):GamePack=>{const p=restoration.policies.find(p=>p.packId===pack.id&&p.packVersion===pack.version&&p.sourceSHA===pack.runtime?.source.sha256);return withRestorationProfile(p?{...pack,restorationPolicy:p as unknown as RestorationPolicy}:pack);};
import {catanPack} from './catan.ts';
import {rummikubPack,legacyRummikubPack} from './rummikub.ts';
import type {GamePack} from '../shared/types.ts';
export const legacyNativePacks=[catanPack,legacyRummikubPack,rummikubPack];
// Generated JSON has no undefined area keys; its per-game union is validated by generate-release-reading.
export const catalogPacks=(generated as GamePack[]).map(pack=>{
 const policy=reading.games.find(g=>g.packId===pack.id&&g.packVersion===pack.version&&g.sourceSHA===pack.runtime?.source.sha256);
 return withRestoration(policy?{...pack,photoReadingPolicy:{policySHA:policy.policySHA,definitionSHA:policy.definitionSHA,areas:policy.areas as unknown as Record<string,Record<string,string[]>>}}:pack);
});
export function builtinPacks(){return [...catalogPacks,...legacyNativePacks.filter(p=>!catalogPacks.some(c=>c.id===p.id))];}
/** Pack versions a source revision replaced. A save that pinned one opens with it unchanged; new boards never start from it. */
export const retiredPacks=(retired as GamePack[]).map(withRestoration);
export function legacyPack(id:string,version:string){return legacyNativePacks.find(p=>p.id===id&&p.version===version)??retiredPacks.find(p=>p.id===id&&p.version===version);}
