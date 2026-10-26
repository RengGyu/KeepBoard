import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileArtMapping,recognitionSource} from '../tools/game-runtime/revise-inputs.ts';

test('revised component catalog retains old art for saved records and leaves newly separated types unknown',()=>{
 const old:any={components:[{component_id:'old',name:'old',kind:'piece',variants:[{name:'original',layers:[{asset_id:'existing'}]}]}],areas:[]};
 const spec:any={game_id:'test',name_ko:'검사',name_en:'test',edition:{id:'base'},components:[{id:'new',name:'새 구성물',kind:'token',description:'구분한 실물',quantity:null,confidence:'reported'}],layout:{areas:[]}};
 const before=JSON.stringify(old),actual=reconcileArtMapping(old,spec,'digest');
 assert.equal(JSON.stringify(old),before);
 assert.deepEqual(actual.components.find((c:any)=>c.component_id==='old').variants,old.components[0].variants);
 assert.equal(actual.components.find((c:any)=>c.component_id==='old').legacy,true);
 const added=actual.components.find((c:any)=>c.component_id==='new');
 assert.equal(added.status,'common-reuse','a reported component is not marked unclear, but it gets no drawn face');
 assert.deepEqual(added.variants,[{name:'전용 그림 없음 · 실물 기준',layers:[{asset_id:'common.unknown'}],unresolved:true}]);
 assert.equal(reconcileArtMapping(old,{...spec,components:[{...spec.components[0],confidence:'unclear'}]},'digest').components.find((c:any)=>c.component_id==='new').status,'unclear');
 assert.equal(actual.source_sha256,'digest');
});

test('a new recognition source pins its own fields and forbids hidden, own-hidden and role-restricted acquisition',()=>{
 const spec:any={edition:{id:'base'},state_fields:['public','owner','hidden','own-hidden','role-limited'].map((visibility,i)=>({id:'f'+i,type:'component-scene',scope:i===0?'public':'player',visibility,component_ids:['card'],area_ids:['area'],acquisition:['photo']})),recognition_correction:{photographable_field_ids:['f0','f1','f2','f3','f4']}};
 const row=recognitionSource(spec,'current');
 assert.deepEqual(row.sha256,['current']);
 assert.deepEqual(row.fields.map((f:any)=>f.photo),[true,true,false,false,false]);
 assert.deepEqual(row.fields.map((f:any)=>f.visibility),['public','owner','hidden','own-hidden','role-limited']);
});

test('a revised source keeps the prior approved photo permission of an unchanged owner field, never for a field whose visibility changed',()=>{
 const spec:any={edition:{id:'base'},state_fields:[{id:'reserve',type:'component-scene',scope:'player',visibility:'owner',acquisition:['photo'],component_ids:['card'],area_ids:['reserve']},{id:'moved',type:'component-scene',scope:'player',visibility:'hidden',acquisition:['photo'],component_ids:['card'],area_ids:['deck']}],recognition_correction:{photographable_field_ids:[]}};
 const prior={fields:[{id:'reserve',scope:'player',visibility:'owner',photo:true},{id:'moved',scope:'player',visibility:'owner',photo:true}]};
 assert.deepEqual(recognitionSource(spec,'new',prior).fields.map((f:any)=>f.photo),[true,false]);
 assert.deepEqual(recognitionSource(spec,'new').fields.map((f:any)=>f.photo),[false,false]);
});
