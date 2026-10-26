#!/usr/bin/env node
// Local research photo corpus. Originals live only in a private 0700 temp dir; this repo keeps metadata.
// Commands:
//   gallery <bggObjectId> [tag=Play] [count=12] [sort=hot|recent]   list public BGG gallery images (no login, nosession=1)
//   fetch <json>                                  download one image, verify bytes/MIME/dimensions, SHA dedup, record "unclassified"
//   set <sha256> <json>                           merge classification/visible-area fields into an entry
//   game <gameId> <json>                          merge per-game status (bggId, status, missingReason, searches)
//   export                                        write manifest.csv + coverage.json from manifest.json
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,chmod,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=fileURLToPath(new URL('..',import.meta.url));
const manifestPath=join(here,'manifest.json');
const privateDir=join(process.env.TMPDIR??'/tmp','keepboard-photo-corpus','originals');
const UA='KeepBoard-local-research/0.1 (private photo corpus; no redistribution)';

async function load(){
 if(!existsSync(manifestPath)){const games=JSON.parse(await readFile(join(here,'games.json'),'utf8'));return {schema:'keepboard-photo-corpus-v1',privateDir,games:Object.fromEntries(games.map(g=>[g.gameId,{...g,bggId:null,status:'not-searched',missingReason:null,searches:[]}])),images:[]};}
 return JSON.parse(await readFile(manifestPath,'utf8'));
}
const save=m=>writeFile(manifestPath,JSON.stringify(m,null,1)+'\n');

function sniff(buf){
 if(buf[0]===0xff&&buf[1]===0xd8){let i=2;while(i<buf.length){if(buf[i]!==0xff){i++;continue;}const marker=buf[i+1],len=buf.readUInt16BE(i+2);if(marker>=0xc0&&marker<=0xcf&&![0xc4,0xc8,0xcc].includes(marker))return {mime:'image/jpeg',ext:'jpg',height:buf.readUInt16BE(i+5),width:buf.readUInt16BE(i+7)};i+=2+len;}return {mime:'image/jpeg',ext:'jpg',width:null,height:null};}
 if(buf.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])))return {mime:'image/png',ext:'png',width:buf.readUInt32BE(16),height:buf.readUInt32BE(20)};
 if(buf.subarray(0,4).toString()==='RIFF'&&buf.subarray(8,12).toString()==='WEBP'){const kind=buf.subarray(12,16).toString();if(kind==='VP8X')return {mime:'image/webp',ext:'webp',width:1+buf.readUIntLE(24,3),height:1+buf.readUIntLE(27,3)};if(kind==='VP8L'){const b=buf.readUInt32LE(21);return {mime:'image/webp',ext:'webp',width:(b&0x3fff)+1,height:((b>>14)&0x3fff)+1};}return {mime:'image/webp',ext:'webp',width:buf.readUInt16LE(26)&0x3fff,height:buf.readUInt16LE(28)&0x3fff};}
 return null;
}

