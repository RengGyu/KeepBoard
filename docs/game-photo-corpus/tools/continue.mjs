import {readFileSync,writeFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const file='docs/game-photo-corpus/manifest.json',tool='docs/game-photo-corpus/tools/corpus.mjs';
const initial=JSON.parse(readFileSync(file,'utf8'));let count=0;
for(const game of Object.values(initial.games)){
 if(game.status!=='not-searched'||initial.images.some(i=>i.gameId===game.gameId&&i.localPath))continue;
 const r=spawnSync(process.execPath,[tool,'autopick',game.gameId,String(game.bggId),'2'],{encoding:'utf8',timeout:90000});
 const now=JSON.parse(readFileSync(file,'utf8')),g=now.games[game.gameId];
 g.collectionAttempt={at:new Date().toISOString(),collector:'Sol1',method:'public BGG Play recent40 then conditional all recent60; caption preselection only, visual review pending',exit:r.status,detail:r.status===0?JSON.parse(r.stdout):String(r.stderr||r.error).slice(0,200)};
 writeFileSync(file,JSON.stringify(now,null,1)+'\n');console.log(JSON.stringify({gameId:game.gameId,exit:r.status,picked:g.collectionAttempt.detail?.picked?.length??0}));count++;
 await new Promise(r=>setTimeout(r,650));
}
console.log(JSON.stringify({finished:count}));
