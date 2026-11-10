import {effectiveRecognitionPack} from '../shared/recognition';
import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import data from '../game-photo-definitions/spatial/index.json';import legacy from './fixtures/spatial/off-requests.json';
import {catalogPacks} from '../gamepacks/catalog';import {photoDefinition} from '../server/photoDefinitions';import {attachSpatialReading} from '../server/spatialReading';
import {compileObservationTask,type ObservationRequest} from '../shared/lightweightRecognition';import {decodeLiteralObservationPayload,buildGeminiGameBody} from '../server/ai/geminiGameReader';import {buildTerraGameBody,decodeTerraGameObservation,TERRA_HIGH_IDENTITY} from '../server/ai/terraGameReader';
import {assembleObservations} from '../server/ai/observationAssembly';import {validateGenericRecord,type GenericRecord} from '../shared/genericRecord';import {expandSpatialAddresses} from '../shared/spatialDefinition';
import {image,fixture,spatialFixture,board,placement,spatial,item,assemble} from './fixtures/spatial/builders';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

test('switch off preserves pre-extension request and Gemini/Terra-high v7 bytes for113 selected areas',()=>{
 const before=process.env.KEEPBOARD_SPATIAL_READING;delete process.env.KEEPBOARD_SPATIAL_READING;
 try{for(const row of legacy.rows){const f=fixture(row.gameId,row.areaId),req=attachSpatialReading(f.request,f.pack,f.definition);assert.equal(req,f.request);assert.equal(hash(req),row.requestSHA);assert.equal(hash(buildGeminiGameBody(req,f.definition,Buffer.from('synthetic'),'image/png')),row.geminiSHA);assert.equal(hash(buildTerraGameBody(req,f.definition,Buffer.from('synthetic'),'image/png','literal-compact-visible-instance-v7',{},TERRA_HIGH_IDENTITY)),row.terraSHA);}}finally{if(before!==undefined)process.env.KEEPBOARD_SPATIAL_READING=before;}
});
test('all31 frozen sidecars preserve canonical masked/signed/named addresses and hidden exclusions',()=>{
 assert.equal(data.definitions.length,31);assert.equal(data.definitions.filter(d=>d.status==='excluded').length,2);
 for(const d of data.definitions)for(const f of d.frames)for(const a of f.areas){const pairs=expandSpatialAddresses(a.addressing);assert.equal(pairs.length,a.addresses.length);assert.equal(new Set(pairs.map(p=>p[0])).size,pairs.length);assert.deepEqual(pairs,a.addresses.map(s=>[s.address,s.slotId]));}
 const azul=spatialFixture('azul','offer');assert(!JSON.stringify(azul.request.spatial).includes('"id":"bag"'));
 const cats=spatialFixture('isle-of-cats','boat');const a=cats.request.spatial!.frames[0].areas.find(a=>a.mode==='slot')!;assert(a.addresses.length<15*15);assert(!a.addresses.some(a=>a.address==='r0c0'));
});
test('one multicell object keeps60 degrees, partial footprint, null quantity and relations through stored record',()=>{
 const f=spatialFixture(),a=f.request.spatial!.frames[0].areas[0],cells=a.addresses.slice(0,3).map(a=>a.address);
 const raw={items:[item(),item()],spatial:spatial([board(f.request)],[placement(a.id,cells[0],{coveredAddresses:cells,coverageComplete:false,boardRotationDegrees:60,reflected:false}),placement(a.id,cells[0],{observationRef:'item-2'})],{relations:[{fromRef:'item-2',toRef:'item-1',kind:'above',basis:'observed-visible-relation',partial:true}]})};
 const {pieces}=assemble(f,raw);assert.equal(pieces.length,2);assert.equal(pieces[0].quantity,null);assert.equal(pieces[0].spatial!.placement!.boardRotationDegrees,60);assert.equal(pieces[0].spatial!.placement!.coverageComplete,false);assert.equal(pieces[0].spatial!.resolved!.covered!.length,3);assert.equal(pieces[0].placement,undefined);assert.equal(pieces[0].spatial!.relations[0].fromId,pieces[1].id);
 assert.deepEqual(validateGenericRecord(JSON.parse(JSON.stringify({version:'game-component-record-v1',pieces})),f.pack,'board.scene',[image.evidenceId]).pieces,pieces);
});
test('bad location preserves literal zero and other placements; no field or whole task failure',()=>{
 const f=spatialFixture('sagrada','round-track'),a=f.request.spatial!.frames[0].areas.find(a=>a.mode==='slot')!;
 const raw={items:[item('dice',[{id:'dieValue',valueJson:'0',unknownReason:null}]),item('dice')],spatial:spatial([board(f.request,a.id)],[placement(a.id,'nonexistent'),placement(a.id,a.addresses[0].address,{observationRef:'item-2'})])};
 const {pieces,result}=assemble(f,raw);assert.deepEqual(result.observations[0].properties.dieValue,{state:'observed',value:0});assert.equal(pieces[0].spatial!.resolved!.anchor,null);assert(pieces[1].spatial!.resolved!.anchor);assert(result.spatial!.deferred.some(d=>d.reason==='invalid-anchor-address'));
});
test('two visible personal boards remain separate unassigned player_public instances, never public board or private ownership',()=>{
 const f=spatialFixture('sagrada','window'),a=f.request.spatial!.frames[0].areas[0],raw={items:[item('dice'),item('dice')],spatial:spatial([board(f.request,a.id),board(f.request,a.id,'board-2')],[placement(a.id,a.addresses[0].address),placement(a.id,a.addresses[0].address,{observationRef:'item-2',boardInstanceRef:'board-2'})])};
 const {pieces,assembled}=assemble(f,raw);assert.equal(assembled.assertions[0].field,'__photo.public');assert.equal(assembled.assertions[0].ownerId,undefined);assert(pieces.every(p=>p.spatial!.source.partition==='player_public'&&p.spatial!.boundOwnerId===null&&!p.placement));assert.notEqual(pieces[0].spatial!.board!.ref,pieces[1].spatial!.board!.ref);assert.equal(pieces[0].spatial!.resolved!.fieldKey,'window.scene');assert.throws(()=>validateGenericRecord({version:'game-component-record-v1',pieces}as any,f.pack,'window.scene',[image.evidenceId]));
});
test('empty needs whole-cell evidence; missing cells stay absent; relation cycles defer one edge only',()=>{
 const f=spatialFixture(),a=f.request.spatial!.frames[0].areas[0],raw={items:[item(),item()],spatial:spatial([board(f.request)],[placement(a.id,a.addresses[0].address)],{cellStates:[{boardInstanceRef:'board-1',areaId:a.id,address:a.addresses[1].address,state:'empty',observedObjectRefs:[],fullyVisible:false,reason:null},{boardInstanceRef:'board-1',areaId:a.id,address:a.addresses[2].address,state:'empty',observedObjectRefs:[],fullyVisible:true,reason:null}],relations:[{fromRef:'item-1',toRef:'item-2',kind:'before',basis:'observed-visible-relation',partial:true},{fromRef:'item-2',toRef:'item-1',kind:'before',basis:'observed-visible-relation',partial:true}]})};
 const {result}=assemble(f,raw);assert.equal(result.spatial!.cellStates.length,2);assert.equal(result.spatial!.cellStates[0].state,'unknown');assert.equal(result.spatial!.cellStates[1].state,'empty');assert.equal(result.spatial!.relations.length,1);
});
test('both native adapters request scoped spatial section; Terra v7 keeps coded literals and full spatial metadata',()=>{
 const f=spatialFixture(),a=f.request.spatial!.frames[0].areas[0],b=buildGeminiGameBody(f.request,f.definition,Buffer.from('synthetic'),'image/png'),tb=buildTerraGameBody(f.request,f.definition,Buffer.from('synthetic'),'image/png','literal-compact-visible-instance-v7',{},TERRA_HIGH_IDENTITY);
 assert(!b.contents[0].parts[0].text!.includes('hidden face, board slot,'));assert(tb.input[0].content[0].text!.includes('spatial'));assert((tb.text.format.schema as any).properties.spatial);assert.equal(tb.model,'gpt-6.1-terra');assert.equal(tb.reasoning.effort,'high');
 const kinds=f.request.allowedComponents.slice().sort(),k=kinds.indexOf('pieces'),native={status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text:JSON.stringify({v:3,items:[{k,b:[100,100,200,200],f:'f',q:null,u:'s',a:[],x:[]}],spatial:spatial([board(f.request)],[placement(a.id,a.addresses[0].address,{boardRotationDegrees:60})])})}]}]};
 const r=decodeTerraGameObservation(native,f.request,f.definition,[],'literal-compact-visible-instance-v7');assert.equal(r.raw.spatial!.placements[0].boardRotationDegrees,60);assert.deepEqual(r.hostedWire.providerResponse,native);
});

