/** Hand-authored adversarial cases, separate from the descriptor/fixture generator.
 * These verify data semantics and boundaries, not the correctness of all game rules or photos.
 */
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {effectiveRecognitionPack,recognitionFields} from '../shared/recognition.ts';import {runtimeBinding} from '../shared/gameEssentials.ts';
import {emptyGameReadout,setReadoutValue,validateGameReadout,readoutDefinition,gameReadoutView} from '../shared/readouts/registry.ts';
import {genericCandidateValue} from '../server/ai/generic.ts';import {validateGenericRecord} from '../shared/genericRecord.ts';
import {normalizeGameModelRecord} from '../server/ai/gameReadouts.ts';import {parseGameReadout} from '../shared/readouts/typed.ts';import {detailText} from '../shared/readouts/presentation.ts';
import {validateSplendorObservation,emptySplendorObservation} from '../shared/splendor.ts';
const packs=JSON.parse(readFileSync('gamepacks/generated/game-essentials.json','utf8'));
const pack=(id:string)=>effectiveRecognitionPack(packs.find((p:any)=>p.runtime?.source.gameId===id));
const piece=(game:string,kind:string,values:Record<string,any>)=>{const p=pack(game);let r=emptyGameReadout(p,kind);for(const[k,v]of Object.entries(values))r=setReadoutValue(p,r,k,v,{playerIds:['p1','p2']});return {id:'physical-1',componentId:kind,variant:null,quantity:1,label:'합성 · 원래 라벨',anchor:'합성 위치',evidenceId:'e1',region:{x:.1,y:.1,width:.2,height:.2},readout:r};};
const rec=(pieces:any[])=>({version:'game-component-record-v1',pieces});
const binding=(p:any,component:string)=>p.runtime.fieldBindings.find((b:any)=>b.editor==='component-catalog'&&b.componentIds.includes(component)&&['public','owner'].includes(b.visibility));
function accept(game:string,item:any){const p=pack(game);return validateGenericRecord(rec([item]) as any,p,binding(p,item.componentId).key,['e1'],{playerIds:['p1','p2']});}
test('quacks chip printed movement is not physical count, pot droplet and rat positions remain distinct',()=>{
 const c=piece('quacks','chips',{chipNumber:4,chipColor:'사진의 파랑'});c.quantity=1;
 assert.equal(accept('quacks',c).pieces[0].quantity,1);assert.equal((accept('quacks',c).pieces[0].readout as any).values.chipNumber,4);
 const p=piece('quacks','pot',{potSide:'시험관 변형면',dropPosition:'칸 A',ratPosition:'칸 B'});assert.notEqual(p.readout.values.dropPosition,p.readout.values.ratPosition);accept('quacks',p);
});
test('race point-chip denomination, quantity and inferred total are three different concepts',()=>{
 const x=piece('race-for-the-galaxy','points',{nominalValue:5,chipZone:'개인 획득'});x.quantity=2;const r:any=accept('race-for-the-galaxy',x);assert.equal(r.pieces[0].quantity,2);assert.equal(r.pieces[0].readout.values.nominalValue,5);assert(!('total'in r.pieces[0].readout.values));
 assert.throws(()=>piece('race-for-the-galaxy','points',{nominalValue:7}));
});
test('Scout retains actual array order, upper/lower values and manually confirmed active end',()=>{
 const a=piece('scout','cards',{face:'front',topNumber:9,bottomNumber:2,activeEnd:'bottom',handPosition:2});const b={...piece('scout','cards',{face:'front',topNumber:1,bottomNumber:7,activeEnd:'top',handPosition:1}),id:'physical-2',region:null};
 const p=pack('scout');const r=validateGenericRecord(rec([a,b]) as any,p,'hand.scene',['e1']);assert.deepEqual(r.pieces.map(x=>x.id),['physical-1','physical-2']);assert.equal((r.pieces[0].readout as any).values.topNumber,9);
});
test('Forest Shuffle card half is a manual semantic choice, never a duplicate physical card',()=>{
 const x=piece('forest-shuffle','cards',{face:'front',usedSection:'left'});assert.equal(accept('forest-shuffle',x).pieces.length,1);assert.throws(()=>piece('forest-shuffle','cards',{face:'front',usedSection:'invented-half'}));
});
test('SETI one physical figure changes role only after an explicit edit; no triplication',()=>{
 const p=pack('seti'),x=piece('seti','probes',{role:'probe',parentSpace:'합성 태양계 칸',owner:'p1'});const y={...x,readout:setReadoutValue(p,x.readout,'role','lander',{playerIds:['p1']})};const r=accept('seti',y);assert.equal(r.pieces.length,1);assert.equal(r.pieces[0].id,x.id);assert.equal(x.readout.values.role,'probe');assert.equal((r.pieces[0].readout as any).values.role,'lander');
});
test('Wyrmspan currencies and food types remain exact source categories; no imaginary colour/resource',()=>{
 for(const kind of ['egg','coin','meat','gold','crystal','milk'])accept('wyrmspan',piece('wyrmspan','resources',{resourceType:kind}));
 assert.throws(()=>piece('wyrmspan','resources',{resourceType:'purple-gem'}));
 const p=pack('wyrmspan'),bad=piece('wyrmspan','resources',{});bad.readout.values.resourceType='purple-gem';bad.readout.sources.resourceType='observation';
 const warnings:string[]=[],out:any=normalizeGameModelRecord(rec([bad]),p,warnings);assert.equal(out.pieces[0].readout.values.resourceType,null);assert.equal(out.pieces[0].quantity,1);assert(warnings.length);
});
test('Terraforming Mars holdings, production and typed manual cube interpretation cannot overwrite one another',()=>{
 const x=piece('terraforming-mars','boards',{stockValue:8,productionValue:-2});const r:any=accept('terraforming-mars',x);assert.equal(r.pieces[0].readout.values.stockValue,8);assert.equal(r.pieces[0].readout.values.productionValue,-2);
 const c=piece('terraforming-mars','cubes',{observedMaterial:'합성 황금색'});assert.equal(c.readout.values.nominalValue,null);assert.equal(c.quantity,1);
});
test('Hanabi own-hidden and Codenames role-limited identities cannot be acquired by changing owner context',()=>{
 for(const[g,field]of [['hanabi','hand.scene'],['codenames','key.scene']]){const p=pack(g);for(const owner of [undefined,'p1']){assert(!recognitionFields(p,owner).some(f=>f.key===field));assert.throws(()=>genericCandidateValue(rec([]),p,field,[{id:'e1',kind:'photo',scope:owner?'player':'public',ownerId:owner}] as any,owner,true));}}
 const h=piece('hanabi','cards',{face:'front',number:5});accept('hanabi',h);assert.throws(()=>piece('hanabi','cards',{face:'front',number:6}));
});
test('masking a back does not create front details; fresh AI may keep physical item with unknown detail',()=>{
 const p=pack('ticket-to-ride'),x=piece('ticket-to-ride','tickets',{});x.readout.values.face='back';x.readout.sources.face='observation';x.readout.values.printedPoints=9;x.readout.sources.printedPoints='observation';
 assert.throws(()=>validateGameReadout(x.readout,p,'tickets','e1'));
 const warnings:string[]=[],out:any=normalizeGameModelRecord(rec([x]),p,warnings);assert.equal(out.pieces[0].readout.values.printedPoints,null);assert.equal(out.pieces[0].id,x.id);assert(warnings.length);
});
test('symbol panel null, explicitly empty, known0 and absent symbol are not interchangeable',()=>{
 const p=pack('res-arcana'),x=piece('res-arcana','cards',{face:'front',storedEssences:[{symbol:'합성 기호 A',value:0},{symbol:'합성 기호 B',value:null}]});accept('res-arcana',x);
 assert.equal((x.readout.values.storedEssences as any[]).length,2);assert(!JSON.stringify(x.readout.values.storedEssences).includes('C'));
 const f=readoutDefinition(p)!.components.find(c=>c.id==='cards')!.fields.find(f=>f.id==='storedEssences')!;assert.equal(detailText(null,f),'모름');assert.equal(detailText([],f),'표시 없음');
 assert.throws(()=>setReadoutValue(p,x.readout,'storedEssences',[{symbol:'A',value:0},{symbol:'A',value:2}]));
});
test('actual player IDs validate for all player-reference fields; display is not a security authority',()=>{
 const p=pack('crew-deep-sea'),x=piece('crew-deep-sea','cards',{assignee:'p2'});assert.equal(gameReadoutView(p,x).status,'structured');
 assert.throws(()=>validateGameReadout(x.readout,p,'cards','e1',{playerIds:['p1']}));assert.throws(()=>validateGameReadout(x.readout,p,'cards','e1',{playerIds:['p1','p2'],mode:'ai'}));
});
test('wrong source/pinned version rejects new details; legacy payload does not auto-migrate',()=>{
 const p=pack('quacks'),x=piece('quacks','chips',{chipNumber:2});const modified=structuredClone(p);modified.version+='-different';assert.equal(readoutDefinition(modified),undefined);assert.throws(()=>validateGameReadout(x.readout,modified,'chips','e1'));
 const legacy={...x}as any;delete legacy.readout;const before=JSON.stringify(legacy);assert.equal(gameReadoutView(modified,legacy).status,'legacy');assert.equal(JSON.stringify(legacy),before);
 assert.throws(()=>parseGameReadout('scout',x.readout,p,'chips','e1'));
});
test('the existing Splendor discriminator and validator remain independent',()=>{
 const p=pack('splendor');const d={...emptySplendorObservation('development'),points:3};assert.deepEqual(validateSplendorObservation(d,'development'),d);
 const b=binding(p,'development');const x={id:'old-splendor',componentId:'development',variant:null,quantity:null,label:'공개 개발 카드',anchor:'',evidenceId:'e1',region:null,readout:d};const v=validateGenericRecord(rec([x])as any,p,b.key,['e1']);assert.deepEqual(v.pieces[0].readout,d);assert.equal(readoutDefinition(p),undefined);
});
