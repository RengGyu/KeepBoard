import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {normalizeObservations} from '../server/ai/index.ts';import type {Evidence,GamePack} from '../shared/types.ts';
import {recognitionCapability,effectiveRecognitionPack,recognitionFields,PHOTO_PUBLIC,PHOTO_OWNER} from '../shared/recognition.ts';
import {genericObservationPrompt} from '../server/ai/generic.ts';
const pack=(id:string)=>JSON.parse(readFileSync('gamepacks/generated/game-essentials.json','utf8')).find((p:GamePack)=>p.id===id) as GamePack;
const photo:Evidence={id:'synthetic-photo',label:'합성 사진',url:'/synthetic.png',kind:'photo',scope:'public',captureEpoch:'epoch',capturedAt:'now'};
const piece={id:'physical-one',componentId:'development',variant:null,quantity:1,label:'위쪽 공개 카드',anchor:'위쪽 둘째',evidenceId:photo.id,region:{x:.2,y:.3,width:.1,height:.2}};
test('pinned generic Splendor photo -> typed unaccepted component candidate, not Catan scene',()=>{const p=pack('splendor'),before=JSON.stringify(p);const r=normalizeObservations({assertions:[{field:'market.scene',value:{version:'game-component-record-v1',pieces:[piece]},evidenceIds:[photo.id]}]},p,[photo],'turn',[]);assert.equal(r.assertions.length,1);assert.equal(r.assertions[0].status,'candidate');assert.equal((r.assertions[0].value as any).pieces[0].componentId,'development');assert.equal(JSON.stringify(p),before);});
const record=(changes:Record<string,unknown>={})=>({version:'game-component-record-v1',pieces:[{...piece,...changes}]});
const read=(field:string,value:unknown=record(),evidence:Evidence[]=[photo])=>normalizeObservations({assertions:[{field,value,evidenceIds:evidence.map(e=>e.id)}]},pack('splendor'),evidence,'turn',['p1']);
test('all120 dispatch and source eligibility; overlays never rewrite pinned contracts and unknown source fails closed',()=>{
 const all:GamePack[]=JSON.parse(readFileSync('gamepacks/generated/game-essentials.json','utf8'));let native=0,assisted=0;
 for(const p of all){const before=JSON.stringify(p),c=recognitionCapability(p),effective=effectiveRecognitionPack(p);if(c.mode==='native'){native++;assert.equal(effective,p);}else{assert.equal(c.mode,'assisted',p.id);assisted++;assert(c.bindings.length);for(const b of c.bindings)assert.equal(b.editor,'component-catalog');assert(!c.bindings.some(b=>['physical-only','opaque-preserve'].includes(b.editor)));assert.equal(JSON.stringify(effectiveRecognitionPack(effective)),JSON.stringify(effective));}assert.equal(JSON.stringify(p),before);}
 assert.equal(native,2);assert.equal(assisted,118);const unknown=structuredClone(pack('splendor'));unknown.runtime!.source.sha256='unknown';assert.equal(recognitionCapability(unknown).mode,'manual');assert(!recognitionFields(unknown).length);
});
test('public supply remains unassigned, owner photo public holdings stay private; hidden/temporal outputs omitted',()=>{
 const p=pack('splendor'),privatePhoto={...photo,id:'own-photo',scope:'player' as const,ownerId:'p1'};
 assert.equal(read(PHOTO_PUBLIC,record({componentId:'chips'})).assertions.length,1);
 assert.equal(read('market.scene',record({componentId:'chips'})).assertions.length,0);
 assert.equal(read('player.scene',record({componentId:'chips',evidenceId:privatePhoto.id}),[privatePhoto]).assertions.length,0);
 const own=read(PHOTO_OWNER,record({componentId:'chips',evidenceId:privatePhoto.id}),[privatePhoto]);assert.equal(own.assertions.length,1);assert.equal(own.assertions[0].ownerId,'p1');
 assert(!recognitionFields(p).some(f=>f.key==='reserve.scene'));assert(recognitionFields(p,'p1').some(f=>f.key==='reserve.scene'));
 for(const field of ['decks.scene','pending','turn','prestige','record-note.bonus'])assert.equal(read(field).assertions.length,0);
});
test('invalid shape/component/variant/evidence/region/placement rejected; unknown and zero differ, identical physical copies retained',()=>{
 for(const change of [{componentId:'invented'},{variant:'invented-printed-card'},{quantity:-1},{evidenceId:'foreign'},{region:{x:.9,y:0,width:.2,height:.2}},{placement:{areaId:'market',x:.5,y:.5,rotation:0}}])assert.equal(read('market.scene',record(change)).assertions.length,0,JSON.stringify(change));
 const copies={version:'game-component-record-v1',pieces:[{...piece,id:'a',quantity:0,region:null},{...piece,id:'b',quantity:null,region:null}]};const r=read('market.scene',copies);assert.equal(r.assertions.length,1);const values=(r.assertions[0].value as any).pieces;assert.equal(values.length,2);assert.notEqual(values[0].id,values[1].id);assert.equal(values[0].quantity,0);assert.equal(values[1].quantity,null);
 assert.equal(read('market.scene',{version:'game-component-record-v1',pieces:[piece,piece]}).assertions.length,0);
 const repeat=normalizeObservations({assertions:[1,2].map(()=>({field:'market.scene',value:record(),evidenceIds:[photo.id]}))},pack('splendor'),[photo],'turn');assert.equal(repeat.assertions.length,0);
});
test('varied tile/dice/card fields share the same record contract without printed IDs or topology; prompt context excludes private facts',()=>{
 for(const id of ['blokus','sagrada','wingspan','pandemic','splendor']){const p=pack(id),b=recognitionCapability(p).bindings.find(b=>b.scope==='public')!;assert(b,id);const field=b.key,componentId=b.componentIds[0];const r=normalizeObservations({assertions:[{field,value:record({componentId,variant:null}),evidenceIds:[photo.id]}]},p,[photo],'turn');assert.equal(r.assertions.length,1,id);assert.equal((r.assertions[0].value as any).version,'game-component-record-v1');}
 const session={assertions:[{field:'reserve.scene',ownerId:'someone',status:'accepted',value:'PRIVATE-DO-NOT-SEND'}],players:[]} as any;
 const prompt=genericObservationPrompt(session,pack('splendor'),[photo]);assert(!prompt.includes('PRIVATE-DO-NOT-SEND'));assert(!prompt.includes('Existing accepted'));assert(prompt.includes('variant MUST be null'));assert(prompt.includes('explicitly confirmed as ONE paused state'));assert(prompt.includes('captureEpoch alone is not that confirmation'));
});
