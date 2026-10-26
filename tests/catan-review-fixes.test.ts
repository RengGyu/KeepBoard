import test from 'node:test';
import assert from 'node:assert/strict';
import {catanPack} from '../gamepacks/catan.ts';
import {answerField,nextTurn,recompute} from '../server/engine.ts';
import {canonicalBoard,playerSummary} from '../shared/catanSummary.ts';
import {CATAN_TOPOLOGY,createComponent,type ComponentScene} from '../shared/scene.ts';
import {mergeBoardObservation,recordedScene} from '../shared/boardRecording.ts';
import {moveSceneComponent} from '../shared/sceneMoves.ts';
import {sceneWorkspaceData} from '../src/sceneWorkspaceModel.ts';
import {normalizeObservations} from '../server/ai/index.ts';
import {observationPrompt} from '../server/ai/prompt.ts';
import type {Session,Value} from '../shared/types.ts';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server/index.ts';
import {Store} from '../server/store.ts';
const seed=():Session=>({id:'review-fix',name:'synthetic',createdAt:'2026-10-21',updatedAt:'2026-10-21',gamePackId:catanPack.id,gamePackVersion:catanPack.version,gamePack:structuredClone(catanPack),captureEpoch:'epoch',turnInstanceId:'t1',stage:'capture',players:[{id:'r',name:'A',color:'red'},{id:'b',name:'B',color:'blue'}],evidence:[],assertions:[],preservations:[],snapshots:[],notes:{},activity:[],example:false});
const put=(s:Session,k:string,v:unknown,owner?:string)=>answerField(s,s.gamePack!,k,v as Value,owner);
test('a new manual public board records into the same canonical scene used by summaries without claiming complete layers',()=>{
 const s=seed(),view=recompute(s,s.gamePack!);const field=sceneWorkspaceData(view).fields[0];assert.equal(field.key,'board.layout');
 const empty:ComponentScene={version:2,coverage:'partial',components:[]};
 put(s,field.key,{...empty,components:[createComponent(empty,'settlement',{id:'house',ownerId:'r',quantity:1,location:{type:'vertex',id:'r1c1.N'}})]});
 assert.equal(canonicalBoard(s).scene.components.length,1);assert.equal(playerSummary(s,'r').pieces.settlement.known,1);assert.equal(playerSummary(s,'r').pieces.settlement.value,null);
 assert.equal(canonicalBoard(s).scene.coverage,'partial');assert.equal(canonicalBoard(s).scene.coverageByLayer?.harbors,undefined);
});
test('purchase identity survives but action-card restriction expires by the next own turn',()=>{
 const s=seed();put(s,'player.development.boughtThisTurnType','knight','r');put(s,'player.development.handCounts',{knight:1},'r');
 assert(recompute(s,s.gamePack!).derived.some(a=>a.field==='player.development.newActionCardUnavailableThisTurn'));
 nextTurn(s,s.gamePack!,'b');nextTurn(s,s.gamePack!,'r');
 assert(!recompute(s,s.gamePack!).derived.some(a=>a.field==='player.development.newActionCardUnavailableThisTurn'));
 assert.equal(s.assertions.find(a=>a.field==='player.development.boughtThisTurnType')?.value,'knight');assert.deepEqual(s.assertions.find(a=>a.field==='player.development.handCounts')?.value,{knight:1});
});
test('unknown legacy purchase turn is not fabricated while the known current VP exception still works',()=>{
 const s=seed();put(s,'player.development.boughtThisTurnType','knight','r');delete s.assertions[0].turnInstanceId;
 assert(!recompute(s,s.gamePack!).derived.some(a=>a.field==='player.development.newActionCardUnavailableThisTurn'));
 put(s,'player.development.boughtThisTurnType','victory_point','r');
 assert(recompute(s,s.gamePack!).derived.some(a=>a.field==='player.development.newVictoryPointCanBeRevealedToWin'));
});
test('a contradictory explicit resource total is not returned as a confirmed number',()=>{
 const s=seed();put(s,'player.resources.total',7,'r');put(s,'player.resources.counts',{lumber:2,brick:0,wool:0,grain:0,ore:0},'r');
 const info=playerSummary(s,'r');assert.equal(info.resourceTotal.status,'conflict');assert.equal(info.resourceTotal.value,null);assert.equal(info.resources.value,2);
 put(s,'player.resources.total',2,'r');assert.equal(playerSummary(s,'r').resourceTotal.value,2);
});
test('current complete-hand VP count supersedes a stale separate legacy total without deleting it',()=>{
 const s=seed();put(s,'player.score.hiddenVictoryPoints',2,'r');put(s,'player.development.handCounts',{'victory-point':0},'r');
 assert.equal(playerSummary(s,'r').totalScore.known,0);assert.equal(playerSummary(s,'r').totalScore.status,'conflict');
 assert.equal(s.assertions.find(a=>a.field==='player.score.hiddenVictoryPoints')?.value,2);
 put(s,'player.score.hiddenVictoryPoints',null,'r');assert.notEqual(playerSummary(s,'r').totalScore.status,'conflict');
});
test('photo normalization excludes rule-only booleans and prompt definitions exclude UI metadata',()=>{
 const s=seed();const e={id:'photo',url:'/synthetic.jpg',scope:'public' as const,kind:'photo' as const,captureEpoch:'epoch',capturedAt:'synthetic',label:'synthetic'};
 const result=normalizeObservations({assertions:[{field:'turn.actionDevelopmentCardLimitReached',value:true,evidenceIds:['photo']},{field:'player.resources.total',ownerId:'r',value:3,evidenceIds:['photo']}]},s.gamePack!,[e],s.turnInstanceId,['r','b']);
 assert.deepEqual(result.assertions.map(a=>a.field),['player.resources.total']);
 const prompt=observationPrompt(s,s.gamePack!,[e]);const defs=JSON.parse(prompt.match(/Allowed field definitions: (.+)\n/)![1]);
 assert(!defs.some((d:any)=>d.key==='turn.actionDevelopmentCardLimitReached'));assert(!defs.some((d:any)=>d.ui||d.group||d.sourceId));
});
test('simple recording retires unrendered mandatory questions while pinned detailed packs remain unchanged',()=>{
 const s=seed();const pinned=JSON.stringify(s.gamePack);(s as Session&{recordingMode:string}).recordingMode='simple';
 assert.equal(recompute(s,s.gamePack!).questions.length,0);assert.equal(JSON.stringify(s.gamePack),pinned);
 const detailed=seed();assert(recompute(detailed,detailed.gamePack!).questions.length>0);
});
test('changing the current-player record is a correction; only explicit nextTurn expires turn flags',()=>{
 const s=seed();put(s,'currentPlayer','r');put(s,'turn.actionDevelopmentCardPlayed',true);put(s,'currentPlayer','b');
 assert.equal(s.turnInstanceId,'t1');assert(recompute(s,s.gamePack!).derived.some(a=>a.field==='turn.actionDevelopmentCardLimitReached'));
 nextTurn(s,s.gamePack!,'b');assert.notEqual(s.turnInstanceId,'t1');assert(!recompute(s,s.gamePack!).derived.some(a=>a.field==='turn.actionDevelopmentCardLimitReached'));
});

