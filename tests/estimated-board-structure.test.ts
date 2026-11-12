import test from 'node:test';import assert from 'node:assert/strict';
import {estimateBoardStructure,estimatedBoardMetrics} from '../shared/estimatedBoardStructure';
import {validateStructureOverride} from '../shared/estimatedStructureOverride';
import {projectGenericDrawing} from '../shared/drawingProjection';
import type {Assertion,Evidence} from '../shared/types';import type {GenericPiece} from '../shared/genericRecord';
const epoch='test-epoch',sha='a'.repeat(64),evidence=[{id:'e',kind:'photo',scope:'public',captureEpoch:epoch,width:1000,height:1000}] as Evidence[];
type Entry=[string,string,number[],Record<string,unknown>?,string?];
function fixture(gameId:string,entries:Entry[],field='table.scene',id='a'){
 const observations=entries.map(([ref,componentId,b,v={},sourceAreaId])=>({ref,componentId,imageIndex:0,panelRef:null,bbox:{x:b[0],y:b[1],width:b[2],height:b[3]},face:'front',quantity:null,rotationDegrees:null,properties:Object.fromEntries(Object.entries(v).map(([k,value])=>[k,value===null?{state:'unknown',reason:'unreadable'}:{state:'observed',value}])),referenceCandidates:[],sourceAreaId}));
 const pieces=observations.map(o=>({id:o.ref,componentId:o.componentId,variant:null,quantity:0,label:'',anchor:'',evidenceId:'e',region:{...o.bbox},readout:{version:'test',values:Object.fromEntries(Object.entries(o.properties).map(([k,v]:any)=>[k,v.value??null])),sources:{}}})) as unknown as GenericPiece[];
 const request={scope:{ownerId:null,captureEpoch:epoch,partition:'common_public'},images:[{evidenceId:'e',inputId:'e',sha256:sha,transformId:null,width:1000,height:1000}],definitionSHA:sha,sourceSHA:sha,areaId:'board',taskId:id,allowedPropertyIds:Object.fromEntries(observations.map(o=>[o.componentId,[...Object.keys(o.properties),'quantity']]))};
 const a={id,field,ownerId:undefined,evidenceIds:['e'],value:{version:'game-component-record-v1',pieces},observationReceipts:[{request,result:{version:'lightweight-observation-v1',observations},componentRefs:Object.fromEntries(observations.map(o=>[o.ref,o.ref])),transforms:[]}]} as unknown as Assertion;
 const items=()=>projectGenericDrawing(a,pieces,evidence),run=()=>estimateBoardStructure({gameId,items:items(),assertions:[a],evidence});return {a,pieces,items,run};
}
const q={version:'estimated-structure-override-v1' as const,areaId:'round-track',groupId:'user-row',order:0,slot:1,anchorPieceId:null,attachedToPieceId:null};
test('LC board-local A/B preserves source display order without treating values or empty inventory as order evidence',()=>{
 const f=fixture('lost-cities',[['b','board',[.2,.35,.6,.2]],['c2','cards',[.3,.72,.05,.08],{suit:'red',number:2},'expeditions'],['c9','cards',[.3,.60,.05,.08],{suit:'red',number:9},'expeditions'],['f','cards',[.3,.2,.05,.08],{suit:'blue',number:0},'expeditions'],['discard-1','cards',[.25,.43,.04,.04],{},'discard'],['discard-2','cards',[.65,.43,.04,.04],{},'discard']]),before=JSON.stringify(f.a),r=f.run();
 assert.equal(r.groups.filter(g=>g.areaId==='expeditions').length,2);const p=(id:string)=>r.placements.find(p=>p.pieceId===id)!;assert.equal(p('c9').order,0);assert.equal(p('c2').order,1);assert.notEqual(r.groups.find(g=>g.id===p('f').groupId)!.boardSide,r.groups.find(g=>g.id===p('c2').groupId)!.boardSide);assert.equal(p('c2').orderStatus,'unknown');assert.equal(r.metrics.placed,6);assert.equal(r.areas.reduce((n,a)=>n+a.total,0),r.metrics.total);assert(r.areas.every(a=>a.total===a.placed+a.unassigned));assert.equal(JSON.stringify(f.a),before);
});
test('missing/ambiguous anchors and unavailable manual references remain visible but never placed successes',()=>{
 const f=fixture('seven-wonders',[['a','wonder',[.2,.4,.2,.2]],['b','wonder',[.6,.4,.2,.2]],['middle','age-cards',[.45,.4,.1,.1],{cardColor:'green'}],['left','age-cards',[.21,.2,.05,.08],{cardColor:'blue'}]]),r=f.run();assert(r.unassigned.some(p=>p.pieceId==='middle'));assert.equal(r.metrics.placed,2);assert(r.unassigned.some(p=>p.pieceId==='left'),'nearest ungrounded board is not membership');
 const absent=fixture('seven-wonders',[['only','age-cards',[.2,.2,.1,.1],{cardColor:'green'}]]).run();assert.equal(absent.placements[0].areaId,'unclassified');assert.equal(absent.metrics.placed,0);assert(absent.areas.some(a=>a.status==='empty'));
 f.pieces[3].structureOverride={...q,areaId:'tableau',slot:null,anchorPieceId:'deleted'};const missing=f.run();assert(missing.unassigned.some(p=>p.pieceId==='left'));assert.equal(missing.placements.find(p=>p.pieceId==='left')!.order,0);
});
test('manual per-field view may use permitted same-source anchor but cannot borrow owner/epoch/source anchors',()=>{
 const card=fixture('seven-wonders',[['card','age-cards',[.3,.2,.06,.08],{cardColor:'blue'}]],'cards','cards'),anchor=fixture('seven-wonders',[['wonder','wonder',[.2,.35,.4,.2]]],'boards','boards');
 card.pieces[0].structureOverride={...q,areaId:'tableau',slot:null,anchorPieceId:'wonder'};
 const run=()=>estimateBoardStructure({gameId:'seven-wonders',items:card.items(),assertions:[card.a],allAssertions:[card.a,anchor.a],evidence});assert.equal(run().metrics.placed,1);assert.equal(run().placements.length,1);assert.equal(run().placements[0].anchorPieceId,'wonder');
 (anchor.a.observationReceipts![0].request.scope as any).ownerId='other';anchor.a.ownerId='other';assert.equal(run().metrics.placed,0);anchor.a.ownerId=undefined;anchor.a.observationReceipts![0].request.scope.ownerId=null;anchor.a.observationReceipts![0].request.scope.captureEpoch='old';assert.equal(run().metrics.placed,0);
});
test('Sagrada retains validated window location, uses explicit favor relation and classifies unknown cards visibly',()=>{
 const f=fixture('sagrada',[['d','dice',[.2,.2,.04,.04],{dieValue:0},'window'],['t','cards',[.5,.3,.2,.2],{cardType:'tool'}],['g','cards',[.2,.6,.2,.2],{cardType:'objective'}],['u','cards',[.7,.6,.1,.15],{cardType:null}],['f','tokens',[.55,.35,.04,.04]],['loose','tokens',[.1,.1,.03,.03]]]);
 f.a.observationReceipts![0].result.spatial={relations:[{fromRef:'f',toRef:'t',kind:'on',basis:'observed-visible-relation',partial:false}],boardInstances:[],placements:[],cellStates:[],deferred:[],version:'spatial-observation-v1'};
 const items=f.items();items[0].position={space:'board',instanceKey:'already-validated',frameId:'f',frameSHA:sha,areaId:'window',anchorSlotId:'r1c1',coveredSlotIds:['r1c1'],x:.1,y:.1,rotationDegrees:null,reflected:null};
 const r=estimateBoardStructure({gameId:'sagrada',items,assertions:[f.a],evidence});assert.equal(r.retained.length,1);assert.equal(r.placements.find(p=>p.pieceId==='f')!.attachedToPieceId,'t');assert(r.unassigned.some(p=>p.pieceId==='loose'));assert(r.unassigned.some(p=>p.pieceId==='u'));assert.equal(r.metrics.placed,4);
});
test('round-track always distinguishes observed bands from printed round numbers',()=>{
 const f=fixture('sagrada',[['d1','dice',[.21,.1,.03,.03],{dieValue:5},'round-track'],['d2','dice',[.76,.1,.03,.03],{dieValue:1},'round-track']]);
 const r=f.a.observationReceipts![0];r.result.spatial={version:'spatial-observation-v1',boardInstances:[{ref:'track',imageIndex:0,panelRef:null,sourceRegion:{x:.2,y:.08,width:.6,height:.1}}],placements:[{observationRef:'d1',boardInstanceRef:'track'},{observationRef:'d2',boardInstanceRef:'track'}],relations:[],cellStates:[]} as any;
 const out=f.run();assert.deepEqual(out.placements.map(p=>p.slot),[1,2]);assert(out.placements.every(p=>p.slotBasis==='relative-band'));assert.equal(out.metrics.placed,2);delete r.result.spatial;const no=f.run();assert.deepEqual(no.placements.map(p=>p.slot),[1,2]);assert.equal(no.metrics.placed,2);assert(no.placements.every(p=>p.notes.some(n=>n.includes('인쇄 라운드번호 아님'))));assert.deepEqual(no.placements.map(p=>p.order),[0,1]);const one=fixture('sagrada',[['d','dice',[.2,.1,.03,.03],{dieValue:2},'round-track']]).run();assert.equal(one.placements[0].slot,1);assert.equal(one.placements[0].slotBasis,'relative-band');assert.equal(one.metrics.placed,1);
});
test('metrics count unique physical objects/requested applicable fields, keep zero/false, never infer correctness',()=>{
 const f=fixture('lost-cities',[['x','cards',[.1,.1,.1,.1],{number:0,investments:false,suit:null}]]),items=f.items(),placed=new Set([JSON.stringify(['a','x'])]);
 const r=estimatedBoardMetrics([...items,...items],[f.a],placed);assert.equal(r.total,1);assert.equal(r.placed,1);assert.equal(r.readKnown,3);assert.equal(r.readTotal,4);assert.equal(r.readUnknown,1);assert.equal(r.errorKnown,null);
 const absent=estimatedBoardMetrics([],[],new Set());assert.deepEqual(absent,{total:0,placed:0,readKnown:0,readTotal:0,readUnknown:0,errorKnown:null,errorUnknown:0});
});
test('manual override preserves explicit zero/order/null, rejects AI and invented owner or invalid relative slot',()=>{
 assert.doesNotThrow(()=>validateStructureOverride(q,'sagrada'));assert.throws(()=>validateStructureOverride(q,'sagrada','ai'));assert.throws(()=>validateStructureOverride({...q,slot:0},'sagrada'));assert.throws(()=>validateStructureOverride({...q,ownerId:'inferred'} as any,'sagrada'));
 const f=fixture('sagrada',[['d','dice',[.2,.2,.05,.05],{dieValue:0}]]);f.pieces[0].structureOverride={...q};assert.equal(f.run().placements[0].basis,'manual');assert.equal(f.run().placements[0].order,0);assert.equal(f.run().placements[0].slot,1);
});

