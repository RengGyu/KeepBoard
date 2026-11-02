// Loopback product routes, isolated Store, immutable saved responses only. No API key or outbound provider fetch.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createApp} from '../../../server/index';import {Store} from '../../../server/store';import {TerraGameReader} from '../../../server/ai/terraGameReader';import {observationObjects} from '../../../server/scanObservation';
const evidence='docs/terra-ten-game-evaluation-20261030',out='docs/terra-quality-iteration-20261030/implementation',baseline=JSON.parse(await fs.readFile(out+'/baseline.json','utf8')),pre=JSON.parse(await fs.readFile(evidence+'/preflight.json','utf8')),selection=JSON.parse(await fs.readFile(evidence+'/selection.json','utf8')),sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
// Source delta is intentionally under test; frozen request/image/reference hashes remain pinned.
const privateOut=baseline.privateDir,stage=process.env.REPLAY_STAGE??'after';
const storeRoot=await fs.mkdtemp('/private/tmp/kb-terra-ten-http-');await fs.chmod(storeRoot,0o700);let mocks=0;const matchedBodies:any[]=[];
const reader=new TerraGameReader({key:async()=> 'synthetic-fixture',fetch:async(url,init)=>{
 assert.equal(String(url),'https://api.openai.com/v1/responses');const hash=sha(String(init!.body)),c=pre.calls.find((c:any)=>c.bodySHA===hash);assert(c,'Product body must match frozen request; no fallback');
 mocks++;matchedBodies.push({id:c.id,bodySHA:hash});const bytes=await fs.readFile(pre.privateDir+'/recovery.'+c.id+'.native.json');return Response.json(JSON.parse(bytes.toString()));
}});
const app=await createApp({store:new Store(storeRoot),terraReader:reader}),server=app.listen(0,'127.0.0.1');await new Promise<void>((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
const base='http://127.0.0.1:'+(server.address()as any).port;let revision:string|undefined;
const call=async(route:string,body?:unknown,method=body?'POST':'GET')=>{
 assert(base.startsWith('http://127.0.0.1:'));const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:body?JSON.stringify(body):undefined}),v=await r.json();assert(r.ok,route+' status '+r.status+' '+String(v.error??''));if(v.session?.storageRevision)revision=v.session.storageRevision;return v;
};
const accepted=(v:any)=>v.session.assertions.filter((a:any)=>a.status==='accepted'&&observationObjects(a.value).length);
const receiptContent=(as:any[])=>JSON.stringify(as.flatMap((a:any)=>a.observationReceipts??[]).map((r:any)=>({result:r.result,wire:r.hostedWire})));
const rows:any[]=[];let failure:string|null=null;
try{for(const c of selection.cases){
 revision=undefined;let v=await call('/sessions',{gamePackId:c.gameId,name:'saved-response evaluation',players:[{id:'evaluation-owner',name:'시험 참가자',color:'blue'}]});
 const p='/sessions/'+v.session.id,calls=pre.calls.filter((r:any)=>r.gameId===c.gameId),scope=c.ownerId?'player':'public',[x,y,X,Y]=c.roiPx,ids:string[]=[],before=mocks;
 for(const q of calls){v=await call(p+'/evidence',{scope,...(c.ownerId?{ownerId:c.ownerId}:{}),dataUrl:`data:${q.mimeType};base64,${(await fs.readFile(q.inputPath)).toString('base64')}`,width:q.width,height:q.height,...(q.variant==='roi'?{sourceEvidenceId:ids[0],sourceRegion:{x:x/c.width,y:y/c.height,width:(X-x)/c.width,height:(Y-y)/c.height}}:{})});ids.push(v.createdEvidenceId);}
 const task=JSON.parse(await fs.readFile(calls[0].taskPath,'utf8')),body={requestId:'saved-once',evidenceIds:ids,sameStaticState:true,expectedCaptureEpoch:v.session.captureEpoch,scope,...(c.ownerId?{ownerId:c.ownerId}:{}),reader:{kind:'terra-game-observation-v1',definitionSHA:task.scan.plan.definitionSHA,areaId:c.areaId}};
 const wait=async(id:string)=>{for(let n=0;n<500;n++){const job=(await call(p+'/analysis-jobs'+(c.ownerId?'?ownerId='+encodeURIComponent(c.ownerId):''))).jobs.find((j:any)=>j.id===id);if(job&&!['queued','running'].includes(job.state))return job;await new Promise(r=>setTimeout(r,10));}throw Error('Saved response job timeout');};
 const j=(await call(p+'/analysis-jobs',body)).job,done=await wait(j.id);assert.equal(done.state,'completed',c.gameId+' '+JSON.stringify(done));assert.equal(mocks-before,2);
 const beforeRedelivery=mocks;assert.equal((await call(p+'/analysis-jobs',body)).job.id,j.id);assert.equal(mocks,beforeRedelivery);
 v=await call(p);const initial=accepted(v),initialPieces=initial.flatMap((a:any)=>observationObjects(a.value)),raw=receiptContent(initial);assert(initialPieces.length>0);
 assert(initial.every((a:any)=>c.ownerId?a.ownerId===c.ownerId:!a.ownerId));
 await fs.writeFile(privateOut+'/'+stage+'.'+c.gameId+'.http-initial.json',JSON.stringify(v,null,2)+'\n',{mode:0o600});
 let manualNullZero=false;
 if(c.gameId==='scout'){
  const a=initial.find((a:any)=>a.value?.pieces?.some((p:any)=>p.componentId==='cards')),value=structuredClone(a.value),piece=value.pieces.find((p:any)=>p.componentId==='cards');
  piece.readout.values.bottomNumber=null;piece.readout.sources.bottomNumber=null;piece.quantity=0;
  await call(p,{answers:[{field:a.field,value,ownerId:c.ownerId}]},'PATCH');v=await call(p);const found=accepted(v).flatMap((a:any)=>observationObjects(a.value)).find((p:any)=>p.id===piece.id);assert.equal(found.quantity,0);assert.equal(found.readout.values.bottomNumber,null);manualNullZero=true;
 }
 await call(p+'/commit',{allowIncomplete:true,recordingMode:'simple'});v=await call(p);const stored=accepted(v),storedValues=stored.map((a:any)=>({field:a.field,ownerId:a.ownerId??null,value:a.value}));assert.equal(receiptContent(stored),raw);
 await call(p+'/resume',c.ownerId?{scope:'owner',ownerId:c.ownerId}:{scope:'public'});v=await call(p);const reopened=accepted(v);assert.deepEqual(reopened.map((a:any)=>({field:a.field,ownerId:a.ownerId??null,value:a.value})),storedValues);assert.equal(receiptContent(reopened),raw);
 assert.equal(v.session.evidence.length,2);assert(v.session.evidence.every((e:any)=>c.ownerId?e.scope==='player'&&e.ownerId===c.ownerId:e.scope==='public'&&!e.ownerId));
 const cropped=v.session.evidence.find((e:any)=>e.sourceRegion);assert(cropped&&v.session.evidence.some((e:any)=>e.id===cropped.sourceEvidenceId));
 await fs.writeFile(privateOut+'/'+stage+'.'+c.gameId+'.http-reopened.json',JSON.stringify(v,null,2)+'\n',{mode:0o600});
 rows.push({gameId:c.gameId,status:'passed',initialEditableObjects:initialPieces.length,savedReopenedObjects:reopened.flatMap((a:any)=>observationObjects(a.value)).length,receiptCount:stored.flatMap((a:any)=>a.observationReceipts??[]).length,rawAndWireUnchanged:true,exactFrozenProviderBodies:true,snapshotResumeValuesEqual:true,ownerScopePreserved:true,evidenceAndCropLinkPreserved:true,redeliveryAdditionalRequests:0,manualNullZero,privateInitialSHA:sha(await fs.readFile(privateOut+'/'+stage+'.'+c.gameId+'.http-initial.json')),privateReopenedSHA:sha(await fs.readFile(privateOut+'/'+stage+'.'+c.gameId+'.http-reopened.json'))});
 console.log(JSON.stringify({gameId:c.gameId,status:'passed',objects:initialPieces.length}));
}}catch(e){failure=e instanceof Error?e.message:String(e);console.error(failure);process.exitCode=1;}
finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await fs.writeFile(out+'/'+stage+'-http-replay.json',JSON.stringify({newProviderCalls:0,credentialsRead:false,network:'loopback only; provider dependency replaced with saved native Response',savedProviderMockResponses:mocks,matchedBodies,storeRoot,rows,failure,uiBrowserTest:false,productLatencyMeasured:false},null,2)+'\n');}