test('a partial correction edits one shared board with existing occupied slots; unrelated layers and photo crops survive',()=>{
 const empty:ComponentScene={version:2,coverage:'partial',components:[]};
 const first=CATAN_TOPOLOGY.edges[0].id,second=CATAN_TOPOLOGY.edges[1].id;
 const road=(id:string,where:string,owner:string)=>createComponent(empty,'road',{id,ownerId:owner,quantity:1,location:{type:'edge',id:where}});
 const old=road('old',first,'r'),other=road('other',second,'b');
 const crop={x:.1,y:.2,width:.2,height:.2};
 const observed={...road('read',first,'b'),evidenceId:'new-photo',region:crop};
 const robber=createComponent(empty,'robber',{id:'robber',quantity:1,location:{type:'hex',id:'r1c1'}});
 const merged=mergeBoardObservation({...empty,coverage:'full',coverageByLayer:{roads:'complete',harbors:'complete'},components:[old,other,robber]}, {...empty,components:[observed]});
 assert.equal(merged.components.length,3);assert.equal(merged.components.find(c=>c.id==='old')?.ownerId,'b');
 assert.deepEqual(merged.components.find(c=>c.id==='robber'),robber);assert.deepEqual(merged.components.find(c=>c.id==='old')?.region,crop);
 assert.equal(merged.coverageByLayer?.roads,'unknown');assert.equal(merged.coverageByLayer?.harbors,'complete');
 const moved=moveSceneComponent(merged,'old',{type:'edge',id:second});
 assert.equal(moved.scene.components.find(c=>c.id==='other')?.location.id,first);
 assert.equal(moved.scene.components.find(c=>c.id==='old')?.location.id,second);
 assert.equal(merged.components.find(c=>c.id==='other')?.location.id,second,'input remains an undo-able original');
});

test('only a newer public board observation is promoted; old observations, private catalogs and loose cards do not overwrite the board',()=>{
 const s=seed(),empty:ComponentScene={version:2,coverage:'partial',components:[]};
 put(s,'board.layout',empty);s.assertions[0].updatedAt='2026-01-01';
 put(s,'components.observed',{...empty,components:[createComponent(empty,'settlement',{id:'photo-house',location:{type:'vertex',id:'r1c1.N'}})]});
 const source=s.assertions.at(-1)!;source.updatedAt='2026-01-02';
 const view=recompute(s,s.gamePack!),recording=recordedScene(view,source.field,source);
 assert.equal(recording.fieldKey,'board.layout');assert.equal(recording.forceSave,true);assert.equal(recording.scene.components.length,1);
 put(s,'board.layout',recording.scene);s.assertions.at(-1)!.updatedAt='2026-01-03';
 const reopened=recordedScene(recompute(s,s.gamePack!),source.field,source);
 assert.equal(reopened.forceSave,false);assert.equal(reopened.scene.components.length,1);
 const privateResult=recordedScene(view,'player.components.observed',{...source,ownerId:'r'},'r');assert.equal(privateResult.fieldKey,'player.components.observed');
 const cards={...source,value:{...empty,components:[createComponent(empty,'resource-card',{id:'card'})]} as unknown as Value};
 assert.equal(recordedScene(view,'components.observed',cards).fieldKey,'components.observed');
});

