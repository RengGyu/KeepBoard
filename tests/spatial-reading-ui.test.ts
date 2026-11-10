import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {register} from 'node:module';import {readFile} from 'node:fs/promises';
import {spatialFixture,assemble,board,placement,spatial,item} from './fixtures/spatial/builders';import {loadRealAssets} from '../src/realBoards';import {validateGenericRecord,type GenericRecord} from '../shared/genericRecord';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {GameBoardRecord}=await import('../src/GameBoardRecord');const {SpatialPieceDetails}=await import('../src/SpatialPieceDetails');
function mount(props:any,Component:(props:any)=>any=GameBoardRecord){const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,slots:any[]=[];let cursor=0,tree:any,pending:(()=>void)[]=[];
 const dispatcher={useMemo(fn:()=>unknown){cursor++;return fn();},useState(value:any){const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return[slots[i],(next:any)=>slots[i]=typeof next==='function'?next(slots[i]):next];},useRef(value:any){const i=cursor++;return slots[i]??={current:value};},useEffect(effect:()=>any,deps?:any[]){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((v,j)=>!Object.is(v,old.deps?.[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:effect()};});}};
 function render(){cursor=0;pending=[];const old=internals.H;internals.H=dispatcher;try{tree=Component(props);}finally{internals.H=old;}for(const effect of pending)effect();}render();return{props,render,get tree(){return tree;},dispose(){for(const s of slots)s?.cleanup?.();}};}
function nodes(t:any):any[]{return !t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];}
function find(t:any,f:(n:any)=>boolean){const n=nodes(t).find(f);assert(n,'expected spatial UI node');return n;}
const klass=(n:any,c:string)=>String(n.props?.className??'').split(' ').includes(c);

test('real board renders one multicell piece, exact angle, separate footprint and lossless manual edits/reopen',async()=>{
 const oldFetch=globalThis.fetch;globalThis.fetch=async(input:any)=>{const p=String(input);try{return new Response(await readFile(new URL('../public'+p,import.meta.url),'utf8'));}catch{return new Response('',{status:404});}};
 const f=spatialFixture(),a=f.request.spatial!.frames[0].areas[0],{pieces}=assemble(f,{items:[item()],spatial:spatial([board(f.request)],[placement(a.id,a.addresses[0].address,{coveredAddresses:a.addresses.slice(0,3).map(a=>a.address),coverageComplete:false,boardRotationDegrees:60,reflected:false})])});
 const record:GenericRecord={version:'game-component-record-v1',pieces};let changed:GenericRecord|undefined;const ui=mount({pack:f.pack,fieldKey:'board.scene',record,selected:pieces[0].id,busy:false,onChange:(r:GenericRecord)=>{changed=r;}});
 try{
  assert(await loadRealAssets('blokus','base',true));await new Promise(r=>setImmediate(r));ui.render();
  assert.equal(nodes(ui.tree).filter(n=>n.props?.['data-spatial-piece']===pieces[0].id).length,3);
  const arts=nodes(ui.tree).filter(n=>klass(n,'gb-slot-art'));assert.equal(arts.length,1);assert.equal(arts[0].props.style.transform,'rotate(60deg)');
  assert(!nodes(ui.tree).some(n=>n.props?.['aria-label']==='미배치 구성물'));
  const details=find(ui.tree,n=>n.type===SpatialPieceDetails);const detailUI=mount({...details.props},SpatialPieceDetails);const controls=detailUI.tree;
  find(controls,n=>n.props?.['aria-label']==='공간 방향 직접 수정').props.onChange({target:{value:'0'}});assert(changed);assert.equal(changed.pieces[0].spatial!.manualRotationDegrees,0);assert.equal(changed.pieces[0].spatial!.placement!.boardRotationDegrees,60);
  ui.props.record=changed;ui.render();detailUI.props.piece=changed.pieces[0];await new Promise(r=>setImmediate(r));detailUI.render();const controls2=detailUI.tree;
  find(controls2,n=>n.props?.['aria-label']==='공간 기준 칸 직접 수정').props.onChange({target:{value:a.addresses[4].address}});assert(changed);assert.equal(changed.pieces[0].spatial!.manualAnchor!.slotId,a.addresses[4].slotId);
  detailUI.dispose();const saved=validateGenericRecord(JSON.parse(JSON.stringify(changed)),f.pack,'board.scene',[pieces[0].evidenceId!]);const reopened=mount({...ui.props,record:saved,readonly:true});try{await new Promise(r=>setImmediate(r));reopened.render();assert.equal(nodes(reopened.tree).filter(n=>klass(n,'gb-slot-art')).length,1);assert.equal(nodes(reopened.tree).find(n=>klass(n,'gb-slot-art'))!.props.style.transform,'rotate(0deg)');assert.equal(saved.pieces.length,1);assert.deepEqual(saved.pieces[0].spatial!.placement,record.pieces[0].spatial!.placement);}finally{reopened.dispose();}
 }finally{ui.dispose();globalThis.fetch=oldFetch;}
});
