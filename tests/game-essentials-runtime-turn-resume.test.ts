import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {factValue} from '../shared/catanSummary.ts';
import type {SessionView} from '../shared/types.ts';
const project=process.cwd(),bootstrap=await mkdtemp(path.join(os.tmpdir(),'kb-turn-bootstrap-'));process.chdir(bootstrap);
const {createApp}=await import('../server/index.ts');const {Store}=await import('../server/store.ts');process.chdir(project);await rm(bootstrap,{recursive:true,force:true});
async function fixture(){
 const directory=await mkdtemp(path.join(os.tmpdir(),'kb-turn-resume-')),store=new Store(directory,path.join(project,'public'));
 const server=(await createApp({store})).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const address=server.address();assert(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;
 async function call(route:string,method='GET',body?:unknown,token?:string):Promise<SessionView>{const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{'X-KeepBoard-Private-Token':token}:{})},body:body===undefined?undefined:JSON.stringify(body)});assert(response.ok,await response.clone().text());return response.json();}
 const view=await call('/api/sessions','POST',{gamePackId:'catan-base',players:[{id:'p1',name:'하나',color:'red'},{id:'p2',name:'둘',color:'blue'}]}),route=`/api/sessions/${view.session.id}`;
 async function unlock(owner:string){await call(`${route}/privacy/${owner}`,'PUT',{enabled:true,pin:'0007'});return (await call(`${route}/privacy/${owner}/unlock`,'POST',{pin:'0007'}) as unknown as {token:string}).token;}
 return {view,store,route,call,unlock,raw:()=>store.getSession(view.session.id),cleanup:async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(directory,{recursive:true,force:true});}};
}

test('public scoped restore activates saved phase/dice in questions and briefing without rewinding turn or private records',async()=>{
 const f=await fixture();try{
  const token=await f.unlock('p1');
  const photo=await f.call(f.route+'/evidence','POST',{scope:'public',dataUrl:'data:image/png;base64,aGVsbG8='});const source=photo.session.evidence[0];
  await f.call(f.route,'PATCH',{answers:[{field:'currentPlayer',value:'p1'},{field:'turn.phase',value:'build'},{field:'turn.diceTotal',value:8},{field:'turn.developmentCardBoughtThisTurn',value:true}]});
  await f.call(f.route,'PATCH',{answers:[{field:'player.development.boughtThisTurnType',ownerId:'p1',value:'knight'},{field:'player.development.purchaseBatches',ownerId:'p1',value:[{purchasedTurnId:f.view.session.turnInstanceId,counts:{knight:1}}]}]},token);
  // A temporal source with its original update timestamp/crop survives context rebinding.
  const session=(await f.raw())!,dice=session.assertions.find(a=>a.field==='turn.diceTotal')!;dice.evidenceIds=[source.id];dice.region={x:.1,y:.2,width:.2,height:.2};await f.store.saveSession(session);
  await f.call(f.route+'/commit','POST',{allowIncomplete:true});const saved=(await f.raw())!.snapshots.at(-1)!;
  await f.call(f.route+'/next-turn','POST',{playerId:'p2'});
  await f.call(f.route,'PATCH',{notes:{p1:'current private'},answers:[{field:'player.resources.counts',ownerId:'p1',value:{ore:3}}]},token);
  const before=(await f.raw())!,privateBefore=before.assertions.filter(a=>a.ownerId&&a.basis!=='rule');
  const restored=await f.call(f.route+'/resume','POST',{scope:'public'}),after=(await f.raw())!;
  assert.equal(after.turnInstanceId,before.turnInstanceId);assert.notEqual(after.captureEpoch,before.captureEpoch);assert.deepEqual(after.snapshots.at(-1),saved);
  assert.deepEqual(after.assertions.filter(a=>a.ownerId&&a.basis!=='rule'),privateBefore);assert.equal(after.notes.p1,'current private');
  assert.equal(factValue(restored.session,'turn.phase'),'build','restored phase must be an effective current fact');assert.equal(factValue(restored.session,'turn.diceTotal'),8);
  assert(!restored.questions.some(q=>['turn.phase','turn.diceTotal'].includes(q.field)));assert(restored.briefing.some(b=>b.field==='turn.phase'));assert(restored.briefing.some(b=>b.field==='turn.diceTotal'&&b.text.includes('8')));
  const restoredDice=after.assertions.find(a=>a.id===dice.id)!;assert.equal(restoredDice.updatedAt,dice.updatedAt);assert.deepEqual(restoredDice.region,dice.region);assert.deepEqual(restoredDice.evidenceIds,[source.id]);assert(after.evidence.some(e=>e.id===source.id));
  const compared=await f.call(f.route,'PATCH',{answers:[{field:'turn.diceTotal',value:9}]});assert(compared.differences.some(d=>d.field==='turn.diceTotal'&&d.expected===8&&d.observed===9),'saved turn remains the comparison baseline without changing snapshot tags');
  assert.equal(after.assertions.find(a=>a.field==='player.development.boughtThisTurnType')!.turnInstanceId,saved.turnInstanceId);assert(!after.assertions.some(a=>a.field==='player.development.newActionCardUnavailableThisTurn'),'old purchases must not become current purchases');
 }finally{await f.cleanup();}
});

