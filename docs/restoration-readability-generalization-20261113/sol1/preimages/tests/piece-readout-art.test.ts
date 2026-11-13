import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {register} from 'node:module';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {catalogPacks} from '../gamepacks/catalog';
import type {GenericPiece} from '../shared/genericRecord';
import {emptyGameReadout,setReadoutValue,type DetailValue} from '../shared/readouts/registry';
import {readoutDieArt} from '../src/pieceReadoutArt';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {GenericPieceArt}=await import('../src/GenericPieceArt');
const pack=(id:string)=>catalogPacks.find(p=>p.id===id)!;
const symbols=(id:string)=>[...readFileSync(`public/game-art/real-boards/${id}/pieces.svg`,'utf8').matchAll(/<symbol\s+id="([^"]+)"/g)].map(m=>m[1]);
function fixture(gameId:string,values:Record<string,DetailValue>,componentId='dice'){
 const p=pack(gameId);let readout=emptyGameReadout(p,componentId);
 for(const [key,value] of Object.entries(values))readout=setReadoutValue(p,readout,key,value);
 const piece:GenericPiece={id:'literal-die',componentId,variant:null,quantity:null,label:'unparsed label',anchor:'',evidenceId:null,region:null,readout};
 return {p,piece,symbols:symbols(gameId)};
}
function draw(f:ReturnType<typeof fixture>){return renderToStaticMarkup(React.createElement(GenericPieceArt,{pack:f.p,piece:f.piece,symbols:f.symbols}));}
test('real Sagrada symbols follow English and Korean readouts without changing stored values or provenance',()=>{
 for(const color of ['yellow','노랑']){
  const f=fixture('sagrada',{dieColor:color,dieValue:2}),before=JSON.stringify(f.piece);
  assert.match(draw(f),/#piece-dice-die-yellow-2/);
  assert.equal(JSON.stringify(f.piece),before);
 }
});
test('unknown color/face uses neutral or colored literal fallback, retaining zero and unmatched known readings',()=>{
 const knownColor=draw(fixture('sagrada',{dieColor:'노랑',dieValue:null}));
 assert.match(knownColor,/fill="#ffc935"/);assert.match(knownColor,/>\?<\/text>/);assert(!knownColor.includes('<use'));
 const unknownColor=draw(fixture('sagrada',{dieColor:null,dieValue:2}));
 assert.match(unknownColor,/fill="#d8dde5"/);assert.match(unknownColor,/>2<\/text>/);assert(!unknownColor.includes('<use'));
 for(const value of [0,7]){const html=draw(fixture('sagrada',{dieColor:'yellow',dieValue:value}));assert.match(html,new RegExp(`>${value}</text>`));assert(!html.includes('<use'));}
 assert.match(draw(fixture('sagrada',{dieColor:null,dieValue:null})),/>\?<\/text>/);
});
test('numeric die symbol grammar works across actual packs and does not assume a mixed component is a die',()=>{
 for(const id of ['grand-austria-hotel','space-base','stone-age']){
  const f=fixture(id,{observedColor:'빨강',dieValue:4});assert.match(draw(f),/#piece-dice-die-4/);assert.match(draw(f),/color:#ee6055/);
 }
 assert.match(draw(fixture('machi-koro',{observedColor:'파랑',dieValue:3})),/#piece-dice-die-blue-3/);
 const mixed=fixture('monopoly',{dieValue:4},'tokens');assert.equal(readoutDieArt(mixed.p,mixed.piece,mixed.symbols),undefined);
 const die=fixture('monopoly',{tokenType:'주사위',dieValue:4},'tokens');assert.match(draw(die),/#piece-tokens-die-4/);
});
test('explicit variants, nonnumeric dice and other component artwork retain their previous selection path',()=>{
 const manual=fixture('sagrada',{dieColor:'yellow',dieValue:2});manual.piece.variant='user-selected';
 assert.equal(readoutDieArt(manual.p,manual.piece,manual.symbols),undefined);
 const icons=fixture('king-of-tokyo',{dieSymbol:'energy'});assert.equal(readoutDieArt(icons.p,icons.piece,icons.symbols),undefined);
 const card=fixture('sagrada',{},'cards');assert.equal(readoutDieArt(card.p,card.piece,card.symbols),undefined);
});
