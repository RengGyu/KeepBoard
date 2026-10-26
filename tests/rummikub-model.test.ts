import test from 'node:test';
import assert from 'node:assert/strict';
import {allRummikubTiles,applyRummikubCommand,createRummikubTile,emptyRummikub,normalizeRummikubDetailed,normalizeRummikub,recordRummikub,rummikubAnswers,undoRummikub,visibleRummikubFace} from '../shared/rummikub.ts';
import {rummikubPack} from '../gamepacks/rummikub.ts';
import {rummikubObservationPrompt,rummikubResponseSchema} from '../server/ai/rummikubPrompt.ts';

function fixture(){const s=emptyRummikub();s.groups=[{id:'a',label:'첫 묶음',tiles:[createRummikubTile('t1',{number:1,color:'red'}),createRummikubTile('t2',{number:7,color:'red'}),createRummikubTile('t3',{number:13,color:'red'})]},{id:'b',label:'둘째',tiles:[createRummikubTile('t4',{number:7,color:'red'})]}];return s;}
test('historical green printing reopens without being replaced by orange',()=>{
 const raw={...emptyRummikub(),loose:[{...createRummikubTile('green-seven'),color:'green',number:7}]};
 const normalized=normalizeRummikubDetailed(raw);
 assert.equal(normalized.scene.loose[0].color,'green');
 assert.equal(normalized.scene.loose[0].number,7);
});
test('same face physical duplicates and 1/7/13 survive normalization and JSON reopening',()=>{
 const s=fixture(),normalized=normalizeRummikub(s);assert.deepEqual(normalized,s);assert.deepEqual(normalizeRummikub(JSON.parse(JSON.stringify(s))),s);assert.deepEqual(allRummikubTiles(normalized).map(t=>t.id),['t1','t2','t3','t4']);assert.equal(allRummikubTiles(normalized).filter(t=>t.number===7).length,2);
 const duplicateId=fixture();duplicateId.groups[1].tiles[0].id='t2';const result=normalizeRummikubDetailed(duplicateId);assert.equal(allRummikubTiles(result.scene).length,4);assert.equal(new Set(allRummikubTiles(result.scene).map(t=>t.id)).size,4);assert.ok(result.warnings.length);
});
test('group move/split/merge/reorder and one undo preserve identities/order/sources',()=>{
 const original=fixture();original.groups[0].tiles[1].evidenceIds=['photo'];original.groups[0].tiles[1].region={x:.1,y:.1,width:.2,height:.3};let h={past:[],present:original} as Parameters<typeof recordRummikub>[0];
 h=recordRummikub(h,{type:'move',tileId:'t2',groupId:'b',index:1});assert.deepEqual(h.present.groups[1].tiles.map(t=>t.id),['t4','t2']);assert.deepEqual(undoRummikub(h).present,original);assert.equal(h.past.length,1);
 h=recordRummikub(h,{type:'split',groupId:'b',index:1,newGroupId:'c'});assert.deepEqual(h.present.groups.map(g=>g.tiles.map(t=>t.id)),[['t1','t3'],['t4'],['t2']]);h=recordRummikub(h,{type:'merge',fromId:'c',toId:'a'});assert.deepEqual(h.present.groups[0].tiles.map(t=>t.id),['t1','t3','t2']);h=recordRummikub(h,{type:'reorder-group',groupId:'a',index:1});assert.equal(h.present.groups[1].id,'a');assert.deepEqual(allRummikubTiles(h.present).find(t=>t.id==='t2')?.evidenceIds,['photo']);assert.deepEqual(allRummikubTiles(h.present).find(t=>t.id==='t2')?.region,original.groups[0].tiles[1].region);
 const loose=applyRummikubCommand(h.present,{type:'move',tileId:'t2',groupId:null,index:0});assert.equal(loose.loose[0].id,'t2');assert.equal(allRummikubTiles(loose).length,4);assert.deepEqual(original,fixtureWithPhoto());
});
function fixtureWithPhoto(){const s=fixture();s.groups[0].tiles[1].evidenceIds=['photo'];s.groups[0].tiles[1].region={x:.1,y:.1,width:.2,height:.3};return s;}
test('unknown is not zero; invalid bounds are not clamped and invalid commands are atomic',()=>{
 const s=fixture();s.loose=[createRummikubTile('unknown',{kind:'unknown'}),createRummikubTile('joker',{kind:'joker',representedNumber:13,representedColor:'blue'})];const raw=JSON.parse(JSON.stringify(s));raw.groups[0].tiles[0].number=0;raw.groups[0].tiles[1].number=14;raw.groups[0].tiles[2].number=1.5;const r=normalizeRummikubDetailed(raw);assert.deepEqual(r.scene.groups[0].tiles.map(t=>t.number),[null,null,null]);assert.equal(r.scene.loose[1].representedNumber,13);assert.equal(r.scene.loose[0].number,null);assert.ok(r.warnings.length);assert.throws(()=>applyRummikubCommand(s,{type:'edit',tileId:'t1',patch:{number:0}}));assert.throws(()=>applyRummikubCommand(s,{type:'move',tileId:'t1',groupId:'missing',index:0}));assert.equal(s.groups[0].tiles[0].number,1);assert.equal(normalizeRummikubDetailed({components:[]}).recognized,false);
});
test('private scope and owner are independent of tile color and unrelated owners are rejected',()=>{
 const s=emptyRummikub('blue-player');s.loose=[createRummikubTile('red-tile',{color:'red',number:7})];assert.equal(normalizeRummikub(s,{ownerId:'blue-player'}).loose[0].color,'red');assert.equal(normalizeRummikubDetailed(s,{ownerId:'red-player'}).recognized,false);assert.equal(normalizeRummikubDetailed(s).recognized,false);assert.throws(()=>rummikubAnswers(s));assert.equal(rummikubAnswers(s,'blue-player')[0].field,'rack.scene');const field=rummikubPack.fields.find(f=>f.key==='rack.scene')!;assert.deepEqual([field.scope,field.visibility,field.presentation],['player','owner',undefined]);assert.equal(rummikubPack.id,'rummikub');assert.equal(rummikubPack.requirements.length,0);
});
test('crop stays on first authorized original and never shifts to later photo',()=>{
 const s=fixtureWithPhoto();const t=s.groups[0].tiles[1];t.evidenceIds=['photo','second'];let normalized=normalizeRummikub(s,{evidenceIds:['photo','second']});assert.deepEqual(normalized.groups[0].tiles[1].region,t.region);normalized=normalizeRummikub(s,{evidenceIds:['second']});assert.deepEqual(normalized.groups[0].tiles[1].evidenceIds,['second']);assert.equal(normalized.groups[0].tiles[1].region,null);assert.equal(normalizeRummikub(s,{evidenceIds:[]}).groups[0].tiles[1].region,null);
});
test('prompt uses dedicated schema, actual authorized IDs and no private rack inference from public image',()=>{
 const evidence=[{id:'public',scope:'public' as const,label:'판'},{id:'mine',scope:'player' as const,ownerId:'p1',label:'내 타일'},{id:'other',scope:'player' as const,ownerId:'p2',label:'다른 타일'}];const p=rummikubObservationPrompt({evidence,ownerId:'p1'});assert.ok(p.includes('사진 ID: ["mine"]'));assert.ok(p.includes('rack.scene'));assert.ok(p.includes('7 포함'));assert.ok(p.includes('같은 삽화나 숫자라는 이유만으로'));assert.equal(rummikubResponseSchema('p1').properties.assertions.items.properties.ownerId.const,'p1');
});
test('add/remove retain physical duplicates; no-op does not spend undo and rejected merge loses nothing',()=>{
 let h={past:[],present:fixture()} as Parameters<typeof recordRummikub>[0];const before=JSON.stringify(h.present);
 h=recordRummikub(h,{type:'move',tileId:'t2',groupId:'a',index:1});assert.equal(h.past.length,0);assert.equal(JSON.stringify(h.present),before);
 assert.throws(()=>applyRummikubCommand(h.present,{type:'add',tile:createRummikubTile('t1'),groupId:null}));assert.throws(()=>applyRummikubCommand(h.present,{type:'merge',fromId:'a',toId:'missing'}));assert.equal(JSON.stringify(h.present),before);
 h=recordRummikub(h,{type:'add',tile:createRummikubTile('new-copy',{color:'red',number:7}),groupId:'b'});assert.equal(allRummikubTiles(h.present).filter(t=>t.number===7).length,3);h=recordRummikub(h,{type:'remove',tileId:'t4'});assert.ok(allRummikubTiles(h.present).some(t=>t.id==='new-copy'));assert.ok(!allRummikubTiles(h.present).some(t=>t.id==='t4'));assert.deepEqual(undoRummikub(h).present.groups[1].tiles.map(t=>t.id),['t4','new-copy']);
});
test('unknown kind/face and back never present preserved numbers/color as a confirmed front',()=>{
 const tile=createRummikubTile('known',{color:'blue',number:13});assert.deepEqual(visibleRummikubFace(tile),{kind:'number',color:'blue',number:13});
 for(const patch of [{face:'back' as const},{face:'unknown' as const},{kind:'unknown' as const}]){const hidden={...tile,...patch};const shown=visibleRummikubFace(hidden);assert.equal(shown.number,null);assert.equal(shown.color,null);assert.equal(hidden.number,13);assert.equal(hidden.color,'blue');}
});

