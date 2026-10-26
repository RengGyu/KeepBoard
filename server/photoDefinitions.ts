import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import index from '../game-photo-definitions/index.json';
import type {GamePack} from '../shared/types';
import type {PhotoDefinition} from '../shared/lightweightRecognition';
export function canonicalJSON(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(canonicalJSON).join(',')+']';
 if(value!==null&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalJSON((value as any)[k])).join(',')+'}';
 return JSON.stringify(value);
}
export function definitionHash(definition:PhotoDefinition){const {definitionSHA,...body}=definition;return createHash('sha256').update(canonicalJSON(body)).digest('hex');}
export function photoDefinition(pack:GamePack,expectedSHA?:string):PhotoDefinition {
 const d=(index.games as PhotoDefinition[]).find(d=>d.gameId===pack.runtime?.source.gameId),source=pack.runtime?.source;
 if(!d||d.definitionSHA!==definitionHash(d)||expectedSHA!==undefined&&expectedSHA!==d.definitionSHA||d.packId!==pack.id||d.packVersion!==pack.version||d.editionId!==source?.editionId||d.sourceSHA!==source?.sha256)throw new Error('현재 게임 판본·촬영 정의가 달라졌습니다. 기존 기록은 보존됩니다.');
 return structuredClone(d);
}
export function photoDefinitionsMetadata(){
 let bytes:Buffer;try{bytes=readFileSync(new URL('../game-photo-definitions/index.json',import.meta.url));}catch{bytes=Buffer.from(canonicalJSON(index));}
 return {indexSHA:createHash('sha256').update(bytes).digest('hex'),version:'game-photo-definitions-v1' as const,count:index.games.length};
}
