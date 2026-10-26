import {useEffect,useRef,useState,type ReactNode,type PointerEvent} from 'react';
import {createPortal} from 'react-dom';
import {Maximize2,Minus,Plus,RotateCw,Undo2} from 'lucide-react';
import type {GenericPiece,GenericRecord} from '../shared/genericRecord';
import type {GamePack} from '../shared/types';
import {GameComponentArt} from './GameComponentArt';
import {boardAreas,compatibleBoard,loadBoardVisuals,pendingArt,recordSurfacePoint,visiblePlacement,type BoardVisual,type BoardArea} from './boardVisuals';
import type {ArtMapping} from './artResolver';
import {Modal} from './ui';
import './game-board-record.css';
import {GenericPieceArt} from './GenericPieceArt';
import {SplendorReadout,describeSplendor} from './SplendorReadout';
import {isSplendor,splendorView} from './SplendorEditor';
interface Props {pack:GamePack;fieldKey:string;record:GenericRecord;mapping?:ArtMapping;ownerColor?:string;selected?:string;onSelect?:(id:string)=>void;onChange?:(r:GenericRecord)=>void;onAdd?:()=>void;busy:boolean;editor?:ReactNode;readonly?:boolean}
export function GameBoardRecord({pack,fieldKey,record,mapping,ownerColor,selected,onSelect,onChange,onAdd,busy,editor,readonly=false}:Props){
 const [visual,setVisual]=useState<BoardVisual>(),[areaId,setAreaId]=useState(''),[edit,setEdit]=useState(false),[full,setFull]=useState(false),[zoom,setZoom]=useState(100);
 const history=useRef<GenericRecord[]>([]),drag=useRef<{id:string;x:number;y:number}|null>(null),moved=useRef(false);
 useEffect(()=>{let alive=true;loadBoardVisuals().then(all=>{if(alive)setVisual(all.find(v=>v.gameId===pack.runtime?.source.gameId));},()=>{});return()=>{alive=false;};},[pack.runtime?.source.gameId]);
 const areas=boardAreas(pack,fieldKey,visual),area=areas.find(a=>a.areaId===areaId)??areas[0],compatible=compatibleBoard(pack,visual);
 const piece=record.pieces.find(p=>p.id===selected),named=(p:GenericPiece)=>p.label||pack.runtime?.components.find(c=>c.id===p.componentId)?.name||'모름';
 const active=(p:GenericPiece)=>area&&visiblePlacement(p,area,compatible);
 const placed=record.pieces.filter(p=>active(p)),unplaced=record.pieces.filter(p=>!p.placement||!compatible||!areas.some(a=>visiblePlacement(p,a,true)));
 function change(next:GenericRecord){if(!onChange||busy)return;history.current.push(structuredClone(record));onChange(next);}
 function patch(id:string,update:Partial<GenericPiece>){change({...record,pieces:record.pieces.map(p=>p.id===id?{...p,...update}:p)});}
 function put(id:string,x:number,y:number){if(!area||!compatible||readonly)return;const old=record.pieces.find(p=>p.id===id)?.placement;patch(id,{placement:{areaId:area.areaId,x:Math.max(0,Math.min(1,x)),y:Math.max(0,Math.min(1,y)),rotation:old?.rotation??0}});}
 function endDrag(e:PointerEvent<HTMLElement>){const d=drag.current;drag.current=null;const canvas=e.currentTarget.closest<HTMLElement>('.gb-surface')??e.currentTarget.closest('.gb-record')?.querySelector<HTMLElement>('.gb-surface');if(d&&canvas&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>6){moved.current=true;const r=canvas.getBoundingClientRect(),point=recordSurfacePoint(e.clientX-r.left,e.clientY-r.top,r.width,r.height);put(d.id,point.x,point.y);}}
 const splendor=isSplendor(pack);
 function art(p:GenericPiece){if(splendor)return <SplendorReadout {...splendorView(p)} size="mini"/>;return pendingArt(visual,p.componentId)?<GameComponentArt kind="unknown" label={named(p)+' · 그림 확인 중'} size={52}/>:p.variant?<GameComponentArt game={pack.runtime?.source.gameId} mapping={mapping} componentId={p.componentId??'__unknown'} kind="unknown" variant={p.variant} color={ownerColor??'#929990'} size={52} label={named(p)}/>:<GenericPieceArt pack={pack} piece={p} mapping={mapping}/>;}
 function item(p:GenericPiece,location:boolean){const pos=location?active(p):undefined;return <button type="button" key={p.id} className={'gb-piece'+(selected===p.id?' selected':'')+(pos?' placed':'')} aria-label={splendor?describeSplendor(splendorView(p)):named(p)+', '+(p.quantity===null?'수량 모름':p.quantity+'개')} aria-pressed={selected===p.id} disabled={busy} style={pos?{left:'calc(40px + '+pos.x+' * (100% - 80px))',top:'calc(40px + '+pos.y+' * (100% - 80px))',transform:'translate(-50%,-50%) rotate('+pos.rotation+'deg)'}:undefined} onClick={e=>{e.stopPropagation();if(moved.current){moved.current=false;return;}onSelect?.(p.id);if(!readonly)setEdit(true);}} onPointerDown={e=>{if(readonly)return;moved.current=false;drag.current={id:p.id,x:e.clientX,y:e.clientY};onSelect?.(p.id);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={endDrag} onPointerCancel={()=>{drag.current=null;}}>{art(p)}{!splendor&&<><span>{named(p)}</span><b>{p.quantity===null?'?':p.quantity}</b></>}</button>;}
 function board(current:BoardArea){return <div className="gb-surface" aria-label={current.label+' · 수동 기록 배치'} style={{backgroundImage:'url(/game-art/boards/'+current.template+'.svg)'}} onClick={e=>{if(moved.current){moved.current=false;return;}if(piece&&!readonly){const r=e.currentTarget.getBoundingClientRect(),point=recordSurfacePoint(e.clientX-r.left,e.clientY-r.top,r.width,r.height);put(piece.id,point.x,point.y);}}}>{placed.map(p=>item(p,true))}{placed.length===0&&<span className="gb-empty">{unplaced.length?'아래 구성물을 골라 놓아 주세요':'아직 놓인 구성물이 없어요'}</span>}</div>;}
 const portal=(node:ReactNode)=>typeof document==='undefined'?null:createPortal(node,document.body);
 if(!area)return null;
 return <div className="gb-record">
  <div className="gb-toolbar">{areas.length>1?<label className="gb-area-label">영역<select aria-label="판 영역" value={area.areaId} onChange={e=>setAreaId(e.target.value)}>{areas.map(a=><option key={a.areaId} value={a.areaId}>{a.label}</option>)}</select></label>:<span className="small muted">기록 배치</span>}<div className="button-row">{!readonly&&<button className="icon-button" aria-label="배치 되돌리기" disabled={busy||!history.current.length} onClick={()=>onChange?.(history.current.pop()!)}><Undo2 size={17}/></button>}<button className="button secondary small-button" onClick={()=>setFull(true)}><Maximize2 size={16}/>크게 보기</button></div></div>
  {!compatible&&visual&&<p className="small muted">이전 기록 · 위치는 그대로 보존돼요.</p>}
  {board(area)}
  {splendor&&record.pieces.length>0&&<div className="gb-cards" aria-label={`카드로 보기 · ${record.pieces.length}개`}>{record.pieces.map(p=><button type="button" key={p.id} className={selected===p.id?'selected':''} aria-pressed={selected===p.id} disabled={busy} onClick={()=>{onSelect?.(p.id);if(!readonly)setEdit(true);}}><SplendorReadout {...splendorView(p)}/></button>)}</div>}
  {!splendor&&unplaced.length>0&&<div className="gb-tray" aria-label="미배치 구성물"><span className="small muted">미배치</span><div>{unplaced.map(p=>item(p,false))}</div></div>}
  {!readonly&&<div className="gb-actions"><button className="button secondary small-button" disabled={busy} onClick={()=>{onAdd?.();setEdit(true);}}>구성물 추가</button>{piece&&<><button className="button text small-button" disabled={busy} onClick={()=>setEdit(true)}>선택 수정</button>{piece.placement&&<button className="button text small-button" disabled={busy} onClick={()=>{const next={...piece};delete next.placement;change({...record,pieces:record.pieces.map(p=>p.id===piece.id?next:p)});}}>미배치로</button>}{active(piece)&&<button className="icon-button" aria-label="90도 회전" disabled={busy} onClick={()=>patch(piece.id,{placement:{...piece.placement!,rotation:((piece.placement!.rotation+90)%360) as 0|90|180|270}})}><RotateCw size={17}/></button>}</>}</div>}
  {area.artComponentId&&mapping&&<details className="gb-reference"><summary>판 대표 그림</summary><GameComponentArt game={pack.runtime?.source.gameId} mapping={mapping} componentId={area.artComponentId} kind="board" size={160}/><span className="small muted">실제 배치와 별도인 대표 그림이에요.</span></details>}
  {full&&portal(<Modal title={area.label+' 크게 보기'} wide onClose={()=>setFull(false)}><div className="modal-body"><div className="gb-zoom"><button className="icon-button" aria-label="축소" disabled={zoom<=100} onClick={()=>setZoom(z=>z-50)}><Minus size={18}/></button><span>{zoom}%</span><button className="icon-button" aria-label="확대" disabled={zoom>=300} onClick={()=>setZoom(z=>z+50)}><Plus size={18}/></button></div><div className="gb-pan" tabIndex={0} aria-label="기록판 밀어 보기"><div style={{width:360*zoom/100+'px'}}>{board(area)}</div></div></div></Modal>)}
  {edit&&editor&&!readonly&&portal(<Modal title={piece?named(piece):'구성물'} onClose={()=>setEdit(false)}><div className="modal-body gb-editor">{editor}<button className="button primary full" onClick={()=>setEdit(false)}>완료</button></div></Modal>)}
 </div>;
}