test('owner scoped restore activates only that owners saved turn state, preserving public/other owner and purchase history',async()=>{
 const f=await fixture();try{
  const first=await f.unlock('p1'),second=await f.unlock('p2');
  await f.call(f.route,'PATCH',{answers:[{field:'turn.phase',value:'setup'},{field:'setup.round',value:2}]});
  const photo=await f.call(f.route+'/evidence','POST',{scope:'player',ownerId:'p1',dataUrl:'data:image/png;base64,aGVsbG8='},first);const source=photo.session.evidence.find(e=>e.ownerId==='p1')!;
  await f.call(f.route,'PATCH',{answers:[{field:'setup.startingResourcesResolvedByPlayer',ownerId:'p1',value:true},{field:'player.development.boughtThisTurnType',ownerId:'p1',value:'knight'},{field:'player.development.purchaseBatches',ownerId:'p1',value:[{purchasedTurnId:f.view.session.turnInstanceId,counts:{knight:1}}]}]},first);
  const s=(await f.raw())!,state=s.assertions.find(a=>a.field==='setup.startingResourcesResolvedByPlayer')!;state.evidenceIds=[source.id];state.region={x:.1,y:.1,width:.2,height:.2};await f.store.saveSession(s);
  await f.call(f.route+'/commit','POST',{allowIncomplete:true});const saved=(await f.raw())!.snapshots.at(-1)!;
  await f.call(f.route+'/next-turn','POST',{playerId:'p2'});
  await f.call(f.route,'PATCH',{answers:[{field:'turn.phase',value:'setup'},{field:'setup.round',value:2}]});
  await f.call(f.route,'PATCH',{answers:[{field:'setup.startingResourcesResolvedByPlayer',ownerId:'p2',value:false}]},second);
  const before=(await f.raw())!,untouched=before.assertions.filter(a=>a.ownerId!=='p1'&&a.basis!=='rule');
  const restored=await f.call(f.route+'/resume','POST',{scope:'owner',ownerId:'p1'},first),after=(await f.raw())!;
  assert.equal(after.turnInstanceId,before.turnInstanceId);assert.equal(after.captureEpoch,before.captureEpoch);assert.deepEqual(after.snapshots.at(-1),saved);assert.deepEqual(after.assertions.filter(a=>a.ownerId!=='p1'&&a.basis!=='rule'),untouched);
  assert.equal(factValue(restored.session,'setup.startingResourcesResolvedByPlayer','p1'),true,'restored owner state must participate in current questions');
  assert(!restored.questions.some(q=>q.ownerId==='p1'&&q.field==='setup.startingResourcesResolvedByPlayer'));assert(restored.briefing.some(b=>b.ownerId==='p1'&&b.field==='setup.startingResourcesResolvedByPlayer'));
  const restoredState=after.assertions.find(a=>a.id===state.id)!;assert.equal(restoredState.updatedAt,state.updatedAt);assert.deepEqual(restoredState.region,state.region);assert(after.evidence.some(e=>e.id===source.id));
  const purchase=after.assertions.find(a=>a.field==='player.development.boughtThisTurnType'&&a.ownerId==='p1')!;assert.equal(purchase.turnInstanceId,saved.turnInstanceId);assert.equal((factValue(restored.session,'player.development.purchaseBatches','p1') as any[])[0].purchasedTurnId,saved.turnInstanceId);
 }finally{await f.cleanup();}
});

test('restore does not revive already-stale state, retag candidates or rewrite session purchase/history tags',async()=>{
 const {resumeSnapshot}=await import('../server/runtimeResume.ts');const {catanPack}=await import('../gamepacks/catan.ts');
 const {view}=await (async()=>{const f=await fixture();try{return {view:f.view};}finally{await f.cleanup();}})();
 const session=structuredClone(view.session),at='original-update';session.turnInstanceId='current';
 const make=(id:string,field:string,turnInstanceId:string,status:'accepted'|'candidate'='accepted')=>({id,field,turnInstanceId,status,value:8,basis:'user' as const,evidenceIds:[],updatedAt:at});
 const values=[make('valid','turn.diceTotal','saved'),make('stale','turn.phase','older'),make('candidate','turn.pendingEffect','saved','candidate'),make('history','rulesProfile','saved')];
 session.snapshots=[{id:'snapshot',createdAt:at,captureEpoch:'saved-epoch',turnInstanceId:'saved',gamePackVersion:view.pack.version,assertions:values,evidence:[],preservations:[],notes:{}}];const original=structuredClone(session.snapshots);
 resumeSnapshot(session,catanPack,'public');assert.equal(session.assertions.find(a=>a.id==='valid')!.turnInstanceId,'current');assert.equal(session.assertions.find(a=>a.id==='stale')!.turnInstanceId,'older');assert.equal(session.assertions.find(a=>a.id==='candidate')!.turnInstanceId,'saved');assert.equal(session.assertions.find(a=>a.id==='candidate')!.status,'candidate');
 assert.equal(session.assertions.find(a=>a.id==='history')!.turnInstanceId,'saved');assert.deepEqual(session.snapshots,original);assert(session.assertions.every(a=>a.updatedAt===at));assert.equal(session.turnInstanceId,'current');
});
