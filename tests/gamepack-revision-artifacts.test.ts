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
 assert.equal(actual.components.find((c:any)=>c.component_id==='new').status,'unclear');
 assert.deepEqual(actual.components.find((c:any)=>c.component_id==='new').variants,[]);
 assert.equal(actual.source_sha256,'digest');
});

test('a new recognition source pins its own fields and forbids hidden, own-hidden and role-restricted acquisition',()=>{
 const spec:any={edition:{id:'base'},state_fields:['public','owner','hidden','own-hidden','role-limited'].map((visibility,i)=>({id:'f'+i,type:'component-scene',scope:i===0?'public':'player',visibility,component_ids:['card'],area_ids:['area'],acquisition:['photo']})),recognition_correction:{photographable_field_ids:['f0','f1','f2','f3','f4']}};
 const row=recognitionSource(spec,'current');
 assert.deepEqual(row.sha256,['current']);
 assert.deepEqual(row.fields.map((f:any)=>f.photo),[true,true,false,false,false]);
 assert.deepEqual(row.fields.map((f:any)=>f.visibility),['public','owner','hidden','own-hidden','role-limited']);
});
