import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {register} from 'node:module';
import {readFile} from 'node:fs/promises';
import {catalogPacks} from '../gamepacks/catalog.ts';
import {validateGenericRecord,type GenericRecord,type GenericPiece} from '../shared/genericRecord.ts';
import {loadRealAssets} from '../src/realBoards.ts';

register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {GameBoardRecord}=await import('../src/GameBoardRecord.tsx');

// Use the real component/events and actual asset files; only the browser's file
// fetch and hook dispatcher are replaced in this Node test environment.
function mount(props:any){
 const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
 const slots:any[]=[];let cursor=0,tree:any,pending:(()=>void)[]=[];
 const dispatcher={
  useMemo(fn:()=>unknown){cursor++;return fn();},
  useState(value:any){const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return[slots[i],(next:any)=>slots[i]=typeof next==='function'?next(slots[i]):next];},
  useRef(value:any){const i=cursor++;return slots[i]??={current:value};},
  useEffect(effect:()=>any,deps?:any[]){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((v,j)=>!Object.is(v,old.deps?.[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:effect()};});}
 };
 function render(){cursor=0;pending=[];const old=internals.H;internals.H=dispatcher;try{tree=GameBoardRecord(props);}finally{internals.H=old;}for(const effect of pending)effect();}
 render();return{props,render,get tree(){return tree;},dispose(){for(const slot of slots)slot?.cleanup?.();}};
}
function nodes(tree:any):any[]{if(!tree||typeof tree!=='object')return[];if(Array.isArray(tree))return tree.flatMap(nodes);return[tree,...nodes(tree.props?.children)];}
function find(tree:any,predicate:(node:any)=>boolean){const node=nodes(tree).find(predicate);assert(node,'expected UI element missing');return node;}
const hasClass=(node:any,name:string)=>String(node.props?.className??'').split(' ').includes(name);
const physical=(id:string,componentId:string,quantity:number|null):GenericPiece=>({id,componentId,variant:null,quantity,label:id,anchor:'원래 위치 메모',evidenceId:null,region:null});
const surface={dataset:{coordinates:'board'},getBoundingClientRect:()=>({left:0,top:0,width:1000,height:1000})};
const click=(x:number,y:number)=>({clientX:x,clientY:y,detail:1,stopPropagation(){},currentTarget:{closest:()=>surface}});

async function fixture(){
 const oldFetch=globalThis.fetch,hadWindow=Object.hasOwn(globalThis,'window'),oldWindow=(globalThis as any).window;
 globalThis.fetch=(async(input:RequestInfo|URL)=>{
  const url=String(input);
  const asset=url.match(/^\/game-art\/real-boards\/([a-z0-9-]+)\/([a-z0-9.-]+)$/);
  const path=url==='/game-art/boards/mapping.json'?new URL('../public/game-art/boards/mapping.json',import.meta.url):asset?new URL(`../public/game-art/real-boards/${asset[1]}/${asset[2]}`,import.meta.url):null;
  if(!path)return new Response('',{status:404});
  try{return new Response(await readFile(path,'utf8'));}catch{return new Response('',{status:404});}
 })as typeof fetch;
 (globalThis as any).window={matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})};
 return()=>{globalThis.fetch=oldFetch;if(hadWindow)(globalThis as any).window=oldWindow;else delete(globalThis as any).window;};
}
async function ready(ui:ReturnType<typeof mount>,gameId:string,variant='base'){
 assert(await loadRealAssets(gameId,variant));await new Promise(resolve=>setImmediate(resolve));ui.render();
}

test('Duel city cards place between fixed wonder slots, drag in board coordinates, and reopen unchanged',async()=>{
 const restore=await fixture();const pack=catalogPacks.find(p=>p.id==='seven-wonders-duel')!;
 const city=physical('city-card','cards',null),zero=physical('zero-coins','coins',0),wonder=physical('unbuilt-wonder','wonders',1);
 zero.placement={areaId:'city',x:.1,y:.7,rotation:90};
 const original:GenericRecord={version:'game-component-record-v1',pieces:[city,zero,wonder]};let changed:GenericRecord|undefined;
 const ui=mount({pack,fieldKey:'city.scene',record:original,selected:city.id,busy:false,onChange:(next:GenericRecord)=>{changed=next;}});
 try{
  await ready(ui,'seven-wonders-duel');
  assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,8,'existing eight physical wonder slots stay selectable');
  const target=find(ui.tree,n=>hasClass(n,'gb-free-area')&&n.props['data-area-id']==='city-player-1');
  target.props.onClick(click(260,720));assert(changed,'a city card must be placeable outside the fixed wonder slots');
  assert.deepEqual(changed.pieces[0].placement,{areaId:'city',x:.26,y:.72,rotation:0,layoutVariant:'free-board-v1:base'});
  assert.equal(changed.pieces[0].quantity,null);assert.deepEqual(changed.pieces[1],zero);
  assert.equal(original.pieces[0].placement,undefined,'the existing accepted object must not be mutated');
  ui.props.record=changed;ui.render();
  const placed=find(ui.tree,n=>hasClass(n,'gb-piece')&&hasClass(n,'placed')&&String(n.props['aria-label']).startsWith('city-card,'));
  assert.equal(parseFloat(placed.props.style.left),26);assert.equal(parseFloat(placed.props.style.top),72);
  placed.props.onPointerDown({clientX:260,clientY:720,pointerId:1,currentTarget:{setPointerCapture(){}}});
  placed.props.onPointerUp({clientX:300,clientY:700,currentTarget:{closest:()=>surface}});
  assert.deepEqual(changed!.pieces[0].placement,{areaId:'city',x:.3,y:.7,rotation:0,layoutVariant:'free-board-v1:base'},'drag uses the SVG frame, without the generic board40px inset');
  const validated=validateGenericRecord(changed as any,pack,'city.scene',[]);
  const reopened=mount({...ui.props,record:validated,readonly:true,onChange(){throw new Error('readonly should not change');}});
  try{
   await ready(reopened,'seven-wonders-duel');
   const saved=find(reopened.tree,n=>hasClass(n,'gb-piece')&&hasClass(n,'placed')&&String(n.props['aria-label']).startsWith('city-card,'));
   assert.equal(parseFloat(saved.props.style.left),30);assert.equal(parseFloat(saved.props.style.top),70);
   assert.equal(find(reopened.tree,n=>hasClass(n,'gb-free-area')).props.disabled,true);
   assert.equal(validated.pieces[1].quantity,0);assert.equal(validated.pieces[0].anchor,'원래 위치 메모');
  }finally{reopened.dispose();}
 }finally{ui.dispose();restore();}
});

