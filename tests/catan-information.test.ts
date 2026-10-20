import test from 'node:test';
import assert from 'node:assert/strict';
import { catanPack } from '../gamepacks/catan.ts';
import { answerField, nextTurn, recompute, validateValue } from '../server/engine.ts';
import { compareStateValues } from '../server/compare.ts';
import { normalizeObservations } from '../server/ai/index.ts';
import { observationPrompt } from '../server/ai/prompt.ts';
import { sceneObservationInstructions } from '../server/ai/scenePrompt.ts';
import { CATAN_TOPOLOGY, COASTAL_EDGES, coastalEdge, createComponent, harborPoint, normalizeScene, sceneJSONSchema, type ComponentScene, type SceneComponent } from '../shared/scene.ts';
import { toComponentScene } from '../shared/sceneBridge.ts';
import { inspectCatanPlacement } from '../shared/catanPlacement.ts';
import { moveSceneComponent } from '../shared/sceneMoves.ts';
import { canonicalBoard, catanNextProcedure, countSummary, DEVELOPMENTS, factValue, harborAccess, inspectTrade, playerSummary, RESOURCES, tradeRates, tradeRemaining, visibleAssertion, type TradeRecord } from '../shared/catanSummary.ts';
import { derivePhotoTargets } from '../src/presentation.ts';
import type { Evidence, Session, Value } from '../shared/types.ts';

const empty:ComponentScene={version:2,coverage:'partial',coverageByLayer:{},components:[]};
const player=(id:string,color:string)=>({id,name:id,color});
function session():Session{return {id:'synthetic',name:'Synthetic Catan',createdAt:'2026-10-20',updatedAt:'2026-10-20',gamePackId:catanPack.id,gamePackVersion:catanPack.version,gamePack:structuredClone(catanPack),captureEpoch:'epoch',turnInstanceId:'turn-one',stage:'questions',players:[player('red','red'),player('blue','blue'),player('white','white'),player('gold','gold')],evidence:[],assertions:[],preservations:[],snapshots:[],notes:{},activity:[],example:false};}
const put=(s:Session,key:string,value:unknown,owner?:string)=>answerField(s,s.gamePack!,key,value as Value,owner);
const c=(id:string,kind:SceneComponent['kind'],location:SceneComponent['location'],patch:Partial<SceneComponent>={})=>createComponent(empty,kind,{id,location,quantity:1,...patch});
const e=COASTAL_EDGES.find(edge=>edge.aliases.includes('r1c1.NW'))!;
const other=COASTAL_EDGES.find(edge=>!edge.vertexIds.some(id=>e.vertexIds.includes(id)))!;
const harbor=(id:string,edgeId=e.id,variant:string|null='generic',ratio:number|null=3)=>c(id,'harbor',{type:'edge',id:edgeId},{variant,ratio,ownerId:null});
const building=(id:string,vertexId=e.vertexIds[0],kind:'settlement'|'city'='settlement',ownerId='red')=>c(id,kind,{type:'vertex',id:vertexId},{ownerId});
const board=(s:Session,components:SceneComponent[],coverage:ComponentScene['coverageByLayer']={buildings:'complete',roads:'complete',harbors:'partial'})=>put(s,'board.layout',{...empty,components,coverageByLayer:coverage});
function turn(s:Session){put(s,'currentPlayer','red');put(s,'rulesProfile','base-6e-2025');put(s,'tradeBuildMode','combined');put(s,'turn.phase','action');put(s,'turn.pendingEffect','none');}
const trade=(patch:Partial<TradeRecord>={}):TradeRecord=>({kind:'bank',playerId:'red',give:{lumber:2},receive:{ore:1},status:'in_progress',given:{lumber:2},received:{ore:0},...patch});

test('02: incomplete private resources never become an exact public total; zero and preserved bundles remain distinct',()=>{
 const s=session();put(s,'player.resources.counts',{lumber:2,brick:null,wool:null,grain:null,ore:null},'red');
 assert.equal(playerSummary(s,'red').resourceTotal.value,null);assert.equal(playerSummary(s,'red').resourceTotal.known,2);
 put(s,'player.resources.total',7,'red');assert.equal(playerSummary(s,'red').resourceTotal.value,7);
 assert.equal(countSummary({lumber:0,brick:0,wool:0,grain:0,ore:0},RESOURCES).value,0);
 let view=recompute(s,s.gamePack!);assert(view.questions.some(q=>q.field==='player.resources.counts'&&q.ownerId==='red'));
 s.preservations.find(p=>p.id==='red:player-resource-hands')!.packed=true;view=recompute(s,s.gamePack!);
 assert(!view.questions.some(q=>q.field==='player.resources.counts'&&q.ownerId==='red'));assert.equal(playerSummary(s,'red').resources.value,null);
 put(s,'player.resources.counts',{lumber:2,brick:0,wool:0,grain:0,ore:0},'red');assert.equal(playerSummary(s,'red').resourceTotal.status,'conflict');
 assert.throws(()=>put(s,'player.resources.counts',{lumber:-1},'red'));assert.throws(()=>put(s,'player.resources.counts',{lumber:1.5},'red'));
});

