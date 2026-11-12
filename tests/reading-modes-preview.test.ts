import test from 'node:test';import assert from 'node:assert/strict';
import {prepareHostedObservation} from '../server/hostedObservation';
import {buildTerraGameBody,TERRA_HIGH_IDENTITY,decodeTerraGameObservation} from '../server/ai/terraGameReader';
import {buildGeminiGameBody} from '../server/ai/geminiGameReader';
import {compactTerraKinds} from '../server/ai/terraCompact';
import {fixture} from './fixtures/spatial/builders';
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=','base64');
async function prepared(game='sagrada',mode?:string){const f=fixture(game,game==='hanabi'?'fireworks':'window');const reader:any={identity:TERRA_HIGH_IDENTITY,status:async()=>({available:true})};const p=await prepareHostedObservation({pack:f.pack,selection:{kind:reader.identity.kind,definitionSHA:f.definition.definitionSHA,areaId:f.request.areaId,...(mode?{readMode:mode}:{})},taskId:'mode-test',captureEpoch:'e',evidence:[{id:'photo',url:'/mock',kind:'photo',scope:'public',captureEpoch:'e',capturedAt:'now',label:''}],reader,cloud:false,readImage:async()=>({data:bytes,mimeType:'image/png'})}as any);return {...f,...p};}
test('explicit values/cells/boxes omit exactly the requested geometry; mode absence retains legacy body',async()=>{
 for(const mode of ['values','cells','boxes']){
  const p=await prepared('sagrada',mode),body=buildTerraGameBody(p.request,p.definition,bytes,'image/png',TERRA_HIGH_IDENTITY.adapterVersion,{},TERRA_HIGH_IDENTITY),schema=body.text.format.schema as any;
  assert.equal((p.request as any).readMode,mode);assert.equal(Object.hasOwn(schema.properties.items.items.properties,'b'),mode==='boxes');assert.equal(Object.hasOwn(schema.properties,'spatial'),mode==='cells');
  const kind=compactTerraKinds(p.request,p.definition,'literal-compact-visible-instance-v7').find(k=>k.id==='dice')!;
  const payload={v:3,items:[{k:kind.k,...(mode==='boxes'?{b:[100,100,200,200]}:{}),f:'f',q:1,u:'s',a:[],x:kind.properties.map(p=>p.p)}],...(mode==='cells'?{spatial:{version:'spatial-observation-v1',boardInstances:[],placements:[]}}:{})};
  const native={status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text:JSON.stringify(payload)}]}]};
  const result=decodeTerraGameObservation(native,p.request,p.definition,[],TERRA_HIGH_IDENTITY.adapterVersion);assert.equal(result.raw.observations.length,1);assert.equal(result.raw.observations[0].bbox===null,mode!=='boxes');
  const gemini=buildGeminiGameBody(p.request,p.definition,bytes,'image/png');assert.equal(Object.hasOwn(gemini.generationConfig.responseFormat.text.schema.properties.items.items.properties,'box_1000'),mode==='boxes');
 }
 const legacy=await prepared(),again=await prepared();assert.equal((legacy.request as any).readMode,undefined);assert.deepEqual(buildTerraGameBody(legacy.request,legacy.definition,bytes,'image/png'),buildTerraGameBody(again.request,again.definition,bytes,'image/png'));
});
test('a free/named-area game cannot silently receive a fixed cell grid',async()=>{await assert.rejects(prepared('hanabi','cells'),/칸|template|cell/i);});

