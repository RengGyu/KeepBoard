// One production service operation, whole photo + four fixed manual crops.
// No model retries, no product edits, no changes to existing user records.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
const origin='https://keepboard-kappa.vercel.app',dir=new URL('./',import.meta.url);
const reportPath=new URL('result.json',dir),plan=JSON.parse(await readFile(new URL('input-plan.json',dir),'utf8'));
try{await readFile(reportPath);throw Error('Run already recorded; never issue another paid job automatically');}catch(e){if(e.code!=='ENOENT')throw e;}
const hash=b=>createHash('sha256').update(b).digest('hex');
const report={at:new Date().toISOString(),origin,serviceOperations:1,plannedModelRequests:5,retries:0,concurrency:2,state:'PREPARING',jobSubmitted:false,sourceSHA:plan.inputs[0].sha256};
let revision,route;
const persist=()=>writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
async function api(path,body,method=body===undefined?'GET':'POST',raw=false){
 const response=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
 const bytes=Buffer.from(await response.arrayBuffer());
 if(!response.ok)throw Error(`HTTP ${response.status} ${path.replace(/\/sessions\/[^/]+/,'/sessions/:id')}: ${bytes.toString('utf8').slice(0,250)}`);
 if(raw)return bytes;
 const value=JSON.parse(bytes);if(value.session?.storageRevision)revision=value.session.storageRevision;return value;
}
try{
 const mode=await api('/api/storage-mode');assert.equal(mode.provider,'supabase');
 const made=await api('/api/sessions',{gamePackId:'catan-base',name:'전체+부분 병렬 실측 · 자체 시험 기록',recordingMode:'simple',players:[{id:'p1',name:'시험1',color:'red'},{id:'p2',name:'시험2',color:'blue'}]});
 report.sessionId=made.session.id;route='/api/sessions/'+made.session.id;await persist();
 const ids=[],uploadStart=performance.now();
 for(const input of plan.inputs){
  const bytes=await readFile(input.path);assert.equal(hash(bytes),input.sha256);
  const meta={scope:'public',label:'병렬 시험 '+input.id,expectedCaptureEpoch:made.session.captureEpoch,width:input.width,height:input.height,...(input.sourceRegion?{sourceEvidenceId:ids[0],sourceRegion:input.sourceRegion}:{})};
  const ticket=await api(route+'/upload-ticket',{...meta,contentType:input.mimeType});
  const uploaded=await fetch(ticket.signedUrl,{method:'PUT',headers:{'Content-Type':input.mimeType,'x-upsert':'false'},body:bytes,signal:AbortSignal.timeout(60000)});assert(uploaded.ok,'Upload failed');
  const attached=await api(route+'/evidence',{...meta,uploadTicket:ticket.ticket});ids.push(attached.createdEvidenceId);
  console.log(JSON.stringify({phase:'uploaded',input:input.id,count:ids.length}));
 }
 report.uploadMs=performance.now()-uploadStart;report.evidenceIds=ids;
 const defs=JSON.parse(await readFile(new URL('../../game-photo-definitions/index.json',import.meta.url),'utf8')),definition=defs.games.find(d=>d.gameId==='catan');
 const body={requestId:randomUUID(),evidenceIds:ids,expectedCaptureEpoch:made.session.captureEpoch,scope:'public',sameStaticState:true,reader:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'board'}};
 report.state='SUBMITTING';report.jobSubmitted=true;await persist();
 const startedAt=performance.now(),started=await api(route+'/analysis-jobs',body);report.submitMs=performance.now()-startedAt;report.jobId=started.job.id;await persist();
 console.log(JSON.stringify({phase:'job-started',units:5,concurrency:2,jobId:report.jobId}));
 let job;
 for(let i=0;i<240;i++){
  job=(await api(route+'/analysis-jobs')).jobs.find(j=>j.id===report.jobId);assert(job);
  if(i%10===0)console.log(JSON.stringify({phase:'waiting',state:job.state,elapsedMs:Math.round(performance.now()-startedAt)}));
  if(!['queued','running'].includes(job.state))break;
  await new Promise(r=>setTimeout(r,2000));
 }
 report.clientReadMs=performance.now()-startedAt;report.jobState=job.state;report.timings=job.timings;report.scanBundle=job.scanBundle;await persist();
 assert.equal(job.state,'completed');
 const view=await api(route),assertion=view.session.assertions.find(a=>a.status==='accepted'&&a.field==='board.layout');assert(assertion);
 const receipts=assertion.observationReceipts??[],bundle=job.scanBundle??receipts.find(r=>r.scanBundle)?.scanBundle;assert(bundle);
 assert.equal(bundle.plan.units.length,5);assert.deepEqual(bundle.plan.units.map(u=>u.role),['anchor','crop','crop','crop','crop']);
 assert.equal(bundle.plan.anchorEvidenceId,ids[0]);
 const count=items=>Object.fromEntries([...new Set(items.map(o=>o.kind??o.componentId))].map(k=>[k,items.filter(o=>(o.kind??o.componentId)===k).length]));
 report.scanBundle=bundle;report.unitResults=receipts.map(r=>({unitId:r.scanUnitId,rows:r.result.observations.length,kinds:count(r.result.observations),transforms:r.transforms.length}));
 report.projectedRows=assertion.value.components.length;report.projectedKinds=count(assertion.value.components);
 report.linkSummary={total:bundle.links.length,multiView:bundle.links.filter(l=>l.members.length>1).length,linked:bundle.links.filter(l=>l.status==='linked').length,conflict:bundle.links.filter(l=>l.status==='conflict').length,unlinked:bundle.links.filter(l=>l.status==='unlinked').length};
 const privateDir='/private/tmp/kb-whole-detail-parallel-20261029';await mkdir(privateDir,{recursive:true,mode:0o700});
 await writeFile(privateDir+'/service-view.json',JSON.stringify(view),{mode:0o600});
 const sceneHash=hash(JSON.stringify(assertion.value)),receiptsHash=hash(JSON.stringify(receipts)),saveStart=performance.now();
 await api(route+'/commit',{allowIncomplete:true,recordingMode:'simple'});await api(route+'/resume',{scope:'public'});
 const reopened=await api(route),saved=reopened.session.assertions.find(a=>a.id===assertion.id);
 assert.equal(hash(JSON.stringify(saved.value)),sceneHash);assert.equal(hash(JSON.stringify(saved.observationReceipts)),receiptsHash);
 for(let i=0;i<ids.length;i++){const e=reopened.session.evidence.find(e=>e.id===ids[i]);assert.equal(hash(await api(e.url,undefined,'GET',true)),plan.inputs[i].sha256);}
 report.saveReopenMs=performance.now()-saveStart;report.saveReopenExact=true;report.allSourceBytesExact=true;
 report.state=bundle.units.every(u=>u.state==='completed')?'COMPLETED':'PARTIAL';
 report.actualCompletedUnits=bundle.units.filter(u=>u.state==='completed').length;
 await api(route,undefined,'DELETE');report.ownTestRecordArchived=true;await persist();
 console.log(JSON.stringify({phase:'done',state:report.state,clientReadMs:report.clientReadMs,timings:report.timings,projectedRows:report.projectedRows,projectedKinds:report.projectedKinds,unitResults:report.unitResults,linkSummary:report.linkSummary,saveReopenExact:true}));
}catch(e){report.state='FAILED';report.error=e.message;await persist();console.error(JSON.stringify({state:report.state,error:e.message,jobSubmitted:report.jobSubmitted}));process.exitCode=1;}
