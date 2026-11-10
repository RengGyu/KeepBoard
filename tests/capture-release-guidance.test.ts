import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {catalogPacks} from '../gamepacks/catalog';
import {PhotoCaptureGuide} from '../src/PhotoCaptureGuide';
test('short framing, small-number and reflection guidance is immediately visible without expanding the game guide',()=>{
 const pack=catalogPacks.find(p=>p.id==='sagrada')!;
 const html=renderToStaticMarkup(React.createElement(PhotoCaptureGuide,{pack,areaId:'',onChange(){}}));
 const beforeDetails=html.split('<details')[0];assert.match(beforeDetails,/크게/);assert.match(beforeDetails,/작은 숫자/);assert.match(beforeDetails,/반사/);
});

test('manual camera uses existing dark/blur/reflection signals as advice, without changing the frame or consuming an automatic slot',async()=>{
 const q=await import('../src/scanQuality');
 const frame={width:3,height:3,gray:new Uint8Array(9),mean:80,contrast:30,laplacianVariance:120,darkFraction:0,brightFraction:0,fingerprint:{cells:[80],hash:[0],mean:80,aspect:1,color:[80,80,80]}};
 assert.equal(typeof (q as any).manualCaptureGuidance,'function');
 for(const [change,word] of [[{mean:10},'어두워요'],[{mean:240},'반사'],[{laplacianVariance:0},'초점']] as const){const f={...frame,...change},before=structuredClone(f);assert.match((q as any).manualCaptureGuidance(f),new RegExp(word));assert.deepEqual(f,before);}
});
