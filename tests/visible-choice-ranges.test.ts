import test from 'node:test';import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';import React from 'react';import {register} from 'node:module';
import {catalogPacks} from '../gamepacks/catalog.ts';import {componentDefinition,emptyGameReadout,setReadoutValue,validateGameReadout,type GameReadout} from '../shared/readouts/registry.ts';import {fieldOptions,quickChoice,applyQuickChoice} from '../src/quickCorrection.ts';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {GameDetailFields}=await import('../src/readouts/GameDetailFields.tsx');
const pack=catalogPacks.find(p=>p.id==='sagrada')!;
const piece=(n:number|null)=>({id:'die',componentId:'dice',quantity:null,variant:null,label:'',anchor:'',evidenceId:null,region:null,readout:setReadoutValue(pack,emptyGameReadout(pack,'dice'),'dieValue',n)});
test('source-backed correction choices offer only six physical die values without inventing a count',()=>{
 for(const id of ['sagrada','grand-austria-hotel']){const p=catalogPacks.find(p=>p.id===id)!,f=componentDefinition(p,'dice')!.fields.find(f=>f.id==='dieValue')!;assert.deepEqual(fieldOptions(f)!.map(o=>o.value),[1,2,3,4,5,6]);}
 const unknown=piece(null),choice=quickChoice(pack,unknown,['dice'])!;assert.equal(choice.fieldId,'dieValue');const patch=applyQuickChoice(pack,unknown,'dieValue',6);assert.equal((patch.readout as GameReadout).values.dieValue,6);assert.equal(unknown.readout.values.dieValue,null);assert.equal(unknown.quantity,null);
});
test('legacy out-of-recommended-range literals remain valid, visible and unchanged until a deliberate edit',()=>{
 const p=piece(0);assert.equal(validateGameReadout(p.readout,pack,'dice',null).values.dieValue,0);assert.equal(quickChoice(pack,p,['dice']),null);
 const html=renderToStaticMarkup(React.createElement(GameDetailFields,{pack,piece:p,record:{version:'game-component-record-v1',pieces:[p]},players:[],disabled:false,onPatch(){throw Error('render may not write');}}));assert.match(html,/<output[^>]*>0<\/output>/);assert.equal(p.readout.values.dieValue,0);
 const empty=renderToStaticMarkup(React.createElement(GameDetailFields,{pack,piece:piece(null),record:{version:'game-component-record-v1',pieces:[]},players:[],disabled:false,onPatch(){}}));assert.match(empty,/윗면 눈/);assert.doesNotMatch(empty,/qp-stepper/);
});
test('six nimmt printed values and penalty alternatives do not become a pile count or forced observed values',()=>{
 const p=catalogPacks.find(p=>p.id==='six-nimmt')!,d=componentDefinition(p,'cards')!;assert.deepEqual(d.fields.find(f=>f.id==='number')!.correctionChoices,{min:1,max:104});assert.deepEqual(fieldOptions(d.fields.find(f=>f.id==='penaltyIcons')!)!.map(o=>o.value),[1,2,3,5,7]);assert.equal(emptyGameReadout(p,'cards').values.penaltyIcons,null);
});