test('03: two settlements, one city and one held title give public six; private two VP gives owner eight only',()=>{
 const s=session();board(s,[building('a'),building('b',other.vertexIds[0]),building('city',COASTAL_EDGES[12].vertexIds[0],'city')]);
 put(s,'awards.longestRoadHolder','red');put(s,'awards.largestArmyHolder','none');
 put(s,'player.development.handCounts',Object.fromEntries(DEVELOPMENTS.map(k=>[k,k==='victory-point'?2:0])),'red');
 assert.equal(playerSummary(s,'red').publicScore.value,6);assert.equal(playerSummary(s,'red').totalScore.value,8);
 put(s,'awards.largestArmyHolder',null);assert.equal(playerSummary(s,'red').publicScore.value,null);
 assert.equal(playerSummary(s,'red').inventory.road.value,null,'supply minus observation is not confirmed stock');
 put(s,'physical.standardSupplyConfirmed',true);assert.equal(playerSummary(s,'red').inventory.road.value,15);
});

test('04: harbor uses exactly the two coast endpoints; a road alone grants nothing, road and harbor coexist',()=>{
 assert.equal(COASTAL_EDGES.length,30);assert.equal(new Set(COASTAL_EDGES.flatMap(e=>e.vertexIds)).size,30);
 const h=harbor('h'),road=c('road','road',{type:'edge',id:e.id},{ownerId:'red'});
 const onlyRoad={...empty,components:[h,road]};assert.equal(harborAccess(onlyRoad,'red').length,0);
 for(const endpoint of e.vertexIds)assert.equal(harborAccess({...onlyRoad,components:[...onlyRoad.components,building('b',endpoint)]},'red').length,1);
 const inland=CATAN_TOPOLOGY.vertices.find(v=>!e.vertexIds.includes(v.id))!;
 assert.equal(harborAccess({...onlyRoad,components:[h,road,building('b',inland.id)]},'red').length,0);
 assert.equal(moveSceneComponent({...onlyRoad,components:[h,road]},'road',{type:'edge',id:other.id}).status,'moved');
 assert.deepEqual(coastalEdge('r1c1.NW')!.vertexIds,e.vertexIds);assert(harborPoint(e.id));
});

test('05: atomic harbor swap changes only two harbor locations; the before scene is a one-step undo snapshot',()=>{
 const a=harbor('a'),b=harbor('b',other.id,'lumber',2),road=c('road','road',{type:'edge',id:e.id},{ownerId:'blue'}),terrain=c('tile','terrain',{type:'hex',id:'r1c1'},{number:6,evidenceId:'photo',region:{x:.1,y:.1,width:.2,height:.2}});
 const before={...empty,components:[a,b,road,terrain,building('house')]};const original=JSON.stringify(before);
 const result=moveSceneComponent(before,'a',b.location);assert.equal(result.status,'swapped');assert.equal(result.changedIds.length,2);
 assert.deepEqual(result.scene.components.find(c=>c.id==='a')?.location,b.location);assert.deepEqual(result.scene.components.slice(2),before.components.slice(2));assert.equal(JSON.stringify(before),original);
 const inland=CATAN_TOPOLOGY.edges.find(edge=>edge.hexIds.length===2)!;
 const blocked=moveSceneComponent(before,'a',{type:'edge',id:inland.id});assert.equal(blocked.status,'rejected');assert.equal(blocked.canRecordOriginal,true);
 assert.equal(moveSceneComponent(before,'a',{type:'edge',id:inland.id},{intent:'correct'}).status,'moved');
 assert(inspectCatanPlacement(moveSceneComponent(before,'a',{type:'edge',id:inland.id},{intent:'correct'}).scene).some(i=>i.code==='harbor-location'));
});

