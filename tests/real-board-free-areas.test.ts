import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {register} from 'node:module';
import {readFile} from 'node:fs/promises';
import {catalogPacks} from '../gamepacks/catalog.ts';
import {validateGenericRecord,type GenericRecord,type GenericPiece} from '../shared/genericRecord.ts';
import {loadRealAssets,realBoardViewForPlacements} from '../src/realBoards.ts';

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
  const asset=url.match(/^\/game-art\/real-boards\/([a-z0-9-]+)\/((?:variants\/)?[a-z0-9.-]+)$/);
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

test('Burgundy verified partial frame separates old positions, keys and goods piles, and never substitutes the 3/4-player market for two players',async()=>{
 const restore=await fixture();const pack=catalogPacks.find(p=>p.id==='castles-burgundy')!;
 const tile=physical('old-burgundy-tile','hexes',null);
 const assets=await loadRealAssets('castles-burgundy');assert(assets);
 const key=assets.board.areas.find(a=>a.id==='key-storage')!.slots[0];
 tile.placement={areaId:'player',x:(key.x+key.w/2)/1000,y:(key.y+key.h/2)/1000,rotation:90};
 const original:GenericRecord={version:'game-component-record-v1',pieces:[tile]};let changed:GenericRecord|undefined;
 const ui=mount({pack,players:3,fieldKey:'player.scene',record:original,selected:tile.id,busy:false,onChange:(next:GenericRecord)=>{changed=next;}});
 try{
  await ready(ui,'castles-burgundy');
  assert.equal(nodes(find(ui.tree,n=>hasClass(n,'gb-real'))).filter(n=>hasClass(n,'gb-slot-art')).length,0,'legacy generic coordinates must not silently snap into a newly authored key slot');
  assert(nodes(ui.tree).some(n=>hasClass(n,'gb-legacy-positions')));assert.equal(changed,undefined);
  const empty=find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).startsWith('미설치 영지 타일'));
  empty.props.onClick();const slotted=changed as GenericRecord|undefined;assert(slotted);
  assert.equal(slotted.pieces[0].placement?.layoutVariant,'slot-board-v1:burgundy-special-record-v1');
  assert.equal(slotted.pieces[0].quantity,null);assert.equal(slotted.pieces[0].placement?.rotation,90);
  ui.props.record=slotted;ui.render();assert(nodes(ui.tree).some(n=>hasClass(n,'gb-slot-art')));
  const goods=physical('sold-or-stored-goods','goods',0);ui.props.record={version:'game-component-record-v1',pieces:[goods]};ui.props.selected=goods.id;changed=undefined;ui.render();
  const sold=find(ui.tree,n=>hasClass(n,'gb-free-area')&&n.props['data-area-id']==='sold-goods');
  sold.props.onClick(click(320,950));const free=changed as GenericRecord|undefined;assert(free);
  assert.deepEqual(free.pieces[0].placement,{areaId:'player',x:.32,y:.95,rotation:0,layoutVariant:'free-board-v1:burgundy-special-record-v1'});
  assert.equal(free.pieces[0].quantity,0);validateGenericRecord(JSON.parse(JSON.stringify(free)),pack,'player.scene',[]);
  ui.props.record=free;ui.props.players=1;ui.render();
  assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-piece')&&hasClass(n,'placed')).length,0,'a dedicated coordinate must not become a generic inset coordinate when its layout is unavailable');
  assert(nodes(ui.tree).some(n=>hasClass(n,'gb-tray')),'the unchanged saved object remains available for manual placement');
  ui.props.players=3;ui.render();assert(nodes(ui.tree).some(n=>hasClass(n,'gb-piece')&&hasClass(n,'placed')));
  const market=mount({pack,players:3,fieldKey:'depots.scene',record:{version:'game-component-record-v1',pieces:[]},busy:false});
  try{
   await ready(market,'castles-burgundy');assert.equal(nodes(market.tree).filter(n=>hasClass(n,'gb-slot')).length,24,'three-player marked4 spaces are unavailable');
   market.props.players=4;market.render();assert.equal(nodes(market.tree).filter(n=>hasClass(n,'gb-slot')).length,32);
   market.props.players=2;market.render();assert.equal(nodes(market.tree).filter(n=>hasClass(n,'gb-real')).length,0,'unverified two-player board face must use the existing manual surface');
  }finally{market.dispose();}
  assert.deepEqual(original.pieces[0],tile);
 }finally{ui.dispose();restore();}
});

test('Jaws scenario1 uses its verified48 hexes, keeps mixed token layers, and never reinterprets another scenario or owner hand',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='gloomhaven-jaws')!;
 const old=physical('old-book-position','figures',null);old.placement={areaId:'battle',x:.07,y:.238,rotation:90};
 const figure=physical('current-figure','figures',null),marker=physical('state-marker','state',0);
 const original:GenericRecord={version:'game-component-record-v1',pieces:[old,figure,marker]};let changed:GenericRecord|undefined;
 const ui=mount({pack,players:2,fieldKey:'battle.scene',record:original,selected:figure.id,busy:false,layoutVariant:'base',onChange:(next:GenericRecord)=>{changed=next;},onLayoutVariantChange() {}});
 try{
  await ready(ui,'gloomhaven-jaws');
  assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,0,'unselected scenario must not inherit scenario1 cells');
  ui.props.layoutVariant='scenario-1';ui.render();await ready(ui,'gloomhaven-jaws','scenario-1');
  let slots=nodes(ui.tree).filter(n=>hasClass(n,'gb-slot'));assert.equal(slots.length,48);
  assert(nodes(ui.tree).some(n=>n.type==='img'&&n.props.src.endsWith('/variants/scenario-1.svg')));
  assert(!nodes(ui.tree).some(n=>hasClass(n,'placed')&&String(n.props['aria-label']).startsWith('old-book-position,')));
  slots[0].props.onClick();assert(changed);assert.deepEqual(changed.pieces[1].placement,{areaId:'battle',x:.07,y:.238,rotation:0,layoutVariant:'scenario-1'});
  assert.deepEqual(changed.pieces[0],old);assert.equal(changed.pieces[1].quantity,null);
  ui.props.record=changed;ui.props.selected=marker.id;ui.render();changed=undefined;
  slots=nodes(ui.tree).filter(n=>hasClass(n,'gb-slot'));slots[0].props.onClick();
  assert(changed,'an unbounded hex can retain the figure and independently place a state marker, without inventing a quantity cap');
  const layered=changed as GenericRecord;
  assert.deepEqual(layered.pieces[2].placement,{areaId:'battle',x:.07,y:.238,rotation:0,layoutVariant:'scenario-1'});assert.equal(layered.pieces[2].quantity,0);
  assert.deepEqual(layered.pieces[1],ui.props.record.pieces[1]);
  const checked=validateGenericRecord(JSON.parse(JSON.stringify(layered)),pack,'battle.scene',[]);
  ui.props.record=checked;ui.props.readonly=true;ui.render();
  assert.equal(find(ui.tree,n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).props.children[1].props.children,2);
  ui.props.layoutVariant='base';ui.render();await ready(ui,'gloomhaven-jaws');
  assert(!nodes(ui.tree).some(n=>hasClass(n,'placed')&&String(n.props['aria-label']).startsWith('current-figure,')),'changing scenario does not transplant coordinates');
  ui.props.layoutVariant='scenario-1';ui.props.readonly=false;ui.props.record={version:'game-component-record-v1',pieces:[physical('hidden-card','cards',null)]};ui.props.selected='hidden-card';ui.render();await ready(ui,'gloomhaven-jaws','scenario-1');
  assert(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).every(n=>n.props.disabled),'owner hand cards are not accepted on public map');
  assert.deepEqual(original.pieces,[old,figure,marker]);
 }finally{ui.dispose();restore();}
});

