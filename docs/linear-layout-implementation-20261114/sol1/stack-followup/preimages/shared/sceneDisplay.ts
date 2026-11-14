import type {Assertion,Evidence,GamePack} from './types';
import type {GenericPiece,GenericRecord} from './genericRecord';
import type {SceneEntity,SceneGroup,ScenePartitionState,LivePieceRef} from './restorationScene';
import {projectGenericDrawing,type DrawingItem} from './drawingProjection';
import type {SceneBoardContext} from './sceneProjection';
import {carcassonneLayout} from './readouts/carcassonneLayout';
import {layoutDrawingItems} from './drawingLayout';

/** Display-only inputs. The caller loads the exact asset; this resolver never fetches or writes claims. */
export interface SceneDisplayBoardContext extends SceneBoardContext {manualLayoutTags?:readonly string[]}
export type SceneDisplayKind='native-record'|'canonical-board'|'manual-board'|'typed-map'|'relation-layout'|'estimated-structure'|'photo-rows'|'unlocated';
export interface SceneDisplayMember {entityId:string;ref:LivePieceRef;piece?:GenericPiece;drawing?:DrawingItem}
export interface SceneDisplayPart {id:string;regionId:string;groupId:string;kind:SceneDisplayKind;members:SceneDisplayMember[];boardContext?:SceneDisplayBoardContext;tileSize?:{width:number;height:number};topologyKind?:string;fallbackReason?:string;size:{width:number;height:number}}
export const sceneDisplayKey=(ref:Pick<LivePieceRef,'assertionId'|'pieceId'>)=>JSON.stringify([ref.assertionId,ref.pieceId]);
const record=(a:Assertion|undefined)=>{const r=a?.value as GenericRecord|undefined;return r?.version==='game-component-record-v1'?r:undefined;};
const selected=(claim:{status:string;chosen?:unknown})=>claim.status==='selected';
const validBox=(p:DrawingItem['position'])=>p.space==='photo'&&!!p.sourceSHA&&[p.box.x,p.box.y,p.box.width,p.box.height].every(Number.isFinite)&&p.box.width>0&&p.box.height>0&&p.box.x>=0&&p.box.y>=0&&p.box.x+p.box.width<=1.00000001&&p.box.y+p.box.height<=1.00000001;
function structured(g:SceneGroup,e:SceneEntity){return !!g.presentation?.grid||!!g.presentation?.slots.length&&e.presentation?.slot!==null&&e.presentation?.slot!==undefined||e.presentation?.status==='placed';}

