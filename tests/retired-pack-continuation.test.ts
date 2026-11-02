import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {retiredPacks,catalogPacks} from '../gamepacks/catalog.ts';
import {legacyRummikubPack} from '../gamepacks/rummikub.ts';
import {captureProfile,validateCaptureTarget} from '../shared/photoCapture.ts';
import {photoDefinition,definitionHash} from '../server/photoDefinitions.ts';
import {createApp} from '../server/index.ts';
import {Store} from '../server/store.ts';
import {GeminiGameReader} from '../server/ai/geminiGameReader.ts';
import {prepareHostedObservation} from '../server/hostedObservation.ts';
import {assembleObservations} from '../server/ai/observationAssembly.ts';
import {compileObservationTask} from '../shared/lightweightRecognition.ts';
import {readoutDefinition,emptyGameReadout,validateGameReadout,gameReadoutView} from '../shared/readouts/registry.ts';

test('every retired pack keeps its own capture profile and pinned photo definition',()=>{
 assert(retiredPacks.length>0);
 for(const pack of retiredPacks){
  const source=pack.runtime!.source,profile=captureProfile(pack),definition=photoDefinition(pack);
  assert(profile?.areas.length,pack.id);
  assert.equal(profile!.sourceSHA,source.sha256,pack.id);
  assert.equal(definition.packVersion,pack.version,pack.id);
  assert.equal(definition.sourceSHA,source.sha256,pack.id);
  assert.equal(definition.definitionSHA,definitionHash(definition),pack.id);
  if(pack.id!=='splendor'){
   const readout=readoutDefinition(pack);
   assert(readout?.components.length,pack.id);
   assert.equal(readout.sourceSHA,source.sha256,pack.id);
   assert.equal(readout.packVersion,pack.version,pack.id);
  }
  const area=profile!.areas.find(a=>a.partition==='common_public'||a.partition==='player_public');
  assert(area,pack.id);
  assert.deepEqual(validateCaptureTarget({version:1,gameId:source.gameId,sourceSHA:source.sha256,areaId:area!.id},pack),{version:1,gameId:source.gameId,sourceSHA:source.sha256,areaId:area!.id});
 }
});

test('a retired pack prepares the same pinned public photo analysis job without upgrading its source',async()=>{
 const pack=retiredPacks.find(p=>p.id==='istanbul')!,definition=photoDefinition(pack),area=definition.areas.find(a=>a.partition==='common_public')!;
 const data=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=','base64');
 class Ready extends GeminiGameReader{async status(){return {kind:'gemini-game-observation-v1' as const,available:true,cloudSupported:true as const,identity:this.identity};}}
 const plan=await prepareHostedObservation({pack,evidence:[{id:'old-photo',kind:'photo',scope:'public',captureEpoch:'same-epoch'} as any],captureEpoch:'same-epoch',selection:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:area.id},taskId:'retired-smoke',reader:new Ready(),readImage:async()=>({data,mimeType:'image/png'})});
 assert.equal(plan.request.sourceSHA,pack.runtime!.source.sha256);
 assert.equal(plan.request.definitionSHA,definition.definitionSHA);
 assert.equal(plan.request.areaId,area.id);
});

test('retired typed fields survive display, validation and actual observation assembly',()=>{
 const pack=retiredPacks.find(p=>p.id==='istanbul')!,current=catalogPacks.find(p=>p.id==='istanbul')!,definition=photoDefinition(pack);
 const historic=readoutDefinition(pack);
 assert(historic);
 assert.deepEqual(historic.components.find(c=>c.id==='places')?.fields.map(f=>f.id),['face','printedName','placeLabel','placeNumber','gridCell']);
 const initial=emptyGameReadout(pack,'places');
 assert.equal(initial.values.gridCell,null);
 const request=compileObservationTask({pack,definition,areaId:'city',scope:{partition:'common_public',ownerId:null,captureEpoch:'epoch'},images:[{evidenceId:'old-photo',inputId:'old-photo',sha256:'a'.repeat(64),width:800,height:600,transformId:null}],taskId:'old-typed'});
 const observed={ref:'place-1',imageIndex:0,panelRef:null,componentId:'places',bbox:{x:.1,y:.1,width:.2,height:.2},face:'front' as const,quantity:null,rotationDegrees:null,properties:{placeNumber:{state:'observed' as const,value:4}},referenceCandidates:[]};
 const reader={kind:'local-observation-v1' as const,model:'fixture',modelRevision:'fixture',weightSHA:'a'.repeat(64),projectorSHA:'b'.repeat(64),runtimeRevision:'fixture',contextTokens:8192,maxOutputTokens:2048};
 const assembled=assembleObservations({pack,definition,request,reader,turnInstanceId:'turn',result:{version:'lightweight-observation-v1',coverage:'partial',completion:'complete',observations:[observed]}});
 assert.equal(assembled.assertions.length,1);
 const piece=(assembled.assertions[0].value as any).pieces[0];
 assert.equal(piece.readout.values.placeNumber,4);
 assert.equal(piece.readout.values.gridCell,null);
 assert.equal(validateGameReadout(piece.readout,pack,'places','old-photo').values.placeNumber,4);
 assert.equal(gameReadoutView(pack,piece).status,'structured');
 assert.equal(readoutDefinition({...pack,version:current.version}),undefined);
 assert.equal(readoutDefinition({...pack,runtime:{...pack.runtime!,source:{...pack.runtime!.source,sha256:'wrong'}}}),undefined);
});

test('new sessions reject retired version while current version still starts and an old saved pack reopens',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-retired-test-')),store=new Store(root),app=await createApp({store});
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+(server.address() as {port:number}).port+'/api';
 const request=async(route:string,body?:unknown)=>{const r=await fetch(base+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json() as any};};
 try{
  const prior=retiredPacks.find(p=>p.id==='istanbul')!,current=catalogPacks.find(p=>p.id==='istanbul')!;
  assert.equal((await request('/sessions',{gamePackId:prior.id,gamePackVersion:prior.version})).status,404);
  assert.equal((await request('/sessions',{gamePackId:legacyRummikubPack.id,gamePackVersion:legacyRummikubPack.version})).status,201,'historical native API compatibility stays supported');
  const created=await request('/sessions',{gamePackId:current.id,gamePackVersion:current.version,name:'saved game'});
  assert.equal(created.status,201);
  const saved=await store.getSession(created.body.session.id);assert(saved);
  saved.gamePack=structuredClone(prior);saved.gamePackVersion=prior.version;saved.notes={...saved.notes,reviewMarker:'retained' as any};
  await store.saveSession(saved);
  const reopened=await request('/sessions/'+saved.id);
  assert.equal(reopened.status,200);
  assert.equal(reopened.body.session.gamePackVersion,prior.version);
  assert.equal(reopened.body.pack.runtime.source.sha256,prior.runtime!.source.sha256);
  assert.equal(reopened.body.session.notes.reviewMarker,'retained');
  assert.equal(captureProfile(reopened.body.pack)?.sourceSHA,prior.runtime!.source.sha256);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(root,{recursive:true,force:true});}
});
