import type {Player} from '../shared/types';
export const CREATION_COLORS=['#c65d4b','#6285aa','#d5a44d','#78967a','#997ba6','#b68a64','#38445e','#bb668c','#478f9b','#9b913d','#865a46','#81838a'] as const;
export function creationPlayers(count:number):Player[]{return Array.from({length:count},(_,i)=>({id:crypto.randomUUID(),name:'',color:CREATION_COLORS[i%CREATION_COLORS.length]}));}