test('actual generic scan fusion preserves user structure override and original region/readout across redelivery',async()=>{
 const {catalogPacks}=await import('../gamepacks/catalog'),{effectiveRecognitionPack}=await import('../shared/recognition'),{photoDefinition}=await import('../server/photoDefinitions'),{prepareScanObservation,projectScanResults}=await import('../server/scanObservation'),{decodeGeminiGameObservation}=await import('../server/ai/geminiGameReader'),{assembleObservations}=await import('../server/ai/observationAssembly');
 const sourcePack={...catalogPacks.find(p=>p.id==='sagrada')!};delete sourcePack.photoReadingPolicy;const pack=effectiveRecognitionPack(sourcePack),definition=photoDefinition(pack),photo={id:'fusion-photo',kind:'photo',scope:'public',captureEpoch:'epoch',url:'/synthetic',label:'synthetic'} as Evidence;
 const session={id:'synthetic',name:'synthetic',gamePack:pack,gamePackId:pack.id,gamePackVersion:pack.version,captureEpoch:'epoch',turnInstanceId:'turn',stage:'capture',players:[],evidence:[photo],assertions:[],notes:{},activity:[],preservations:[],snapshots:[]} as unknown as import('../shared/types').Session;
 const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=','base64'),reader:any={identity:{kind:'gemini-game-observation-v1',model:'synthetic',thinkingLevel:'LOW',mediaResolution:'MEDIA_RESOLUTION_HIGH',maxOutputTokens:32768},status:async()=>({available:true})};
 async function delivery(id:string,value:number){
  const scan=await prepareScanObservation({session,pack,evidence:[photo],selection:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'window'},taskId:id,reader,cloud:false,readImage:async()=>({data:image,mimeType:'image/png'})}),u=scan.units[0],p=u.hosted!;
  const raw=decodeGeminiGameObservation({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({items:[{kind:'dice',face:'front',quantity:1,box_1000:[200,200,300,300],attributes:[{id:'dieValue',valueJson:JSON.stringify(value),unknownReason:null},{id:'dieColor',valueJson:'"green"',unknownReason:null}]}]})}]}}]},p.request,p.definition,undefined,p.transforms),result=assembleObservations({request:p.request,result:raw,pack,definition:p.definition,turnInstanceId:'turn',reader:p.reader,transforms:p.transforms,sourceImageSHA:p.sourceImageSHA});result.observationReceipts![0].scanUnitId=u.id;result.scanBundle={plan:scan.plan,units:[{unitId:u.id,state:'completed',observationCount:1}],links:[]};return projectScanResults(session,pack,scan,[result]);
 }
 const before=await delivery('before',5);session.assertions=before.assertions;const piece=(before.assertions[0].value as any).pieces[0];piece.structureOverride={...q};const snapshot=structuredClone(piece),after=await delivery('after',2),kept=(after.assertions[0].value as any).pieces;
 assert.equal(kept.length,1);assert.equal(kept[0].id,snapshot.id);assert.deepEqual(kept[0].structureOverride,snapshot.structureOverride);assert.deepEqual(kept[0].region,snapshot.region);assert.deepEqual(kept[0].readout,snapshot.readout);
});