import {LunaGameReader} from '../server/ai/terraGameReader';
import {createApp} from './fixtures/drawingTestApp';
import {Store} from '../server/store';
import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {spatialDiagnostics} from '../shared/spatialDiagnostics';
import {board,placement} from './fixtures/spatial/builders';
import {assembleObservations} from '../server/ai/observationAssembly';
const encode=(event:any)=>new TextEncoder().encode('data: '+JSON.stringify(event)+'\n\n');
for(const interrupted of [false,true])test(`staged real reader→HTTP preview precedes final writes; interrupted=${interrupted}`,async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-preview-'));let release=()=>{},request:any,definition:any;
 const barrier=new Promise<void>(r=>release=r);let started=()=>{};const prefixSent=new Promise<void>(r=>started=r);
 const reader=new class extends LunaGameReader{override async read(r:any,d:any,...args:any[]){request=r;definition=d;return super.read(r,d,...args as [Buffer,string,any,any]);}}({identity:{...TERRA_HIGH_IDENTITY,automaticRetries:0},key:async()=>'mock',fetch:async()=>{
  const k=compactTerraKinds(request,definition,'literal-compact-visible-instance-v7').find(k=>k.id==='development')!,p=k.properties.find(p=>p.id==='points')!;
  const payload={v:3,items:[{k:k.k,b:[100,100,200,200],f:'f',q:1,u:'s',a:[{p:p.p,v:'0'}],x:k.properties.filter(v=>v.id!=='points').map(v=>v.p)}]};
  const text=JSON.stringify(payload),prefix=text.slice(0,-2);
  return new Response(new ReadableStream({async start(c){c.enqueue(encode({type:'response.output_text.delta',delta:prefix}));started();await barrier;if(interrupted)c.error(Error('fixture disconnect'));else{c.enqueue(encode({type:'response.output_text.delta',delta:']}'}));c.enqueue(encode({type:'response.completed',response:{model:TERRA_HIGH_IDENTITY.model,status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text}]}]}}));c.close();}}}),{headers:{'Content-Type':'text/event-stream'}});
 }});
 const store=new Store(root),app=await createApp({store,terraHighReader:reader}),server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const origin='http://127.0.0.1:'+(server.address()as any).port;
 const call=async(p:string,b?:any)=>{const r=await fetch(origin+'/api'+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});return {status:r.status,v:await r.json()};};
 try{
  const c=await call('/sessions',{gamePackId:'splendor',recordingMode:'simple'}),p='/sessions/'+c.v.session.id,u=await call(p+'/evidence',{dataUrl:'data:image/png;base64,'+bytes.toString('base64'),scope:'public'});
  assert(u.v.uploadTimings.photoSavedAt>=u.v.uploadTimings.uploadRouteReceivedAt);
  const f=fixture('splendor','market'),reading={reader:{kind:reader.identity.kind,definitionSHA:f.definition.definitionSHA,areaId:'market',readMode:'boxes'},evidenceIds:[u.v.createdEvidenceId]},s=await call(p+'/commit',{allowIncomplete:true,reading}),j=await call(p+'/analysis-jobs',{...reading,saveIntentId:s.v.saveIntentId,requestId:'preview',expectedCaptureEpoch:s.v.session.captureEpoch,scope:'public'});assert.equal(j.status,202);
  await prefixSent;let progress:any;for(let i=0;i<100;i++){progress=(await call(p+'/analysis-jobs/'+j.v.job.id+'/progress?thin=1')).v;if(progress.units[0].preview)break;await new Promise(r=>setTimeout(r,5));}
  const unit=progress.units[0];assert.equal(unit.preview.observations[0].properties.points.value,0);assert.equal(unit.preview.provisional,true);assert.equal(unit.preview.evidenceId,u.v.createdEvidenceId);assert.equal(unit.preview.captureEpoch,s.v.session.captureEpoch);assert.equal(unit.state,'running');assert(unit.timings.firstReadableItemAt>=unit.timings.firstTextDeltaAt);
  assert.equal((await call(p)).v.session.assertions.filter((a:any)=>a.observationReceipts?.length).length,0);
  // Source and mode are save-intent pins; reusing that intent for another mode cannot dispatch.
  assert.notEqual((await call(p+'/analysis-jobs',{...reading,reader:{...reading.reader,readMode:'values'},saveIntentId:s.v.saveIntentId,requestId:'preview-other',expectedCaptureEpoch:s.v.session.captureEpoch,scope:'public'})).status,202);
  release();let job:any;for(let i=0;i<100;i++){job=(await call(p+'/analysis-jobs')).v.jobs.find((x:any)=>x.id===j.v.job.id);if(!['running','queued'].includes(job.state))break;await new Promise(r=>setTimeout(r,5));}
  const final=(await call(p)).v.session;
  assert.equal(job.state,interrupted?'failed':'completed');assert(job.timings.queueMs>=0);assert(job.timings.jobDoneAt>=job.timings.jobStartedAt);assert(job.observationReceipts[0].hostedWire.providerResponse);assert.equal(job.observationReceipts[0].result.observations[0].properties.points.value,0);
  assert.equal(final.snapshots.filter((s:any)=>s.analysisJobId===job.id).length,interrupted?0:1);
  if(interrupted){assert.equal(final.assertions.filter((a:any)=>a.observationReceipts?.length).length,0);assert.equal(job.observationReceipts[0].result.completion,'truncated');assert((await call(p+'/analysis-jobs/'+job.id+'/progress?thin=1')).v.units[0].preview);}
  else{const a=final.assertions.find((a:any)=>a.observationReceipts?.length);assert.equal(a.value.pieces[0].readout.points,0);const resumed=await call(p+'/resume',{scope:'public'});assert.deepEqual(resumed.v.session.assertions.find((v:any)=>v.id===a.id)?.value,a.value);}
 }finally{release();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:20});}
});

