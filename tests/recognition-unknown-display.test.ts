import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {catalogPacks} from '../gamepacks/catalog.ts';
import {emptyGameReadout,setReadoutValue} from '../shared/readouts/registry.ts';

register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {GameDetailReadout}=await import('../src/readouts/GameDetailReadout.tsx');
const {GapNote}=await import('../src/GapNote.tsx');
const {SplendorReadout}=await import('../src/SplendorReadout.tsx');
const pack=catalogPacks.find(p=>p.id==='carcassonne')!;
const base={id:'tile',componentId:'tiles',variant:null,quantity:null,label:'',anchor:'',evidenceId:null,region:null};
const readout=emptyGameReadout(pack,'tiles');

test('unknown structured detail uses a photo reference while a read value, including zero, remains unchanged',()=>{
 const unknown=renderToStaticMarkup(React.createElement(GameDetailReadout,{pack,piece:{...base,readout},compact:true}));
 assert.match(unknown,/사진 참고/);assert.doesNotMatch(unknown,/\?/);
 const filled=setReadoutValue(pack,setReadoutValue(pack,readout,'face','front'),'shields',0);
 const known=renderToStaticMarkup(React.createElement(GameDetailReadout,{pack,piece:{...base,readout:filled},compact:true}));
 assert.match(known,/>0</);
 const readTwo=setReadoutValue(pack,setReadoutValue(pack,readout,'face','front'),'shields',2);
 assert.match(renderToStaticMarkup(React.createElement(GameDetailReadout,{pack,piece:{...base,readout:readTwo},compact:true})),/>2</);
});

test('unread gap is informational and disappears without requesting confirmation',()=>{
 const gaps=[{property:null,reason:'quantity' as const}];
 const unknown=renderToStaticMarkup(React.createElement(GapNote,{pack,piece:base,gaps}));
 assert.match(unknown,/사진 참고/);
 assert.doesNotMatch(unknown,/확인 필요/);
 const known=renderToStaticMarkup(React.createElement(GapNote,{pack,piece:{...base,quantity:0},gaps}));
 assert.equal(known,'');
});

test('Splendor unread attributes use one photo reference and a read value is never replaced by a guess',()=>{
 const props={kind:'development' as const,points:null,bonus:null,cost:{green:2,red:null},requirements:null,color:null,quantity:1};
 const unknown=renderToStaticMarkup(React.createElement(SplendorReadout,props));
 assert.match(unknown,/사진 참고/);assert.doesNotMatch(unknown,/\?/);
 assert.match(unknown,/초록 2/);
 assert.doesNotMatch(unknown,/확인 필요/);
 const known=renderToStaticMarkup(React.createElement(SplendorReadout,{...props,points:0}));
 assert.match(known,/0점/);
});
