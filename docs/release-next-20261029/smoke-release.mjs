// Application transport/persistence check only. No model jobs are submitted.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
const origin=process.argv[2];assert(/^https:\/\/keepboard-[a-z0-9-]+\.vercel\.app$/.test(origin));
const stage=(await readFile('/private/tmp/kb-release-stage-20261029','utf8')).trim();
const temp='/private/tmp/kb-release-smoke-20261029';await mkdir(temp,{recursive:true,mode:0o700});
const cli='/Users/jeonggyuju/.npm/_npx/67eb4586ca667318/node_modules/vercel/dist/index.js';
let revision;const endpoints=[];
async function call(route,body,method=body===undefined?'GET':'POST',raw=false){
 const key=randomUUID(),file=temp+'/'+key+'.response',args=[cli,'curl',route,'--deployment',origin,'--','-sS','-o',file,'-w','%{http_code}','-X',method];
 if(revision)args.push('-H','X-KeepBoard-Revision: '+revision);
 if(body!==undefined){const input=temp+'/'+key+'.request';await writeFile(input,JSON.stringify(body),{mode:0o600});args.push('-H','Content-Type: application/json','--data-binary','@'+input);}
 const result=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{cwd:stage,stdio:['ignore','pipe','pipe']});let out='';p.stdout.on('data',b=>out+=b);p.stderr.resume();p.on('close',code=>code?reject(Error('Application request failed')):resolve(out));});
 const status=Number(result.slice(-3));endpoints.push({route:route.replace(/\/sessions\/[^/]+/,'/sessions/:id'),method,status});assert(status>=200&&status<300,`HTTP ${status}`);
 const bytes=await readFile(file);if(raw)return bytes;const value=JSON.parse(bytes);if(value.session?.storageRevision)revision=value.session.storageRevision;return value;
}
const hash=b=>createHash('sha256').update(b).digest('hex'),report={at:new Date().toISOString(),origin,syntheticRecord:true,modelCalls:0,status:'STARTING'};
try{
 const mode=await call('/api/storage-mode');assert.equal(mode.provider,'supabase');
 const catalog=await call('/api/game-catalog');assert.equal(catalog.length,120);
 const made=await call('/api/sessions',{gamePackId:'catan-base',name:'릴리스 저장·재개 검사 · 테스트 기록',recordingMode:'simple'}),route='/api/sessions/'+made.session.id;report.sessionId=made.session.id;
 const bytes=await readFile('/private/tmp/kb-native-compare-source-20261029.jpg'),sha=hash(bytes);assert.equal(sha,'28ce72a474b4cd06f0995427a53a1c8ab815e0c3e3fa656143f91836c8254dbc');
 const meta={scope:'public',label:'저장·재개 검사 원본',expectedCaptureEpoch:made.session.captureEpoch},ticket=await call(route+'/upload-ticket',{...meta,contentType:'image/jpeg'});
 const upload=await fetch(ticket.signedUrl,{method:'PUT',headers:{'Content-Type':'image/jpeg','x-upsert':'false'},body:bytes,signal:AbortSignal.timeout(60000)});assert(upload.ok);
 const attached=await call(route+'/evidence',{...meta,uploadTicket:ticket.ticket}),id=attached.createdEvidenceId;
 const components=[{id:'unknown-road',kind:'road',variant:null,ownerId:null,quantity:null,location:{type:'edge',id:'r1c1.E'},region:null,evidenceId:id},{id:'observed-zero',kind:'road',variant:null,ownerId:null,quantity:0,location:{type:'edge',id:'r1c2.E'},region:null,evidenceId:id}];
 const edited=await call(route,{notes:{public:'릴리스 저장·재개 검사'},answers:[{field:'board.layout',value:{version:2,coverage:'partial',components}}]},'PATCH');
 const scene=s=>s.session.assertions.find(a=>a.field==='board.layout'&&a.status==='accepted').value;
 assert.deepEqual(scene(edited).components.map(c=>c.quantity),[null,0]);const sceneSHA=hash(Buffer.from(JSON.stringify(scene(edited))));
 assert.deepEqual((await call(route+'/analysis-jobs')).jobs,[]);
 await call(route+'/commit',{allowIncomplete:true,recordingMode:'simple'});await call(route+'/resume',{scope:'public'});const reopened=await call(route);
 assert.equal(hash(Buffer.from(JSON.stringify(scene(reopened)))),sceneSHA);assert.equal(reopened.session.notes.public,'릴리스 저장·재개 검사');assert.equal(reopened.session.snapshots.length,1);
 assert.equal(hash(await call(reopened.session.evidence[0].url,undefined,'GET',true)),sha);assert.deepEqual((await call(route+'/analysis-jobs')).jobs,[]);
 await call(route,undefined,'DELETE');
 Object.assign(report,{status:'PASS',provider:mode.provider,catalogGames:catalog.length,directUpload:true,saveWithoutCorrection:true,reopenedSceneExact:true,nullAndZeroPreserved:true,originalPhotoSHA:sha,notesPreserved:true,modelJobsSubmitted:0,ownTestRecordArchived:true,endpoints});
}catch(error){Object.assign(report,{status:'FAILED',error:error.message,endpoints});process.exitCode=1;}
await writeFile(new URL('./release-smoke.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,origin,modelCalls:0,saveReopen:report.reopenedSceneExact,nullAndZeroPreserved:report.nullAndZeroPreserved,error:report.error}));
