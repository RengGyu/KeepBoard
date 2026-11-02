// One ordinary application read, then save/reopen. Run once per condition.
// No provider retry, user-record edit, secret output, or global cleanup.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
const [condition,origin]=process.argv.slice(2);
assert(['baseline','candidate'].includes(condition)&&/^https:\/\/keepboard-[a-z0-9-]+\.vercel\.app$/.test(origin));
const dir=new URL('./',import.meta.url),reportPath=new URL(`live-${condition}.json`,dir);
try{await readFile(reportPath);throw Error('Condition already recorded; do not repeat a model request');}catch(e){if(e.code!=='ENOENT')throw e;}
const imagePath='/private/tmp/kb-native-compare-source-20261029.jpg',sourceSHA='28ce72a474b4cd06f0995427a53a1c8ab815e0c3e3fa656143f91836c8254dbc';
const digest=b=>createHash('sha256').update(b).digest('hex');
let revision,sessionId,jobId,modelRequests=0,transport='fetch';const endpoints=[];
async function api(route,body,method=body===undefined?'GET':'POST',raw=false){
 const headers={'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})};
 let response=await fetch(origin+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60000)}),status=response.status,bytes=Buffer.from(await response.arrayBuffer());
 if(status===401){
  transport='vercel-curl';const stage=(await readFile('/private/tmp/kb-release-stage-20261029','utf8')).trim();
  const temp='/private/tmp/kb-native-http-20261029';await mkdir(temp,{recursive:true,mode:0o700});
  const key=randomUUID(),out=temp+'/'+key+'.response',args=['/Users/jeonggyuju/.npm/_npx/67eb4586ca667318/node_modules/vercel/dist/index.js','curl',route,'--deployment',origin,'--','-sS','-o',out,'-w','%{http_code}','-X',method];
  for(const [key,value] of Object.entries(headers))args.push('-H',key+': '+value);
  if(body!==undefined){const input=temp+'/'+key+'.request';await writeFile(input,JSON.stringify(body),{mode:0o600});args.push('--data-binary','@'+input);}
  const result=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{cwd:stage,stdio:['ignore','pipe','pipe']});let result='';p.stdout.on('data',b=>result+=b);p.stderr.resume();p.on('close',code=>code?reject(Error('Authenticated application request failed')):resolve(result));});
  status=Number(result.slice(-3));bytes=await readFile(out);
 }
 endpoints.push({route:route.replace(/\/sessions\/[^/]+/,'/sessions/:id'),method,status});
 if(status<200||status>=300)throw Error(`Application HTTP ${status} on ${route.replace(/\/sessions\/[^/]+/,'/sessions/:id')}`);
 if(raw)return bytes;
 const value=JSON.parse(bytes);if(value.session?.storageRevision)revision=value.session.storageRevision;return value;
}
const report={condition,origin,at:new Date().toISOString(),sourceSHA,syntheticRecord:true,allowedReadCalls:1,retries:0,modelRequestsIssued:0,status:'STARTING'};
try{
 let bytes;
 try{bytes=await readFile(imagePath);}catch(e){
  if(condition!=='baseline'||e.code!=='ENOENT')throw e;
  const recovered=await api('/api/sessions/469bea87-2d64-4162-85ad-0bcd4bcc8bf7');
  const photo=recovered.session.evidence.find(e=>e.scope==='public'&&!e.ownerId);assert(photo);
  bytes=await api(photo.url,undefined,'GET',true);assert.equal(digest(bytes),sourceSHA);
  await writeFile(imagePath,bytes,{mode:0o600});revision=undefined;
 }
 assert.equal(digest(bytes),sourceSHA);
 const mode=await api('/api/storage-mode');assert.equal(mode.provider,'supabase');
 const made=await api('/api/sessions',{gamePackId:'catan-base',name:`성능·저장 확인 ${condition} · 테스트 기록`,recordingMode:'simple',players:[{id:'p1',name:'테스트1',color:'red'},{id:'p2',name:'테스트2',color:'blue'}]});
 sessionId=made.session.id;report.sessionId=sessionId;const route='/api/sessions/'+sessionId;
 const meta={scope:'public',label:'동일 원본 판독 비교 · 테스트',expectedCaptureEpoch:made.session.captureEpoch};
 const ticket=await api(route+'/upload-ticket',{...meta,contentType:'image/jpeg'});
 const upload=await fetch(ticket.signedUrl,{method:'PUT',headers:{'Content-Type':'image/jpeg','x-upsert':'false'},body:bytes,signal:AbortSignal.timeout(60000)});assert(upload.ok);
 const attached=await api(route+'/evidence',{...meta,uploadTicket:ticket.ticket});
 assert.equal(attached.session.evidence.length,1);const evidenceId=attached.createdEvidenceId;
 const defs=JSON.parse(await readFile(new URL('../../game-photo-definitions/index.json',import.meta.url),'utf8')),definition=defs.games.find(d=>d.gameId==='catan');
 report.modelRequestsIssued=++modelRequests;report.status='READ_ISSUED';
 await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
 const started=await api(route+'/analysis-jobs',{requestId:randomUUID(),evidenceIds:[evidenceId],expectedCaptureEpoch:attached.session.captureEpoch,scope:'public',reader:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'board'}});
 jobId=started.job.id;report.jobId=jobId;let job;
 for(let i=0;i<100;i++){
  job=(await api(route+'/analysis-jobs')).jobs.find(j=>j.id===jobId);assert(job);
  if(!['queued','running'].includes(job.state))break;
  await new Promise(r=>setTimeout(r,2000));
 }
 report.jobState=job.state;report.timings=job.timings;assert.equal(job.state,'completed');
 const view=await api(route),assertion=view.session.assertions.find(a=>a.status==='accepted'&&a.field==='board.layout');assert(assertion);
 const objects=assertion.value.components;report.objects=objects.length;
 report.kinds=Object.fromEntries([...new Set(objects.map(o=>o.kind))].map(k=>[k,objects.filter(o=>o.kind===k).length]));
 report.unplaced=objects.filter(o=>o.location?.type==='unplaced'||!o.location?.id).length;
 report.receipts=assertion.observationReceipts?.length??0;assert(report.receipts>0);
 const sceneHash=digest(Buffer.from(JSON.stringify(assertion.value))),rawHash=digest(Buffer.from(JSON.stringify(assertion.observationReceipts)));
 await api(route+'/commit',{allowIncomplete:true,recordingMode:'simple'});
 await api(route+'/resume',{scope:'public'});
 const reopened=await api(route),saved=reopened.session.assertions.find(a=>a.status==='accepted'&&a.field==='board.layout');
 assert.equal(digest(Buffer.from(JSON.stringify(saved.value))),sceneHash);assert.equal(digest(Buffer.from(JSON.stringify(saved.observationReceipts))),rawHash);
 assert.equal(digest(await api(reopened.session.evidence[0].url,undefined,'GET',true)),sourceSHA);
 report.saveWithoutCorrection=true;report.reopenedSceneAndReceiptsExact=true;report.originalBytesExact=true;
 // Keep the candidate record for browser checks; archive only our baseline record.
 if(condition==='baseline'){await api(route,undefined,'DELETE');report.ownTestRecordArchived=true;}
 report.status='PASS';report.transport=transport;report.endpoints=endpoints;
 await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({condition,status:report.status,jobState:report.jobState,timings:report.timings,objects:report.objects,kinds:report.kinds,saveAndReopenExact:true,modelRequests}));
}catch(error){
 report.status='FAILED';report.error=error.message;report.modelRequestsIssued=modelRequests;report.jobId=jobId;report.transport=transport;report.endpoints=endpoints;
 await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.error(JSON.stringify({condition,status:'FAILED',error:error.message,modelRequests}));process.exitCode=1;
}