test('incomplete legacy receipt yields no fabricated reading denominator; visible object stays unassigned',()=>{
 const f=fixture('seven-wonders',[['x','age-cards',[.2,.2,.1,.1],{cardColor:'green'}]]);(f.a.observationReceipts as any)=[{result:{observations:[]},componentRefs:{}}];const r=f.run();assert.equal(r.metrics.readTotal,0);assert.equal(r.metrics.placed,0);assert.equal(r.metrics.total,1);assert.equal(r.areas.find(a=>a.id==='unclassified')!.total,1);assert.equal(r.unassigned.length,1);
});

test('allAssertions unknown Sagrada anchor cards never leak into another field output, counts or unassigned',()=>{
 const window=fixture('sagrada',[['window','windows',[.2,.4,.4,.3]]],'window.scene','window'),other=fixture('sagrada',[['unknown-card','cards',[.1,.1,.1,.2],{cardType:null}]],'tools.scene','tools');
 const r=estimateBoardStructure({gameId:'sagrada',items:window.items(),assertions:[window.a],allAssertions:[window.a,other.a],evidence});assert.equal(r.metrics.total,1);assert.equal(r.metrics.placed,1);assert.equal(r.placements.length,1);assert.equal(r.unassigned.length,0);assert.equal(r.areas.reduce((sum,a)=>sum+a.total,0),1);assert.equal(r.areas.find(a=>a.id==='unclassified')!.total,0);assert(r.placements.every(p=>p.pieceId==='window'));
});

test('LC diagonal board derives side from known discard line, preserves discard and exact color synonyms',()=>{
 const f=fixture('lost-cities',[['b','board',[.1,.1,.75,.75]],['d1','cards',[.2,.68,.04,.04],{suit:'red'},'discard'],['d2','cards',[.4,.48,.04,.04],{suit:'blue'},'discard'],['d3','cards',[.6,.28,.04,.04],{suit:'white'},'discard'],['n1','cards',[.5,.68,.04,.04],{suit:'blue'},'expeditions'],['n2','cards',[.7,.48,.04,.04],{suit:'파란색'},'expeditions'],['other','cards',[.2,.38,.04,.04],{suit:'blue'},'expeditions']]);
 const r=f.run(),p=(id:string)=>r.placements.find(p=>p.pieceId===id)!,g=(id:string)=>r.groups.find(g=>g.id===p(id).groupId)!;assert.equal(p('d1').areaId,'discard');assert.equal(p('d2').areaId,'discard');assert.equal(p('d3').areaId,'discard');assert.equal(g('n1').boardSide,g('n2').boardSide);assert.notEqual(g('n1').boardSide,g('other').boardSide);assert.equal(p('n1').groupId,p('n2').groupId);assert(Math.abs(g('n1').axis!.y)>.4);
});

