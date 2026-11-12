import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {EarlyScanValues} from '../src/EarlyScanValues';
const sha='a'.repeat(64),view:any={pack:{runtime:{components:[{id:'dice',name:'주사위'}]}},session:{id:'session',captureEpoch:'epoch',evidence:[{id:'photo',scope:'public',captureEpoch:'epoch'}]}};
const definition:any={definitionSHA:sha,sourceSHA:sha,components:[{id:'dice',properties:[{id:'value',label:'눈',type:'integer'},{id:'flag',label:'표시',type:'boolean'}]}]};
const progress:any={jobId:'current',captureEpoch:'epoch',total:1,job:{sessionId:'session'},units:[{index:0,state:'running',timings:{providerRequestAt:1000,firstReadableItemAt:2500},preview:{version:'literal-preview-v1',provisional:true,taskId:'task',definitionSHA:sha,sourceSHA:sha,inputSHA:sha,evidenceId:'photo',captureEpoch:'epoch',ownerId:null,observations:[{ref:'one',componentId:'dice',properties:{value:{state:'observed',value:0},flag:{state:'observed',value:false},secret:{state:'unknown',value:null,reason:'unreadable'}}}]}}]};
const render=(p=progress,v=view,d=definition)=>renderToStaticMarkup(React.createElement(EarlyScanValues,{view:v,progress:p,definition:d,jobId:'current'}));
test('validated actual values render before completion, with first-value timing separate from pending whole response',()=>{
 const before=structuredClone(progress),html=render();assert.match(html,/주사위/);assert.match(html,/눈: 0/);assert.match(html,/표시: 사진 참고/);assert.match(html,/첫 미리보기 1.5초/);assert.match(html,/전체 응답 대기/);assert.doesNotMatch(html,/secret|지금까지 실물|최종 완료/);assert.deepEqual(progress,before);
 const photoPin=structuredClone(progress);photoPin.units[0].preview.sourceSHA='b'.repeat(64);photoPin.units[0].preview.inputSHA='c'.repeat(64);assert.match(render(photoPin),/눈: 0/,'photograph pins differ from the game spec SHA');
 const done=structuredClone(progress);done.units[0].timings.generationFinishedAt=6000;assert.match(render(done),/전체 응답 5.0초/);
});
test('face-only previews cannot claim first useful values and useful receipt time is distinct from screen paint',()=>{
 const p=structuredClone(progress);p.units[0].preview.observations[0].properties={face:{state:'observed',value:'back'}};
 assert.match(render(p),/필요한 값을 읽는 중/);assert.doesNotMatch(render(p),/face:|필요한 값 수신/);
 p.units[0].preview.observations[0].properties={value:{state:'observed',value:0}};p.units[0].timings.firstUsefulValueAt=3500;
 assert.match(render(p),/필요한 값 수신 2.5초/);assert.doesNotMatch(render(p),/화면 표시|첫 값 1.5초/);
});
test('preview from an old job, owner, epoch, source, definition or missing photo cannot leak into current values',()=>{
 for(const modify of [(p:any)=>p.jobId='old',(p:any)=>p.ownerId='other',(p:any)=>p.captureEpoch='old',(p:any)=>p.job.sessionId='other',(p:any)=>p.units[0].preview.ownerId='other',(p:any)=>p.units[0].preview.definitionSHA='b'.repeat(64),(p:any)=>p.units[0].preview.sourceSHA='invalid',(p:any)=>p.units[0].preview.evidenceId='other',(p:any)=>p.units[0].preview.captureEpoch='old']){
  const p=structuredClone(progress);modify(p);assert.equal(render(p),'');
 }
 assert.equal(renderToStaticMarkup(React.createElement(EarlyScanValues,{view,progress,jobId:'current'})),'');
});
