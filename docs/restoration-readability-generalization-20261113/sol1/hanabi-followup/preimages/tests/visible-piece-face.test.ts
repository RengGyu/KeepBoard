import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {register} from 'node:module';import {renderToStaticMarkup} from 'react-dom/server';
import {catalogPacks} from '../gamepacks/catalog';import {emptyGameReadout,setReadoutValue} from '../shared/readouts/registry';
import {pieceFaceValues,requestedFaceProperties} from '../src/pieceFaceValues';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {GenericPieceArt}=await import('../src/GenericPieceArt');
const fixture=(game:string,componentId:string,values:Record<string,any>)=>{const pack=catalogPacks.find(p=>p.id===game)!;let readout=emptyGameReadout(pack,componentId);for(const [id,value] of Object.entries(values))readout=setReadoutValue(pack,readout,id,value);return {pack,piece:{id:'same-id',componentId,variant:null,quantity:1,label:'',anchor:'',evidenceId:null,region:null,readout}};};
test('generic card faces visibly show actual name/color/number instead of an aria-only category picture',()=>{
 const f=fixture('lost-cities','cards',{face:'front',suit:'yellow',number:6}),before=structuredClone(f.piece),rows=pieceFaceValues(f.pack,f.piece,['suit','number','printedName']);
 assert.equal(rows.find(r=>r.id==='printedName')!.text,'?');assert(!rows.some(r=>['face','cardArea','investments'].includes(r.id)));
 const html=renderToStaticMarkup(React.createElement(GenericPieceArt,{...f,requestedPropertyIds:['suit','number','printedName']}));assert.match(html,/>6<\/strong>/);assert.match(html,/>노랑<\/strong>/);assert.match(html,/>\?<\/strong>/);assert.match(html,/#ffc935/);assert.deepEqual(f.piece,before);
 const seven=fixture('seven-wonders','age-cards',{face:'front',printedName:'APOTHECARY',cardColor:'green'});const visible=renderToStaticMarkup(React.createElement(GenericPieceArt,seven));assert.match(visible,/>APOTHECARY<\/strong>/);assert.match(visible,/>초록<\/strong>/);
});
test('requested-only unknowns retain literal null/zero and manual values; no unrequested placement/owner guesses appear',()=>{
 const f=fixture('lost-cities','cards',{face:'front',number:0,suit:null}),before=structuredClone(f.piece),rows=pieceFaceValues(f.pack,f.piece,['number','suit','cardArea']);assert.equal(rows.find(r=>r.id==='number')!.text,'0');assert.equal(rows.find(r=>r.id==='suit')!.text,'?');assert(!rows.some(r=>r.id==='cardArea'));assert.deepEqual(f.piece,before);
 const a:any={observationReceipts:[{componentRefs:{r:'same-id'},request:{allowedPropertyIds:{cards:['number','suit']},propertyApplicability:{frontOnlyPropertyIds:{}}},result:{observations:[{ref:'r',componentId:'cards',face:'front',properties:{}}]}}]};assert.deepEqual(requestedFaceProperties(a,'same-id'),['number','suit']);assert.deepEqual(requestedFaceProperties(a,'deleted'),[]);
});

test('compact artwork keeps literal color and zero readable, folds auxiliary absence, and never translates a card name as color',()=>{
 const f=fixture('lost-cities','cards',{face:'front',printedName:'Blue',suit:'blue',number:0,investments:false}),before=JSON.stringify(f.piece);
 const compact=renderToStaticMarkup(React.createElement(GenericPieceArt,{...f,compact:true,symbols:['piece-cards-card']}));
 assert.match(compact,/#piece-cards-card/);assert.match(compact,/class="is-number"[^>]*><small>.*?<\/small><strong>0<\/strong>/);assert.match(compact,/>파랑<\/strong>/);assert.match(compact,/>Blue<\/strong>/);assert(!compact.includes('>없음<'));
 const detailed=renderToStaticMarkup(React.createElement(GenericPieceArt,f));assert.match(detailed,/>없음<\/strong>/);assert.equal(JSON.stringify(f.piece),before);
 const coin=fixture('seven-wonders','coins',{observedColor:'silver',nominalValue:3}),coinBefore=JSON.stringify(coin.piece),html=renderToStaticMarkup(React.createElement(GenericPieceArt,{...coin,compact:true,symbols:['piece-coins-coin']}));assert.match(html,/>은색<\/strong>/);assert.match(html,/>3<\/strong>/);assert.match(html,/#b7c0ca/);assert.match(html,/#piece-coins-coin/);assert.equal(JSON.stringify(coin.piece),coinBefore);
});