test('a complete no-slot Seven Wonders city uses its own board and refuses other fields and wrong component kinds',async()=>{
 const restore=await fixture();const pack=catalogPacks.find(p=>p.id==='seven-wonders')!;
 const card=physical('constructed-card','age-cards',1);let changed:GenericRecord|undefined;
 const ui=mount({pack,players:3,fieldKey:'city.scene',record:{version:'game-component-record-v1',pieces:[card]},selected:card.id,busy:false,onChange:(next:GenericRecord)=>{changed=next;}});
 try{
  await ready(ui,'seven-wonders');
  assert(nodes(ui.tree).some(n=>n.type==='img'&&n.props.src==='/game-art/real-boards/seven-wonders/board.svg'),'no-slot city must use its dedicated image');
  assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-free-area')).length,3,'only the three active player city areas are exposed');
  const target=find(ui.tree,n=>hasClass(n,'gb-free-area')&&n.props['data-area-id']==='seat-1-city-area');
  target.props.onClick(click(500,70));assert(changed);assert.deepEqual(changed.pieces[0].placement,{areaId:'city',x:.5,y:.07,rotation:0,layoutVariant:'free-board-v1:base'});
  changed=undefined;target.props.onClick(click(530,170));assert.equal(changed,undefined,'a hand/wonder point must not become a city placement');
  ui.props.record={version:'game-component-record-v1',pieces:[physical('unresolved-kind','wonder',null)]};ui.props.selected='unresolved-kind';ui.render();
  assert.equal(find(ui.tree,n=>hasClass(n,'gb-free-area')).props.disabled,true,'unrelated kind cannot enter a city area');
 }finally{ui.dispose();restore();}
});

test('Duel age changes do not reinterpret a city placement as another age layout',async()=>{
 const restore=await fixture();const pack=catalogPacks.find(p=>p.id==='seven-wonders-duel')!;
 const card=physical('city-acquired-in-age-one','cards',1);card.placement={areaId:'city',x:.2,y:.7,rotation:0,layoutVariant:'free-board-v1:base'};
 let changed:GenericRecord|undefined;
 const ui=mount({pack,fieldKey:'city.scene',layoutVariant:'age-2',record:{version:'game-component-record-v1',pieces:[card]},selected:card.id,busy:false,onChange:(next:GenericRecord)=>{changed=next;}});
 try{
  await ready(ui,'seven-wonders-duel','age-2');
  assert(nodes(ui.tree).some(n=>hasClass(n,'gb-piece')&&hasClass(n,'placed')),'city persists while only the common age-card structure changes');
  find(ui.tree,n=>hasClass(n,'gb-free-area')&&n.props['data-area-id']==='city-player-1').props.onClick(click(250,700));
  assert(changed);assert.deepEqual(changed.pieces[0].placement,{areaId:'city',x:.25,y:.7,rotation:0,layoutVariant:'free-board-v1:base'},'city field keeps its free-placement frame rather than receiving an age-layout tag');
 }finally{ui.dispose();restore();}
});

test('old generic-board coordinates stay in their original preview until explicitly placed on the dedicated board',async()=>{
 const restore=await fixture();const pack=catalogPacks.find(p=>p.id==='seven-wonders')!;
 const old=physical('legacy-position','age-cards',null);old.placement={areaId:'city',x:.5,y:.07,rotation:90};
 const original:GenericRecord={version:'game-component-record-v1',pieces:[old]};let changed:GenericRecord|undefined;
 const ui=mount({pack,players:3,fieldKey:'city.scene',record:original,selected:old.id,busy:false,onChange:(next:GenericRecord)=>{changed=next;}});
 try{
  await ready(ui,'seven-wonders');
  const dedicated=find(ui.tree,n=>hasClass(n,'gb-real'));
  assert.equal(nodes(dedicated).filter(n=>hasClass(n,'gb-piece')&&hasClass(n,'placed')).length,0,'an old position cannot silently become an exact dedicated-board position');
  const legacy=find(ui.tree,n=>hasClass(n,'gb-legacy-positions'));
  const saved=find(legacy,n=>hasClass(n,'gb-piece')&&hasClass(n,'placed'));
  assert.match(saved.props.style.left,/40px/,'the old generic coordinate frame remains visible');
  assert.equal(changed,undefined);assert.deepEqual(original.pieces[0],old);
  find(ui.tree,n=>hasClass(n,'gb-free-area')&&n.props['data-area-id']==='seat-1-city-area').props.onClick(click(500,70));
  const placed=changed as GenericRecord|undefined;assert(placed,'explicit placement must update the record');
  assert.equal(placed.pieces[0].placement?.layoutVariant,'free-board-v1:base');
  assert.equal(placed.pieces[0].quantity,null);assert.equal(placed.pieces[0].placement?.rotation,90);
 }finally{ui.dispose();restore();}
});
