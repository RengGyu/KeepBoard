import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {register} from 'node:module';import {renderToStaticMarkup} from 'react-dom/server';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {SpatialLocationSummary}=await import('../src/ScanObservationResults');
import {spatialFixture,board,placement,spatial,item,assemble} from './fixtures/spatial/builders';
test('location summary counts one normalized physical ref once and separates real losses from aliases',()=>{
 const f=spatialFixture('sagrada','window'),a=f.request.spatial!.frames[0].areas.find(a=>a.mode==='slot')!;
 const good=assemble(f,{items:[item('dice')],spatial:spatial([board(f.request,a.id)],[placement(a.id,a.addresses[0].slotId)])});
 const r:any={request:f.request,result:good.result,hostedWire:{spatial:{placements:[{observationRef:'item-1'}]}}};
 const html=renderToStaticMarkup(React.createElement(SpatialLocationSummary,{receipts:[r,r]}));assert.match(html,/位置|위치 연결 1개/);assert.match(html,/위치 미확정 0개/);assert.match(html,/같은 칸 표기 연결 1개/);assert.doesNotMatch(html,/유효하지 않은/);
 const missing=structuredClone(r);missing.request.taskId+='-missing';missing.result.spatial.placements=[];missing.result.spatial.deferred=[];
 const losses=renderToStaticMarkup(React.createElement(SpatialLocationSummary,{receipts:[r,missing,missing]}));assert.match(losses,/위치 연결 1개/);assert.match(losses,/위치 미확정 1개/);
 const noRequest=structuredClone(r);delete noRequest.request.spatial;assert.equal(renderToStaticMarkup(React.createElement(SpatialLocationSummary,{receipts:[noRequest]})),'');
});
