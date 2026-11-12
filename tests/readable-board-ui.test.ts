import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import React,{createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile} from 'node:fs/promises';
import {layoutDrawingItems} from '../shared/drawingLayout';
import type {Evidence} from '../shared/types';
import type {RummikubScene,RummikubTile} from '../shared/rummikub';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {PhotoLayoutBoard,visiblePhotoItems,photoFallbackReference}=await import('../src/PhotoLayoutBoard');
const {RummikubBoardView}=await import('../src/RummikubBoard');
const {readableBoardWidth,BoardWorkbench,publicBoardCrop}=await import('../src/GameBoardRecord');
const source:Evidence={id:'photo',kind:'photo',url:'/synthetic.jpg',scope:'public',captureEpoch:'epoch',capturedAt:'now',label:'',width:900,height:1600};
const item=(id:string,index:number)=>({assertionId:'accepted',pieceId:id,position:{space:'photo' as const,evidenceId:'photo',sourceSHA:'a'.repeat(64),box:{x:.1+(index%4)*.075,y:.1+Math.floor(index/4)*.15,width:.06,height:.11},rotationDegrees:32}});
test('public board instance clips only declared existing template areas, retaining pinned board geometry',()=>{
 const board:any={viewBox:[0,0,1000,1000],areas:[{id:'one',slots:[{id:'a',x:30,y:60,w:50,h:40},{id:'b',x:90,y:110,w:50,h:40}]},{id:'two',slots:[{id:'c',x:30,y:500,w:50,h:40}]},{id:'pattern',bounds:[20,40,130,120],slots:[]}]};
 const before=structuredClone(board);assert.deepEqual(publicBoardCrop(board,['one','pattern']),[20,40,130,120]);assert.deepEqual(publicBoardCrop(board,['one']),[30,60,110,90]);assert.deepEqual(publicBoardCrop(board,['unknown']),board.viewBox);assert.deepEqual(board,before);
});
test('canonical and other-context geometry cannot expand fallback rows, while deleted same-context geometry remains stable after reopen',()=>{
 const refs=[{...item('canonical',0),contextKey:'window'},{...item('window',1),contextKey:'window'},{...item('deleted',2),contextKey:'window'},{...item('other-field',9),contextKey:'other'}],shown=[refs[1]],before=structuredClone(refs);
 const filtered=photoFallbackReference(refs,shown,new Set(['canonical']));assert.deepEqual(filtered.map(i=>i.pieceId),['window','deleted']);
 assert.deepEqual(photoFallbackReference(JSON.parse(JSON.stringify(refs)),shown,new Set(['canonical'])),filtered);assert.deepEqual(refs,before);
});
const nodes=(t:any):any[]=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
function hooks<T>(render:()=>T){const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,old=internals.H;internals.H={useState:(v:any)=>[typeof v==='function'?v():v,()=>{}],useRef:(v:any)=>({current:v}),useEffect:()=>{}};try{return render();}finally{internals.H=old;}}
test('a newly opened row pans to its first existing tile once, preserving later user pan and all coordinates',()=>{
 const props={items:[{...item('right-side',0),position:{...item('right-side',0).position,box:{x:.85,y:.2,width:.05,height:.05}}}],evidence:[source],renderItem:()=>createElement('svg'),labelFor:(id:string)=>id};
 const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,previous=internals.H,slots:any[]=[];let cursor=0,effects:(()=>void)[]=[],tree:any;
 const draw=()=>{cursor=0;effects=[];internals.H={useState:(v:any)=>{const i=cursor++;slots[i]??=v;return [slots[i],()=>{}];},useRef:(v:any)=>slots[cursor++]??={current:v},useEffect:(fn:any,deps:any[])=>{const i=cursor++;if(!slots[i]||deps.some((d,j)=>d!==slots[i][j]))effects.push(fn);slots[i]=deps;}};try{tree=PhotoLayoutBoard(props);}finally{internals.H=previous;}};
 const before=structuredClone(props.items);draw();const row=nodes(tree).find(n=>n.props?.className==='photo-layout-row-pan')!,pan={dataset:{firstPieceX:String(row.props['data-first-piece-x'])},scrollLeft:0};row.props.ref(pan);effects.forEach(f=>f());assert.equal(pan.scrollLeft,Math.max(0,row.props['data-first-piece-x']-8));
 pan.scrollLeft=321;draw();effects.forEach(f=>f());assert.equal(pan.scrollLeft,321);assert.deepEqual(props.items,before);
});

test('a tall photo keeps each inferred source row in its own horizontal pan with original IDs/boxes and no display rotation',()=>{
 const items=Array.from({length:12},(_,i)=>item('tile-'+i,i)),before=JSON.stringify(items),expected=layoutDrawingItems(items,{sourceAspectRatio:source.width!/source.height!}),tree=hooks(()=>PhotoLayoutBoard({items,evidence:[source],renderItem:id=>createElement('svg',{'data-art':id}),labelFor:id=>id}));
 const rows=nodes(tree).filter(n=>n.props?.className==='photo-layout-row-pan');assert.equal(rows.length,3);assert.equal(rows.length,expected.rows.length);
 for(let r=0;r<rows.length;r++){
  const buttons=nodes(rows[r]).filter(n=>n.props?.['data-drawing-piece']);assert.deepEqual(buttons.map(n=>n.props['data-drawing-piece']),expected.rows[r].members.map(m=>m.pieceId));
  for(const button of buttons){const tile=expected.tiles.find(t=>t.pieceId===button.props['data-drawing-piece'])!;assert.deepEqual(button.props.style,{left:tile.rect.x,top:tile.rect.y-expected.rows[r].rect.y,width:56,height:76});assert.equal(button.props.style.transform,undefined);}
  for(let i=1;i<buttons.length;i++)assert(buttons[i-1].props.style.left+56<buttons[i].props.style.left);
 }
 assert.equal(nodes(tree).filter(n=>n.props?.['data-drawing-piece']).length,12);assert.equal(JSON.stringify(items),before);
});