test('Sagrada observed dice lattice survives perspective, rotation, a hole and order shuffle without dividing window art',async()=>{
 const {diceLattice}=await import('../shared/estimatedGeometry');
 for(const rotation of [0,Math.PI/6,Math.PI/2]){const c=Math.cos(rotation),s=Math.sin(rotation),points=[];for(let row=0;row<4;row++)for(let col=0;col<5;col++){if(row===1&&(col===1||col===4))continue;const x=(col-2)*.09*(1+row*.07),y=(row-1.5)*.1;points.push({id:`${row+1}-${col+1}`,x:.5+c*x-s*y,y:.5+s*x+c*y,width:.05,height:.05});}const fitted=diceLattice(points,4,5);assert.equal(fitted.cells.size,18);assert.equal(new Set([...fitted.cells.values()].map(c=>c.row+':'+c.column)).size,18);assert.deepEqual([...diceLattice([...points].reverse(),4,5).cells].sort(),[...fitted.cells].sort());
  const missingEdge=diceLattice(points.filter(p=>!p.id.startsWith('1-')),4,5);assert.equal(missingEdge.cells.size,0,'missing whole boundary row does not reveal row offset');
 }
});

test('Sagrada window grid uses unique observed anchor, preserves manual/canonical items, excludes draft and ambiguous boards',()=>{
 const entries:Entry[]=[['board','windows',[.1,.1,.8,.8]]];for(let r=0;r<4;r++)for(let c=0;c<5;c++){if(r===1&&c===1)continue;entries.push([`d${r}${c}`,'dice',[.22+c*.1,.35+r*.1,.05,.05],{dieValue:0},'window']);}
 entries.push(['draft','dice',[.12,.12,.03,.03],{dieValue:2},'draft']);const f=fixture('sagrada',entries),items=f.items(),before=JSON.stringify(f.a);items.find(i=>i.pieceId==='d00')!.position={space:'board',instanceKey:'retained',frameId:'f',frameSHA:sha,areaId:'window',anchorSlotId:'r1c1',coveredSlotIds:['r1c1'],x:.1,y:.1,rotationDegrees:null,reflected:null};
 const run=()=>estimateBoardStructure({gameId:'sagrada',items,assertions:[f.a],evidence}),r=run();assert.equal(r.retained.length,1);assert.equal(r.placements.filter(p=>p.cell).length,18);assert(r.placements.filter(p=>p.cell).every(p=>p.anchorPieceId==='board'));assert(!r.placements.find(p=>p.pieceId==='draft')!.cell);assert.equal(JSON.stringify(f.a),before);
 f.pieces.find(p=>p.id==='d01')!.structureOverride={...q,areaId:'window',slot:20,groupId:r.placements.find(p=>p.pieceId==='d01')!.groupId,anchorPieceId:'board'};const manual=run().placements.find(p=>p.pieceId==='d01')!;assert.equal(manual.basis,'manual');assert.deepEqual(manual.cell,{row:4,column:5});assert.equal(run().groups.find(g=>g.id===manual.groupId)!.grid!.basis,'observed-dice-lattice','same estimated group keeps observed grid evidence after manual correction');assert.notEqual(run().groups.find(g=>g.id===manual.groupId)!.grid!.rowAxis,null);assert.doesNotThrow(()=>validateStructureOverride({...q,areaId:'window',slot:20},'sagrada'));assert.throws(()=>validateStructureOverride({...q,areaId:'window',slot:21},'sagrada'));
 const duplicate=structuredClone(entries);duplicate.push(['other-board','windows',[.1,.1,.8,.8]]);const ambiguous=fixture('sagrada',duplicate).run();assert.equal(ambiguous.placements.filter(p=>p.cell).length,0);
});

test('LC rotation keeps source role and same physical side; on-line boundary is not forced to a side',()=>{
 for(const angle of [Math.PI/8,Math.PI/2,-Math.PI/3]){const rotate=(x:number,y:number)=>{const c=Math.cos(angle),s=Math.sin(angle);return [.5+c*x-s*y-.015,.5+s*x+c*y-.015,.03,.03];},entries:Entry[]=[['board','board',[.05,.05,.9,.9]],...[-.2,0,.2].map((x,i)=>['d'+i,'cards',rotate(x,0),{suit:'red'},'discard'] as Entry),['a','cards',rotate(-.1,.15),{suit:'green'},'expeditions'],['b','cards',rotate(.15,.15),{suit:'초록색'},'expeditions'],['edge','cards',rotate(.1,0),{suit:'blue'},'expeditions']];
  // Move the board line off the photo centre without changing local physical relationships.
  entries.forEach(e=>{if(e[1]!=='board'){e[2][0]+=.03;e[2][1]+=.04;}});const r=fixture('lost-cities',entries).run(),p=(id:string)=>r.placements.find(p=>p.pieceId===id)!;assert.equal(p('a').groupId,p('b').groupId);assert(r.unassigned.some(p=>p.pieceId==='edge'));assert(r.placements.filter(p=>p.areaId==='discard').length===3);
 }
});