/** Selects existing adapters by usable evidence, never by family name or expected inventory. */
export function resolveSceneDisplay({scene,assertions,evidence,pack,boardContexts=[]}:{scene:ScenePartitionState;assertions:readonly Assertion[];evidence:readonly Evidence[];pack:GamePack;boardContexts?:readonly SceneDisplayBoardContext[]}){
 const contexts=boardContexts.filter(c=>c.packId===pack.id&&c.packVersion===pack.version&&c.sourceSHA===(pack.runtime?.source.sha256??null)),parts:SceneDisplayPart[]=[],consumed=new Set<string>(),unresolved:{entityId:string;reason:string}[]=[];
 const assertionsById=new Map(assertions.filter(a=>a.status==='accepted').map(a=>[a.id,a])),entityById=new Map(scene.entities.filter(e=>!e.removed).map(e=>[e.id,e]));
 const sourceFor=(e:SceneEntity)=>{for(const ref of e.bindings){const a=assertionsById.get(ref.assertionId),r=record(a);if(a&&(ref.ownerId??'public')===scene.scopeKey&&(a.ownerId??null)===ref.ownerId&&a.field===ref.field&&r?.pieces.some(p=>p.id===ref.pieceId))return {ref,a,piece:r.pieces.find(p=>p.id===ref.pieceId)!};}return undefined;};
 const typed=new Map<string,Set<string>>();for(const a of assertions){const r=record(a);if(!r)continue;const model=carcassonneLayout(pack,r),xs=model.tiles.map(t=>t.x),ys=model.tiles.map(t=>t.y);if(model.tiles.length&&Math.max(...xs)-Math.min(...xs)<50&&Math.max(...ys)-Math.min(...ys)<50)typed.set(a.id,new Set(model.tiles.map(t=>t.piece.id)));}
 const add=(regionId:string,g:SceneGroup,kind:SceneDisplayKind,m:SceneDisplayMember,boardContext?:SceneDisplayBoardContext)=>{const p=m.drawing?.position,discriminator=kind==='photo-rows'&&p?.space==='photo'?JSON.stringify([p.evidenceId,p.sourceSHA]):kind==='canonical-board'&&p?.space==='board'?JSON.stringify([m.ref.assertionId,p.instanceKey,boardContext?.board.variant]):['manual-board','typed-map'].includes(kind)?JSON.stringify([m.ref.assertionId,boardContext?.board.variant,kind==='manual-board'?m.piece?.placement?.layoutVariant??null:null]):'';const id=JSON.stringify([regionId,g.id,kind,discriminator]);let part=parts.find(p=>p.id===id);if(!part){part={id,regionId,groupId:g.id,kind,members:[],...(boardContext?{boardContext}:{}),size:{width:320,height:120}};const role=g.role.status==='selected'?g.role.chosen.value:null,recipe=scene.profile.regions.find(r=>r.id===role);part.topologyKind=recipe?.topology?.kind;if(kind==='photo-rows'||kind==='unlocated')part.fallbackReason=m.piece?.spatial?.resolved?'board-asset-pending-or-mismatch':'no-validated-position-or-structure';parts.push(part);}part.members.push(m);consumed.add(sceneDisplayKey(m.ref));};
 for(const region of scene.regions)for(const groupId of region.groupIds){const g=scene.groups.find(g=>g.id===groupId);if(!g)continue;const ids=[...new Set([...(scene.plan.displayEntityOrder[g.id]??[]),...g.entityIds])].filter(id=>g.entityIds.includes(id)),levels=new Map((g.presentation?.orderLevels??[]).flatMap((level,i)=>level.map(id=>[id,i] as const)));ids.sort((a,b)=>(levels.get(a)??Infinity)-(levels.get(b)??Infinity));
  for(const id of ids){const e=entityById.get(id);if(!e)continue;const source=sourceFor(e),native=scene.plan.panels.find(p=>p.regionId===region.id)?.renderer;
   if(!source){if(native==='native-catan'||native==='native-rummikub'){const ref=e.bindings.find(b=>assertionsById.has(b.assertionId));if(ref&&!consumed.has(sceneDisplayKey(ref)))add(region.id,g,'native-record',{entityId:id,ref});}continue;}
   const {ref,a,piece}=source;if(consumed.has(sceneDisplayKey(ref)))continue;
   const photo=projectGenericDrawing(a,[piece],evidence)[0];let winner:{drawing:DrawingItem;context:SceneDisplayBoardContext}|undefined;
   for(const context of contexts){let board=context.board;const tag=piece.placement?.layoutVariant,variant=board.variant??'base';
    // Existing versioned manual coordinate frames. Do not strip an arbitrary unknown tag.
    if(tag&&context.manualLayoutTags?.includes(tag))board={...board,variant:tag};
    const drawing=projectGenericDrawing(a,[piece],evidence,board)[0];if(drawing.position.space==='manual'&&(tag||variant==='base')||drawing.position.space==='board'){if(!winner||drawing.position.space==='manual')winner={drawing,context};}
   }
   const member:SceneDisplayMember={entityId:id,ref,piece,drawing:winner?.drawing??photo};
   if(native==='native-catan'||native==='native-rummikub')add(region.id,g,'native-record',member);
   else if(winner?.drawing.position.space==='manual')add(region.id,g,'manual-board',member,winner.context);
   else if(e.presentation?.basis==='manual'&&structured(g,e))add(region.id,g,'estimated-structure',member);
   else if(winner?.drawing.position.space==='board')add(region.id,g,'canonical-board',member,winner.context);
   else if(typed.get(a.id)?.has(piece.id))add(region.id,g,'typed-map',member);
   else if(structured(g,e))add(region.id,g,'estimated-structure',member);
   else if(g.physicalOrder.length>0||g.presentation?.orderLevels?.length||g.presentation?.orderUnresolved?.length)add(region.id,g,'relation-layout',member);
   else if(validBox(photo.position)&&evidence.some(e=>e.id===(photo.position as {evidenceId?:string}).evidenceId))add(region.id,g,'photo-rows',member);
   else {add(region.id,g,'unlocated',member);unresolved.push({entityId:id,reason:piece.spatial?.resolved?'verified-board-unavailable':'source-position-unavailable'});}
  }
 }
 for(const p of parts){if(p.kind==='photo-rows'){const isCard=p.members.some(m=>pack.runtime?.components.some(c=>c.id===m.piece?.componentId&&c.kind==='card'));p.tileSize={width:isCard?86:64,height:isCard?96:68};const image=p.members[0]?.drawing?.position,photo=image?.space==='photo'?evidence.find(e=>e.id===image.evidenceId):undefined,layout=layoutDrawingItems(p.members.flatMap(m=>m.drawing?[m.drawing]:[]),{tileWidth:p.tileSize.width,tileHeight:p.tileSize.height,sourceAspectRatio:photo?.width&&photo?.height?photo.width/photo.height:1});p.size={width:Math.max(320,layout.width+24),height:Math.max(120,layout.height+85)};}
  else if(p.kind==='estimated-structure'){const g=scene.groups.find(g=>g.id===p.groupId)!;p.size=g.presentation?.grid?{width:g.presentation.grid.columns*68+24,height:g.presentation.grid.rows*68+85}:{width:Math.max(320,p.members.length*92+24),height:150};}
  else if(p.kind==='typed-map'){const r:GenericRecord={version:'game-component-record-v1',pieces:p.members.flatMap(m=>m.piece?[m.piece]:[])},tiles=carcassonneLayout(pack,r).tiles;p.size={width:Math.max(320,(Math.max(...tiles.map(t=>t.x))-Math.min(...tiles.map(t=>t.x))+1)*112+24),height:(Math.max(...tiles.map(t=>t.y))-Math.min(...tiles.map(t=>t.y))+1)*160+100};}
 }
 return {version:'scene-display-v1' as const,parts,consumedEntityIds:parts.flatMap(p=>p.members.map(m=>m.entityId)),unresolved};
}