test('Imperial tutorial is an explicit view with frame-pinned save/reopen and never changes a campaign field',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='imperial-assault')!;
 const legacy=physical('older-placement','figures',null);legacy.placement={areaId:'map',x:.235,y:.11,rotation:90};
 const figure=physical('tutorial-figure','figures',null);let changed:GenericRecord|undefined,parentCalls=0;
 const ui=mount({pack,fieldKey:'map.scene',record:{version:'game-component-record-v1',pieces:[legacy,figure]},selected:figure.id,busy:false,onChange:(next:GenericRecord)=>{changed=next;},onLayoutVariantChange(){parentCalls++;}});
 try{
  await ready(ui,'imperial-assault');
  const base=(await loadRealAssets('imperial-assault'))!.board;
  assert.equal(realBoardViewForPlacements(base,'map.scene',[{layoutVariant:'slot-board-v1:imperial-tutorial-map-v1'}]),'tutorial');
  assert.equal(realBoardViewForPlacements(base,'groups.scene',[{layoutVariant:'free-board-v1:imperial-tutorial-map-v1'}]),'tutorial');
  assert.equal(realBoardViewForPlacements(base,'heroes.scene',[{layoutVariant:'slot-board-v1:imperial-tutorial-map-v1'}]),'base');
  assert.equal(realBoardViewForPlacements(base,'map.scene',[{layoutVariant:'slot-board-v1:imperial-tutorial-map-v1'},{layoutVariant:'free-board-v1:imperial-campaign-table-v1'}]),'base','mixed known frames need an explicit view choice');
  assert.equal(realBoardViewForPlacements(base,'map.scene',[undefined,{layoutVariant:'unknown-other-map'}]),'base');
  const picker=find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='지도 보기');
  assert.equal(picker.props.value,'base');assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,0);
  picker.props.onChange({target:{value:'tutorial'}});ui.render();await ready(ui,'imperial-assault','tutorial');
  assert.equal(changed,undefined,'view selection must not save a field, insert figures or rewrite campaign notes');assert.equal(parentCalls,0);
  const slots=nodes(ui.tree).filter(n=>hasClass(n,'gb-slot'));assert.equal(slots.length,84);
  const first=find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('c3·r0'));
  first.props.onClick();assert(changed);const placed=changed as GenericRecord;assert.deepEqual(placed.pieces[1].placement,{areaId:'map',x:.235,y:.11,rotation:0,layoutVariant:'slot-board-v1:imperial-tutorial-map-v1'});
  assert.deepEqual(placed.pieces[0],legacy);
  const saved=validateGenericRecord(JSON.parse(JSON.stringify(placed)),pack,'map.scene',[]);
  const reopened=mount({...ui.props,record:saved,readonly:true,onChange(){throw new Error('readonly mutation');}});
  try{
   await ready(reopened,'imperial-assault');await ready(reopened,'imperial-assault','tutorial');
   assert.equal(find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='지도 보기').props.value,'tutorial','an exact saved coordinate frame reopens its own view, not an inferred mission');
   assert.equal(nodes(reopened.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,1,'old untagged coordinates must not be treated as a tutorial square');
   assert(nodes(reopened.tree).some(n=>hasClass(n,'gb-legacy-positions')));
   find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='지도 보기').props.onChange({target:{value:'base'}});reopened.render();await ready(reopened,'imperial-assault');
   assert(nodes(reopened.tree).some(n=>n.props['aria-label']==='미배치 구성물'),'tutorial position stays preserved when another map is shown');
   assert.deepEqual(saved.pieces[1].placement,(changed as GenericRecord).pieces[1].placement);
  }finally{reopened.dispose();}
 }finally{ui.dispose();restore();}
});

test('Arkham3 keeps its15 places,7 streets and5 non-space centers distinct and its five-card display independently editable',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='arkham-horror-3')!;
 const investigator=physical('investigator','pieces',null),clue=physical('neighborhood-clue','pieces',0);
 let changed:GenericRecord|undefined;
 const ui=mount({pack,fieldKey:'map.scene',record:{version:'game-component-record-v1',pieces:[investigator,clue]},selected:investigator.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 try{
  await ready(ui,'arkham-horror-3');find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='지도 보기').props.onChange({target:{value:'azathoth'}});ui.render();await ready(ui,'arkham-horror-3','azathoth');
  assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,32,'15 places +7 streets +5 token centers +5 map modules; no extra gameplay spaces');
  const map=(await loadRealAssets('arkham-horror-3','azathoth'))!.board;
  assert.equal(map.areas.flatMap(a=>a.slots).filter(s=>(s as any).role==='location').length,15);
  assert.equal(map.areas.flatMap(a=>a.slots).filter(s=>(s as any).role==='token-center-not-space').length,5);
  find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('기차역')).props.onClick();assert(changed);
  const moved=changed as GenericRecord;assert.deepEqual(moved.pieces[0].placement,{areaId:'map',x:.145,y:.28,rotation:0,layoutVariant:'slot-board-v1:arkham3-azathoth-v1'});assert.equal(moved.pieces[0].quantity,null);
  ui.props.record=moved;ui.props.selected=clue.id;ui.render();changed=undefined;
  find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('노스사이드 중앙')).props.onClick();assert(changed);
  const marked=changed as GenericRecord;assert.deepEqual(marked.pieces[1].placement,{areaId:'map',x:.145,y:.205,rotation:0,layoutVariant:'slot-board-v1:arkham3-azathoth-v1'});assert.equal(marked.pieces[1].quantity,0);
  const saved=validateGenericRecord(JSON.parse(JSON.stringify(marked)),pack,'map.scene',[]),reopened=mount({...ui.props,record:saved,readonly:true});
  try{
   await ready(reopened,'arkham-horror-3');await ready(reopened,'arkham-horror-3','azathoth');
   assert.equal(find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='지도 보기').props.value,'azathoth');
   assert.equal(nodes(reopened.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,2);
  }finally{reopened.dispose();}
  ui.props.record={version:'game-component-record-v1',pieces:[physical('owner-only-card','cards',null)]};ui.props.selected='owner-only-card';ui.render();
  assert(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).every(n=>n.props.disabled),'owner card cannot be put onto the public map');
  const display=mount({pack,fieldKey:'scenario.scene',record:{version:'game-component-record-v1',pieces:[physical('visible-display-item','cards',null)]},selected:'visible-display-item',busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
  try{
   await ready(display,'arkham-horror-3');const slots=nodes(display.tree).filter(n=>hasClass(n,'gb-slot'));assert.equal(slots.length,5);changed=undefined;slots[0].props.onClick();assert(changed);
   const shown=changed as GenericRecord;assert.deepEqual(shown.pieces[0].placement,{areaId:'scenario',x:.1075,y:.65,rotation:0,layoutVariant:'slot-board-v1:arkham3-table-v1'});
   assert.equal(shown.pieces.length,1,'five background places must not instantiate five cards');assert.equal(shown.pieces[0].quantity,null);
  }finally{display.dispose();}
 }finally{ui.dispose();restore();}
});

test('Gloomhaven second-edition round/element markers and campaign-sheet view preserve their own fields and coordinate frames',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='gloomhaven')!;
 const marker=physical('element-token','markers',null),zero=physical('round-token','markers',0),legacy=physical('older-round','markers',null);
 legacy.placement={areaId:'monster',x:.5,y:.5,rotation:90};
 let changed:GenericRecord|undefined;
 const ui=mount({pack,fieldKey:'monster.scene',record:{version:'game-component-record-v1',pieces:[marker,zero,legacy]},selected:marker.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 try{
  await ready(ui,'gloomhaven');
  const slots=nodes(ui.tree).filter(n=>hasClass(n,'gb-slot'));assert.equal(slots.length,30,'12 printed round positions and6 elements ×3 states; no initial markers are created');
  const strong=find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('불 · 강함'));
  strong.props.onClick();assert(changed);const after=changed as GenericRecord;
  assert.deepEqual(after.pieces[0].placement,{areaId:'monster',x:.335,y:.469,rotation:0,layoutVariant:'slot-board-v1:gloomhaven2-table-v1'});
  assert.equal(after.pieces[0].quantity,null);assert.deepEqual(after.pieces[2],legacy);
  ui.props.record=after;ui.props.selected=zero.id;ui.render();changed=undefined;
  find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('라운드 12')).props.onClick();assert(changed);
  const round=changed as GenericRecord;assert.equal(round.pieces[1].quantity,0);
  assert.equal(validateGenericRecord(JSON.parse(JSON.stringify(round)),pack,'monster.scene',[]).pieces.length,3);
  ui.props.record={version:'game-component-record-v1',pieces:[physical('private-card','cards',null)]};ui.props.selected='private-card';ui.render();
  assert(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).every(n=>n.props.disabled),'cards cannot stand in for element or round tokens');
  const campaign=physical('one-physical-campaign-sheet','campaign',null),original:GenericRecord={version:'game-component-record-v1',pieces:[campaign]};
  const sheet=mount({pack,fieldKey:'campaign.scene',record:original,selected:campaign.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
  try{
   await ready(sheet,'gloomhaven');const picker=find(sheet.tree,n=>n.type==='select'&&n.props['aria-label']==='기록판 보기');
   changed=undefined;picker.props.onChange({target:{value:'campaign-sheet'}});sheet.render();await ready(sheet,'gloomhaven','campaign-sheet');
   assert.equal(changed,undefined,'view selection must not fabricate campaign progress or paper copies');
   assert(nodes(sheet.tree).some(n=>n.type==='img'&&n.props.src.endsWith('/variants/campaign-sheet.svg')));
   const control=find(sheet.tree,n=>hasClass(n,'gb-slot'));control.props.onClick();assert(changed);const saved=changed as GenericRecord;
   assert.equal(saved.pieces.length,1);assert.equal(saved.pieces[0].quantity,null);
   assert.equal(saved.pieces[0].placement?.layoutVariant,'slot-board-v1:gloomhaven2-campaign-sheet-v1');
   assert.equal(realBoardViewForPlacements((await loadRealAssets('gloomhaven'))!.board,'campaign.scene',saved.pieces.map(p=>p.placement)),'campaign-sheet');
   const reopened=mount({...sheet.props,record:validateGenericRecord(JSON.parse(JSON.stringify(saved)),pack,'campaign.scene',[]),readonly:true});
   try{await ready(reopened,'gloomhaven');await ready(reopened,'gloomhaven','campaign-sheet');assert.equal(find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='기록판 보기').props.value,'campaign-sheet');assert.equal(nodes(reopened.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,1);}finally{reopened.dispose();}
   assert.equal(original.pieces[0].placement,undefined);
  }finally{sheet.dispose();}
 }finally{ui.dispose();restore();}
});