test('ambiguous repeated-grid boundary does not invent a cell and retained unknown-purpose cards stay retained',async()=>{
 const {diceLattice}=await import('../shared/estimatedGeometry'),points=[];for(let r=0;r<4;r++)for(let c=0;c<5;c++)points.push({id:`${r}-${c}`,x:.2+c*.1,y:.2+r*.1,width:.05,height:.05});points.find(p=>p.id==='1-1')!.x+=.05;assert(!diceLattice(points,4,5).cells.has('1-1'));
 const f=fixture('sagrada',[['manual','cards',[.1,.1,.1,.1],{cardType:null}]]),items=f.items();items[0].position={space:'manual',areaId:'custom',x:.1,y:.1,rotationDegrees:0};const r=estimateBoardStructure({gameId:'sagrada',items,assertions:[f.a],evidence});assert.equal(r.retained.length,1);assert.equal(r.metrics.placed,1);assert.equal(r.unassigned.length,0);
});

test('user-named manual window group has a 4x5 display contract without inventing photo direction',()=>{
 const f=fixture('sagrada',[['d','dice',[.2,.2,.05,.05],{dieValue:0}]]);f.pieces[0].structureOverride={...q,areaId:'window',groupId:'user-created-window',slot:20};const before=JSON.stringify(f.a),r=f.run(),g=r.groups.find(g=>g.id===r.placements[0].groupId)!;
 assert.deepEqual(g.grid,{rows:4,columns:5,rowAxis:null,orientation:'unknown',basis:'manual-slot-order'});assert.equal(g.axis,null);assert.equal(g.slots.length,20);assert.deepEqual(r.placements[0].cell,{row:4,column:5});assert.equal(JSON.stringify(f.a),before);
});

test('all window dice manual after JSON reopen retain 4x5 metadata even with no automatic grid group',()=>{
 const f=fixture('sagrada',Array.from({length:20},(_,i)=>['d'+i,'dice',[.15+(i%5)*.1,.15+Math.floor(i/5)*.1,.05,.05],{dieValue:i%6+1},'window'] as Entry));
 f.pieces.forEach((p,i)=>p.structureOverride={...q,areaId:'window',groupId:'all-user-window',order:i,slot:i+1});const saved=JSON.parse(JSON.stringify(f.a)),items=projectGenericDrawing(saved,saved.value.pieces,evidence),before=JSON.stringify(saved),r=estimateBoardStructure({gameId:'sagrada',items,assertions:[saved],evidence});
 assert.equal(r.placements.length,20);assert.equal(r.groups.length,1);assert.equal(r.groups[0].grid!.basis,'manual-slot-order');assert.equal(r.groups[0].grid!.rowAxis,null);assert(r.placements.every((p,i)=>p.basis==='manual'&&p.slot===i+1&&p.cell!.row===Math.floor(i/5)+1&&p.cell!.column===i%5+1));assert.equal(JSON.stringify(saved),before);
});

test('P0 manual cross-field resolves after all live records; qualified duplicate selection and rejected links are explicit',()=>{
 const card=fixture('seven-wonders',[['card','age-cards',[.3,.2,.06,.08],{cardColor:'blue'}]],'cards','cards'),board=fixture('seven-wonders',[['wonder','wonder',[.2,.35,.4,.2]]],'boards','boards'),duplicate=fixture('seven-wonders',[['wonder','wonder',[.6,.6,.2,.2]]],'other','other');
 const run=(context=[board.a])=>estimateBoardStructure({gameId:'seven-wonders',items:card.items(),assertions:[card.a],allAssertions:[...context,card.a],evidence});card.pieces[0].structureOverride={...q,areaId:'tableau',slot:null,anchorPieceId:'wonder',attachedToPieceId:'wonder'};const original=JSON.stringify(card.a);assert.equal(run().metrics.placed,1);assert.deepEqual(run().placements[0].attachedToRef,{assertionId:'boards',pieceId:'wonder'});
 const rejected=run([]);assert.equal(rejected.metrics.placed,0);assert.equal(rejected.placements[0].anchorPieceId,null);assert.equal(rejected.placements[0].attachedToPieceId,null);assert(rejected.groups.every(g=>g.anchorPieceId===null&&g.anchorRef===null));assert.equal(JSON.stringify(card.a),original);
 assert.equal(run([board.a,duplicate.a]).metrics.placed,0);const sourceKey=run().referenceRecords!.find(r=>r.assertionId==='cards')!.sourceKey!;card.pieces[0].structureOverride={...q,version:'estimated-structure-override-v2',sourceKey,areaId:'tableau',slot:null,anchorPieceId:'wonder',attachedToPieceId:null,anchorRef:{kind:'live-piece',assertionId:'boards',pieceId:'wonder'}};assert.equal(run([board.a,duplicate.a]).metrics.placed,1);
 card.pieces[0].structureOverride.sourceKey=sourceKey.replace('test-epoch','foreign-epoch');const bad=run();assert.equal(bad.metrics.placed,0);assert.equal(bad.placements[0].anchorRef,null);assert.equal(bad.placements[0].anchorPieceId,null);assert.equal(bad.placements[0].basisByField!.anchor,'unknown');
});

