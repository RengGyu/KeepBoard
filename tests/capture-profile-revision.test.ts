import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCaptureProfile} from '../tools/game-runtime/revise-capture.ts';

const source:any={game_id:'sample',edition:{id:'base'},layout:{areas:[
 {id:'market',name:'공용 진열',scope:'public',visibility:'public',component_ids:['cards'],anchor_contract:'진열 순서'},
 {id:'tableau',name:'개인 공개판',scope:'player',visibility:'public',component_ids:['cards'],anchor_contract:'공개 배치'},
 {id:'hand',name:'본인 손패',scope:'player',visibility:'owner',component_ids:['cards'],anchor_contract:'소유자만'},
 {id:'own-hidden',name:'자신에게 숨긴 손패',scope:'player',visibility:'own-hidden',component_ids:['cards']},
 {id:'key',name:'역할 전용 키',scope:'player',visibility:'role-limited',component_ids:['cards']},
 {id:'deck',name:'미공개 덱',scope:'shared-secret',visibility:'hidden',component_ids:['cards']},
]},state_fields:['market','tableau','hand','own-hidden','key','deck'].map(id=>({id:id+'.scene',acquisition:['photo']})),recognition_correction:{photographable_field_ids:['market.scene','tableau.scene','hand.scene']}};
const pack:any={id:'sample',runtime:{support:{recording:'generic'},source:{gameId:'sample',editionId:'base',sha256:'source'},fieldBindings:source.layout.areas.map((a:any)=>({key:a.id+'.scene',sourceId:a.id+'.scene',areaIds:[a.id],componentIds:['cards'],editor:'component-catalog',scope:a.scope,visibility:a.visibility}))},fields:source.layout.areas.map((a:any)=>({key:a.id+'.scene'}))};
const profile:any={game_id:'sample',capture_focus:'눈에 보이는 판',areas:source.layout.areas,components:[]};

test('source revision preserves common/public-player/owner distinctions and excludes concealed or role-only capture',()=>{
 const actual=buildCaptureProfile(source,pack,profile,{cards:['face','number']});
 assert.deepEqual(actual.areas.map(a=>[a.id,a.partition,a.fields]),[
  ['market','common_public',['market.scene']],['tableau','player_public',['__photo.public']],['hand','owner_private',['hand.scene']],
 ]);
 assert.equal(actual.sourceSHA,'source');
 assert.deepEqual(actual.visible,{cards:['face','number']});
});

test('capture fields require current source photo permission, matching area, and a representable runtime binding',()=>{
 const changed=structuredClone(pack);changed.runtime.fieldBindings.find((b:any)=>b.sourceId==='market.scene').editor='physical-only';
 const spec=structuredClone(source);spec.recognition_correction.photographable_field_ids=['market.scene','tableau.scene'];
 const actual=buildCaptureProfile(spec,changed,profile,{});
 assert.deepEqual(actual.areas.map(a=>[a.id,a.fields]),[['market',[]],['tableau',['__photo.public']],['hand',[]]]);
 assert.throws(()=>buildCaptureProfile(source,{...pack,runtime:{...pack.runtime,source:{...pack.runtime.source,editionId:'other'}}},profile,{}),/source\/edition/);
});

test('a prior approved owner-private photo field survives a source revision of the same area; a new area is not widened by it',()=>{
 const spec=structuredClone(source);spec.recognition_correction.photographable_field_ids=['market.scene','tableau.scene'];
 const prior:any={areas:[{id:'hand',partition:'owner_private',fields:['hand.scene']},{id:'deck',partition:'owner_private',fields:['deck.scene']}]};
 const actual=buildCaptureProfile(spec,pack,profile,{},prior);
 assert.deepEqual(actual.areas.map(a=>[a.id,a.fields]),[['market',['market.scene']],['tableau',['__photo.public']],['hand',['hand.scene']]],'hidden deck stays excluded even if a prior row named it');
 const moved=structuredClone(pack);moved.runtime.fieldBindings.find((b:any)=>b.sourceId==='hand.scene').visibility='public';
 assert.deepEqual(buildCaptureProfile(spec,moved,profile,{},prior).areas.find(a=>a.id==='hand')!.fields,[],'a changed visibility needs fresh source permission');
});