test('cell-only valid placement projects without a literal box; diagnostics de-duplicate aliases/covered cells',async()=>{
 const p=await prepared('sagrada','cells'),k=compactTerraKinds(p.request,p.definition,'literal-compact-visible-instance-v7').find(k=>k.id==='dice')!,a=p.request.spatial!.frames[0].areas.find(a=>a.acceptedComponents.includes('dice'))!,cell=a.addresses[0];
 const payload={v:3,items:[{k:k.k,f:'f',q:1,u:'s',a:[],x:k.properties.map(v=>v.p)}],spatial:{version:'spatial-observation-v1',boardInstances:[board(p.request,a.id)],placements:[placement(a.id,cell.slotId)]}};
 const native={status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text:JSON.stringify(payload)}]}]},decoded=decodeTerraGameObservation(native,p.request,p.definition,[],TERRA_HIGH_IDENTITY.adapterVersion),result=assembleObservations({request:p.request,result:decoded.raw,pack:p.pack,definition:p.definition,reader:TERRA_HIGH_IDENTITY,turnInstanceId:'t',hostedWire:decoded.hostedWire});
 const receipts=result.observationReceipts!,d=spatialDiagnostics([...receipts,...receipts]);assert.equal(d.total,1);assert.equal(d.placed,1);assert.equal(d.normalized,1);assert.equal(d.rejected,0);assert.equal(decoded.raw.observations[0].bbox,null);assert(result.assertions.some(a=>(a.value as any)?.pieces?.some((v:any)=>v.spatial?.resolved?.anchor?.address===cell.address)));
});

test('preview sidecar preserves false/0, rejects owner/epoch substitution, stale clears preview and terminal cannot be overwritten',async()=>{
 const {jobProgress,updateUnitProgress,patchProgress}=await import('../server/jobProgress'),doc=jobProgress({id:'j',sessionId:'s',ownerId:'owner',definitionSHA:'d',evidenceIds:['e'],captureEpoch:'epoch',state:'running',createdAt:'2000',updatedAt:'2000'},1);
 const p:any={version:'literal-preview-v1',provisional:true,taskId:'t',definitionSHA:'d',sourceSHA:'s',inputSHA:'i',evidenceId:'e',captureEpoch:'epoch',ownerId:'owner',observations:[{properties:{zero:{state:'observed',value:0},flag:{state:'observed',value:false}}}]};
 assert.throws(()=>updateUnitProgress(doc,0,{preview:{...p,ownerId:null}}));assert.throws(()=>updateUnitProgress(doc,0,{preview:{...p,captureEpoch:'old'}}));updateUnitProgress(doc,0,{preview:p,timings:{firstReadableItemAt:2},liveRows:1});assert.equal(doc.units[0].preview!.observations[0].properties.flag.value,false);assert.equal(doc.job.liveRows,1);
 patchProgress(doc,{state:'stale'});assert.equal(doc.units[0].preview,undefined);updateUnitProgress(doc,0,{preview:p});assert.equal(doc.units[0].preview,undefined);
});

test('only complete validated rows enter preview and boolean false survives live v7 decoding',async()=>{
 const f=fixture('carcassonne','map'),k=compactTerraKinds(f.request,f.definition,'literal-compact-visible-instance-v7').find(k=>k.properties.some(p=>p.type==='boolean'))!,p=k.properties.find(p=>p.type==='boolean')!;
 const good={k:k.k,b:null,f:'f',q:1,u:'s',a:[{p:p.p,v:'false'}],x:k.properties.filter(v=>v!==p).map(v=>v.p)},payload={v:3,items:[{...good,k:999},good]},text=JSON.stringify(payload),previews:any[]=[];
 const reader=new LunaGameReader({identity:{...TERRA_HIGH_IDENTITY,automaticRetries:0},key:async()=>'mock',fetch:async()=>new Response(new ReadableStream({start(c){c.enqueue(encode({type:'response.output_text.delta',delta:text.slice(0,-2)+',{"k":'}));c.close();}}),{headers:{'Content-Type':'text/event-stream'}})});
 // The reader checks bytes; use the actual synthetic photo identity without changing definition/field validation.
 f.request.images[0].sha256=(await import('node:crypto')).createHash('sha256').update(bytes).digest('hex');
 const result=await reader.read(f.request,f.definition,bytes,'image/png',[],(_n,u)=>{if(u?.preview)previews.push(u.preview);});
 assert.equal(result.raw.completion,'truncated');assert.deepEqual(previews[0].map((o:any)=>o.ref),['item-2']);assert.equal(previews[0][0].properties[p.id].value,false);assert.equal(result.raw.observations.length,1);
});

