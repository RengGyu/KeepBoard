import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type {GenericRecord} from '../shared/genericRecord.ts';
import type {SessionView} from '../shared/types.ts';
import {realFreeLayoutVariant,realSlotLayoutVariant} from '../src/realBoards.ts';

const project=process.cwd(),root=await mkdtemp(path.join(os.tmpdir(),'kb-free-board-api-'));
// Import in an empty directory: do not load the workspace's .env or real Store.
process.env.KEEPBOARD_DATA_DIR=root;
for(const key of Object.keys(process.env))if(/API_KEY|KEY_FILE|AI_GATEWAY|AI_ALIAS/.test(key))delete process.env[key];
process.chdir(root);
const {createApp}=await import('../server/index.ts');
const {Store}=await import('../server/store.ts');
const {emptyGameReadout,setReadoutValue}=await import('../shared/readouts/registry.ts');
process.chdir(project);

test('dedicated free coordinates and legacy positions save/reopen independently for two owners on supported game boards',async()=>{
 const app=await createApp({store:new Store(root,path.join(project,'public'))});
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const origin=`http://127.0.0.1:${(server.address()as {port:number}).port}`;
 async function call(route:string,method='GET',body?:unknown){
  const r=await fetch(origin+route,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
  return {status:r.status,body:await r.json()as any};
 }
 const record=(id:string,componentId:string,areaId:string,tagged:boolean,quantity:number|null):GenericRecord=>({
  version:'game-component-record-v1',pieces:[{id,componentId,variant:null,quantity,
   label:'합성 저장 검수',anchor:'기존 메모',evidenceId:null,region:null,
   placement:{areaId,x:.27,y:.71,rotation:90,...(tagged?{layoutVariant:realFreeLayoutVariant()}: {})}}]
 });
 try{
  for(const [game,field,component,area]of [
   ['seven-wonders-duel','city.scene','cards','city'],
   ['seven-wonders','city.scene','age-cards','city'],
   ['race-for-the-galaxy','tableau.scene','cards','tableau'],
   ['castles-burgundy','duchy.scene','hexes','duchy']
  ]){
   const created=await call('/api/sessions','POST',{gamePackId:game,players:[{id:'p1',name:'하나',color:'red'},{id:'p2',name:'둘',color:'blue'},...(game==='castles-burgundy'?[{id:'p3',name:'셋',color:'green'}]:[])]});
   assert.equal(created.status,201);const view=created.body as SessionView,prefix=`/api/sessions/${view.session.id}`;
   const legacy=record('old-position',component,area,false,null),other=record('other-owner',component,area,true,0);
   const frame=game==='castles-burgundy'?realSlotLayoutVariant('burgundy-special-record-v1'):realFreeLayoutVariant();
   other.pieces[0].placement!.layoutVariant=frame;
   assert.equal((await call(prefix,'PATCH',{answers:[{field,ownerId:'p1',value:legacy},{field,ownerId:'p2',value:other}]})).status,200);
   assert.equal((await call(prefix+'/commit','POST',{allowIncomplete:true})).status,200);
   const moved=structuredClone(legacy);moved.pieces[0].placement={areaId:area,x:game==='castles-burgundy'?.196:.42,y:game==='castles-burgundy'?.655:.68,rotation:270,layoutVariant:frame};
   assert.equal((await call(prefix,'PATCH',{answers:[{field,ownerId:'p1',value:moved}]})).status,200);
   assert.equal((await call(prefix+'/commit','POST',{allowIncomplete:true})).status,200);
   const reopened=(await call(prefix)).body as SessionView;
   const accepted=(owner:string)=>reopened.session.assertions.find(a=>a.field===field&&a.ownerId===owner&&a.status==='accepted');
   assert.deepEqual(accepted('p1')?.value,moved);assert.deepEqual(accepted('p2')?.value,other);
   assert.equal(moved.pieces[0].quantity,null);assert.equal(other.pieces[0].quantity,0);
   const first=reopened.session.snapshots[0],last=reopened.session.snapshots.at(-1)!;
   assert.deepEqual(first.assertions.find(a=>a.field===field&&a.ownerId==='p1')?.value,legacy);
   assert.deepEqual(last.assertions.find(a=>a.field===field&&a.ownerId==='p1')?.value,moved);
   assert.deepEqual(last.assertions.find(a=>a.field===field&&a.ownerId==='p2')?.value,other);
   assert.equal(reopened.pack.version,view.pack.version);assert.equal(reopened.pack.runtime?.source.sha256,view.pack.runtime?.source.sha256);
   const invalid=structuredClone(moved);invalid.pieces[0].placement!.areaId='not-this-field';
   assert.equal((await call(prefix,'PATCH',{answers:[{field,ownerId:'p1',value:invalid}]})).status,400);
  }
  // Personal Burgundy geometry is unchanged at2 players; the central2-player
  // market remains unverified in the UI, with no substitution or pack upgrade.
  const burgundyTwo=await call('/api/sessions','POST',{gamePackId:'castles-burgundy',recordingMode:'simple',players:[{id:'p1',name:'첫 영지',color:'red'},{id:'p2',name:'둘째 영지',color:'blue'}]});
  assert.equal(burgundyTwo.status,201);const bp=`/api/sessions/${burgundyTwo.body.session.id}`;
  const ownerOne=record('two-player-hex','hexes','duchy',false,null),ownerTwo=record('other-duchy-hex','hexes','duchy',true,0),storedGoods=record('personal-goods','goods','player',true,null);
  ownerTwo.pieces[0].placement={areaId:'duchy',x:.196,y:.705,rotation:90,layoutVariant:realSlotLayoutVariant('burgundy-special-record-v1')};
  storedGoods.pieces[0].placement={areaId:'player',x:.086,y:.652,rotation:0,layoutVariant:realSlotLayoutVariant('burgundy-special-record-v1')};
  assert.equal((await call(bp,'PATCH',{answers:[{field:'duchy.scene',ownerId:'p1',value:ownerOne},{field:'duchy.scene',ownerId:'p2',value:ownerTwo},{field:'player.scene',ownerId:'p1',value:storedGoods}]})).status,200);
  assert.equal((await call(bp+'/commit','POST',{allowIncomplete:true})).status,200);
  const movedTwo=structuredClone(ownerOne);movedTwo.pieces[0].placement={areaId:'duchy',x:.196,y:.655,rotation:0,layoutVariant:realSlotLayoutVariant('burgundy-special-record-v1')};
  assert.equal((await call(bp,'PATCH',{answers:[{field:'duchy.scene',ownerId:'p1',value:movedTwo}]})).status,200);
  assert.equal((await call(bp+'/commit','POST',{allowIncomplete:true})).status,200);
  const br=(await call(bp)).body as SessionView;
  for(const [field,ownerId,value]of [['duchy.scene','p1',movedTwo],['duchy.scene','p2',ownerTwo],['player.scene','p1',storedGoods]]as const)
   assert.deepEqual(br.session.assertions.find(a=>a.field===field&&a.ownerId===ownerId&&a.status==='accepted')?.value,value);
  assert.deepEqual(br.session.snapshots[0].assertions.find(a=>a.field==='duchy.scene'&&a.ownerId==='p1')?.value,ownerOne);
  assert.deepEqual(br.session.snapshots.at(-1)!.assertions.find(a=>a.field==='duchy.scene'&&a.ownerId==='p1')?.value,movedTwo);
  assert.equal(br.pack.runtime?.source.sha256,burgundyTwo.body.pack.runtime.source.sha256);
  // A public scenario choice and stacked map positions use the real API; private
  // cards remain in their owner field instead of being copied to the public map.
  const created=await call('/api/sessions','POST',{gamePackId:'gloomhaven-jaws',players:[{id:'p1',name:'하나',color:'red'},{id:'p2',name:'둘',color:'blue'}]});
  assert.equal(created.status,201);const firstView=created.body as SessionView,prefix=`/api/sessions/${firstView.session.id}`;
  const legacyMap=record('existing-map-piece','figures','battle',false,null),hand=record('owner-card','cards','hand',true,null);
  assert.equal((await call(prefix,'PATCH',{answers:[{field:'scenario',value:'other: existing note'},{field:'battle.scene',value:legacyMap},{field:'hand.scene',ownerId:'p1',value:hand}]})).status,200);
  assert.equal((await call(prefix+'/commit','POST',{allowIncomplete:true})).status,200);
  const mapped=structuredClone(legacyMap),pos={areaId:'battle',x:.07,y:.238,rotation:90 as const,layoutVariant:'scenario-1'};
  mapped.pieces[0].placement=pos;mapped.pieces.push({...mapped.pieces[0],id:'separate-state',componentId:'state',quantity:0,placement:{...pos,rotation:0}});
  assert.equal((await call(prefix,'PATCH',{answers:[{field:'scenario',value:'1'},{field:'battle.scene',value:mapped}]})).status,200);
  assert.equal((await call(prefix+'/commit','POST',{allowIncomplete:true})).status,200);
  const resumed=(await call(prefix)).body as SessionView;
  assert.deepEqual(resumed.session.assertions.find(a=>a.field==='battle.scene'&&!a.ownerId&&a.status==='accepted')?.value,mapped);
  assert.equal(resumed.session.assertions.find(a=>a.field==='scenario'&&a.status==='accepted')?.value,'1');
  assert.deepEqual(resumed.session.assertions.find(a=>a.field==='hand.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,hand);
  assert(!resumed.session.assertions.some(a=>a.field==='hand.scene'&&a.ownerId==='p2'));
  assert.deepEqual(resumed.session.snapshots[0].assertions.find(a=>a.field==='battle.scene')?.value,legacyMap);
  assert.equal(resumed.session.snapshots[0].assertions.find(a=>a.field==='scenario')?.value,'other: existing note');
  assert.deepEqual(resumed.session.snapshots.at(-1)!.assertions.find(a=>a.field==='battle.scene')?.value,mapped);
  assert.equal(resumed.pack.runtime?.source.sha256,firstView.pack.runtime?.source.sha256);

  const elements=structuredClone(mapped),jawsElement=record('user-jawsElement-token','state','battle',true,null).pieces[0];
  jawsElement.readout=setReadoutValue(firstView.pack,emptyGameReadout(firstView.pack,'state'),'stateType','사용자 확인 원소 표식');
  const er=jawsElement.readout;assert(er&&'values'in er);jawsElement.readout=setReadoutValue(firstView.pack,er,'displayValue',0);
  jawsElement.placement={areaId:'battle',x:.69,y:.66,rotation:0,layoutVariant:realFreeLayoutVariant()};elements.pieces.push(jawsElement);
  assert.equal((await call(prefix,'PATCH',{answers:[{field:'battle.scene',value:elements}]})).status,200);
  assert.equal((await call(prefix+'/commit','POST',{allowIncomplete:true})).status,200);
  const waned=structuredClone(elements);waned.pieces.at(-1)!.placement!.x=.42;
  assert.equal((await call(prefix,'PATCH',{answers:[{field:'battle.scene',value:waned}]})).status,200);
  assert.equal((await call(prefix+'/commit','POST',{allowIncomplete:true})).status,200);
  const jr=(await call(prefix)).body as SessionView;
  assert.deepEqual(jr.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,waned);
  assert.deepEqual(jr.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,elements);
  assert.deepEqual(jr.session.assertions.find(a=>a.field==='hand.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,hand);
  assert.equal(jr.session.assertions.find(a=>a.field==='scenario'&&a.status==='accepted')?.value,'1','manual token movement does not advance the scenario or resolve effects');

  const imperial=await call('/api/sessions','POST',{gamePackId:'imperial-assault',players:[{id:'p1',name:'영웅 A',color:'red'},{id:'p2',name:'영웅 B',color:'blue'}]});
  assert.equal(imperial.status,201);const ip=`/api/sessions/${imperial.body.session.id}`;
  const oldImperial=record('old-figure','figures','map',false,null),hero=record('hero-sheet','cards','heroes',true,null);
  hero.pieces[0].readout=setReadoutValue(imperial.body.pack,emptyGameReadout(imperial.body.pack,'cards'),'face','back');
  hero.pieces[0].placement={areaId:'heroes',x:.74,y:.5,rotation:90,layoutVariant:realFreeLayoutVariant('imperial-campaign-table-v1')};
  assert.equal((await call(ip,'PATCH',{answers:[{field:'record-note.campaign',value:'실제 캠페인 메모 · 지도 보기와 별개'},{field:'map.scene',value:oldImperial},{field:'heroes.scene',ownerId:'p1',value:hero}]})).status,200);
  assert.equal((await call(ip+'/commit','POST',{allowIncomplete:true})).status,200);
  const tutorial=structuredClone(oldImperial);tutorial.pieces[0].placement={areaId:'map',x:.235,y:.11,rotation:90,layoutVariant:realSlotLayoutVariant('imperial-tutorial-map-v1')};
  const groupState=record('nonhero-damage','tokens','groups',true,0);groupState.pieces[0].readout=setReadoutValue(imperial.body.pack,emptyGameReadout(imperial.body.pack,'tokens'),'displayValue',0);groupState.pieces[0].placement={areaId:'groups',x:.235,y:.11,rotation:0,layoutVariant:realFreeLayoutVariant('imperial-tutorial-map-v1')};
  assert.equal((await call(ip,'PATCH',{answers:[{field:'map.scene',value:tutorial},{field:'groups.scene',value:groupState}]})).status,200);
  assert.equal((await call(ip+'/commit','POST',{allowIncomplete:true})).status,200);
  const ir=(await call(ip)).body as SessionView;
  for(const [field,ownerId,value]of [['map.scene',null,tutorial],['groups.scene',null,groupState],['heroes.scene','p1',hero]]as const)
   assert.deepEqual(ir.session.assertions.find(a=>a.field===field&&(a.ownerId??null)===ownerId&&a.status==='accepted')?.value,value);
  assert.equal(ir.session.assertions.find(a=>a.field==='record-note.campaign'&&a.status==='accepted')?.value,'실제 캠페인 메모 · 지도 보기와 별개');
  assert.deepEqual(ir.session.snapshots[0].assertions.find(a=>a.field==='map.scene')?.value,oldImperial);
  assert.deepEqual(ir.session.snapshots.at(-1)!.assertions.find(a=>a.field==='map.scene')?.value,tutorial);
  assert(!ir.session.assertions.some(a=>a.field==='heroes.scene'&&a.ownerId==='p2'));
  assert.equal(ir.pack.runtime?.source.sha256,imperial.body.pack.runtime.source.sha256);

  const arkham=await call('/api/sessions','POST',{gamePackId:'arkham-horror-3',players:[{id:'p1',name:'조사자 A',color:'red'},{id:'p2',name:'조사자 B',color:'blue'}]});
  assert.equal(arkham.status,201);const ap=`/api/sessions/${arkham.body.session.id}`;
  const arkhamOld=record('investigator-stand','pieces','map',false,null),privateCard=record('owner-private-card','cards','private',true,null);
  privateCard.pieces[0].readout=setReadoutValue(arkham.body.pack,emptyGameReadout(arkham.body.pack,'cards'),'face','back');
  privateCard.pieces[0].placement={areaId:'private',x:.31,y:.93,rotation:180,layoutVariant:realFreeLayoutVariant('arkham3-table-v1')};
  assert.equal((await call(ap,'PATCH',{answers:[{field:'note',value:'원래 시나리오 메모 · 자동 진행 안 함'},{field:'map.scene',value:arkhamOld},{field:'private.scene',ownerId:'p1',value:privateCard}]})).status,200);
  assert.equal((await call(ap+'/commit','POST',{allowIncomplete:true})).status,200);
  const arkhamMap=structuredClone(arkhamOld);arkhamMap.pieces[0].placement={areaId:'map',x:.145,y:.28,rotation:90,layoutVariant:realSlotLayoutVariant('arkham3-azathoth-v1')};
  const knownZero=record('center-marker','pieces','map',true,0).pieces[0];knownZero.placement={areaId:'map',x:.145,y:.205,rotation:0,layoutVariant:realSlotLayoutVariant('arkham3-azathoth-v1')};
  knownZero.readout=setReadoutValue(arkham.body.pack,emptyGameReadout(arkham.body.pack,'pieces'),'printedValue',0);arkhamMap.pieces.push(knownZero);
  const publicDisplay=record('public-item','cards','scenario',true,null);publicDisplay.pieces[0].placement={areaId:'scenario',x:.1075,y:.65,rotation:0,layoutVariant:realSlotLayoutVariant('arkham3-table-v1')};
  assert.equal((await call(ap,'PATCH',{answers:[{field:'map.scene',value:arkhamMap},{field:'scenario.scene',value:publicDisplay}]})).status,200);
  assert.equal((await call(ap+'/commit','POST',{allowIncomplete:true})).status,200);
  const ar=(await call(ap)).body as SessionView;
  for(const [field,ownerId,value]of [['map.scene',null,arkhamMap],['scenario.scene',null,publicDisplay],['private.scene','p1',privateCard]]as const)
   assert.deepEqual(ar.session.assertions.find(a=>a.field===field&&(a.ownerId??null)===ownerId&&a.status==='accepted')?.value,value);
  assert.equal(ar.session.assertions.find(a=>a.field==='note'&&a.status==='accepted')?.value,'원래 시나리오 메모 · 자동 진행 안 함');
  assert(!ar.session.assertions.some(a=>a.field==='private.scene'&&a.ownerId==='p2'));
  assert.deepEqual(ar.session.snapshots[0].assertions.find(a=>a.field==='map.scene')?.value,arkhamOld);
  assert.deepEqual(ar.session.snapshots.at(-1)!.assertions.find(a=>a.field==='map.scene')?.value,arkhamMap);
  assert.equal(ar.pack.runtime?.source.sha256,arkham.body.pack.runtime.source.sha256);


  const gloom=await call('/api/sessions','POST',{gamePackId:'gloomhaven',players:[{id:'p1',name:'인물 A',color:'red'},{id:'p2',name:'인물 B',color:'blue'}]});
  assert.equal(gloom.status,201);const gp=`/api/sessions/${gloom.body.session.id}`;
  const oldRound=record('prior-round-token','markers','monster',false,null),ownerHand=record('hidden-ability','cards','hand',true,null);
  ownerHand.pieces[0].readout=setReadoutValue(gloom.body.pack,emptyGameReadout(gloom.body.pack,'cards'),'face','back');
  ownerHand.pieces[0].placement={areaId:'hand',x:.8,y:.93,rotation:180,layoutVariant:realFreeLayoutVariant('gloomhaven2-table-v1')};
  const paper=record('single-campaign-sheet','campaign','campaign',true,null);
  paper.pieces[0].readout=setReadoutValue(gloom.body.pack,emptyGameReadout(gloom.body.pack,'campaign'),'recordLabel','원래 기록 · 상인0 / 다른 평판?');
  paper.pieces[0].placement={areaId:'campaign',x:.7,y:.655,rotation:0,layoutVariant:realFreeLayoutVariant('gloomhaven2-table-v1')};
  assert.equal((await call(gp,'PATCH',{answers:[{field:'monster.scene',value:oldRound},{field:'campaign.scene',value:paper},{field:'hand.scene',ownerId:'p1',value:ownerHand},{field:'record-note.campaign-state',value:'실제 원문 보존 · 체크박스 자동 반영 없음'}]})).status,200);
  assert.equal((await call(gp+'/commit','POST',{allowIncomplete:true})).status,200);
  const element=structuredClone(oldRound);element.pieces[0].placement={areaId:'monster',x:.335,y:.469,rotation:0,layoutVariant:realSlotLayoutVariant('gloomhaven2-table-v1')};
  element.pieces[0].readout=setReadoutValue(gloom.body.pack,emptyGameReadout(gloom.body.pack,'markers'),'displayValue',0);
  const revised=structuredClone(paper);revised.pieces[0].placement={areaId:'campaign',x:.895,y:.048,rotation:0,layoutVariant:realSlotLayoutVariant('gloomhaven2-campaign-sheet-v1')};
  const sheetReadout=revised.pieces[0].readout;assert(sheetReadout&&'values'in sheetReadout);
  revised.pieces[0].readout=setReadoutValue(gloom.body.pack,sheetReadout,'recordLabel','사용자 정정 · 상인0 / 영감?');
  assert.equal((await call(gp,'PATCH',{answers:[{field:'monster.scene',value:element},{field:'campaign.scene',value:revised}]})).status,200);
  assert.equal((await call(gp+'/commit','POST',{allowIncomplete:true})).status,200);
  const gr=(await call(gp)).body as SessionView;
  for(const [field,ownerId,value]of [['monster.scene',null,element],['campaign.scene',null,revised],['hand.scene','p1',ownerHand]]as const)
   assert.deepEqual(gr.session.assertions.find(a=>a.field===field&&(a.ownerId??null)===ownerId&&a.status==='accepted')?.value,value);
  assert.equal(gr.session.assertions.find(a=>a.field==='record-note.campaign-state'&&a.status==='accepted')?.value,'실제 원문 보존 · 체크박스 자동 반영 없음');
  assert(!gr.session.assertions.some(a=>a.field==='hand.scene'&&a.ownerId==='p2'));
  assert.deepEqual(gr.session.snapshots[0].assertions.find(a=>a.field==='monster.scene')?.value,oldRound);
  assert.deepEqual(gr.session.snapshots[0].assertions.find(a=>a.field==='campaign.scene')?.value,paper);
  assert.deepEqual(gr.session.snapshots.at(-1)!.assertions.find(a=>a.field==='campaign.scene')?.value,revised);
  assert.equal(gr.pack.runtime?.source.sha256,gloom.body.pack.runtime.source.sha256);


  const descent=await call('/api/sessions','POST',{gamePackId:'descent-legends-dark',recordingMode:'simple',players:[{id:'p1',name:'영웅 A',color:'red'},{id:'p2',name:'영웅 B',color:'blue'}]});
  assert.equal(descent.status,201);const dp=`/api/sessions/${descent.body.session.id}`;
  const layerPiece=(id:string,componentId:string,layer:number|null)=>{
   const p=record(id,componentId,'map',true,null).pieces[0];p.readout=setReadoutValue(descent.body.pack,emptyGameReadout(descent.body.pack,componentId),'layer',layer);
   p.placement={areaId:'map',x:.32,y:.3,rotation:0,layoutVariant:realFreeLayoutVariant('descent-lotd-table-v1')};return p;
  };
  const dungeon:GenericRecord={version:'game-component-record-v1',pieces:[layerPiece('lower-figure','figures',0),layerPiece('upper-tile','terrain',2),layerPiece('unconfirmed-layer','figures',null)]};
  const pair=record('weapon-a','cards','hero',true,null);pair.pieces[0].readout=setReadoutValue(descent.body.pack,emptyGameReadout(descent.body.pack,'cards'),'face','front');
  const frontReadout=pair.pieces[0].readout;assert(frontReadout&&'values'in frontReadout);
  pair.pieces[0].readout=setReadoutValue(descent.body.pack,frontReadout,'fatigue',0);
  pair.pieces[0].placement={areaId:'hero',x:.355,y:.785,rotation:0,layoutVariant:realSlotLayoutVariant('descent-lotd-table-v1')};
  const second=structuredClone(pair.pieces[0]);second.id='weapon-b';second.readout=setReadoutValue(descent.body.pack,emptyGameReadout(descent.body.pack,'cards'),'face','back');pair.pieces.push(second);
  const otherHero=record('other-owner-card','cards','hero',true,null);otherHero.pieces[0].placement={areaId:'hero',x:.135,y:.76,rotation:0,layoutVariant:realSlotLayoutVariant('descent-lotd-table-v1')};
  assert.equal((await call(dp,'PATCH',{answers:[{field:'map.scene',value:dungeon},{field:'hero.scene',ownerId:'p1',value:pair},{field:'hero.scene',ownerId:'p2',value:otherHero},{field:'external-save',value:'SYNTHETIC-APP-SAVE-REFERENCE'}]})).status,200);
  assert.equal((await call(dp+'/commit','POST',{allowIncomplete:true})).status,200);
  const updatedDungeon=structuredClone(dungeon),detailed=updatedDungeon.pieces[0].readout;assert(detailed&&'values'in detailed);
  updatedDungeon.pieces[0].readout=setReadoutValue(descent.body.pack,detailed,'layer',1);updatedDungeon.pieces[0].placement!.x=.45;
  const updatedPair=structuredClone(pair),weapon=updatedPair.pieces[0].readout;assert(weapon&&'values'in weapon);
  updatedPair.pieces[0].readout=setReadoutValue(descent.body.pack,weapon,'fatigue',null);
  assert.equal((await call(dp,'PATCH',{answers:[{field:'map.scene',value:updatedDungeon},{field:'hero.scene',ownerId:'p1',value:updatedPair}]})).status,200);
  assert.equal((await call(dp+'/commit','POST',{allowIncomplete:true})).status,200);
  const dr=(await call(dp)).body as SessionView;
  for(const [field,ownerId,value]of [['map.scene',null,updatedDungeon],['hero.scene','p1',updatedPair],['hero.scene','p2',otherHero]]as const)
   assert.deepEqual(dr.session.assertions.find(a=>a.field===field&&(a.ownerId??null)===ownerId&&a.status==='accepted')?.value,value);
  assert.equal(dr.session.assertions.find(a=>a.field==='external-save'&&a.status==='accepted')?.value,'SYNTHETIC-APP-SAVE-REFERENCE');
  assert.deepEqual(dr.session.snapshots[0].assertions.find(a=>a.field==='map.scene')?.value,dungeon);
  assert.deepEqual(dr.session.snapshots[0].assertions.find(a=>a.field==='hero.scene'&&a.ownerId==='p1')?.value,pair);
  assert.deepEqual(dr.session.snapshots.at(-1)!.assertions.find(a=>a.field==='hero.scene'&&a.ownerId==='p1')?.value,updatedPair);
  assert.equal(dr.pack.runtime?.source.sha256,descent.body.pack.runtime.source.sha256);
  const solo=await call('/api/sessions','POST',{gamePackId:'descent-legends-dark',recordingMode:'simple',players:[{id:'solo',name:'혼자 두 영웅',color:'green'}]});
  assert.equal(solo.status,201);const sp=`/api/sessions/${solo.body.session.id}`,soloCards=structuredClone(updatedPair);
  for(const p of soloCards.pieces)p.placement={areaId:'hero',x:.36,y:.22,rotation:0,layoutVariant:realSlotLayoutVariant('descent-lotd-two-heroes-v1')};
  for(const [id,x]of [['solo-hero-a',.13],['solo-hero-b',.62]]as const){const p=record(id,'cards','hero',true,null).pieces[0];p.placement={areaId:'hero',x,y:.18,rotation:0,layoutVariant:realSlotLayoutVariant('descent-lotd-two-heroes-v1')};soloCards.pieces.push(p);}
  assert.equal((await call(sp,'PATCH',{answers:[{field:'hero.scene',ownerId:'solo',value:soloCards}]})).status,200);
  assert.equal((await call(sp+'/commit','POST',{allowIncomplete:true})).status,200);
  const sr=(await call(sp)).body as SessionView;
  assert.deepEqual(sr.session.assertions.find(a=>a.field==='hero.scene'&&a.ownerId==='solo'&&a.status==='accepted')?.value,soloCards);
  assert.deepEqual(sr.session.snapshots.at(-1)!.assertions.find(a=>a.field==='hero.scene'&&a.ownerId==='solo')?.value,soloCards);
  assert.equal(soloCards.pieces.length,4,'only the four explicitly entered cards survive, without guessed second-hero equipment');
  const forbidden=record('explore-token','tokens','map',true,null);
  assert.equal((await call(dp,'PATCH',{answers:[{field:'map.scene',value:forbidden}]})).status,400,'missing map-token contract cannot be bypassed by the diagram');


  // Frosthaven uses the existing typed building/card records, with no campaign
  // checkbox or hidden deck generated by choosing a diagram.
  const frost=await call('/api/sessions','POST',{gamePackId:'frosthaven',recordingMode:'simple',players:[{id:'p1',name:'인물 A',color:'red'},{id:'p2',name:'인물 B',color:'blue'}]});
  assert.equal(frost.status,201);const fp=`/api/sessions/${frost.body.session.id}`;
  const building=record('known-building','outpost','town',true,null),publicCard=record('discarded-ability','cards','player',true,0),privateAbility=record('private-ability','cards','private',true,null),otherAbility=record('other-owner-ability','cards','player',true,null);
  building.pieces[0].readout=setReadoutValue(frost.body.pack,emptyGameReadout(frost.body.pack,'outpost'),'level',0);
  const bd=building.pieces[0].readout;assert(bd&&'values'in bd);building.pieces[0].readout=setReadoutValue(frost.body.pack,bd,'buildingState','사용자가 확인한 원래 상태');
  building.pieces[0].placement={areaId:'town',x:.8,y:.12,rotation:0,layoutVariant:realFreeLayoutVariant('frosthaven-table-v1')};
  publicCard.pieces[0].placement={areaId:'player',x:.09,y:.67,rotation:90,layoutVariant:realFreeLayoutVariant('frosthaven-table-v1')};
  privateAbility.pieces[0].placement={areaId:'private',x:.4,y:.94,rotation:180,layoutVariant:realFreeLayoutVariant('frosthaven-table-v1')};
  privateAbility.pieces[0].readout=setReadoutValue(frost.body.pack,emptyGameReadout(frost.body.pack,'cards'),'face','back');
  otherAbility.pieces[0].placement={areaId:'player',x:.9,y:.67,rotation:0,layoutVariant:realFreeLayoutVariant('frosthaven-table-v1')};
  assert.equal((await call(fp,'PATCH',{answers:[{field:'town.scene',value:building},{field:'player.scene',ownerId:'p1',value:publicCard},{field:'player.scene',ownerId:'p2',value:otherAbility},{field:'private.scene',ownerId:'p1',value:privateAbility},{field:'record-note.clock',value:'여름 주차? · 원문 유지'},{field:'record-note.campaign',value:'사기0 / 방어? · 직접 기록'}]})).status,200);
  assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
  const changedBuilding=structuredClone(building),buildingReadout=changedBuilding.pieces[0].readout;assert(buildingReadout&&'values'in buildingReadout);
  changedBuilding.pieces[0].readout=setReadoutValue(frost.body.pack,buildingReadout,'level',null);
  changedBuilding.pieces[0].placement!.x=.7;
  const movedCard=structuredClone(publicCard);movedCard.pieces[0].placement={areaId:'player',x:.4,y:.53,rotation:0,layoutVariant:realFreeLayoutVariant('frosthaven-table-v1')};
  assert.equal((await call(fp,'PATCH',{answers:[{field:'town.scene',value:changedBuilding},{field:'player.scene',ownerId:'p1',value:movedCard}]})).status,200);
  assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
  const fr=(await call(fp)).body as SessionView;
  for(const [field,ownerId,value]of [['town.scene',null,changedBuilding],['player.scene','p1',movedCard],['player.scene','p2',otherAbility],['private.scene','p1',privateAbility]]as const)
   assert.deepEqual(fr.session.assertions.find(a=>a.field===field&&(a.ownerId??null)===ownerId&&a.status==='accepted')?.value,value);
  assert.deepEqual(fr.session.snapshots[0].assertions.find(a=>a.field==='town.scene')?.value,building);
  assert.deepEqual(fr.session.snapshots.at(-1)!.assertions.find(a=>a.field==='town.scene')?.value,changedBuilding);
  assert.equal(fr.session.assertions.find(a=>a.field==='record-note.clock'&&a.status==='accepted')?.value,'여름 주차? · 원문 유지');
  assert.equal(fr.session.assertions.find(a=>a.field==='record-note.campaign'&&a.status==='accepted')?.value,'사기0 / 방어? · 직접 기록');
  assert(!fr.session.assertions.some(a=>a.field==='private.scene'&&a.ownerId==='p2'));
  assert.equal(fr.pack.runtime?.source.sha256,frost.body.pack.runtime.source.sha256);
  const unsupportedResource=record('battle-state-resource','resources','battle',true,null);
  assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:unsupportedResource}]})).status,400,'the diagram must not bypass the existing battle component scope');

  const frostMap=record('user-confirmed-figure','figures','battle',true,null),frostOverlay=record('user-map-overlay','map','battle',true,0).pieces[0];
  const frostDoor={areaId:'battle',x:.343,y:.4535,rotation:0 as const,layoutVariant:realSlotLayoutVariant('frosthaven-scenario0-v1')};
  frostMap.pieces[0].placement=frostDoor;frostMap.pieces[0].readout=setReadoutValue(frost.body.pack,emptyGameReadout(frost.body.pack,'figures'),'health',0);
  frostOverlay.placement={...frostDoor};const frostFront=setReadoutValue(frost.body.pack,emptyGameReadout(frost.body.pack,'map'),'face','front');frostOverlay.readout=setReadoutValue(frost.body.pack,frostFront,'featureType','사용자 확인 문 · 개폐 상태 미확인');frostMap.pieces.push(frostOverlay);
  assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:frostMap},{field:'record-note.scenario',value:'기존 임무 원문 · 번호/진행 미확인'}]})).status,200);
  assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
  const frostMoved=structuredClone(frostMap),frostHealth=frostMoved.pieces[0].readout;assert(frostHealth&&'values'in frostHealth);
  frostMoved.pieces[0].readout=setReadoutValue(frost.body.pack,frostHealth,'health',null);frostMoved.pieces[0].placement={...frostDoor,x:.311,y:.509};
  assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:frostMoved}]})).status,200);
  assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
  const fm=(await call(fp)).body as SessionView;
  assert.deepEqual(fm.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,frostMoved);
  assert.deepEqual(fm.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,frostMap);
  assert.equal(frostMoved.pieces.length,2,'the map creates no starting monsters, treasure or loot');
  assert.equal(fm.session.assertions.find(a=>a.field==='record-note.scenario'&&a.status==='accepted')?.value,'기존 임무 원문 · 번호/진행 미확인');
  assert.deepEqual(fm.session.assertions.find(a=>a.field==='town.scene'&&a.status==='accepted')?.value,changedBuilding);
  assert.deepEqual(fm.session.assertions.find(a=>a.field==='private.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,privateAbility);
  assert.equal(fm.pack.runtime?.source.sha256,frost.body.pack.runtime.source.sha256);

  const mixedFrostMaps=structuredClone(frostMoved);
  mixedFrostMaps.pieces[0].placement={areaId:'battle',x:.405,y:.532,rotation:90,layoutVariant:realSlotLayoutVariant('frosthaven-scenario1-v1')};
  assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:mixedFrostMaps}]})).status,200);
  assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
  const f1=(await call(fp)).body as SessionView;
  assert.deepEqual(f1.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,mixedFrostMaps);
  assert.deepEqual(f1.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,frostMoved);
  assert.deepEqual(mixedFrostMaps.pieces[1],frostMoved.pieces[1],'the old scenario0 overlay retains its old frame instead of moving to scenario1');
  assert.equal(mixedFrostMaps.pieces.length,2,'viewing a map does not add its source monsters or allies');
  assert.equal(f1.session.assertions.find(a=>a.field==='record-note.scenario'&&a.status==='accepted')?.value,'기존 임무 원문 · 번호/진행 미확인');
  assert.equal(f1.session.assertions.find(a=>a.field==='record-note.clock'&&a.status==='accepted')?.value,'여름 주차? · 원문 유지');
  assert.deepEqual(f1.session.assertions.find(a=>a.field==='private.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,privateAbility);
  assert.deepEqual(f1.session.assertions.find(a=>a.field==='town.scene'&&a.status==='accepted')?.value,changedBuilding);
  assert.equal(f1.pack.runtime?.source.sha256,frost.body.pack.runtime.source.sha256);

  const frostSecond=structuredClone(mixedFrostMaps);
  frostSecond.pieces[0].placement={areaId:'battle',x:.575,y:.53,rotation:180,layoutVariant:realSlotLayoutVariant('frosthaven-scenario2-v1')};
  assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:frostSecond}]})).status,200);
  assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
  const f2=(await call(fp)).body as SessionView;
  assert.deepEqual(f2.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,frostSecond);
  assert.deepEqual(f2.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,mixedFrostMaps);
  assert.deepEqual(frostSecond.pieces[1],frostMoved.pieces[1]);
  assert.equal(frostSecond.pieces[0].quantity,null);assert.equal(frostSecond.pieces[1].quantity,0);
  assert.equal(f2.session.assertions.find(a=>a.field==='record-note.scenario'&&a.status==='accepted')?.value,'기존 임무 원문 · 번호/진행 미확인');
  assert.deepEqual(f2.session.assertions.find(a=>a.field==='private.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,privateAbility);
  assert.deepEqual(f2.session.assertions.find(a=>a.field==='town.scene'&&a.status==='accepted')?.value,changedBuilding);
  assert.equal(f2.pack.runtime?.source.sha256,frost.body.pack.runtime.source.sha256);

  const frostThird=structuredClone(frostSecond);
  frostThird.pieces[0].placement={areaId:'battle',x:.345,y:.257,rotation:270,layoutVariant:realSlotLayoutVariant('frosthaven-scenario3-v1')};
  assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:frostThird}]})).status,200);
  assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
  const f3=(await call(fp)).body as SessionView;
  assert.deepEqual(f3.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,frostThird);
  assert.deepEqual(f3.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,frostSecond);
  assert.deepEqual(frostThird.pieces[1],frostMoved.pieces[1]);assert.equal(frostThird.pieces.length,2);
  assert.equal(frostThird.pieces[0].quantity,null);assert.equal(frostThird.pieces[1].quantity,0);
  assert.equal(f3.session.assertions.find(a=>a.field==='record-note.scenario'&&a.status==='accepted')?.value,'기존 임무 원문 · 번호/진행 미확인');
  assert.deepEqual(f3.session.assertions.find(a=>a.field==='private.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,privateAbility);
  assert.deepEqual(f3.session.assertions.find(a=>a.field==='town.scene'&&a.status==='accepted')?.value,changedBuilding);
  assert.equal(f3.pack.runtime?.source.sha256,frost.body.pack.runtime.source.sha256);

  let previousFrost=frostThird;
  for(const [frame,x,y]of [['frosthaven-scenario4-a-v1',.516,.415],['frosthaven-scenario4-b-v1',.388,.295],['frosthaven-scenario5-v1',.28,.4],['frosthaven-scenario6-v1',.591,.433375],['frosthaven-scenario7-v1',.273,.772],['frosthaven-scenario8-v1',.43,.555],['frosthaven-scenario9-v1',.313,.519],['frosthaven-scenario10-start-v1',.3,.415],['frosthaven-scenario10-final-v1',.326,.28],['frosthaven-scenario11-v1',.628,.227],['frosthaven-scenario12-v1',.376,.398],['frosthaven-scenario13-v1',.375,.4],['frosthaven-scenario14-v1',.082,.4505],['frosthaven-scenario15-v1',.081,.395],['frosthaven-scenario15-v1',.237,.215],['frosthaven-scenario16-v1',.292,.406],['frosthaven-scenario16-v1',.260,.136],['frosthaven-scenario16-v1',.164,.730],['frosthaven-scenario17-v1',.355,.552],['frosthaven-scenario18-v1',.47,.3625],['frosthaven-scenario19-v1',.272,.298],['frosthaven-scenario20-v1',.233,.265],['frosthaven-scenario21-start-v1',.314,.131],['frosthaven-scenario21-after-v1',.58,.2925],['frosthaven-scenario22-v1',.46,.233],['frosthaven-scenario23-v1',.196,.43],['frosthaven-scenario24-v1',.176,.565],['frosthaven-scenario24-v1',.54,.16],['frosthaven-scenario24-v1',.592,.565],['frosthaven-scenario25-v1',.196,.268],['frosthaven-scenario25-v1',.13,.541],['frosthaven-scenario25-v1',.724,.346],['frosthaven-scenario26-v1',.32,.3475],['frosthaven-scenario26-v1',.74,.295],['frosthaven-scenario27-v1',.208,.217],['frosthaven-scenario27-v1',.082,.505],['frosthaven-scenario27-v1',.67,.145],['frosthaven-scenario28-v1',.455,.32],['frosthaven-scenario28-v1',.715,.5],['frosthaven-scenario28-v1',.055,.68],['frosthaven-scenario29-v1',.386,.3],['frosthaven-scenario29-v1',.066,.516],['frosthaven-scenario29-v1',.386,.516],['frosthaven-scenario30-v1',.246,.192],['frosthaven-scenario30-v1',.286,.552],['frosthaven-scenario30-v1',.386,.3],['frosthaven-scenario31-start-v1',.085,.198],['frosthaven-scenario31-middle-v1',.605,.414],['frosthaven-scenario31-final-v1',.365,.414],['frosthaven-scenario32-v1',.255,.3485],['frosthaven-scenario32-v1',.646,.389],['frosthaven-scenario32-v1',.508,.227],['frosthaven-scenario33-v1',.390,.4545],['frosthaven-scenario33-v1',.265,.603],['frosthaven-scenario33-v1',.515,.108],['frosthaven-scenario34-v1',.380,.205],['frosthaven-scenario34-v1',.335,.421],['frosthaven-scenario34-v1',.380,.781],['frosthaven-scenario35-v1',.272,.392],['frosthaven-scenario35-v1',.248,.686],['frosthaven-scenario35-v1',.416,.476],['frosthaven-scenario36-v1',.135,.162],['frosthaven-scenario36-v1',.375,.474],['frosthaven-scenario36-v1',.615,.786],['frosthaven-scenario37-start-v1',.432,.38],['frosthaven-scenario37-after70-v1',.784,.38],['frosthaven-scenario37-after81-v1',.080,.38],['frosthaven-scenario37-final-v1',.762,.419],['frosthaven-scenario38-v1',.064,.508],['frosthaven-scenario38-v1',.376,.550],['frosthaven-scenario38-v1',.064,.172],['frosthaven-scenario39-v1',.148,.645],['frosthaven-scenario39-v1',.634,.285],['frosthaven-scenario39-v1',.553,.690],['frosthaven-scenario39-v1',.067,.420],['frosthaven-scenario40-v1',.092,.654],['frosthaven-scenario40-v1',.378,.4515],['frosthaven-scenario40-v1',.482,.2895],['frosthaven-scenario40-v1',.508,.330],['frosthaven-scenario41-v1',.389,.348],['frosthaven-scenario41-v1',.221,.348],['frosthaven-scenario41-v1',.753,.396],['frosthaven-scenario42-v1',.221,.399],['frosthaven-scenario42-v1',.430,.126],['frosthaven-scenario42-v1',.734,.516],['frosthaven-scenario43-v1',.348,.4235],['frosthaven-scenario43-v1',.458,.467],['frosthaven-scenario43-v1',.766,.467],['frosthaven-scenario44-v1',.427,.572],['frosthaven-scenario44-v1',.259,.356],['frosthaven-scenario44-v1',.343,.140],['frosthaven-scenario45-v1',.310,.495],['frosthaven-scenario45-v1',.442,.105],['frosthaven-scenario45-v1',.288,.846],['frosthaven-scenario46-v1',.397,.343],['frosthaven-scenario46-v1',.485,.265],['frosthaven-scenario46-v1',.727,.226],['frosthaven-scenario47-start-v1',.374,.567],['frosthaven-scenario47-after-v1',.318,.087],['frosthaven-scenario47-after-v1',.178,.423],['frosthaven-scenario48-v1',.338,.350],['frosthaven-scenario48-v1',.580,.467],['frosthaven-scenario48-v1',.800,.233],['frosthaven-scenario49-v1',.491,.381],['frosthaven-scenario49-v1',.777,.342],['frosthaven-scenario49-v1',.447,.615],['frosthaven-scenario50-v1',.404,.432],['frosthaven-scenario50-v1',.138,.234],['frosthaven-scenario50-v1',.594,.630],['frosthaven-scenario51-v1',.164,.480],['frosthaven-scenario51-v1',.374,.336],['frosthaven-scenario51-v1',.479,.156],['frosthaven-scenario52-v1',.201,.408],['frosthaven-scenario52-v1',.179,.213],['frosthaven-scenario52-v1',.663,.525],['frosthaven-scenario53-v1',.252,.312],['frosthaven-scenario53-v1',.138,.114],['frosthaven-scenario53-v1',.404,.708],['frosthaven-scenario54-v1',.224,.675],['frosthaven-scenario54-v1',.354,.630],['frosthaven-scenario54-v1',.224,.135],['frosthaven-scenario55-v1',.466,.365],['frosthaven-scenario55-v1',.622,.365],['frosthaven-scenario55-v1',.726,.455],['frosthaven-scenario56-v1',.302,.556],['frosthaven-scenario56-v1',.742,.091],['frosthaven-scenario56-v1',.214,.091],['frosthaven-scenario57-v1',.404,.312],['frosthaven-scenario57-v1',.290,.114],['frosthaven-scenario57-v1',.670,.774],['frosthaven-scenario58-v1',.424,.334],['frosthaven-scenario58-v1',.280,.334],['frosthaven-scenario58-v1',.736,.376],['frosthaven-scenario59-v1',.342,.232],['frosthaven-scenario59-v1',.342,.466],['frosthaven-scenario59-v1',.562,.388],['frosthaven-scenario60-v1',.310,.367],['frosthaven-scenario60-v1',.450,.214],['frosthaven-scenario60-v1',.814,.469],['frosthaven-scenario61-v1',.335,.6775],['frosthaven-scenario61-v1',.260,.340],['frosthaven-scenario61-v1',.560,.265],['frosthaven-scenario62-v1',.152,.420],['frosthaven-scenario62-v1',.280,.087],['frosthaven-scenario62-v1',.376,.6975],['frosthaven-scenario63-v1',.319,.380],['frosthaven-scenario63-v1',.631,.380],['frosthaven-scenario63-v1',.449,.155],['frosthaven-scenario64-v1',.190,.2845],['frosthaven-scenario64-v1',.490,.4225],['frosthaven-scenario64-v1',.850,.733],['frosthaven-scenario65-v1',.470,.363],['frosthaven-scenario65-v1',.162,.363],['frosthaven-scenario65-v1',.800,.324],['frosthaven-scenario66-v1',.422,.41725],['frosthaven-scenario66-v1',.745,.271],['frosthaven-scenario66-v1',.541,.5635],['frosthaven-scenario67-v1',.050,.365],['frosthaven-scenario67-v1',.475,.500],['frosthaven-scenario67-v1',.600,.365],['frosthaven-scenario68-v1',.314,.803],['frosthaven-scenario68-v1',.484,.101],['frosthaven-scenario68-v1',.246,.371],['frosthaven-scenario69-v1',.482,.612],['frosthaven-scenario69-v1',.218,.456],['frosthaven-scenario69-v1',.570,.183],['frosthaven-scenario70-v1',.170,.7225],['frosthaven-scenario70-v1',.370,.3475],['frosthaven-scenario70-v1',.545,.085],['frosthaven-scenario71-v1',.122,.585],['frosthaven-scenario71-v1',.374,.495],['frosthaven-scenario71-v1',.734,.495],['frosthaven-scenario72-v1',.168,.4635],['frosthaven-scenario72-v1',.454,.408],['frosthaven-scenario72-v1',.652,.4635],['frosthaven-scenario72-v1',.916,.4635],['frosthaven-scenario73-v1',.041,.660],['frosthaven-scenario73-v1',.482,.498],['frosthaven-scenario73-v1',.839,.444],['frosthaven-scenario74-v1',.150,.810],['frosthaven-scenario74-v1',.438,.594],['frosthaven-scenario74-v1',.636,.270],['frosthaven-scenario74-v1',.636,.342],['frosthaven-scenario75-v1',.148,.840],['frosthaven-scenario75-v1',.400,.192],['frosthaven-scenario75-v1',.724,.696],['frosthaven-scenario76-v1',.310,.438],['frosthaven-scenario76-v1',.130,.816],['frosthaven-scenario76-v1',.670,.606],['frosthaven-scenario76-v1',.490,.564],['frosthaven-scenario77-v1',.084,.296],['frosthaven-scenario77-v1',.660,.296],['frosthaven-scenario77-v1',.588,.350],['frosthaven-scenario77-v1',.708,.512],['frosthaven-scenario77-v1',.660,.404],['frosthaven-scenario78-v1',.550,.832],['frosthaven-scenario78-v1',.390,.544],['frosthaven-scenario78-v1',.290,.220],['frosthaven-scenario78-v1',.510,.328],['frosthaven-scenario78-v1',.390,.328],['frosthaven-scenario79-v1',.760,.170],['frosthaven-scenario79-v1',.800,.458],['frosthaven-scenario79-v1',.340,.278],['frosthaven-scenario79-v1',.220,.422],['frosthaven-scenario79-v1',.320,.530],['frosthaven-scenario80-v1',.310,.488],['frosthaven-scenario80-v1',.270,.200],['frosthaven-scenario80-v1',.350,.776],['frosthaven-scenario81-v1',.056,.274],['frosthaven-scenario81-v1',.264,.166],['frosthaven-scenario81-v1',.552,.310],['frosthaven-scenario81-v1',.936,.454],['frosthaven-scenario82-v1',.108,.252],['frosthaven-scenario82-v1',.500,.636],['frosthaven-scenario82-v1',.360,.492],['frosthaven-scenario82-v1',.388,.252],['frosthaven-scenario82-v1',.556,.252],['frosthaven-scenario82-v1',.752,.396],['frosthaven-scenario82-v1',.668,.636],['frosthaven-scenario83-v1',.180,.490],['frosthaven-scenario83-v1',.330,.430],['frosthaven-scenario83-v1',.810,.430],['frosthaven-scenario83-v1',.870,.430]] as const){
   const branchMap=structuredClone(previousFrost);branchMap.pieces[0].placement={areaId:'battle',x,y,rotation:90,layoutVariant:realSlotLayoutVariant(frame)};
   assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:branchMap}]})).status,200);
   assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
   const reopenedBranch=(await call(fp)).body as SessionView;
   assert.deepEqual(reopenedBranch.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,branchMap);
   assert.deepEqual(reopenedBranch.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,previousFrost);
   assert.deepEqual(branchMap.pieces[1],frostMoved.pieces[1]);assert.equal(branchMap.pieces.length,2);assert.equal(branchMap.pieces[0].quantity,null);assert.equal(branchMap.pieces[1].quantity,0);
   assert.equal(reopenedBranch.session.assertions.find(a=>a.field==='record-note.scenario'&&a.status==='accepted')?.value,'기존 임무 원문 · 번호/진행 미확인');
   assert.deepEqual(reopenedBranch.session.assertions.find(a=>a.field==='private.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,privateAbility);
   assert.deepEqual(reopenedBranch.session.assertions.find(a=>a.field==='town.scene'&&a.status==='accepted')?.value,changedBuilding);
   assert.equal(reopenedBranch.pack.runtime?.source.sha256,frost.body.pack.runtime.source.sha256);previousFrost=branchMap;
  }


  // Scenario63 reuses manual figure health. Zero/null are real user values,
  // separate from source immobility or a source-derived HP formula/round phase.
  for(const health of [0,null]){
   const crainRecord=structuredClone(previousFrost),crain=crainRecord.pieces[0],readout=crain.readout;assert(readout&&'values'in readout);
   crain.readout=setReadoutValue(frost.body.pack,setReadoutValue(frost.body.pack,setReadoutValue(frost.body.pack,readout,'instanceLabel','사용자 선택 Crain'),'rank',null),'health',health);
   crain.placement={areaId:'battle',x:.631,y:.380,rotation:90,layoutVariant:realSlotLayoutVariant('frosthaven-scenario63-v1')};
   assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:crainRecord}]})).status,200);assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
   const reopenedCrain=(await call(fp)).body as SessionView;
   assert.deepEqual(reopenedCrain.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,crainRecord);
   assert.deepEqual(reopenedCrain.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,previousFrost);
   assert.equal(crain.readout.values.health,health);assert.equal(crain.readout.values.rank,null);assert.equal(crain.quantity,null);assert.equal(crain.id,previousFrost.pieces[0].id);
   assert.deepEqual(crainRecord.pieces[1],previousFrost.pieces[1]);assert.equal(crainRecord.pieces.length,2);
   assert.deepEqual(reopenedCrain.session.assertions.find(a=>a.field==='private.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,privateAbility);
   assert.deepEqual(reopenedCrain.session.assertions.find(a=>a.field==='town.scene'&&a.status==='accepted')?.value,changedBuilding);
   assert.equal(reopenedCrain.session.assertions.find(a=>a.field==='record-note.scenario'&&a.status==='accepted')?.value,'기존 임무 원문 · 번호/진행 미확인');
   assert.equal(reopenedCrain.pack.runtime?.source.sha256,frost.body.pack.runtime.source.sha256);previousFrost=crainRecord;
  }

  // An actual enemy represented by a numbered token uses the existing figure fields;
  // its user-confirmed number/health are not template defaults or quantity arithmetic.
  const sparkRecord=structuredClone(previousFrost),sparkFigure=sparkRecord.pieces[0],sparkReadout=sparkFigure.readout;assert(sparkReadout&&'values'in sparkReadout);
  sparkFigure.readout=setReadoutValue(frost.body.pack,setReadoutValue(frost.body.pack,sparkReadout,'instanceLabel','사용자 확인 스파크7'),'health',0);
  sparkFigure.placement={areaId:'battle',x:.245,y:.565,rotation:90,layoutVariant:realSlotLayoutVariant('frosthaven-scenario34-v1')};
  assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:sparkRecord}]})).status,200);assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
  const sparkSaved=(await call(fp)).body as SessionView;
  assert.deepEqual(sparkSaved.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,sparkRecord);
  assert.deepEqual(sparkSaved.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,previousFrost);
  const unknownSpark=structuredClone(sparkRecord),knownReadout=unknownSpark.pieces[0].readout;assert(knownReadout&&'values'in knownReadout);
  unknownSpark.pieces[0].readout=setReadoutValue(frost.body.pack,knownReadout,'health',null);
  assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:unknownSpark}]})).status,200);assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
  const sparkReopened=(await call(fp)).body as SessionView;
  assert.deepEqual(sparkReopened.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,unknownSpark);
  assert.deepEqual(sparkReopened.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,sparkRecord);
  assert.deepEqual(unknownSpark.pieces[1],previousFrost.pieces[1]);assert.equal(unknownSpark.pieces[0].quantity,null);assert.equal(unknownSpark.pieces[1].quantity,0);
  previousFrost=unknownSpark;

  // Work tokens are a distinct user-confirmed fact, never piece quantity or health.
  const workNote='합성 직접 기록: 현재 목표C / B 작업토큰3 / C 작업토큰1 / 문1 확인 전';
  assert.equal((await call(fp,'PATCH',{answers:[{field:'record-note.scenario',value:workNote}]})).status,200);
  assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
  const workReopened=(await call(fp)).body as SessionView;
  assert.equal(workReopened.session.assertions.find(a=>a.field==='record-note.scenario'&&a.status==='accepted')?.value,workNote);
  assert.equal(workReopened.session.snapshots.at(-2)!.assertions.find(a=>a.field==='record-note.scenario')?.value,'기존 임무 원문 · 번호/진행 미확인');
  assert.deepEqual(workReopened.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,previousFrost);
  assert.deepEqual(workReopened.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,previousFrost);
  assert.deepEqual(workReopened.session.assertions.find(a=>a.field==='private.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,privateAbility);

  // Door destruction is a user-confirmed map fact; it does not remove the
  // record, add floor, change its zero quantity or apply a spawn/HP formula.
  const intactDoor=structuredClone(previousFrost),doorPiece=intactDoor.pieces[1],doorReadout=doorPiece.readout;assert(doorReadout&&'values'in doorReadout);
  doorPiece.readout=setReadoutValue(frost.body.pack,doorReadout,'featureType','사용자 확인 금속문a · 파괴 미확인');
  doorPiece.placement={areaId:'battle',x:.135,y:.162,rotation:90,layoutVariant:realSlotLayoutVariant('frosthaven-scenario36-v1')};
  assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:intactDoor}]})).status,200);assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
  const destroyedDoor=structuredClone(intactDoor),pendingDoorReadout=destroyedDoor.pieces[1].readout;assert(pendingDoorReadout&&'values'in pendingDoorReadout);
  destroyedDoor.pieces[1].readout=setReadoutValue(frost.body.pack,pendingDoorReadout,'featureType','사용자 확인 금속문a · 파괴 확인');
  assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:destroyedDoor}]})).status,200);assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
  const doorSaved=(await call(fp)).body as SessionView;
  assert.deepEqual(doorSaved.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,destroyedDoor);
  assert.deepEqual(doorSaved.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,intactDoor);
  assert.deepEqual(destroyedDoor.pieces[0],previousFrost.pieces[0]);assert.equal(destroyedDoor.pieces[1].quantity,0);assert.equal(destroyedDoor.pieces.length,2);
  assert.deepEqual(destroyedDoor.pieces[1].placement,intactDoor.pieces[1].placement);
  previousFrost=destroyedDoor;

  // Door time tokens are an explicit user fact in the existing map text field,
  // not HP/quantity, automatic countdown, zero-triggered deletion or inferred loss.
  for(const fact of ['문1 · 미개방 · 남은 표식 미확인','문1 · 미개방 · 남은 표식0 · 사용자 확인']){
   const timerRecord=structuredClone(previousFrost),timerDoor=timerRecord.pieces[1],timerReadout=timerDoor.readout;assert(timerReadout&&'values'in timerReadout);
   timerDoor.readout=setReadoutValue(frost.body.pack,timerReadout,'featureType',fact);
   timerDoor.placement={areaId:'battle',x:.148,y:.645,rotation:90,layoutVariant:realSlotLayoutVariant('frosthaven-scenario39-v1')};
   assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:timerRecord}]})).status,200);assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
   const timerSaved=(await call(fp)).body as SessionView;
   assert.deepEqual(timerSaved.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,timerRecord);
   assert.deepEqual(timerSaved.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,previousFrost);
   assert.equal(timerDoor.quantity,0);assert.equal(timerDoor.id,previousFrost.pieces[1].id);assert.equal(timerRecord.pieces.length,2);assert.deepEqual(timerRecord.pieces[0],previousFrost.pieces[0]);
   assert.deepEqual(timerSaved.session.assertions.find(a=>a.field==='private.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,privateAbility);
   assert.deepEqual(timerSaved.session.assertions.find(a=>a.field==='town.scene'&&a.status==='accepted')?.value,changedBuilding);
   assert.equal(timerSaved.pack.runtime?.source.sha256,frost.body.pack.runtime.source.sha256);previousFrost=timerRecord;
  }

  // A user records the same ally's manual display label, rank and health at the same hex.
  // No kit count, turn eligibility or HP=1 is generated from a source template.
  for(const [health,rank,label]of [[0,null,'구조 아군 · 받침 없음 · 사용자 확인'],[1,'일반','구조 아군 · 일반 받침 · 다음 라운드 미행동']] as const){
   const aidRecord=structuredClone(previousFrost),ally=aidRecord.pieces[0],allyReadout=ally.readout;assert(allyReadout&&'values'in allyReadout);
   ally.readout=setReadoutValue(frost.body.pack,setReadoutValue(frost.body.pack,setReadoutValue(frost.body.pack,allyReadout,'instanceLabel','사용자 확인 구조 아군'),'rank',rank),'health',health);
   ally.label=label;
   ally.placement={areaId:'battle',x:.482,y:.2895,rotation:90,layoutVariant:realSlotLayoutVariant('frosthaven-scenario40-v1')};
   assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:aidRecord}]})).status,200);assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
   const aidSaved=(await call(fp)).body as SessionView;
   assert.deepEqual(aidSaved.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,aidRecord);
   assert.deepEqual(aidSaved.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,previousFrost);
   assert.equal(ally.readout.values.rank,rank);assert.equal(ally.readout.values.health,health);assert.equal(ally.label,label);
   assert.equal(ally.id,previousFrost.pieces[0].id);assert.equal(ally.quantity,null);assert.deepEqual(aidRecord.pieces[1],previousFrost.pieces[1]);assert.equal(aidRecord.pieces.length,2);
   assert.deepEqual(aidSaved.session.assertions.find(a=>a.field==='private.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,privateAbility);
   assert.deepEqual(aidSaved.session.assertions.find(a=>a.field==='town.scene'&&a.status==='accepted')?.value,changedBuilding);
   assert.equal(aidSaved.session.assertions.find(a=>a.field==='record-note.scenario'&&a.status==='accepted')?.value,workNote);
   assert.equal(aidSaved.pack.runtime?.source.sha256,frost.body.pack.runtime.source.sha256);previousFrost=aidRecord;
  }

  // Shared scenario41 coordinates retain the user's wall and zero quantity;
  // only an explicit PATCH moves it, never a reference wall phase or returned count.
  for(const x of [.389,.221]){
   const wallRecord=structuredClone(previousFrost),wall=wallRecord.pieces[1],wallReadout=wall.readout;assert(wallReadout&&'values'in wallReadout);
   wall.readout=setReadoutValue(frost.body.pack,wallReadout,'featureType','사용자 확인 그림자벽 · 실제 위치 직접 기록');
   wall.placement={areaId:'battle',x,y:.348,rotation:90,layoutVariant:realSlotLayoutVariant('frosthaven-scenario41-v1')};
   assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:wallRecord}]})).status,200);assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
   const wallSaved=(await call(fp)).body as SessionView;
   assert.deepEqual(wallSaved.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,wallRecord);
   assert.deepEqual(wallSaved.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,previousFrost);
   assert.equal(wall.id,previousFrost.pieces[1].id);assert.equal(wall.quantity,0);assert.equal(wallRecord.pieces.length,2);assert.deepEqual(wallRecord.pieces[0],previousFrost.pieces[0]);
   assert.deepEqual(wallSaved.session.assertions.find(a=>a.field==='private.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,privateAbility);
   assert.deepEqual(wallSaved.session.assertions.find(a=>a.field==='town.scene'&&a.status==='accepted')?.value,changedBuilding);
   assert.equal(wallSaved.pack.runtime?.source.sha256,frost.body.pack.runtime.source.sha256);previousFrost=wallRecord;
  }

  // Goal-treasure progress is an explicit same-record feature edit, not quantity or removal.
  for(const feature of ['목표 보물 · 획득 미확인','목표 보물 · 사용자 획득 확인']){
   const treasureRecord=structuredClone(previousFrost),treasure=treasureRecord.pieces[1],readout=treasure.readout;assert(readout&&'values'in readout);
   treasure.readout=setReadoutValue(frost.body.pack,readout,'featureType',feature);
   treasure.placement={areaId:'battle',x:.430,y:.126,rotation:90,layoutVariant:realSlotLayoutVariant('frosthaven-scenario42-v1')};
   assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:treasureRecord}]})).status,200);assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
   const saved=(await call(fp)).body as SessionView;
   assert.deepEqual(saved.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,treasureRecord);
   assert.deepEqual(saved.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,previousFrost);
   assert.equal(treasure.id,previousFrost.pieces[1].id);assert.equal(treasure.quantity,0);assert.equal(treasureRecord.pieces.length,2);assert.deepEqual(treasureRecord.pieces[0],previousFrost.pieces[0]);
   assert.deepEqual(saved.session.assertions.find(a=>a.field==='private.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,privateAbility);
   assert.deepEqual(saved.session.assertions.find(a=>a.field==='town.scene'&&a.status==='accepted')?.value,changedBuilding);
   assert.equal(saved.session.assertions.find(a=>a.field==='record-note.scenario'&&a.status==='accepted')?.value,workNote);
   assert.equal(saved.pack.runtime?.source.sha256,frost.body.pack.runtime.source.sha256);previousFrost=treasureRecord;
  }

  // Existing map feature text can keep a user's cabinet damage fact without quantity-as-HP.
  for(const feature of ['금속 캐비닛 · 남은 HP 미확인','금속 캐비닛 · 사용자 확인 HP0(파괴)']){
   const cabinetRecord=structuredClone(previousFrost),cabinet=cabinetRecord.pieces[1],readout=cabinet.readout;assert(readout&&'values'in readout);
   cabinet.readout=setReadoutValue(frost.body.pack,readout,'featureType',feature);
   cabinet.placement={areaId:'battle',x:.259,y:.356,rotation:90,layoutVariant:realSlotLayoutVariant('frosthaven-scenario44-v1')};
   assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:cabinetRecord}]})).status,200);assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
   const saved=(await call(fp)).body as SessionView;
   assert.deepEqual(saved.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,cabinetRecord);
   assert.deepEqual(saved.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,previousFrost);
   assert.equal(cabinet.id,previousFrost.pieces[1].id);assert.equal(cabinet.quantity,0);assert.deepEqual(cabinetRecord.pieces[0],previousFrost.pieces[0]);assert.equal(cabinetRecord.pieces.length,2);
   assert.deepEqual(saved.session.assertions.find(a=>a.field==='private.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,privateAbility);
   assert.deepEqual(saved.session.assertions.find(a=>a.field==='town.scene'&&a.status==='accepted')?.value,changedBuilding);
   assert.equal(saved.session.assertions.find(a=>a.field==='record-note.scenario'&&a.status==='accepted')?.value,workNote);
   assert.equal(saved.pack.runtime?.source.sha256,frost.body.pack.runtime.source.sha256);previousFrost=cabinetRecord;
  }

  // Explicit user revision of one actual map record; no template-driven altar/fog conversion.
  const altarRecord=structuredClone(previousFrost),altar=altarRecord.pieces[1],altarReadout=altar.readout;assert(altarReadout&&'values'in altarReadout);
  altar.placement={areaId:'battle',x:.272,y:.298,rotation:90,layoutVariant:realSlotLayoutVariant('frosthaven-scenario19-v1')};
  altar.readout=setReadoutValue(frost.body.pack,altarReadout,'featureType','사용자 확인 제단');
  assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:altarRecord}]})).status,200);assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
  const altarSaved=(await call(fp)).body as SessionView;assert.deepEqual(altarSaved.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,altarRecord);
  const fogRecord=structuredClone(altarRecord),fog=fogRecord.pieces[1],fogReadout=fog.readout;assert(fogReadout&&'values'in fogReadout);
  fog.readout=setReadoutValue(frost.body.pack,fogReadout,'featureType','사용자 확인 어둠 안개');
  assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:fogRecord}]})).status,200);assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
  const fogSaved=(await call(fp)).body as SessionView;assert.deepEqual(fogSaved.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,fogRecord);
  assert.deepEqual(fogSaved.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,altarRecord);assert.deepEqual(fog.placement,altar.placement);assert.equal(fogRecord.pieces.length,2);assert.equal(fog.quantity,0);assert.deepEqual(fogRecord.pieces[0],altarRecord.pieces[0]);
  assert.deepEqual(fogSaved.session.assertions.find(a=>a.field==='private.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,privateAbility);assert.deepEqual(fogSaved.session.assertions.find(a=>a.field==='town.scene'&&a.status==='accepted')?.value,changedBuilding);assert.equal(fogSaved.pack.runtime?.source.sha256,frost.body.pack.runtime.source.sha256);

  // Explicit user-confirmed water on a real hold border position, not diagram-seeded flooding.
  const waterRecord=structuredClone(fogRecord),water=waterRecord.pieces[1],waterReadout=water.readout;assert(waterReadout&&'values'in waterReadout);
  water.placement={areaId:'battle',x:.46,y:.233,rotation:90,layoutVariant:realSlotLayoutVariant('frosthaven-scenario22-v1')};
  water.readout=setReadoutValue(frost.body.pack,waterReadout,'featureType','사용자 확인 침수 · 피해 수치 미확인');
  assert.equal((await call(fp,'PATCH',{answers:[{field:'battle.scene',value:waterRecord}]})).status,200);assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
  const waterSaved=(await call(fp)).body as SessionView;
  assert.deepEqual(waterSaved.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,waterRecord);
  assert.deepEqual(waterSaved.session.snapshots.at(-2)!.assertions.find(a=>a.field==='battle.scene')?.value,fogRecord);
  assert.equal(waterRecord.pieces.length,2);assert.equal(water.quantity,0);assert.equal(water.id,fog.id);assert.deepEqual(waterRecord.pieces[0],fogRecord.pieces[0]);
  assert.deepEqual(waterSaved.session.assertions.find(a=>a.field==='private.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,privateAbility);
  assert.deepEqual(waterSaved.session.assertions.find(a=>a.field==='town.scene'&&a.status==='accepted')?.value,changedBuilding);
  assert.equal(waterSaved.pack.runtime?.source.sha256,frost.body.pack.runtime.source.sha256);

  // Existing public manual field records a user's revealed numbered-token facts, with unrevealed order unknown.
  const tokenNote='사용자 확인 공개 번호 3 · 효과 적용 전 / 미공개 순서 미확인';
  assert.equal((await call(fp,'PATCH',{answers:[{field:'record-note.scenario',value:tokenNote}]})).status,200);
  assert.equal((await call(fp+'/commit','POST',{allowIncomplete:true})).status,200);
  const noteSaved=(await call(fp)).body as SessionView;
  assert.equal(noteSaved.session.assertions.find(a=>a.field==='record-note.scenario'&&a.status==='accepted')?.value,tokenNote);
  assert.equal(noteSaved.session.snapshots.at(-2)!.assertions.find(a=>a.field==='record-note.scenario')?.value,workNote);
  assert.deepEqual(noteSaved.session.assertions.find(a=>a.field==='battle.scene'&&a.status==='accepted')?.value,waterRecord);
  assert.deepEqual(noteSaved.session.assertions.find(a=>a.field==='private.scene'&&a.ownerId==='p1'&&a.status==='accepted')?.value,privateAbility);
  assert.deepEqual(noteSaved.session.assertions.find(a=>a.field==='town.scene'&&a.status==='accepted')?.value,changedBuilding);

 }finally{
  server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(root,{recursive:true,force:true});
 }
});
