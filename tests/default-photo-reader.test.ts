import test from 'node:test';import assert from 'node:assert/strict';import {register} from 'node:module';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {catalogPacks} from '../gamepacks/catalog';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
globalThis.window={addEventListener(){},removeEventListener(){}} as unknown as Window&typeof globalThis;
const {default:SessionWorkspace}=await import('../src/SessionWorkspace');
test('new workspace selects Gemini and does not silently select the legacy provider while capabilities load',()=>{
 const pack=catalogPacks.find(p=>p.id==='carcassonne')!,session={id:'synthetic',name:'synthetic',players:[],assertions:[],evidence:[],preservations:[],snapshots:[],notes:{},activity:[],stage:'capture',captureEpoch:'epoch'};
 const html=renderToStaticMarkup(React.createElement(SessionWorkspace,{view:{pack,session,questions:[],briefing:[],privacy:{protectedOwnerIds:[],unlockedOwnerIds:[]}} as any,busy:false,status:{configured:true,provider:'gateway',model:'legacy'},mutate:async()=>{},onBack(){},setOwnerId:async()=>{},onToast(){}}));
 assert.match(html,/<option value="gemini" selected="">/);assert.doesNotMatch(html,/<option value="existing" selected="">/);
});
