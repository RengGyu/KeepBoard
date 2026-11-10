import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {catalogPacks} from '../gamepacks/catalog';import {effectiveRecognitionPack} from '../shared/recognition';import {componentDefinition,emptyGameReadout} from '../shared/readouts/registry';
import {applyQuickChoice,bulkChoice,nextOption,quickChoice,quickValue} from '../src/quickCorrection';import {readingGaps} from '../src/readingGaps';import {ChipPick} from '../src/QuickPick';
const pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id==='sagrada')!),ids=pack.runtime!.fieldBindings.find(b=>b.editor==='component-catalog')!.componentIds;
const card=(id:string,readout:unknown=emptyGameReadout(pack,'cards'))=>({id,componentId:'cards',variant:null,quantity:1,label:'',anchor:'',evidenceId:'e',region:null,readout}) as any;
test('the choices come from the pack; a value with no fixed choices offers none',()=>{
 const c=quickChoice(pack,card('a'),ids)!;assert.equal(c.fieldId,'face');assert.equal(c.current,null);assert.equal(c.options.length,2);
 const die=quickChoice(pack,{...card('d',emptyGameReadout(pack,'dice')),componentId:'dice'},ids)!;assert.equal(die.fieldId,'dieValue');assert.deepEqual(die.options.map(o=>o.value),[1,2,3,4,5,6]);
 const unknown=quickChoice(pack,{...card('u'),componentId:null,label:'미확인 실물'},ids)!;assert.equal(unknown.fieldId,null);assert.deepEqual(unknown.options.map(o=>o.value).sort(),[...ids].sort());
 const patched=applyQuickChoice(pack,{...card('u'),componentId:null,label:'미확인 실물'},null,'cards');assert.equal(patched.componentId,'cards');assert.equal(patched.label,'');
});
test('set-all needs several pieces and few options; values are validated and tapping cycles',()=>{
 assert.equal(bulkChoice(pack,[card('a')],ids),null,'one piece is not a batch');
 const b=bulkChoice(pack,[card('a'),card('b')],ids)!;assert.equal(b.fieldId,'face');assert.deepEqual(b.ids,['a','b']);
 const front=b.options[0].value,v=applyQuickChoice(pack,card('a'),'face',front);assert.equal(quickValue(pack,{...card('a'),...v},'face'),front);
 assert.equal(bulkChoice(pack,[{...card('a'),...v},{...card('b'),...v}],ids),null,'nothing left to set');
 assert.throws(()=>applyQuickChoice(pack,card('a'),'face','sideways'));
 const yes=[{value:true,label:'있음'},{value:false,label:'없음'}];assert.equal(nextOption(yes,null),true);assert.equal(nextOption(yes,true),false);assert.equal(nextOption(yes,false),true);
});
test('a kind nobody could name offers set-all when the pack has only a few kinds',()=>{
 const two={...pack,runtime:{...pack.runtime!,components:pack.runtime!.components.slice(0,2)}} as any,keep=two.runtime.components.map((c:any)=>c.id);
 const b=bulkChoice(two,[{...card('a'),componentId:null},{...card('b'),componentId:null}],keep)!;assert.equal(b.fieldId,null);assert.deepEqual(b.ids,['a','b']);
});
const receipt=(states:(string|null)[])=>({observationReceipts:[{result:{observations:states.map(reason=>({componentId:'x',properties:{p:reason?{state:'unknown',value:null,reason}:{state:'observed',value:1}}}))}}],status:'accepted'}) as any;
test('the extra-photo prompt follows one rule for every game',()=>{
 assert.deepEqual(readingGaps([receipt(['unreadable','occluded','ambiguous',null,null,null])]),{unread:3,total:6});
 assert.equal(readingGaps([receipt(['unreadable','occluded',null,null])]),null,'too few');
 assert.equal(readingGaps([receipt(['unreadable','occluded','ambiguous',...Array(9).fill(null)])]),null,'too small a share');
 assert.equal(readingGaps([receipt(['wrong-face','wrong-face','not-present-unconfirmed'])]),null,'not something a closer photo fixes');
 assert.equal(readingGaps([{...receipt(['unreadable','occluded','ambiguous']),ownerId:'p1'}]),null,'other owner');
 const noted=receipt(['unreadable','occluded','ambiguous']);for(const o of noted.observationReceipts[0].result.observations)o.properties={observedColor:o.properties.p};assert.equal(readingGaps([noted]),null,'a colour note alone does not ask for a photo');
});
test('없음 only appears where a caller can remove the piece',()=>{
 const base={label:'종류',options:[{value:'a',label:'A'}],value:'a',onChange(){}};
 assert.match(renderToStaticMarkup(React.createElement(ChipPick as any,{...base,onNone(){}})),/qp-none[^>]*>없음/);assert.doesNotMatch(renderToStaticMarkup(React.createElement(ChipPick as any,base)),/qp-none/);
});
import {CATAN_TOPOLOGY as T} from '../shared/scene';import {boardFit,fitPerspective,suggestSlots} from '../shared/catanSlotSuggestion';
// A tilted camera: board units to normalized photo coordinates.
const toPhoto=(p:{x:number;y:number})=>{const w=1+.03*p.y;return {x:(.5+.08*p.x+.01*p.y)/w,y:(.5+.02*p.x+.07*p.y)/w};};
const at=(p:{x:number;y:number})=>{const c=toPhoto(p);return {x:c.x-.02,y:c.y-.02,width:.04,height:.04};};
const hexes=(n=19)=>T.hexes.slice(0,n).map(h=>({id:'t'+h.id,kind:'terrain',variant:'forest',ownerId:null,quantity:1,location:{type:'hex',id:h.id},region:at(h),evidenceId:'e'}));
const loose=(id:string,kind:string,p:{x:number;y:number},location:any={type:'unplaced',id:null})=>({id,kind,variant:null,ownerId:null,quantity:1,location,region:at(p),evidenceId:'e'});
const sceneOf=(components:any[])=>({version:2,coverage:'partial',components}) as any;
test('placed hexes locate the board, so a tilted photo still maps pieces to the right slots',()=>{
 const e=T.edges[12],v=T.vertices[20],s=suggestSlots(sceneOf([...hexes(),loose('r','road',e),loose('b','unknown',v),loose('c','city',T.vertices[33])]));
 assert.deepEqual(Object.fromEntries(s.map(x=>[x.id,x.location])),{r:{type:'edge',id:e.id},b:{type:'vertex',id:v.id},c:{type:'vertex',id:T.vertices[33].id}});
 assert(boardFit(sceneOf(hexes()))!.rms<.001);assert(fitPerspective(T.hexes.map(h=>({from:toPhoto(h),to:h}))));
});
test('no suggestion without enough anchors, for a bad fit, far from any slot, or on a taken slot',()=>{
 assert.deepEqual(suggestSlots(sceneOf([...hexes(5),loose('r','road',T.edges[3])])),[]);
 const scrambled=hexes().map((h,i)=>({...h,region:hexes()[(i*7+3)%19].region}));assert.equal(boardFit(sceneOf(scrambled)),null);
 assert.deepEqual(suggestSlots(sceneOf([...hexes(),loose('far','road',{x:T.hexes[0].x-40,y:T.hexes[0].y-40})])),[]);
 const v=T.vertices[20];assert.deepEqual(suggestSlots(sceneOf([...hexes(),loose('held','settlement',v,{type:'vertex',id:v.id}),loose('b','unknown',v)])).filter(x=>x.location.id===v.id),[]);
 const two=suggestSlots(sceneOf([...hexes(),loose('a','unknown',v),loose('b','unknown',v)]));assert.equal(new Set(two.map(x=>x.location.id)).size,two.length,'a slot is offered once');
});