test('06: specialized two and generic three choose the minimum per given resource, never mixed resources or city one-to-one',()=>{
 const s=session();turn(s);board(s,[harbor('wood',e.id,'lumber',2),building('wood-house'),harbor('generic',other.id),building('generic-city',other.vertexIds[0],'city')]);
 const rates=tradeRates(canonicalBoard(s).scene,'red').rates;assert.equal(rates.lumber.ratio,2);assert.equal(rates.wool.ratio,3);
 assert(inspectTrade(s,trade()).validRatio);assert(inspectTrade(s,trade({give:{wool:3},receive:{grain:1}})).validRatio);
 assert(!inspectTrade(s,trade({give:{lumber:2,brick:1}})).validRatio);
 board(s,[harbor('wood',e.id,'lumber',2),building('wood-city',e.vertexIds[0],'city')]);assert.equal(tradeRates(canonicalBoard(s).scene,'red').rates.wool.ratio,4);
 assert(!inspectTrade(s,trade({give:{wool:2}})).validRatio);
 assert(!inspectTrade(s,trade({give:{lumber:1},receive:{ore:1}})).validRatio);
});

test('07: nineteen terrain cells and three visible ports do not generate the six unseen ports or exact best rates',()=>{
 const s=session();const tiles=CATAN_TOPOLOGY.hexes.map((h,i)=>c('tile'+i,'terrain',{type:'hex',id:h.id},{variant:'forest'}));
 const observed=normalizeScene({version:2,coverage:'full',components:[...tiles,harbor('a'),harbor('b',other.id),harbor('c',COASTAL_EDGES[12].id)]});
 put(s,'board.layout',observed);assert.equal(canonicalBoard(s).scene.components.filter(c=>c.kind==='harbor').length,3);assert.equal(playerSummary(s,'red').rates.complete,false);
 observed.coverageByLayer={harbors:'complete',buildings:'complete'};put(s,'board.layout',observed);assert.equal(playerSummary(s,'red').rates.complete,false,'contradictory complete marker cannot certify missing ports');assert(inspectCatanPlacement(observed).some(i=>i.code==='harbor-count'));
 const candidate={...structuredClone(s.assertions[0]),status:'candidate' as const,value:{...observed,components:[]} as unknown as Value};s.assertions.push(candidate);
 assert.equal(canonicalBoard(s).scene.components.length,22,'candidate is not the summary baseline');
 put(s,'components.observed',observed);assert.equal(canonicalBoard(s).scene.components.length,22,'partial catalog is never added again');
});

test('08: edition-specific action/trade guidance differs while a pinned 2020 pack is not rewritten',()=>{
 const s=session();turn(s);assert(inspectTrade(s,trade()).messages.some(m=>m.includes('건설 후에도')));
 put(s,'rulesProfile','base-2020');put(s,'tradeBuildMode','separate');put(s,'turn.phase','build');assert(inspectTrade(s,trade()).messages.some(m=>m.includes('다음 자기 턴')));
 assert(catanNextProcedure(s).includes('다음 자기 턴'));
 const old=structuredClone(catanPack);old.version='1.2.0';old.edition='Base Game (2020 rules)';s.gamePack=old;s.gamePackVersion=old.version;const frozen=JSON.stringify(old);recompute(s,old);assert.equal(JSON.stringify(s.gamePack),frozen);assert.equal(s.gamePackVersion,'1.2.0');
});

test('09: before-roll knight asks no seven discard, preserves return phase, and nine minus two already discarded leaves explicit two',()=>{
 const s=session();turn(s);put(s,'turn.phase','await_roll');let view=recompute(s,s.gamePack!);assert(view.questions.some(q=>q.field==='turn.actionDevelopmentCardPlayed'));
 put(s,'turn.actionDevelopmentCardPlayed',true);put(s,'robber.cause','knight');put(s,'turn.returnPhase','await_roll');put(s,'turn.phase','robber_move');put(s,'turn.pendingEffect','knight');
 view=recompute(s,s.gamePack!);assert(!view.questions.some(q=>q.field==='turn.sevenDiscardsResolved'||q.field==='player.discard.remainingCount'));assert(catanNextProcedure(s).includes('버리기 없음'));assert(catanNextProcedure(s).includes('주사위 굴리기'));
 put(s,'robber.cause','seven');put(s,'turn.phase','seven_discard');put(s,'player.resources.total',7,'red');put(s,'player.discard.remainingCount',2,'red');assert(catanNextProcedure(s).includes('red: 2장 남음'));
 put(s,'turn.phase','production');put(s,'turn.productionResolved',true);assert(!recompute(s,s.gamePack!).questions.some(q=>q.field==='turn.diceTotal'));put(s,'turn.productionResolved',false);assert(recompute(s,s.gamePack!).questions.some(q=>q.field==='turn.diceTotal'));
});

