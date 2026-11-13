import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {register} from 'node:module';
import {renderToStaticMarkup} from 'react-dom/server';
import {estimateBoardStructure} from '../shared/estimatedBoardStructure';
import {projectGenericDrawing} from '../shared/drawingProjection';
import {catalogPacks} from '../gamepacks/catalog';
import type {Assertion,Evidence} from '../shared/types';
import type {GenericPiece,GenericRecord} from '../shared/genericRecord';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {EstimatedBoardView,EstimatedPlacementControls}=await import('../src/EstimatedBoardView');
const sha='b'.repeat(64),epoch='recovery-test',evidence=[{id:'photo',kind:'photo',scope:'public',captureEpoch:epoch,width:1200,height:1200}] as Evidence[];
type Entry={id:string;kind:string;box:[number,number,number,number];area?:string;values?:Record<string,unknown>};
function fixture(gameId:string,entries:Entry[]){
 const observations=entries.map(e=>({ref:e.id,componentId:e.kind,imageIndex:0,panelRef:null,bbox:{x:e.box[0],y:e.box[1],width:e.box[2],height:e.box[3]},face:'front',quantity:1,rotationDegrees:null,properties:Object.fromEntries(Object.entries(e.values??{}).map(([key,value])=>[key,{state:'observed',value}])),referenceCandidates:[],sourceAreaId:e.area}));
 const pieces=observations.map(o=>({id:o.ref,componentId:o.componentId,variant:null,quantity:1,label:'',anchor:'',evidenceId:'photo',region:{...o.bbox},readout:{schema:gameId+'-v1',kind:o.componentId,values:entries.find(e=>e.id===o.ref)!.values??{},sources:{}}})) as GenericPiece[];
 const receipt:any={request:{scope:{ownerId:null,captureEpoch:epoch,partition:'common_public'},images:[{evidenceId:'photo',inputId:'photo',sha256:sha,transformId:null,width:1200,height:1200}],definitionSHA:sha,sourceSHA:sha,areaId:'board',taskId:'task',allowedPropertyIds:Object.fromEntries(observations.map(o=>[o.componentId,[...Object.keys(o.properties),'quantity']]))},result:{version:'lightweight-observation-v1',observations},componentRefs:Object.fromEntries(observations.map(o=>[o.ref,o.ref])),transforms:[]};
 const record:GenericRecord={version:'game-component-record-v1',pieces},a={id:'assertion',field:'__photo.public',evidenceIds:['photo'],value:record,observationReceipts:[receipt]} as unknown as Assertion;
 const items=()=>projectGenericDrawing(a,record.pieces,evidence),run=()=>estimateBoardStructure({gameId,items:items(),assertions:[a],evidence});return {a,record,pieces,receipt,items,run};
}
function observedBoard(f:ReturnType<typeof fixture>,box:[number,number,number,number],ref='observed'){
 f.receipt.result.spatial??={version:'spatial-observation-v1',boardInstances:[],placements:[],relations:[],cellStates:[],deferred:[]};
 f.receipt.result.spatial.boardInstances.push({ref,imageIndex:0,panelRef:null,sourceRegion:{x:box[0],y:box[1],width:box[2],height:box[3]},templateAreaIds:[],orientationDegrees:null});
}
const at=(s:ReturnType<typeof estimateBoardStructure>,id:string)=>s.placements.find(p=>p.pieceId===id)!;

test('one same-receipt live/observed board becomes one alias and restores both expedition sides without mutating inputs',()=>{
 const box:[number,number,number,number]=[.15,.4,.7,.15],f=fixture('lost-cities',[{id:'board',kind:'board',box},{id:'d0',kind:'cards',box:[.2,.45,.04,.04],area:'discard'},{id:'d1',kind:'cards',box:[.7,.45,.04,.04],area:'discard'},{id:'above',kind:'cards',box:[.3,.2,.04,.06],area:'expeditions',values:{suit:'blue',number:9}},{id:'below',kind:'cards',box:[.3,.7,.04,.06],area:'expeditions',values:{suit:'blue',number:2}}]);
 observedBoard(f,box);f.receipt.result.spatial.placements=[{observationRef:'d0',boardInstanceRef:'observed'},{observationRef:'d1',boardInstanceRef:'observed'}];const before=JSON.stringify(f.a),s=f.run();
 assert.equal(s.boardContexts!.length,1);assert.equal(s.boardContexts![0].anchorRef.kind,'live-piece');assert.equal(s.metrics.placed,5);assert.equal(at(s,'d0').anchorPieceId,'board');assert.equal(at(s,'above').anchorPieceId,'board');assert.notEqual(at(s,'above').groupId,at(s,'below').groupId);assert.equal(JSON.stringify(f.a),before);
});

