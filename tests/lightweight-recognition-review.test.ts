import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {createHash} from 'node:crypto';
import {createApp} from './fixtures/drawingTestApp';import {Store} from '../server/store';import {LocalReader} from '../server/ai/localReader';import defs from '../game-photo-definitions/index.json';import {allRummikubTiles} from '../shared/rummikub';
import {assembleObservations} from '../server/ai/observationAssembly';import {compileObservationTask,type PhotoDefinition} from '../shared/lightweightRecognition';import {effectiveRecognitionPack} from '../shared/recognition';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=';
const identity={kind:'local-observation-v1',model:'review-fixture',modelRevision:'test',weightSHA:'a'.repeat(64),projectorSHA:'b'.repeat(64),runtimeRevision:'test',contextTokens:8192,maxOutputTokens:2048}as const;
class Reader extends LocalReader {async status(){return {kind:'local-observation-v1'as const,available:true,cloudSupported:false as const,identity};}async read(request:any){const game=request.gameId,componentId=game==='catan'?'terrain':game==='rummikub'?'numbers':'development',properties=game==='catan'?{variant:{state:'observed',value:'forest'}}:game==='rummikub'?{color:{state:'observed',value:'blue'},number:{state:'observed',value:7}}:{kind:{state:'observed',value:'development'},bonus:{state:'observed',value:'blue'},points:{state:'observed',value:0}};return {raw:{version:'lightweight-observation-v1',coverage:'partial',completion:'complete',observations:[{ref:'new',componentId,imageIndex:0,panelRef:null,bbox:{x:.1,y:.1,width:.2,height:.2},face:'front',quantity:1,rotationDegrees:null,properties,referenceCandidates:[]}]},timings:{readerMs:0},usage:null,privateReceiptPrefix:''};}}
async function fixture(game:string){const root=await mkdtemp(path.join(os.tmpdir(),'kb-review-')),reader=new Reader({version:1,endpoint:'http://127.0.0.1:1',modelAlias:'fixture',identity,receiptDirectory:root,timeoutMs:1000}),store=new Store(root),server=(await createApp({store,localReader:reader})).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base='http://127.0.0.1:'+(server.address()as any).port;let revision:string|undefined;
 async function call(route:string,body?:unknown,method=body?'POST':'GET'){const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:body?JSON.stringify(body):undefined}),v=await r.json()as any;if(v.session?.storageRevision)revision=v.session.storageRevision;return {status:r.status,body:v};}
 const created=(await call('/sessions',{gamePackId:game})).body,p='/sessions/'+created.session.id,d=defs.games.find(d=>d.packId===game)!;let serial=0;
 const areaId=game==='catan-base'?'board':game==='rummikub'?'table':'market';
 async function upload(reuseEvidenceId?:string){return reuseEvidenceId?{createdEvidenceId:reuseEvidenceId,session:(await call(p)).body.session}:(await call(p+'/evidence',{scope:'public',dataUrl:image})).body;}
 async function scan(reuseEvidenceId?:string){
  const photo=await upload(reuseEvidenceId);assert.equal((await call(p+'/analysis-jobs',{requestId:'scan-'+(++serial),scope:'public',expectedCaptureEpoch:photo.session.captureEpoch,evidenceIds:[photo.createdEvidenceId],reader:{kind:'local-observation-v1',definitionSHA:d.definitionSHA,areaId}})).status,202);
  let job:any;for(let i=0;i<100;i++){job=(await call(p+'/analysis-jobs')).body.jobs[0];if(job.state==='completed')break;assert.notEqual(job.state,'failed');await new Promise(r=>setTimeout(r,10));}assert.equal(job.state,'completed');
  const assertions=(await call(p)).body.session.assertions;assert.equal(assertions.some((a:any)=>a.status==='candidate'),false,'new reads are directly editable without acceptance');const applied=assertions.find((a:any)=>a.analysisJobId===job.id&&a.status==='accepted');assert(applied);return applied;
 }
 async function seedLegacyCandidate(reuseEvidenceId?:string){
  // Assemble and persist a historical pending read directly; current analysis jobs auto-apply.
  const photo=await upload(reuseEvidenceId),session=(await store.getSession(created.session.id))!,pack=effectiveRecognitionPack(session.gamePack!);
  const request=compileObservationTask({pack,definition:d as PhotoDefinition,areaId,taskId:'legacy-'+(++serial),scope:{partition:'common_public',ownerId:null,captureEpoch:session.captureEpoch},images:[{evidenceId:photo.createdEvidenceId,inputId:photo.createdEvidenceId,sha256:createHash('sha256').update(Buffer.from(image.split(',')[1],'base64')).digest('hex'),width:1,height:1,transformId:null}]});
  const {raw}=await reader.read(request),result=assembleObservations({pack,definition:d as PhotoDefinition,request,reader:identity,turnInstanceId:session.turnInstanceId,result:raw as any});
  assert.equal(result.assertions.length,1);assert.equal(result.assertions[0].status,'candidate');session.assertions.push(...result.assertions);await store.saveSession(session);await call(p);return result.assertions[0] as any;
 }
 return {p,call,scan,seedLegacyCandidate,store,close:async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}};
}
for(const game of ['catan-base','rummikub'])test(game+' saved legacy native candidate: guarded accept/answers, explicit baseline CAS and receipt-preserving save',async()=>{const f=await fixture(game);try{
 const first=await f.seedLegacyCandidate();assert.equal((await f.call(f.p+'/assertions/'+first.id+'/accept',{})).status,200,'empty baseline remains usable for a saved legacy candidate');
 const field=game==='catan-base'?'board.layout':'table.scene',a=structuredClone(first.value);
 if(game==='catan-base'){a.components[0].variant='hills';a.components[0].location={type:'hex',id:'r1c1'};}else{a.groups=[{id:'manual-order',label:'user',tiles:a.loose}];a.loose=[];a.groups[0].tiles[0].number=9;const manual={...a.groups[0].tiles[0],evidenceIds:[],region:null,note:'manual'};a.groups[0].tiles.push({...manual,id:'manual-second',number:5});a.loose.push({...manual,id:'manual-loose',number:3});}
 assert.equal((await f.call(f.p,{answers:[{field,value:a}]},'PATCH')).status,200);const baseline=(await f.call(f.p)).body.session.assertions.find((x:any)=>x.field===field&&x.status==='accepted'),fresh=await f.seedLegacyCandidate();
 const objects=(v:any)=>game==='catan-base'?v.components:allRummikubTiles(v);assert.equal(objects(fresh.value).length,1,'candidate contains fresh photo only');assert.notEqual(objects(fresh.value)[0].id,objects(a)[0].id);assert.deepEqual((await f.call(f.p)).body.session.assertions.find((x:any)=>x.id===baseline.id).value,a);
 assert.equal((await f.call(f.p+'/assertions/'+fresh.id+'/accept',{})).status,409,'partial accept cannot erase baseline');assert.equal((await f.call(f.p,{answers:[{field,value:fresh.value}]},'PATCH')).status,409,'candidate-only answer cannot erase baseline');
 const merged=structuredClone(a);if(game==='catan-base')merged.components.push(...fresh.value.components);else merged.loose.push(...fresh.value.loose);
 const review={version:'native-observation-review-v1',sourceAssertionId:fresh.id,expectedBaselineAssertionId:baseline.id};
 assert.equal((await f.call(f.p,{answers:[{field,value:merged,observationReview:{...review,expectedBaselineAssertionId:'stale'}}]},'PATCH')).status,409);
 assert.equal((await f.call(f.p,{answers:[{field,value:merged,observationReview:{...review,sourceAssertionId:'gone'}}]},'PATCH')).status,409);
 assert.equal((await f.call(f.p,{answers:[{field,value:merged,observationReview:review}]},'PATCH')).status,200);
 let saved=(await f.call(f.p)).body.session.assertions.find((x:any)=>x.field===field&&x.status==='accepted');assert.deepEqual(saved.value,merged);assert.equal(saved.observationReceipts.length,2);assert.equal(saved.observationReceipts[1].result.observations.length,1);
 assert.equal((await f.call(f.p,{answers:[{field,value:merged,observationReview:review}]},'PATCH')).status,409,'stale review is never rebased');
 assert.equal((await f.call(f.p+'/commit',{allowIncomplete:true})).status,200);assert.equal((await f.call(f.p+'/resume',{scope:'public'})).status,200);saved=(await f.call(f.p)).body.session.assertions.find((x:any)=>x.field===field&&x.status==='accepted');assert.deepEqual(saved.value,merged);
 // Intentional manual removal is not automatically unioned back by the server.
 assert.equal((await f.call(f.p,{answers:[{field,value:a}]},'PATCH')).status,200);assert.deepEqual((await f.call(f.p)).body.session.assertions.find((x:any)=>x.field===field&&x.status==='accepted').value,a);
 }finally{await f.close();}});
