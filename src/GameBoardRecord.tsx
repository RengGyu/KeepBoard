import {useRealAssets,realAreasFor,realFreeAreasFor,realBoardSvg,realSlotAccepts,type RealBoard,type RealNetworkRoute} from './realBoards';
import {CarcassonneLayoutPreview} from './readouts/CarcassonneLayoutPreview';
import {GameDetailReadout} from './readouts/GameDetailReadout';
import {useEffect,useRef,useState,type ReactNode,type PointerEvent} from 'react';
import {createPortal} from 'react-dom';
import {Maximize2,Minus,Plus,RotateCw,Undo2} from 'lucide-react';
import type {GenericPiece,GenericPlacement,GenericRecord} from '../shared/genericRecord';
import type {GamePack,Player} from '../shared/types';
import {GameComponentArt} from './GameComponentArt';
import {boardAreas,compatibleBoard,loadBoardVisuals,pendingArt,recordSurfacePoint,visiblePlacement,type BoardVisual,type BoardArea} from './boardVisuals';
import type {ArtMapping} from './artResolver';
import {Modal} from './ui';
import './game-board-record.css';
import {GenericPieceArt} from './GenericPieceArt';
import {SplendorReadout,describeSplendor} from './SplendorReadout';
import {isSplendor,splendorView} from './SplendorEditor';
import {emptyGameReadout,gameReadoutView,setReadoutValue} from '../shared/readouts/registry';
const CARD_PREVIEW=6;
interface Props {players?:number;playerDetails?:readonly Player[];pack:GamePack;fieldKey:string;record:GenericRecord;mapping?:ArtMapping;ownerColor?:string;selected?:string;onSelect?:(id:string)=>void;onChange?:(r:GenericRecord)=>void;onAdd?:()=>void;busy:boolean;editor?:ReactNode;readonly?:boolean;startEditing?:boolean;layoutVariant?:string;onLayoutVariantChange?:(variant:string)=>void;layoutVariantBusy?:boolean}
const pct=(value:number,total:number)=>`${value/total*100}%`;

