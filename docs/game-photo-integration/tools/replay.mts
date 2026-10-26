import {readFile,writeFile} from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const root=process.cwd(),out=path.join(root,'docs/game-photo-integration'),{snapshot}=JSON.parse(await readFile(path.join(out,'work-paths.json'),'utf8'));
const {normalizeObservations}=await import(pathToFileURL(path.join(snapshot,'server/ai/index.ts')).href),packs=JSON.parse(await readFile(path.join(snapshot,'gamepacks/generated/game-essentials.json'),'utf8'));
const pre=JSON.parse(await readFile(path.join(root,'docs/photo-read-experiment/preflight.json'),'utf8')),results=[];
for(const [game,file]of [['sagrada','4-sagrada-A.response.json'],['scout','5-scout-A.response.json'],['sagrada','3-sagrada-B.response.json'],['scout','6-scout-B.response.json']]){
 const bytes=await readFile(path.join(pre.privateDir,file)),raw=JSON.parse(bytes.toString()).data,meta=pre.inputs.find((p:any)=>p.gameId===game),ownerId=meta.ownerId??undefined,pack=packs.find((p:any)=>p.runtime.source.gameId===game);
 const evidence={id:'pilot-'+game,kind:'photo',scope:ownerId?'player':'public',ownerId,url:'/unused-synthetic-source',label:'fixed authorized research replay',captureEpoch:'pilot-fixed',capturedAt:'2026-10-23T00:00:00Z'};
 const result=normalizeObservations(raw,pack,[evidence],'pilot-fixed',ownerId?[ownerId]:[]),pieces=result.assertions.flatMap((a:any)=>a.value.pieces??[]);
 const rawPieces=raw.assertions.flatMap((a:any)=>a.value.pieces??[]);let nonNull=0,manualNonNull=0;
 for(const p of pieces)for(const [key,value]of Object.entries(p.readout?.values??{}))if(value!==null){nonNull++;assert.equal(p.readout.sources[key],'observation');}
 if(file.includes('-A.'))assert.equal(pieces.length,game==='sagrada'?21:15);
 else assert.equal(nonNull,0,'missing typed readout must remain null, not label inference');
 results.push({game,file,responseSHA256:createHash('sha256').update(bytes).digest('hex'),rawPieces:rawPieces.length,pieces:pieces.length,nonNullTypedValues:nonNull,warnings:result.warnings.length,AIcalls:0});
}
await writeFile(path.join(out,'offline-replay.json'),JSON.stringify({source:'authorized fixed experiment response only; no original image/config read; no model calls',results},null,2)+'\n');console.log(JSON.stringify(results));
