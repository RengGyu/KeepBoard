import generated from './generated/game-essentials.json';
import retired from './generated/retired-packs.json';
import {catanPack} from './catan.ts';
import {rummikubPack,legacyRummikubPack} from './rummikub.ts';
import type {GamePack} from '../shared/types.ts';
export const legacyNativePacks=[catanPack,legacyRummikubPack,rummikubPack];
export const catalogPacks=generated as GamePack[];
export function builtinPacks(){return [...catalogPacks,...legacyNativePacks.filter(p=>!catalogPacks.some(c=>c.id===p.id))];}
/** Pack versions a source revision replaced. A save that pinned one opens with it unchanged; new boards never start from it. */
export const retiredPacks=retired as GamePack[];
export function legacyPack(id:string,version:string){return legacyNativePacks.find(p=>p.id===id&&p.version===version)??retiredPacks.find(p=>p.id===id&&p.version===version);}
