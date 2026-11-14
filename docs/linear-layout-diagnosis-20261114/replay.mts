/** Free, in-memory replay of frozen inputs through current pure product functions.
 * No server, settings, provider, store, network, build, or product writes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadFixtures} from '../restoration-readability-generalization-20261113/sol2/fixtures.mts';
import {withRestoration} from '../../gamepacks/catalog.ts';
import {projectRestorationScene} from '../../shared/sceneProjection.ts';
import {projectGenericDrawing,projectRummikubDrawing} from '../../shared/drawingProjection.ts';
import {layoutDrawingItems} from '../../shared/drawingLayout.ts';
import {estimateBoardStructure} from '../../shared/estimatedBoardStructure.ts';
import {layoutRestorationScene} from '../../shared/sceneLayout.ts';
import {selectedClaim} from '../../shared/restorationScene.ts';
import {sceneDigest} from '../../shared/restorationIdentity.ts';
import {assembleObservations} from '../../server/ai/observationAssembly.ts';
import {expandCompactTerraPayload} from '../../server/ai/terraCompact.ts';
import {encodeSession,decodeSession} from '../../server/sessionCodec.ts';

const out=import.meta.dirname,root=path.resolve(out,'../..');
const read=async(p:string)=>JSON.parse(await fs.readFile(path.resolve(root,p),'utf8'));
const tally=(xs:any[])=>Object.fromEntries([...new Set(xs)].map(k=>[String(k),xs.filter(x=>x===k).length]));
const pieces=(a:any)=>a.value?.pieces??[...(a.value?.groups??[]).flatMap((g:any)=>g.tiles),...(a.value?.loose??[])];
const live=(s:any)=>s.assertions.filter((a:any)=>a.status==='accepted'&&a.basis!=='rule'&&pieces(a).length);
const drawing=(s:any)=>live(s).flatMap((a:any)=>a.value.version==='rummikub-classic-v1'?projectRummikubDrawing(a,a.value,s.evidence):projectGenericDrawing(a,a.value.pieces,s.evidence));
const receipts=(s:any)=>[...new Map(live(s).flatMap((a:any)=>a.observationReceipts??[]).map((r:any)=>[r.request.taskId,r])).values()] as any[];
const fixtures:any[]=(await loadFixtures()).map(f=>({id:f.gameId,session:f.view.session,pack:f.view.pack,definition:null,source:'docs/real-photo-review-20261110/cases/'+f.id,original:f}));
for(const id of ['sagrada','lost-cities','seven-wonders']){
 const source='docs/pro-review-20261113/data/cases/'+id+'-baseline.json',d=await read(source),pack=await read('docs/pro-review-20261113/data/packs/'+id+'.json');
 fixtures.push({id,source,pack,session:{id:d.caseId,turnInstanceId:d.assertions[0].turnInstanceId,players:[],preservations:[],snapshots:[],notes:{},evidence:d.photos,assertions:d.assertions.map((a:any)=>{const {observationReceiptRefs,...v}=a;return {...v,observationReceipts:observationReceiptRefs.map((i:number)=>d.receipts[i])};})},provenance:d.provenance});
}
export {fixtures,read,drawing,receipts};
const reports:any[]=[];
for(const f of fixtures){
 const s=f.session,pack=withRestoration(f.pack),before=sceneDigest({s,pack}),rs=receipts(s),items=drawing(s),scene=projectRestorationScene({session:s,pack}),estimated=estimateBoardStructure({gameId:f.id,items:items.filter(i=>(i.value as any).componentId),assertions:live(s),evidence:s.evidence});
 const sizes=new Map(scene.regions.map(r=>{const groups=r.groupIds.map(id=>scene.groups.find(g=>g.id===id)!),grid=groups.some(g=>!!g.presentation?.grid),wide=Math.max(1,...groups.map(g=>g.presentation?.grid?.columns??g.entityIds.length));return [r.id,{width:Math.max(grid?360:320,wide*112+40),height:Math.max(160,groups.length*150+(grid?220:0)+70)}];}));
 const macro=layoutRestorationScene(scene,sizes);
 const bounds=rs[0]?.request.images[0],aspect=bounds?bounds.width/bounds.height:1,photoLayout=layoutDrawingItems(items,{sourceAspectRatio:aspect});
 const observations=rs.flatMap(r=>r.result.observations),bound=scene.entities.flatMap(e=>e.bindings),expected=live(s).flatMap((a:any)=>pieces(a).map((p:any)=>JSON.stringify([a.id,p.id]))).sort();
 assert.deepEqual(bound.map(b=>JSON.stringify([b.assertionId,b.pieceId])).sort(),expected);
 assert.equal(sceneDigest({s,pack}),before,'pure projection must not mutate frozen input');
 const serializable=JSON.parse(JSON.stringify({...s,restoration:{version:'restoration-state-v1',partitions:{public:scene}}}));
 const roundtrip=decodeSession(JSON.parse(JSON.stringify(encodeSession(serializable))));
 assert.deepEqual(roundtrip,serializable,'pure storage codec must preserve source receipts, values and derived scene');
 let normalization:any=null;
 if(f.original){
  const d=await read(f.source+'/request.json'),decoded=f.original.decoded;
  const a=assembleObservations({request:d.request,result:decoded.raw,definition:d.definition,pack,turnInstanceId:s.turnInstanceId,reader:d.identity,transforms:d.transforms,hostedWire:decoded.hostedWire});
  const fresh=a.observationReceipts![0],stored=rs[0],failures:any[]=[];
  for(const o of stored.result.observations){const oldAssertion=live(s).find((a:any)=>pieces(a).some((p:any)=>p.id===stored.componentRefs[o.ref])),newAssertion=a.assertions.find(a=>pieces(a).some((p:any)=>p.id===fresh.componentRefs[o.ref]));
   const oldPiece=oldAssertion&&pieces(oldAssertion).find((p:any)=>p.id===stored.componentRefs[o.ref]),newPiece=newAssertion&&pieces(newAssertion).find((p:any)=>p.id===fresh.componentRefs[o.ref]);
   const strip=(p:any)=>{if(!p)return null;const {id,...rest}=p;return rest;};
   if(sceneDigest(strip(oldPiece))!==sceneDigest(strip(newPiece))||oldAssertion?.field!==newAssertion?.field)failures.push(o.ref);
  }
  const native=await read(f.source+'/native.json'),texts=native.output.filter((v:any)=>v.type==='message').flatMap((v:any)=>v.content.filter((c:any)=>c.type==='output_text').map((c:any)=>c.text)),wire=JSON.parse(texts.join(''));
  const expanded=expandCompactTerraPayload(wire,d.request,d.definition,d.identity.adapterVersion);
  assert.deepEqual(expanded,decoded.hostedWire.items,'current native compact expansion must equal stored expanded rows');
  normalization={wireKeys:Object.keys(wire),nativeOutputSHA:sceneDigest(wire),nativeExpansionEqualsStored:true,rawEqualsStoredResult:sceneDigest(decoded.raw)===sceneDigest(stored.result),wireItemCount:decoded.hostedWire.items.length,wireDeferred:decoded.hostedWire.deferred,wirePhysicalUnits:tally(decoded.hostedWire.items.map((v:any)=>v.physicalUnit)),normalizedFieldValueGeometryEqualExceptGeneratedIds:failures.length===0,mismatchObservationRefs:failures};
 }
 const grouped=scene.groups.flatMap(g=>g.entityIds),groupedAll=scene.entities.every(e=>grouped.includes(e.id));
 assert(groupedAll&&new Set(grouped).size===grouped.length);
 const report={game:f.id,source:f.source,provenance:f.provenance??'2026-11-10 frozen original request/response/view',pack:{id:pack.id,version:pack.version,sourceSHA:pack.runtime?.source.sha256,storedHasProfile:!!f.pack.restorationProfile,exactCatalogProfileAttached:!!pack.restorationProfile,profileSHA:scene.profile.pin.profileSHA,regions:scene.profile.regions.map(r=>({id:r.id,family:r.family,fields:r.fieldKeys,topology:r.topology,anchor:r.anchor,repeat:r.repeat}))},
 requests:rs.map(r=>({taskId:r.request.taskId,area:r.request.areaId,readingTarget:r.request.readingTarget??null,readMode:r.request.readMode??null,spatial:!!r.request.spatial,scene:!!r.request.scene,allowedComponents:r.request.allowedComponents,allowedPropertyIds:r.request.allowedPropertyIds})),
 raw:{observations:observations.length,components:tally(observations.map(o=>o.componentId)),sourceAreas:tally(observations.map(o=>o.sourceAreaId??null)),bbox:observations.filter(o=>o.bbox).length,rotations:observations.filter(o=>o.rotationDegrees!==null).length,spatialBoards:rs.reduce((n,r)=>n+(r.result.spatial?.boardInstances.length??0),0),spatialPlacements:rs.reduce((n,r)=>n+(r.result.spatial?.placements.length??0),0),spatialRelations:rs.reduce((n,r)=>n+(r.result.spatial?.relations.length??0),0),scene:rs.filter(r=>r.result.scene).length,properties:Object.fromEntries([...new Set(observations.flatMap(o=>Object.keys(o.properties)))].map(k=>[k,tally(observations.flatMap(o=>o.properties[k]?[o.properties[k].state]:[]))])),quantityGreaterThanOne:observations.filter(o=>o.quantity>1).map(o=>({ref:o.ref,component:o.componentId,quantity:o.quantity})),unknownQuantity:observations.filter(o=>o.quantity===null).length},normalization,
 stored:{objects:items.length,fields:live(s).map((a:any)=>({id:a.id,field:a.field,objects:pieces(a).length})),spatialResolved:items.filter(i=>(i.value as any).spatial?.resolved).length,manualPlacements:items.filter(i=>(i.value as any).placement).length,spaces:tally(items.map(i=>i.position.space)),codecRoundtripPreservesJSON:true,codecScope:'in-memory encode/JSON/decode; no HTTP, disk store, commit or resume'},
 estimated:{groups:estimated.groups.length,retained:estimated.retained.length,unassignedReasons:tally(estimated.unassigned.map(u=>u.reason)),placements:estimated.placements.length},
 scene:{entities:scene.entities.length,boundObjects:bound.length,geometryEntities:scene.entities.filter(e=>e.geometry?.length).length,roleValues:tally(scene.entities.map(e=>e.observedRole)),groups:scene.groups.map(g=>({id:g.id,count:g.entityIds.length,family:g.family,role:selectedClaim(g.role)??null,board:selectedClaim(g.boardMembership)??null,presentation:g.presentation??null,physicalOrder:g.physicalOrder})),regions:scene.regions.map(r=>({id:r.id,kind:r.kind,label:r.label,recipe:r.recipeId,board:r.boardEntityId,groups:r.groupIds.length})),retained:scene.entities.filter(e=>e.presentation?.status==='retained').length,cells:scene.entities.filter(e=>e.presentation?.cell).length,relations:tally(scene.relations.map(r=>r.kind)),renderers:scene.plan.panels.map(p=>p.renderer),macro,allLiveIdsUnique:true},
 unusedPhotoFallback:{rows:photoLayout.rows.length,groups:photoLayout.groups.length,tiles:photoLayout.tiles.length,retained:photoLayout.retained.length,rowSizes:photoLayout.rows.map(r=>r.members.length),width:photoLayout.width,height:photoLayout.height,meaning:'Existing pure photo-row function only; not physical/semantic truth and not current generic scene UI'},
 trace:observations.slice(0,2).map(o=>{const r=rs.find(r=>r.result.observations.some((x:any)=>x.ref===o.ref))!,pieceId=r.componentRefs[o.ref],a=live(s).find((a:any)=>pieces(a).some((p:any)=>p.id===pieceId)),entity=scene.entities.find(e=>e.bindings.some(b=>b.assertionId===a?.id&&b.pieceId===pieceId)),group=scene.groups.find(g=>g.entityIds.includes(entity?.id??''));return {observationRef:o.ref,bbox:o.bbox,sourceAreaId:o.sourceAreaId??null,requestArea:r.request.areaId,assertionId:a?.id,field:a?.field,pieceId,entityId:entity?.id,observedRole:entity?.observedRole,groupId:group?.id,presentation:entity?.presentation};}),inputUnchanged:true};
 assert.equal(sceneDigest({s,pack}),before,'all replay steps must preserve frozen input');
 reports.push(report);
}
await fs.writeFile(path.join(out,'replay-results.json'),JSON.stringify({codeBase:'7c921e25e096a7f5b4f4f2645eb2f6023da13651',providerCalls:0,scope:'pure current code and frozen saved inputs; not new image recognition or measured accuracy',cases:reports},null,2)+'\n');
console.log(JSON.stringify(reports.map(r=>({game:r.game,objects:r.stored.objects,sourceAreas:r.raw.sourceAreas,profile:r.pack.exactCatalogProfileAttached,groups:r.scene.groups.length,regions:r.scene.regions.length,cells:r.scene.cells,retained:r.scene.retained,fallbackRows:r.unusedPhotoFallback.rows,normalizedPreserved:r.normalization?.normalizedFieldValueGeometryEqualExceptGeneratedIds})),null,2));
