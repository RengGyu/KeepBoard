import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {register} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {recompute} from '../server/engine.ts';
import {effectiveRecognitionPack} from '../shared/recognition.ts';
import type {Assertion,GamePack,Session,SessionView} from '../shared/types.ts';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
globalThis.window={addEventListener(){},removeEventListener(){}} as unknown as Window&typeof globalThis;
globalThis.fetch=async()=>{throw new Error('No network in synthetic SSR');};
const {default:Workspace}=await import('../src/SessionWorkspace.tsx');
const {GameBoardRecord}=await import('../src/GameBoardRecord.tsx');
const fixtures:GamePack[]=JSON.parse(readFileSync('docs/game-essentials/runtime/fixture-packs.json','utf8'));
const essentials:GamePack[]=JSON.parse(readFileSync('gamepacks/generated/game-essentials.json','utf8'));
const pack=(id:string)=>fixtures.find(p=>p.id===id)??effectiveRecognitionPack(essentials.find(p=>p.id===id)!);
const players=[{id:'p1',name:'하나',color:'red'},{id:'p2',name:'두리',color:'blue'}];
function view(p:GamePack,assertions:Assertion[]=[],stage:Session['stage']='capture'):SessionView{
 const session:Session={id:'synthetic',name:'합성 보드',createdAt:'now',updatedAt:'now',gamePackId:p.id,gamePackVersion:p.version,gamePack:p,players,captureEpoch:'epoch',turnInstanceId:'turn',stage,evidence:[],assertions,preservations:[],snapshots:[],notes:{},activity:[],example:false};
 const v=recompute(session,p);v.privacy={protectedOwnerIds:[],unlockedOwnerIds:[],setupRequiredOwnerIds:[]};return v;
}
const render=(v:SessionView,ownerId?:string)=>renderToStaticMarkup(createElement(Workspace,{view:v,ownerId,busy:false,status:{configured:true,provider:'gateway',model:'synthetic'},mutate:async()=>{},onBack(){},setOwnerId:async()=>{},onToast(){}}));
const pieces=(n:number)=>Array.from({length:n},(_,i)=>({id:`p${i}`,componentId:'development',variant:null,quantity:1,label:'',anchor:'',evidenceId:null,region:null,readout:{schema:'splendor-v1',kind:'development',points:i%4,bonus:'blue',cost:{white:0,blue:0,green:i%3,red:1,black:null},requirements:null,color:null,level:1}}));

test('every populated screen keeps save, scope and the one-row reader, with turn/memo and long lists behind a disclosure',()=>{
 for(const [id,owner] of [['catan-base',undefined],['catan-base','p1'],['rummikub',undefined],['rummikub','p1'],['carcassonne',undefined],['carcassonne','p1']] as const){
  const html=render(view(pack(id)),owner);
  assert.match(html,/class="quick-save"/,`${id}/${owner}: bottom save stays reachable`);
  assert.match(html,/<details class="cw-context"><summary>(차례·메모|내 메모)<\/summary>/,`${id}/${owner}: turn and memo collapsed, editor still mounted`);
  assert.match(html,/<textarea/,`${id}/${owner}: memo input is in the DOM while collapsed`);
  assert.doesNotMatch(html,/<details class="cw-context" open/);
 }
});
test('shared and personal records are named by scope instead of a generic heading',()=>{
 for(const id of ['catan-base','carcassonne']){
  assert.match(render(view(pack(id))),/<h3>공용 기록<\/h3>/,`${id} public`);
  assert.match(render(view(pack(id)),'p1'),/<h3>하나 개인 기록<\/h3>/,`${id} personal`);
 }
 assert.doesNotMatch(render(view(pack('carcassonne'))),/<h3>게임 기록<\/h3>|이어갈 기록·보관/);
});
test('the physical storage list opens only while restoring; the reader notice is not repeated inline',()=>{
 const p=pack('carcassonne'),normal=render(view(p)),restore=render(view(p,[],'restore'));
 assert.match(normal,/<details><summary>실물 보관·복원 \d+개/);assert.match(restore,/<details open=""><summary>실물 보관·복원 \d+개/);
 assert.doesNotMatch(normal,/<p role="status"[^>]*>로컬 판독은 이번 촬영 단계/,'reader explanation lives under 읽기 설정');
});
test('a populated Splendor record shows six readable cards and opens the rest on demand',()=>{
 const p=pack('splendor');const draw=(n:number)=>renderToStaticMarkup(createElement(GameBoardRecord,{pack:p,fieldKey:'market.scene',record:{version:'game-component-record-v1',pieces:pieces(n)} as never,busy:false}));
 const many=draw(12),few=draw(5);
 assert.equal((many.match(/class="splendor-readout is-development is-compact"/g)??[]).length,6);assert.match(many,/aria-expanded="false"[^>]*>모두 보기 \(12\)/);
 assert.equal((few.match(/class="splendor-readout is-development is-compact"/g)??[]).length,5);assert.doesNotMatch(few,/모두 보기/);
 assert.match(many,/카드로 보기 · 12개/,'the count stays visible when the list is partial');
});

test('mobile photo controls collapse once a reading exists, even before a snapshot is saved',()=>{
 const p=pack('catan-base');
 const empty=render(view(p));
 assert.match(empty,/<details class="cw-mobile-photo-tools" open=""/);
 const a:Assertion={id:'read-now',field:'turn.diceTotal',value:8,status:'accepted',basis:'observation',evidenceIds:['photo'],updatedAt:'now',turnInstanceId:'turn'};
 const read=render(view(p,[a]));
 const earlierApplied=render(view(p,[{...a,basis:'user',observationReceipts:[{}] as never}]));
 assert.doesNotMatch(earlierApplied,/<details class="cw-mobile-photo-tools" open/,'previously applied readings also lead on phones');
 assert.match(read,/<details class="cw-mobile-photo-tools"><summary>/);
 assert.doesNotMatch(read,/<details class="cw-mobile-photo-tools" open/);
});
