import {readFileSync,writeFileSync} from 'node:fs';
const m=JSON.parse(readFileSync('docs/game-photo-corpus/manifest.json','utf8')),out=[];
for(const g of Object.values(m.games)){
 const url=`https://api.geekdo.com/api/geekitems?nosession=1&objectid=${g.bggId}&objecttype=thing`;let row={gameId:g.gameId,bggId:g.bggId,expectedName:g.name_en,url,at:new Date().toISOString()};
 try{const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});const x=(await r.json()).item??{};Object.assign(row,{status:r.status,name:x.name,year:x.yearpublished,subtype:x.subtype});}catch(e){row.error=String(e.message).slice(0,100);}
 out.push(row);writeFileSync('docs/game-photo-corpus/bgg-id-verification.json',JSON.stringify(out,null,1)+'\n');await new Promise(r=>setTimeout(r,350));
}
console.log(JSON.stringify({checked:out.length,ok:out.filter(x=>x.status===200).length}));
