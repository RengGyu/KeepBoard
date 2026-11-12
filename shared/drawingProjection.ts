import type {Assertion,Evidence} from './types';
import type {GenericPiece} from './genericRecord';
import type {RummikubScene,RummikubTile} from './rummikub';
import {mapObservationRegion} from './photoGeometry';
import {spatialView,publicSpatialView,type SpatialBoardView} from './spatialPlacement';
import type {ObservationBox,ObservationReceipt,LiteralObservation} from './lightweightRecognition';
export type DrawingPosition=
 |{space:'manual';areaId:string;x:number;y:number;rotationDegrees:number}
 |{space:'group';groupId:string;index:number}
 |{space:'board';instanceKey:string;frameId:string;frameSHA:string;areaId:string;anchorSlotId:string|null;coveredSlotIds:string[];x:number|null;y:number|null;rotationDegrees:number|null;reflected:boolean|null}
 |{space:'photo';evidenceId:string;sourceSHA:string;box:ObservationBox;rotationDegrees:number|null}
 |{space:'unlocated'};
export interface DrawingItem {contextKey?:string;assertionId:string;pieceId:string;position:DrawingPosition;value:GenericPiece|RummikubTile}
const validBox=(b:ObservationBox|null|undefined):b is ObservationBox=>!!b&&[b.x,b.y,b.width,b.height].every(Number.isFinite)&&b.x>=0&&b.y>=0&&b.width>0&&b.height>0&&b.x+b.width<=1.00000001&&b.y+b.height<=1.00000001;
const sameBox=(a:ObservationBox,b:ObservationBox)=>['x','y','width','height'].every(k=>Math.abs(a[k as keyof ObservationBox]-b[k as keyof ObservationBox])<1e-9);
/** Stored regions are already source-mapped. Receipts prove their source; never apply a crop twice. */
function photoPosition(a:Assertion,id:string,region:ObservationBox|null|undefined,evidence:readonly Evidence[]):DrawingPosition{
 if(!validBox(region))return {space:'unlocated'};
 const matches:Extract<DrawingPosition,{space:'photo'}>[]=[];
 for(const r of a.observationReceipts??[])for(const [ref,pieceId]of Object.entries(r.componentRefs)){
  if(pieceId!==id)continue;const o=r.result.observations.find(o=>o.ref===ref),image=o&&r.request.images[o.imageIndex];if(!o||!image)continue;
  const e=evidence.find(e=>e.id===image.evidenceId&&e.kind==='photo');if(!e||!a.evidenceIds.includes(e.id)||e.ownerId&&e.ownerId!==a.ownerId)continue;
  try{const mapped=mapObservationRegion(o,r.request,r.transforms);if(!mapped||!sameBox(region,mapped))continue;matches.push({space:'photo',evidenceId:e.id,sourceSHA:r.sourceImageSHA??r.transforms.find(t=>t.transformId===image.transformId)?.sourceSHA??image.sha256,box:{...region},rotationDegrees:o.rotationDegrees});}catch{/* invalid provenance remains unlocated */}
 }
 const unique=[...new Map(matches.map(p=>[JSON.stringify(p),p])).values()];return unique.length===1?unique[0]:{space:'unlocated'};
}
/** Display partition only: never a saved group, owner assignment, or new canonical location. */
function photoContext(a:Assertion,r:ObservationReceipt,o:LiteralObservation){
 const p=r.result.spatial?.placements.find(p=>p.observationRef===o.ref),board=r.result.spatial?.boardInstances.find(b=>b.ref===p?.boardInstanceRef),frame=r.request.spatial?.frames.find(f=>f.id===board?.templateFrameId);
 const area=o.sourceAreaId??(r.request.readingTarget?.mode==='public-scene'?null:r.request.areaId);
 return JSON.stringify([a.ownerId??null,a.field,area,board?[r.request.taskId,board.ref,frame?.sourceSHA??null]:null,r.request.scope?.captureEpoch??null,r.request.definitionSHA??null]);
}
function contextForPhoto(a:Assertion,id:string,position:DrawingPosition):string|undefined{
 if(position.space!=='photo')return;
 const contexts=new Set<string>();
 for(const r of a.observationReceipts??[])for(const [ref,pieceId]of Object.entries(r.componentRefs)){
  if(pieceId!==id)continue;const o=r.result.observations.find(o=>o.ref===ref),image=o&&r.request.images[o.imageIndex];if(!o||!image||image.evidenceId!==position.evidenceId)continue;
  try{const mapped=mapObservationRegion(o,r.request,r.transforms),sha=r.sourceImageSHA??r.transforms.find(t=>t.transformId===image.transformId)?.sourceSHA??image.sha256;if(!mapped||!sameBox(mapped,position.box)||sha!==position.sourceSHA)continue;}catch{continue;}
  contexts.add(photoContext(a,r,o));
 }
 return contexts.size===1?[...contexts][0]:JSON.stringify([a.ownerId??null,a.field,'unresolved-context',id]);
}
export type PhotoDrawingGeometry=Pick<DrawingItem,'assertionId'|'pieceId'|'contextKey'>&{position:Extract<DrawingPosition,{space:'photo'}>};
/** Immutable receipt geometry is a layout reference, NOT a list of live/editable objects.
 * Reconstruct after JSON reopen; keep deleted/manual IDs only in this non-rendered reference.
 * The caller supplies the actual field binding, because a receipt's componentRefs can span fields.
 */
