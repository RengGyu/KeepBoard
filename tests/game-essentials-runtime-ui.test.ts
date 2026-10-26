import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {register} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {recompute} from '../server/engine.ts';
import type {GamePack,Session} from '../shared/types.ts';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
globalThis.window={addEventListener(){}} as unknown as Window&typeof globalThis;
globalThis.fetch=async()=>{throw new Error('No network in synthetic SSR');};
const {default:Workspace}=await import('../src/SessionWorkspace.tsx');
const {CreateDialog}=await import('../src/Dialogs.tsx');
const {GamePicker}=await import('../src/GamePicker.tsx');
const {catalogSummary}=await import('../shared/gameEssentials.ts');
const packs:GamePack[]=JSON.parse(await readFile(new URL('../docs/game-essentials/runtime/fixture-packs.json',import.meta.url),'utf8'));
function session(pack:GamePack):Session{return {id:'synthetic',name:'합성 보드',createdAt:'now',updatedAt:'now',gamePackId:pack.id,gamePackVersion:pack.version,gamePack:pack,players:[{id:'p1',name:'하나',color:'red'}],captureEpoch:'epoch',turnInstanceId:'turn',stage:'capture',evidence:[],assertions:[],preservations:[],snapshots:[],notes:{},activity:[],example:false};}
function render(pack:GamePack,ownerId?:string,locked=false){const view=recompute(session(pack),pack);view.privacy={protectedOwnerIds:locked?['p1']:[],unlockedOwnerIds:[],setupRequiredOwnerIds:locked?['p1']:[]};return renderToStaticMarkup(createElement(Workspace,{view,ownerId,busy:false,status:{configured:true,provider:'gateway',model:'synthetic'},mutate:async()=>{},onBack(){},setOwnerId:async()=>{},onToast(){}}));}
test('generic UI shows its fields, physical ordered procedure, support badge; no spec text, raw JSON or Catan editor',()=>{
 const pack=packs.find(p=>p.id==='carcassonne')!,html=render(pack);assert.match(html,/成長|성장하는 지도/);assert.match(html,/구성물 추가/);assert.match(html,/다음 타일|뽑을 타일/);assert.match(html,/순서/);assert.match(html,/수동 기록/);assert.doesNotMatch(html,/명세 [0-9a-f]{10}|참고 명세|lifetime|모르면 null|각 실물 인스턴스/);assert.doesNotMatch(html,/카탄 보드 그림|올바른 JSON|예: \{&quot;wood/);
});
test('new private setup never renders owner fields or photo controls, role/own-hidden never gets content inputs',()=>{
 const ticket=packs.find(p=>p.id==='ticket-to-ride')!,locked=render(ticket,'p1',true);assert.match(locked,/개인 기록 전에 PIN을 설정/);assert.doesNotMatch(locked,/개인 사진 추가|개인 카드·티켓|구성물 추가/);
 for(const id of ['hanabi','codenames']){const html=render(packs.find(p=>p.id===id)!);assert.match(html,/내용.*입력|비밀 내용/);assert.doesNotMatch(html,/field-essential-public-key-map|field-essential-public-hand.scene/);}
});
test('game catalog create UI distinguishes assisted/manual/native support and sends a selectable edition',()=>{
 // The search and list live inside the "게임 선택" panel (mobile picker); closed, the dialog shows the chosen game and its support level.
 const catalog=packs.map(catalogSummary),html=renderToStaticMarkup(createElement(CreateDialog,{packs:catalog,onClose(){},onCreated:async()=>{}}));assert.match(html,/게임 선택/);assert.match(html,/사진 보조 인식·수동 정정/);const unknown=structuredClone(packs[0]);unknown.runtime!.source.sha256='unverified';const manual=renderToStaticMarkup(createElement(GamePicker,{packs:[catalogSummary(unknown)],value:unknown.id,onChange(){}}));assert.match(manual,/수동 기록·실물 보존/);assert.match(html,/aria-expanded="false"/);
 const rummikub=catalog.find(p=>p.id==='rummikub')!,panel=renderToStaticMarkup(createElement(GamePicker,{packs:catalog,value:rummikub.id,onChange(){},initialOpen:true}));
 assert.match(panel,/type="search"/);assert.match(panel,/게임 이름 검색/);assert.match(panel,/루미큐브/);assert.match(panel,/Classic/);assert.match(panel,/aria-selected="true"[^>]*>.*?루미큐브/);assert.match(panel,/수동 기록|전용 그림/);
});
