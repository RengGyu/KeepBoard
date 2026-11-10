import test from 'node:test';import assert from 'node:assert/strict';import {register} from 'node:module';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {catalogPacks} from '../gamepacks/catalog';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
globalThis.window={addEventListener(){},removeEventListener(){}} as unknown as Window&typeof globalThis;
const {default:SessionWorkspace}=await import('../src/SessionWorkspace');
test('synthetically approved drawing workspace selects Terra high and does not silently select the legacy provider while capabilities load',()=>{
 const pack={...catalogPacks.find(p=>p.id==='carcassonne')!,releaseTier:'drawing' as const},session={id:'synthetic',name:'synthetic',players:[],assertions:[],evidence:[],preservations:[],snapshots:[],notes:{},activity:[],stage:'capture',captureEpoch:'epoch'};
 const html=renderToStaticMarkup(React.createElement(SessionWorkspace,{view:{pack,session,questions:[],briefing:[],privacy:{protectedOwnerIds:[],unlockedOwnerIds:[]}} as any,busy:false,status:{configured:true,provider:'gateway',model:'legacy'},mutate:async()=>{},onBack(){},setOwnerId:async()=>{},onToast(){}}));
 assert.match(html,/<option value="terra" selected="">/);assert.doesNotMatch(html,/<option value="existing" selected="">/);
});
test('unapproved workspace stays photo-only without mounting provider controls or selecting a legacy reader',()=>{
 const pack=catalogPacks.find(p=>p.id==='carcassonne')!,session={id:'synthetic-photo',name:'photo',players:[],assertions:[],evidence:[],preservations:[],snapshots:[],notes:{},activity:[],stage:'capture',captureEpoch:'epoch'};
 const html=renderToStaticMarkup(React.createElement(SessionWorkspace,{view:{pack,session,questions:[],briefing:[],privacy:{protectedOwnerIds:[],unlockedOwnerIds:[]}} as any,busy:false,status:{configured:true,provider:'gateway',model:'legacy'},mutate:async()=>{},onBack(){},setOwnerId:async()=>{},onToast(){}}));
 assert.match(html,/사진 기록/);assert.match(html,/사진을 찍거나 추가하면 바로 보관/);assert.doesNotMatch(html,/<option value="terra"|<option value="existing"|사진 저장됨/);
});
