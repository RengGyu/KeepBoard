import type {GenericPiece} from '../../shared/genericRecord';
import type {GamePack} from '../../shared/types';
import type {ObservationRequest,ObservationResult,LiteralObservation} from '../../shared/lightweightRecognition';
import type {StoredSpatialPiece} from '../../shared/spatialObservation';
import {spatialArea} from '../../shared/spatialDefinition';
import {mapObservationRegion,type PhotoTransform} from '../../shared/photoGeometry';
/** One literal -> one real ID. Canonical coordinates come from the pinned slot, never the source bbox. */
export function storedSpatialFor(request:ObservationRequest,result:ObservationResult,o:LiteralObservation,ids:Record<string,string>,transforms:PhotoTransform[],sourceImageSHA?:string):StoredSpatialPiece|undefined{
 const spatial=result.spatial,contract=request.spatial;if(!spatial||!contract)return;
 const p=spatial.placements.find(p=>p.observationRef===o.ref)??null,originalBoard=spatial.boardInstances.find(b=>b.ref===p?.boardInstanceRef),board=originalBoard?structuredClone(originalBoard):null;
 const prefix=(ref:string)=>request.taskId+':'+ref;
 if(board){board.ref=prefix(board.ref);if(board.sourceRegion)board.sourceRegion=mapObservationRegion({...o,imageIndex:board.imageIndex,panelRef:board.panelRef,bbox:board.sourceRegion},request,transforms);}
 const known=originalBoard?.templateFrameId&&p?.areaId&&p.namespace==='area-slots'?spatialArea(contract,originalBoard.templateFrameId,p.areaId):undefined;
 const area=known?.area,frame=known?.frame,sourceAreaId=area?.sourceAreaIds.length===1?area.sourceAreaIds[0]:null;
 const resolved=area&&frame&&sourceAreaId?{frameId:frame.id,frameSHA:frame.sourceSHA,placementFrame:frame.placementFrame,templateAreaId:area.id,sourceAreaId,fieldKey:area.fieldKey,viewBox:structuredClone(frame.viewBox),anchor:area.addresses.find(a=>a.address===p?.anchorAddress)??null,covered:p?.coveredAddresses===null?null:(p?.coveredAddresses??[]).map(id=>area.addresses.find(a=>a.address===id)!).filter(Boolean),requiresOwner:area.scope==='player'}:null;
 return {version:'spatial-piece-v1',source:{...(request.readingTarget?{readingTarget:structuredClone(request.readingTarget)}:{}),taskId:request.taskId,evidenceId:request.images[o.imageIndex].evidenceId,imageSHA:sourceImageSHA??request.images[o.imageIndex].sha256,captureEpoch:request.scope.captureEpoch,photoDefinitionSHA:request.definitionSHA,spatialDefinitionSHA:contract.spatialDefinitionSHA,runtimeDefinitionSHA:contract.definitionSHA,schemaSHA256:contract.schemaSHA256,responseSchemaSHA:contract.responseSchemaSHA,sourceSHA:request.sourceSHA,partition:request.readingTarget?.mode==='public-scene'&&area?.scope==='player'?'player_public':request.scope.partition,captureAreaId:request.areaId,ownerId:request.scope.ownerId},observationRef:o.ref,board,placement:p?{...structuredClone(p),boardInstanceRef:p.boardInstanceRef?prefix(p.boardInstanceRef):null}:null,resolved,boundOwnerId:request.scope.ownerId,relations:spatial.relations.filter(r=>r.fromRef===o.ref||r.toRef===o.ref).map(r=>({...r,fromId:ids[r.fromRef]??prefix(r.fromRef),toId:ids[r.toRef]??prefix(r.toRef)}))};
}
export function spatialDestination(pack:GamePack,piece:GenericPiece,requestedFields:string[],ownerId?:string){
 const s=piece.spatial,q=s?.resolved;if(!s||!q||q.requiresOwner&&!ownerId)return;
 const f=pack.fields.find(f=>f.key===q.fieldKey);return f&&requestedFields.includes(f.key)&&(f.scope==='player'?!!ownerId:f.scope==='public'&&!ownerId)&&f.visibility===(s.source.partition==='owner_private'?'owner':'public')?f.key:undefined;
}