test('Descent floor views separate coincident pieces without moving them, guessing null layers or rewriting a new session',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='descent-legends-dark')!;
 const {emptyGameReadout,setReadoutValue}=await import('../shared/readouts/registry.ts');
 const make=(id:string,kind:string,layer:number|null)=>{const p=physical(id,kind,null);p.readout=setReadoutValue(pack,emptyGameReadout(pack,kind),'layer',layer);p.placement={areaId:'map',x:.32,y:.3,rotation:0,layoutVariant:'free-board-v1:descent-lotd-table-v1'};return p;};
 const lower=make('lower-figure','figures',0),upper=make('upper-tile','terrain',2),unknown=make('unconfirmed-figure','figures',null),original:GenericRecord={version:'game-component-record-v1',pieces:[lower,upper,unknown]};let changed:GenericRecord|undefined;
 const ui=mount({pack,fieldKey:'map.scene',record:original,selected:upper.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 const rendered=(id:string)=>nodes(ui.tree).some(n=>hasClass(n,'gb-piece')&&hasClass(n,'placed')&&String(n.props['aria-label']).startsWith(id+','));
 try{
  await ready(ui,'descent-legends-dark');const picker=()=>find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='층 보기');
  assert(rendered(lower.id)&&rendered(upper.id)&&rendered(unknown.id));assert.equal(picker().props.value,'all');
  picker().props.onChange({target:{value:'0'}});ui.render();assert(rendered(lower.id));assert(!rendered(upper.id)&&!rendered(unknown.id));assert.equal(changed,undefined);
  const target=find(ui.tree,n=>n.props['data-area-id']==='map');assert(target.props.disabled,'an object selected on another floor cannot silently move on this floor');
  picker().props.onChange({target:{value:'unknown'}});ui.render();assert(rendered(unknown.id));assert(!rendered(lower.id)&&!rendered(upper.id));
  picker().props.onChange({target:{value:'2'}});ui.render();assert(rendered(upper.id));
  find(ui.tree,n=>n.props['data-area-id']==='map').props.onClick(click(400,350));assert(changed);const moved=changed as GenericRecord;
  assert.deepEqual(moved.pieces[1].placement,{areaId:'map',x:.4,y:.35,rotation:0,layoutVariant:'free-board-v1:descent-lotd-table-v1'});
  assert.deepEqual(moved.pieces[0],lower);assert.deepEqual(moved.pieces[2],unknown);assert.deepEqual((moved.pieces[1].readout as any).values.layer,2);
  ui.props.record=moved;ui.render();assert.equal(picker().props.value,'2','own movement keeps the selected view');
  ui.props.record=validateGenericRecord(JSON.parse(JSON.stringify(moved)),pack,'map.scene',[]);ui.props.readonly=true;ui.render();
  assert.equal(picker().props.value,'all','fresh/reopened records must not inherit an earlier local view filter');
  assert(rendered(lower.id)&&rendered(upper.id)&&rendered(unknown.id));
  picker().props.onChange({target:{value:'unknown'}});ui.render();assert.equal(changed,moved,'readonly view switching emits no changes');
  assert.deepEqual(original.pieces,[lower,upper,unknown]);
 }finally{ui.dispose();restore();}
});

test('Descent two physical attack cards share the sleeve without creating or accepting a third card',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='descent-legends-dark')!;
 const cards=[physical('weapon-a','cards',null),physical('weapon-b','cards',0),physical('spare-card','cards',null)];
 let changed:GenericRecord|undefined;const ui=mount({pack,fieldKey:'hero.scene',record:{version:'game-component-record-v1',pieces:cards},selected:cards[0].id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 try{
  await ready(ui,'descent-legends-dark');assert(!nodes(ui.tree).some(n=>n.type==='select'&&n.props['aria-label']==='층 보기'));
  const sleeve=()=>find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('공격 카드 슬리브'));
  sleeve().props.onClick();assert(changed);const one=changed as GenericRecord;assert.equal(one.pieces.length,3);
  ui.props.record=one;ui.props.selected=cards[1].id;ui.render();changed=undefined;sleeve().props.onClick();assert(changed);
  const two=changed as GenericRecord;assert.deepEqual(two.pieces[0].placement,two.pieces[1].placement);assert.equal(two.pieces[1].quantity,0);assert.equal(two.pieces[0].quantity,null);
  ui.props.record=validateGenericRecord(JSON.parse(JSON.stringify(two)),pack,'hero.scene',[]);ui.props.selected=cards[2].id;ui.render();changed=undefined;sleeve().props.onClick();
  assert.equal(changed,undefined,'a full two-card sleeve selects its existing piece instead of adding another');assert.equal(ui.props.record.pieces[2].placement,undefined);
  let picked='';ui.props.onSelect=(id:string)=>{picked=id;};ui.render();
  const stack=find(ui.tree,n=>n.props['aria-label']==='겹친 구성물 · 공격 카드 슬리브');
  find(stack,n=>n.type==='button'&&String(n.props['aria-label']).startsWith('weapon-b,')).props.onClick({stopPropagation(){}});
  assert.equal(picked,'weapon-b','each physical card in the sleeve remains individually selectable for correction');
  assert.equal(cards[0].placement,undefined);assert.equal(cards[1].placement,undefined);
 }finally{ui.dispose();restore();}
});

test('Descent solo two-hero view records both heroes for the same owner without inventing heroes or upgrading existing positions',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='descent-legends-dark')!;
 const a=physical('hero-a','cards',null),b=physical('hero-b','cards',null),original:GenericRecord={version:'game-component-record-v1',pieces:[a,b]};let changed:GenericRecord|undefined;
 const ui=mount({pack,players:1,fieldKey:'hero.scene',record:original,selected:a.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 try{
  await ready(ui,'descent-legends-dark');const picker=find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='영웅판 보기');
  picker.props.onChange({target:{value:'two-heroes'}});ui.render();await ready(ui,'descent-legends-dark','two-heroes');
  assert.equal(changed,undefined);assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,4,'two hero card positions and two physical weapon sleeves, not a generated starting party');
  find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('영웅 A 카드')).props.onClick();assert(changed);const one=changed as GenericRecord;
  ui.props.record=one;ui.props.selected=b.id;ui.render();changed=undefined;
  find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('영웅 B 카드')).props.onClick();assert(changed);const both=changed as GenericRecord;
  assert.deepEqual(both.pieces[0].placement,{areaId:'hero',x:.13,y:.18,rotation:0,layoutVariant:'slot-board-v1:descent-lotd-two-heroes-v1'});
  assert.deepEqual(both.pieces[1].placement,{areaId:'hero',x:.62,y:.18,rotation:0,layoutVariant:'slot-board-v1:descent-lotd-two-heroes-v1'});
  const reopened=mount({...ui.props,record:validateGenericRecord(JSON.parse(JSON.stringify(both)),pack,'hero.scene',[]),readonly:true});
  try{await ready(reopened,'descent-legends-dark');await ready(reopened,'descent-legends-dark','two-heroes');assert.equal(find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='영웅판 보기').props.value,'two-heroes');assert.equal(nodes(reopened.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,2);}finally{reopened.dispose();}
  assert.deepEqual(original.pieces,[a,b]);
 }finally{ui.dispose();restore();}
});

test('Burgundy two-player personal boards retain their verified37 cells and storage while the unverified central market stays unavailable',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='castles-burgundy')!;
 const tile=physical('two-player-personal-tile','hexes',null),old=physical('older-owner-placement','hexes',0);old.placement={areaId:'duchy',x:.2,y:.7,rotation:90};
 let changed:GenericRecord|undefined;const ui=mount({pack,players:2,fieldKey:'duchy.scene',record:{version:'game-component-record-v1',pieces:[tile,old]},selected:tile.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 try{
  await ready(ui,'castles-burgundy');const slots=nodes(ui.tree).filter(n=>hasClass(n,'gb-slot'));assert.equal(slots.length,37,'unchanged individual duchy geometry must remain usable at2 players');
  slots[0].props.onClick();assert(changed);const moved=changed as GenericRecord;
  assert.deepEqual(moved.pieces[0].placement,{areaId:'duchy',x:.196,y:.655,rotation:0,layoutVariant:'slot-board-v1:burgundy-special-record-v1'});
  assert.deepEqual(moved.pieces[1],old);assert.equal(moved.pieces[0].quantity,null);
  const saved=validateGenericRecord(JSON.parse(JSON.stringify(moved)),pack,'duchy.scene',[]),reopened=mount({...ui.props,record:saved,readonly:true});
  try{await ready(reopened,'castles-burgundy');assert.equal(nodes(reopened.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,1);assert(nodes(reopened.tree).some(n=>hasClass(n,'gb-legacy-positions')));}finally{reopened.dispose();}
  ui.props.fieldKey='depots.scene';ui.props.record={version:'game-component-record-v1',pieces:[]};ui.render();assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-real')).length,0,'do not replace unverified two-player central face with3/4-player slots');
  ui.props.fieldKey='player.scene';ui.render();assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,11,'three goods spaces, three key positions and five die positions are independent of central-board face');
  ui.props.players=3;ui.props.fieldKey='depots.scene';ui.render();assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,24);
  ui.props.players=4;ui.render();assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,32);
  ui.props.players=1;ui.props.fieldKey='duchy.scene';ui.render();assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-real')).length,0,'do not accidentally enable the separately unverified solo mode');
 }finally{ui.dispose();restore();}
});