test('diagnostics separates missing/invalid/normalized per observation, never alias plus covered double counts',async()=>{
 const p=await prepared('sagrada','cells'),k=compactTerraKinds(p.request,p.definition,'literal-compact-visible-instance-v7').find(k=>k.id==='dice')!,a=p.request.spatial!.frames[0].areas.find(a=>a.acceptedComponents.includes('dice'))!;
 const row={k:k.k,f:'f',q:1,u:'s',a:[],x:k.properties.map(v=>v.p)},payload={v:3,items:[row,row,row],spatial:{version:'spatial-observation-v1',boardInstances:[board(p.request,a.id)],placements:[placement(a.id,a.addresses[0].slotId),placement(a.id,'not-a-cell',{observationRef:'item-2'})]}};
 const decoded=decodeTerraGameObservation({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(payload)}]}]},p.request,p.definition,[],TERRA_HIGH_IDENTITY.adapterVersion),r:any={request:p.request,result:decoded.raw,hostedWire:decoded.hostedWire};
 const d=spatialDiagnostics([r,r]);assert.deepEqual([d.total,d.placed,d.unplaced,d.missingPlacement,d.rejected,d.normalized],[3,1,2,1,1,1]);
 const rejected=structuredClone(r);rejected.result.spatial.placements[0].boardInstanceRef=null;rejected.result.spatial.deferred.push({section:'boardInstances',index:0,reason:'invalid-board-instance'});assert(spatialDiagnostics([rejected]).observations[0].rejectedReasons.includes('invalid-board-instance'));
});


test('diagnostics excludes explicitly none-only kinds/areas without hiding unknown canonical candidates',async()=>{
 const {spatialFixture}=await import('./fixtures/spatial/builders'),f=spatialFixture('sagrada','window'),base:any={request:f.request,result:{observations:[{ref:'die',componentId:'dice',sourceAreaId:'window'},{ref:'window',componentId:'windows',sourceAreaId:'window'},{ref:'ambiguous',componentId:null,sourceAreaId:null}]}};
 const d=spatialDiagnostics([base]);assert.equal(d.total,2);assert.deepEqual(d.observations.map(o=>o.observationRef),['die','ambiguous']);
 const h=spatialFixture('hanabi','fireworks');assert.equal(spatialDiagnostics([{request:h.request,result:{observations:[{ref:'card',componentId:'cards',sourceAreaId:'fireworks'}]}}as any]).total,0);
 const t=spatialFixture('sagrada','tools');assert.equal(spatialDiagnostics([{request:t.request,result:{observations:[{ref:'tool',componentId:'cards',sourceAreaId:'tools'}]}}as any]).total,0);
});

test('legacy/incomplete display receipts contribute no fabricated spatial diagnosis',async()=>{
 const p=await prepared('sagrada','cells'),valid:any={request:p.request,result:{observations:[{ref:'kept',componentId:'dice',sourceAreaId:'window'}]}},expected=spatialDiagnostics([valid]);
 const incomplete:any[]=[null,{}, {result:{observations:[]}}, {request:{}}, {request:{spatial:{}}}, {request:p.request}, {request:p.request,result:{}}, {request:{...p.request,images:[]},result:valid.result}, {request:{...p.request,spatial:{...p.request.spatial,frames:[{}]}},result:valid.result}];
 assert.deepEqual(spatialDiagnostics(incomplete),{total:0,placed:0,unplaced:0,missingPlacement:0,rejected:0,normalized:0,observations:[]});assert.deepEqual(spatialDiagnostics([...incomplete,valid]),expected);assert.equal(expected.total,1);
});

test('cells prompt preserves template identity and separates local board direction from object-angle uncertainty',async()=>{
 const p=await prepared('sagrada','cells'),terra=buildTerraGameBody(p.request,p.definition,bytes,'image/png',TERRA_HIGH_IDENTITY.adapterVersion,{},TERRA_HIGH_IDENTITY),gemini=buildGeminiGameBody(p.request,p.definition,bytes,'image/png');
 for(const text of [terra.input[0].content[0].text!,gemini.contents[0].parts[0].text!]){
  assert(text.includes('Player-labelled area IDs in the contract are coordinate templates, not evidence of human ownership.'));
  assert(text.includes('reuse one compatible template for separate local board refs without assigning people'));
  assert(text.includes('do not allocate templates by seat or colour'));
  assert(text.includes('A perspective view does not by itself prevent establishing the local grid origin and reading direction.'));
  assert(text.includes('Do not require exact photograph-plane angle metrology merely to identify the local row/column direction.'));
  assert(text.includes('If the board orientation or local origin/direction cannot actually be established, keep orientationDegrees null'));
  assert(text.includes('boardRotationDegrees is the individual physical object angle relative to the established board'));
  assert(text.includes('An unknown object angle must not by itself erase an otherwise established local cell address.'));
  assert(text.includes('Never substitute 0 or round to 90'));
 }
});
