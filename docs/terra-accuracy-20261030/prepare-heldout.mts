// Phase 2: photos never sent to Terra. Per photo: base (named contract only) and improved (fill sentence + Lanczos upscale up to 2x within the documented high-detail 2048px / 2500-patch fit).
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {terraNamedFromGemini,applyFill,replaceImage,FILL_SENTENCE} from './lib.mts';
const root=path.dirname(new URL(import.meta.url).pathname),sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const R='/Users/jeonggyuju/Library/Application Support/KeepBoard/research/twenty-games-pack-study-20261029/',S=path.join(root,'../twenty-games-pack-study-20261029');
const scores=[...JSON.parse(await fs.readFile(path.join(S,'scores-sol1.json'),'utf8')).cases,...JSON.parse(await fs.readFile(path.join(S,'scores-sol2.json'),'utf8')).cases];
const games=['quacks','blokus','bohnanza','calico','carcassonne','cascadia','sagrada','splendor-duel','ticket-to-ride'];
const priv=await fs.mkdtemp('/private/tmp/kb-terra-acc-heldout-');await fs.chmod(priv,0o700);const calls=[],photos=[];
for(const g of games){
 const s=scores.find((x:any)=>x.gameId===g),reqPath=R+g+'.baseline.request.json',taskPath=R+g+'.baseline.task.json',wire=await fs.readFile(reqPath,'utf8');
 assert.equal(sha(wire),s.requestSHA??s.sourceHashes?.requestSHA,g+' gemini request drift');const taskSHA=sha(await fs.readFile(taskPath));assert.equal(taskSHA,s.taskSHA??s.sourceHashes?.taskSHA,g+' task drift');
 const gemini=JSON.parse(wire),img=gemini.contents[0].parts.find((x:any)=>x.inlineData).inlineData;
 const src=path.join(priv,g+'.source'),up=path.join(priv,g+'.improved.png');await fs.writeFile(src,Buffer.from(img.data,'base64'),{mode:0o600});
 const dims=execFileSync('python3',['-I','-c',`import sys,math;from PIL import Image;i=Image.open(sys.argv[1]);w,h=i.size
f=min(2.0,2048/max(w,h))
while math.ceil(w*f/32)*math.ceil(h*f/32)>2500:f-=0.01
f=max(f,1.0);i.convert('RGB').resize((round(w*f),round(h*f)),Image.LANCZOS).save(sys.argv[2]);print(w,h,round(f,2),round(w*f),round(h*f))`,src,up]).toString().trim().split(' ');await fs.chmod(up,0o600);
 const base=terraNamedFromGemini(gemini),improved=replaceImage(applyFill(base),'image/png',(await fs.readFile(up)).toString('base64'));
 photos.push({gameId:g,sourceSHA:sha(Buffer.from(img.data,'base64')),geminiRequestSHA:sha(wire),width:+dims[0],height:+dims[1],upscale:+dims[2],improvedSize:[+dims[3],+dims[4]],improvedSHA:sha(await fs.readFile(up))});
 for(const [v,body]of [['base',base],['improved',improved]] as const){const id=`${g}-${v}`,p=path.join(priv,id+'.request.json'),w=JSON.stringify(body);await fs.writeFile(p,w,{mode:0o600});calls.push({id,gameId:g,variant:v,requestPath:p,bodySHA:sha(w),taskPath,taskSHA});}
}
await fs.writeFile(path.join(root,'plan-heldout.json'),JSON.stringify({phase:'heldout',sample:'photos never sent to Terra; references frozen before any provider output (twenty-games-pack-study references-sol1/sol2)',privateDir:priv,maxCalls:18,peak:3,retries:0,calls,photos,
 referenceSHA:{sol1:sha(await fs.readFile(path.join(S,'references-sol1.json'))),sol2:sha(await fs.readFile(path.join(S,'references-sol2.json')))},
 deltas:{base:'Gemini baseline request -> Terra transport + terra-fix named-box contract only',improved:'base + fill sentence ('+FILL_SENTENCE+') + same photo resampled with Lanczos up to 2x, capped at 2048px side and 2500 32px patches (documented high-detail fit); factor 1.0 = no upscale'},preparedAt:new Date().toISOString()},null,2)+'\n');
console.log(JSON.stringify(photos.map(p=>[p.gameId,p.width,p.height,p.upscale])));
