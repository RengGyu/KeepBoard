// Synthetic pure-function/SSR evidence at exact frozen baseline. No network/Store/model.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';import {pathToFileURL} from 'node:url';
import {register,createRequire} from 'node:module';
register('./skip-css.mjs',import.meta.url);
(globalThis as any).window={addEventListener(){}};
const manifest=JSON.parse(readFileSync('docs/vercel-deployment/source-manifest.json','utf8'));
const root=manifest.sourceRoot,out='docs/game-state-linking/audit-sol';
// Use the frozen app's renderer and React together (workspace has a separate dependency copy).
const require=createRequire(join(root,'package.json'));
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
(globalThis as any).React=React; // tsx outside the snapshot uses classic JSX; product Vite uses its own tsconfig.
const mod=(p:string)=>import(pathToFileURL(join(root,p)).href);
const {effectiveRecognitionPack,recognitionFields}=await mod('shared/recognition.ts');
const {captureProfile,captureFields}=await mod('shared/photoCapture.ts');
const {genericCandidateValue}=await mod('server/ai/generic.ts');
const {answerField,recompute}=await mod('server/engine.ts');
const {resumeSnapshot}=await mod('server/runtimeResume.ts');
const {privateField}=await mod('shared/privacy.ts');
const {roomView}=await mod('server/rooms.ts');
const {emptySplendorObservation,unknownGemCounts}=await mod('shared/splendor.ts');
const {emptyRummikub,createRummikubTile}=await mod('shared/rummikub.ts');
const {normalizeScene,createComponent}=await mod('shared/scene.ts');
const {emptyGameReadout,setReadoutValue}=await mod('shared/readouts/registry.ts');
const {RoomPublicBoard}=await mod('src/RoomEntry.tsx');
const {GameEssentials}=await mod('src/GameEssentials.tsx');
const packs=JSON.parse(readFileSync(join(root,'gamepacks/generated/game-essentials.json'),'utf8'));
const pack=(gid:string)=>effectiveRecognitionPack(packs.find((p:any)=>p.runtime.source.gameId===gid));
const photo=(privateOwner?:string)=>({id:privateOwner?'synthetic-private':'synthetic-public',kind:'photo',scope:privateOwner?'player':'public',ownerId:privateOwner,captureEpoch:'epoch',capturedAt:'now',url:'/synthetic-not-a-real-file.png',label:'합성 근거'});
const players=[{id:'p1',name:'합성 하나',color:'#3978bd'},{id:'p2',name:'합성 둘',color:'#e56b5d'}];
function session(p:any){return {id:'synthetic-audit',name:'합성 감사',createdAt:'now',updatedAt:'now',gamePackId:p.id,gamePackVersion:p.version,gamePack:p,captureEpoch:'epoch',turnInstanceId:'turn',stage:'capture',players:structuredClone(players),evidence:[photo(),photo('p1')],assertions:[],preservations:[],snapshots:[],notes:{},activity:[]} as any;}
const piece=(id:string,componentId:string,e=photo())=>({id,componentId,variant:null,quantity:null,label:id,anchor:'합성 위치',evidenceId:e.id,region:{x:.1,y:.2,width:.2,height:.3}});
const record=(...pieces:any[])=>({version:'game-component-record-v1',pieces});
const accepted=(s:any,f:string,o?:string)=>s.assertions.findLast((a:any)=>a.status==='accepted'&&a.field===f&&a.ownerId===o);
// JSON serialization of the same data members as the existing commit route. This is NOT an HTTP commit test.
function snapshot(s:any){const copy=JSON.parse(JSON.stringify(s));s.snapshots.push({id:'synthetic-saved',createdAt:'now',captureEpoch:s.captureEpoch,turnInstanceId:s.turnInstanceId,gamePackVersion:s.gamePackVersion,assertions:copy.assertions,evidence:copy.evidence,preservations:copy.preservations,notes:copy.notes});return JSON.parse(JSON.stringify(s));}
const checks:any[]=[];
function check(name:string,run:()=>any){const detail=run();checks.push({name,status:'VERIFIED',method:'executed pure frozen functions; synthetic data',...detail});}
check('Splendor purchased capture remains tray after existing apply path',()=>{
 const p=pack('splendor'),s=session(p),profile=captureProfile(p),e={...photo(),captureTarget:{version:1,gameId:'splendor',sourceSHA:profile.sourceSHA,areaId:'player'}};
 const r=record({...piece('synthetic-card','development',e),quantity:1,readout:{...emptySplendorObservation('development'),points:0,bonus:'blue',cost:{...unknownGemCounts(),red:0}}});
 assert.deepEqual(captureFields(p,[e],recognitionFields(p)).map((f:any)=>f.key),['__photo.public']);
 assert.throws(()=>genericCandidateValue(r,p,'player.scene',[e],'p1'));
 const value=genericCandidateValue(r,p,'__photo.public',[e]);answerField(s,p,'__photo.public',value);
 assert(!accepted(s,'player.scene','p1'));assert.deepEqual(accepted(s,'__photo.public').value,r);
 return {gameId:'splendor',allowedFields:['__photo.public'],existingApplyDestination:'__photo.public',createsPurchasedHoldings:false,createsBonusSummary:false};
});
check('chosen owner is representable and public snapshot/resume preserves typed identity/null/0',()=>{
 const p=pack('splendor'),s=session(p),r=record({...piece('card-1','development'),quantity:1,readout:{...emptySplendorObservation('development'),points:0,bonus:'blue',cost:{...unknownGemCounts(),red:0}}});
 answerField(s,p,'player.scene',r,'p1');let saved=snapshot(s);answerField(saved,p,'player.scene',record(),'p1');resumeSnapshot(saved,p,'public');
 assert.deepEqual(accepted(saved,'player.scene','p1').value,r);assert.deepEqual(accepted(saved,'player.scene','p1').evidenceIds,['synthetic-public']);
 return {gameId:'splendor',manualTarget:'player.scene/p1',preserved:['piece ID','readout','quantity','null versus 0','crop','evidence'],saveMethod:'synthetic JSON snapshot + real resumeSnapshot; no HTTP'};
});
check('owner-private destination works, private source cannot become public state',()=>{
 const p=pack('splendor'),s=session(p),r=record(piece('private-card','development',photo('p1')));
 const v=genericCandidateValue(r,p,'reserve.scene',[photo('p1')],'p1');answerField(s,p,'reserve.scene',v,'p1');
 assert.throws(()=>answerField(s,p,'player.scene',v,'p1'),/원본/);
 let saved=snapshot(s);answerField(saved,p,'reserve.scene',record(),'p1');resumeSnapshot(saved,p,'owner','p1');assert.deepEqual(accepted(saved,'reserve.scene','p1').value,r);
 return {gameId:'splendor',privateSourcePublicationRejected:true,privateRecordRestored:true};
});
check('public supply tokens have no dedicated public destination in current Splendor pack',()=>{
 const p=pack('splendor'),s=session(p),r=record({...piece('supply','chips'),quantity:3});
 const targets=p.runtime.fieldBindings.filter((b:any)=>b.editor==='component-catalog'&&b.componentIds.includes('chips')&&!b.key.startsWith('__photo'));
 assert.deepEqual(targets.map((b:any)=>[b.key,b.scope,b.visibility]),[['player.scene','player','public']]);
 for(const field of ['market.scene','noble-area.scene'])assert.throws(()=>answerField(s,p,field,r),/구성물/);
 return {gameId:'splendor',knownRole:'공급 / source description explicitly distinguishes supply from holdings',chipTargets:targets.map((b:any)=>b.key),publicSupplyTargetAbsent:true};
});
for(const [gameId,field,component] of [['wingspan','habitats.scene','birds'],['azul','pattern.scene','tiles'],['monopoly','ownership.scene','properties'],['scout','score.scene','tokens']])check(`${gameId}: inaccessible public/player photo destination but manual field roundtrip`,()=>{
 const p=pack(gameId),s=session(p),b=p.runtime.fieldBindings.find((b:any)=>b.key===field);assert(b);
 const id=b.componentIds.includes(component)?component:b.componentIds[0],r=record({...piece('instance-1',id),quantity:0},piece('instance-2',id));
 assert(!recognitionFields(p).some((f:any)=>f.key===field));assert(!recognitionFields(p,'p1').some((f:any)=>f.key===field));
 answerField(s,p,field,r,'p1');let saved=snapshot(s);answerField(saved,p,field,record(),'p1');resumeSnapshot(saved,p,'public');assert.deepEqual(accepted(saved,field,'p1').value,r);
 return {gameId,field,photoCannotTarget:true,manualTargetRoundtrip:true,duplicatesAndOrderPreserved:true,zeroAndUnknownPreserved:true};
});
check('Carcassonne manual owner/attachment exists within same record; partial move must respect relation',()=>{
 const p=pack('carcassonne'),s=session(p);
 let tile=emptyGameReadout(p,'tiles');tile=setReadoutValue(p,tile,'gridX',0);tile=setReadoutValue(p,tile,'gridY',0);
 let follower=emptyGameReadout(p,'followers');follower=setReadoutValue(p,follower,'owner','p1',{playerIds:['p1','p2']});follower=setReadoutValue(p,follower,'attachedTo',{pieceId:'tile',featureId:null});
 const r=record({...piece('tile','tiles'),readout:tile},{...piece('follower','followers'),readout:follower});answerField(s,p,'map.scene',r);
 assert.throws(()=>answerField(s,p,'supply.scene',record(r.pieces[1]),'p1'),/부착 대상/);
 let saved=snapshot(s);answerField(saved,p,'map.scene',record());resumeSnapshot(saved,p,'public');assert.deepEqual(accepted(saved,'map.scene').value,r);
 return {gameId:'carcassonne',manualOwnerAndAttachmentSaved:true,relationBreakingPartialMoveRejected:true};
});
check('room public/player content is server-visible but no readonly/public renderer path',()=>{
 const p=pack('wingspan'),s=session(p),r=record(piece('SYNTHETIC_PUBLIC_HOLDING','birds'));
 answerField(s,p,'habitats.scene',r,'p2');s.room={version:'room-v1',capacity:2,hostPlayerId:'p1',revisions:{public:0,roster:0,p1:0,p2:0},invite:{},members:[],createRequestId:'synthetic'};
 const view=roomView(s,p,{role:'member',playerId:'p1',revisions:{public:0,p1:0,roster:0}},new Set(),new Set());
 assert(accepted(view.session,'habitats.scene','p2'));
 const roomHTML=renderToStaticMarkup(React.createElement(RoomPublicBoard,{view}));
 assert(!roomHTML.includes('SYNTHETIC_PUBLIC_HOLDING'));
 const publicHTML=renderToStaticMarkup(React.createElement(GameEssentials,{view,busy:false,mutate:async()=>{},onEvidence(){}}));assert(!publicHTML.includes('SYNTHETIC_PUBLIC_HOLDING'));
 const ownView={...view,session:{...view.session,room:undefined},roomAccess:undefined};const singleHTML=renderToStaticMarkup(React.createElement(GameEssentials,{view:ownView,busy:false,mutate:async()=>{},onEvidence(){}}));assert(singleHTML.includes('SYNTHETIC_PUBLIC_HOLDING'));
 writeFileSync(`${out}/room-public-ssr.html`,roomHTML);
 return {gameId:'wingspan',retainedInServerView:true,renderedInRoomPublic:false,renderedInSingleDevicePublic:true,method:'actual React renderToStaticMarkup; no browser/CSS/click claims'};
});
check('native Rummikub owns rack independently from tile color; duplicate/order snapshot roundtrip',()=>{
 const p=pack('rummikub'),s=session(p),r=emptyRummikub('p1');r.groups=[{id:'rack-row',label:'합성 줄',tiles:[createRummikubTile('one',{color:'red',number:7}),createRummikubTile('two',{color:'red',number:7}),createRummikubTile('three',{color:'blue',number:13})]}];
 answerField(s,p,'rack.scene',r,'p1');let saved=snapshot(s);answerField(saved,p,'rack.scene',emptyRummikub('p1'),'p1');resumeSnapshot(saved,p,'owner','p1');assert.deepEqual(accepted(saved,'rack.scene','p1').value,r);
 return {gameId:'rummikub',preserved:['rack owner','physical duplicate IDs','7/13','group order','tile color']};
});
check('native Catan per-piece owner remains on public scene and survives snapshot/resume',()=>{
 const p=pack('catan'),s=session(p),scene=normalizeScene({version:2,coverage:'catalog',components:[]});scene.components.push(createComponent(scene,'road',{id:'road-one',ownerId:'p2',color:'#e56b5d',quantity:1,location:{type:'unplaced'}}));
 answerField(s,p,'components.observed',scene);let saved=snapshot(s);answerField(saved,p,'components.observed',normalizeScene({version:2,components:[]}));resumeSnapshot(saved,p,'public');assert.equal(accepted(saved,'components.observed').value.components[0].ownerId,'p2');
 return {gameId:'catan',perPieceOwnerRetained:true,method:'native model/answer/JSON snapshot/resume, not actual photo or browser'};
});
const result={baseline:manifest.sourceDigest,status:'PASS_CONFIRMED_BASELINE_GAPS',checks,checksCount:checks.length,networkCalls:0,AIcalls:0,StoreReads:0,originalPhotoReads:0,productWrites:0,notChecked:['HTTP/API handlers not executed','No actual DOM/CSS/mobile gesture/click evidence','No all-game commercial-rule or photo-accuracy certification']};
writeFileSync(`${out}/probe-results.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,checks:checks.length,networkCalls:0,AIcalls:0,productWrites:0}));
