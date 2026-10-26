import test from 'node:test';import assert from 'node:assert/strict';
import packs from '../gamepacks/generated/game-essentials.json';
import type {GamePack,Evidence} from '../shared/types';
import {captureProfile,captureAreas,captureFields,capturePrompt,validateCaptureTarget,validateCaptureObservation,validateStaticPhotos} from '../shared/photoCapture';
import {effectiveRecognitionPack,recognitionFields} from '../shared/recognition';
import {observationPrompt} from '../server/ai/prompt';import {normalizeObservations} from '../server/ai/index';
import {emptyGameReadout,readoutDefinition} from '../shared/readouts/registry';
import {validateGenericRecord} from '../shared/genericRecord';
import {genericCandidateValue} from '../server/ai/generic';
import {normalizeGameModelRecord} from '../server/ai/gameReadouts';
const pack=(id:string)=>effectiveRecognitionPack(structuredClone((packs as unknown as GamePack[]).find(p=>p.runtime?.source.gameId===id)!));
const target=(p:GamePack,areaId:string)=>({version:1 as const,gameId:p.runtime!.source.gameId,sourceSHA:p.runtime!.source.sha256,areaId});
const photo=(p:GamePack,areaId?:string,ownerId?:string):Evidence=>({id:'synthetic-photo',url:'/synthetic.png',capturedAt:'now',captureEpoch:'epoch',scope:ownerId?'player':'public',ownerId,label:'synthetic',kind:'photo',...(areaId?{captureTarget:target(p,areaId)}:{})});
test('all120 profiles match pinned edition/source; mismatch falls back without rewriting legacy pack/photo',()=>{
 assert.equal(packs.length,120);
 for(const raw of packs as unknown as GamePack[]){const before=structuredClone(raw),p=captureProfile(raw);assert.ok(p,raw.id);assert.equal(p.sourceSHA,raw.runtime!.source.sha256);assert.deepEqual(raw,before);}
 const p=pack('splendor'),e=photo(p);p.runtime!.source.sha256='different-pinned-source';assert.equal(captureProfile(p),undefined);assert.deepEqual(captureFields(p,[e],recognitionFields(p)),recognitionFields(p));assert.equal(e.captureTarget,undefined);
});
test('public/owner area selection cannot open Hanabi own-hidden hand or Codenames role key',()=>{
 for(const [id,area] of [['hanabi','hand'],['codenames','key']])for(const owner of [undefined,'p1'])assert.throws(()=>validateCaptureTarget(target(pack(id),area),pack(id),owner));
 const p=pack('sagrada');assert(captureAreas(p).some(a=>a.id==='window'));assert(!captureAreas(p).some(a=>a.id==='private'));assert(captureAreas(p,'p1').some(a=>a.id==='private'));assert.throws(()=>validateCaptureTarget(target(p,'private'),p));
});
test('selected public player possessions use unassigned tray; only current-game selected contract reaches prompt',()=>{
 const p=pack('splendor'),e=photo(p,'player'),fields=captureFields(p,[e],recognitionFields(p));assert.deepEqual(fields.map(f=>f.key),['__photo.public']);
 const session={players:[],assertions:[]} as any,request=observationPrompt(session,p,[e]);
 assert.match(request,/__photo.public/);assert(!request.includes('reserve.scene'));assert(!request.includes('hand.scene'));assert(!request.includes('SAGRADA'));assert(!request.includes('110-game'));
 assert(!capturePrompt(p,[e]).includes('"id":"reserve"'));
 const raw={assertions:[{field:'__photo.public',ownerId:'p1',value:{version:'game-component-record-v1',pieces:[{id:'one',componentId:'chips',variant:null,quantity:null,label:'합성 토큰',anchor:'',evidenceId:e.id,region:null}]},evidenceIds:[e.id]}]};
 const out=normalizeObservations(raw,p,[e],'turn',['p1']);assert.equal(out.assertions.length,1);assert.equal(out.assertions[0].ownerId,undefined);assert.equal((out.assertions[0].value as any).pieces[0].quantity,null);
});
test('selected part rejects out-of-area field/components; legacy photo retains original supported fields',()=>{
 const p=pack('splendor'),e=photo(p,'market');assert.throws(()=>validateCaptureObservation(p,'__photo.public',{version:'game-component-record-v1',pieces:[]} as any,[e]));
 assert.throws(()=>validateCaptureObservation(p,'market.scene',{pieces:[{componentId:'chips'}]} as any,[e]));
 assert.doesNotThrow(()=>validateCaptureObservation(p,'market.scene',{pieces:[{componentId:null,quantity:null}]} as any,[e]));
 assert.deepEqual(captureFields(p,[photo(p)],recognitionFields(p)),recognitionFields(p));
 const native=pack('catan');assert.doesNotThrow(()=>validateCaptureObservation(native,'player.components.observed',{components:[{kind:'unknown',quantity:null}]} as any,[photo(native,'hand','p1')]));
});
test('manual SCOUT activeEnd/hand order are not fresh observations; typed shape stays null-filled',()=>{
 const p=pack('scout'),value=emptyGameReadout(p,'cards'),d=readoutDefinition(p)!.components.find(c=>c.id==='cards')!;
 const manual=d.fields.find(f=>f.id==='activeEnd')!;assert.equal(manual.acquisition,'manual');
 value.values.activeEnd=manual.options![0].value;value.sources.activeEnd='observation';
 assert.throws(()=>normalizeGameModelRecord({pieces:[{componentId:'cards',evidenceId:'synthetic-photo',readout:value}]},p));
});
test('private source stays owner-only and selected subset never changes accepted/raw/null/0/cost',()=>{
 const p=pack('splendor'),e=photo(p,'reserve','p1'),original=structuredClone(e);
 assert.deepEqual(captureFields(p,[e],recognitionFields(p,'p1')).map(f=>f.key),['reserve.scene']);
 assert.throws(()=>validateCaptureObservation(p,'market.scene',{pieces:[]} as any,[e]));
 const raw={version:'game-component-record-v1',pieces:[{id:'physical1',componentId:'development',variant:null,quantity:1,label:'합성 앞면',anchor:'',evidenceId:e.id,region:null,readout:{schema:'splendor-v1',kind:'development',points:0,bonus:'blue',cost:{white:null,blue:0,green:6,red:null,black:null},requirements:null,color:null,level:null}}]};
 const before=structuredClone(raw);validateCaptureObservation(p,'reserve.scene',raw as any,[e]);assert.deepEqual(raw,before);assert.deepEqual(e,original);
});
test('capture epoch alone is not multiple-photo confirmation; single legacy photo remains readable',()=>{
 const p=pack('splendor'),a=photo(p),b={...a,id:'synthetic-second'};assert.throws(()=>validateStaticPhotos([a,b]));assert.doesNotThrow(()=>validateStaticPhotos([a,b],true));assert.doesNotThrow(()=>validateStaticPhotos([a]));
});