test('expected photo SHA selects the exact historical tuple member and still verifies its content hash',async()=>{
 const {selectPhotoDefinition,definitionHash}=await import('../server/photoDefinitions');const {pack,definition}=fixture();const second={...structuredClone(definition),readoutSchema:'synthetic-previous-schema'};second.definitionSHA=definitionHash(second);
 assert.deepEqual(selectPhotoDefinition(pack,[definition,second],second.definitionSHA),second);assert.deepEqual(selectPhotoDefinition(pack,[definition,second],definition.definitionSHA),definition);
 assert.throws(()=>selectPhotoDefinition(pack,[definition,{...second,readoutSchema:'corrupt'}],second.definitionSHA));assert.throws(()=>selectPhotoDefinition(pack,[definition,second],'f'.repeat(64)));
});
test('stored canonical addresses draw only on the exact pinned frame and retain sixty-degree/manual-zero distinction',async()=>{
 const {spatialView,spatialRotation}=await import('../shared/spatialPlacement');const {readFile}=await import('node:fs/promises');
 const f=spatialFixture(),a=f.request.spatial!.frames[0].areas[0],{pieces}=assemble(f,{items:[item()],spatial:spatial([board(f.request)],[placement(a.id,a.addresses[0].address,{coveredAddresses:a.addresses.slice(0,3).map(a=>a.address),boardRotationDegrees:60})])});
 const boardAsset=JSON.parse(await readFile(new URL('../public/game-art/real-boards/blokus/board.json',import.meta.url),'utf8')),b={...boardAsset,assetSHA:f.request.spatial!.frames[0].sourceSHA};const p=pieces[0],q=spatialView(p,b,'board.scene');assert(q);assert.equal(q.rotation,60);assert.equal(q.covered.length,3);assert.equal(q.x,(a.addresses[0].x+a.addresses[0].w/2)/1000);
 assert.equal(spatialView(p,{...b,assetSHA:'f'.repeat(64)},'board.scene'),undefined);assert.equal(spatialView(p,b,'reserve.scene'),undefined);
 const corrected=structuredClone(p);corrected.spatial!.manualRotationDegrees=0;corrected.spatial!.manualAnchor=a.addresses[3];corrected.spatial!.manualCovered=null;assert.equal(spatialRotation(corrected),0);assert.equal(spatialView(corrected,b,'board.scene')!.anchorSlotId,a.addresses[3].slotId);assert.equal(corrected.spatial!.placement!.boardRotationDegrees,60);assert.equal(spatialRotation(p),60);
 const saved=validateGenericRecord({version:'game-component-record-v1',pieces:[corrected]}as any,f.pack,'board.scene',[image.evidenceId]);assert.equal(saved.pieces[0].spatial!.manualCovered,null);
});