test('Frosthaven separates public building/current-level storage, personal card piles and owner-private hand; campaign view does not invent checkbox state',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='frosthaven')!;
 const card=physical('ability','cards',null),original:GenericRecord={version:'game-component-record-v1',pieces:[card]};let changed:GenericRecord|undefined;
 const ui=mount({pack,fieldKey:'player.scene',record:original,selected:card.id,busy:false,onChange:(next:GenericRecord)=>{changed=next;}});
 try{
  await ready(ui,'frosthaven');
  const ids=nodes(ui.tree).filter(n=>hasClass(n,'gb-free-area')).map(n=>n.props['data-area-id']);
  assert(ids.includes('personal-active')&&ids.includes('personal-discard')&&ids.includes('personal-lost')&&ids.includes('personal-items'));
  assert(!ids.includes('private-hand')&&!ids.includes('town-buildings'));
  find(ui.tree,n=>n.props['data-area-id']==='personal-discard').props.onClick(click(90,670));assert(changed);
  const moved=changed as GenericRecord;assert.deepEqual(moved.pieces[0].placement,{areaId:'player',x:.09,y:.67,rotation:0,layoutVariant:'free-board-v1:frosthaven-table-v1'});assert.equal(moved.pieces[0].quantity,null);assert.equal(original.pieces[0].placement,undefined);
  ui.props.record=validateGenericRecord(JSON.parse(JSON.stringify(moved)),pack,'player.scene',[]);ui.props.readonly=true;ui.render();assert(nodes(ui.tree).some(n=>hasClass(n,'gb-piece')&&hasClass(n,'placed')));
  const paper=physical('campaign-document','outpost',1),supply=physical('known-supply','resources',0);supply.placement={areaId:'town',x:.9,y:.37,rotation:0,layoutVariant:'free-board-v1:frosthaven-table-v1'};const town=mount({pack,fieldKey:'town.scene',record:{version:'game-component-record-v1',pieces:[paper,supply]},selected:paper.id,busy:false,onChange:(next:GenericRecord)=>{changed=next;}});
  try{
   await ready(town,'frosthaven');changed=undefined;
   find(town.tree,n=>n.type==='select'&&n.props['aria-label']==='전초기지 보기').props.onChange({target:{value:'campaign-sheet'}});town.render();await ready(town,'frosthaven','campaign-sheet');assert.equal(changed,undefined);
   const slots=nodes(town.tree).filter(n=>hasClass(n,'gb-slot'));assert.equal(slots.length,1,'80 printed weeks are reference geometry, not80 invented physical objects');slots[0].props.onClick();assert(changed);
   const saved=changed as GenericRecord;assert.equal(saved.pieces.length,2);assert.deepEqual(saved.pieces[1],supply,'the town supply remains in its original frame while the paper view changes');assert.equal(saved.pieces[0].placement?.layoutVariant,'slot-board-v1:frosthaven-campaign-sheet-v1');
   const resumed=mount({...town.props,record:validateGenericRecord(JSON.parse(JSON.stringify(saved)),pack,'town.scene',[]),readonly:true});
   try{await ready(resumed,'frosthaven');const picker=find(resumed.tree,n=>n.type==='select'&&n.props['aria-label']==='전초기지 보기');assert.equal(picker.props.value,'base','mixed saved frames stay at the base table instead of reinterpreting the town supply as paper positions');picker.props.onChange({target:{value:'campaign-sheet'}});resumed.render();await ready(resumed,'frosthaven','campaign-sheet');assert.equal(nodes(resumed.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,1);assert.deepEqual(resumed.props.record.pieces[1],supply);}finally{resumed.dispose();}
  }finally{town.dispose();}
  const hidden=mount({...ui.props,fieldKey:'private.scene',record:original,readonly:false});
  try{await ready(hidden,'frosthaven');assert.deepEqual(nodes(hidden.tree).filter(n=>hasClass(n,'gb-free-area')).map(n=>n.props['data-area-id']),['private-hand']);}finally{hidden.dispose();}
 }finally{ui.dispose();restore();}
});

test('Jaws element strength columns keep independent actual tokens, never auto-consume or create six defaults',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='gloomhaven-jaws')!;
 const token=physical('observed-element','state',null),other=physical('other-state','state',0),old=physical('legacy-state','state',null);old.placement={areaId:'battle',x:.5,y:.5,rotation:90};
 const original:GenericRecord={version:'game-component-record-v1',pieces:[token,other,old]};let changed:GenericRecord|undefined;
 const ui=mount({pack,fieldKey:'battle.scene',record:original,selected:token.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 try{
  await ready(ui,'gloomhaven-jaws');
  const target=(id:string)=>find(ui.tree,n=>hasClass(n,'gb-free-area')&&n.props['data-area-id']==='element-'+id);
  target('strong').props.onClick(click(690,660));assert(changed);const strong=changed as GenericRecord;
  assert.deepEqual(strong.pieces[0].placement,{areaId:'battle',x:.69,y:.66,rotation:0,layoutVariant:'free-board-v1:base'});
  assert.equal(strong.pieces.length,3);assert.equal(strong.pieces[0].quantity,null);assert.deepEqual(strong.pieces[1],other);assert.deepEqual(strong.pieces[2],old);
  ui.props.record=strong;ui.render();target('waning').props.onClick(click(420,660));assert(changed);const waning=changed as GenericRecord;
  assert.equal(waning.pieces[0].placement!.x,.42);assert.equal(waning.pieces[0].quantity,null);assert.equal(original.pieces[0].placement,undefined);
  ui.props.record=validateGenericRecord(JSON.parse(JSON.stringify(waning)),pack,'battle.scene',[]);ui.props.selected=other.id;ui.render();target('inert').props.onClick(click(150,660));assert(changed);const inert=changed as GenericRecord;
  assert.equal(inert.pieces[1].quantity,0);assert.deepEqual(inert.pieces[0],waning.pieces[0]);
  ui.props.record={version:'game-component-record-v1',pieces:[physical('wrong-kind','figures',null)]};ui.props.selected='wrong-kind';ui.render();assert(target('inert').props.disabled);
  ui.props.record=inert;ui.props.selected=token.id;ui.props.layoutVariant='scenario-1';ui.render();await ready(ui,'gloomhaven-jaws','scenario-1');
  assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,48,'the existing map shape is untouched');assert.equal(target('strong').props.disabled,false);
  ui.props.readonly=true;ui.render();assert(target('strong').props.disabled);assert.equal(inert.pieces.length,3,'view changes do not infer token identities or add missing elements');
 }finally{ui.dispose();restore();}
});