export function GameBoardRecord({players,playerDetails,pack,fieldKey,record,mapping,ownerColor,selected,onSelect,onChange,onAdd,busy,editor,readonly=false,startEditing=false,layoutVariant='base',onLayoutVariantChange,layoutVariantBusy=false}:Props){
 const [inline,setInline]=useState(()=>typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia('(min-width:901px)').matches);
 useEffect(()=>{if(typeof window==='undefined'||typeof window.matchMedia!=='function')return;const q=window.matchMedia('(min-width:901px)'),f=()=>setInline(q.matches);q.addEventListener?.('change',f);return()=>q.removeEventListener?.('change',f);},[]);
 const [allCards,setAllCards]=useState(false),[visual,setVisual]=useState<BoardVisual>(),[areaId,setAreaId]=useState(''),[edit,setEdit]=useState(()=>startEditing&&!!selected&&!readonly),[full,setFull]=useState(false),[zoom,setZoom]=useState(100);
 const loadedAssets=useRealAssets(pack.runtime?.source.gameId,layoutVariant),realAssets=loadedAssets?.selectedVariant===layoutVariant?loadedAssets:null,real:RealBoard|null=realAssets?.board??null;
 const history=useRef<GenericRecord[]>([]),drag=useRef<{id:string;x:number;y:number}|null>(null),moved=useRef(false),networkSvg=useRef<SVGSVGElement|null>(null);
 useEffect(()=>{let alive=true;loadBoardVisuals().then(all=>{if(alive)setVisual(all.find(v=>v.gameId===pack.runtime?.source.gameId));},()=>{});return()=>{alive=false;};},[pack.runtime?.source.gameId]);
 const areas=boardAreas(pack,fieldKey,visual),area=areas.find(a=>a.areaId===areaId)??areas.find(a=>a.areaId===real?.network?.areaId)??areas[0],compatible=compatibleBoard(pack,visual);
 const realAreas=real?realAreasFor(real,fieldKey,players):[];
 const freeAreas=real?realFreeAreasFor(real,fieldKey,players):[];
 const locationArea=realAreas.find(a=>a.placement==='location-only');
 const locationOnly=!!real&&real.recordingMode==='location-only'&&!!locationArea&&compatible;
 const piece=record.pieces.find(p=>p.id===selected),named=(p:GenericPiece)=>p.label||pack.runtime?.components.find(c=>c.id===p.componentId)?.name||'모름';
 const fieldUsesVariant=realAssets?.variantSelector?.boardField===fieldKey;
 const layoutMatches=(p:GenericPiece)=>!fieldUsesVariant||(p.placement?.layoutVariant??'base')===layoutVariant;
 const active=(p:GenericPiece)=>layoutMatches(p)&&area&&(!locationOnly||realSlotAccepts(locationArea?.accepts,p.componentId))&&visiblePlacement(p,area,compatible);
 const placed=record.pieces.filter(p=>active(p)),unplaced=record.pieces.filter(p=>!p.placement||!compatible||!layoutMatches(p)||!areas.some(a=>visiblePlacement(p,a,true)&&(!locationOnly||realSlotAccepts(locationArea?.accepts,p.componentId))));
 function change(next:GenericRecord){if(!onChange||busy)return;history.current.push(structuredClone(record));onChange(next);}
 function patch(id:string,update:Partial<GenericPiece>){change({...record,pieces:record.pieces.map(p=>p.id===id?{...p,...update}:p)});}
 function makePlacement(areaId:string,x:number,y:number,rotation:0|90|180|270):GenericPlacement{return {areaId,x,y,rotation,...(fieldUsesVariant?{layoutVariant}:{})};}
 function put(id:string,x:number,y:number){const target=record.pieces.find(p=>p.id===id);if(!area||!compatible||readonly||locationOnly&&!realSlotAccepts(locationArea?.accepts,target?.componentId))return;const old=target?.placement;patch(id,{placement:makePlacement(area.areaId,Math.max(0,Math.min(1,x)),Math.max(0,Math.min(1,y)),old?.rotation??0)});}
 function freeAreaAt(p:GenericPiece,x:number,y:number){
  if(!real||!Number.isFinite(x)||!Number.isFinite(y))return undefined;
  const [vx,vy,vw,vh]=real.viewBox,px=vx+x*vw,py=vy+y*vh;
  return freeAreas.find(a=>{const [ax,ay,aw,ah]=a.bounds!;return realSlotAccepts(a.accepts,p.componentId)&&px>=ax&&px<=ax+aw&&py>=ay&&py<=ay+ah;});
 }
 function putOnFreeArea(id:string,x:number,y:number){
  const target=record.pieces.find(p=>p.id===id);
  if(!target||!area||!compatible||readonly||busy||x<0||x>1||y<0||y>1||!freeAreaAt(target,x,y))return;
  patch(id,{placement:makePlacement(area.areaId,x,y,target.placement?.rotation??0)});
 }
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
 function art(p:GenericPiece){if(splendor)return <SplendorReadout {...splendorView(p)} size="mini"/>;return pendingArt(visual,p.componentId)?<GameComponentArt kind="unknown" label={named(p)+' · 그림 확인 중'} size={52}/>:p.variant?<GameComponentArt game={pack.runtime?.source.gameId} mapping={mapping} componentId={p.componentId??'__unknown'} kind="unknown" variant={p.variant} color={ownerColor??'#929990'} size={52} label={named(p)}/>:<GenericPieceArt pack={pack} piece={p} mapping={mapping} symbols={realAssets?.symbols}/>;}
 function item(p:GenericPiece,location:boolean,boardCoordinates=false){const pos=location?active(p):undefined;return <button type="button" key={p.id} className={'gb-piece'+(selected===p.id?' selected':'')+(pos?' placed':'')} aria-label={splendor?describeSplendor(splendorView(p)):named(p)+', '+(p.quantity===null?'수량 모름':p.quantity+'개')} aria-pressed={selected===p.id} disabled={busy} style={pos?{left:boardCoordinates?pct(pos.x,1):'calc(40px + '+pos.x+' * (100% - 80px))',top:boardCoordinates?pct(pos.y,1):'calc(40px + '+pos.y+' * (100% - 80px))',transform:'translate(-50%,-50%) rotate('+pos.rotation+'deg)'}:undefined} onClick={e=>{e.stopPropagation();if(moved.current){moved.current=false;return;}onSelect?.(p.id);if(!readonly)setEdit(true);}} onPointerDown={e=>{if(readonly)return;moved.current=false;drag.current={id:p.id,x:e.clientX,y:e.clientY};onSelect?.(p.id);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={endDrag} onPointerCancel={()=>{drag.current=null;}}>{art(p)}{!splendor&&<><span>{named(p)}</span><b>{p.quantity===null?'?':p.quantity}</b><GameDetailReadout pack={pack} piece={p} players={playerDetails} compact/></>}</button>;}
 function board(current:BoardArea){const drawn=real&&!realSlots.length&&!real.network&&!locationOnly;return <div className={'gb-surface'+(drawn?' is-drawn':'')} aria-label={current.label+' · 수동 기록 배치'} style={drawn?{backgroundImage:`url(${realBoardSvg(real)})`,aspectRatio:`${real.viewBox[2]} / ${real.viewBox[3]}`}:{backgroundImage:'url(/game-art/boards/'+current.template+'.svg)'}} onClick={e=>{if(moved.current){moved.current=false;return;}if(piece&&!readonly){const r=e.currentTarget.getBoundingClientRect(),point=recordSurfacePoint(e.clientX-r.left,e.clientY-r.top,r.width,r.height);put(piece.id,point.x,point.y);}}}>{placed.map(p=>item(p,true))}{placed.length===0&&<span className="gb-empty">{unplaced.length?'아래 구성물을 골라 놓아 주세요':'아직 놓인 구성물이 없어요'}</span>}</div>;}
 const realSlots=realAreas.flatMap(a=>a.slots.map(slot=>({...slot,area:a})));
 const partialSlotBoard=real?.recordingMode==='partial-slots'&&realSlots.length>0;
 const locationTargets=locationOnly?realAreas.filter(a=>a.id!==locationArea?.id&&a.placement==='free-pieces'&&!!a.bounds):[];
 const slotOf=(p:GenericPiece)=>{const at=active(p);if(!at||!real)return null;const [vx,vy,vw,vh]=real.viewBox,x=vx+at.x*vw,y=vy+at.y*vh;return realSlots.find(s=>realSlotAccepts(s.area.accepts,p.componentId)&&x>=s.x&&x<=s.x+s.w&&y>=s.y&&y<=s.y+s.h)??null;};
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
   {freeAreas.map(target=>{const [x,y,w,h]=target.bounds!,canPlace=!!piece&&realSlotAccepts(target.accepts,piece.componentId);return <button type="button" key={target.id} className={'gb-free-area'+(canPlace?' ready':'')} data-area-id={target.id} style={{left:pct(x-vx,vw),top:pct(y-vy,vh),width:pct(w,vw),height:pct(h,vh)}} aria-label={`${target.label}에 선택한 구성물 놓기`} disabled={busy||readonly||!compatible||!canPlace} onClick={e=>{e.stopPropagation();if(!piece||readonly||busy)return;const canvas=e.currentTarget.closest<HTMLElement>('.gb-real'),rect=canvas?.getBoundingClientRect();if(!rect)return;const px=e.detail===0?(x+w/2-vx)/vw:(e.clientX-rect.left)/Math.max(1,rect.width),py=e.detail===0?(y+h/2-vy)/vh:(e.clientY-rect.top)/Math.max(1,rect.height);putOnFreeArea(piece.id,px,py);}}/>;})}
   {realSlots.map(s=>{const here=placed.filter(p=>slotOf(p)?.id===s.id),canPlace=!!piece&&realSlotAccepts(s.area.accepts,piece.componentId),hex=s.shape==='hex';return <button type="button" key={s.area.id+s.id} className={'gb-slot'+(hex?' hex':'')+(here.length?' filled':'')+(canPlace&&!here.length?' ready':'')} style={{left:pct(s.x-vx,vw),top:pct(s.y-vy,vh),width:pct(s.w,vw),height:pct(s.h,vh)}} aria-label={`${s.area.label}${here.length?': '+here.map(named).join(', '):canPlace?' 빈 칸':' · '+(s.area.accepts??[]).map(id=>pack.runtime?.components.find(c=>c.id===id)?.name??id).join('·')+'만 배치 가능'}`} disabled={busy||(readonly&&!here.length)||(!here.length&&!!piece&&!canPlace)} onClick={()=>{if(here.length){onSelect?.(here[0].id);if(!readonly)setEdit(true);}else if(piece&&!readonly&&canPlace)patch(piece.id,{placement:makePlacement(area!.areaId,(s.x+s.w/2-vx)/vw,(s.y+s.h/2-vy)/vh,piece.placement?.rotation??0)});}}>{here[0]&&<span className="gb-slot-art">{art(here[0])}</span>}{here.length>1&&<b>{here.length}</b>}</button>;})}
   {/* Fixed pieces are drawn once; actual variable collections keep free positions. */}
   {placed.filter(p=>!slotOf(p)&&(locationOnly||!!freeAreaAt(p,p.placement!.x,p.placement!.y))).map(p=>item(p,true,!locationOnly))}
  </div>;
 }
 function locationMapSurface(){
  const [vx,vy,vw,vh]=real!.viewBox,[bx,by,bw,bh]=locationArea!.bounds??[vx,vy,vw,vh];
  const canSelectRoute=!!piece&&!!networkArea&&['trains','links'].includes(piece.componentId??'')&&realSlotAccepts(networkArea.accepts,piece.componentId)&&!readonly&&!busy;
  return <div className={'gb-real gb-location-map'+(real!.network?' gb-network-map':'')} style={{aspectRatio:`${bw} / ${bh}`}} aria-label={area!.label+' · 위치 기록'} onClick={e=>{if(moved.current){moved.current=false;return;}if(real!.network&&canSelectRoute)return;if(piece&&!readonly&&realSlotAccepts(locationArea?.accepts,piece.componentId)){const r=e.currentTarget.getBoundingClientRect(),point=recordSurfacePoint(e.clientX-r.left,e.clientY-r.top,r.width,r.height);put(piece.id,point.x,point.y);}}}>
   <img src={realBoardSvg(real!)} alt="" width={vw} height={vh} style={{width:pct(vw,bw),height:pct(vh,bh),left:pct(-bx,bw),top:pct(-by,bh)}}/>
   {real!.network&&networkLayer([bx,by,bw,bh],true)}
   {locationTargets.map(target=>{const [tx,ty,tw,th]=target.bounds!;return <button key={target.id} type="button" className="gb-location-target" style={{left:pct(tx-bx,bw),top:pct(ty-by,bh),width:pct(tw,bw),height:pct(th,bh)}} aria-label={`${target.label}에 선택한 구성물 놓기`} disabled={busy||readonly||!piece||!realSlotAccepts(target.accepts,piece?.componentId)} onClick={e=>{e.stopPropagation();const surface=e.currentTarget.closest<HTMLElement>('.gb-real'),rect=surface?.getBoundingClientRect();if(!piece||!rect)return;const centerX=(tx+tw/2-bx)/bw*rect.width,centerY=(ty+th/2-by)/bh*rect.height,point=recordSurfacePoint(centerX,centerY,rect.width,rect.height);patch(piece.id,{placement:makePlacement(area!.areaId,point.x,point.y,piece.placement?.rotation??0)});}}>{target.id.startsWith('gate-')?`G${target.id.slice(5)}`:target.id.replace('planet-','').replace('-', '·')}</button>;})}
   {placed.map(p=>item(p,true))}
   {placed.length===0&&<span className="gb-empty">구성물을 선택한 뒤 지도에서 위치를 기록해 주세요</span>}
  </div>;
 }
 const dedicatedSurface=!!real&&(realSlots.length>0||freeAreas.length>0);
 const offBoard=dedicatedSurface?placed.filter(p=>!slotOf(p)&&!(locationOnly||freeAreaAt(p,p.placement!.x,p.placement!.y))):[];
 const portal=(node:ReactNode)=>typeof document==='undefined'?null:createPortal(node,document.body);
 if(!area)return null;
 return <div className="gb-record">
  <div className="gb-toolbar">{realAssets?.variantSelector?.boardField===fieldKey?<label className="gb-area-label">판 구성<select aria-label="판 구성" value={layoutVariant} disabled={busy||layoutVariantBusy||!onLayoutVariantChange} onChange={e=>onLayoutVariantChange?.(e.target.value)}>{realAssets.variantSelector.options.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>:areas.length>1?<label className="gb-area-label">영역<select aria-label="판 영역" value={area.areaId} onChange={e=>setAreaId(e.target.value)}>{areas.map(a=><option key={a.areaId} value={a.areaId}>{a.label}</option>)}</select></label>:<span className="small muted">기록 배치</span>}<div className="button-row">{!readonly&&<button className="icon-button" aria-label="배치 되돌리기" disabled={busy||!history.current.length} onClick={()=>onChange?.(history.current.pop()!)}><Undo2 size={17}/></button>}<button className="button secondary small-button" onClick={()=>setFull(true)}><Maximize2 size={16}/>크게 보기</button></div></div>
  {!compatible&&visual&&<p className="small muted">이전 기록 · 위치는 그대로 보존돼요.</p>}
  {dedicatedSurface?realSurface():locationOnly?locationMapSurface():board(area)}
  {partialSlotBoard&&<p className="small muted">부분 기록판 · 확인된 칸만 표시해요. 빠진 구조와 게임 규칙은 자동 판정하지 않아요.</p>}
  {realAssets?.variantSelector?.boardField===fieldKey&&record.pieces.some(p=>p.placement&&(p.placement.layoutVariant??'base')!==layoutVariant)&&<p className="small muted">다른 판 구성에 저장된 위치는 미배치 목록에 보존돼요. 이 판에 다시 놓으면 현재 구성으로 저장됩니다.</p>}
  {locationOnly&&<p className="small muted">{real?.network?'도시 사이 노선을 눌러 선택한 열차 말을 해당 칸에 기록해요. 노선 소유자는 상세 수정에서 지정하며 합법성·점수는 자동 판정하지 않아요.':locationTargets.length?'지도에 표시된 영역을 눌러 선택한 구성물의 위치를 기록해요. 영역 간 연결·합법성은 자동 판정하지 않아요.':'지도에서 선택한 구성물의 위치를 기록해요. 경로·이동 규칙은 자동 판정하지 않아요.'}</p>}
  {real?.recordingMode==='interactive-network'&&<p className="small muted">지도의 연결선을 누르면 선택한 링크를 그 위치와 양 끝점에 기록해요. 소유자와 운하·철도 유형은 상세 수정에서 확인·입력하세요. 합법성이나 점수는 자동 판정하지 않아요.</p>}
  {real&&realSlots.length>0&&Math.min(...realSlots.map(slot=>Math.min(slot.w,slot.h)))<60&&<button type="button" className="text-link gb-zoom-hint" onClick={()=>{setZoom(300);setFull(true);}}><Maximize2 size={15} aria-hidden="true"/>칸이 작아요 · 크게 보고 놓기</button>}
  <CarcassonneLayoutPreview pack={pack} record={record} renderArt={art} disabled={busy} onSelect={id=>{onSelect?.(id);if(!readonly)setEdit(true);}}/>
  {splendor&&record.pieces.length>0&&<div className="gb-cards" aria-label={`카드로 보기 · ${record.pieces.length}개`}>{record.pieces.slice(0,allCards||record.pieces.length<=CARD_PREVIEW?undefined:CARD_PREVIEW).map(p=><button type="button" key={p.id} className={selected===p.id?'selected':''} aria-pressed={selected===p.id} disabled={busy} onClick={()=>{onSelect?.(p.id);if(!readonly)setEdit(true);}}><SplendorReadout {...splendorView(p)}/></button>)}{record.pieces.length>CARD_PREVIEW&&<button type="button" className="button text small-button gb-cards-more" aria-expanded={allCards} onClick={()=>setAllCards(v=>!v)}>{allCards?'접기':`모두 보기 (${record.pieces.length})`}</button>}</div>}
  {!splendor&&unplaced.length+offBoard.length>0&&<div className="gb-tray" aria-label="미배치 구성물"><span className="small muted">미배치</span><div>{[...unplaced,...offBoard].map(p=>item(p,false))}</div></div>}
  {!readonly&&<div className="gb-actions"><button className="button secondary small-button" disabled={busy} onClick={()=>{onAdd?.();setEdit(true);}}>구성물 추가</button>{piece&&<>{!splendor&&<span className="gb-qty" role="group" aria-label={named(piece)+' 수량'}><button type="button" className="icon-button" aria-label="수량 줄이기" disabled={busy||piece.quantity===null||piece.quantity===0} onClick={()=>patch(piece.id,{quantity:Math.max(0,piece.quantity!-1)})}><Minus size={16}/></button><output aria-live="polite">{piece.quantity===null?'?':piece.quantity}</output><button type="button" className="icon-button" aria-label="수량 늘리기" disabled={busy||piece.quantity===null} onClick={()=>patch(piece.id,{quantity:piece.quantity!+1})}><Plus size={16}/></button></span>}<button className="button text small-button" disabled={busy} onClick={()=>setEdit(true)}>선택 수정</button>{piece.placement&&<button className="button text small-button" disabled={busy} onClick={()=>{const next={...piece};delete next.placement;change({...record,pieces:record.pieces.map(p=>p.id===piece.id?next:p)});}}>미배치로</button>}{active(piece)&&<button className="icon-button" aria-label="90도 회전" disabled={busy} onClick={()=>patch(piece.id,{placement:{...piece.placement!,rotation:((piece.placement!.rotation+90)%360) as 0|90|180|270}})}><RotateCw size={17}/></button>}</>}</div>}
  {area.artComponentId&&mapping&&<details className="gb-reference"><summary>판 대표 그림</summary><GameComponentArt game={pack.runtime?.source.gameId} mapping={mapping} componentId={area.artComponentId} kind="board" size={160}/><span className="small muted">실제 배치와 별도인 대표 그림이에요.</span></details>}
  {full&&portal(<Modal title={area.label+' 크게 보기'} wide onClose={()=>setFull(false)}><div className="modal-body"><div className="gb-zoom"><button className="icon-button" aria-label="축소" disabled={zoom<=100} onClick={()=>setZoom(z=>z-50)}><Minus size={18}/></button><span>{zoom}%</span><button className="icon-button" aria-label="확대" disabled={zoom>=300} onClick={()=>setZoom(z=>z+50)}><Plus size={18}/></button></div><div className="gb-pan" tabIndex={0} aria-label="기록판 밀어 보기"><div style={{width:360*zoom/100+'px'}}>{dedicatedSurface?realSurface():locationOnly?locationMapSurface():board(area)}</div></div></div></Modal>)}
  {edit&&editor&&!readonly&&(inline?<section className="gb-inline-editor" aria-label={(piece?named(piece):'구성물')+' 고치기'}><h5>{piece?named(piece):'구성물'}</h5>{editor}<button className="button primary small-button" onClick={()=>setEdit(false)}>완료</button></section>:portal(<Modal title={piece?named(piece):'구성물'} onClose={()=>setEdit(false)}><div className="modal-body gb-editor">{editor}<button className="button primary full" onClick={()=>setEdit(false)}>완료</button></div></Modal>))}
 </div>;
}
