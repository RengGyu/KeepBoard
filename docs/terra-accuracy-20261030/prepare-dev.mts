// Phase 1 (development sample only): Quacks C crop. 3 variants x 2 identical repeats = 6 calls.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {applyFill,replaceImage,FILL_SENTENCE} from './lib.mts';
const root=path.dirname(new URL(import.meta.url).pathname),sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const named=JSON.parse(await fs.readFile(path.join(root,'../ten-games-closeup-20261029/terra-fix/named-preflight.json'),'utf8'));
const t=named.tasks.find((x:any)=>x.id==='quacks-C'),baseWire=await fs.readFile(t.prefix+'.request.json','utf8');assert.equal(sha(baseWire),t.bodySHA);
const priv=await fs.mkdtemp('/private/tmp/kb-terra-acc-dev-');await fs.chmod(priv,0o700);
const base=JSON.parse(baseWire),url=base.input[0].content[1].image_url,[head,data]=url.split(',');assert(head==='data:image/png;base64');
const src=path.join(priv,'quacks-C.source.png'),up=path.join(priv,'quacks-C.lanczos2x.png');await fs.writeFile(src,Buffer.from(data,'base64'),{mode:0o600});assert.equal(sha(await fs.readFile(src)),t.inputSHA);
execFileSync('python3',['-I','-c','import sys;from PIL import Image;i=Image.open(sys.argv[1]);i.resize((i.width*2,i.height*2),Image.LANCZOS).save(sys.argv[2],optimize=False)',src,up]);await fs.chmod(up,0o600);
const variants={base,fill:applyFill(base),'fill-up2':replaceImage(applyFill(base),'image/png',(await fs.readFile(up)).toString('base64'))};
const calls=[];
for(const [v,body]of Object.entries(variants))for(const r of [1,2]){const id=`quacks-C-${v}-r${r}`,p=path.join(priv,id+'.request.json'),wire=JSON.stringify(body);await fs.writeFile(p,wire,{mode:0o600});
 calls.push({id,variant:v,repeat:r,requestPath:p,bodySHA:sha(wire),taskPath:t.taskPath,taskSHA:t.taskSHA,inputSHA:v==='fill-up2'?sha(await fs.readFile(up)):t.inputSHA});}
assert.equal(calls[0].bodySHA,t.bodySHA,'base repeats the exact terra-fix named body');
const planPath=path.join(root,'plan-dev.json');
await fs.writeFile(planPath,JSON.stringify({phase:'dev-quacks-C',sample:'development (already-seen Quacks C crop); not validation',privateDir:priv,maxCalls:6,peak:3,retries:0,calls,
 deltas:{base:'exact terra-fix named-box body (variance repeat)',fill:'base + one sentence: '+FILL_SENTENCE,'fill-up2':'fill + same crop resampled 2x Lanczos (real photo pixels, no generation); probes patch resolution'},
 referenceSHA:'6b7dc26009f8859ea14d5a6fa93f798bc98a9e49fa746605722b2d8a2c4faa1f',preparedAt:new Date().toISOString()},null,2)+'\n');
console.log(JSON.stringify({calls:calls.length,priv,upscaledSHA:sha(await fs.readFile(up))}));