const [cmd,...args]=process.argv.slice(2);
async function gallery(id,tag='Play',count='12',sort='hot'){
 const galleryKind=tag==='Game'?'game':'all',tagQuery=tag==='Game'?'':`&tag=${encodeURIComponent(tag)}`;
 const url=`https://api.geekdo.com/api/images?ajax=1&gallery=${galleryKind}&nosession=1&objectid=${id}&objecttype=thing&pageid=1&showcount=${count}&size=large&sort=${sort}${tagQuery}`;
 const res=await fetch(url,{headers:{'User-Agent':UA,Accept:'application/json'}});
 if(!res.ok)throw new Error(`gallery HTTP ${res.status}`);
 const data=await res.json();
 return (data.images??[]).map(i=>({imageid:i.imageid,caption:i.caption,recommend:i.numrecommend,uploader:i.user?.username,pageUrl:`https://boardgamegeek.com/image/${i.imageid}`,imageUrl:i.imageurl_lg}));
}
async function fetchOne(meta){if(!meta.gameId||!meta.imageUrl||!meta.pageUrl)throw new Error('gameId, pageUrl, imageUrl required');
 await mkdir(privateDir,{recursive:true,mode:0o700});await chmod(join(privateDir,'..'),0o700);await chmod(privateDir,0o700);
 const res=await fetch(meta.imageUrl,{headers:{'User-Agent':UA},redirect:'follow'});
 if(!res.ok)return {ok:false,reason:`HTTP ${res.status}`,imageUrl:meta.imageUrl};
 const buf=Buffer.from(await res.arrayBuffer()),kind=sniff(buf);
 if(!kind||!kind.width||!kind.height)return {ok:false,reason:'not a decodable JPEG/PNG/WebP',contentType:res.headers.get('content-type'),bytes:buf.length};
 const sha256=createHash('sha256').update(buf).digest('hex'),localPath=join(privateDir,`${sha256}.${kind.ext}`);
 const m=await load(),dup=m.images.find(i=>i.sha256===sha256);
 if(dup){if(!dup.alsoFor?.includes(meta.gameId)&&dup.gameId!==meta.gameId)(dup.alsoFor??=[]).push(meta.gameId);await save(m);return {ok:true,duplicate:true,sha256};}
 await writeFile(localPath,buf,{mode:0o600});
 const entry={gameId:meta.gameId,sha256,localPath,mime:kind.mime,bytes:buf.length,width:kind.width,height:kind.height,pageUrl:meta.pageUrl,imageUrl:meta.imageUrl,accessedAt:new Date().toISOString(),source:meta.source??null,sourceKind:meta.sourceKind??null,caption:meta.caption??null,uploader:meta.uploader??null,license:meta.license??'License/redistribution permission not verified; local private research only.',
  shotType:'unclassified',edition:null,editionCertainty:null,language:null,visible:{publicBoard:null,publicHoldings:null,privateHand:null,closeUp:null},readLimits:null,usable:null};
 m.images.push(entry);await save(m);
 return {ok:true,sha256,localPath,mime:kind.mime,width:kind.width,height:kind.height,bytes:buf.length,mode:((await stat(localPath)).mode&0o777).toString(8)};
}