test('spatial schema is pinned and known session counts select only supported areas without inventing occupancy',async()=>{
 const {canonicalJSON}=await import('../server/photoDefinitions');
 const schemaSHA=createHash('sha256').update(canonicalJSON(data.responseSchema)).digest('hex');
 for(const d of data.definitions){assert.match(d.schemaSHA256,/^[a-f0-9]{64}$/);assert.equal(d.responseSchemaSHA,schemaSHA);}
 const f=fixture('sagrada','window'),before=process.env.KEEPBOARD_SPATIAL_READING;
 try{process.env.KEEPBOARD_SPATIAL_READING='1';const two=attachSpatialReading(f.request,f.pack,f.definition,2),unknown=attachSpatialReading(f.request,f.pack,f.definition);
  assert.equal(two.spatial!.playerCount,2);assert.equal(two.spatial!.responseSchemaSHA,schemaSHA);
  assert(two.spatial!.frames.every(frame=>frame.areas.every(area=>!area.activation?.areaHiddenForPlayerCounts.includes(2))));
  assert(unknown.spatial!.frames.flatMap(f=>f.areas).length>two.spatial!.frames.flatMap(f=>f.areas).length);
  assert.equal(unknown.spatial!.playerCount,undefined);
 }finally{if(before===undefined)delete process.env.KEEPBOARD_SPATIAL_READING;else process.env.KEEPBOARD_SPATIAL_READING=before;}
});

test('ownerless visible board geometry supplies a local address without owner binding or saved registration',()=>{
 const f=spatialFixture('sagrada','window'),a=f.request.spatial!.frames[0].areas.find(a=>a.mode==='slot')!;
 const raw={items:[item('dice')],spatial:spatial([{...board(f.request,a.id),visibleIdentifier:null}],[placement(a.id,a.addresses[0].address)])};
 const before=JSON.stringify(raw),{pieces}=assemble(f,raw),s=pieces[0].spatial!;
 assert.equal(JSON.stringify(raw),before);assert.equal(s.source.ownerId,null);assert.equal(s.boundOwnerId,null);assert.equal(s.placement!.anchorAddress,a.addresses[0].address);assert.equal(s.resolved!.anchor!.slotId,a.addresses[0].slotId);
 const body=buildTerraGameBody(f.request,f.definition,Buffer.from('synthetic'),'image/png','literal-compact-visible-instance-v7',{},TERRA_HIGH_IDENTITY);
 assert.match(body.input[0].content[0].text!,/independently of assigning a person/);
 assert.equal(pieces[0].placement,undefined,'no ownerless claim is attached to a person automatically');
});

test('lazy address catalog keeps exact saved definition and board SHA pins',async()=>{
 const {loadSpatialEditAddresses}=await import('../src/spatialAddressCatalog');
 const f=spatialFixture(),a=f.request.spatial!.frames[0].areas[0],{pieces}=assemble(f,{items:[item()],spatial:spatial([board(f.request)],[placement(a.id,a.addresses[0].address)])});const s=pieces[0].spatial!;
 assert.deepEqual(await loadSpatialEditAddresses(s),a.addresses);
 assert.equal(await loadSpatialEditAddresses({...s,source:{...s.source,runtimeDefinitionSHA:'f'.repeat(64)}}),undefined);
 assert.equal(await loadSpatialEditAddresses({...s,resolved:{...s.resolved!,frameSHA:'f'.repeat(64)}}),undefined);
});
