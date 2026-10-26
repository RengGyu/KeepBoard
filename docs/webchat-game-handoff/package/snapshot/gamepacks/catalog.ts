import generated from './generated/game-essentials.json';
import {catanPack} from './catan.ts';
import {rummikubPack,legacyRummikubPack} from './rummikub.ts';
import type {GamePack} from '../shared/types.ts';
export const legacyNativePacks=[catanPack,legacyRummikubPack,rummikubPack];
export const catalogPacks=generated as GamePack[];
export function builtinPacks(){return [...catalogPacks,...legacyNativePacks.filter(p=>!catalogPacks.some(c=>c.id===p.id))];}
export function legacyPack(id:string,version:string){return legacyNativePacks.find(p=>p.id===id&&p.version===version);}