test('7W explicit far board relation beats nearest centre; unanchored/tableau boundary stays unknown',()=>{
 const f=fixture('seven-wonders',[['near','wonder',[.05,.05,.2,.2]],['far','wonder',[.65,.65,.25,.25]],['card','age-cards',[.1,.1,.07,.1],{cardColor:'blue'}],['outside','age-cards',[.3,.1,.06,.08],{cardColor:'blue'}]]);f.a.observationReceipts![0].result.spatial={version:'spatial-observation-v1',boardInstances:[],placements:[],relations:[{fromRef:'card',toRef:'far',kind:'on',basis:'observed-visible-relation',partial:false}],cellStates:[],deferred:[]};const r=f.run();assert.equal(r.placements.find(p=>p.pieceId==='card')!.anchorPieceId,'far');assert(r.unassigned.some(p=>p.pieceId==='outside'));assert(r.placements.find(p=>p.pieceId==='outside')!.anchorCandidates!.length===2);
});

test('partial ordering preserves unknown peers and cycles instead of inventing a total source order',()=>{
 const f=fixture('seven-wonders',[['a','age-cards',[.1,.1,.05,.08]],['b','age-cards',[.2,.1,.05,.08]],['c','age-cards',[.3,.1,.05,.08]]]),sourceKey=f.run().referenceRecords![0].sourceKey!;
 for(const p of f.pieces)p.structureOverride={...q,version:'estimated-structure-override-v2',sourceKey,areaId:'tableau',slot:null,groupId:'one',beforeRefs:p.id==='a'?[{assertionId:'a',pieceId:'b'}]:[]};let r=f.run();assert(r.placements.every(p=>p.orderStatus==='partial'));assert.equal(r.placements.find(p=>p.pieceId==='b')!.orderLevel,1);
 (f.pieces[1].structureOverride as any).beforeRefs=[{assertionId:'a',pieceId:'a'}];r=f.run();assert.equal(r.placements.find(p=>p.pieceId==='a')!.orderStatus,'cycle');assert.equal(r.placements.find(p=>p.pieceId==='b')!.orderStatus,'cycle');assert.equal(r.placements.length,3);
});

test('LC groups are board-qualified even when two boards have the same discard color',()=>{
 const f=fixture('lost-cities',[['one','board',[.02,.02,.4,.35]],['two','board',[.55,.55,.4,.35]],['d1','cards',[.08,.1,.03,.03],{suit:'blue'},'discard'],['d2','cards',[.2,.15,.03,.03],{suit:'blue'},'discard'],['d3','cards',[.6,.65,.03,.03],{suit:'blue'},'discard'],['d4','cards',[.8,.7,.03,.03],{suit:'blue'},'discard']]);const r=f.run();assert.equal(new Set(r.placements.filter(p=>p.areaId==='discard').map(p=>p.groupId)).size,2);assert(r.placements.filter(p=>p.areaId==='discard').every(p=>p.anchorRef?.kind==='live-piece'));
});

test('relative track permits same-band multiple dice, while mere token/tool overlap is not attachment evidence',()=>{
 const f=fixture('sagrada',[['d1','dice',[.2,.1,.05,.05],{dieValue:2},'round-track'],['d2','dice',[.21,.11,.05,.05],{dieValue:0},'round-track'],['t','cards',[.4,.4,.2,.2],{cardType:'tool'}],['favor','tokens',[.45,.45,.04,.04]]]),r=f.run(),dice=r.placements.filter(p=>p.pieceId.startsWith('d'));assert.equal(dice.length,2);assert.equal(dice[0].slot,dice[1].slot);assert(dice.every(p=>p.slotBasis==='relative-band'));assert.equal(r.placements.find(p=>p.pieceId==='favor')!.attachedToPieceId,null);
});

test('manual semantic frame is projectively stable under joint rotation/translation; invalid corners and AI v2 fail',async()=>{
 const {frameFromCorners,projectBoardPoint}=await import('../shared/estimatedGeometry'),{partialStructureOrder}=await import('../shared/structureRelations');const corners=[{x:.2,y:.2},{x:.7,y:.25},{x:.8,y:.8},{x:.15,y:.7}] as const,m=frameFromCorners(corners)!;assert(m);assert.deepEqual(projectBoardPoint(m,corners[0]),{x:0,y:0});const p={x:.45,y:.4},expected=projectBoardPoint(m,p)!;
 const move=({x,y}:{x:number;y:number})=>({x:.6-(y-.5),y:.4+(x-.5)}),rot=frameFromCorners(corners.map(move) as any)!;const actual=projectBoardPoint(rot,move(p))!;assert(Math.abs(actual.x-expected.x)<1e-9&&Math.abs(actual.y-expected.y)<1e-9);
 const v2={...q,version:'estimated-structure-override-v2' as const,sourceKey:JSON.stringify([null,'e',sha,epoch,sha]),frame:{corners}};assert.doesNotThrow(()=>validateStructureOverride(v2,'sagrada'));assert.throws(()=>validateStructureOverride(v2,'sagrada','ai'));assert.throws(()=>validateStructureOverride({...v2,frame:{corners:[corners[0],corners[2],corners[1],corners[3]]}},'sagrada'));assert.deepEqual(partialStructureOrder(['a','b'],[]).levels,[['a','b']]);
});