test('10: purchases are a subset of unused hand; new turn expires restriction, never deletes held identities or adds again',()=>{
 const s=session();turn(s);const counts=Object.fromEntries(DEVELOPMENTS.map(k=>[k,k==='knight'?2:0]));put(s,'player.development.handCounts',counts,'red');put(s,'player.development.purchaseBatches',[{purchasedTurnId:s.turnInstanceId,counts:{knight:1}}],'red');put(s,'player.development.boughtThisTurnIdentity','Knight','red');put(s,'player.development.knightsPlayed',3,'red');
 assert.equal(playerSummary(s,'red').development.value,2);put(s,'player.development.purchaseBatches',[{purchasedTurnId:s.turnInstanceId,counts:{knight:3}}],'red');assert.equal(playerSummary(s,'red').purchaseWarnings.length,1);nextTurn(s,s.gamePack!,'blue');assert.deepEqual(factValue(s,'player.development.handCounts','red'),counts);assert.equal(factValue(s,'player.development.boughtThisTurnIdentity','red'),'Knight');assert.equal(playerSummary(s,'red').development.value,2);assert.equal(playerSummary(s,'red').knights,3);
 const batches=factValue(s,'player.development.purchaseBatches','red') as Value[];assert.notEqual((batches[0] as Record<string,Value>).purchasedTurnId,s.turnInstanceId);
});

test('11: mid-trade continuation requests only unreceived ore; opening calculator and recomputing never subtract hands',()=>{
 const s=session();turn(s);put(s,'player.resources.counts',{lumber:3,brick:0,wool:0,grain:0,ore:0},'red');put(s,'turn.trade',trade());const before=JSON.stringify(s.assertions.filter(a=>a.field==='player.resources.counts'));
 assert.deepEqual(tradeRemaining(trade()),['수령 · 광석 1장 남음']);assert(catanNextProcedure(s).includes('광석 1장 남음'));inspectTrade(s,trade());recompute(s,s.gamePack!);assert.equal(JSON.stringify(s.assertions.filter(a=>a.field==='player.resources.counts')),before);
 assert.deepEqual(tradeRemaining(trade({status:'completed'})),[]);
});

test('12: setup questions replace routine action input; actual illegal adjacent villages remain stored with warnings',()=>{
 const s=session();put(s,'turn.phase','setup');put(s,'setup.round',2);put(s,'setup.step','starting_resources');const view=recompute(s,s.gamePack!);
 assert(view.questions.some(q=>q.field==='setup.startingResourcesResolvedByPlayer'));assert(!view.questions.some(q=>q.field==='turn.diceTotal'||q.field==='turn.actionDevelopmentCardPlayed'));
 const a=e.vertexIds[0],b=e.vertexIds[1];board(s,[building('a',a),building('b',b)]);assert.equal(canonicalBoard(s).scene.components.length,2);assert(inspectCatanPlacement(canonicalBoard(s).scene).some(i=>i.code==='building-distance'));
});

test('13: tied road lengths do not transfer title; public display selectors exclude private card identities and points',()=>{
 const s=session();put(s,'player.road.longestContinuousSegments',5,'red');put(s,'player.road.longestContinuousSegments',5,'blue');put(s,'awards.longestRoadHolder','red');put(s,'player.development.handCounts',{knight:2,'victory-point':2},'red');put(s,'player.score.hiddenVictoryPoints',2,'red');
 const view=recompute(s,s.gamePack!);assert.equal(factValue(s,'awards.longestRoadHolder'),'red');const publicBrief=view.briefing.filter(b=>visibleAssertion(s,s.gamePack!,undefined,{field:b.field!,ownerId:b.ownerId}));assert(!publicBrief.some(b=>b.field==='player.score.hiddenVictoryPoints'||b.field==='player.development.handCounts'));
 const targets=derivePhotoTargets(view);assert(!targets.some(t=>['player.score.hiddenVictoryPoints','player.development.handCounts'].includes(t.field.key)));assert(targets.some(t=>t.field.key==='player.road.longestContinuousSegments'));
 put(s,'awards.longestRoadHolder',null);recompute(s,s.gamePack!);assert.equal(factValue(s,'awards.longestRoadHolder'),undefined);
});

