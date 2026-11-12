import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutDrawingItems,type DrawingLayoutInput,type DrawingLayout} from '../shared/drawingLayout';
const make=(id:string,x:number,y:number,w=.045,h=.065):DrawingLayoutInput=>({assertionId:'accepted',contextKey:'public/table/one',pieceId:id,position:{space:'photo',evidenceId:'photo',sourceSHA:'a'.repeat(64),box:{x,y,width:w,height:h},rotationDegrees:null}});
const sample=()=>[0,1,2].flatMap(row=>[0,1,2,3,4].map(col=>make(`${row}-${col}`,.1+col*.065+(col>2?.12:0),.12+row*.24)));
const ids=(l:DrawingLayout)=>l.rows.map(r=>r.members.map(m=>m.pieceId));
function rotated(input:DrawingLayoutInput[],degrees:number){const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return input.map(i=>{assert(i.position.space==='photo');const b=i.position.box,x=b.x+b.width/2-.5,y=b.y+b.height/2-.5,w=(Math.abs(b.width*c)+Math.abs(b.height*s))*.65,h=(Math.abs(b.width*s)+Math.abs(b.height*c))*.65;return {...i,position:{...i.position,box:{x:(x*c-y*s)*.65+.5-w/2,y:(x*s+y*c)*.65+.5-h/2,width:w,height:h}}};});}
test('clear rows retain above/below and left/right order, source gaps, and equal art size under 30/45 degree deskew',()=>{
 const input=sample(),before=JSON.stringify(input),base=layoutDrawingItems(input);assert.deepEqual(ids(base),[0,1,2].map(r=>[0,1,2,3,4].map(c=>`${r}-${c}`)));assert.equal(base.groups.length,6);
 for(const degrees of [30,45]){const layout=layoutDrawingItems(rotated(input,degrees));assert.deepEqual(ids(layout),ids(base));assert.equal(layout.groups.length,base.groups.length);assert(Math.abs(layout.rows[0].orientationDegrees-degrees)<1e-8);}
 for(const row of base.rows){const ts=base.tiles.filter(t=>row.groupIds.includes(t.groupId));for(let i=1;i<ts.length;i++)assert(ts[i].rect.x>ts[i-1].rect.x);assert(ts.every(t=>t.rect.y===row.rect.y+12));assert(ts[3].rect.x-ts[2].rect.x>ts[1].rect.x-ts[0].rect.x,'real source gap remains visible');}
 assert(base.rows[1].rect.y>base.rows[0].rect.y);assert.equal(JSON.stringify(input),before);
});
test('same-view reference localizes every deletion to its row and keeps clear rows/order under ±0.5 percent geometry noise',()=>{
 const input=sample(),base=layoutDrawingItems(input),before=JSON.stringify(base);
 for(const removed of input){const row=base.rows.find(r=>r.members.some(m=>m.pieceId===removed.pieceId))!,next=layoutDrawingItems(input.filter(i=>i!==removed),{reference:base});assert.equal(next.rows.length,base.rows.length);for(const t of base.tiles.filter(t=>!row.members.some(m=>m.pieceId===t.pieceId)))assert.deepEqual(next.tiles.find(n=>n.pieceId===t.pieceId)!.rect,t.rect);}
 const jitter=input.map((i,n)=>{assert(i.position.space==='photo');return {...i,position:{...i.position,box:{...i.position.box,x:i.position.box.x+Math.sin(n)*.005,y:i.position.box.y+Math.cos(n)*.005}}};});assert.deepEqual(ids(layoutDrawingItems(jitter,{reference:base})),ids(base));assert.equal(JSON.stringify(base),before);
 const singleton=[make('only',.1,.1),...input.filter(i=>!i.pieceId.startsWith('0-'))],reference=layoutDrawingItems(singleton),after=layoutDrawingItems(singleton.slice(1),{reference});assert.equal(after.rows.length,reference.rows.length);assert.equal(after.rows[0].members.length,0);assert.deepEqual(after.tiles.map(t=>t.rect),reference.tiles.slice(1).map(t=>t.rect));
});
test('varied and overlapping boxes stay individual; symmetric neighbor evidence retains photo direction instead of guessing an axis',()=>{
 const input=[make('a',.1,.12,.06,.08),make('b',.15,.12,.08,.09),make('c',.23,.12,.04,.06),make('d',.31,.12,.07,.1),make('other-row',.1,.6,.12,.13)],out=layoutDrawingItems(input);assert.deepEqual(ids(out),[['a','b','c','d'],['other-row']]);assert.equal(out.tiles.length,5);assert(out.tiles.every(t=>t.rect.width===56&&t.rect.height===76));assert(out.tiles.every(t=>t.source===input.find(i=>i.pieceId===t.pieceId)!.position));
 const grid=[make('tl',.1,.1),make('tr',.2,.1),make('bl',.1,.2),make('br',.2,.2)],square=layoutDrawingItems(grid);assert(square.rows.every(r=>r.orientationBasis==='source-direction'));assert.equal(square.rows[0].orientationDegrees,0);assert.deepEqual(ids(square),[['tl','tr'],['bl','br']]);
});
test('source/context changes cannot consume another view reference or write canonical/manual placements',()=>{
 const input=sample(),reference=layoutDrawingItems(input);const other=input.map(i=>({...i,contextKey:'private/other/table',position:i.position.space==='photo'?{...i.position,evidenceId:'different'}:i.position}));const without=layoutDrawingItems(other),withRef=layoutDrawingItems(other,{reference});assert.deepEqual(withRef,without);assert.throws(()=>layoutDrawingItems(input,{sourceAspectRatio:0}),RangeError);
});