test('duplicate occupied observations are not silently selected, and 19 terrain do not certify any other layer',()=>{
 const empty:ComponentScene={version:2,coverage:'partial',components:[]};
 const road=createComponent(empty,'road',{id:'a',location:{type:'edge',id:CATAN_TOPOLOGY.edges[0].id}});
 const ambiguous=mergeBoardObservation({...empty,components:[road,{...road,id:'b'}]}, {...empty,components:[{...road,id:'new'}]});
 assert.equal(ambiguous.components.length,3);
 const s=seed();put(s,'board.layout',{...empty,components:CATAN_TOPOLOGY.hexes.map(h=>createComponent(empty,'terrain',{id:h.id,location:{type:'hex',id:h.id},variant:'forest'}))});
 const board=canonicalBoard(s).scene;
 assert.equal(board.coverage,'partial');assert.notEqual(board.coverageByLayer?.numbers,'complete');assert.equal(playerSummary(s,'r').pieces.road.value,null);assert.equal(playerSummary(s,'r').rates.complete,false);
});

test('simple recording API preserves the pinned detailed pack, private records, source links and save/open turn; legacy mode changes only on explicit save',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'keepboard-review-fixes-'));
 const server=(await createApp({store:new Store(directory)})).listen(0,'127.0.0.1');
 await new Promise<void>(resolve=>server.once('listening',resolve));
 const address=server.address();assert(address&&typeof address!=='string');
 const call=async(route:string,method='GET',body?:unknown)=>{
  const response=await fetch(`http://127.0.0.1:${address.port}${route}`,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  assert(response.ok,await response.clone().text());return response.json();
 };
 try {
  let view=await call('/api/sessions','POST',{recordingMode:'simple',example:true});
  const route=`/api/sessions/${view.session.id}`,pack=JSON.stringify(view.pack),turn=view.session.turnInstanceId,epoch=view.session.captureEpoch;
  assert.equal(view.questions.length,0);assert(view.actions.every((a:any)=>a.kind!=='preparePack'));
  const evidenceId=view.session.evidence[0].id;
  const empty:ComponentScene={version:2,coverage:'partial',components:[]};
  const scene={...empty,components:[createComponent(empty,'settlement',{id:'linked-house',quantity:1,ownerId:'red',evidenceId,region:{x:.1,y:.1,width:.1,height:.1},location:{type:'vertex',id:CATAN_TOPOLOGY.vertices[0].id}})]};
  view=await call(route,'PATCH',{answers:[{field:'board.layout',value:scene},{field:'player.resources.counts',ownerId:'red',value:{ore:2}},{field:'player.development.boughtThisTurnType',ownerId:'red',value:'knight'}],notes:{red:'비공개 합성 메모'}});
  assert(view.session.assertions.find((a:any)=>a.field==='board.layout').evidenceIds.includes(evidenceId));
  const privateFacts=view.session.assertions.filter((a:any)=>a.ownerId==='red'&&a.basis!=='rule');
  view=await call(route+'/commit','POST',{recordingMode:'simple',allowIncomplete:true});view=await call(route);
  assert.equal(JSON.stringify(view.pack),pack);assert.equal(view.session.turnInstanceId,turn);assert.equal(view.session.captureEpoch,epoch);
  assert.deepEqual(view.session.snapshots[0].assertions.filter((a:any)=>a.ownerId==='red'&&a.basis!=='rule'),privateFacts);
  assert.equal(view.session.notes.red,'비공개 합성 메모');assert.equal(canonicalBoard(view.session).scene.components.length,1);
  view=await call(route+'/next-turn','POST',{playerId:'blue'});
  assert.notEqual(view.session.turnInstanceId,turn);assert(!view.derived.some((a:any)=>a.field==='player.development.newActionCardUnavailableThisTurn'));
  assert(view.session.assertions.some((a:any)=>a.field==='player.development.boughtThisTurnType'));
  const legacy=await call('/api/sessions','POST',{}),legacyRoute=`/api/sessions/${legacy.session.id}`;
  assert(legacy.questions.length>0);assert.equal(legacy.session.recordingMode,undefined);
  const oldPreservations=legacy.session.preservations,oldPack=legacy.pack;
  const simple=await call(legacyRoute+'/commit','POST',{recordingMode:'simple',allowIncomplete:true});
  assert.equal(simple.questions.length,0);assert.deepEqual(simple.pack,oldPack);assert.deepEqual(simple.session.preservations,oldPreservations);
 } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(directory,{recursive:true,force:true});}
});