for(const game of ['catan-base','rummikub','splendor'])test(game+' new local reads auto-apply and preserve manual baseline plus unlinked source through save/resume',async()=>{const f=await fixture(game);try{
 const first=await f.scan(),field=game==='catan-base'?'board.layout':game==='rummikub'?'table.scene':'market.scene',corrected=structuredClone(first.value);
 assert.equal(first.field,field);assert.equal(first.observationReceipts.length,1);assert.equal(first.observationReceipts[0].scanBundle.units[0].state,'completed');
 if(game==='catan-base'){corrected.components[0].variant='hills';corrected.components[0].quantity=0;corrected.components[0].location={type:'hex',id:'r1c1'};}
 else if(game==='rummikub'){corrected.groups=[{id:'manual-order',label:'user',tiles:corrected.loose}];corrected.loose=[];corrected.groups[0].tiles[0].number=9;}
 else {corrected.pieces[0].quantity=0;corrected.pieces[0].readout.cost={white:null,blue:0,green:6,red:null,black:null};}
 assert.equal((await f.call(f.p,{answers:[{field,value:corrected}]},'PATCH')).status,200);
 const baseline=(await f.call(f.p)).body.session.assertions.find((a:any)=>a.status==='accepted'&&a.field===field),applied=await f.scan();
 assert.notEqual(applied.id,baseline.id);assert.deepEqual(applied.value,baseline.value,'a separate photo without identity evidence must not add to or overwrite the manual inventory');assert.equal(applied.observationReceipts.length,2);
 const original=applied.observationReceipts[0],source=applied.observationReceipts[1];
 assert.deepEqual(original.result,first.observationReceipts[0].result,'manual edits do not rewrite the first raw read');assert.equal(source.result.observations.length,1);assert.notEqual(source.request.images[0].evidenceId,original.request.images[0].evidenceId);assert.deepEqual(source.componentRefs,{});
 assert(source.scanBundle.links.some((link:any)=>link.status==='unlinked'&&link.targetPieceId===null));
 const expected=game==='catan-base'?['variant','forest']:game==='rummikub'?['number',7]:['points',0];assert.equal(source.result.observations[0].properties[expected[0]].value,expected[1]);
 const receiptBefore=structuredClone(applied.observationReceipts);
 assert.equal((await f.call(f.p+'/commit',{allowIncomplete:true})).status,200);assert.equal((await f.call(f.p+'/resume',{scope:'public'})).status,200);
 const reopened=(await f.call(f.p)).body.session,restored=reopened.assertions.find((a:any)=>a.status==='accepted'&&a.field===field);assert.deepEqual(restored.value,baseline.value);assert.deepEqual(restored.observationReceipts,receiptBefore);
 for(const receipt of receiptBefore)assert(reopened.evidence.some((e:any)=>e.id===receipt.request.images[0].evidenceId),'each raw receipt retains its stored source photo');
 }finally{await f.close();}});