test('qualified anchor equality ignores persisted object key order and component explicit seeds outrank incidental overlap',()=>{
 const f=fixture('seven-wonders',[['one','wonder',[.05,.05,.25,.3]],['two','wonder',[.6,.6,.3,.3]],['a','age-cards',[.62,.62,.1,.1],{cardColor:'blue'}],['b','age-cards',[.64,.64,.1,.1],{cardColor:'blue'}],['c','age-cards',[.4,.4,.1,.1],{cardColor:'blue'}]]),receipt=f.a.observationReceipts![0];
 receipt.result.spatial={version:'spatial-observation-v1',boardInstances:[],placements:[],relations:[{fromRef:'a',toRef:'one',kind:'on',basis:'observed-visible-relation',partial:false},{fromRef:'b',toRef:'one',kind:'on',basis:'observed-visible-relation',partial:false},{fromRef:'b',toRef:'c',kind:'covers',basis:'observed-visible-relation',partial:false}],cellStates:[],deferred:[]};let r=f.run();assert(r.placements.filter(p=>['a','b','c'].includes(p.pieceId)).every(p=>p.anchorPieceId==='one'));
 const sourceKey=r.referenceRecords![0].sourceKey!,ref=JSON.parse('{"pieceId":"one","assertionId":"a","kind":"live-piece"}');f.pieces[0].structureOverride={...q,version:'estimated-structure-override-v2',sourceKey,areaId:'wonder',slot:null,anchorRef:ref,frame:{corners:[{x:.05,y:.05},{x:.3,y:.05},{x:.3,y:.35},{x:.05,y:.35}]}};r=f.run();assert(r.boardContexts!.find(b=>b.anchorRef.kind==='live-piece'&&b.anchorRef.pieceId==='one')!.hasManualFrame);
});

test('unanchored visible stacks/roles/colors remain separate display groups without becoming placed',()=>{
 const f=fixture('seven-wonders',[['a','age-cards',[.1,.1,.1,.1],{cardColor:'blue'}],['b','age-cards',[.12,.12,.1,.1],{cardColor:'blue'}],['c','age-cards',[.6,.6,.1,.1],{cardColor:'red'}]]),r=f.run();assert.equal(r.metrics.placed,0);assert.equal(r.unassigned.length,3);assert.equal(r.placements[0].anchorRef,null);assert.equal(r.placements.find(p=>p.pieceId==='a')!.groupId,r.placements.find(p=>p.pieceId==='b')!.groupId);assert.notEqual(r.placements.find(p=>p.pieceId==='a')!.groupId,r.placements.find(p=>p.pieceId==='c')!.groupId);assert(r.groups.every(g=>g.areaId==='unclassified'));
});

test('manual frame tolerates 3D bbox crossings using local centres plus lattice, while exact edge stays unknown',async()=>{
 const {manualFrameCells,frameFromCorners}=await import('../shared/estimatedGeometry'),matrix=frameFromCorners([{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}])!,footprints=[];for(let row=0;row<4;row++)for(let col=0;col<5;col++)footprints.push({id:`${row}-${col}`,x:(col+.5)/5,y:(row+.5)/4,width:.25,height:.3});assert.equal(manualFrameCells(footprints,matrix,4,5).size,20);assert.equal(manualFrameCells([{id:'edge',x:.4,y:.25,width:.2,height:.3}],matrix,4,5).size,0);
 const fs=await import('node:fs/promises'),data=JSON.parse(await fs.readFile('docs/pro-review-20261113/data/cases/sagrada-high.json','utf8')),assertions=data.assertions.map((a:any)=>({...a,observationReceipts:a.observationReceiptRefs.map((i:number)=>data.receipts[i])})),calculate=()=>estimateBoardStructure({gameId:data.gameId,items:assertions.flatMap((a:any)=>projectGenericDrawing(a,a.value.pieces,data.photos)),assertions,evidence:data.photos}),before=calculate(),g=before.groups.find(g=>g.areaId==='window'&&g.anchorRef?.kind==='live-piece'&&g.grid)!,ref=g.anchorRef!;assert(ref.kind==='live-piece');const a=assertions.find((a:any)=>a.id===ref.assertionId),p=a.value.pieces.find((p:any)=>p.id===ref.pieceId),original=JSON.stringify(assertions);
 p.structureOverride={...q,version:'estimated-structure-override-v2',sourceKey:g.sourceKey,areaId:'window',slot:null,groupId:'tapped-frame',anchorPieceId:p.id,anchorRef:ref,frame:{corners:[{x:268/1200,y:536/900},{x:718/1200,y:516/900},{x:889/1200,y:826/900},{x:247/1200,y:856/900}]}};const overridden=JSON.stringify(assertions),after=calculate();assert.equal(after.placements.filter(p=>p.cell).length,before.placements.filter(p=>p.cell).length);assert(after.placements.filter(p=>p.cell).length>0);assert.equal(JSON.stringify(assertions),overridden);delete p.structureOverride;assert.equal(JSON.stringify(assertions),original);
});

test('normalized deferred relation cycle is not reported as a proven complete order',()=>{
 const f=fixture('seven-wonders',[['a','age-cards',[.1,.1,.05,.08]],['b','age-cards',[.2,.1,.05,.08]]]);f.pieces.forEach(p=>p.structureOverride={...q,areaId:'tableau',slot:null,groupId:'same'});f.a.observationReceipts![0].result.spatial={version:'spatial-observation-v1',boardInstances:[],placements:[],relations:[{fromRef:'a',toRef:'b',kind:'before',basis:'observed-visible-relation',partial:false}],cellStates:[],deferred:[{section:'relations',index:1,reason:'relation-cycle'}]};const r=f.run();assert(r.placements.every(p=>p.orderStatus==='unknown'&&p.orderLevel===null));assert.equal(r.groups[0].orderUnresolved!.length,2);
});