test('Frosthaven scenario0 full physical map keeps pointy hex coordinates and field-specific views without assuming current mission or discovery',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='frosthaven')!;
 const figure=physical('current-figure','figures',null),overlay=physical('current-overlay','map',0),legacy=physical('older-map','map',null);legacy.placement={areaId:'battle',x:.3,y:.3,rotation:90};
 const original:GenericRecord={version:'game-component-record-v1',pieces:[figure,overlay,legacy]};let changed:GenericRecord|undefined;
 const ui=mount({pack,fieldKey:'battle.scene',record:original,selected:figure.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 try{
  await ready(ui,'frosthaven');const picker=find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기');
  const options=nodes(picker).filter(n=>n.type==='option').map(n=>n.props.value);assert.deepEqual(options,['base','scenario-0','scenario-1','scenario-2','scenario-3','scenario-4-a','scenario-4-b','scenario-5','scenario-6','scenario-7','scenario-8','scenario-9','scenario-10-start','scenario-10-final','scenario-11','scenario-12','scenario-13','scenario-14','scenario-15','scenario-16-elevator','scenario-16-upper','scenario-16-lower','scenario-16-both','scenario-17','scenario-18','scenario-19','scenario-20','scenario-21-start','scenario-21-after','scenario-22','scenario-23','scenario-24','scenario-25','scenario-26','scenario-27','scenario-28','scenario-29','scenario-30','scenario-31-start','scenario-31-middle','scenario-31-final','scenario-32','scenario-33','scenario-34','scenario-35','scenario-36','scenario-37-start','scenario-37-after70','scenario-37-after81','scenario-37-final','scenario-38','scenario-39','scenario-40','scenario-41-initial','scenario-41-shifted','scenario-41-removed','scenario-42','scenario-43','scenario-44','scenario-45','scenario-46','scenario-47-start','scenario-47-after','scenario-48','scenario-49','scenario-50','scenario-51','scenario-52','scenario-53','scenario-54','scenario-55','scenario-56','scenario-57','scenario-58','scenario-59','scenario-60','scenario-61','scenario-62','scenario-63','scenario-64-full',...Array.from({length:15},(_,i)=>`scenario-64-outer-${(14-i).toString(16)}`),'scenario-64-final','scenario-65','scenario-66','scenario-67','scenario-68','scenario-69','scenario-70','scenario-71','scenario-72-initial','scenario-72-after141','scenario-72-after105','scenario-72-after132','scenario-73-initial','scenario-73-after28','scenario-73-after143','scenario-74-friend','scenario-74-no-friend','scenario-75','scenario-76-initial','scenario-76-after105','scenario-77-initial','scenario-77-wind','scenario-77-night','scenario-77-frost','scenario-77-return','scenario-78-final-normal','scenario-78-final-secret','scenario-79-before85','scenario-79-after85','scenario-80','scenario-81',...Array.from({length:12},(_,i)=>`scenario-82-phase-${String(i+1).padStart(2,'0')}`),'scenario-83']);
  picker.props.onChange({target:{value:'campaign-sheet'}});ui.render();assert.equal(find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.value,'base','another field document cannot become a map');
  picker.props.onChange({target:{value:'scenario-0'}});ui.render();await ready(ui,'frosthaven','scenario-0');assert.equal(changed,undefined,'view selection must not start the scenario or make its enemies');
  const slots=nodes(ui.tree).filter(n=>hasClass(n,'gb-slot'));assert.equal(slots.length,121);
  assert(slots.every(n=>n.props.style.clipPath==='polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)'));
  const door=()=>find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('c9·r7'));
  door().props.onClick();assert(changed);const one=changed as GenericRecord;
  assert.deepEqual(one.pieces[0].placement,{areaId:'battle',x:.343,y:.4535,rotation:0,layoutVariant:'slot-board-v1:frosthaven-scenario0-v1'});
  assert.equal(one.pieces[0].quantity,null);assert.deepEqual(one.pieces[2],legacy);
  ui.props.record=one;ui.props.selected=overlay.id;ui.render();changed=undefined;door().props.onClick();assert(changed);const two=changed as GenericRecord;
  assert.equal(two.pieces.length,3);assert.equal(two.pieces[1].quantity,0);assert.deepEqual(two.pieces[1].placement,two.pieces[0].placement);
  const resumed=mount({...ui.props,record:validateGenericRecord(JSON.parse(JSON.stringify(two)),pack,'battle.scene',[]),readonly:true});
  try{await ready(resumed,'frosthaven');await ready(resumed,'frosthaven','scenario-0');assert.equal(find(resumed.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.value,'scenario-0');assert.equal(nodes(resumed.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,1);assert.deepEqual(resumed.props.record.pieces[2],legacy);}finally{resumed.dispose();}
  const town=mount({...ui.props,fieldKey:'town.scene',record:{version:'game-component-record-v1',pieces:[]}});
  try{await ready(town,'frosthaven');const t=find(town.tree,n=>n.type==='select'&&n.props['aria-label']==='전초기지 보기');assert.deepEqual(nodes(t).filter(n=>n.type==='option').map(n=>n.props.value),['base','campaign-sheet']);}finally{town.dispose();}
 }finally{ui.dispose();restore();}
});

test('Frosthaven scenario1 uses its own93-cell frame, preserves scenario0 positions and reopens mixed-frame records without guessing the mission',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='frosthaven')!;
 const figure=physical('current-s1-figure','figures',null),prior=physical('existing-s0-piece','map',0);
 prior.placement={areaId:'battle',x:.343,y:.4535,rotation:90,layoutVariant:'slot-board-v1:frosthaven-scenario0-v1'};
 const original:GenericRecord={version:'game-component-record-v1',pieces:[figure,prior]};let changed:GenericRecord|undefined;
 const ui=mount({pack,fieldKey:'battle.scene',record:original,selected:figure.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 try{
  await ready(ui,'frosthaven');await ready(ui,'frosthaven','scenario-0');
  const picker=()=>find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기');
  assert.equal(picker().props.value,'scenario-0');picker().props.onChange({target:{value:'scenario-1'}});ui.render();await ready(ui,'frosthaven','scenario-1');
  assert.equal(changed,undefined);assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,93);assert(!nodes(ui.tree).some(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')));
  find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('c14·r6')).props.onClick();assert(changed);const placed=changed as GenericRecord;
  assert.deepEqual(placed.pieces[0].placement,{areaId:'battle',x:.405,y:.532,rotation:0,layoutVariant:'slot-board-v1:frosthaven-scenario1-v1'});assert.equal(placed.pieces[0].quantity,null);assert.deepEqual(placed.pieces[1],prior);
  assert.equal(original.pieces[0].placement,undefined);
  const reopened=mount({...ui.props,record:validateGenericRecord(JSON.parse(JSON.stringify(placed)),pack,'battle.scene',[]),readonly:true});
  try{
   await ready(reopened,'frosthaven');assert.equal(find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.value,'base','two known map frames cannot silently select one mission');
   find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.onChange({target:{value:'scenario-1'}});reopened.render();await ready(reopened,'frosthaven','scenario-1');
   assert.equal(nodes(reopened.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,1);assert.deepEqual(reopened.props.record.pieces[1],prior);
   find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.onChange({target:{value:'scenario-0'}});reopened.render();await ready(reopened,'frosthaven','scenario-0');assert.equal(nodes(reopened.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,1);
   assert.equal(changed,placed,'readonly view changes must not migrate either piece');
  }finally{reopened.dispose();}
 }finally{ui.dispose();restore();}
});

test('Frosthaven scenario2 covers all three source rooms and keeps its two doors editable without migrating previous map frames',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='frosthaven')!;
 const figure=physical('current-s2-figure','figures',null),prior=physical('prior-s1-overlay','map',0);
 prior.placement={areaId:'battle',x:.405,y:.532,rotation:90,layoutVariant:'slot-board-v1:frosthaven-scenario1-v1'};
 let changed:GenericRecord|undefined;
 const ui=mount({pack,fieldKey:'battle.scene',record:{version:'game-component-record-v1',pieces:[figure,prior]},selected:figure.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 try{
  await ready(ui,'frosthaven');await ready(ui,'frosthaven','scenario-1');
  find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.onChange({target:{value:'scenario-2'}});ui.render();await ready(ui,'frosthaven','scenario-2');
  assert.equal(find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.value,'scenario-2');
  assert.equal(changed,undefined);assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,93);
  assert(!nodes(ui.tree).some(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')));
  find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('c21·r9')).props.onClick();assert(changed);
  const placed=changed as GenericRecord;
  assert.deepEqual(placed.pieces[0].placement,{areaId:'battle',x:.575,y:.53,rotation:0,layoutVariant:'slot-board-v1:frosthaven-scenario2-v1'});
  assert.equal(placed.pieces[0].quantity,null);assert.deepEqual(placed.pieces[1],prior);
  const reopened=mount({...ui.props,record:validateGenericRecord(JSON.parse(JSON.stringify(placed)),pack,'battle.scene',[]),readonly:true});
  try{
   await ready(reopened,'frosthaven');assert.equal(find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.value,'base');
   find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.onChange({target:{value:'scenario-2'}});reopened.render();await ready(reopened,'frosthaven','scenario-2');
   assert.equal(nodes(reopened.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,1);assert.deepEqual(reopened.props.record.pieces[1],prior);assert.equal(changed,placed);
  }finally{reopened.dispose();}
 }finally{ui.dispose();restore();}
});

test('Frosthaven scenario3 full102-cell view records a chosen door and reopens without inventing escaped characters or moving scenario2 pieces',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='frosthaven')!;
 const figure=physical('current-s3-figure','figures',null),prior=physical('prior-s2-overlay','map',0);
 prior.placement={areaId:'battle',x:.575,y:.53,rotation:90,layoutVariant:'slot-board-v1:frosthaven-scenario2-v1'};
 let changed:GenericRecord|undefined;
 const ui=mount({pack,fieldKey:'battle.scene',record:{version:'game-component-record-v1',pieces:[figure,prior]},selected:figure.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 try{
  await ready(ui,'frosthaven');await ready(ui,'frosthaven','scenario-2');
  find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.onChange({target:{value:'scenario-3'}});ui.render();await ready(ui,'frosthaven','scenario-3');
  assert.equal(find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.value,'scenario-3');
  assert.equal(changed,undefined);assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,102);assert.equal(ui.props.record.pieces.length,2);
  assert(!nodes(ui.tree).some(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')));
  find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('c9·r3')).props.onClick();assert(changed);
  const placed=changed as GenericRecord;assert.deepEqual(placed.pieces[0].placement,{areaId:'battle',x:.345,y:.257,rotation:0,layoutVariant:'slot-board-v1:frosthaven-scenario3-v1'});
  assert.equal(placed.pieces[0].quantity,null);assert.deepEqual(placed.pieces[1],prior);
  const reopened=mount({...ui.props,record:validateGenericRecord(JSON.parse(JSON.stringify(placed)),pack,'battle.scene',[]),readonly:true});
  try{
   await ready(reopened,'frosthaven');assert.equal(find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.value,'base');
   find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.onChange({target:{value:'scenario-3'}});reopened.render();await ready(reopened,'frosthaven','scenario-3');
   assert.equal(nodes(reopened.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,1);assert.deepEqual(reopened.props.record.pieces[1],prior);assert.equal(changed,placed);
  }finally{reopened.dispose();}
 }finally{ui.dispose();restore();}
});

for(const [variant,count,column,row,x,y]of [['scenario-4-a',89,15,3,.516,.415],['scenario-4-b',64,7,3,.388,.295],['scenario-5',67,5,6,.28,.4],['scenario-6',87,25,3,.591,.433375],['scenario-7',88,6,12,.273,.772],['scenario-8',67,14,12,.43,.555],['scenario-9',142,0,12,.313,.519],['scenario-10-start',35,9,3,.3,.415],['scenario-10-final',53,10,0,.326,.28],['scenario-11',71,16,2,.628,.227],['scenario-12',121,-1,5,.376,.398],['scenario-13',127,0,6,.375,.4],['scenario-14',88,0,4,.082,.4505],['scenario-15',83,-2,5,.081,.395],['scenario-15',83,4,1,.237,.215],['scenario-17',109,5,-1,.355,.552],['scenario-18',93,11,3,.47,.3625],['scenario-19',83,5,3,.272,.298],['scenario-20',103,0,0,.233,.265],['scenario-21-start',37,5,7,.314,.131],['scenario-21-after',92,17,-1,.58,.2925],['scenario-22',92,19,3,.46,.233],['scenario-23',96,-7,3,.196,.43],['scenario-24',78,5,10,.176,.565],['scenario-24',78,19,1,.54,.16],['scenario-24',78,21,10,.592,.565],['scenario-25',84,7,3,.196,.268],['scenario-25',84,4,10,.13,.541],['scenario-25',84,31,5,.724,.346],['scenario-26',88,9,3,.32,.3475],['scenario-26',88,24,2,.74,.295],['scenario-27',117,-3,-7,.208,.217],['scenario-27',117,-9,1,.082,.505],['scenario-27',117,19,-9,.67,.145],['scenario-28',111,10,0,.455,.32],['scenario-28',111,23,5,.715,.5],['scenario-28',111,-10,10,.055,.68],['scenario-29',149,7,-1,.386,.3],['scenario-29',149,-9,5,.066,.516],['scenario-29',149,7,5,.386,.516],['scenario-30',149,0,-4,.246,.192],['scenario-30',149,2,6,.286,.552],['scenario-30',149,7,-1,.386,.3],['scenario-31-start',23,0,0,.085,.198],['scenario-31-middle',28,13,3,.605,.414],['scenario-31-final',23,7,3,.365,.414],['scenario-32',95,-1,3,.255,.3485],['scenario-32',95,16,4,.646,.389],['scenario-32',95,10,0,.508,.227],['scenario-33',82,13,3,.390,.4545],['scenario-33',82,8,6,.265,.603],['scenario-33',82,18,-4,.515,.108],['scenario-34',35,3,1,.380,.205],['scenario-34',35,2,4,.335,.421],['scenario-34',35,3,9,.380,.781],['scenario-35',89,5,7,.272,.392],['scenario-35',89,4,14,.248,.686],['scenario-35',89,11,9,.416,.476],['scenario-36',57,1,-1,.135,.162],['scenario-36',57,7,3,.375,.474],['scenario-36',57,13,7,.615,.786],['scenario-37-start',24,15,1,.432,.38],['scenario-37-after70',48,31,1,.784,.38],['scenario-37-after81',49,-1,1,.080,.38],['scenario-37-final',48,30,2,.762,.419],['scenario-38',134,-8,10,.064,.508],['scenario-38',134,5,11,.376,.550],['scenario-38',134,-8,2,.064,.172],['scenario-39',148,3,7,.148,.645],['scenario-39',148,21,-1,.634,.285],['scenario-39',148,18,8,.553,.690],['scenario-39',148,0,2,.067,.420],['scenario-40',87,0,0,.092,.654],['scenario-40',87,11,-5,.378,.4515],['scenario-40',87,15,-9,.482,.2895],['scenario-40',87,16,-8,.508,.330],['scenario-41-initial',59,12,0,.389,.348],['scenario-41-shifted',59,6,0,.221,.348],['scenario-41-removed',59,25,1,.753,.396],['scenario-42',109,-1,1,.221,.399],['scenario-42',109,10,-6,.430,.126],['scenario-42',109,26,4,.734,.516],['scenario-43',80,13,7,.348,.4235],['scenario-43',80,18,8,.458,.467],['scenario-43',80,32,8,.766,.467],['scenario-44',98,11,7,.427,.572],['scenario-44',98,3,1,.259,.356],['scenario-44',98,7,-5,.343,.140],['scenario-45',114,1,3,.310,.495],['scenario-45',114,7,-7,.442,.105],['scenario-45',114,0,12,.288,.846],['scenario-46',77,15,1,.397,.343],['scenario-46',77,19,-1,.485,.265],['scenario-46',77,30,-2,.727,.226],['scenario-47-start',53,7,3,.374,.567],['scenario-47-after',72,5,-7,.318,.087],['scenario-47-after',72,0,0,.178,.423],['scenario-48',77,13,-1,.338,.350],['scenario-48',77,24,2,.580,.467],['scenario-48',77,34,-4,.800,.233],['scenario-49',103,-1,3,.491,.381],['scenario-49',103,12,2,.777,.342],['scenario-49',103,-3,9,.447,.615],['scenario-50',53,7,3,.404,.432],['scenario-50',53,0,0,.138,.234],['scenario-50',53,12,6,.594,.630],['scenario-51',108,3,5,.164,.480],['scenario-51',108,13,1,.374,.336],['scenario-51',108,18,-4,.479,.156],['scenario-52',122,-1,3,.201,.408],['scenario-52',122,-2,-2,.179,.213],['scenario-52',122,20,6,.663,.525],['scenario-53',78,3,3,.252,.312],['scenario-53',78,0,0,.138,.114],['scenario-53',78,7,9,.404,.708],['scenario-54',83,3,-1,.224,.675],['scenario-54',83,8,-2,.354,.630],['scenario-54',83,3,-13,.224,.135],['scenario-55',89,15,3,.466,.365],['scenario-55',89,21,3,.622,.365],['scenario-55',89,25,5,.726,.455],['scenario-56',99,-2,2,.302,.556],['scenario-56',99,18,-8,.742,.091],['scenario-56',99,-6,-8,.214,.091],['scenario-57',83,7,3,.404,.312],['scenario-57',83,4,0,.290,.114],['scenario-57',83,14,10,.670,.774],['scenario-58',84,15,3,.424,.334],['scenario-58',84,9,3,.280,.334],['scenario-58',84,28,4,.736,.376],['scenario-59',93,10,4,.342,.232],['scenario-59',93,10,10,.342,.466],['scenario-59',93,20,8,.562,.388],['scenario-60',103,9,3,.310,.367],['scenario-60',103,14,0,.450,.214],['scenario-60',103,27,5,.814,.469],['scenario-61',110,11,3,.335,.6775],['scenario-61',110,8,-6,.260,.340],['scenario-61',110,20,-8,.560,.265],['scenario-62',68,0,6,.152,.420],['scenario-62',68,4,0,.280,.087],['scenario-62',68,7,11,.376,.6975],['scenario-63',77,8,2,.319,.380],['scenario-63',77,20,2,.631,.380],['scenario-63',77,13,-3,.449,.155],['scenario-64-full',148,10,7,.190,.2845],['scenario-64-full',148,25,11,.490,.4225],['scenario-64-outer-e',125,23,9,.450,.3535],['scenario-64-final',35,25,11,.490,.4225],['scenario-65',119,19,3,.470,.363],['scenario-65',119,5,3,.162,.363],['scenario-65',119,34,2,.800,.324],['scenario-66',207,5,3,.422,.41725],['scenario-66',207,24,-2,.745,.271],['scenario-66',207,12,8,.541,.5635],['scenario-67',105,-9,3,.050,.365],['scenario-67',105,8,6,.475,.500],['scenario-67',105,13,3,.600,.365],['scenario-68',71,5,13,.314,.803],['scenario-68',71,10,0,.484,.101],['scenario-68',71,3,5,.246,.371],['scenario-69',87,20,14,.482,.612],['scenario-69',87,8,10,.218,.456],['scenario-69',87,24,3,.570,.183],['scenario-70',115,-1,17,.170,.7225],['scenario-70',115,7,7,.370,.3475],['scenario-70',115,14,0,.545,.085],['scenario-71',117,3,5,.122,.585],['scenario-71',117,17,3,.374,.495],['scenario-71',117,37,3,.734,.495],['scenario-72-initial',100,3,3,.168,.4635],['scenario-72-after141',100,16,2,.454,.408],['scenario-72-after105',100,25,3,.652,.4635],['scenario-72-after132',100,37,3,.916,.4635],['scenario-73-initial',138,0,6,.041,.660],['scenario-73-after28',138,21,3,.482,.498],['scenario-73-after143',138,38,2,.839,.444],['scenario-74-friend',102,4,6,.150,.810],['scenario-74-friend',102,20,0,.438,.594],['scenario-74-friend',102,31,-9,.636,.270],['scenario-74-no-friend',102,31,-7,.636,.342],['scenario-75',116,0,6,.148,.840],['scenario-75',116,14,-12,.400,.192],['scenario-75',116,32,2,.724,.696],['scenario-76-initial',97,2,0,.310,.438],['scenario-76-initial',97,-7,9,.130,.816],['scenario-76-after105',97,20,4,.670,.606],['scenario-76-after105',97,11,3,.490,.564],['scenario-77-initial',72,0,0,.084,.296],['scenario-77-wind',72,24,0,.660,.296],['scenario-77-night',72,21,1,.588,.350],['scenario-77-frost',72,26,4,.708,.512],['scenario-77-return',72,24,2,.660,.404],['scenario-78-final-normal',147,5,3,.550,.832],['scenario-78-final-normal',147,-3,-5,.390,.544],['scenario-78-final-normal',147,-8,-14,.290,.220],['scenario-78-final-secret',147,3,-11,.510,.328],['scenario-78-final-secret',147,-3,-11,.390,.328],['scenario-79-before85',129,3,1,.760,.170],['scenario-79-before85',129,5,9,.800,.458],['scenario-79-before85',129,-18,4,.340,.278],['scenario-79-after85',129,-24,8,.220,.422],['scenario-79-after85',129,-19,11,.320,.530],['scenario-80',89,2,9,.310,.488],['scenario-80',89,0,1,.270,.200],['scenario-80',89,4,17,.350,.776],['scenario-81',134,0,0,.056,.274],['scenario-81',134,13,-3,.264,.166],['scenario-81',134,31,1,.552,.310],['scenario-81',134,55,5,.936,.454],['scenario-82-phase-01',93,0,0,.108,.252],['scenario-82-phase-01',93,14,8,.500,.636],['scenario-82-phase-02',93,9,5,.360,.492],['scenario-82-phase-03',93,10,0,.388,.252],['scenario-82-phase-04',93,16,0,.556,.252],['scenario-82-phase-05',93,23,3,.752,.396],['scenario-82-phase-06',93,20,8,.668,.636],['scenario-83',102,4,4,.180,.490],['scenario-83',102,9,3,.330,.430],['scenario-83',102,25,3,.810,.430],['scenario-83',102,27,3,.870,.430]] as const){
 test(`Frosthaven ${variant}${['scenario-15','scenario-24','scenario-25','scenario-26','scenario-27','scenario-28','scenario-29','scenario-30','scenario-32','scenario-33','scenario-34','scenario-35','scenario-36','scenario-38','scenario-39','scenario-40'].includes(variant)?` c${column}·r${row}`:''} explicitly selects its complete source map and preserves previous frames on edit and reopen`,async()=>{
  const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='frosthaven')!;
  const figure=physical('user-current-figure','figures',null),prior=physical('prior-s0-overlay','map',0);
  prior.placement={areaId:'battle',x:.343,y:.4535,rotation:90,layoutVariant:'slot-board-v1:frosthaven-scenario0-v1'};
  let changed:GenericRecord|undefined;const ui=mount({pack,fieldKey:'battle.scene',record:{version:'game-component-record-v1',pieces:[figure,prior]},selected:figure.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
  try{
   await ready(ui,'frosthaven');await ready(ui,'frosthaven','scenario-0');
   find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.onChange({target:{value:variant}});ui.render();await ready(ui,'frosthaven',variant);
   assert.equal(find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.value,variant);
   assert.equal(changed,undefined);assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,count);assert.equal(ui.props.record.pieces.length,2);
   find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes(`c${column}·r${row} 빈 칸`)).props.onClick();assert(changed);
   const placed=changed as GenericRecord;assert.deepEqual(placed.pieces[0].placement,{areaId:'battle',x,y,rotation:0,layoutVariant:variant.startsWith('scenario-41-')?'slot-board-v1:frosthaven-scenario41-v1':variant.startsWith('scenario-64-')?'slot-board-v1:frosthaven-scenario64-v1':variant.startsWith('scenario-72-')?'slot-board-v1:frosthaven-scenario72-v1':variant.startsWith('scenario-73-')?'slot-board-v1:frosthaven-scenario73-v1':variant.startsWith('scenario-74-')?'slot-board-v1:frosthaven-scenario74-v1':variant.startsWith('scenario-76-')?'slot-board-v1:frosthaven-scenario76-v1':variant.startsWith('scenario-77-')?'slot-board-v1:frosthaven-scenario77-v1':variant.startsWith('scenario-78-')?'slot-board-v1:frosthaven-scenario78-v1':variant.startsWith('scenario-79-')?'slot-board-v1:frosthaven-scenario79-v1':variant.startsWith('scenario-82-')?'slot-board-v1:frosthaven-scenario82-v1':`slot-board-v1:frosthaven-${variant.replace('scenario-','scenario')}-v1`});
   assert.equal(placed.pieces[0].quantity,null);assert.deepEqual(placed.pieces[1],prior);
   const reopened=mount({...ui.props,record:validateGenericRecord(JSON.parse(JSON.stringify(placed)),pack,'battle.scene',[]),readonly:true});
   try{
    await ready(reopened,'frosthaven');assert.equal(find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.value,'base');
    find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.onChange({target:{value:variant}});reopened.render();await ready(reopened,'frosthaven',variant);
    assert.equal(nodes(reopened.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,1);assert.deepEqual(reopened.props.record.pieces[1],prior);assert.equal(changed,placed);
   }finally{reopened.dispose();}
  }finally{ui.dispose();restore();}
 });
}


test('shared coordinate frames do not guess which physical subset is present',()=>{
 const board={gameId:'synthetic',svg:'board.svg',viewBox:[0,0,1000,1000] as [number,number,number,number],areas:[],manualVariantsFor:['battle.scene'],placementFrame:'table',variants:[{id:'first',svg:'a.svg',json:'a.json',fields:['battle.scene'],placementFrame:'common'},{id:'second',svg:'b.svg',json:'b.json',fields:['battle.scene'],placementFrame:'common'},{id:'unique',svg:'u.svg',json:'u.json',fields:['battle.scene'],placementFrame:'unique'}]};
 for(const prefix of ['slot-board-v1:','free-board-v1:']){
  assert.equal(realBoardViewForPlacements(board,'battle.scene',[{layoutVariant:prefix+'common'}]),'base');
  assert.equal(realBoardViewForPlacements(board,'battle.scene',[{layoutVariant:prefix+'unique'},{layoutVariant:prefix+'common'}]),'base');
  assert.equal(realBoardViewForPlacements(board,'battle.scene',[{layoutVariant:prefix+'unique'}]),'unique');
 }
});

test('Frosthaven elevator subsets retain shared-coordinate pieces, require explicit reopen view and never remove absent-platform records',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='frosthaven')!;
 const elevator=physical('elevator-figure','figures',null),upper=physical('upper-figure','figures',0),lower=physical('lower-map','map',null);let changed:GenericRecord|undefined;
 const ui=mount({pack,fieldKey:'battle.scene',record:{version:'game-component-record-v1',pieces:[elevator,upper,lower]},selected:elevator.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 try{
  await ready(ui,'frosthaven');const picker=()=>find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기');
  const choose=async(id:string)=>{picker().props.onChange({target:{value:id}});ui.render();await ready(ui,'frosthaven',id);};
  await choose('scenario-16-both');assert.equal(changed,undefined);assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,53);
  for(const [id,c,r,x,y]of [['elevator-figure',4,5,.292,.406],['upper-figure',3,0,.260,.136],['lower-map',0,11,.164,.730]] as const){
   ui.props.selected=id;ui.render();find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes(`c${c}·r${r}`)).props.onClick();assert(changed);
   const next=changed as GenericRecord;assert.deepEqual(next.pieces.find(p=>p.id===id)!.placement,{areaId:'battle',x,y,rotation:0,layoutVariant:'slot-board-v1:frosthaven-scenario16-v1'});ui.props.record=next;ui.render();
  }
  const saved=validateGenericRecord(JSON.parse(JSON.stringify(ui.props.record)),pack,'battle.scene',[]);changed=undefined;
  for(const [id,count,filled]of [['scenario-16-elevator',35,1],['scenario-16-upper',44,2],['scenario-16-lower',44,2],['scenario-16-both',53,3]] as const){
   await choose(id);assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,count);assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,filled);
   const outside=nodes(ui.tree).filter(n=>n.props?.['aria-label']==='이 보기의 칸 밖 위치');assert.equal(outside.length,filled===3?0:1);if(outside.length)assert.equal(nodes(outside[0]).filter(n=>hasClass(n,'gb-piece')).length,3-filled);
   assert.deepEqual(ui.props.record,saved);assert.equal(changed,undefined,'changing present-platform template is not deletion or phase advancement');
  }
  const reopened=mount({...ui.props,record:saved,readonly:true});
  try{await ready(reopened,'frosthaven');const pick=()=>find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기');assert.equal(pick().props.value,'base');pick().props.onChange({target:{value:'scenario-16-both'}});reopened.render();await ready(reopened,'frosthaven','scenario-16-both');assert.equal(nodes(reopened.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,3);assert.deepEqual(reopened.props.record,saved);assert.equal(saved.pieces[1].quantity,0);assert.equal(saved.pieces[0].quantity,null);}finally{reopened.dispose();}
 }finally{ui.dispose();restore();}
});

test('Frosthaven scenario41 wall-reference phases share one frame without moving or deleting saved walls and figures',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='frosthaven')!;
 const wall=physical('user-current-wall','map',0),figure=physical('user-current-figure','figures',null);
 wall.placement={areaId:'battle',x:.389,y:.348,rotation:0,layoutVariant:'slot-board-v1:frosthaven-scenario41-v1'};
 figure.placement={areaId:'battle',x:.753,y:.396,rotation:90,layoutVariant:'slot-board-v1:frosthaven-scenario41-v1'};
 const saved=validateGenericRecord(JSON.parse(JSON.stringify({version:'game-component-record-v1',pieces:[wall,figure]})),pack,'battle.scene',[]);let changed:GenericRecord|undefined;
 const ui=mount({pack,fieldKey:'battle.scene',record:saved,selected:wall.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 try{
  await ready(ui,'frosthaven');const picker=()=>find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기');assert.equal(picker().props.value,'base');
  const choose=async(phase:string)=>{const id='scenario-41-'+phase;picker().props.onChange({target:{value:id}});ui.render();await ready(ui,'frosthaven',id);};
  for(const phase of ['initial','shifted','removed']){
   await choose(phase);assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,59);assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,2);
   assert.deepEqual(ui.props.record,saved);assert.equal(changed,undefined,'reference wall movement/removal is not current record mutation');
  }
  await choose('shifted');find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('c6·r0')).props.onClick();assert(changed);
  const moved=changed as GenericRecord;assert.deepEqual(moved.pieces[0].placement,{areaId:'battle',x:.221,y:.348,rotation:0,layoutVariant:'slot-board-v1:frosthaven-scenario41-v1'});assert.equal(moved.pieces[0].quantity,0);assert.deepEqual(moved.pieces[1],figure);
  const reopened=mount({...ui.props,record:validateGenericRecord(JSON.parse(JSON.stringify(moved)),pack,'battle.scene',[]),readonly:true});
  try{
   await ready(reopened,'frosthaven');const pick=()=>find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기');assert.equal(pick().props.value,'base');
   pick().props.onChange({target:{value:'scenario-41-removed'}});reopened.render();await ready(reopened,'frosthaven','scenario-41-removed');
   assert.equal(nodes(reopened.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,2);assert.deepEqual(reopened.props.record,moved);assert.equal(changed,moved);
  }finally{reopened.dispose();}
 }finally{ui.dispose();restore();}
});