test('board alias matching rejects duplicate live/observed candidates, conflicting bindings, and foreign images',()=>{
 const box:[number,number,number,number]=[.2,.2,.4,.4],entries:Entry[]=[{id:'board',kind:'board',box},{id:'card',kind:'cards',box:[.3,.3,.04,.04],area:'discard'}];
 const duplicateLive=fixture('lost-cities',[...entries,{id:'other',kind:'board',box}]);observedBoard(duplicateLive,box);assert.equal(duplicateLive.run().boardContexts!.length,3);assert(duplicateLive.run().unassigned.some(p=>p.pieceId==='card'));
 const duplicateObserved=fixture('lost-cities',entries);observedBoard(duplicateObserved,box);observedBoard(duplicateObserved,box,'other');assert.equal(duplicateObserved.run().boardContexts!.length,3);assert(duplicateObserved.run().unassigned.some(p=>p.pieceId==='card'));
 const conflict=fixture('lost-cities',entries);observedBoard(conflict,box);conflict.receipt.result.spatial.placements=[{observationRef:'board',boardInstanceRef:'different'}];assert.equal(conflict.run().boardContexts!.length,2);
 const direction=fixture('lost-cities',entries);observedBoard(direction,box);direction.receipt.result.observations[0].rotationDegrees=90;direction.receipt.result.spatial.boardInstances[0].orientationDegrees=0;assert.equal(direction.run().boardContexts!.length,2);
 const foreign=fixture('lost-cities',entries);observedBoard(foreign,box);foreign.receipt.request.images.push({...foreign.receipt.request.images[0],evidenceId:'elsewhere'});foreign.receipt.result.spatial.boardInstances[0].imageIndex=1;assert.equal(foreign.run().boardContexts!.length,1);
 const otherReceipt=fixture('lost-cities',entries);observedBoard(otherReceipt,box);const second=structuredClone(otherReceipt.receipt);second.request.taskId='another-task';second.result.observations=second.result.observations.filter((o:any)=>o.componentId!=='board');delete second.componentRefs.board;delete otherReceipt.receipt.result.spatial;otherReceipt.a.observationReceipts!.push(second);assert.equal(otherReceipt.run().boardContexts!.length,2,'same geometry from another receipt is not identity');
 const deleted=fixture('lost-cities',entries);observedBoard(deleted,box);deleted.record.pieces=deleted.pieces.filter(p=>p.id!=='board');assert.equal(deleted.run().boardContexts!.length,0,'deleted literal board is not resurrected by its geometric twin');
});

function transform(entries:Entry[],angle:number,dx:number,dy:number):Entry[]{
 return entries.map(e=>{const [x,y,w,h]=e.box,points=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([x,y])=>[.5+(x-.5)*Math.cos(angle)-(y-.5)*Math.sin(angle)+dx,.5+(x-.5)*Math.sin(angle)+(y-.5)*Math.cos(angle)+dy]),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return {...e,box:[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)]};});
}
test('partial card bands carry a unique supported board across colors, rotations and translation; missing-board bands remain unanchored',()=>{
 const entries:Entry[]=[{id:'board',kind:'wonder',box:[.2,.48,.26,.18]},{id:'tail',kind:'age-cards',box:[.25,.43,.08,.1],area:'city',values:{cardColor:'blue'}},{id:'middle',kind:'age-cards',box:[.25,.36,.08,.1],area:'city',values:{cardColor:'red'}},{id:'head',kind:'age-cards',box:[.25,.29,.08,.1],area:'city',values:{cardColor:'yellow'}},{id:'missing-a',kind:'age-cards',box:[.67,.3,.08,.08],area:'city'},{id:'missing-b',kind:'age-cards',box:[.67,.35,.08,.08],area:'city'},{id:'loose-back',kind:'age-cards',box:[.25,.24,.08,.1],values:{face:'back'}}];
 for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/3]){const f=fixture('seven-wonders',transform(entries,angle,.015,.02)),before=JSON.stringify(f.a),s=f.run();for(const id of ['tail','middle','head']){assert.equal(at(s,id).anchorPieceId,'board');assert.equal(at(s,id).basisByField!.anchor,'estimated');}for(const id of ['missing-a','missing-b','loose-back']){assert.equal(at(s,id).anchorPieceId,null);assert(s.unassigned.some(p=>p.pieceId===id));}assert.equal(JSON.stringify(f.a),before);}
});