test('observed window without a live board reuses only its source-qualified anchor; draft is never relabelled',()=>{
 const entries:Entry[]=[];for(let row=0;row<4;row++)for(let col=0;col<5;col++)entries.push([`d${row}${col}`,'dice',[.2+col*.1,.2+row*.1,.05,.05],{dieValue:0},'window']);entries.push(['draft','dice',[.05,.05,.03,.03],{dieValue:2},'draft']);const f=fixture('sagrada',entries),r=f.a.observationReceipts![0];r.request.images.push({...r.request.images[0],evidenceId:'foreign-photo'});r.result.spatial={version:'spatial-observation-v1',boardInstances:[{ref:'window',imageIndex:0,panelRef:null,sourceRegion:{x:.1,y:.1,width:.7,height:.7},templateAreaIds:['window'],orientationDegrees:null},{ref:'foreign',imageIndex:1,panelRef:null,sourceRegion:{x:.1,y:.1,width:.7,height:.7},templateAreaIds:['window'],orientationDegrees:null}],placements:entries.filter(e=>e[0]!=='draft').map(e=>({observationRef:e[0],boardInstanceRef:'window'})),relations:[],cellStates:[],deferred:[]} as any;const out=f.run();assert.equal(out.boardContexts!.length,1);assert.equal(out.placements.filter(p=>p.cell).length,20);assert(out.placements.filter(p=>p.cell).every(p=>p.anchorRef?.kind==='observed-board'));assert(!out.placements.find(p=>p.pieceId==='draft')!.cell);assert(out.unassigned.some(p=>p.pieceId==='draft'));
});

test('explicit null v2 qualified links clear derived legacy links without changing the stored override',()=>{
 const f=fixture('seven-wonders',[['card','age-cards',[.1,.1,.1,.1]]]),sourceKey=f.run().referenceRecords![0].sourceKey!;f.pieces[0].structureOverride={...q,version:'estimated-structure-override-v2',sourceKey,areaId:'tableau',slot:null,anchorPieceId:'deleted',attachedToPieceId:'deleted',anchorRef:null,attachedToRef:null};const before=JSON.stringify(f.a),r=f.run();assert.equal(r.placements[0].anchorRef,null);assert.equal(r.placements[0].attachedToRef,null);assert.equal(r.placements[0].anchorPieceId,null);assert.equal(r.placements[0].attachedToPieceId,null);assert.equal(JSON.stringify(f.a),before);
});

test('board correction carries only an evidenced suggested role area and never auto-promotes unknown roles',async()=>{
 const {estimatedBoardAnchorCorrection}=await import('../shared/estimatedBoardStructure'),f=fixture('seven-wonders',[['board','wonder',[.05,.65,.2,.2]],['city','age-cards',[.7,.05,.1,.1],{cardColor:'yellow'},'city'],['stage','age-cards',[.7,.25,.1,.1],{},'wonder-area'],['unknown-role','age-cards',[.7,.45,.1,.1],{cardColor:'yellow'}]]),before=JSON.stringify(f.a),r=f.run(),p=(id:string)=>r.placements.find(p=>p.pieceId===id)!,anchor={kind:'live-piece' as const,assertionId:'a',pieceId:'board'};
 assert.equal(p('city').areaId,'unclassified');assert.equal(p('city').suggestedAreaId,'tableau');assert.equal(r.groups.find(g=>g.id===p('city').groupId)!.suggestedAreaId,'tableau');assert.equal(p('stage').suggestedAreaId,'stages');assert.equal(p('unknown-role').suggestedAreaId,undefined);assert.equal(r.metrics.placed,1);assert.equal(JSON.stringify(f.a),before);
 assert.equal(estimatedBoardAnchorCorrection(p('city'),anchor).areaId,'tableau');assert.equal(estimatedBoardAnchorCorrection(p('stage'),anchor).areaId,'stages');assert.equal(estimatedBoardAnchorCorrection(p('unknown-role'),anchor).areaId,'unclassified');assert.equal(estimatedBoardAnchorCorrection(p('city'),null).areaId,'unclassified');
});

test('reopened unclassified manual override retains known-role suggestion without changing saved classification or invalid source',async()=>{
 const {estimatedBoardAnchorCorrection}=await import('../shared/estimatedBoardStructure'),f=fixture('seven-wonders',[['board','wonder',[.6,.6,.2,.2]],['card','age-cards',[.1,.1,.05,.08],{cardColor:'yellow'},'city']]),sourceKey=f.run().referenceRecords!.find(r=>r.pieceId==='card')!.sourceKey!,anchor={kind:'live-piece' as const,assertionId:'a',pieceId:'board'};
 f.pieces[1].structureOverride={...q,version:'estimated-structure-override-v2',sourceKey,areaId:'unclassified',groupId:'saved-unclassified',slot:null,anchorPieceId:'board',anchorRef:anchor};const before=JSON.stringify(f.a),r=f.run(),p=r.placements.find(p=>p.pieceId==='card')!;assert.equal(p.areaId,'unclassified');assert.equal(r.metrics.placed,1);assert.equal(p.suggestedAreaId,'tableau');assert.equal(r.groups.find(g=>g.id===p.groupId)!.suggestedAreaId,'tableau');assert.equal(estimatedBoardAnchorCorrection(p,anchor).areaId,'tableau');assert.equal(JSON.stringify(f.a),before);
 f.pieces[1].structureOverride.sourceKey=sourceKey.replace('test-epoch','foreign-epoch');assert.equal(f.run().placements.find(p=>p.pieceId==='card')!.suggestedAreaId,undefined);assert.equal(f.run().placements.find(p=>p.pieceId==='card')!.anchorRef,null);
});
