import {photoDrawingReference,projectGenericDrawing} from '../shared/drawingProjection';
import {PHOTO_PUBLIC,observationTray} from '../shared/recognition';
import {PhotoLayoutBoard,PhotoLayoutLocation,photoDrawingItems,visiblePhotoItems,photoLayoutEvidence,photoFallbackReference} from './PhotoLayoutBoard';
import {PhotoReference} from './PhotoReference';
import {unreadGaps} from './GapNote';
import type {ObservationGap} from '../shared/observationGaps';
import {SpatialPieceDetails} from './SpatialPieceDetails';
import {spatialView,spatialRotation,spatialReflection} from '../shared/spatialPlacement';
import {useRealAssets,realAreasFor,realFreeAreasFor,realBoardSvg,realSlotAccepts,realFreeLayoutVariant,realSlotLayoutVariant,isRealFreePlacement,realPlacementVariant,realBoardViewForPlacements,realManualVariantsFor,realBoardVariantsFor,type RealBoard,type RealNetworkRoute} from './realBoards';
import {CarcassonneLayoutPreview,carcassonnePreviewIds} from './readouts/CarcassonneLayoutPreview';
import {GameDetailReadout} from './readouts/GameDetailReadout';
import {BulkBar} from './BulkBar';
import {applyQuickChoice,bulkChoice,nextOption,quickValue,type BulkChoice,type QuickValue} from './quickCorrection';
import {useEffect,useRef,useState,type ReactNode,type PointerEvent} from 'react';
import {createPortal} from 'react-dom';
import {Maximize2,Minus,Plus,RotateCw,Undo2} from 'lucide-react';
import type {GenericPiece,GenericPlacement,GenericRecord} from '../shared/genericRecord';
import type {GamePack,Player,Evidence,Assertion} from '../shared/types';
import {GameComponentArt} from './GameComponentArt';
import {boardAreas,compatibleBoard,loadBoardVisuals,pendingArt,recordSurfacePoint,visiblePlacement,type BoardVisual,type BoardArea} from './boardVisuals';
import type {ArtMapping} from './artResolver';
import {Modal} from './ui';
import './game-board-record.css';
import {GenericPieceArt} from './GenericPieceArt';
import {requestedFaceProperties} from './pieceFaceValues';
import {estimateBoardStructure} from '../shared/estimatedBoardStructure';
import {EstimatedBoardView,EstimatedPlacementControls} from './EstimatedBoardView';
import {qualifiedGenericSlots} from './genericSlotSuggestion';
import {SplendorReadout,describeSplendor} from './SplendorReadout';
import {isSplendor,splendorView} from './SplendorEditor';
import {emptyGameReadout,gameReadoutView,setReadoutValue} from '../shared/readouts/registry';
const CARD_PREVIEW=6;
function currentRecordPieces(value:unknown):GenericPiece[]{const r=value as Partial<GenericRecord>|null;return r?.version==='game-component-record-v1'&&Array.isArray(r.pieces)?r.pieces:[];}
interface Props {bodyOnly?:boolean;editRequest?:string;assertion?:Assertion;allAssertions?:readonly Assertion[];onLinkItems?:(ids:string[])=>void;evidence?:readonly Evidence[];gaps?:Map<string,ObservationGap[]>;onEvidence?:(photo:Evidence,region?:Assertion['region'])=>void;players?:number;playerDetails?:readonly Player[];pack:GamePack;fieldKey:string;record:GenericRecord;mapping?:ArtMapping;ownerColor?:string;selected?:string;onSelect?:(id:string)=>void;onChange?:(r:GenericRecord)=>void;onAdd?:()=>void;busy:boolean;editor?:ReactNode;readonly?:boolean;startEditing?:boolean;layoutVariant?:string;onLayoutVariantChange?:(variant:string)=>void;layoutVariantBusy?:boolean}
const pct=(value:number,total:number)=>`${value/total*100}%`;