if(cmd==='gallery')console.log(JSON.stringify(await gallery(...args),null,1));
else if(cmd==='fetch')console.log(JSON.stringify(await fetchOne(JSON.parse(args[0]))));
else if(cmd==='pick'){
 // pick <gameId> <bggId> <tag> <sort> <count> <imageid,imageid,...>
 const [gameId,bggId,tag,sort,count,ids]=args,list=await gallery(bggId,tag,count,sort);
 for(const id of ids.split(',')){const i=list.find(x=>String(x.imageid)===id);if(!i){console.log(JSON.stringify({id,ok:false,reason:'not in listing'}));continue;}
  const r=await fetchOne({gameId,pageUrl:i.pageUrl,imageUrl:i.imageUrl,caption:i.caption,uploader:i.uploader,source:'BoardGameGeek public image gallery',sourceKind:`community (BGG gallery tag=${tag||'all'})`});console.log(JSON.stringify({id,...r}));}
}else if(cmd==='autopick'){
 // autopick <gameId> <bggId> <n>: newest Play-tagged photos whose captions do not suggest custom/retheme/box/storage shots; falls back to untagged photos with play-like captions.
 const [gameId,bggId,n='2']=args,skip=/custom|personali[sz]ed|re-?theme|reskin|insert|3d.?print|organi[sz]er|storage|homemade|home.?made|pnp|print.?(and|&).?play|photoshop|mock|prototype|upgrade|sleeve|box|unbox|shrink|painted|paint|miniature|mini |token|meeple|playmat|neoprene|art|card list|rule|manual|cover|promo|kickstarter|pledge|dice tower|caja|bo[iî]te|schachtel|scatola|packag|contents|component/i;
 const m=await load(),seen=new Set(m.images.map(i=>i.pageUrl));
 let list=(await gallery(bggId,'Play','40','recent')).map(i=>({...i,fromTag:'Play'})).filter(i=>!skip.test(i.caption??'')&&!seen.has(i.pageUrl)),tag='Play';
 if(list.length<Number(n)){tag='all';list=[...list,...(await gallery(bggId,'','60','recent')).filter(i=>/play|game|turn|round|setup|set up|partida|partie|spiel|in progress|end/i.test(i.caption??'')&&!skip.test(i.caption??'')&&!seen.has(i.pageUrl)&&!list.some(x=>x.imageid===i.imageid)).map(i=>({...i,fromTag:'all'}))];}
 const out=[];for(const i of list.slice(0,Number(n))){const r=await fetchOne({gameId,pageUrl:i.pageUrl,imageUrl:i.imageUrl,caption:i.caption,uploader:i.uploader,source:'BoardGameGeek public image gallery',sourceKind:`community (BGG gallery tag=${i.fromTag??tag})`});out.push({imageid:i.imageid,caption:(i.caption??'').slice(0,60),...r});}
 const g=m.games[gameId];
 console.log(JSON.stringify({gameId,candidates:list.length,picked:out.map(o=>({id:o.imageid,ok:o.ok,dup:!!o.duplicate,sha:o.sha256?.slice(0,12),file:o.localPath?.split('/').pop(),w:o.width,h:o.height,cap:o.caption,reason:o.reason}))}));
}else if(cmd==='set'){
 const m=await load(),e=m.images.find(i=>i.sha256===args[0]);if(!e)throw new Error('unknown sha');
 const patch=JSON.parse(args[1]);Object.assign(e,patch,patch.visible?{visible:{...e.visible,...patch.visible}}:{});await save(m);console.log('ok');
}else if(cmd==='game'){
 const m=await load(),g=m.games[args[0]];if(!g)throw new Error('unknown gameId');
 const patch=JSON.parse(args[1]);if(patch.search){g.searches.push({...patch.search,at:new Date().toISOString()});delete patch.search;}Object.assign(g,patch);await save(m);console.log('ok');
}else if(cmd==='export'){
 const m=await load(),cols=['gameId','shotType','usable','retained','selected','localPath','visualReviewer','edition','editionCertainty','language','publicBoard','publicHoldings','privateHand','closeUp','readLimits','sourceKind','source','pageUrl','imageUrl','accessedAt','sha256','mime','bytes','width','height','license'];
 const esc=v=>{const s=v==null?'':String(v);return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;};
 const rows=m.images.map(i=>cols.map(c=>esc(c==='visualReviewer'?i.visualReview?.reviewer:c in i.visible?i.visible[c]:i[c])).join(','));
 await writeFile(join(here,'manifest.csv'),[cols.join(','),...rows].join('\n')+'\n');
 const coverage=Object.values(m.games).map(g=>{const imgs=m.images.filter(i=>i.gameId===g.gameId||i.alsoFor?.includes(g.gameId));return {gameId:g.gameId,status:g.status,bggId:g.bggId,physical:imgs.filter(i=>i.shotType?.startsWith('physical')).length,usable:imgs.filter(i=>i.retained&&(i.usable==='yes'||i.usable==='partial')).length,retained:imgs.filter(i=>i.retained).length,selected:imgs.filter(i=>i.selected).length,editionMatch:'unverified',groundTruthValidated:false,other:imgs.filter(i=>!i.shotType?.startsWith('physical')).length,missingReason:g.missingReason};});
 const totals=coverage.reduce((t,c)=>{t[c.status]=(t[c.status]??0)+1;return t;},{});
 await writeFile(join(here,'coverage.json'),JSON.stringify({games:coverage.length,totals,images:m.images.length,coverage},null,1)+'\n');
 console.log(JSON.stringify({games:coverage.length,totals,images:m.images.length}));
}else{console.error('commands: gallery fetch set game export');process.exit(1);}
