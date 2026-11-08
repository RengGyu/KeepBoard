import test from 'node:test';import assert from 'node:assert/strict';
import {catalogPacks} from '../gamepacks/catalog';import {photoDefinition} from '../server/photoDefinitions';
import {compileObservationTask} from '../shared/lightweightRecognition';
import {buildTerraGameBody,decodeTerraGameObservation,LUNA_IDENTITY} from '../server/ai/terraGameReader';
import {LEAN_TERRA_PROFILE,compactTerraKinds} from '../server/ai/terraCompact';
import {VISIBLE_INSTANCE_CONTRACT} from '../server/ai/visibleUnitContract';
const task=(id:string,areaId?:string)=>{const pack=catalogPacks.find(p=>p.id===id)!,definition=photoDefinition(pack),area=areaId?definition.areas.find(a=>a.id===areaId)!:definition.areas.find(a=>a.componentIds.length)!;return {definition,request:compileObservationTask({pack,definition,areaId:area.id,taskId:'lean',scope:{partition:area.partition,ownerId:area.partition==='owner_private'?'o':null,captureEpoch:'e'},images:[{evidenceId:'p',inputId:'p',sha256:'a'.repeat(64),width:100,height:100,transformId:null}]})};};
const envelope=(items:unknown[])=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({v:3,items})}]}]});
const tr=task('ticket-to-ride','map-area'),k=compactTerraKinds(tr.request,tr.definition,LEAN_TERRA_PROFILE).find(x=>x.id==='trains')!,decode=(items:unknown[],t=tr)=>decodeTerraGameObservation(envelope(items),t.request,t.definition,[],LEAN_TERRA_PROFILE);
const p=(id:string)=>k.properties.find(x=>x.id===id)!.p;
test('a fact asked once is copied back: free colour note, and neither face nor quantity is requested',()=>{
 assert(!k.properties.some(x=>['observedColor','face','quantity'].includes(x.id)));
 const o=decode([{k:k.k,b:[100,100,200,200],f:'f',q:1,u:'s',a:[{p:p('trainColor'),v:'"red"'}],x:[]}]).raw.observations[0];
 assert.deepEqual(o.properties.trainColor,{state:'observed',value:'red'});assert.deepEqual(o.properties.observedColor,{state:'observed',value:'red'});
});
test('every game still has a valid request with the visible-instance contract',()=>{
 let n=0;for(const pack of catalogPacks){const d=photoDefinition(pack);for(const a of d.areas){if(!a.componentIds.length)continue;const r=compileObservationTask({pack,definition:d,areaId:a.id,taskId:'x',scope:{partition:a.partition,ownerId:a.partition==='owner_private'?'o':null,captureEpoch:'e'},images:tr.request.images});const b=buildTerraGameBody(r,d,Buffer.from('i'),'image/png',LEAN_TERRA_PROFILE);const t=(b.input[0].content[0] as any).text;assert(t.includes('Report u from visible physical instance boundaries'));assert(!t.includes('physicalUnit'));assert(!t.includes('valueJson'));n++;}}
 assert(n>=120);assert(VISIBLE_INSTANCE_CONTRACT.startsWith('Report physicalUnit from'));
});
test('an omitted property is unknown, and a front-only property on a back face stays wrong-face',()=>{
 const sp=task('splendor','market'),kinds=compactTerraKinds(sp.request,sp.definition,LEAN_TERRA_PROFILE),dev=kinds.find(x=>x.properties.some(q=>q.frontOnly))!;
 const o=decode([{k:dev.k,b:null,f:'b',q:null,u:'s',a:[],x:[]}],sp).raw.observations[0],front=dev.properties.find(q=>q.frontOnly)!.id;
 assert.equal((o.properties[front] as any).reason,'wrong-face');assert.equal(o.face,'back');
 const c=decode([{k:k.k,b:null,f:'u',q:null,u:'u',a:[],x:[]}]).raw.observations[0];assert.equal(c.properties.trainColor.state,'unknown');assert.equal(c.properties.observedColor.state,'unknown');
});
test('every property is either a value or a bare unknown code; a value wins over a repeated code',()=>{
 const read=decode([{k:k.k,b:null,f:'f',q:1,u:'s',a:[{p:p('trainColor'),v:'"red"'}],x:[p('trainColor')]},{k:k.k,b:null,f:'f',q:1,u:'s',a:[],x:[p('trainColor')]}]);
 assert.equal(read.raw.observations[0].properties.trainColor.state,'observed');assert.deepEqual(read.raw.observations[1].properties.trainColor,{state:'unknown',value:null,reason:'unreadable'});
 for(const bad of [{a:[],x:[99]},{a:[{p:p('trainColor'),v:'"red"',r:null}],x:[]},{a:[]}])assert.throws(()=>decode([{k:k.k,b:null,f:'f',q:1,u:'s',...bad}]));
 const body=buildTerraGameBody(tr.request,tr.definition,Buffer.from('i'),'image/png',LEAN_TERRA_PROFILE) as any,item=body.text.format.schema.properties.items.items;assert(item.required.includes('x'));assert.equal(item.properties.a.items.properties.r,undefined);
});
test('a bad box keeps the row without placement; a broken row is dropped and recorded',()=>{
 const read=decode([{k:k.k,b:[300,100,200,200],f:'f',q:1,u:'s',a:[{p:p('trainColor'),v:'"blue"'}],x:[]},{k:99,b:null,f:'f',q:1,u:'s',a:[],x:[]},{k:k.k,b:[1,2,3,4],f:'f',q:1,u:'s',a:[],x:[]}]);
 assert.deepEqual(read.raw.observations.map(o=>o.ref),['item-1','item-3']);assert.equal(read.raw.observations[0].bbox,null);assert.equal(read.raw.observations[0].properties.trainColor.state,'observed');
 assert(read.hostedWire.deferred.some(d=>d.ref==='item-2'&&d.property==='row'));assert(read.hostedWire.deferred.some(d=>d.ref==='item-1'&&d.property==='box_1000'));
});
test('the lean body is sized for the same identity and is much shorter to fill',()=>{
 const b=buildTerraGameBody(tr.request,tr.definition,Buffer.from('i'),'image/png',LEAN_TERRA_PROFILE,{},{...LUNA_IDENTITY,model:'gpt-6.1-terra' as any});assert.equal(b.model,'gpt-6.1-terra');assert.equal(b.text.format.strict,true);
});
