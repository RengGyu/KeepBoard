import test from 'node:test';import assert from 'node:assert/strict';
import type {GenericPiece} from '../shared/genericRecord';import type {RealBoard} from '../src/realBoards';
import {genericSlotCandidates,qualifiedGenericSlots,slotGeometry} from '../src/genericSlotSuggestion';
const slots=Array.from({length:12},(_,i)=>({id:String(i),x:100+(i%4)*200,y:100+Math.floor(i/4)*250,w:100,h:100}));
const board:RealBoard={gameId:'synthetic-layout',status:'complete',svg:'board.svg',viewBox:[0,0,1000,1000],areas:[{id:'cells',field:'field',label:'판',accepts:['tile'],slots}]};
const piece=(i:number,placed=false,evidenceId='photo'):GenericPiece=>{const s=slots[i],x=(s.x+50)/1000,y=(s.y+50)/1000;return{id:'piece-'+i,componentId:'tile',quantity:1,variant:null,label:'',anchor:'',evidenceId,region:{x:x*.7+.09,y:y*.8+.04,width:.02,height:.02},...(placed?{placement:{areaId:'record-area',x,y,rotation:0,layoutVariant:'slot-board-v1:base'}}:{})};};
test('common registration uses existing frame-tagged placements and unique same-photo slots without overwriting them',()=>{
 const pieces=[...slots.slice(0,8).map((_,i)=>piece(i,true)),piece(10)],before=structuredClone(pieces);
 assert.deepEqual(genericSlotCandidates(board,'field',pieces,'record-area').map(r=>[r.id,r.placement.x,r.placement.y]),[['piece-10',.55,.65]]);assert.deepEqual(pieces,before);
 const competition=[...pieces,{...piece(10),id:'other'}];assert.deepEqual(genericSlotCandidates(board,'field',competition,'record-area'),[]);
 assert.deepEqual(genericSlotCandidates(board,'field',[...pieces.slice(0,8),piece(10,false,'other-photo')],'record-area'),[]);
 const legacy=pieces.map(p=>p.placement?{...p,placement:{...p.placement,layoutVariant:undefined}}:p);assert.deepEqual(genericSlotCandidates(board,'field',legacy,'record-area'),[]);
});
test('no generic production recommendation is enabled by model agreement or synthetic consistency alone',()=>{
 const pieces=[...slots.slice(0,8).map((_,i)=>piece(i,true)),piece(10)];
 assert.deepEqual(qualifiedGenericSlots(board.gameId,board,'field',pieces,'record-area'),[]);
 const qualified={gameId:board.gameId,field:'field',geometry:slotGeometry(board,'field'),independentTargets:20,correct:20};
 assert.equal(qualifiedGenericSlots(board.gameId,board,'field',pieces,'record-area',undefined,[qualified]).length,1);
 assert.deepEqual(qualifiedGenericSlots(board.gameId,board,'field',pieces,'record-area',undefined,[{...qualified,correct:17}]),[]);
 assert.deepEqual(qualifiedGenericSlots(board.gameId,{...board,areas:[{...board.areas[0],slots:slots.slice(1)}]},'field',pieces,'record-area',undefined,[qualified]),[]);
 const bad=pieces.map(p=>p.id==='piece-3'?{...p,placement:{...p.placement!,x:.35}}:p);assert.deepEqual(genericSlotCandidates(board,'field',bad,'record-area'),[]);
});