test('two board contacts and tiny diagonal overlaps stay ambiguous; stage roles do not merge into a tableau band',()=>{
 const f=fixture('seven-wonders',[{id:'left',kind:'wonder',box:[.1,.35,.25,.3]},{id:'right',kind:'wonder',box:[.45,.35,.25,.3]},{id:'between',kind:'age-cards',box:[.32,.45,.16,.1],area:'city'},{id:'sliver',kind:'age-cards',box:[.69,.64,.1,.1],area:'city'},{id:'stage',kind:'age-cards',box:[.12,.6,.08,.1],area:'wonder-area'},{id:'loose',kind:'coins',box:[.36,.7,.02,.02],area:'city'}]),s=f.run();
 for(const id of ['between','sliver','loose'])assert(s.unassigned.some(p=>p.pieceId===id));assert.equal(at(s,'between').anchorCandidates!.length,2);assert.equal(at(s,'stage').areaId,'stages');assert.equal(at(s,'stage').anchorPieceId,'left');
});

test('a partially touching second board also blocks propagation from a stronger contained seed',()=>{
 const f=fixture('seven-wonders',[{id:'left',kind:'wonder',box:[.1,.4,.23,.25]},{id:'right',kind:'wonder',box:[.5,.4,.23,.25]},...Array.from({length:4},(_,i)=>({id:'band-'+i,kind:'age-cards',box:[.27+i*.055,.47,.09,.08] as [number,number,number,number],area:'city'}))]),s=f.run();
 assert(s.placements.filter(p=>p.pieceId.startsWith('band-')).every(p=>p.anchorRef===null));assert.equal(s.metrics.placed,2);
});

test('unknown read colors join only a unique same-board/side display band and never change the original values',async()=>{
 const entries:Entry[]=[{id:'board',kind:'board',box:[.15,.4,.5,.15]},{id:'d0',kind:'cards',box:[.2,.45,.04,.04],area:'discard'},{id:'d1',kind:'cards',box:[.58,.45,.04,.04],area:'discard'},{id:'known',kind:'cards',box:[.3,.6,.1,.12],area:'expeditions',values:{suit:'blue',number:9}},{id:'unknown',kind:'cards',box:[.3,.68,.1,.12],area:'expeditions',values:{suit:null,number:0}},{id:'far',kind:'cards',box:[.3,.16,.1,.12],area:'expeditions',values:{suit:null}}];
 for(const angle of [0,Math.PI/2,-Math.PI/4]){const f=fixture('lost-cities',transform(entries,angle,0,0)),before=JSON.stringify(f.a),s=f.run();assert.equal(at(s,'known').groupId,at(s,'unknown').groupId);assert.equal(at(s,'unknown').basisByField!.lane,'estimated');assert.notEqual(at(s,'unknown').groupId,at(s,'far').groupId);assert.equal(JSON.stringify(f.a),before);}
 const {inferDisplayLaneLabels}=await import('../shared/structureRelations');
 for(const second of ['red','blue'])assert.equal(inferDisplayLaneLabels([{id:'left',label:'blue'},{id:'right',label:second},{id:'unknown',label:null}],[['left','unknown'],['unknown','right']]).size,0,'two disconnected lanes compete even with equal color');
 const chain=inferDisplayLaneLabels([{id:'known',label:'blue'},{id:'one',label:null},{id:'two',label:null}],[['known','one'],['one','two']]);assert.deepEqual([...chain],[['one','blue'],['two','blue']]);
});

test('an expedition band extends past the board projection only from a supported same-role peer',()=>{
 const f=fixture('lost-cities',[{id:'board',kind:'board',box:[.15,.4,.5,.15]},{id:'d0',kind:'cards',box:[.2,.45,.04,.04],area:'discard'},{id:'d1',kind:'cards',box:[.58,.45,.04,.04],area:'discard'},...Array.from({length:3},(_,i)=>({id:'band-'+i,kind:'cards',box:[.55+i*.07,.62,.1,.1] as [number,number,number,number],area:'expeditions',values:{suit:'blue',number:9-i}})),{id:'loose',kind:'cards',box:[.76,.62,.1,.1]}]),s=f.run();
 assert(s.placements.filter(p=>p.pieceId.startsWith('band-')).every(p=>p.anchorPieceId==='board'&&p.areaId==='expeditions'));assert(s.unassigned.some(p=>p.pieceId==='loose'));assert.equal(new Set(s.placements.filter(p=>p.pieceId.startsWith('band-')).map(p=>p.groupId)).size,1);
});