/** Display scale only: canonical coordinates and portrait orientation remain unchanged. */
export function readableBoardWidth(board?:RealBoard|null,areas=board?.areas??[]){
 if(!board)return 760;
 const minSlot=Math.min(...areas.flatMap(a=>a.slots.map(slot=>Math.min(slot.w,slot.h))).filter(n=>Number.isFinite(n)&&n>0));
 return Math.ceil(Math.max(board.network?1200:520,Number.isFinite(minSlot)?board.viewBox[2]*48/minSlot:760));
}
/** Display clip from declared template geometry only; the pinned board and stored positions stay unchanged. */
export function publicBoardCrop(board:RealBoard,areaIds:readonly string[]):[number,number,number,number]{
 const areas=board.areas.filter(a=>areaIds.includes(a.id)),boxes=areas.flatMap(a=>a.bounds?[a.bounds]:a.slots.map(s=>[s.x,s.y,s.w,s.h] as [number,number,number,number]));
 if(!boxes.length)return board.viewBox;
 const [vx,vy,vw,vh]=board.viewBox,x=Math.max(vx,Math.min(...boxes.map(b=>b[0]))),y=Math.max(vy,Math.min(...boxes.map(b=>b[1]))),right=Math.min(vx+vw,Math.max(...boxes.map(b=>b[0]+b[2]))),bottom=Math.min(vy+vh,Math.max(...boxes.map(b=>b[1]+b[3])));
 return right>x&&bottom>y?[x,y,right-x,bottom-y]:board.viewBox;
}
export function BoardWorkbench({width,areas=[],children}:{width:number;areas?:{id:string;label:string}[];children:ReactNode}){
 const viewport=useRef<HTMLDivElement|null>(null);
 function focusArea(id:string,behavior:ScrollBehavior='smooth'){
  const pan=viewport.current;if(!pan)return;
  const targets=Array.from(pan.querySelectorAll<HTMLElement>('[data-area-id]')).filter(n=>n.dataset.areaId===id);if(!targets.length)return;
  const boxes=targets.map(n=>n.getBoundingClientRect()),bounds=pan.getBoundingClientRect();
  const x=(Math.min(...boxes.map(b=>b.left))+Math.max(...boxes.map(b=>b.right)))/2,y=(Math.min(...boxes.map(b=>b.top))+Math.max(...boxes.map(b=>b.bottom)))/2;
  pan.scrollTo({left:pan.scrollLeft+x-bounds.left-pan.clientWidth/2,top:pan.scrollTop+y-bounds.top-pan.clientHeight/2,behavior});
 }
 useEffect(()=>{if(areas[0])focusArea(areas[0].id,'auto');},[width,areas.map(a=>a.id).join('\u0000')]);
 return <div className="gb-workbench-wrap"><div className="gb-workbench-tools"><span className="small muted">밀어서 보기</span>{areas.length>1&&<select aria-label="판 안 영역으로 이동" defaultValue="" onChange={e=>focusArea(e.target.value)}><option value="" disabled>영역으로 이동</option>{areas.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select>}</div><div ref={viewport} className="gb-workbench" tabIndex={0} aria-label="기록판 가로·세로로 밀어 보기"><div className="gb-working-surface" style={{width}}>{children}</div></div></div>;
}

export function GameBoardRecord({bodyOnly=false,editRequest,assertion,allAssertions,onLinkItems,evidence:sourceEvidence=[],gaps,onEvidence,players,playerDetails,pack,fieldKey,record,mapping,ownerColor,selected,onSelect,onChange,onAdd,busy,editor,readonly=false,startEditing=false,layoutVariant='base',onLayoutVariantChange,layoutVariantBusy=false}:Props){
 const evidence=photoLayoutEvidence(assertion?[assertion]:[],sourceEvidence);
 const [inline,setInline]=useState(()=>typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia('(min-width:901px)').matches);
 useEffect(()=>{if(typeof window==='undefined'||typeof window.matchMedia!=='function')return;const q=window.matchMedia('(min-width:901px)'),f=()=>setInline(q.matches);q.addEventListener?.('change',f);return()=>q.removeEventListener?.('change',f);},[]);
 const [allCards,setAllCards]=useState(false),[visual,setVisual]=useState<BoardVisual>(),[areaId,setAreaId]=useState(''),[edit,setEdit]=useState(()=>startEditing&&!!selected&&!readonly),[full,setFull]=useState(false),[zoom,setZoom]=useState(100);
 useEffect(()=>{if(editRequest&&selected&&!readonly)setEdit(true);},[editRequest,selected,readonly]);
 const gameId=pack.runtime?.source.gameId,baseAssets=useRealAssets(gameId);
 const manualField=realManualVariantsFor(baseAssets?.board,fieldKey),manualVariants=realBoardVariantsFor(baseAssets?.board,fieldKey),manualVariantLabel=baseAssets?.board.manualVariantLabels?.[fieldKey]??baseAssets?.board.manualVariantLabel??'지도 보기';
 const [manualChoice,setManualChoice]=useState<{gameId:string|undefined;field:string;variant:string;record:GenericRecord}|null>(null);
 const shownVariant=manualField?(manualChoice&&manualChoice.gameId===gameId&&manualChoice.field===fieldKey&&manualChoice.record===record?manualChoice.variant:realBoardViewForPlacements(baseAssets?.board,fieldKey,record.pieces.map(p=>p.placement))):layoutVariant;
 const loadedAssets=useRealAssets(gameId,shownVariant,record.pieces.some(p=>!!p.spatial)),realAssets=loadedAssets?.selectedVariant===shownVariant?loadedAssets:null;
 const supportedPlayerCounts=realAssets?.board.supportedPlayerCountsByField?.[fieldKey]??realAssets?.board.supportedPlayerCounts;
 const supportedPlayers=!supportedPlayerCounts||!!players&&supportedPlayerCounts.includes(players);
 const real:RealBoard|null=supportedPlayers?realAssets?.board??null:null;
 const [layerChoice,setLayerChoice]=useState<{gameId:string|undefined;field:string;value:string;record:GenericRecord}|null>(null);
 const layerView=real?.layerView?.field===fieldKey?real.layerView:undefined;
 const layerOf=(p:GenericPiece)=>{
  if(!layerView||!p.componentId||!layerView.componentIds.includes(p.componentId))return null;
  const value=gameReadoutView(pack,p).readout?.values[layerView.property];
  return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;
 };
 const knownLayers=[...new Set(record.pieces.map(layerOf).filter((n):n is number=>n!==null))].sort((a,b)=>a-b);
 const layerValue=layerChoice&&layerChoice.gameId===gameId&&layerChoice.field===fieldKey&&layerChoice.record===record&&(layerChoice.value==='unknown'||knownLayers.some(n=>String(n)===layerChoice.value))?layerChoice.value:'all';
 const inLayer=(p:GenericPiece)=>!layerView||layerValue==='all'||(layerValue==='unknown'?layerOf(p)===null:String(layerOf(p))===layerValue);

 const instanceKey=(p:GenericPiece)=>p.spatial?.board&&p.spatial.resolved?JSON.stringify([p.spatial.source.taskId,p.spatial.board.ref,p.spatial.resolved.frameSHA]):null;
 // Identity remains in its original board after a manual placement; this check never supplies display coordinates.
 const instanceView=(p:GenericPiece)=>p.spatial?.board?spatialView(p.spatial.manualOverride?{...p,spatial:{...p.spatial,manualOverride:false}}:p,real,fieldKey):undefined;
 const spatialInstances=[...new Map(record.pieces.filter(p=>!!instanceView(p)).map(p=>[instanceKey(p)!,{ref:p.spatial!.board!.ref,label:p.spatial!.board!.visibleIdentifier}])).entries()];
 const [spatialChoice,setSpatialChoice]=useState('');const shownInstance=spatialInstances.find(([key])=>key===spatialChoice)??spatialInstances[0];
 const inInstance=(p:GenericPiece)=>!instanceView(p)||instanceKey(p)===shownInstance?.[0];
 const inView=(p:GenericPiece)=>inLayer(p)&&inInstance(p),viewPieces=record.pieces.filter(inView);
 const spatialOf=(p:GenericPiece)=>inInstance(p)?spatialView(p,real,fieldKey,shownInstance?.[1].ref):undefined;
 // An observed public personal board is a display context, not a player or writable destination.
 const unownedInstances=[...new Map(record.pieces.filter(p=>p.spatial?.source.partition==='player_public'&&!p.spatial.boundOwnerId&&!p.spatial.manualOverride&&p.spatial.resolved&&p.spatial.board).map(p=>{const s=p.spatial!,q=s.resolved!;return [JSON.stringify([s.source.taskId,s.board!.ref,q.frameSHA]),{frame:q.frameId,label:s.board!.visibleIdentifier}];})).entries()];
 const [unownedChoice,setUnownedChoice]=useState('');
 const unownedKey=unownedInstances.some(([key])=>key===unownedChoice)?unownedChoice:unownedInstances[0]?.[0];
 const unownedFrame=unownedInstances.find(([key])=>key===unownedKey)?.[1].frame;
 const observedAssets=useRealAssets(unownedFrame?gameId:undefined,unownedFrame??'base',true);
 const drawing=assertion?projectGenericDrawing(assertion,record.pieces,evidence,unownedFrame?observedAssets?.board:real):[];
 const [tapChoice,setTapChoice]=useState<BulkChoice|null>(null);
 const history=useRef<GenericRecord[]>([]),drag=useRef<{id:string;x:number;y:number}|null>(null),moved=useRef(false),networkSvg=useRef<SVGSVGElement|null>(null);
 useEffect(()=>{let alive=true;loadBoardVisuals().then(all=>{if(alive)setVisual(all.find(v=>v.gameId===pack.runtime?.source.gameId));},()=>{});return()=>{alive=false;};},[pack.runtime?.source.gameId]);
 const areas=boardAreas(pack,fieldKey,visual),area=areas.find(a=>a.areaId===areaId)??areas.find(a=>a.areaId===real?.network?.areaId)??areas[0],compatible=compatibleBoard(pack,visual);
 const realAreas=real?realAreasFor(real,fieldKey,players):[];
 const freeAreas=real?realFreeAreasFor(real,fieldKey,players):[];
 const locationArea=realAreas.find(a=>a.placement==='location-only');
 const locationOnly=!!real&&real.recordingMode==='location-only'&&!!locationArea&&compatible;
 const selectedPiece=record.pieces.find(p=>p.id===selected),piece=selectedPiece&&inView(selectedPiece)?selectedPiece:undefined,named=(p:GenericPiece)=>p.label||pack.runtime?.components.find(c=>c.id===p.componentId)?.name||'모름';
 const fieldUsesVariant=realAssets?.variantSelector?.boardField===fieldKey;
 const layoutMatches=(p:GenericPiece)=>!fieldUsesVariant||realPlacementVariant(p.placement?.layoutVariant)===layoutVariant;
 const coordinateFrameAvailable=(p:GenericPiece)=>{
  const tag=p.placement?.layoutVariant;
  if(isRealFreePlacement(tag))return !!real&&tag===realFreeLayoutVariant(real.placementFrame??(fieldUsesVariant?layoutVariant:'base'));
  if(tag?.startsWith('slot-board-v1:'))return !!real&&tag===realSlotLayoutVariant(real.placementFrame??'base');
  return true;
 };
 const structureActive=(p:GenericPiece)=>!!p.structureOverride&&!(p.structureOverride.version==='estimated-structure-override-v2'&&p.structureOverride.active===false);
 const active=(p:GenericPiece)=>{if(structureActive(p))return undefined;const spatial=spatialOf(p);return spatial&&spatial.x!==null&&spatial.y!==null?{areaId:spatial.areaId,x:spatial.x,y:spatial.y,rotation:spatial.rotation,layoutVariant:undefined}:coordinateFrameAvailable(p)&&layoutMatches(p)&&area&&(!locationOnly||realSlotAccepts(locationArea?.accepts,p.componentId))&&visiblePlacement(p,area,compatible);};
 const placed=viewPieces.filter(p=>active(p));
 const unplaced=viewPieces.filter(p=>{
  if(p.spatial&&!p.spatial.manualOverride)return !active(p);
  return !p.placement||!compatible||!coordinateFrameAvailable(p)||!layoutMatches(p)||!areas.some(a=>visiblePlacement(p,a,true)&&(!locationOnly||realSlotAccepts(locationArea?.accepts,p.componentId)));
 });
 function change(next:GenericRecord){if(!onChange||busy)return;history.current.push(structuredClone(record));if(manualField)setManualChoice({gameId,field:fieldKey,variant:shownVariant,record:next});if(layerView)setLayerChoice({gameId,field:fieldKey,value:layerValue,record:next});onChange(next);}
 function setAll(choice:BulkChoice,value:QuickValue){change({...record,pieces:record.pieces.map(p=>choice.ids.includes(p.id)?{...p,...applyQuickChoice(pack,p,choice.fieldId,value)}:p)});setTapChoice(choice);}
 function patch(id:string,update:Partial<GenericPiece>){change({...record,pieces:record.pieces.map(p=>{if(p.id!==id)return p;const nativeSpatial=update.spatial&&['manualAnchor','manualCovered','manualRotationDegrees','manualReflected','manualOverride'].some(key=>JSON.stringify(update.spatial?.[key as keyof typeof update.spatial])!==JSON.stringify(p.spatial?.[key as keyof NonNullable<GenericPiece['spatial']>])),next={...p,...update,...(p.spatial&&Object.hasOwn(update,'placement')?{spatial:{...p.spatial,manualOverride:true}}:{})};if(Object.hasOwn(update,'placement')||nativeSpatial){if(next.structureOverride?.version==='estimated-structure-override-v2')next.structureOverride={...next.structureOverride,active:false};else delete next.structureOverride;}return next;})});}
 function makePlacement(areaId:string,x:number,y:number,rotation:0|90|180|270):GenericPlacement{return {areaId,x,y,rotation,...(fieldUsesVariant?{layoutVariant}:{})};}
 function put(id:string,x:number,y:number){const target=record.pieces.find(p=>p.id===id);if(!target||!inView(target)||!area||!compatible||readonly||locationOnly&&!realSlotAccepts(locationArea?.accepts,target?.componentId))return;const old=target?.placement;patch(id,{placement:makePlacement(area.areaId,Math.max(0,Math.min(1,x)),Math.max(0,Math.min(1,y)),old?.rotation??0)});}
 function freeAreaAt(p:GenericPiece,x:number,y:number){
  if(!real||!Number.isFinite(x)||!Number.isFinite(y))return undefined;
  const [vx,vy,vw,vh]=real.viewBox,px=vx+x*vw,py=vy+y*vh;
  return freeAreas.find(a=>{const [ax,ay,aw,ah]=a.bounds!;return realSlotAccepts(a.accepts,p.componentId)&&px>=ax&&px<=ax+aw&&py>=ay&&py<=ay+ah;});
 }
 function putOnFreeArea(id:string,x:number,y:number){
  const target=record.pieces.find(p=>p.id===id);
  if(!target||!inView(target)||!area||!compatible||readonly||busy||x<0||x>1||y<0||y>1||!freeAreaAt(target,x,y))return;
  patch(id,{placement:{...makePlacement(area.areaId,x,y,target.placement?.rotation??0),layoutVariant:realFreeLayoutVariant(real?.placementFrame??(fieldUsesVariant?layoutVariant:'base'))}});
 }
 const freePlacementOf=(p:GenericPiece)=>!!p.placement&&p.placement.layoutVariant===realFreeLayoutVariant(real?.placementFrame??(fieldUsesVariant?layoutVariant:'base'))&&!!freeAreaAt(p,p.placement.x,p.placement.y);
 const networkArea=real?.network?(locationArea??realAreas.find(candidate=>candidate.id===real.network?.areaId)):undefined;
 function placeOnNetworkRoute(route:RealNetworkRoute,clientX?:number,clientY?:number,cropped=false){
  const componentId=piece?.componentId;
  if(!networkSvg.current||!piece||!componentId||!networkArea||!real||readonly||busy||!['trains','links'].includes(componentId)||!realSlotAccepts(networkArea.accepts,componentId))return;
  const from=real.network?.cities.find(city=>city.id===route.from),to=real.network?.cities.find(city=>city.id===route.to);if(!from||!to||!route.segments.length)return;
  const rect=networkSvg.current.getBoundingClientRect(),[vx,vy,vw,vh]=real.viewBox,[bx,by,bw,bh]=networkArea.bounds??[vx,vy,vw,vh];
  const clickX=clientX===undefined?null:bx+(clientX-rect.left)/Math.max(1,rect.width)*bw,clickY=clientY===undefined?null:by+(clientY-rect.top)/Math.max(1,rect.height)*bh;
  const segment=clickX===null||clickY===null?route.segments[Math.floor((route.segments.length-1)/2)]:route.segments.reduce((best,current)=>Math.hypot(current.x-clickX,current.y-clickY)<Math.hypot(best.x-clickX,best.y-clickY)?current:best,route.segments[0]);
  const surface=networkSvg.current.closest<HTMLElement>('.gb-real');if(!surface)return;const surfaceRect=surface.getBoundingClientRect();
  const [px,py,pw,ph]=cropped?[bx,by,bw,bh]:[vx,vy,vw,vh];
  const point=recordSurfacePoint((segment.x-px)/pw*surfaceRect.width,(segment.y-py)/ph*surfaceRect.height,surfaceRect.width,surfaceRect.height);
  const update:Partial<GenericPiece>={placement:makePlacement(area?.areaId??networkArea.id,point.x,point.y,piece.placement?.rotation??0)};
  try{
   const existing=piece.readout===undefined?emptyGameReadout(pack,piece.componentId):gameReadoutView(pack,piece).readout;
   if(existing?.kind==='trains'){
    let readout=setReadoutValue(pack,existing,'route',`${route.id}: ${from.label}–${to.label}`);
    readout=setReadoutValue(pack,readout,'segment',segment.index);update.readout=readout;
   }else if(existing?.kind==='links'){
    let readout=setReadoutValue(pack,existing,'endpoints',`${from.label}–${to.label}`);
    readout=setReadoutValue(pack,readout,'linkType',route.routeType??null);update.readout=readout;
   }
  }catch{/* Keep the existing location editable even when an old detailed record is unsupported. */}
  patch(piece.id,update);
 }
 function endDrag(e:PointerEvent<HTMLElement>){const d=drag.current;drag.current=null;const canvas=e.currentTarget.closest<HTMLElement>('.gb-surface')??e.currentTarget.closest<HTMLElement>('.gb-real')??e.currentTarget.closest('.gb-record')?.querySelector<HTMLElement>('.gb-surface, .gb-real');if(d&&canvas&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>6){moved.current=true;const r=canvas.getBoundingClientRect();if(canvas.dataset.coordinates==='board'){putOnFreeArea(d.id,(e.clientX-r.left)/Math.max(1,r.width),(e.clientY-r.top)/Math.max(1,r.height));}else{const point=recordSurfacePoint(e.clientX-r.left,e.clientY-r.top,r.width,r.height);put(d.id,point.x,point.y);}}}
 const splendor=isSplendor(pack);
 const bulk=readonly||splendor?null:bulkChoice(pack,viewPieces,pack.runtime?.fieldBindings.find(b=>b.key===fieldKey)?.componentIds??[]);
 const sourceFor=(p:GenericPiece)=>evidence.find(e=>e.id===p.evidenceId);
 const photoNeeded=(p:GenericPiece)=>!!unreadGaps(p,gaps?.get(p.id)??[]).length;
 function art(p:GenericPiece,readable=false){if(photoNeeded(p)&&!gameReadoutView(pack,p).readout)return <PhotoReference photo={sourceFor(p)} region={p.region}/>;if(splendor)return <SplendorReadout {...splendorView(p)} size={readable?undefined:"mini"}/>;return <GenericPieceArt pack={pack} piece={p} mapping={mapping} symbols={realAssets?.symbols??observedAssets?.symbols} requestedPropertyIds={requestedFaceProperties(assertion,p.id)} artPending={pendingArt(visual,p.componentId)} compact={readable}/>;}
 function item(p:GenericPiece,location:boolean,boardCoordinates=false){const pos=location?active(p):undefined;return <button type="button" key={p.id} className={'gb-piece'+(selected===p.id?' selected':'')+(pos?' placed':'')} aria-label={splendor?describeSplendor(splendorView(p)):named(p)+', '+(p.quantity===null?'수량 모름':p.quantity+'개')} aria-pressed={selected===p.id} disabled={busy} style={pos?{left:boardCoordinates?pct(pos.x,1):'calc(40px + '+pos.x+' * (100% - 80px))',top:boardCoordinates?pct(pos.y,1):'calc(40px + '+pos.y+' * (100% - 80px))',transform:'translate(-50%,-50%) rotate('+(p.spatial?spatialRotation(p)??0:pos.rotation??0)+'deg)'+(p.spatial&&spatialReflection(p)===true?' scaleX(-1)':'')}:undefined} onClick={e=>{e.stopPropagation();if(moved.current){moved.current=false;return;}if(tapChoice?.ids.includes(p.id)){patch(p.id,applyQuickChoice(pack,p,tapChoice.fieldId,nextOption(tapChoice.options,quickValue(pack,p,tapChoice.fieldId))));return;}onSelect?.(p.id);if(!readonly)setEdit(true);const photo=sourceFor(p);if(photoNeeded(p)&&photo)onEvidence?.(photo,p.region??undefined);}} onPointerDown={e=>{if(readonly)return;moved.current=false;drag.current={id:p.id,x:e.clientX,y:e.clientY};onSelect?.(p.id);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={endDrag} onPointerCancel={()=>{drag.current=null;}}>{art(p)}{!splendor&&<><span>{named(p)}</span>{p.quantity!==null&&<b>{p.quantity}</b>}<GameDetailReadout pack={pack} piece={p} players={playerDetails} compact/></>}</button>;}
 function board(current:BoardArea,items=placed){const drawn=real&&!realSlots.length&&!real.network&&!locationOnly;return <div className={'gb-surface'+(drawn?' is-drawn':'')} aria-label={current.label+' · 수동 기록 배치'} style={drawn?{backgroundImage:`url(${realBoardSvg(real)})`,aspectRatio:`${real.viewBox[2]} / ${real.viewBox[3]}`}:{backgroundImage:'url(/game-art/boards/'+current.template+'.svg)'}} onClick={e=>{if(moved.current){moved.current=false;return;}if(piece&&!readonly){const r=e.currentTarget.getBoundingClientRect(),point=recordSurfacePoint(e.clientX-r.left,e.clientY-r.top,r.width,r.height);put(piece.id,point.x,point.y);}}}>{items.map(p=>item(p,true))}{items.length===0&&<span className="gb-empty">{unplaced.length?'아래 구성물을 골라 놓아 주세요':'아직 놓인 구성물이 없어요'}</span>}</div>;}
 const recordedTileIds=new Set(carcassonnePreviewIds(pack,{...record,pieces:viewPieces}).filter(id=>{const p=viewPieces.find(p=>p.id===id)!;return !p.placement&&!spatialOf(p);}));
 const structure=assertion?estimateBoardStructure({gameId:gameId??pack.id,items:drawing,assertions:[assertion],allAssertions,evidence}):null;
 const estimatedIds=new Set(structure?.placements.filter(p=>p.assertionId===assertion?.id&&viewPieces.some(piece=>piece.id===p.pieceId)).map(p=>p.pieceId)??[]);
 const photoItems=visiblePhotoItems(photoDrawingItems(drawing).filter(i=>{const p=record.pieces.find(p=>p.id===i.pieceId);return p&&inView(p)&&!estimatedIds.has(p.id)&&!recordedTileIds.has(p.id)&&!active(p)&&!p.placement;}),evidence);
 const coveredOnly=viewPieces.filter(p=>{if(structureActive(p))return false;const at=spatialOf(p);return at&&at.anchorSlotId===null&&at.covered.length>0;});
 const observedItems=drawing.filter(i=>{const p=record.pieces.find(p=>p.id===i.pieceId)!,at=i.position;return inView(p)&&!structureActive(p)&&(fieldKey===PHOTO_PUBLIC||p.spatial?.resolved?.fieldKey===fieldKey)&&at.space==='board'&&unownedInstances.some(([key])=>key===at.instanceKey)&&!active(p);});
 const pictured=new Set([...photoItems,...observedItems].map(i=>i.pieceId).concat(coveredOnly.map(p=>p.id),[...recordedTileIds],[...estimatedIds]));
 const observedShown=observedItems.filter(i=>i.position.space==='board'&&i.position.instanceKey===unownedKey);
 const selectDrawing=(id:string)=>{onSelect?.(id);if(!readonly)setEdit(true);};
 const photoCardSize=viewPieces.some(p=>pack.runtime?.components.some(c=>c.id===p.componentId&&c.kind==='card'))?{width:120,height:180}:undefined;
 const referenceBinding=pack.runtime?.fieldBindings.find(b=>b.key===fieldKey);
 const drawingReference=assertion?photoDrawingReference(assertion,evidence,referenceBinding&&{componentIds:referenceBinding.componentIds,...(!observationTray(fieldKey)?{areaIds:referenceBinding.areaIds}:{})}):[];
 const selectedPhotoItem=photoItems.find(i=>i.pieceId===piece?.id)??photoDrawingItems(drawing).find(i=>i.pieceId===piece?.id&&estimatedIds.has(i.pieceId)),selectedSource=selectedPhotoItem?.position??drawingReference.find(i=>i.pieceId===piece?.id)?.position,selectedPhoto=selectedSource&&evidence.find(e=>e.id===selectedSource.evidenceId);
 const locationPreview=selectedSource&&selectedPhoto&&piece?<PhotoLayoutLocation photo={selectedPhoto} box={selectedSource.box} label={named(piece)} onEvidence={onEvidence}/>:null;
 const fallbackReference=photoFallbackReference(drawingReference,photoItems,new Set([...drawing.filter(i=>i.position.space==='board').map(i=>i.pieceId),...estimatedIds]));
 const photoLayout=<PhotoLayoutBoard referenceItems={fallbackReference} tileSize={photoCardSize} items={photoItems} evidence={evidence} selected={selected} disabled={busy} onSelect={selectDrawing} onEvidence={onEvidence} labelFor={id=>named(record.pieces.find(p=>p.id===id)!)} renderItem={id=>art(record.pieces.find(p=>p.id===id)!,true)}/>;
 const observedAreaIds=[...new Set(record.pieces.filter(p=>observedShown.some(i=>i.pieceId===p.id)).flatMap(p=>p.spatial?.board?.templateAreaIds??[]))];
 const observedBounds=observedAssets?publicBoardCrop(observedAssets.board,observedAreaIds):[0,0,1000,1000];
 const observedAreas=observedAssets?.board.areas.filter(a=>observedAreaIds.includes(a.id))??[];
 const observedLayout=observedShown.length>0&&observedAssets&&<section aria-label="소유 미정 공개판" className="photo-layout-board"><header><strong>사진 속 판</strong>{unownedInstances.length>1&&<select aria-label="소유 미정 판" value={unownedKey} onChange={e=>setUnownedChoice(e.target.value)}>{unownedInstances.map(([key,value],i)=><option key={key} value={key}>{value.label??`판 ${i+1}`}</option>)}</select>}{!readonly&&onLinkItems&&<button className="button secondary small-button" disabled={busy} onClick={()=>onLinkItems(observedShown.map(i=>i.pieceId))}>사람·영역에 연결</button>}</header><BoardWorkbench width={readableBoardWidth({...observedAssets.board,viewBox:observedBounds as [number,number,number,number]},observedAreas)} areas={observedAreas}><div className="photo-layout-canvas" style={{aspectRatio:`${observedBounds[2]} / ${observedBounds[3]}`,overflow:'hidden'}}><img src={realBoardSvg(observedAssets.board)} alt="" aria-hidden="true" style={{position:'absolute',maxWidth:'none',width:pct(observedAssets.board.viewBox[2],observedBounds[2]),height:pct(observedAssets.board.viewBox[3],observedBounds[3]),left:pct(observedAssets.board.viewBox[0]-observedBounds[0],observedBounds[2]),top:pct(observedAssets.board.viewBox[1]-observedBounds[1],observedBounds[3])}}/>{(gameId==='sagrada'?observedAreas.flatMap(a=>a.slots):[]).map(slot=><span key={'neutral-'+slot.id} aria-hidden="true" className="gb-neutral-cell" style={{position:'absolute',left:pct(slot.x-observedBounds[0],observedBounds[2]),top:pct(slot.y-observedBounds[1],observedBounds[3]),width:pct(slot.w,observedBounds[2]),height:pct(slot.h,observedBounds[3]),background:'#f4f5f6',border:'1px solid #8a94a5',borderRadius:4}}/>)}{observedShown.map(i=>{
  if(i.position.space!=='board')return null;const pos=i.position,p=record.pieces.find(p=>p.id===i.pieceId)!;
  const a=observedAssets.board.areas.find(a=>a.id===pos.areaId),slots=a?.slots.filter(s=>s.id===pos.anchorSlotId||pos.coveredSlotIds.includes(s.id))??[];
  if(!slots.length)return null;const [vx,vy,vw,vh]=observedBounds,x=Math.min(...slots.map(s=>s.x)),y=Math.min(...slots.map(s=>s.y)),w=Math.max(...slots.map(s=>s.x+s.w))-x,h=Math.max(...slots.map(s=>s.y+s.h))-y;
  return <button type="button" key={i.pieceId} data-area-id={pos.areaId} className={'photo-layout-piece'+(selected===i.pieceId?' selected':'')} data-drawing-piece={i.pieceId} aria-label={named(p)+' · 사진 속 판'} disabled={busy} onClick={()=>selectDrawing(i.pieceId)} style={{left:pct(x-vx,vw),top:pct(y-vy,vh),width:pct(w,vw),height:pct(h,vh),transform:`rotate(${pos.rotationDegrees??0}deg)${pos.reflected===true?' scaleX(-1)':''}`}}>{art(p)}</button>;
 })}</div></BoardWorkbench></section>;
 const realSlots=realAreas.flatMap(a=>a.slots.map(slot=>({...slot,area:a})));
 const partialSlotBoard=real?.recordingMode==='partial-slots'&&realSlots.length>0;
 const locationTargets=locationOnly?realAreas.filter(a=>a.id!==locationArea?.id&&a.placement==='free-pieces'&&!!a.bounds):[];
 const slotOf=(p:GenericPiece)=>{const spatial=spatialOf(p);if(spatial?.anchorSlotId)return realSlots.find(s=>s.id===spatial.anchorSlotId&&s.area.id===spatial.templateAreaId)??null;const at=active(p);if(!at||!real||isRealFreePlacement(at.layoutVariant)||real.placementFrame&&at.layoutVariant!==realSlotLayoutVariant(real.placementFrame))return null;const [vx,vy,vw,vh]=real.viewBox,x=vx+at.x*vw,y=vy+at.y*vh;return realSlots.find(s=>realSlotAccepts(s.area.accepts,p.componentId)&&x>=s.x&&x<=s.x+s.w&&y>=s.y&&y<=s.y+s.h)??null;};
 const topSpatialPiece=(ps:GenericPiece[])=>ps.length===1?ps[0]:ps.filter(p=>ps.every(q=>q.id===p.id||p.spatial?.relations.some(r=>r.fromId===p.id&&r.toId===q.id&&['above','on','covers'].includes(r.kind)))).length===1?ps.find(p=>ps.every(q=>q.id===p.id||p.spatial?.relations.some(r=>r.fromId===p.id&&r.toId===q.id&&['above','on','covers'].includes(r.kind)))):undefined;
 const stackedSlots=realSlots.map(slot=>({slot,pieces:placed.filter(p=>slotOf(p)?.id===slot.id)})).filter(group=>group.pieces.length>1);
 function networkLayer(bounds:[number,number,number,number],cropped:boolean){
  if(!real?.network)return null;
  const [vx,vy,vw,vh]=real.viewBox,[bx,by,bw,bh]=bounds,canSelectRoute=!!piece&&!!networkArea&&['trains','links'].includes(piece.componentId??'')&&realSlotAccepts(networkArea.accepts,piece.componentId)&&!readonly&&!busy;
  const style=cropped?{left:'0',top:'0',width:'100%',height:'100%'}:{left:pct(bx-vx,vw),top:pct(by-vy,vh),width:pct(bw,vw),height:pct(bh,vh)};
  return <div className="gb-network-layer" style={style}>
   <div className="gb-network-cities" aria-hidden="true">{real.network.cities.map(city=><span key={city.id} className="gb-city-label" style={{left:pct(city.labelX-bx,bw),top:pct(city.labelY-by,bh)}}>{city.label}</span>)}</div>
   <svg ref={networkSvg} className="gb-network-hit-layer" viewBox={`${bx} ${by} ${bw} ${bh}`} preserveAspectRatio="none" aria-label="지도 연결 선택">
    {real.network.routes.map(route=>{const from=real.network!.cities.find(city=>city.id===route.from),to=real.network!.cities.find(city=>city.id===route.to);if(!from||!to)return null;
     const label=piece?.componentId==='links'?'연결':'노선',detail=route.routeType==='canal'?'운하':route.routeType==='rail'?'철도':real.network?.colorMeaning==='neutral-diagram'?'유형 직접 확인':route.color;
     return <g key={route.id} role="button" tabIndex={canSelectRoute?0:-1} aria-label={`${label} ${route.id}, ${from.label}–${to.label}, ${detail}${route.length>1?' '+route.length+'칸':''}${canSelectRoute?(piece?.componentId==='links'?' · 선택한 링크 말을 놓기':' · 선택한 열차 말을 놓기'):''}`} onClick={e=>{e.stopPropagation();if(canSelectRoute)placeOnNetworkRoute(route,e.clientX,e.clientY,cropped);}} onKeyDown={e=>{if(canSelectRoute&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();placeOnNetworkRoute(route,undefined,undefined,cropped);}}}>
      <path className="gb-route-hit" d={`M ${route.path.x1} ${route.path.y1} L ${route.path.x2} ${route.path.y2}`} pointerEvents={canSelectRoute?'stroke':'none'}/>
     </g>;
    })}
   </svg>
  </div>;
 }
 // Real board: tap a filled slot to fix its piece, tap an empty slot to put the selected piece there.
 function realSurface(){
  const [vx,vy,vw,vh]=real!.viewBox;
  const networkBounds=networkArea?.bounds;
  return <div className={'gb-real'+(real!.network?' gb-network-map':'')} data-coordinates="board" style={{aspectRatio:`${vw} / ${vh}`}} aria-label={area!.label+' · 판'}>
   <img src={realBoardSvg(real!)} alt="" width={vw} height={vh}/>
   {real!.network&&networkBounds&&networkLayer(networkBounds,false)}
   {viewPieces.flatMap(p=>{const sp=spatialOf(p);return(sp?.covered??[]).map(slot=>{
    const label=`${named(p)} · 관측 점유 ${slot.address}${p.spatial?.placement?.coverageComplete===true?'':' · 부분 관측'}`,style={position:'absolute' as const,zIndex:sp?.anchorSlotId===null?6:1,left:pct(slot.x-vx,vw),top:pct(slot.y-vy,vh),width:pct(slot.w,vw),height:pct(slot.h,vh),border:selected===p.id?'3px solid #16305c':'1px dashed #16305c',background:'rgba(143,211,255,.16)',boxSizing:'border-box' as const};
    return sp?.anchorSlotId===null?<button type="button" className="gb-covered-hit" key={p.id+slot.slotId} data-spatial-piece={p.id} data-spatial-cell={slot.slotId} aria-label={label} disabled={busy} onClick={()=>selectDrawing(p.id)} style={style}/>:<span key={p.id+slot.slotId} data-spatial-piece={p.id} data-spatial-cell={slot.slotId} aria-label={label} style={{...style,pointerEvents:'none'}}/>;
   });})}
   {freeAreas.map(target=>{const [x,y,w,h]=target.bounds!,canPlace=!!piece&&realSlotAccepts(target.accepts,piece.componentId);return <button type="button" key={target.id} className={'gb-free-area'+(canPlace?' ready':'')} data-area-id={target.id} style={{left:pct(x-vx,vw),top:pct(y-vy,vh),width:pct(w,vw),height:pct(h,vh)}} aria-label={`${target.label}에 선택한 구성물 놓기`} disabled={busy||readonly||!compatible||!canPlace} onClick={e=>{e.stopPropagation();if(!piece||readonly||busy)return;const canvas=e.currentTarget.closest<HTMLElement>('.gb-real'),rect=canvas?.getBoundingClientRect();if(!rect)return;const px=e.detail===0?(x+w/2-vx)/vw:(e.clientX-rect.left)/Math.max(1,rect.width),py=e.detail===0?(y+h/2-vy)/vh:(e.clientY-rect.top)/Math.max(1,rect.height);putOnFreeArea(piece.id,px,py);}}/>;})}
   {realSlots.map(s=>{const here=placed.filter(p=>slotOf(p)?.id===s.id),canPlace=!!piece&&realSlotAccepts(s.area.accepts,piece.componentId),canLayer=canPlace&&s.stack===true&&(s.capacity===undefined||here.length<s.capacity)&&!here.some(p=>p.id===piece!.id),hex=s.shape==='hex'||s.shape==='hex-pointy';return <button type="button" key={s.area.id+s.id} data-area-id={s.area.id} className={'gb-slot'+(hex?' hex':'')+(here.length?' filled':'')+(canPlace&&!here.length?' ready':'')} style={{left:pct(s.x-vx,vw),top:pct(s.y-vy,vh),width:pct(s.w,vw),height:pct(s.h,vh),...(s.shape==='hex-pointy'?{clipPath:'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)'}:{})}} aria-label={`${s.area.label}${s.label?' · '+s.label:''}${here.length?': '+here.map(named).join(', ')+(canLayer?' · 선택한 구성물 겹쳐 기록':''):canPlace?' 빈 칸':' · '+(s.area.accepts??[]).map(id=>pack.runtime?.components.find(c=>c.id===id)?.name??id).join('·')+'만 배치 가능'}`} disabled={busy||(readonly&&!here.length)||(!here.length&&!!piece&&!canPlace)} onClick={()=>{if(piece&&!readonly&&canPlace&&(!here.length||canLayer))patch(piece.id,{placement:{...makePlacement(area!.areaId,(s.x+s.w/2-vx)/vw,(s.y+s.h/2-vy)/vh,piece.placement?.rotation??0),...(real!.placementFrame?{layoutVariant:realSlotLayoutVariant(real!.placementFrame)}:{})}});else if(here.length){onSelect?.(here[0].id);if(!readonly)setEdit(true);}}}>{here.some(p=>p.spatial)&&here.length>1&&!topSpatialPiece(here)?<span className="small">순서 ?</span>:(here.some(p=>p.spatial)?topSpatialPiece(here):here[0])&&<span className="gb-slot-art" style={(topSpatialPiece(here)??here[0])?.spatial?{transform:`rotate(${spatialRotation(topSpatialPiece(here)??here[0])??0}deg)${spatialReflection(topSpatialPiece(here)??here[0])===true?' scaleX(-1)':''}`}:undefined}>{art(here.some(p=>p.spatial)?topSpatialPiece(here)!:here[0])}</span>}{here.length>1&&<b>{here.length}</b>}</button>;})}
   {coveredOnly.map(p=>{const at=spatialOf(p)!,cells=at.covered,x=Math.min(...cells.map(c=>c.x)),y=Math.min(...cells.map(c=>c.y)),w=Math.max(...cells.map(c=>c.x+c.w))-x,h=Math.max(...cells.map(c=>c.y+c.h))-y;return <button type="button" key={p.id} className="gb-covered-piece" data-drawing-piece={p.id} data-area-id={at.templateAreaId} aria-label={named(p)+' · 관측 점유, 기준 칸 미확인'} disabled={busy} onClick={()=>selectDrawing(p.id)} style={{left:pct(x-vx,vw),top:pct(y-vy,vh),width:pct(w,vw),height:pct(h,vh)}}><span className="gb-covered-art" style={{transform:`rotate(${spatialRotation(p)??0}deg)${spatialReflection(p)===true?' scaleX(-1)':''}`}}>{art(p)}</span></button>;})}
   {/* Fixed pieces are drawn once; actual variable collections keep free positions. */}
   {placed.filter(p=>!slotOf(p)&&(locationOnly||freePlacementOf(p))).map(p=>item(p,true,!locationOnly))}
  </div>;
 }
 function locationMapSurface(){
  const [vx,vy,vw,vh]=real!.viewBox,[bx,by,bw,bh]=locationArea!.bounds??[vx,vy,vw,vh];
  const canSelectRoute=!!piece&&!!networkArea&&['trains','links'].includes(piece.componentId??'')&&realSlotAccepts(networkArea.accepts,piece.componentId)&&!readonly&&!busy;
  return <div className={'gb-real gb-location-map'+(real!.network?' gb-network-map':'')} style={{aspectRatio:`${bw} / ${bh}`}} aria-label={area!.label+' · 위치 기록'} onClick={e=>{if(moved.current){moved.current=false;return;}if(real!.network&&canSelectRoute)return;if(piece&&!readonly&&realSlotAccepts(locationArea?.accepts,piece.componentId)){const r=e.currentTarget.getBoundingClientRect(),point=recordSurfacePoint(e.clientX-r.left,e.clientY-r.top,r.width,r.height);put(piece.id,point.x,point.y);}}}>
   <img src={realBoardSvg(real!)} alt="" width={vw} height={vh} style={{width:pct(vw,bw),height:pct(vh,bh),left:pct(-bx,bw),top:pct(-by,bh)}}/>
   {real!.network&&networkLayer([bx,by,bw,bh],true)}
   {locationTargets.map(target=>{const [tx,ty,tw,th]=target.bounds!;return <button key={target.id} type="button" className="gb-location-target" data-area-id={target.id} style={{left:pct(tx-bx,bw),top:pct(ty-by,bh),width:pct(tw,bw),height:pct(th,bh)}} aria-label={`${target.label}에 선택한 구성물 놓기`} disabled={busy||readonly||!piece||!realSlotAccepts(target.accepts,piece?.componentId)} onClick={e=>{e.stopPropagation();const surface=e.currentTarget.closest<HTMLElement>('.gb-real'),rect=surface?.getBoundingClientRect();if(!piece||!rect)return;const centerX=(tx+tw/2-bx)/bw*rect.width,centerY=(ty+th/2-by)/bh*rect.height,point=recordSurfacePoint(centerX,centerY,rect.width,rect.height);patch(piece.id,{placement:makePlacement(area!.areaId,point.x,point.y,piece.placement?.rotation??0)});}}>{target.id.startsWith('gate-')?`G${target.id.slice(5)}`:target.id.replace('planet-','').replace('-', '·')}</button>;})}
   {placed.map(p=>item(p,true))}
   {placed.length===0&&<span className="gb-empty">구성물을 선택한 뒤 지도에서 위치를 기록해 주세요</span>}
  </div>;
 }
 const dedicatedSurface=!!real&&(realSlots.length>0||freeAreas.length>0);
 const suggested=real&&area&&compatible&&!readonly?qualifiedGenericSlots(gameId!,real,fieldKey,viewPieces,area.areaId,players):[];
 const outsideView=dedicatedSurface&&real?.placementFrame?placed.filter(p=>p.placement?.layoutVariant===realSlotLayoutVariant(real.placementFrame!)&&!slotOf(p)):[];
 const legacyPositions=dedicatedSurface&&(!!real?.placementFrame||!realSlots.length)?placed.filter(p=>!slotOf(p)&&!freePlacementOf(p)&&!outsideView.includes(p)):[];
 const offBoard=dedicatedSurface?placed.filter(p=>!slotOf(p)&&!(locationOnly||freePlacementOf(p))&&!legacyPositions.includes(p)&&!outsideView.includes(p)):[];
 const portal=(node:ReactNode)=>typeof document==='undefined'?null:createPortal(node,document.body);
 const estimatedLayout=structure&&assertion&&<EstimatedBoardView pack={pack} structure={structure} record={{...record,pieces:viewPieces}} assertionId={assertion.id} contextPieces={(allAssertions??[]).flatMap(a=>currentRecordPieces(a.value))} contextAssertions={allAssertions} renderPiece={p=>art(p,true)} onSelect={selectDrawing} selected={selected} busy={busy}/>;
 const needsManualSurface=!pictured.size||placed.length>0||coveredOnly.length>0||viewPieces.some(p=>!pictured.has(p.id));
 if(bodyOnly)return <div className="gb-record gb-body-only">{observedLayout}{estimatedLayout}{photoLayout}{area&&needsManualSurface&&<BoardWorkbench width={readableBoardWidth(real,realAreas)} areas={realAreas}>{dedicatedSurface?realSurface():locationOnly?locationMapSurface():board(area)}</BoardWorkbench>}{[...unplaced,...offBoard,...outsideView,...legacyPositions].some(p=>!pictured.has(p.id))&&<div className="gb-tray"><div>{[...new Map([...unplaced,...offBoard,...outsideView,...legacyPositions].filter(p=>!pictured.has(p.id)).map(p=>[p.id,p])).values()].map(p=>item(p,false))}</div></div>}</div>;
 if(!area)return null;
 return <div className="gb-record">
  {observedLayout}{estimatedLayout}{photoLayout}
  {suggested.length>0&&<BulkBar message={`자리를 못 찾은 부품 ${suggested.length}개`} actions={[{label:'추천대로 놓기',onClick:()=>change({...record,pieces:record.pieces.map(p=>{const s=suggested.find(s=>s.id===p.id);return s&&!p.placement?{...p,placement:s.placement}:p;})})}]} tapping={false} tapHint="" onDone={()=>{}}/>}
  <div className="gb-toolbar">{manualField?<label className="gb-area-label">{manualVariantLabel}<select aria-label={manualVariantLabel} value={shownVariant} disabled={busy||layoutVariantBusy} onChange={e=>{const next=e.target.value;if(next==='base'||manualVariants.some(v=>v.id===next))setManualChoice({gameId,field:fieldKey,variant:next,record});}}><option value="base">{baseAssets?.board.manualVariantBaseLabel??'현재 임무 · 직접 기록'}</option>{manualVariants.map(v=><option key={v.id} value={v.id}>{v.label??v.id}</option>)}</select></label>:realAssets?.variantSelector?.boardField===fieldKey?<label className="gb-area-label">판 구성<select aria-label="판 구성" value={layoutVariant} disabled={busy||layoutVariantBusy||!onLayoutVariantChange} onChange={e=>onLayoutVariantChange?.(e.target.value)}>{realAssets.variantSelector.options.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>:areas.length>1?<label className="gb-area-label">영역<select aria-label="판 영역" value={area.areaId} onChange={e=>setAreaId(e.target.value)}>{areas.map(a=><option key={a.areaId} value={a.areaId}>{a.label}</option>)}</select></label>:<span className="small muted">기록 배치</span>}<div className="button-row">{!readonly&&<button className="icon-button" aria-label="배치 되돌리기" disabled={busy||!history.current.length} onClick={()=>onChange?.(history.current.pop()!)}><Undo2 size={17}/></button>}<button className="button secondary small-button" onClick={()=>setFull(true)}><Maximize2 size={16}/>크게 보기</button></div></div>
  {spatialInstances.length>1&&<label className="gb-area-label">사진 속 판 인스턴스<select aria-label="사진 속 판 인스턴스" value={shownInstance?.[0]} onChange={e=>setSpatialChoice(e.target.value)}>{spatialInstances.map(([key,value],i)=><option key={key} value={key}>{value.label?`${value.label} · 판 ${i+1}`:`판 ${i+1}`}</option>)}</select></label>}
  {piece&&(piece.spatial||piece.spatialAlternatives?.length)&&<SpatialPieceDetails piece={piece} busy={busy} readonly={readonly} onChange={spatial=>patch(piece.id,{spatial})}/>}
  {layerView&&<label className="gb-area-label">{layerView.label??'층 보기'}<select aria-label={layerView.label??'층 보기'} value={layerValue} disabled={busy} onChange={e=>{const value=e.target.value;if(value==='all'||value==='unknown'||knownLayers.some(n=>String(n)===value))setLayerChoice({gameId,field:fieldKey,value,record});}}><option value="all">모든 층</option><option value="unknown">층 미확인</option>{knownLayers.map(value=><option key={value} value={String(value)}>층 {value}</option>)}</select></label>}
  {layerView&&layerValue!=='all'&&<p className="small muted" role="status">선택한 층만 표시해요. 다른 층과 미확인 값은 그대로 보존됩니다. 층 값은 구성물 상세에서 직접 확인·수정하세요.</p>}
  {layerView&&selectedPiece&&!piece&&<p className="small muted">선택한 구성물은 다른 층에 있어요. 해당 층이나 모든 층 보기에서 위치를 고칠 수 있어요.</p>}
  {manualField&&<p className="small muted">보기 선택은 현재 값을 바꾸지 않아요. 직접 배치한 위치의 판 기준을 저장해 다시 열어요. 다른 판 기준의 위치는 미배치로 보존해요.</p>}
  {!compatible&&visual&&<p className="small muted">이전 기록 · 위치는 그대로 보존돼요.</p>}
  {realAssets&&!supportedPlayers&&<p className="small muted">이 인원수의 해당 영역 전용판은 아직 확인 중이에요. 기존 기록판에서 위치를 직접 기록할 수 있어요.</p>}
  {!readonly&&(tapChoice||bulk)&&<BulkBar disabled={busy} message={bulk?`${bulk.label}을(를) 모르는 구성물 ${bulk.ids.length}개`:''} actions={(bulk?.options??[]).map(o=>({label:'전부 '+o.label,onClick:()=>setAll(bulk!,o.value)}))} tapping={!!tapChoice} tapHint="다른 것만 눌러 바꿔 주세요" onDone={()=>setTapChoice(null)}/>}
  {needsManualSurface&& (<BoardWorkbench width={readableBoardWidth(real,realAreas)} areas={realAreas}>{dedicatedSurface?realSurface():locationOnly?locationMapSurface():board(area)}</BoardWorkbench>)}
  {stackedSlots.length>0&&<details className="gb-stacks"><summary>겹친 구성물 따로 보기</summary>{stackedSlots.map(({slot,pieces})=><div key={slot.id} className="gb-tray" aria-label={'겹친 구성물 · '+(slot.label??slot.area.label)}><p className="small muted">{slot.label??slot.area.label}</p><div>{pieces.map(p=>item(p,false))}</div></div>)}</details>}
  {outsideView.length>0&&<div className="gb-tray" aria-label="이 보기의 칸 밖 위치"><span className="small muted">이 보기에 없는 위치 · 다른 보기를 선택하면 저장된 위치로 다시 보여요.</span><div>{outsideView.map(p=>item(p,false))}</div></div>}
  {legacyPositions.length>0&&<details className="gb-legacy-positions"><summary>이전 일반판 위치 보기</summary>{board(area,legacyPositions)}<p className="small muted">이전 위치를 보존했어요. 새 판에 직접 놓은 구성물부터 새 위치로 기록됩니다.</p></details>}
  {partialSlotBoard&&<p className="small muted">부분 기록판 · 확인된 칸만 표시해요. 빠진 구조와 게임 규칙은 자동 판정하지 않아요.</p>}
  {realAssets?.variantSelector?.boardField===fieldKey&&record.pieces.some(p=>p.placement&&realPlacementVariant(p.placement.layoutVariant)!==layoutVariant)&&<p className="small muted">다른 판 구성에 저장된 위치는 미배치 목록에 보존돼요. 이 판에 다시 놓으면 현재 구성으로 저장됩니다.</p>}
  {locationOnly&&<p className="small muted">{real?.network?'도시 사이 노선을 눌러 선택한 열차 말을 해당 칸에 기록해요. 노선 소유자는 상세 수정에서 지정하며 합법성·점수는 자동 판정하지 않아요.':locationTargets.length?'지도에 표시된 영역을 눌러 선택한 구성물의 위치를 기록해요. 영역 간 연결·합법성은 자동 판정하지 않아요.':'지도에서 선택한 구성물의 위치를 기록해요. 경로·이동 규칙은 자동 판정하지 않아요.'}</p>}
  {real?.recordingMode==='interactive-network'&&<p className="small muted">지도의 연결선을 누르면 선택한 링크를 그 위치와 양 끝점에 기록해요. 소유자와 운하·철도 유형은 상세 수정에서 확인·입력하세요. 합법성이나 점수는 자동 판정하지 않아요.</p>}
  {real&&realSlots.length>0&&Math.min(...realSlots.map(slot=>Math.min(slot.w,slot.h)))<60&&<button type="button" className="text-link gb-zoom-hint" onClick={()=>{setZoom(300);setFull(true);}}><Maximize2 size={15} aria-hidden="true"/>칸이 작아요 · 크게 보고 놓기</button>}
  <CarcassonneLayoutPreview pack={pack} record={{...record,pieces:viewPieces.filter(p=>!pictured.has(p.id)||recordedTileIds.has(p.id))}} renderArt={art} disabled={busy} onSelect={id=>{onSelect?.(id);if(!readonly)setEdit(true);}}/>
  {splendor&&viewPieces.some(p=>!pictured.has(p.id))&&<div className="gb-cards" aria-label={`카드로 보기 · ${record.pieces.length}개`}>{viewPieces.filter(p=>!pictured.has(p.id)).slice(0,allCards||record.pieces.length<=CARD_PREVIEW?undefined:CARD_PREVIEW).map(p=><button type="button" key={p.id} className={selected===p.id?'selected':''} aria-pressed={selected===p.id} disabled={busy} onClick={()=>{onSelect?.(p.id);if(!readonly)setEdit(true);const photo=sourceFor(p);if(photoNeeded(p)&&photo)onEvidence?.(photo,p.region??undefined);}}><SplendorReadout {...splendorView(p)}/></button>)}{record.pieces.length>CARD_PREVIEW&&<button type="button" className="button text small-button gb-cards-more" aria-expanded={allCards} onClick={()=>setAllCards(v=>!v)}>{allCards?'접기':`모두 보기 (${record.pieces.length})`}</button>}</div>}
  {!splendor&&[...unplaced,...offBoard].some(p=>!pictured.has(p.id))&&<div className="gb-tray" aria-label="미배치 구성물"><span className="small muted">미배치</span><div>{[...unplaced,...offBoard].filter(p=>!pictured.has(p.id)).map(p=>item(p,false))}</div></div>}
  {!readonly&&onAdd&&<p className="small muted">사진에서 빠진 구성물은 ‘구성물 추가’로 넣고, 확인한 값만 입력하세요.</p>}
  {!readonly&&<div className="gb-actions"><button className="button secondary small-button" disabled={busy} onClick={()=>{onAdd?.();setEdit(true);}}>구성물 추가</button>{piece&&<>{!splendor&&<span className="gb-qty" role="group" aria-label={named(piece)+' 수량'}><button type="button" className="icon-button" aria-label="수량 줄이기" disabled={busy||piece.quantity===null||piece.quantity===0} onClick={()=>patch(piece.id,{quantity:Math.max(0,piece.quantity!-1)})}><Minus size={16}/></button><output aria-live="polite">{piece.quantity===null?'?':piece.quantity}</output><button type="button" className="icon-button" aria-label="수량 늘리기" disabled={busy||piece.quantity===null} onClick={()=>patch(piece.id,{quantity:piece.quantity!+1})}><Plus size={16}/></button></span>}<button className="button text small-button" disabled={busy} onClick={()=>setEdit(true)}>선택 수정</button>{piece.placement&&<button className="button text small-button" disabled={busy} onClick={()=>{const next={...piece,...(piece.spatial?{spatial:{...piece.spatial,manualOverride:true}}:{})};delete next.placement;if(next.structureOverride?.version==='estimated-structure-override-v2')next.structureOverride={...next.structureOverride,active:false};else delete next.structureOverride;change({...record,pieces:record.pieces.map(p=>p.id===piece.id?next:p)});}}>미배치로</button>}{active(piece)&&<button className="icon-button" aria-label="90도 회전" disabled={busy} onClick={()=>piece.spatial?patch(piece.id,{spatial:{...piece.spatial,manualRotationDegrees:spatialRotation(piece)===null?null:((spatialRotation(piece)!+90)%360)}}):patch(piece.id,{placement:{...piece.placement!,rotation:((piece.placement!.rotation+90)%360) as 0|90|180|270}})}><RotateCw size={17}/></button>}</>}</div>}
  {area.artComponentId&&mapping&&<details className="gb-reference"><summary>판 대표 그림</summary><GameComponentArt game={pack.runtime?.source.gameId} mapping={mapping} componentId={area.artComponentId} kind="board" size={160}/><span className="small muted">실제 배치와 별도인 대표 그림이에요.</span></details>}
  {full&&portal(<Modal title={area.label+' 크게 보기'} wide onClose={()=>setFull(false)}><div className="modal-body"><div className="gb-zoom"><button className="icon-button" aria-label="축소" disabled={zoom<=100} onClick={()=>setZoom(z=>z-50)}><Minus size={18}/></button><span>{zoom}%</span><button className="icon-button" aria-label="확대" disabled={zoom>=300} onClick={()=>setZoom(z=>z+50)}><Plus size={18}/></button></div><div className="gb-pan" tabIndex={0} aria-label="기록판 밀어 보기"><div style={{width:readableBoardWidth(real,realAreas)*zoom/100+'px'}}>{observedLayout}{estimatedLayout}{photoLayout}{needsManualSurface&&(dedicatedSurface?realSurface():locationOnly?locationMapSurface():board(area))}</div></div></div></Modal>)}
  {edit&&editor&&piece&&!readonly&&(inline?<section className="gb-inline-editor" aria-label={(piece?named(piece):'구성물')+' 고치기'}><h5>{piece?named(piece):'구성물'}</h5>{locationPreview}{structure&&assertion&&<EstimatedPlacementControls pack={pack} piece={piece} record={record} structure={structure} assertionId={assertion.id} contextAssertions={allAssertions} photo={selectedPhoto} onChange={change} busy={busy}/>} {editor}<button className="button primary small-button" onClick={()=>setEdit(false)}>완료</button></section>:portal(<Modal title={piece?named(piece):'구성물'} onClose={()=>setEdit(false)}><div className="modal-body gb-editor">{locationPreview}{structure&&assertion&&<EstimatedPlacementControls pack={pack} piece={piece} record={record} structure={structure} assertionId={assertion.id} contextAssertions={allAssertions} photo={selectedPhoto} onChange={change} busy={busy}/>} {editor}<button className="button primary full" onClick={()=>setEdit(false)}>완료</button></div></Modal>))}
 </div>;
}
