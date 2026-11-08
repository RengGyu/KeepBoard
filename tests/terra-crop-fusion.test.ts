import test from 'node:test';import assert from 'node:assert/strict';
import {catalogPacks} from '../gamepacks/catalog';import {effectiveRecognitionPack} from '../shared/recognition';import {photoDefinition} from '../server/photoDefinitions';
import {prepareScanObservation,projectScanResults} from '../server/scanObservation';import {TerraGameReader,decodeTerraGameObservation} from '../server/ai/terraGameReader';import {assembleObservations} from '../server/ai/observationAssembly';
import type {Session,Evidence,AnalysisResult} from '../shared/types';
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {register} from 'node:module';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {ScanObservationResults,ScanFusionNotes}=await import('../src/ScanObservationResults');
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=','base64');
const item=(unit:'single'|'group'|'unknown',box:number[]|null,value=6,quantity:number|null=null)=>({kind:'dice',physicalUnit:unit,box_1000:box?{ymin:box[0],xmin:box[1],ymax:box[2],xmax:box[3]}:null,face:'front',quantity,attributes:[{id:'dieValue',valueJson:String(value),unknownReason:null}]});
async function fixture(items:any[][],options:{session?:Session;id?:string;detail?:boolean}={}){
 const pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id==='sagrada')!),definition=photoDefinition(pack);
 const evidence=items.map((_,i)=>({id:'e'+i,kind:'photo',scope:'public',captureEpoch:'epoch',url:'/synthetic/'+i,label:'synthetic',...(i&&!options.detail?{sourceEvidenceId:'e0',sourceRegion:{x:0,y:0,width:.5,height:.5}}:{})})as Evidence);
 const session=options.session??({id:'synthetic',gamePack:pack,captureEpoch:'epoch',turnInstanceId:'turn',players:[],evidence,assertions:[],notes:{},activity:[],snapshots:[]}as unknown as Session),reader=new TerraGameReader({key:async()=> 'synthetic'});
 const scan=await prepareScanObservation({session,pack,evidence,selection:{kind:'luna-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'window'},taskId:options.id??'unit-scan',reader,cloud:false,readImage:async()=>({data:bytes,mimeType:'image/png'})});
 const results=scan.units.map((u,i)=>{const p=u.hosted!,native={status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({items:items[i]})}]}]},decoded=decodeTerraGameObservation(native,p.request,p.definition,p.transforms),r=assembleObservations({request:p.request,result:decoded.raw,definition:p.definition,pack,turnInstanceId:'turn',reader:p.reader,transforms:p.transforms,sourceImageSHA:p.sourceImageSHA,hostedWire:decoded.hostedWire});r.observationReceipts![0].scanUnitId=u.id;r.scanBundle={plan:scan.plan,units:[{unitId:u.id,state:'completed',observationCount:decoded.raw.observations.length}],links:[]};return r;});
 return {session,pack,scan,results,project:(rs=results)=>projectScanResults(session,pack,scan,rs)};
}
const pieces=(r:AnalysisResult)=>r.assertions.flatMap(a=>(a.value as any).pieces??[]),stable=(r:AnalysisResult)=>JSON.stringify({values:r.assertions.map(a=>a.value),bundle:r.scanBundle,raw:r.observationReceipts});
test('explicit group with unknown quantity is refined non-additively by explicit single null-quantity children',async()=>{
 const f=await fixture([[item('group',[100,100,900,900])],[item('single',[400,400,600,600],9)]]),raw=JSON.stringify(f.results),r=f.project();assert.equal(pieces(r).length,1);assert.equal(pieces(r)[0].quantity,null);assert.equal(pieces(r)[0].readout.values.dieValue,9);assert.equal(r.scanBundle!.fusion!.refinements.length,1);assert.equal(r.scanBundle!.fusion!.refinements[0].residualQuantity,null);assert.equal(r.scanBundle!.fusion!.refinements[0].exhaustive,false);assert.equal(JSON.stringify(f.results),raw);assert.equal(stable(r),stable(f.project([...f.results].reverse())));assert.equal(stable(r),stable(f.project([...f.results,f.results[1]])));
});
test('a retired aggregate remains raw evidence but cannot veto a separate complete crop individual',async()=>{
 const f=await fixture([[item('group',[100,100,400,400])],[item('single',[400,400,600,600],9),item('single',[700,700,900,900],3)]]),raw=JSON.stringify(f.results),r=f.project();
 assert.equal(pieces(r).length,2);assert.deepEqual(pieces(r).map(p=>p.readout.values.dieValue).sort(),[3,9]);
 assert.equal(r.scanBundle!.fusion!.refinements.length,1);assert.equal(r.scanBundle!.fusion!.refinements[0].residualQuantity,null);assert.equal(r.scanBundle!.unresolvedGroups!.length,0);
 assert.equal(r.observationReceipts!.reduce((n,r)=>n+r.result.observations.length,0),3);assert.equal(JSON.stringify(f.results),raw);
 assert.equal(stable(r),stable(f.project([...f.results].reverse())));assert.equal(stable(r),stable(f.project([...f.results,f.results[1]])));
});
test('reciprocal complete group footprints preserve one visible surface without asserting individual identity',async()=>{
 const f=await fixture([[item('group',[200,200,300,300],6)],[item('group',[400,400,600,600],9)]]),r=f.project();
 assert.equal(pieces(r).length,1);assert.equal(pieces(r)[0].quantity,null);assert.equal(pieces(r)[0].readout.values.dieValue,6);assert(r.scanBundle!.fusion!.decisions.some(d=>d.fieldPath==='readout.values.dieValue'&&d.conflict&&d.basis==='unresolved'));
 assert.equal(r.scanBundle!.links[0].relation,'same-visible-group-surface');assert.equal(r.scanBundle!.fusion!.refinements.length,0);
 assert.equal(r.observationReceipts!.reduce((n,r)=>n+r.result.observations.length,0),2);assert.equal(stable(r),stable(f.project([...f.results].reverse())));
});
test('ambiguous neighboring groups stay separate and group-to-single is refinement rather than identity',async()=>{
 const f=await fixture([[item('group',[200,200,300,300]),item('group',[200,200,300,300])],[item('group',[400,400,600,600],9)]]),r=f.project();
 assert.equal(pieces(r).length,2);assert.equal(r.scanBundle!.unresolvedGroups!.length,1);assert(!r.scanBundle!.links.some(l=>l.relation));
 const detail=await fixture([[item('group',[200,200,300,300])],[item('single',[420,420,580,580],9)]]),d=detail.project();assert.equal(pieces(d).length,1);assert.equal(d.scanBundle!.fusion!.refinements.length,1);assert(!d.scanBundle!.links.some(l=>l.relation));
});
const windowItem=(box:number[])=>({kind:'windows',physicalUnit:'single',box_1000:{ymin:box[0],xmin:box[1],ymax:box[2],xmax:box[3]},face:'front',quantity:1,attributes:[]});
test('a reciprocal single footprint with conflicting kind preserves the anchor and defers the crop claim',async()=>{
 const f=await fixture([[windowItem([200,200,300,300])],[item('single',[400,400,600,600],9,1)]]),raw=JSON.stringify(f.results),r=f.project();
 assert.equal(pieces(r).length,1);assert.equal(pieces(r)[0].componentId,'windows');assert.equal(r.scanBundle!.unresolvedGroups!.length,1);assert(r.scanBundle!.links.some(l=>l.status==='conflict'&&l.conflicts.includes('kind')));
 assert.equal(JSON.stringify(f.results),raw);assert.equal(r.observationReceipts!.reduce((n,r)=>n+r.result.observations.length,0),2);assert.equal(stable(r),stable(f.project([...f.results].reverse())));
});
test('cross-kind conflict handling permits board-piece overlap, adjacent pieces and same-unit layers',async()=>{
 for(const values of [
  [[windowItem([50,50,900,900])],[item('single',[400,400,600,600],9,1)]],
  [[windowItem([200,200,300,300])],[item('single',[400,650,600,850],9,1)]],
  [[windowItem([200,200,300,300]),item('single',[200,200,300,300],9,1)]]
 ]){const f=await fixture(values),r=f.project();assert.equal(pieces(r).length,2);assert.equal(r.scanBundle!.unresolvedGroups!.length,0);}
});
test('visible group surface linking protects manual null/zero, placement and deletion on a subsequent job',async()=>{
 for(const deleted of [false,true]){
  const first=await fixture([[item('group',[200,200,300,300])]]),initial=first.project();first.session.assertions=initial.assertions;
  if(deleted)(initial.assertions[0].value as any).pieces=[];
  else{const p=pieces(initial)[0];p.quantity=0;p.readout.values.dieValue=null;p.readout.sources.dieValue=null;p.placement={areaId:'manual',x:.3,y:.4,rotation:0};}
  const next=await fixture([[item('group',[200,200,300,300],2)],[item('group',[400,400,600,600],9)]],{session:first.session,id:'surface-next'}),r=next.project();
  assert.equal(pieces(r).length,deleted?0:1);if(!deleted){assert.equal(pieces(r)[0].quantity,0);assert.equal(pieces(r)[0].readout.values.dieValue,null);assert.equal(pieces(r)[0].placement.areaId,'manual');}
 }
});
test('optional group surface provenance is shown without claiming a recovered inventory or requiring correction',async()=>{
 const f=await fixture([[item('group',[200,200,300,300])],[item('group',[400,400,600,600])]]),r=f.project();f.session.assertions=r.assertions;
 const html=renderToStaticMarkup(React.createElement(ScanObservationResults,{view:{session:f.session,pack:f.pack} as any}));assert.match(html,/가시 묶음 표면 1건/);assert.match(html,/숨은 구성과 총수량은 확인하지 않았어요/);assert(!html.includes('required'));
});
test('a later whole-only scan cannot reintroduce a previously refined group, even after child edits or deletion',async()=>{
 for(const deleted of [false,true]){
  const first=await fixture([[item('group',[100,100,900,900])],[item('single',[400,400,600,600],9)]]),initial=first.project();first.session.assertions=initial.assertions;
  if(deleted)(initial.assertions[0].value as any).pieces=[];
  else{const p=pieces(initial)[0];p.quantity=0;p.readout.values.dieValue=null;p.readout.sources.dieValue=null;}
  const next=await fixture([[item('group',[100,100,900,900])]],{session:first.session,id:'whole-later'}),r=next.project();
  assert.equal(pieces(r).length,deleted?0:1);if(!deleted){assert.equal(pieces(r)[0].quantity,0);assert.equal(pieces(r)[0].readout.values.dieValue,null);}
  assert.equal(r.scanBundle!.fusion!.refinements.length,1);assert.equal(r.scanBundle!.unresolvedGroups!.length,1);
  next.session.assertions=r.assertions;const again=await fixture([[item('group',[100,100,900,900])]],{session:next.session,id:'whole-again'}),last=again.project();assert.equal(pieces(last).length,deleted?0:1);assert.equal(last.scanBundle!.fusion!.refinements.length,1);
 }
});
test('a historical refinement does not suppress a separate neighboring group',async()=>{
 const first=await fixture([[item('group',[100,100,400,400])],[item('single',[400,400,600,600],9)]]),initial=first.project();first.session.assertions=initial.assertions;
 const next=await fixture([[item('group',[700,700,800,800])]],{session:first.session,id:'separate-group'}),r=next.project();assert.equal(pieces(r).length,2);assert.equal(r.scanBundle!.unresolvedGroups!.length,0);
});
test('a reappearing retired parent relates only its own children, not unrelated historical refinements',async()=>{
 const first=await fixture([[item('group',[100,100,200,200]),item('group',[300,300,400,400])],[item('single',[220,220,380,380],9),item('single',[620,620,780,780],3)]]),initial=first.project();first.session.assertions=initial.assertions;
 assert.equal(pieces(initial).length,2);const childA=pieces(initial)[0].id;
 const next=await fixture([[item('group',[100,100,200,200])]],{session:first.session,id:'parent-a'}),r=next.project();assert.equal(pieces(r).length,2);
 assert.equal(r.scanBundle!.unresolvedGroups!.length,1);assert.deepEqual(r.scanBundle!.unresolvedGroups![0].relatedPieceIds,[childA]);
});
test('a proven parent group clique refines as one parent rather than competing with itself',async()=>{
 const f=await fixture([[item('group',[200,200,300,300])],[item('group',[400,400,600,600])],[item('single',[420,420,580,580],9)]]),raw=JSON.stringify(f.results),r=f.project();
 assert.equal(pieces(r).length,1);assert.equal(pieces(r)[0].readout.values.dieValue,9);assert.equal(r.scanBundle!.unresolvedGroups!.length,0);
 assert.equal(r.scanBundle!.fusion!.refinements.length,2);assert.equal(new Set(r.scanBundle!.fusion!.refinements.map(r=>r.aggregateMember.unitId)).size,2);
 assert.equal(JSON.stringify(f.results),raw);assert.equal(stable(r),stable(f.project([...f.results].reverse())));assert.equal(stable(r),stable(f.project([...f.results,f.results[1]])));
});
test('different observed group quantities preserve the anchor and expose only a non-blocking conflict',async()=>{
 const f=await fixture([[item('group',[200,200,300,300],6,2)],[item('group',[400,400,600,600],6,4)]]),r=f.project();assert.equal(pieces(r).length,1);assert.equal(pieces(r)[0].quantity,2);
 const d=r.scanBundle!.fusion!.decisions.find(d=>d.fieldPath==='quantity');assert(d?.conflict);assert.equal(d.basis,'unresolved');assert.equal(d.alternativeMembers.length,1);
 f.session.assertions=r.assertions;const html=renderToStaticMarkup(React.createElement(ScanFusionNotes,{view:{session:f.session,pack:f.pack} as any}));assert.match(html,/사진 관측 · 4/);assert(!html.includes('required'));
 const unknown=await fixture([[item('group',[200,200,300,300],6,null)],[item('group',[400,400,600,600],6,4)]]),u=unknown.project();assert.equal(pieces(u)[0].quantity,null);assert(!u.scanBundle!.fusion!.decisions.some(d=>d.fieldPath==='quantity'&&d.conflict));
});
test('unknown null is not an individual or group assertion and cannot add overlapping children speculatively',async()=>{
 const f=await fixture([[item('unknown',[100,100,900,900])],[item('single',[400,400,600,600],9)]]),r=f.project();assert.equal(pieces(r).length,1);assert.equal(r.scanBundle!.fusion!.refinements.length,0);assert.equal(r.scanBundle!.unresolvedGroups!.length,1);
});
test('explicit single null quantity supports one-to-one identity without filling quantity or joining same-unit neighbors',async()=>{
 const f=await fixture([[item('single',[200,200,300,300])],[item('single',[400,400,600,600],9),item('single',[400,650,600,850],3)]]),r=f.project();assert.equal(pieces(r).length,2);assert(pieces(r).every(p=>p.quantity===null));assert.equal(pieces(r)[0].readout.values.dieValue,6);assert.equal(r.scanBundle!.fusion!.refinements.length,0);
});
test('overlapping aggregate parents, clipped crop children and missing boxes remain unresolved without losing useful base',async()=>{
 const both=await fixture([[item('group',[100,100,900,900]),item('group',[100,100,800,800])],[item('single',[400,400,600,600],9)]]),r=both.project();assert.equal(pieces(r).length,2);assert.equal(r.scanBundle!.fusion!.refinements.length,0);assert.equal(r.scanBundle!.unresolvedGroups!.length,1);
 const partial=await fixture([[item('group',[200,200,300,300])],[item('single',[380,380,620,620],9)]]),part=partial.project();assert.equal(pieces(part).length,1);assert.equal(part.scanBundle!.fusion!.refinements.length,0);assert.equal(part.scanBundle!.unresolvedGroups!.length,1);
 for(const box of [[400,0,600,300],null]){const f=await fixture([[item('group',[0,0,900,900])],[item('single',box,9)]]),p=f.project();assert.equal(pieces(p).length,1);assert.equal(p.scanBundle!.fusion!.refinements.length,0);assert.equal(p.scanBundle!.unresolvedGroups!.length,1);}
});
test('edited and deleted null-count groups cannot be replaced or resurrected by a later crop',async()=>{
 for(const deleted of [false,true]){
  const first=await fixture([[item('group',[100,100,900,900])]]),initial=first.project();first.session.assertions=initial.assertions;
  if(deleted)(initial.assertions[0].value as any).pieces=[];
  else{const p=pieces(initial)[0];p.quantity=0;p.readout.values.dieValue=null;p.readout.sources.dieValue=null;p.placement={areaId:'manual',x:.3,y:.4,rotation:0};}
  const next=await fixture([[item('group',[100,100,900,900])],[item('single',[400,400,600,600],9)]],{session:first.session,id:'later'}),r=next.project();assert.equal(pieces(r).length,deleted?0:1);if(!deleted){assert.equal(pieces(r)[0].quantity,0);assert.equal(pieces(r)[0].readout.values.dieValue,null);assert.equal(pieces(r)[0].placement.areaId,'manual');}assert.equal(r.scanBundle!.fusion!.refinements.length,0);assert(r.scanBundle!.unresolvedGroups!.length);
 }
});
test('unit claims do not authorize cross-source, owner, epoch or selected-area links',async()=>{
 const f=await fixture([[item('single',[200,200,300,300])],[item('single',[400,400,600,600],9)]],{detail:true});assert.equal(pieces(f.project()).length,1);assert.equal(f.project().scanBundle!.unresolvedGroups!.length,1);
 for(const key of ['ownerId','captureEpoch','partition']){const changed=structuredClone(f.results);(changed[1].observationReceipts![0].request.scope as any)[key]='other';assert.throws(()=>f.project(changed));}
 const area=structuredClone(f.results);area[1].observationReceipts![0].request.areaId='other';assert.throws(()=>f.project(area));
});
test('optional source display distinguishes group claims from physical count and adds no confirmation gate',async()=>{
 const f=await fixture([[item('group',[100,100,900,900])],[item('single',[400,400,600,600],9)]]),r=f.project();f.session.assertions=r.assertions;
 const html=renderToStaticMarkup(React.createElement(ScanObservationResults,{view:{session:f.session,pack:f.pack} as any}));assert.match(html,/개별 주장 1건/);assert.match(html,/묶음 주장 1건/);assert.match(html,/실물 총수나 전체 판독을 뜻하지 않아요/);assert.match(html,/수정 없이 저장할 수 있어요/);assert(!html.includes('required'));
});