test('a supported expedition peer does not erase a competing board projection',()=>{
 const f=fixture('lost-cities',[{id:'left',kind:'board',box:[.08,.15,.4,.12]},{id:'right',kind:'board',box:[.3,.35,.4,.12]},{id:'left-d0',kind:'cards',box:[.12,.18,.04,.04],area:'discard'},{id:'left-d1',kind:'cards',box:[.4,.18,.04,.04],area:'discard'},{id:'right-d0',kind:'cards',box:[.34,.38,.04,.04],area:'discard'},{id:'right-d1',kind:'cards',box:[.62,.38,.04,.04],area:'discard'},{id:'supported',kind:'cards',box:[.23,.65,.1,.1],area:'expeditions'},{id:'competing',kind:'cards',box:[.3,.65,.1,.1],area:'expeditions'}]),s=f.run();
 assert.equal(at(s,'supported').anchorPieceId,'left');assert.equal(at(s,'competing').anchorRef,null);assert.equal(at(s,'competing').anchorCandidates!.length,2);assert(s.unassigned.some(p=>p.pieceId==='competing'&&p.reason==='competing-expedition-board-projections'));
});

test('display-only lattice renders original dice with no invented anchor/placed count, preserves manual/native edits and refuses missing rows',()=>{
 const entries:Entry[]=[];for(let row=0;row<4;row++)for(let col=0;col<5;col++)if(!(row===1&&col===2))entries.push({id:`die-${row}-${col}`,kind:'dice',box:[.2+col*.1,.2+row*.1,.06,.06],area:'draft',values:{dieValue:(row+col)%6+1,dieColor:'blue'}});
 const f=fixture('sagrada',entries),before=JSON.stringify(f.a),s=f.run(),pack=catalogPacks.find(p=>p.id==='sagrada')!;
 assert.equal(s.boardContexts!.length,0);assert.equal(s.metrics.placed,0);assert.equal(s.unassigned.length,entries.length);assert(s.placements.every(p=>p.displayHypothesis==='unanchored-grid'&&p.anchorRef===null&&p.areaId==='unclassified'&&p.cell));assert(s.groups.every(g=>g.id.length<2048));
 const html=renderToStaticMarkup(React.createElement(EstimatedBoardView,{pack,structure:s,record:f.record,assertionId:f.a.id,renderPiece:p=>React.createElement('b',null,p.id),onSelect(){},busy:false}));assert.match(html,/판 미확정 표시 격자 19개 · 배치 수 제외/);assert.equal((html.match(/data-drawing-piece=/g)??[]).length,entries.length);assert.equal((html.match(/data-estimated-row=/g)??[]).length,20);assert.equal(JSON.stringify(f.a),before);
 const controls=EstimatedPlacementControls({pack,piece:f.pieces[0],record:f.record,structure:s,assertionId:f.a.id,onChange(){},busy:false}),controlsHtml=renderToStaticMarkup(controls);assert.doesNotMatch(controlsHtml,/추정 상대 자리/,'display ranks must not enter the canonical/manual slot validator');
 assert.equal(fixture('sagrada',entries.filter(e=>!e.id.startsWith('die-0-'))).run().placements.filter(p=>p.displayHypothesis).length,0);
 f.pieces[0].structureOverride={version:'estimated-structure-override-v1',areaId:'window',groupId:'user-grid',order:7,slot:20,anchorPieceId:null,attachedToPieceId:null};let next=f.run();assert.equal(at(next,f.pieces[0].id).basis,'manual');assert.equal(at(next,f.pieces[0].id).slot,20);assert.equal(next.metrics.placed,1);
 const items=f.items();items[1].position={space:'manual',areaId:'window',x:.7,y:.7,rotationDegrees:0};next=estimateBoardStructure({gameId:'sagrada',items,assertions:[f.a],evidence});assert.equal(next.retained.length,1);assert.equal(next.metrics.placed,2);
});

test('favor containment is an estimated attachment only when one tool contains it; loose, border and duplicate tools remain unknown',()=>{
 const entries:Entry[]=[{id:'tool',kind:'cards',box:[.2,.2,.25,.2],values:{cardType:'tool'}},{id:'inside',kind:'tokens',box:[.25,.25,.03,.03]},{id:'edge',kind:'tokens',box:[.44,.39,.03,.03]},{id:'loose',kind:'tokens',box:[.6,.6,.03,.03]}],f=fixture('sagrada',entries),s=f.run();assert.equal(at(s,'inside').attachedToPieceId,'tool');assert.equal(at(s,'inside').basisByField!.attachment,'estimated');for(const id of ['edge','loose'])assert.equal(at(s,id).attachedToPieceId,null);
 const duplicate=fixture('sagrada',[...entries,{...entries[0],id:'second-tool'}]).run();assert.equal(at(duplicate,'inside').attachedToPieceId,null);assert(duplicate.unassigned.some(p=>p.pieceId==='inside'));
});
