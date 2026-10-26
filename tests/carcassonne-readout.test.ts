import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateGenericRecord} from '../shared/genericRecord.ts';
import {effectiveRecognitionPack} from '../shared/recognition.ts';
const pack=effectiveRecognitionPack(JSON.parse(readFileSync('gamepacks/generated/game-essentials.json','utf8')).find((p:any)=>p.id==='carcassonne'));
// Hand-written boundary fixture; not an actual photographed tile or official inventory ID.
const readout={schema:'carcassonne-v1',kind:'tiles',values:{face:'front',printedName:null,city:true,road:true,monastery:false,shields:0,gridX:null,gridY:null,features:null},sources:{face:'observation',printedName:null,city:'observation',road:'observation',monastery:'observation',shields:'observation',gridX:null,gridY:null,features:null}};
const piece={id:'synthetic-tile-1',componentId:'tiles',variant:null,quantity:1,label:'합성 관측 타일',anchor:'사진 왼쪽',evidenceId:'photo-1',region:{x:0.1,y:0.2,width:0.2,height:0.2},readout};
test('new carcassonne readout survives existing GenericRecord boundary without replacing pack',()=>{
 const before=JSON.stringify(pack);
 const record={version:'game-component-record-v1',pieces:[piece]};
 assert.deepEqual(validateGenericRecord(record as any,pack,'map.scene',['photo-1']),record);
 assert.equal(JSON.stringify(pack),before);
});
import {genericCandidateValue} from '../server/ai/generic.ts';
const photo={id:'photo-1',kind:'photo',scope:'public',label:'합성 원본',ownerId:undefined} as any;
test('fresh AI cannot smuggle manual grid coordinates in a valid looking typed record',()=>{
 const p=structuredClone(piece);p.readout.values.gridX=2 as never;p.readout.sources.gridX='user' as never;
 assert.throws(()=>genericCandidateValue({version:'game-component-record-v1',pieces:[p]},pack,'map.scene',[photo],undefined,true),/수동|사진/);
});
test('strict unknown keys and wrong games are rejected; null and zero are preserved',()=>{
 for(const change of [(r:any)=>r.readout.values.shields=-1,(r:any)=>r.readout.values.shields=Infinity,(r:any)=>r.readout.values.future=1,(r:any)=>r.readout.kind='followers',(r:any)=>r.readout.schema='made-up-v1']){
  const p=structuredClone(piece);change(p);assert.throws(()=>validateGenericRecord({version:'game-component-record-v1',pieces:[p]} as any,pack,'map.scene',['photo-1']));
 }
 const p=structuredClone(piece);p.readout.values.shields=null as never;p.readout.sources.shields=null as never;p.id='synthetic-tile-unknown';
 const record=validateGenericRecord({version:'game-component-record-v1',pieces:[p,piece]} as any,pack,'map.scene',['photo-1']);
 const detail=record.pieces[0].readout;assert(detail&&'values' in detail);assert.equal(detail.values.shields,null);
});
import {emptyGameReadout,gameReadoutView,setReadoutValue,readoutForGameComponent} from '../shared/readouts/registry.ts';
import {readoutRows,inputNumber} from '../shared/readouts/presentation.ts';
import {appendGenericObservation,deduplicateGenericObservationCrops,genericObservationPrompt} from '../server/ai/generic.ts';
const rec=(pieces:any[])=>({version:'game-component-record-v1',pieces});
test('manual tile-region attachment distinguishes two fields on one tile; dangling links rejected',()=>{
 const tile=structuredClone(piece);tile.readout.values.features=[{id:'north-field',kind:'field',label:'도로 위쪽',x:null,y:null},{id:'south-field',kind:'field',label:'도로 아래쪽',x:null,y:null}] as never;tile.readout.sources.features='user' as never;
 const follower={...piece,id:'follower',componentId:'followers',region:null,readout:emptyGameReadout(pack,'followers')};
 follower.readout=setReadoutValue(pack,follower.readout,'attachedTo',{pieceId:tile.id,featureId:'south-field'});
 follower.readout=setReadoutValue(pack,follower.readout,'owner','p1',{playerIds:['p1']});
 const v=validateGenericRecord(rec([tile,follower]) as any,pack,'map.scene',['photo-1'],{playerIds:['p1']});
 assert.deepEqual(v.pieces[1].readout,follower.readout);
 assert.throws(()=>validateGenericRecord(rec([follower]) as any,pack,'map.scene',['photo-1'],{playerIds:['p1']}),/대상/);
 assert.throws(()=>validateGenericRecord(rec([tile,follower]) as any,pack,'map.scene',['photo-1'],{playerIds:['p2']}),/소유/);
 const broken=structuredClone(follower);(broken.readout.values.attachedTo as any).featureId='not-there';
 assert.throws(()=>validateGenericRecord(rec([tile,broken]) as any,pack,'map.scene',['photo-1'],{playerIds:['p1']}),/지형/);
});
test('unobserved backside, wrong source, unsupported edition, and no evidence cannot pass',()=>{
 const back=structuredClone(piece);back.readout.values.face='back';assert.throws(()=>validateGenericRecord(rec([back]) as any,pack,'map.scene',['photo-1']),/앞면/);
 for(const mod of [(p:any)=>p.runtime.source.sha256='different',(p:any)=>p.runtime.source.editionId='expansion']){
  const p=structuredClone(pack);mod(p);assert.throws(()=>validateGenericRecord(rec([piece]) as any,p,'map.scene',['photo-1']),/판본/);
 }
 assert.throws(()=>validateGenericRecord(rec([{...piece,evidenceId:null,region:null}]) as any,pack,'map.scene',[]),/근거/);
 assert.throws(()=>genericCandidateValue(rec([piece]),pack,'draw.scene',[photo],undefined,true),/허용/);
 assert.throws(()=>genericCandidateValue(rec([{...piece,evidenceId:'other-owner'}]),pack,'map.scene',[{...photo,id:'other-owner',scope:'player',ownerId:'p2'}],undefined,true),/원본|근거/);
 assert.throws(()=>genericCandidateValue(rec([{...piece,placement:{areaId:'map',x:.2,y:.3,rotation:0}}]),pack,'map.scene',[photo],undefined,true),/좌표/);
});
test('old labels, quantity, IDs, array order, crop and placement survive manual JSON roundtrip',()=>{
 const old={...piece,id:'old',label:'원label 99점 추측하지 않음',readout:undefined};delete (old as any).readout;
 const p={...piece,quantity:0,placement:{areaId:'map',x:.3,y:.4,rotation:90}};
 const v=rec([old,p]);const before=JSON.stringify(v);
 assert.equal(gameReadoutView(pack,old).status,'legacy');assert.equal(JSON.stringify(v),before);
 assert.deepEqual(validateGenericRecord(JSON.parse(before),pack,'map.scene',['photo-1']),v);
 assert(!Object.hasOwn(v.pieces[0],'readout'));
 assert.equal(readoutRows(pack,p).rows.find(r=>r.key==='shields')!.value,'0');
 assert.equal(inputNumber(''),null);assert.equal(inputNumber('0'),0);assert.throws(()=>inputNumber('1.5'));
 assert.equal((readoutForGameComponent(pack,p,'followers').readout as any).values.posture,null);
});
test('fresh AI fills only missing detail with null; does not change quantity, label or crop and preserves physically distinct copies',()=>{
 const raw={...piece,quantity:null,readout:{schema:'carcassonne-v1',kind:'tiles',values:{face:'앞면',shields:'0',city:'있음'}}};
 const warnings:string[]=[];
 const out=genericCandidateValue(rec([raw,{...raw,id:'second',region:null}]),pack,'map.scene',[photo],undefined,true,warnings) as any;
 assert.equal(out.pieces.length,2);assert.notEqual(out.pieces[0].id,piece.id);assert.notEqual(out.pieces[0].id,out.pieces[1].id);
 assert.equal(out.pieces[0].quantity,null);assert.equal(out.pieces[0].label,piece.label);assert.deepEqual(out.pieces[0].region,piece.region);
 assert.equal(out.pieces[0].readout.values.shields,0);assert.equal(out.pieces[0].readout.values.monastery,null);
 assert.equal(out.pieces[0].readout.sources.shields,'observation');
 assert.throws(()=>validateGenericRecord(rec([raw]) as any,pack,'map.scene',['photo-1']));
});
test('actual append function replaces only same-field same-photo candidates, never accepted, other photos or empty results',()=>{
 const a=(id:string,status='candidate',ids=['photo-1'])=>({id,status,field:'map.scene',evidenceIds:ids,value:rec([piece]),updatedAt:'now'} as any);
 const accepted=a('accepted','accepted'),other=a('other','candidate',['photo-2']),session={assertions:[accepted,a('old'),other]} as any;
 appendGenericObservation(session,pack,a('new'));
 assert.deepEqual(session.assertions.map((a:any)=>a.id),['accepted','other','new']);assert.equal(session.assertions[0],accepted);
 const before=JSON.stringify(session);assert.throws(()=>genericCandidateValue(rec([]),pack,'map.scene',[photo],undefined,true));assert.equal(JSON.stringify(session),before);
 const dedup=deduplicateGenericObservationCrops([a('dedicated'),{...a('tray'),field:'__photo.public',value:rec([piece,{...piece,id:'other-copy',region:{x:.4,y:.2,width:.2,height:.2}}])}]);
 assert.equal((dedup[1].value as any).pieces.length,1);
});
test('prompt contains the pinned source and manual/hidden prohibitions, but no other games payload',()=>{
 const prompt=genericObservationPrompt({players:[],assertions:[]} as any,pack,[photo]);
 assert.match(prompt,/carcassonne-v1/);assert.match(prompt,/tile\/grid placement/);assert.match(prompt,/shields/);assert.doesNotMatch(prompt,/SPLENDOR REQUIRED READOUT/);
});
import {carcassonneLayout} from '../shared/readouts/carcassonneLayout.ts';
test('grid view preserves distinct tiles and feature-bound followers, never promotes unknown positions',()=>{
 const tile=structuredClone(piece);tile.readout.values.gridX=-1 as never;tile.readout.sources.gridX='user' as never;tile.readout.values.gridY=2 as never;tile.readout.sources.gridY='user' as never;
 tile.readout.values.features=[{id:'f1',kind:'field',label:'도로 오른쪽',x:.75,y:.5}] as never;tile.readout.sources.features='user' as never;
 const follower={...piece,id:'meeple',componentId:'followers',readout:emptyGameReadout(pack,'followers')};follower.readout=setReadoutValue(pack,follower.readout,'attachedTo',{pieceId:tile.id,featureId:'f1'});
 const old={...piece,id:'unknown',readout:undefined};delete (old as any).readout;
 const record=rec([tile,follower,old,{...tile,id:'another-physical-tile'}]);const before=JSON.stringify(record);
 const result=carcassonneLayout(pack,record as any);
 assert.equal(result.tiles.length,2);assert.equal(result.tiles[0].x,-1);assert.equal(result.tiles[0].followers[0].feature?.label,'도로 오른쪽');assert(result.collisions.length===1);assert.deepEqual(result.unmappedIds,['unknown']);assert.equal(JSON.stringify(record),before);
});