export function photoDrawingReference(a:Assertion,evidence:readonly Evidence[],binding:{componentIds:readonly string[];areaIds?:readonly string[]}|undefined):PhotoDrawingGeometry[]{
 if(!binding)return [];
 const byId=new Map<string,PhotoDrawingGeometry[]>();
 for(const r of a.observationReceipts??[]){
  if(!r.request.scope||(r.request.scope.ownerId??null)!==(a.ownerId??null))continue;
  const observations=new Map(r.result.observations.map(o=>[o.ref,o]));
  for(const [ref,pieceId]of Object.entries(r.componentRefs)){
   const o=observations.get(ref),image=o&&r.request.images[o.imageIndex];if(!o||!image||!o.componentId||!binding.componentIds.includes(o.componentId))continue;
   const area=o.sourceAreaId??(r.request.readingTarget?.mode==='public-scene'?null:r.request.areaId);
   if(binding.areaIds&&(!area||!binding.areaIds.includes(area)))continue;
   const e=evidence.find(e=>e.id===image.evidenceId&&e.kind==='photo');
   if(!e||!a.evidenceIds.includes(e.id)||e.captureEpoch!==r.request.scope.captureEpoch||e.ownerId&&e.ownerId!==a.ownerId||e.scope==='player'&&(!a.ownerId||e.ownerId!==a.ownerId))continue;
   try{
    const transform=image.transformId?r.transforms.find(t=>t.transformId===image.transformId&&t.inputSHA===image.sha256):undefined;
    if(image.transformId&&!transform||r.sourceImageSHA&&transform&&r.sourceImageSHA!==transform.sourceSHA)continue;
    const sourceSHA=r.sourceImageSHA??transform?.sourceSHA??image.sha256,box=mapObservationRegion(o,r.request,r.transforms);
    if(!/^[a-f0-9]{64}$/.test(sourceSHA)||!validBox(box))continue;
    const geometry:PhotoDrawingGeometry={assertionId:a.id,pieceId,contextKey:photoContext(a,r,o),position:{space:'photo',evidenceId:e.id,sourceSHA,box,rotationDegrees:o.rotationDegrees}};
    byId.set(pieceId,[...(byId.get(pieceId)??[]),geometry]);
   }catch{/* Missing or contradictory source geometry cannot become a stable reference. */}
  }
 }
 // Repeated receipts are harmless. Competing source boxes/contexts for one ID are not guessed.
 return [...byId.values()].flatMap(all=>{const unique=[...new Map(all.map(g=>[JSON.stringify(g),g])).values()];return unique.length===1?unique:[];}).sort((a,b)=>a.pieceId<b.pieceId?-1:a.pieceId>b.pieceId?1:0);
}
export function projectGenericDrawing(assertion:Assertion,pieces:readonly GenericPiece[],evidence:readonly Evidence[],board?:SpatialBoardView|null):DrawingItem[]{
 return pieces.map(p=>{let position:DrawingPosition={space:'unlocated'};
  const m=p.placement,area=board?.areas.find(a=>a.id===m?.areaId&&a.field===assertion.field&&(!a.accepts?.length||!!p.componentId&&a.accepts.includes(p.componentId)));
  if(m&&area&&[m.x,m.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1)&&(!m.layoutVariant||m.layoutVariant===(board?.variant??'base')))position={space:'manual',areaId:m.areaId,x:m.x,y:m.y,rotationDegrees:m.rotation};
  else {const s=p.spatial,q=s?.resolved,v=spatialView(p,board,assertion.field)??(!assertion.ownerId?publicSpatialView(p,board,assertion.field):undefined);
   if(s&&q&&v&&(v.anchorSlotId!==null||v.covered.length))position={space:'board',instanceKey:JSON.stringify([s.source.taskId,v.boardInstanceRef,q.frameSHA]),frameId:q.frameId,frameSHA:q.frameSHA,areaId:v.templateAreaId,anchorSlotId:v.anchorSlotId,coveredSlotIds:v.covered.map(c=>c.slotId),x:v.x,y:v.y,rotationDegrees:v.rotation,reflected:v.reflected};
   else position=photoPosition(assertion,p.id,p.region,evidence);
  }
  return {assertionId:assertion.id,pieceId:p.id,position,value:p,...(position.space==='photo'?{contextKey:contextForPhoto(assertion,p.id,position)}:{})};
 });
}
export function projectRummikubDrawing(assertion:Assertion,scene:RummikubScene,evidence:readonly Evidence[]):DrawingItem[]{
 const seen=new Set<string>(),items:DrawingItem[]=[];
 for(const g of scene.groups)g.tiles.forEach((tile,index)=>{if(!seen.has(tile.id)){seen.add(tile.id);items.push({assertionId:assertion.id,pieceId:tile.id,value:tile,position:{space:'group',groupId:g.id,index}});}});
 for(const tile of scene.loose)if(!seen.has(tile.id)){seen.add(tile.id);const position=photoPosition(assertion,tile.id,tile.region,evidence);items.push({assertionId:assertion.id,pieceId:tile.id,value:tile,position,...(position.space==='photo'?{contextKey:contextForPhoto(assertion,tile.id,position)}:{})});}
 return items;
}
