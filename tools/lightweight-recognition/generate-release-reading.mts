import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {PhotoDefinition} from '../../shared/lightweightRecognition';
import type {GamePack} from '../../shared/types';
/** Request policy has its own immutable identity; it never rebinds a historical PhotoDefinition. */
export function generateReleaseReading(root=process.cwd()){
 const source=readFileSync(resolve(root,'gamepacks/policies/release-reading.json')),policy=JSON.parse(source.toString());
 const definitions=JSON.parse(readFileSync(resolve(root,'game-photo-definitions/index.json'),'utf8')).games as PhotoDefinition[];
 const packs=JSON.parse(readFileSync(resolve(root,'gamepacks/generated/game-essentials.json'),'utf8')) as GamePack[];
 if(policy.version!=='release-reading-policy-v1'||!Array.isArray(policy.games)||new Set(policy.games.map((g:any)=>g.gameId)).size!==policy.games.length)throw Error('판독 정책 ID를 확인하세요.');
 const games=policy.games.map((g:any)=>{
  const d=definitions.find(d=>d.gameId===g.gameId&&d.packId===g.packId&&d.packVersion===g.packVersion&&d.sourceSHA===g.sourceSHA&&d.definitionSHA===g.definitionSHA);
  if(!d||!packs.some(p=>p.id===g.packId&&p.version===g.packVersion&&p.runtime?.source.sha256===g.sourceSHA))throw Error('판독 정책 source/definition pin이 다릅니다.');
  if(Object.keys(g.areas).sort().join()!==d.areas.map(a=>a.id).sort().join())throw Error('영역별 판독 정책을 확인하세요.');
  for(const a of d.areas){const row=g.areas[a.id];if(Object.keys(row).sort().join()!==[...a.componentIds].sort().join())throw Error('영역별 구성물 정책을 확인하세요.');for(const id of a.componentIds){const c=d.components.find(c=>c.id===id)!;if(!Array.isArray(row[id])||new Set(row[id]).size!==row[id].length||row[id].some((p:string)=>!c.properties.some(f=>f.id===p&&f.acquisition==='visible')||c.manualPropertyIds.includes(p)))throw Error('정책은 기존 visible property ID만 사용할 수 있습니다.');}}
  return {...g,policySHA:createHash('sha256').update(JSON.stringify(g)).digest('hex')};
 });
 return {version:policy.version,sourceSHA:createHash('sha256').update(source).digest('hex'),games};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){const value=generateReleaseReading();writeFileSync('gamepacks/generated/release-reading.json',JSON.stringify(value,null,2)+'\n');console.log(JSON.stringify({games:value.games.length,sourceSHA:value.sourceSHA}));}