test('Frosthaven scenario47 overlap views preserve surface records until explicit placement, and transit A hexes are not endpoints',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='frosthaven')!;
 const figure=physical('surface-figure','figures',null),prior=physical('surface-map','map',0);
 figure.placement={areaId:'battle',x:.374,y:.567,rotation:0,layoutVariant:'slot-board-v1:frosthaven-scenario47-start-v1'};
 prior.placement={areaId:'battle',x:.178,y:.423,rotation:90,layoutVariant:'slot-board-v1:frosthaven-scenario47-start-v1'};
 const saved=validateGenericRecord(JSON.parse(JSON.stringify({version:'game-component-record-v1',pieces:[figure,prior]})),pack,'battle.scene',[]);let changed:GenericRecord|undefined;
 const ui=mount({pack,fieldKey:'battle.scene',record:saved,selected:figure.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 try{
  await ready(ui,'frosthaven');await ready(ui,'frosthaven','scenario-47-start');const picker=()=>find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기');assert.equal(picker().props.value,'scenario-47-start');
  const choose=async(phase:string)=>{const id='scenario-47-'+phase;picker().props.onChange({target:{value:id}});ui.render();await ready(ui,'frosthaven',id);};
  await choose('start');assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,53);assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,2);
  await choose('after');assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,72);assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,0);
  assert(!nodes(ui.tree).some(n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('c4·r0')));
  assert.equal(changed,undefined);assert.deepEqual(ui.props.record,saved,'choosing the overlap template must not cause a fall, removal or frame migration');
  find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('c7·r3')).props.onClick();assert(changed);
  const moved=changed as GenericRecord;assert.deepEqual(moved.pieces[0].placement,{areaId:'battle',x:.374,y:.567,rotation:0,layoutVariant:'slot-board-v1:frosthaven-scenario47-after-v1'});assert.equal(moved.pieces[0].quantity,null);assert.deepEqual(moved.pieces[1],prior);
  const reopened=mount({...ui.props,record:validateGenericRecord(JSON.parse(JSON.stringify(moved)),pack,'battle.scene',[]),readonly:true});
  try{
   await ready(reopened,'frosthaven');const pick=()=>find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기');assert.equal(pick().props.value,'base');pick().props.onChange({target:{value:'scenario-47-after'}});reopened.render();await ready(reopened,'frosthaven','scenario-47-after');
   assert.equal(nodes(reopened.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,1);assert.deepEqual(reopened.props.record,moved);assert.equal(changed,moved);
  }finally{reopened.dispose();}
 }finally{ui.dispose();restore();}
});

