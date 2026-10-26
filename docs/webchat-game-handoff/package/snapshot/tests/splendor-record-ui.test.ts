import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Assertion,GamePack,SessionView} from '../shared/types.ts';
import {effectiveRecognitionPack} from '../shared/recognition.ts';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
globalThis.window={addEventListener(){}} as unknown as Window&typeof globalThis;
globalThis.fetch=async()=>{throw new Error('No network in synthetic SSR');};
const {GameEssentials,splitCandidates}=await import('../src/GameEssentials.tsx');
const {GameBoardRecord}=await import('../src/GameBoardRecord.tsx');
const {SplendorFields,readoutForComponent,splendorView}=await import('../src/SplendorEditor.tsx');

const pack:GamePack=effectiveRecognitionPack(JSON.parse(readFileSync('gamepacks/generated/game-essentials.json','utf8')).find((p:GamePack)=>p.id==='splendor'));
const gems=(white:number|null,blue:number|null,green:number|null,red:number|null,black:number|null)=>({white,blue,green,red,black});
const card=(id:string,points:number,bonus:'white'|'blue'|'green'|'red'|'black',cost:ReturnType<typeof gems>)=>({id,componentId:'development',variant:null,quantity:null,label:`개발 카드, ${points}점, 긴 판독 문장 ${id}`,anchor:'',evidenceId:null,region:null,readout:{schema:'splendor-v1',kind:'development',points,bonus,cost,requirements:null,color:null,level:3}});
const record=(pieces:unknown[])=>({version:'game-component-record-v1',pieces});
const fact=(id:string,value:unknown,status:Assertion['status'],updatedAt='2026-10-22T10:00:00Z',evidenceIds:string[]=['photo-1']):Assertion=>({id,field:'market.scene',value:value as never,basis:'observation',status,evidenceIds,updatedAt});
function view(assertions:Assertion[]):SessionView{return {pack,session:{id:'synthetic',players:[],assertions,evidence:[],preservations:[],snapshots:[],notes:{}},questions:[]} as unknown as SessionView;}
const render=(assertions:Assertion[])=>renderToStaticMarkup(createElement(GameEssentials,{view:view(assertions),busy:false,mutate:async()=>{},onEvidence(){}}));

// Hand-written from cards visible in the user's photo (display fixtures, not recognition evidence).
const twelve=Array.from({length:12},(_,i)=>i%2?card(`b${i}`,3,'blue',gems(0,0,3,3,5)):card(`w${i}`,3,'white',gems(0,0,3,3,3)));

test('candidate preview shows simple cards, all 12 reachable via "모두 보기", no long label or per-card 수량 모름',()=>{
 const html=render([fact('c',record(twelve),'candidate')]);
 assert.match(html,/모두 보기 \(12\)/);assert.match(html,/aria-expanded="false"/);
 assert.equal((html.match(/class="splendor-readout is-development is-compact"/g)??[]).length,6);
 assert.match(html,/aria-label="개발 카드 3레벨, 3점, 보너스 파랑, 비용 초록 3 빨강 3 검정 5"/);
 assert.doesNotMatch(html,/수량 모름|긴 판독 문장/);
});

test('repeated reads of the same photos show the newest; ties go to the later one; other photos stay',()=>{
 const a=fact('a',null,'candidate','2026-10-22T10:00:00Z'),b=fact('b',null,'candidate','2026-10-22T10:00:00Z'),c=fact('c',null,'candidate','2026-10-22T09:00:00Z'),other=fact('o',null,'candidate','2026-10-22T08:00:00Z',['photo-2']);
 const split=splitCandidates([a,b,c,other]);
 assert.deepEqual(split.latest.map(x=>x.id),['b','o']);assert.deepEqual(split.older.map(x=>x.id),['a','c']);
 const html=render([fact('old',record(twelve.slice(0,1)),'candidate','2026-10-22T09:00:00Z'),fact('new',record(twelve.slice(1,2)),'candidate')]);
 assert.match(html,/사진에서 찾은 후보 · 1개 영역/);assert.match(html,/이전 후보 1개/);
});

test('applied record lists every card as a readable card; legacy label values are flagged, null never shown as 0',()=>{
 const legacy={id:'legacy',componentId:'development',variant:null,quantity:null,label:'개발 카드, 2점, 보너스 빨강, 비용 초록1·빨강4·검정2 판독',anchor:'',evidenceId:null,region:null};
 const unread={id:'unread',componentId:'nobles',variant:null,quantity:null,label:'귀족 타일',anchor:'',evidenceId:null,region:null};
 const html=renderToStaticMarkup(createElement(GameBoardRecord,{pack,fieldKey:'market.scene',record:record([...twelve.slice(0,2),legacy,unread]) as never,busy:false}));
 assert.match(html,/카드로 보기 · 4개/);
 // Colours the old label never mentioned stay unknown ("?"), not zero.
 assert.match(html,/2점, 보너스 빨강, 비용 흰색 개수 확인 필요 파랑 개수 확인 필요 초록 1 빨강 4 검정 2, 글에서 읽은 값 · 확인 필요/);assert.match(html,/글에서 읽음/);
 assert.match(html,/귀족 타일, 점수 확인 필요, 필요 보너스 확인 필요/);
 assert.equal(splendorView(unread as never).points,null);
});

test('dedicated inputs edit points/bonus/cost; changing the component clears an incompatible readout',()=>{
 const piece=card('x',0,'black',gems(0,null,3,0,0)) as never;
 const html=renderToStaticMarkup(createElement(SplendorFields,{piece,disabled:false,onPatch(){}}));
 assert.match(html,/aria-label="비용 초록"[^>]*value="3"/);assert.match(html,/aria-label="비용 파랑"[^>]*value=""/);assert.match(html,/aria-label="비용 흰색"[^>]*value="0"/);
 assert.match(html,/점수<input[^>]*value="0"/);assert.match(html,/보너스 보석/);
 assert.deepEqual(readoutForComponent(piece,'nobles'),{componentId:'nobles',readout:{schema:'splendor-v1',kind:'noble',points:null,bonus:null,cost:null,requirements:null,color:null,level:null}});
 assert.deepEqual(readoutForComponent(piece,'development'),{componentId:'development'});
});

test('known noble/token with unread kind stays unknown in display but opens matching inputs without mutating the stored readout',()=>{
 for(const componentId of ['nobles','chips']){
  const piece={id:'unread-'+componentId,componentId,variant:null,quantity:null,label:'원문 보존',anchor:'',evidenceId:null,region:null,readout:{schema:'splendor-v1',kind:null,points:null,bonus:null,cost:null,requirements:null,color:null,level:null}} as const,before=JSON.stringify(piece);
  assert.equal(splendorView(piece as never).kind,'unknown');const html=renderToStaticMarkup(createElement(SplendorFields,{piece:piece as never,disabled:false,onPatch(){}}));
  if(componentId==='nobles'){assert.match(html,/점수<input/);assert.match(html,/aria-label="필요 보너스 흰색"/);}else{assert.match(html,/토큰 색/);assert.match(html,/aria-label="금"/);}
  assert.doesNotMatch(html,/구성물 종류를 먼저/);assert.equal(JSON.stringify(piece),before);
 }
});
