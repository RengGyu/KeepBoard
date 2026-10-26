import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,symlink,readlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';import os from 'node:os';import net from 'node:net';import {randomUUID,createHash} from 'node:crypto';
const out=path.resolve('docs/cloud-deployment'),m=JSON.parse(await readFile(path.join(out,'manifest.json'),'utf8')),app=m.snapshot;
const data=await mkdtemp(path.join(os.tmpdir(),'keepboard-cloud-synthetic-'));
try{await symlink(path.resolve('node_modules'),path.join(app,'node_modules'),'dir');}catch(e){if(e.code!=='EEXIST')throw e;assert.equal(await readlink(path.join(app,'node_modules')),path.resolve('node_modules'));}
const port=async()=>{const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;};
const gp=await port(),ap=await port(),base=`http://127.0.0.1:${ap}`;
const config=JSON.parse(await readFile(path.join(app,'deploy/gateway.json'),'utf8'));config.port=gp;
const cf=path.join(data,'synthetic-gateway-config.json');await writeFile(cf,JSON.stringify(config));
const env={...process.env,NODE_ENV:'production',HOST:'127.0.0.1',PORT:String(ap),KEEPBOARD_DATA_DIR:data,AI_GATEWAY_CONFIG:cf};delete env.DEEPSEEK_API_KEY;delete env.KEEPBOARD_AI_GATEWAY_URL;
let child,log='';const checked=[];
async function stop(){if(!child||child.exitCode!==null)return;const c=child;c.kill('SIGTERM');await new Promise((resolve,reject)=>{const t=setTimeout(()=>{c.kill('SIGKILL');reject(Error('own synthetic process shutdown deadline'));},10000);c.once('exit',()=>{clearTimeout(t);resolve();});});child=undefined;}
async function start(synthetic=true){log='';const e={...env};if(synthetic)e.KEEPBOARD_SYNTHETIC_CHECK='1';else delete e.KEEPBOARD_SYNTHETIC_CHECK;
 child=spawn(process.execPath,['--import','tsx','deploy/cloud-launch.mjs'],{cwd:app,env:e,stdio:['ignore','pipe','pipe']});child.stdout.on('data',v=>log+=v);child.stderr.on('data',v=>log+=v);
 if(!synthetic){const code=await new Promise(r=>child.once('exit',r));assert.notEqual(code,0);assert.match(log,/DEEPSEEK_API_KEY must be registered/);child=undefined;return;}
 for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error('synthetic launch failed: '+log);try{if((await fetch(base+'/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('health deadline');
}
async function call(url,body,method=body===undefined?'GET':'POST',headers={}){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});const b=await r.json();return {status:r.status,body:b,headers:r.headers};}
try{
 await start(false);checked.push('production fails closed without privately registered credential');
 await start();const status=(await call('/api/settings')).body;assert.equal(status.provider,'gateway');assert.equal(status.model,'deepseek-flash');assert.equal(status.reasoningEffort,'high');assert.equal(status.baseUrl,`http://127.0.0.1:${gp}`);
 const packs=(await call('/api/game-catalog')).body;assert.equal(new Set(packs.map(x=>x.id)).size,120);assert.equal((await fetch(base+'/')).status,200);checked.push('production app/static and relocated loopback gateway expose 120 packs/high without key or upstream request');
 const v=(await call('/api/sessions',{gamePackId:'splendor',name:'synthetic cloud persistence',players:[{id:'p1',name:'합성',color:'blue'}]})).body,p='/api/sessions/'+v.session.id;
 assert.equal((await call(p,{notes:{public:'synthetic persisted note'}} ,'PATCH')).status,200);assert.equal((await call(p+'/commit',{allowIncomplete:true})).status,200);checked.push('synthetic manual session commit');
 const rv=(await call('/api/sessions',{gamePackId:'rummikub',name:'synthetic PIN persistence',players:[{id:'p1',name:'합성',color:'blue'}]})).body,rp='/api/sessions/'+rv.session.id;
 assert.equal((await call(rp+'/privacy/p1',{enabled:true,pin:'2468'},'PUT')).status,200);
 const token=(await call(rp+'/privacy/p1/unlock',{pin:'2468'})).body.token;assert.equal(typeof token,'string');
 const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA4kAAAAASUVORK5CYII=';
 const upload=await call(rp+'/evidence',{scope:'player',ownerId:'p1',dataUrl:image},'POST',{'X-KeepBoard-Private-Token':token});assert.equal(upload.status,200);
 const photo=upload.body.session.evidence[0],before=await fetch(base+photo.url,{headers:{'X-KeepBoard-Private-Token':token}});assert.equal(before.status,200);const bytes=Buffer.from(await before.arrayBuffer());assert.equal((await fetch(base+photo.url)).status,403);checked.push('synthetic PIN guard and uploaded image bytes');
 const origin={'Origin':'https://keepboard-kappa.vercel.app','X-Forwarded-Host':'keepboard-kappa.vercel.app','X-Forwarded-Proto':'https'};
 const device=await call('/api/rooms/device',{},'POST',origin);assert.equal(device.status,200);const cookie=device.headers.get('set-cookie').split(';')[0];
 const room=await call('/api/rooms',{gamePackId:'splendor',capacity:2,me:{name:'합성 방장',color:'#3978bd'},clientRequestId:randomUUID()},'POST',{...origin,Cookie:cookie});assert.equal(room.status,201);checked.push('forwarded same-origin headers and synthetic room creation');
 await stop();const pinsBefore=await readFile(path.join(data,'private-pins.json'));
 const jobId=randomUUID(),now=new Date().toISOString();await mkdir(path.join(data,'analysis-jobs'),{recursive:true});await writeFile(path.join(data,'analysis-jobs',jobId+'.json'),JSON.stringify({id:jobId,sessionId:v.session.id,evidenceIds:[],captureEpoch:v.session.captureEpoch,state:'queued',createdAt:now,updatedAt:now,requestId:'synthetic-recovery-only',signature:'synthetic'}));
 await start();const resumed=(await call(p+'/resume',{scope:'public'})).body;assert.equal(resumed.session.notes.public,'synthetic persisted note');assert.equal(resumed.session.turnInstanceId,v.session.turnInstanceId);assert.equal((await call(p+'/export')).status,200);checked.push('same mounted Store survives complete launcher restart; snapshot/turn/export preserved');
 const jobs=(await call(p+'/analysis-jobs')).body.jobs;assert.equal(jobs.find(j=>j.id===jobId)?.state,'interrupted');checked.push('queued synthetic recovery is interrupted without upstream replay');
 assert.deepEqual(await readFile(path.join(data,'private-pins.json')),pinsBefore);assert.equal((await fetch(base+photo.url,{headers:{'X-KeepBoard-Private-Token':token}})).status,403);
 const newToken=(await call(rp+'/privacy/p1/unlock',{pin:'2468'})).body.token;const after=await fetch(base+photo.url,{headers:{'X-KeepBoard-Private-Token':newToken}});assert.equal(after.status,200);assert.deepEqual(Buffer.from(await after.arrayBuffer()),bytes);checked.push('PIN record/image bytes preserved; old unlock token expires and re-unlock works');
 assert.equal((await call('/api/sessions/'+room.body.session.id,undefined,'GET',{...origin,Cookie:cookie})).status,200);assert.equal((await call('/api/sessions/'+room.body.session.id)).status,403);checked.push('room membership survives restart; unaffiliated access remains forbidden');
 await stop();const result={at:new Date().toISOString(),status:'PASS_LOCAL_SYNTHETIC',groups:checked.length,checked,parentSourceDigest:m.parentSourceDigest,runtimeDigest:m.runtimeDigest,node:process.version,ports:{app:ap,gateway:gp},Store:'fresh synthetic temporary directory only',upstreamRequests:0,realAIcalls:0,operatingStoreReads:0,operatingMutations:0,cloudResourcesCreated:0,DockerBuildVerified:false,LinuxSystemdNginxTLSVerified:false,temporaryProcessStopped:true};await writeFile(path.join(out,'synthetic-verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await stop();}