test('Frosthaven scenario52 preserves two manually named bodies on the same hex without creating deaths or merging their values',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='frosthaven')!;
 const first=physical('user-body-one','figures',0),second=physical('user-body-two','figures',null);first.label='사용자 기록 서리악마 몸';second.label='사용자 기록 눈 임프 몸';
 first.placement={areaId:'battle',x:.311,y:.369,rotation:0,layoutVariant:'slot-board-v1:frosthaven-scenario52-v1'};
 const saved=validateGenericRecord(JSON.parse(JSON.stringify({version:'game-component-record-v1',pieces:[first,second]})),pack,'battle.scene',[]);let changed:GenericRecord|undefined;
 const ui=mount({pack,fieldKey:'battle.scene',record:saved,selected:second.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 try{
  await ready(ui,'frosthaven');await ready(ui,'frosthaven','scenario-52');assert.equal(changed,undefined);assert.equal(ui.props.record.pieces.length,2);
  const target=find(ui.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('c4·r2'));
  assert(hasClass(target,'filled'));assert.match(target.props['aria-label'],/겹쳐 기록/);target.props.onClick();assert(changed);
  const placed=changed as GenericRecord;assert.equal(placed.pieces.length,2);assert.deepEqual(placed.pieces[0],first);assert.deepEqual(placed.pieces[1].placement,first.placement);assert.equal(placed.pieces[1].quantity,null);assert.equal(placed.pieces[1].label,second.label);
  const reopened=mount({...ui.props,record:validateGenericRecord(JSON.parse(JSON.stringify(placed)),pack,'battle.scene',[]),readonly:true});
  try{
   await ready(reopened,'frosthaven');await ready(reopened,'frosthaven','scenario-52');const cell=find(reopened.tree,n=>hasClass(n,'gb-slot')&&String(n.props['aria-label']).includes('c4·r2'));
   assert.match(cell.props['aria-label'],/사용자 기록 서리악마 몸/);assert.match(cell.props['aria-label'],/사용자 기록 눈 임프 몸/);assert(nodes(cell).some(n=>n.type==='b'&&n.props.children===2));assert.deepEqual(reopened.props.record,placed);assert.equal(changed,placed);
  }finally{reopened.dispose();}
 }finally{ui.dispose();restore();}
});


