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
test('LC separates near/far and five visible empty color lanes; source order does not sort printed values',()=>{
 const f=fixture('lost-cities',[['b','board',[.2,.35,.6,.2]],['c2','cards',[.3,.72,.05,.08],{suit:'red',number:2}],['c9','cards',[.3,.60,.05,.08],{suit:'red',number:9}],['f','cards',[.3,.2,.05,.08],{suit:'blue',number:0}],['discard-1','cards',[.25,.43,.04,.04],{},'discard'],['discard-2','cards',[.65,.43,.04,.04],{},'discard']]),before=JSON.stringify(f.a),r=f.run();
 assert.equal(r.groups.filter(g=>g.areaId==='expeditions').length,10);const p=(id:string)=>r.placements.find(p=>p.pieceId===id)!;assert.equal(p('c9').order,0);assert.equal(p('c2').order,1);assert.equal(r.groups.find(g=>g.id===p('f').groupId)!.side,'far');assert.equal(r.metrics.placed,6);assert.equal(r.areas.reduce((n,a)=>n+a.total,0),r.metrics.total);assert(r.areas.every(a=>a.total===a.placed+a.unassigned));assert.equal(JSON.stringify(f.a),before);
});
test('missing/ambiguous anchors and unavailable manual references remain visible but never placed successes',()=>{
 const f=fixture('seven-wonders',[['a','wonder',[.2,.4,.2,.2]],['b','wonder',[.6,.4,.2,.2]],['middle','age-cards',[.45,.4,.1,.1],{cardColor:'green'}],['left','age-cards',[.21,.2,.05,.08],{cardColor:'blue'}]]),r=f.run();assert(r.unassigned.some(p=>p.pieceId==='middle'));assert.equal(r.metrics.placed,3);
 const absent=fixture('seven-wonders',[['only','age-cards',[.2,.2,.1,.1],{cardColor:'green'}]]).run();assert.equal(absent.placements[0].areaId,'unclassified');assert.equal(absent.metrics.placed,0);assert(absent.areas.some(a=>a.status==='empty'));
 f.pieces[3].structureOverride={...q,areaId:'tableau',slot:null,anchorPieceId:'deleted'};const missing=f.run();assert(missing.unassigned.some(p=>p.pieceId==='left'));assert.equal(missing.placements.find(p=>p.pieceId==='left')!.order,0);
});
test('per-field view may use permitted same-source anchor but cannot borrow owner/epoch/source anchors',()=>{
 const card=fixture('seven-wonders',[['card','age-cards',[.3,.2,.06,.08],{cardColor:'blue'}]],'cards','cards'),anchor=fixture('seven-wonders',[['wonder','wonder',[.2,.35,.4,.2]]],'boards','boards');
 const run=()=>estimateBoardStructure({gameId:'seven-wonders',items:card.items(),assertions:[card.a],allAssertions:[card.a,anchor.a],evidence});assert.equal(run().metrics.placed,1);assert.equal(run().placements.length,1);assert.equal(run().placements[0].anchorPieceId,'wonder');
 (anchor.a.observationReceipts![0].request.scope as any).ownerId='other';anchor.a.ownerId='other';assert.equal(run().metrics.placed,0);anchor.a.ownerId=undefined;anchor.a.observationReceipts![0].request.scope.ownerId=null;anchor.a.observationReceipts![0].request.scope.captureEpoch='old';assert.equal(run().metrics.placed,0);
});
test('Sagrada retains validated window location, attaches favors only on unique tool overlap, classifies unknown cards visibly',()=>{
 const f=fixture('sagrada',[['d','dice',[.2,.2,.04,.04],{dieValue:0},'window'],['t','cards',[.5,.3,.2,.2],{cardType:'tool'}],['g','cards',[.2,.6,.2,.2],{cardType:'objective'}],['u','cards',[.7,.6,.1,.15],{cardType:null}],['f','tokens',[.55,.35,.04,.04]],['loose','tokens',[.1,.1,.03,.03]]]);
 const items=f.items();items[0].position={space:'board',instanceKey:'already-validated',frameId:'f',frameSHA:sha,areaId:'window',anchorSlotId:'r1c1',coveredSlotIds:['r1c1'],x:.1,y:.1,rotationDegrees:null,reflected:null};
 const r=estimateBoardStructure({gameId:'sagrada',items,assertions:[f.a],evidence});assert.equal(r.retained.length,1);assert.equal(r.placements.find(p=>p.pieceId==='f')!.attachedToPieceId,'t');assert(r.unassigned.some(p=>p.pieceId==='loose'));assert(r.unassigned.some(p=>p.pieceId==='u'));assert.equal(r.metrics.placed,4);
});
test('round-track prioritizes observed extent; sufficient visible bands yield display ranks, not printed round claims',()=>{
 const f=fixture('sagrada',[['d1','dice',[.21,.1,.03,.03],{dieValue:5},'round-track'],['d2','dice',[.76,.1,.03,.03],{dieValue:1},'round-track']]);
 const r=f.a.observationReceipts![0];r.result.spatial={version:'spatial-observation-v1',boardInstances:[{ref:'track',imageIndex:0,panelRef:null,sourceRegion:{x:.2,y:.08,width:.6,height:.1}}],placements:[{observationRef:'d1',boardInstanceRef:'track'},{observationRef:'d2',boardInstanceRef:'track'}],relations:[],cellStates:[]} as any;
 const out=f.run();assert.deepEqual(out.placements.map(p=>p.slot),[1,10]);assert.equal(out.metrics.placed,2);delete r.result.spatial;const no=f.run();assert.deepEqual(no.placements.map(p=>p.slot),[1,2]);assert.equal(no.metrics.placed,2);assert(no.placements.every(p=>p.notes.some(n=>n.includes('인쇄 라운드번호 아님'))));assert.deepEqual(no.placements.map(p=>p.order),[0,1]);const one=fixture('sagrada',[['d','dice',[.2,.1,.03,.03],{dieValue:2},'round-track']]).run();assert.equal(one.placements[0].slot,null);assert.equal(one.metrics.placed,0);
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
 const r=f.run(),p=(id:string)=>r.placements.find(p=>p.pieceId===id)!,g=(id:string)=>r.groups.find(g=>g.id===p(id).groupId)!;assert.equal(p('d1').areaId,'discard');assert.equal(p('d2').areaId,'discard');assert.equal(p('d3').areaId,'discard');assert.equal(g('n1').side,g('n2').side);assert.notEqual(g('n1').side,g('other').side);assert.equal(p('n1').groupId,p('n2').groupId);assert(Math.abs(g('n1').axis!.y)>.4);
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
