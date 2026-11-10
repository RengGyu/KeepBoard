import assert from 'node:assert/strict';
import React from 'react';
import {register} from 'node:module';
import {readFile} from 'node:fs/promises';
import {catalogPacks} from '../../gamepacks/catalog.ts';
import {validateGenericRecord,type GenericRecord} from '../../shared/genericRecord.ts';
import {loadRealAssets,realAreasFor,realSlotAccepts} from '../../src/realBoards.ts';
import {emptyGameReadout,setReadoutValue} from '../../shared/readouts/registry.ts';
register('../../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {GameBoardRecord}=await import('../../src/GameBoardRecord.tsx');
export interface BoardCase {gameId:string;fieldKey:string;componentId:string;slotCount:number;players?:number;input:'slot'|'free'|'surface';status:string;recordingMode:string|null;areaId:string;areaSlots:Record<string,number>;manualValues?:Record<string,string|number|boolean|null>}
export function mountWithHooks(component:(props:any)=>any,props:any){
 const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,slots:any[]=[];let cursor=0,tree:any,pending:(()=>void)[]=[];
 const dispatcher={useMemo(fn:()=>unknown){cursor++;return fn();},useState(value:any){const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return[slots[i],(next:any)=>slots[i]=typeof next==='function'?next(slots[i]):next];},useRef(value:any){return slots[cursor++]??=( {current:value});},useEffect(effect:()=>any,deps?:any[]){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((v,j)=>!Object.is(v,old.deps?.[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:effect()};});}};
 const render=()=>{cursor=0;pending=[];const prev=internals.H;internals.H=dispatcher;try{tree=component(props);}finally{internals.H=prev;}pending.forEach(f=>f());return tree;};
 return {render,dispose(){slots.forEach(s=>s?.cleanup?.());}};
}
export function nodes(tree:any):any[]{return !tree||typeof tree!=='object'?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children)];}
export async function currentBoardRoundtrip(cases:BoardCase[]){
 const oldFetch=globalThis.fetch,oldWindow=(globalThis as any).window,hadWindow=Object.hasOwn(globalThis,'window');
 const mapping=await readFile('public/game-art/boards/mapping.json','utf8');
 globalThis.fetch=(async(input:any)=>{const url=String(input);if(url.endsWith('/mapping.json'))return new Response(mapping);const match=url.match(/^\/game-art\/real-boards\/([a-z0-9-]+)\/(board\.json|pieces\.svg|variants\/[a-z0-9-]+\.json)$/);if(!match)return new Response('',{status:404});try{return new Response(await readFile(`public/game-art/real-boards/${match[1]}/${match[2]}`));}catch{return new Response('',{status:404});}}) as typeof fetch;
 (globalThis as any).window={matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})};
 try{for(const c of cases){
  const pack=catalogPacks.find(p=>p.id===c.gameId)!;assert(pack,c.gameId);
  const binding=pack.runtime!.fieldBindings.find(b=>b.key===c.fieldKey)!;assert(binding);assert(binding.componentIds.includes(c.componentId));
  const assets=await loadRealAssets(c.gameId);assert(assets);const areas=realAreasFor(assets.board,c.fieldKey,c.players);
  assert.equal(assets.board.status,c.status,`${c.gameId}: status`);
  assert.equal(assets.board.recordingMode??null,c.recordingMode,`${c.gameId}: recording mode`);
  assert.deepEqual(Object.fromEntries(areas.map(a=>[a.id,a.slots.length])),c.areaSlots,`${c.gameId}/${c.fieldKey}: every area, not only the field total`);
  assert.equal(areas.flatMap(a=>a.slots).length,c.slotCount,`${c.gameId}/${c.fieldKey} current exact slot count`);
  let saved:GenericRecord|undefined;
  const original:GenericRecord={version:'game-component-record-v1',pieces:[{id:'selected',componentId:c.componentId,quantity:null,variant:null,label:'selected actual piece',anchor:'',evidenceId:null,region:null}]};
  if(c.manualValues){let readout=emptyGameReadout(pack,c.componentId);for(const [key,value]of Object.entries(c.manualValues))readout=setReadoutValue(pack,readout,key,value,{playerIds:['p1']});original.pieces[0].readout=readout;}
  const props={players:c.players,pack,fieldKey:c.fieldKey,record:original,selected:'selected',busy:false,onChange(next:GenericRecord){saved=next;}};
  const ui=mountWithHooks(GameBoardRecord,props);
  try{ui.render();await new Promise(r=>setImmediate(r));const tree=ui.render();
   const compatible=areas.flatMap(a=>realSlotAccepts(a.accepts,c.componentId)?a.slots:[]);
   const buttons=nodes(tree).filter(n=>n.type==='button'&&String(n.props.className).split(' ').includes('gb-slot'));
   assert.equal(buttons.length,c.slotCount);
   const slot=buttons.find(b=>!b.props.disabled);
   const free=nodes(tree).find(n=>n.type==='button'&&String(n.props.className).split(' ').includes('gb-free-area')&&!n.props.disabled);
   const surface=nodes(tree).find(n=>n.type==='div'&&String(n.props.className).split(' ').includes('gb-surface'));
   const rect={left:0,top:0,width:1000,height:1000};
   if(c.input==='slot'){assert(slot,`${c.gameId}/${c.fieldKey}: fixed slots required`);assert(compatible.length);slot.props.onClick();}
   else if(c.input==='free'){assert(free,`${c.gameId}/${c.fieldKey}: dedicated free-area controls required`);free.props.onClick({detail:0,stopPropagation(){},currentTarget:{closest:()=>({getBoundingClientRect:()=>rect})}});}
   else {assert(!slot&&!free,`${c.gameId}/${c.fieldKey}: generic surface expected`);assert(surface,`${c.gameId}/${c.fieldKey}: editable fallback must remain`);surface.props.onClick({clientX:500,clientY:500,currentTarget:{getBoundingClientRect:()=>rect}});}
   assert(saved,`${c.gameId}/${c.fieldKey}: actual click changes record`);
   const verified=validateGenericRecord(JSON.parse(JSON.stringify(saved)),pack,c.fieldKey,[],{playerIds:['p1']});assert.equal(verified.pieces[0].quantity,null);assert.equal(verified.pieces[0].placement!.areaId,c.areaId);
   assert.deepEqual({...verified.pieces[0],placement:undefined},{...original.pieces[0],placement:undefined},'placing must preserve all values, owner, unknowns and original evidence');
   assert.deepEqual(original.pieces[0].placement,undefined);
   const reopened=mountWithHooks(GameBoardRecord,{...props,record:JSON.parse(JSON.stringify(verified)),onChange(){}});
   try{reopened.render();await new Promise(r=>setImmediate(r));const restored=reopened.render();assert(nodes(restored).some(n=>n.type==='button'&&(/\bfilled\b|\bplaced\b/.test(String(n.props.className)))),'saved piece must reappear, not only validate');}finally{reopened.dispose();}
  }finally{ui.dispose();}
 }}finally{globalThis.fetch=oldFetch;if(hadWindow)(globalThis as any).window=oldWindow;else delete (globalThis as any).window;}
}
