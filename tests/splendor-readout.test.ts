import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {SplendorReadout,describeSplendor}=await import('../src/SplendorReadout.tsx');
type Props=Parameters<typeof SplendorReadout>[0];
const base:Props={kind:'development',points:null,bonus:null,cost:null,requirements:null,color:null,quantity:null};
const html=(p:Partial<Props>)=>renderToStaticMarkup(createElement(SplendorReadout,{...base,...p}));
const text=(markup:string)=>markup.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();

// Hand-written props for cards visible in the user's photo; display fixtures, not recognition evidence.
const levelThreeWhite:Props={...base,level:3,points:3,bonus:'white',cost:{green:3,red:3,black:3}};
const levelThreeBlue:Props={...base,level:3,points:3,bonus:'blue',cost:{green:3,red:3,black:5}};
const noble:Props={...base,kind:'noble',points:3,requirements:{black:3,red:3,blue:3}};

test('development card shows points, bonus gem and per-gem cost numbers; no long label, no per-card "수량 모름"',()=>{
 const markup=html(levelThreeBlue);
 assert.match(markup,/aria-label="개발 카드 3레벨, 3점, 보너스 파랑, 비용 초록 3 빨강 3 검정 5"/);
 assert.match(markup,/sr-gem is-blue/);assert.equal((markup.match(/<li/g)??[]).length,3);
 assert.equal(text(markup),'3 점 ••• 3 3 5');
 assert.doesNotMatch(markup,/수량|판독|확인 필요/);
 assert.match(html(levelThreeWhite),/보너스 흰색, 비용 초록 3 빨강 3 검정 3/);
});

test('noble requirements are labelled as owned bonuses, distinct from cost',()=>{
 const markup=html(noble);
 assert.match(markup,/필요 보너스/);assert.match(markup,/sr-counts is-need/);assert.doesNotMatch(markup,/is-cost/);
 assert.match(describeSplendor(noble),/귀족 타일, 3점, 필요 보너스 파랑 3 빨강 3 검정 3/);
});

test('null stays unknown and is never drawn as 0; 0 stays 0',()=>{
 const unknown=html({points:null,bonus:null,cost:{red:null,green:2}});
 assert.match(unknown,/개발 카드, 비용 초록 2, 사진 참고/);
 assert.match(unknown,/sr-flag">사진 참고<\/span>/);assert.doesNotMatch(text(unknown),/\b0\b/);
 assert.doesNotMatch(unknown,/\?/);
 const zero=html({points:0,bonus:'black',cost:{green:3,white:0}});
 assert.match(zero,/0점, 보너스 검정, 비용 초록 3"/);assert.match(zero,/sr-points is-zero/);assert.doesNotMatch(zero,/확인 필요<\/span>/);
 assert.match(html({points:1,bonus:'red',cost:{}}),/비용 없음/);
 assert.match(html({points:1,bonus:'red',cost:null}),/사진 참고/);
});

test('token, deck and unknown kinds',()=>{
 assert.match(html({kind:'token',color:'gold',quantity:5}),/aria-label="보석 토큰, 금, 5개"/);
 const unread=html({kind:'token',color:'white',quantity:null});
 assert.match(unread,/흰색, 사진 참고/);assert.doesNotMatch(unread,/\?/);assert.doesNotMatch(text(unread),/\b0\b/);
 assert.match(html({kind:'token',color:'green',quantity:0}),/초록, 0개/);
 const deck=html({kind:'deck',level:2,color:null});
 assert.match(deck,/카드 더미 2레벨/);assert.match(deck,/2레벨 더미/);assert.doesNotMatch(deck,/수량/);
 assert.match(html({kind:'deck',level:1,quantity:30}),/30장/);
 assert.match(html({kind:'unknown'}),/구성물, 사진 참고/);
});
