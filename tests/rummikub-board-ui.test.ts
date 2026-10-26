import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {recompute} from '../server/engine.ts';
import rummikubPack from '../gamepacks/rummikub.ts';
import type {Assertion,Session,Value} from '../shared/types.ts';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
globalThis.window={addEventListener(){}} as unknown as Window&typeof globalThis;
globalThis.fetch=async()=>{throw new Error('No network in synthetic SSR');};
const {default:Workspace}=await import('../src/SessionWorkspace.tsx');
const {pickRummikubSource}=await import('../src/RummikubBoard.tsx');

const tile=(id:string,color:string|null,number:number|null)=>({id,kind:'number',color,number,face:'front',representedColor:null,representedNumber:null,evidenceIds:[],region:null,note:''});
const scene=(ownerId:string|null,groups:ReturnType<typeof tile>[][])=>({version:'rummikub-classic-v1',ownerId,coverage:'unknown',groups:groups.map((tiles,i)=>({id:`${ownerId??'t'}-g${i}`,label:'',tiles})),loose:[]});
const fact=(id:string,field:string,value:unknown,ownerId?:string,status:Assertion['status']='accepted',updatedAt='2026-10-22T10:00:00Z'):Assertion=>({id,field,value:value as Value,ownerId,basis:'user',status,evidenceIds:[],updatedAt});
function render(assertions:Assertion[],ownerId?:string,protectedOwnerIds:string[]=[],extra:Partial<Session>={}){
 const session:Session={id:'synthetic',name:'합성 루미큐브',createdAt:'now',updatedAt:'now',gamePackId:rummikubPack.id,gamePackVersion:rummikubPack.version,gamePack:rummikubPack,players:[{id:'p1',name:'하나',color:'red'},{id:'p2',name:'둘',color:'blue'}],captureEpoch:'epoch',turnInstanceId:'turn',stage:'capture',evidence:[],assertions,preservations:[],snapshots:[],notes:{},activity:[],example:false,...extra};
 const view=recompute(session,rummikubPack);view.privacy={protectedOwnerIds,unlockedOwnerIds:[],setupRequiredOwnerIds:[]};
 return renderToStaticMarkup(createElement(Workspace,{view,ownerId,busy:false,status:{configured:true,provider:'gateway',model:'synthetic'},mutate:async()=>{},onBack(){},setOwnerId:async()=>{},onToast(){}}));
}

test('a newer accepted record wins over an older candidate (table overview uses the same rule)',()=>{
 const old=fact('c','table.scene',1,undefined,'candidate','2026-10-22T09:00:00Z'),now=fact('a','table.scene',2,undefined,'accepted','2026-10-22T10:00:00Z');
 assert.deepEqual(pickRummikubSource([old,now]),{accepted:now,candidate:undefined});
 const fresh=fact('n','table.scene',3,undefined,'candidate','2026-10-22T11:00:00Z');
 assert.equal(pickRummikubSource([old,now,fresh]).candidate,fresh);
});

test('public table: board overview with minimal copy, no essentials block or raw summary',()=>{
 const html=render([fact('t','table.scene',scene(null,[[tile('a','red',3),tile('b','red',4),tile('c','red',5)]]))],undefined,[],{analysisSummary:'RAW-SUMMARY red 3 4 5'});
 assert.match(html,/공용판/);assert.match(html,/aria-label="묶음 1: 빨강 3, 빨강 4, 빨강 5"/);assert.match(html,/크게 보기/);
 assert.doesNotMatch(html,/이어갈 기록·보관|RAW-SUMMARY|자동 인식|타일 후보를 읽어/);
 assert.match(render([]),/판을 찍어 주세요/);
});

test('own screen: shared table above own rack only; no PIN needed until one is set',()=>{
 const facts=[fact('t','table.scene',scene(null,[[tile('a','blue',7),tile('b','black',7)]])),fact('r1','rack.scene',scene('p1',[[tile('m','orange',9)]]),'p1'),fact('r2','rack.scene',scene('p2',[[tile('o','red',13)]]),'p2')];
 const mine=render(facts,'p1');
 assert.match(mine,/공용판으로/);assert.match(mine,/파랑 7, 검정 7/);assert.match(mine,/내 받침대/);assert.match(mine,/주황 9/);
 assert.doesNotMatch(mine,/빨강 13/,'another player rack is never in the overview');
 assert.match(mine,/비밀번호 걸기/);assert.doesNotMatch(mine,/개인 정보가 잠겨|PIN을 입력하면/);
 assert.match(render([],'p1'),/내 받침대를 찍어 주세요/);
 const locked=render(facts,'p1',['p1']);
 assert.match(locked,/개인 정보가 잠겨 있어요/);assert.doesNotMatch(locked,/주황 9/);
});

test('a stored legacy green tile is shown as-is and flagged, not recolored',()=>{
 const html=render([fact('t','table.scene',scene(null,[[tile('g','green',5)]]))]);
 assert.match(html,/초록\(색 확인 필요\) 5/);assert.match(html,/fill="#36864b"/);
});