test('Classic observation policy limits new ink to four colors while legacy reopening preserves green',()=>{
 const raw={...emptyRummikub(),loose:[{...createRummikubTile('legacy'),color:'green',representedColor:'green',number:7}]};
 assert.equal(normalizeRummikubDetailed(raw).scene.loose[0].color,'green');
 const observed=normalizeRummikubDetailed(raw,{colorPolicy:'classic'});
 assert.equal(observed.scene.loose[0].color,null);assert.equal(observed.scene.loose[0].representedColor,null);
 assert(observed.warnings.length);assert(!JSON.stringify(rummikubResponseSchema()).includes('"green"'));
});
test('commands reject new green ink but keep unchanged legacy faces through moves, edits and undo',()=>{
 const original=emptyRummikub();original.loose=[createRummikubTile('legacy',{color:'green',number:7}),createRummikubTile('blue',{color:'blue',number:7}),createRummikubTile('joker',{kind:'joker',representedColor:'green',representedNumber:7})];
 const moved=applyRummikubCommand(original,{type:'group',id:'g'});
 const kept=applyRummikubCommand(moved,{type:'move',tileId:'legacy',groupId:'g',index:0});assert.equal(kept.groups[0].tiles[0].color,'green');
 assert.equal(applyRummikubCommand(kept,{type:'edit',tileId:'legacy',patch:{note:'moved only'}}).groups[0].tiles[0].color,'green');
 assert.throws(()=>applyRummikubCommand(original,{type:'add',tile:createRummikubTile('new',{color:'green'}),groupId:null}),/색/);
 assert.throws(()=>applyRummikubCommand(original,{type:'edit',tileId:'blue',patch:{color:'green'}}),/색/);
 assert.throws(()=>applyRummikubCommand(original,{type:'edit',tileId:'blue',patch:{representedColor:'green'}}),/색/);
 assert.equal(applyRummikubCommand(original,{type:'edit',tileId:'legacy',patch:{color:'orange'}}).loose[0].color,'orange');
 assert.equal(original.loose[0].color,'green');
});
