import test from 'node:test';import assert from 'node:assert/strict';import {CATAN_TOPOLOGY as T,type ComponentScene} from '../shared/scene';import {suggestSlots,boardFit} from '../shared/catanSlotSuggestion';
const region=(p:{x:number;y:number},shift=0)=>({x:.49+.075*p.x+shift,y:.49+.075*p.y,width:.02,height:.02});
const anchors=(source:string,shift=0)=>T.hexes.map(h=>({id:source+h.id,kind:'terrain',variant:'forest',quantity:1,ownerId:null,evidenceId:source,region:region(h,shift),location:{type:'hex',id:h.id}}));
const road=(id:string,at:{x:number;y:number},source='A')=>({id,kind:'road',variant:null,quantity:null,ownerId:null,evidenceId:source,region:region(at),location:{type:'unplaced',id:null}});
const scene=(components:any[])=>({version:2,coverage:'partial',components})as ComponentScene;
test('different photo frames cannot supply a road fit to an unregistered photograph',()=>{
 const s=scene([...anchors('A'),road('unregistered',T.edges[9],'B')]);assert.deepEqual(suggestSlots(s),[]);
});
test('one misplaced model hex does not poison the majority board frame or assign building type',()=>{
 const a=anchors('A');a[0]={...a[0],location:{type:'hex',id:T.hexes.at(-1)!.id}};
 const v=T.vertices[24],s=scene([...a,{...road('building',v),kind:'unknown'}]),before=structuredClone(s);
 assert(boardFit(s));assert.deepEqual(suggestSlots(s).map(r=>[r.id,r.location]),[['building',{type:'vertex',id:v.id}]]);assert.deepEqual(s,before);
});
test('duplicate claims do not push another object into its second-nearest edge',()=>{
 const a=T.edges[20],b=T.edges.filter(e=>e.id!==a.id).sort((x,y)=>Math.hypot(x.x-a.x,x.y-a.y)-Math.hypot(y.x-a.x,y.y-a.y))[0],p={x:a.x*.7+b.x*.3,y:a.y*.7+b.y*.3};
 const s=scene([...anchors('A'),road('first',p),road('second',p)]),r=suggestSlots(s);
 assert.equal(r.length,1);assert.equal(r[0].location.id,a.id);
});
