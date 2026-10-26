// Isolated, single-request product smoke. Run only after the source and command are reviewed.
import {createHash,randomUUID} from 'node:crypto';
import {readFile,mkdir,open,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';

const args=process.argv.slice(2);
const option=(name:string)=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
const mode=option('--mode');
if(!['check','execute'].includes(mode??''))throw Error('Use --mode check or --mode execute');
const root=option('--data-dir');
if(!root||!path.isAbsolute(root)||root.includes('/.keepboard'))throw Error('Provide a new absolute private --data-dir');
const photo=option('--photo');
if(!photo||!path.isAbsolute(photo))throw Error('Provide the authorized source --photo');
const source=await readFile(photo),sourceSHA=createHash('sha256').update(source).digest('hex');
const expected='823226a0c1ff53585406e8f9681601d56a2ba2365fb1fc2f574b5b372f0838d6';
if(sourceSHA!==expected)throw Error('Source SHA mismatch; no request sent');
const keyFile=process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE;
if(!keyFile||!path.isAbsolute(keyFile))throw Error('Set KEEPBOARD_GEMINI_GAME_API_KEY_FILE to the existing supplied file path');
if(!(await stat(keyFile)).isFile())throw Error('Gemini credential path is not a regular file');
if(mode==='check'){
 console.log(JSON.stringify({mode,sourceSHA,sourceBytes:source.length,model:'gemini-3.8-flash',thinking:'LOW',media:'HIGH',outputLimit:32768,maxRequests:1,retries:0,plannedCostUnderUSD:0.20,providerCalls:0}));
 process.exit(0);
}

// Exclusive root and attempt claim are created before the only analysis POST.
await mkdir(root,{mode:0o700});
const claim=await open(path.join(root,'single-attempt.claim'),'wx',0o600);
await claim.writeFile(JSON.stringify({sourceSHA,claimedAt:new Date().toISOString(),maxRequests:1}));
await claim.close();
process.env.KEEPBOARD_DATA_DIR=root;
process.chdir(root); // server/index must not load the shared workspace's .env or .keepboard
const {createApp}=await import('../../server/index.ts');
const {Store}=await import('../../server/store.ts');
const {photoDefinition}=await import('../../server/photoDefinitions.ts');
const {catalogPacks}=await import('../../gamepacks/catalog.ts');
const pack=catalogPacks.find(p=>p.id==='catan-base');
if(!pack)throw Error('Catan pack unavailable');
const definition=photoDefinition(pack);
const app=await createApp({store:new Store(root),ui:false});
const server=app.listen(0,'127.0.0.1');
await new Promise<void>(resolve=>server.once('listening',resolve));
const base='http://127.0.0.1:'+(server.address() as {port:number}).port+'/api';
let revision:string|undefined;
async function call(route:string,body?:unknown,method=body?'POST':'GET'){
 const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const value=await response.json() as any;
 if(value.session?.storageRevision)revision=value.session.storageRevision;
 if(!response.ok)throw Error(`Product API ${route} returned ${response.status}`);
 return value;
}
const report:Record<string,unknown>={sourceSHA,definitionSHA:definition.definitionSHA,model:'gemini-3.8-flash',maxRequests:1,retries:0,analysisJobsStarted:0,providerCalls:'unknown until job completes'};
try{
 const created=await call('/sessions',{gamePackId:'catan-base',name:'isolated Gemini product smoke'}),p='/sessions/'+created.session.id;
 const road={id:'smoke-old-road',kind:'road',variant:null,ownerId:null,quantity:1,location:{type:'edge',id:'r1c1.E'},region:null,evidenceId:null};
 await call(p,{answers:[{field:'board.layout',value:{version:2,coverage:'partial',components:[road]}}]},'PATCH');
 const upload=await call(p+'/evidence',{scope:'public',dataUrl:'data:image/jpeg;base64,'+source.toString('base64')});
 const request={requestId:randomUUID(),evidenceIds:[upload.createdEvidenceId],expectedCaptureEpoch:upload.session.captureEpoch,scope:'public',reader:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'board'}};
 report.sessionId=created.session.id;report.evidenceId=upload.createdEvidenceId;report.captureEpoch=upload.session.captureEpoch;
 report.analysisJobsStarted=1; // no second POST even if HTTP/job fails
 const started=performance.now();
 await call(p+'/analysis-jobs',request);
 let job:any;
 for(let n=0;n<240;n++){
  const jobs=await call(p+'/analysis-jobs');job=jobs.jobs.find((j:any)=>j.requestId===request.requestId);
  if(job&&['completed','failed','interrupted'].includes(job.state))break;
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 report.jobState=job?.state??'timeout';report.jobElapsedMs=Math.round(performance.now()-started);
 if(job?.state!=='completed')throw Error('Analysis job did not complete');
 report.providerCalls=1;
 const view=await call(p),assertions=view.session.assertions as any[];
 const candidate=assertions.find(a=>a.status==='candidate'&&a.field==='board.layout');
 const baseline=assertions.find(a=>a.status==='accepted'&&a.field==='board.layout');
 report.candidateCount=assertions.filter(a=>a.status==='candidate').length;
 report.componentCount=candidate?.value?.components?.length??0;
 report.hostedReceipt=candidate?.observationReceipts?.some((r:any)=>r.reader?.kind==='gemini-game-observation-v1')??false;
 report.oldRoadPreserved=baseline?.value?.components?.some((c:any)=>c.id===road.id)??false;
 if(!candidate||!baseline||!report.hostedReceipt||!report.oldRoadPreserved)throw Error('Candidate, receipt, or old accepted road absent');
 const components=structuredClone(candidate.value.components) as any[];
 const corrected=components.find(c=>c.kind==='terrain'&&typeof c.variant==='string');
 if(!corrected)throw Error('No terrain value available for a synthetic manual correction');
 corrected.variant=corrected.variant==='forest'?'pasture':'forest';
 await call(p,{answers:[{field:'board.layout',value:{version:2,coverage:'partial',components:[road,...components]},observationReview:{version:'native-observation-review-v1',sourceAssertionId:candidate.id,expectedBaselineAssertionId:baseline.id}}]},'PATCH');
 await call(p+'/commit',{allowIncomplete:true});await call(p+'/resume',{scope:'public'});
 const reopened=await call(p),accepted=(reopened.session.assertions as any[]).find(a=>a.status==='accepted'&&a.field==='board.layout');
 report.savedReopened=!!accepted?.value?.components?.some((c:any)=>c.id===corrected.id&&c.variant===corrected.variant);
 report.oldRoadAfterReopen=!!accepted?.value?.components?.some((c:any)=>c.id===road.id);
 report.receiptAfterReopen=!!accepted?.observationReceipts?.some((r:any)=>r.reader?.kind==='gemini-game-observation-v1');
 report.syntheticCorrection='one terrain variant changed for isolated workflow verification';
}catch(error){report.error=error instanceof Error?error.message:'unknown error';}
finally{
 await writeFile(path.join(root,'smoke-summary.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
 server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));
 console.log(JSON.stringify(report));
}
if(report.error||!report.savedReopened||!report.oldRoadAfterReopen||!report.receiptAfterReopen)process.exitCode=1;