test('Frosthaven scenario64 shared reference subsets preserve central and hidden outer records without removing or relocating them',async()=>{
 const restore=await fixture(),pack=catalogPacks.find(p=>p.id==='frosthaven')!;
 const centre=physical('user-central-figure','figures',null),outer=physical('user-outer-map','map',0);
 centre.placement={areaId:'battle',x:.490,y:.4225,rotation:90,layoutVariant:'slot-board-v1:frosthaven-scenario64-v1'};
 outer.placement={areaId:'battle',x:.190,y:.2845,rotation:0,layoutVariant:'slot-board-v1:frosthaven-scenario64-v1'};
 const original:GenericRecord={version:'game-component-record-v1',pieces:[centre,outer]},snapshot=structuredClone(original);let changed:GenericRecord|undefined;
 const ui=mount({pack,fieldKey:'battle.scene',record:original,selected:centre.id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 try{
  await ready(ui,'frosthaven');assert.equal(find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.value,'base');
  for(const [variant,count,filled]of [['scenario-64-full',148,2],['scenario-64-outer-e',125,1],['scenario-64-outer-0',35,1],['scenario-64-final',35,1],['scenario-64-full',148,2]] as const){
   find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.onChange({target:{value:variant}});ui.render();await ready(ui,'frosthaven',variant);
   assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')).length,count);assert.equal(nodes(ui.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,filled);
   const outside=nodes(ui.tree).filter(n=>n.props?.['aria-label']==='이 보기의 칸 밖 위치');assert.equal(outside.length,filled===2?0:1);if(outside.length)assert.equal(nodes(outside[0]).filter(n=>hasClass(n,'gb-piece')).length,1);
   assert.equal(changed,undefined);assert.deepEqual(ui.props.record,snapshot);
  }
  const saved=validateGenericRecord(JSON.parse(JSON.stringify(original)),pack,'battle.scene',[]),reopened=mount({...ui.props,record:saved,readonly:true});
  try{
   await ready(reopened,'frosthaven');assert.equal(find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.value,'base');
   find(reopened.tree,n=>n.type==='select'&&n.props['aria-label']==='시나리오 지도 보기').props.onChange({target:{value:'scenario-64-final'}});reopened.render();await ready(reopened,'frosthaven','scenario-64-final');
   assert.equal(nodes(reopened.tree).filter(n=>hasClass(n,'gb-slot')&&hasClass(n,'filled')).length,1);assert.deepEqual(reopened.props.record,snapshot);assert.equal(saved.pieces[0].quantity,null);assert.equal(saved.pieces[1].quantity,0);assert.equal(changed,undefined);
  }finally{reopened.dispose();}
 }finally{ui.dispose();restore();}
});