test('inferred Rummikub rows reuse Meld and TileFace; two-digit tile taps still select the original object',()=>{
 const tiles:RummikubTile[]=Array.from({length:8},(_,i)=>({id:'tile-'+i,kind:'number',color:'orange',number:10+i%4,face:'front',representedColor:null,representedNumber:null,evidenceIds:['photo'],region:item('tile-'+i,i).position.box,note:''}));
 const scene:RummikubScene={version:'rummikub-classic-v1',ownerId:null,coverage:'partial',groups:[],loose:tiles},before=JSON.stringify(scene);let selected='';
 const props={scene,rack:false,evidence:[source],drawingItems:tiles.map((t,i)=>item(t.id,i)),onOpenTile:(id:string)=>{selected=id;}};
 const overview=RummikubBoardView(props),photo=nodes(overview).find(n=>n.type===PhotoLayoutBoard)!;
 assert(photo);const layout=layoutDrawingItems(photo.props.items);const ids=layout.groups[0].members.map(t=>t.pieceId);
 const meld=photo.props.renderGroup(ids,photo.props.onSelect),row=meld.type(meld.props),targets=nodes(row).filter(n=>n.type==='button'&&n.props['data-drawing-piece']);assert.deepEqual(targets.map(n=>n.props['data-drawing-piece']),ids);
 targets[0].props.onClick();assert.equal(selected,ids[0]);assert.match(renderToStaticMarkup(createElement(RummikubBoardView,props)),/font-size="46"/);
 assert.equal(scene.groups.length,0,'a display hypothesis is never a saved group');assert.equal(JSON.stringify(scene),before);
});

test('unavailable/duplicate photo identities stay outside the inferred picture, preserving the existing loose-tile entry',()=>{
 const a=item('duplicate',0),b=item('missing-source',1);b.position.sourceSHA='';assert.deepEqual(visiblePhotoItems([a,a,b],[source]),[]);
 const tile:RummikubTile={id:b.pieceId,kind:'number',color:'black',number:12,face:'front',representedColor:null,representedNumber:null,evidenceIds:['photo'],region:b.position.box,note:''};
 const html=renderToStaticMarkup(createElement(RummikubBoardView,{scene:{version:'rummikub-classic-v1',ownerId:null,coverage:'partial',groups:[],loose:[tile]},rack:false,evidence:[source],drawingItems:[b],onOpenTile(){}}));
 assert.match(html,/검정 12, 1번째 타일 고치기/);assert.doesNotMatch(html,/data-drawing-piece=/);
});

test('canonical grids retain their orientation and at least 48px cell geometry instead of shrinking to phone width',async()=>{
 for(const id of ['sagrada','blokus','ticket-to-ride']){
  const board=JSON.parse(await readFile(new URL(`../public/game-art/real-boards/${id}/board.json`,import.meta.url),'utf8')),before=JSON.stringify(board),width=readableBoardWidth(board);
  const slots=board.areas.flatMap((a:any)=>a.slots);
  for(const slot of slots)assert(Math.min(slot.w,slot.h)*width/board.viewBox[2]>=48-1e-8);
  assert(width>=520);assert.equal(JSON.stringify(board),before,'scale calculation never rewrites a canonical board');
 }
});

test('canonical area navigation pans to that area without changing a placement or selecting another owner',()=>{
 const boxes=[{dataset:{areaId:'store'},getBoundingClientRect:()=>({left:420,right:468,top:180,bottom:228})},{dataset:{areaId:'store'},getBoundingClientRect:()=>({left:484,right:532,top:244,bottom:292})},{dataset:{areaId:'other'},getBoundingClientRect:()=>({left:1200,right:1248,top:0,bottom:48})}];
 let scrolled:any;const viewport={querySelectorAll:()=>boxes,getBoundingClientRect:()=>({left:20,top:30}),clientWidth:390,clientHeight:240,scrollLeft:100,scrollTop:40,scrollTo:(value:any)=>{scrolled=value;}};
 const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,old=internals.H;internals.H={useRef:()=>({current:viewport}),useEffect:()=>{}};let tree:any;
 try{tree=BoardWorkbench({width:1200,areas:[{id:'store',label:'보관'},{id:'other',label:'다른 영역'}],children:createElement('div',{'data-original-board':true})});}finally{internals.H=old;}
 const select=nodes(tree).find(n=>n.props?.['aria-label']==='판 안 영역으로 이동')!;select.props.onChange({target:{value:'store'}});
 assert.deepEqual(scrolled,{left:361,top:126,behavior:'smooth'});scrolled=undefined;select.props.onChange({target:{value:'not-present'}});assert.equal(scrolled,undefined);
});

// Hidden fields have small counters: those must not over-enlarge the active window grid.
test('readable scale uses the active field areas, preserving 48px cells without hidden counter inflation',async()=>{
 const board=JSON.parse(await readFile(new URL('../public/game-art/real-boards/sagrada/board.json',import.meta.url),'utf8'));
 const windows=board.areas.filter((a:any)=>a.id.startsWith('window-player-'));
 const width=readableBoardWidth(board,windows);assert(width<readableBoardWidth(board));
 for(const area of windows)for(const slot of area.slots){const side=Math.min(slot.w,slot.h)*width/board.viewBox[2];assert(side>=48&&side<49);}
});
