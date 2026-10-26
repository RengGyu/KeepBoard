import type {GamePack} from '../shared/types';
import type {GenericPiece} from '../shared/genericRecord';
import {runtimeBinding} from '../shared/gameEssentials';
export interface BoardArea {areaId:string;label:string;fieldKeys:string[];componentIds:string[];scope:string;visibility:string;topology:string;template:string;status:string;geometryStatus:string;artComponentId:string|null}
export interface BoardVisual {gameId:string;editionId:string;sourceSHA:string;status:string;areas:BoardArea[];fidelityPending:{componentId:string;findingId:string;status:string}[]}
let catalog:Promise<BoardVisual[]>|undefined;
export function loadBoardVisuals(){return catalog??=fetch('/game-art/boards/mapping.json').then(async r=>{if(!r.ok)throw new Error('기록판을 불러오지 못했어요.');return (await r.json()).games as BoardVisual[];}).catch(e=>{catalog=undefined;throw e;});}
export function compatibleBoard(pack:GamePack,visual?:BoardVisual){return !!visual&&visual.gameId===pack.runtime?.source.gameId&&visual.editionId===pack.runtime.source.editionId&&visual.sourceSHA===pack.runtime.source.sha256;}
export function boardAreas(pack:GamePack,field:string,visual?:BoardVisual):BoardArea[]{
 const b=runtimeBinding(pack,field);if(!b||b.editor!=='component-catalog')return [];
 const safe=b.visibility==='public'&&['public','player'].includes(b.scope)||b.visibility==='owner'&&b.scope==='player';if(!safe)return [];
 return b.areaIds.map(areaId=>{const known=compatibleBoard(pack,visual)?visual!.areas.find(a=>a.areaId===areaId&&a.fieldKeys.includes(b.sourceId)&&a.scope===b.scope&&a.visibility===b.visibility&&a.status!=='not-needed'):undefined;return known?{...known,componentIds:known.componentIds.filter(c=>b.componentIds.includes(c))}:{areaId,label:b.label,fieldKeys:[field],componentIds:b.componentIds,scope:b.scope,visibility:b.visibility,topology:'free',template:'free-table',status:'source-pending',geometryStatus:'manual-surface',artComponentId:null};});
}
export function visiblePlacement(piece:GenericPiece,area:BoardArea,compatible:boolean){const p=piece.placement;return compatible&&p&&p.areaId===area.areaId&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&[0,90,180,270].includes(p.rotation)?p:undefined;}
export function pendingArt(visual:BoardVisual|undefined,componentId:string|null){return !!componentId&&!!visual?.fidelityPending.some(f=>f.componentId===componentId);}

export const RECORD_SURFACE_INSET=40;
export function recordSurfacePoint(x:number,y:number,width:number,height:number){return {x:Math.max(0,Math.min(1,(x-RECORD_SURFACE_INSET)/Math.max(1,width-2*RECORD_SURFACE_INSET))),y:Math.max(0,Math.min(1,(y-RECORD_SURFACE_INSET)/Math.max(1,height-2*RECORD_SURFACE_INSET)))};}
export function recordSurfaceCenter(x:number,y:number,width:number,height:number){return {x:RECORD_SURFACE_INSET+x*Math.max(1,width-2*RECORD_SURFACE_INSET),y:RECORD_SURFACE_INSET+y*Math.max(1,height-2*RECORD_SURFACE_INSET)};}
