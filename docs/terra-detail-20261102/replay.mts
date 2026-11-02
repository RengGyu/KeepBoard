// Local HTTP save/resume verification with recorded provider responses; no keys or paid calls.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createApp} from '../../server/index';import {Store} from '../../server/store';import {TerraGameReader} from '../../server/ai/terraGameReader';import {observationObjects} from '../../server/scanObservation';
const out='docs/terra-detail-20261102',priv='/private/tmp/kb-terra-detail-20261102',sha=(x:Buffer|string)=>createHash('sha256').update(x).digest('hex');
const calls:any[]=[],executions:any[]=[];for(const batch of ['regression','holdout','default-replay']){try{calls.push(...JSON.parse(await fs.readFile(`${out}/${batch}-preflight.json`,'utf8')).calls);executions.push(...JSON.parse(await fs.readFile(`${out}/${batch}-execution.json`,'utf8')).rows);}catch{}}
const rows:any[]=[];let mocks=0;
for(const condition of ['legacy','detail','default-replay']){
 const chosen=calls.filter(c=>c.condition===condition&&executions.some(e=>e.id===c.id&&e.state==='completed'));if(!chosen.length)continue;
 const storeRoot=await fs.mkdtemp(priv+'/store-'+condition+'-');const reader=new TerraGameReader({profile:chosen[0].profile,key:async()=> 'synthetic-not-a-key',fetch:async(_url,init)=>{const h=sha(String(init?.body)),c=chosen.find(c=>c.bodySHA===h);assert(c,'HTTP replay body drift');mocks++;return Response.json(JSON.parse(await fs.readFile(priv+'/'+c.id+'.native.json','utf8')));}});
 const app=await createApp({store:new Store(storeRoot),terraReader:reader}),server=app.listen(0,'127.0.0.1');await new Promise<void>((r,j)=>{server.once('listening',r);server.once('error',j);});const base='http://127.0.0.1:'+(server.address() as any).port;let revision:string|undefined;
 async function call(route:string,body?:unknown,method=body?'POST':'GET'){const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:body?JSON.stringify(body):undefined});const d=await r.json();assert(r.ok,route+' '+r.status+' '+String(d.error??''));if(d.session?.storageRevision)revision=d.session.storageRevision;return d;}
 const accepted=(v:any)=>v.session.assertions.filter((a:any)=>a.status==='accepted'&&observationObjects(a.value).length);
 const semantic=(a:any[])=>a.map(x=>({field:x.field,ownerId:x.ownerId??null,value:x.value}));
 const receipts=(a:any[])=>JSON.stringify(a.flatMap(x=>x.observationReceipts??[]).map(x=>({result:x.result,hostedWire:x.hostedWire})));
 try{for(const c of chosen){const row:any={id:c.id,state:'started'};rows.push(row);try{
 revision=undefined;let v=await call('/sessions',{gamePackId:c.gameId,name:'isolated new-photo replay',players:[{id:'evaluation-owner',name:'시험 참가자',color:'blue'}]});const p='/sessions/'+v.session.id,task=JSON.parse(await fs.readFile(priv+'/'+c.caseId+'.task.json','utf8'));
 const source=[...JSON.parse(await fs.readFile('docs/terra-ten-new-20261102/root/cases.json','utf8')),...await fs.readFile('docs/terra-ten-new-20261102/worker/cases.json','utf8').then(JSON.parse).catch(()=>[]),...await fs.readFile(out+'/holdout/cases.json','utf8').then(JSON.parse).catch(()=>[])].find(x=>x.id===c.caseId);
 const owner=task.request.scope.ownerId,scope=owner?'player':'public';v=await call(p+'/evidence',{scope,...(owner?{ownerId:owner}:{}),dataUrl:'data:image/jpeg;base64,'+(await fs.readFile(source.path)).toString('base64'),width:c.width,height:c.height});const eid=v.createdEvidenceId,before=mocks;
 const request={requestId:'saved-response-once',evidenceIds:[eid],sameStaticState:true,expectedCaptureEpoch:v.session.captureEpoch,scope,...(owner?{ownerId:owner}:{}),reader:{kind:'terra-game-observation-v1',definitionSHA:c.definitionSHA,areaId:c.areaId}};
 const job=(await call(p+'/analysis-jobs',request)).job;let done:any;for(let n=0;n<500;n++){done=(await call(p+'/analysis-jobs'+(owner?'?ownerId='+owner:''))).jobs.find((j:any)=>j.id===job.id);if(done&&!['queued','running'].includes(done.state))break;await new Promise(r=>setTimeout(r,10));}
 assert.equal(done.state,'completed',JSON.stringify(done));assert.equal(mocks-before,1);v=await call(p);const initial=accepted(v),values=semantic(initial),raw=receipts(initial);row.questionsBeforeSave=v.questions.map((q:any)=>({field:q.field,acquisition:q.acquisition}));row.readyBeforeSave=v.ready;row.stageBeforeSave=v.session.stage;row.editableObjects=initial.flatMap((a:any)=>observationObjects(a.value)).length;assert(row.editableObjects>0);
 await call(p+'/commit',{allowIncomplete:true,recordingMode:'simple'});v=await call(p);assert.deepEqual(semantic(accepted(v)),values);assert.equal(receipts(accepted(v)),raw);
 await call(p+'/resume',owner?{scope:'owner',ownerId:owner}:{scope:'public'});v=await call(p);assert.deepEqual(semantic(accepted(v)),values);assert.equal(receipts(accepted(v)),raw);
 await fs.writeFile(priv+'/'+c.id+'.reopened.json',JSON.stringify(v),{mode:0o600});row.state='passed';row.rawAndWirePreserved=true;row.valuesPreserved=true;row.exactFrozenRequest=true;
 }catch(e:any){row.state='failed';row.error=e.message;}console.log(JSON.stringify(row));}}
 finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}
await fs.writeFile(out+'/save-resume.json',JSON.stringify({newProviderCalls:0,credentialsRead:false,network:'localhost only; provider replaced with frozen saved response',mocks,rows},null,2)+'\n');
