import {createHash} from 'node:crypto';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {validateSpecification,catalogCoverage,normalizedJSON} from '../game-specs/validate.ts';
import {readCatalog} from '../game-specs/io.ts';
import {adaptSpecification,RUNTIME_ADAPTER_VERSION} from '../../shared/gameEssentials.ts';
import {catanPack} from '../../gamepacks/catan.ts';
import {rummikubPack} from '../../gamepacks/rummikub.ts';

export async function generateRuntime(input:string,out:string,complete=true){
 const ids=await readCatalog(),specs:any[]=[],packs=[],sources=[];
 for(const file of (await readdir(input)).filter(f=>f.endsWith('.json')).sort()){
  const bytes=await readFile(path.join(input,file)),raw=JSON.parse(bytes.toString()),result=validateSpecification(raw,{catalogIds:ids});
  if(!result.valid)throw new Error(`${file}: ${result.issues.map(i=>i.path+' '+i.code).join(', ')}`);
  const digest=createHash('sha256').update(bytes).digest('hex'),spec=result.specification!;
  specs.push(spec);const native=spec.game_id==='catan'?catanPack:spec.game_id==='rummikub'?rummikubPack:undefined;
  packs.push(adaptSpecification(spec,digest,native));sources.push({gameId:spec.game_id,file,sha256:digest});
 }
 const coverage=catalogCoverage(specs,ids);if(complete&&!coverage.complete)throw new Error('120게임 coverage가 완전하지 않습니다.');
 const data=normalizedJSON(packs as any);await mkdir(path.dirname(out),{recursive:true});
 // A pack version this run replaces is kept, byte-for-byte as a JSON value, so saves pinned to it still open.
 const retiredFile=path.join(path.dirname(out),'retired-packs.json');
 let retired:any[]=[];try{retired=JSON.parse(await readFile(retiredFile,'utf8'));}catch{}
 try{for(const old of JSON.parse(await readFile(out,'utf8')))if(!packs.some((p:any)=>p.id===old.id&&p.version===old.version)&&!retired.some(r=>r.id===old.id&&r.version===old.version))retired.push(old);}catch{}
 if(retired.length)await writeFile(retiredFile,JSON.stringify(retired.sort((a,b)=>a.id.localeCompare(b.id)||a.version.localeCompare(b.version)))+'\n');
 await writeFile(out,data);
 await writeFile(out.replace(/\.json$/,'.manifest.json'),JSON.stringify({adapter:RUNTIME_ADAPTER_VERSION,coverage,sources,outputSha256:createHash('sha256').update(data).digest('hex'),factualVerification:false},null,2)+'\n');
 return {count:packs.length,coverage};
}
if(process.argv[1]?.endsWith('generate.ts'))console.log(JSON.stringify(await generateRuntime(process.argv[2]??'docs/research/game-specs-120/games',process.argv[3]??'gamepacks/generated/game-essentials.json',!process.argv.includes('--partial'))));