test('new same-photo local rescan preserves manual facts and records conflicting raw observations',async()=>{const f=await fixture('catan-base');try{
 const first=await f.scan(),corrected=structuredClone(first.value);corrected.components[0].variant='hills';
 assert.equal((await f.call(f.p,{answers:[{field:'board.layout',value:corrected}]},'PATCH')).status,200);
 const applied=await f.scan(first.evidenceIds[0]),source=applied.observationReceipts[1];
 assert.deepEqual(applied.value,corrected);assert.equal(applied.observationReceipts.length,2);assert.equal(source.request.images[0].evidenceId,first.evidenceIds[0]);assert.equal(source.result.observations[0].properties.variant.value,'forest');
 assert(source.scanBundle.links.some((link:any)=>link.status==='conflict'&&link.targetPieceId===corrected.components[0].id&&link.conflicts.includes('variant')),'same-source identity can preserve a fact conflict without applying the contrary value');
 assert.equal((await f.call(f.p+'/commit',{allowIncomplete:true})).status,200);assert.equal((await f.call(f.p+'/resume',{scope:'public'})).status,200);
 const restored=(await f.call(f.p)).body.session.assertions.find((a:any)=>a.status==='accepted'&&a.field==='board.layout');assert.deepEqual(restored.value,corrected);assert.deepEqual(restored.observationReceipts,applied.observationReceipts);
 }finally{await f.close();}});