test('14: v1 and legacy harbor read without guessed ratio; v2 round-trip preserves port state and ignores only source crop changes',()=>{
 const old=toComponentScene({version:1,coverage:'full',components:[c('tile','terrain',{type:'hex',id:'r1c1'},{number:6})]});assert.equal(old.coverageByLayer?.harbors,undefined);
 const migrated=normalizeScene({version:1,coverage:'partial',components:[{...harbor('h'),kind:'token',variant:'harbor',ratio:3,evidenceId:'photo',region:{x:.1,y:.2,width:.2,height:.3}}]});assert.equal(migrated.components[0].kind,'harbor');assert.equal(migrated.components[0].variant,null);assert.equal(migrated.components[0].ratio,null);assert.equal(migrated.components[0].evidenceId,'photo');
 const scene=normalizeScene({version:2,coverage:'partial',coverageByLayer:{harbors:'partial'},components:[harbor('h',e.id,'lumber',2)]});const restored=toComponentScene(JSON.parse(JSON.stringify(scene)));assert.deepEqual(restored,scene);
 const field=catanPack.fields.find(f=>f.key==='board.layout')!;restored.components[0].region={x:.2,y:.2,width:.1,height:.1};restored.components[0].evidenceId='new-photo';assert(compareStateValues(field,scene as unknown as Value,restored as unknown as Value));restored.components[0].ratio=3;assert(!compareStateValues(field,scene as unknown as Value,restored as unknown as Value));
 assert(sceneJSONSchema.properties.components.items.properties.kind.enum.includes('harbor'));
});

test('public photo may propose only explicitly public player-owned fields with a known owner; harbor model contract preserves uncertainty',()=>{
 const s=session(),evidence:Evidence[]=[{id:'photo',url:'/test.png',label:'synthetic',capturedAt:'now',captureEpoch:'epoch',scope:'public',kind:'photo'}];
 const output=normalizeObservations({assertions:[{field:'player.resources.total',ownerId:'red',value:7,evidenceIds:['photo']},{field:'player.development.handCounts',ownerId:'red',value:{knight:2},evidenceIds:['photo']},{field:'player.resources.total',ownerId:'unknown',value:9,evidenceIds:['photo']}]},s.gamePack!,evidence,s.turnInstanceId,s.players.map(p=>p.id));
 assert.equal(output.assertions.length,1);assert.equal(output.assertions[0].ownerId,'red');assert.equal(output.assertions[0].field,'player.resources.total');
 assert.match(observationPrompt(s,s.gamePack!,evidence),/visibility=public/);assert.match(sceneObservationInstructions(s.gamePack!),/HARBORS \(version 2\)/);
});

test('public player total keeps its scalar value while private-photo reasons and crops stay owner-only',()=>{
 const s=session();s.evidence=[{id:'private',url:'/private.jpg',label:'private',kind:'photo',scope:'player',ownerId:'red',captureEpoch:'epoch',capturedAt:'now'}];put(s,'player.resources.total',7,'red');const a=s.assertions.find(a=>a.field==='player.resources.total')!;a.reason='private hand has hidden material counts';a.evidenceIds=['private'];a.region={x:.1,y:.1,width:.2,height:.2};
 const view=recompute(s,s.gamePack!);const publicTarget=derivePhotoTargets(view).find(t=>t.field.key==='player.resources.total'&&t.ownerId==='red')!;assert.equal(publicTarget.accepted?.value,7);assert.equal(publicTarget.accepted?.reason,undefined);assert.deepEqual(publicTarget.accepted?.evidenceIds,[]);assert.equal(publicTarget.locations.length,0);
 const ownTarget=derivePhotoTargets(view,'red').find(t=>t.field.key==='player.resources.total')!;assert.equal(ownTarget.accepted?.reason,a.reason);assert.equal(ownTarget.locations[0].evidence.id,'private');
 put(s,'player.resources.counts',{lumber:0},'red');const publicCalc=inspectTrade(s,trade());assert(!publicCalc.messages.some(m=>m.includes('손패가 부족')));assert(inspectTrade(s,trade(),'red').messages.some(m=>m.includes('손패가 부족')));
});

test('legacy group=turn purchase identities are retained without silently adding them to old existing-card counts',()=>{
 const s=session();s.gamePack!.version='1.2.0';s.gamePack!.edition='Base Game (2020 rules)';for(const f of s.gamePack!.fields){delete f.lifetime;delete f.ui;delete f.visibility;}
 put(s,'player.development.handCounts',{knight:1},'red');put(s,'player.development.boughtThisTurnType','knight','red');put(s,'player.development.boughtThisTurnIdentity','Known newly bought Knight','red');nextTurn(s,s.gamePack!,'blue');assert.deepEqual(factValue(s,'player.development.handCounts','red'),{knight:1});assert.equal(factValue(s,'player.development.boughtThisTurnIdentity','red'),'Known newly bought Knight');assert.equal(s.gamePack!.version,'1.2.0');
});
