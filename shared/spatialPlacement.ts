import type {GenericPiece} from './genericRecord';
import type {SpatialAddress} from './spatialDefinition';
export interface SpatialBoardView {variant?:string;placementFrame?:string;assetSHA?:string;viewBox:[number,number,number,number];areas:{id:string;field:string;accepts?:string[];slots:{id:string;x:number;y:number;w:number;h:number}[]}[]}
export const spatialRotation=(p:GenericPiece)=>p.spatial?(Object.hasOwn(p.spatial,'manualRotationDegrees')?p.spatial.manualRotationDegrees:p.spatial.placement?.boardRotationDegrees)??null:p.placement?.rotation??null;
export const spatialReflection=(p:GenericPiece)=>p.spatial?(Object.hasOwn(p.spatial,'manualReflected')?p.spatial.manualReflected:p.spatial.placement?.reflected)??null:null;
/** A legacy saved observation is never reinterpreted under a changed board file or other person's template. */
function view(p:GenericPiece,board:SpatialBoardView|null|undefined,field:string,instanceRef?:string,publicDisplay=false){
 const s=p.spatial,q=s?.resolved;if(!s||!q||!board||s.manualOverride||q.fieldKey!==field||q.requiresOwner&&!s.boundOwnerId&&!publicDisplay||q.frameId!==(board.variant??'base')||q.placementFrame!==(board.placementFrame??'base')||!board.assetSHA||q.frameSHA!==board.assetSHA||JSON.stringify(q.viewBox)!==JSON.stringify(board.viewBox)||instanceRef&&s.board?.ref!==instanceRef)return;
 const area=board.areas.find(a=>a.id===q.templateAreaId&&a.field===field&&(!a.accepts?.length||!!p.componentId&&a.accepts.includes(p.componentId)));if(!area)return;
 const anchor=Object.hasOwn(s,'manualAnchor')?s.manualAnchor:q.anchor,covered=Object.hasOwn(s,'manualCovered')?s.manualCovered:q.covered;
 const same=(s:SpatialAddress)=>area.slots.some(t=>t.id===s.slotId&&t.x===s.x&&t.y===s.y&&t.w===s.w&&t.h===s.h);
 if(anchor&&!same(anchor)||covered?.some(s=>!same(s)))return;
 const [vx,vy,vw,vh]=q.viewBox;
 return {areaId:q.sourceAreaId,templateAreaId:q.templateAreaId,anchorSlotId:anchor?.slotId??null,covered:covered??[],x:anchor?(anchor.x+anchor.w/2-vx)/vw:null,y:anchor?(anchor.y+anchor.h/2-vy)/vh:null,rotation:spatialRotation(p),reflected:spatialReflection(p),boardInstanceRef:s.board?.ref??null};
}

/** Storage/ownership destination contract remains strict. */
export function spatialView(p:GenericPiece,board:SpatialBoardView|null|undefined,field:string,instanceRef?:string){return view(p,board,field,instanceRef);}
/** Display-only instance context; never a player assignment or authorization to write a player field. */
export function publicSpatialView(p:GenericPiece,board:SpatialBoardView|null|undefined,field:string){
 const s=p.spatial;if(!s||s.source.partition!=='player_public'||s.source.ownerId!==null||s.boundOwnerId!==null||!s.board?.ref||!s.source.taskId)return;
 return view(p,board,s.resolved?.fieldKey??field,s.board.ref,true);
}