test('fresh exact attached source ID alias is canonicalized only in the same piece/scope/epoch; stored manual provenance is unchanged',()=>{
 const p=pack('scout'),a=photo(p,undefined,'p1'),r=emptyGameReadout(p,'cards'),f=readoutDefinition(p)!.components.find(c=>c.id==='cards')!.fields.find(f=>f.acquisition==='visible'&&f.type==='text')!;
 r.values.face='front';r.sources.face='observation';r.values[f.id]='synthetic print';(r.sources as any)[f.id]=a.id;
 const raw={version:'game-component-record-v1',pieces:[{id:'original',componentId:'cards',variant:null,quantity:null,label:'synthetic',anchor:'',evidenceId:a.id,region:null,readout:r}]},before=structuredClone(raw);
 const out=genericCandidateValue(raw,p,'hand.scene',[a],'p1',true) as any;assert.equal(out.pieces[0].readout.sources[f.id],'observation');assert.deepEqual(raw,before);
 for(const bad of ['user','manual','different-source']){const value=structuredClone(raw);(value.pieces[0].readout.sources as any)[f.id]=bad;assert.throws(()=>genericCandidateValue(value,p,'hand.scene',[a],'p1',true));}
 const wrongOwner={...a,ownerId:'p2'};assert.throws(()=>genericCandidateValue(raw,p,'hand.scene',[wrongOwner],'p1',true));
 const old={...a,id:'old-source',captureEpoch:'old-epoch'},value=structuredClone(raw);value.pieces[0].evidenceId=old.id;(value.pieces[0].readout.sources as any)[f.id]=old.id;assert.throws(()=>genericCandidateValue(value,p,'hand.scene',[a,old],'p1',true));
 const other={...a,id:'other-current'};const mismatched=structuredClone(raw);(mismatched.pieces[0].readout.sources as any)[f.id]=other.id;assert.throws(()=>genericCandidateValue(mismatched,p,'hand.scene',[a,other],'p1',true));
 const manual=structuredClone(raw);manual.pieces[0].readout.sources[f.id]='user';assert.doesNotThrow(()=>validateGenericRecord(manual as any,p,'hand.scene',[a.id]));
});
test('typed JSON return example includes values/sources and separates source basis from evidence ID',()=>{
 const p=pack('scout'),request=observationPrompt({assertions:[],players:[]} as any,p,[photo(p,'hand','p1')]);assert.match(request,/REQUIRED GAME-SPECIFIC/);assert(!request.includes('new optional'));assert.match(request,/sources values are ONLY observation\|null/);assert.match(request,/"readout":\{"schema":"scout/);assert.match(request,/"values":/);assert.match(request,/"sources":/);
});