test('saved legacy typed candidate explicitly links once without copying old accepted IDs/values',async()=>{const f=await fixture('splendor');try{
 const first=await f.seedLegacyCandidate();assert.equal((await f.call(f.p+'/assertions/'+first.id+'/accept',{})).status,200);const old=(await f.call(f.p)).body.session.assertions.find((x:any)=>x.field==='market.scene'&&x.status==='accepted');const fresh=await f.seedLegacyCandidate();assert.equal(fresh.value.pieces.length,1);assert.notEqual(fresh.value.pieces[0].id,old.value.pieces[0].id);
 assert.equal((await f.call(f.p+'/assertions/'+fresh.id+'/accept',{})).status,409);assert.equal((await f.call(f.p,{answers:[{field:'market.scene',value:fresh.value}]},'PATCH')).status,409);
 const request={sourceAssertionId:fresh.id,pieceIds:[fresh.value.pieces[0].id],target:{field:'market.scene'},expectedTargetAssertionId:old.id};assert.equal((await f.call(f.p+'/component-links',request)).status,200);assert.equal((await f.call(f.p+'/component-links',request)).status,200);const saved=(await f.call(f.p)).body.session.assertions.find((x:any)=>x.field==='market.scene'&&x.status==='accepted');assert.equal(saved.value.pieces.length,2);assert.deepEqual(saved.value.pieces[0],old.value.pieces[0]);assert.equal(saved.observationReceipts.length,2);
 }finally{await f.close();}});
test('Splendor unknown-kind independent level survives real candidate accept/save/resume/export',async()=>{const f=await fixture('splendor');try{
 const session=(await f.store.getSession(f.p.split('/').at(-1)!))!,pack=effectiveRecognitionPack(session.gamePack!),definition=defs.games.find(d=>d.gameId==='splendor')as PhotoDefinition;
 const photo=(await f.call(f.p+'/evidence',{scope:'public',dataUrl:image})).body;const stored=(await f.store.getSession(session.id))!;
 const request=compileObservationTask({pack,definition,areaId:'market',taskId:'unknown-kind-api',scope:{partition:'common_public',ownerId:null,captureEpoch:stored.captureEpoch},images:[{evidenceId:photo.createdEvidenceId,inputId:photo.createdEvidenceId,sha256:'a'.repeat(64),width:1,height:1,transformId:null}]});
 const result=assembleObservations({pack,definition,request,reader:identity,turnInstanceId:stored.turnInstanceId,result:{version:'lightweight-observation-v1',coverage:'partial',completion:'complete',observations:[{ref:'unknown-kind',componentId:'development',imageIndex:0,panelRef:null,bbox:{x:0,y:0,width:1,height:1},quantity:null,face:'unknown',rotationDegrees:null,properties:{level:{state:'observed',value:2}},referenceCandidates:[]}]}});stored.assertions.push(...result.assertions);await f.store.saveSession(stored);await f.call(f.p);
 assert.equal((await f.call(f.p+'/assertions/'+result.assertions[0].id+'/accept',{})).status,200);assert.equal((await f.call(f.p+'/commit',{allowIncomplete:true})).status,200);assert.equal((await f.call(f.p+'/resume',{scope:'public'})).status,200);const a=(await f.call(f.p)).body.session.assertions.find((a:any)=>a.field==='market.scene'&&a.status==='accepted');assert.equal(a.value.pieces[0].readout.kind,null);assert.equal(a.value.pieces[0].readout.level,2);assert.equal(a.observationReceipts[0].result.observations[0].face,'unknown');assert.equal((await f.call(f.p+'/export')).status,200);
 }finally{await f.close();}});
test('saved legacy same-photo candidate keeps fresh IDs/raw instead of copying corrected accepted source',async()=>{const f=await fixture('catan-base');try{
 const first=await f.seedLegacyCandidate();assert.equal((await f.call(f.p+'/assertions/'+first.id+'/accept',{})).status,200);const corrected=structuredClone(first.value);corrected.components[0].variant='hills';assert.equal((await f.call(f.p,{answers:[{field:'components.observed',value:corrected}]},'PATCH')).status,200);
 const fresh=await f.seedLegacyCandidate(first.evidenceIds[0]);assert.notEqual(fresh.value.components[0].id,corrected.components[0].id);assert.equal(fresh.value.components[0].variant,'forest');assert.equal(fresh.observationReceipts[0].result.observations[0].properties.variant.value,'forest');assert.deepEqual((await f.call(f.p)).body.session.assertions.find((a:any)=>a.status==='accepted'&&a.field==='components.observed').value,corrected);
 assert.equal((await f.call(f.p+'/assertions/'+fresh.id+'/accept',{})).status,409,'same-field baseline is protected even before board.layout exists');
 }finally{await f.close();}});
