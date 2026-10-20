import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/index.ts';
import { Store } from '../server/store.ts';
import { CATAN_TOPOLOGY, COASTAL_EDGES } from '../shared/scene.ts';
import { catanNextProcedure, factValue, playerSummary } from '../shared/catanSummary.ts';
import type { SessionView } from '../shared/types.ts';

test('harbor, purchase subset and mid-trade save/export/import/resume retain exact state; next turn clears only turn restrictions',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'keepboard-catan-v2-'));
 const server=(await createApp({store:new Store(directory)})).listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address();assert(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;
 const call=async(route:string,method='GET',body?:unknown)=>{const response=await fetch(base+route,{method,...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});const result=await response.json();assert(response.ok,JSON.stringify(result));return result;};
 try {
  let view:SessionView=await call('/api/sessions','POST',{name:'Synthetic v2'});const route=`/api/sessions/${view.session.id}`;assert.equal(factValue(view.session,'rulesProfile'),'base-6e-2025');assert.equal(view.pack.version,'2.0.0');
  const edge=COASTAL_EDGES[0];
  const common={quantity:1,ownerId:null,region:null,evidenceId:null,variant:null};
  const board={version:2,coverage:'full',coverageByLayer:{terrain:'complete',buildings:'complete',roads:'complete',harbors:'partial'},components:[...CATAN_TOPOLOGY.hexes.map((h,i)=>({...common,id:'tile'+i,kind:'terrain',variant:i===9?'desert':'forest',location:{type:'hex',id:h.id}})),{...common,id:'wood-port',kind:'harbor',variant:'lumber',ratio:2,location:{type:'edge',id:edge.id}},{...common,id:'red-village',kind:'settlement',ownerId:'red',location:{type:'vertex',id:edge.vertexIds[0]}},{...common,id:'robber',kind:'robber',location:{type:'hex',id:'r3c3'}}]};
  const counts={knight:2,'road-building':0,'year-of-plenty':0,monopoly:0,'victory-point':0};
  const trade={kind:'bank',playerId:'red',harborId:'wood-port',give:{lumber:2},receive:{ore:1},status:'in_progress',given:{lumber:2},received:{ore:0}};
  view=await call(route,'PATCH',{answers:[{field:'board.layout',value:board},{field:'currentPlayer',value:'red'},{field:'turn.phase',value:'action'},{field:'turn.pendingEffect',value:'trade'},{field:'turn.pendingEffectDetails',value:'광석 수령 대기'},{field:'turn.trade',value:trade},{field:'player.development.handCounts',ownerId:'red',value:counts},{field:'player.development.purchaseBatches',ownerId:'red',value:[{purchasedTurnId:view.session.turnInstanceId,counts:{knight:1},preservationId:'red:newly-bought-development-card'}]}]});
  assert.equal(playerSummary(view.session,'red').rates.rates.lumber.ratio,2);assert.equal(playerSummary(view.session,'red').development.value,2);
  view=await call(route+'/commit','POST',{allowIncomplete:true});const savedTurn=view.session.turnInstanceId;
  await call(route,'PATCH',{answers:[{field:'turn.trade',value:{...trade,status:'completed'}}]});
  view=await call(route+'/resume','POST',{});assert.equal(view.session.turnInstanceId,savedTurn);assert.deepEqual(factValue(view.session,'board.layout'),board);assert.deepEqual(factValue(view.session,'turn.trade'),trade);assert.match(catanNextProcedure(view.session),/광석 1장 남음/);assert(view.briefing.some(b=>b.field==='resume.nextProcedure'&&b.text.includes('광석 1장 남음')));
  const exported=await call(route+'/export');const imported:SessionView=await call('/api/sessions/import','POST',exported);assert.equal(imported.pack.version,'2.0.0');assert.deepEqual(factValue(imported.session,'board.layout'),board);assert.equal(playerSummary(imported.session,'red').rates.rates.lumber.ratio,2);
  view=await call(route+'/next-turn','POST',{playerId:'blue'});assert.equal(factValue(view.session,'turn.trade'),undefined);assert.deepEqual(factValue(view.session,'player.development.handCounts','red'),counts);assert.equal((factValue(view.session,'player.development.purchaseBatches','red') as any[])[0].purchasedTurnId,savedTurn);assert.equal(factValue(view.session,'rulesProfile'),'base-6e-2025');
 } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(directory,{recursive:true,force:true});}
});
