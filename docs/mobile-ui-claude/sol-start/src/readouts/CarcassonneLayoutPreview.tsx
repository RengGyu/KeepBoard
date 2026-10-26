import React from 'react';
import type {ReactNode} from 'react';
import type {GamePack} from '../../shared/types';
import type {GenericPiece,GenericRecord} from '../../shared/genericRecord';
import {carcassonneLayout} from '../../shared/readouts/carcassonneLayout';
import './game-detail-readout.css';
/** The outline is a coordinate index, NOT a reconstructed printed Carcassonne tile face. */
export function CarcassonneLayoutPreview({pack,record,renderArt,onSelect,disabled=false}:{pack:GamePack;record:GenericRecord;renderArt?:(p:GenericPiece)=>ReactNode;onSelect?:(id:string)=>void;disabled?:boolean}){
 const model=carcassonneLayout(pack,record);if(!model.tiles.length)return null;
 const xs=model.tiles.map(t=>t.x),ys=model.tiles.map(t=>t.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),w=maxX-minX+1,h=maxY-minY+1;
 // Sparse coordinates cannot allocate unbounded CSS columns or unreadably huge SVGs.
 if(w>50||h>50)return <p className="gdr-help">좌표 범위가 넓어 목록으로 표시해요. 원본과 좌표값은 유지됩니다.</p>;
 return <section className="gdr-layout" aria-label="카르카손 기록 좌표"><h4>타일·미플 연결</h4><p className="gdr-help">직접 확인한 칸 좌표 · 지형의 실제 모양은 원본 사진에서 확인해요.</p>
 {model.collisions.length>0&&<p role="alert">같은 칸에 기록한 별개 타일이 있어요. 어느 타일도 자동 삭제하지 않았어요.</p>}
 <div className="gdr-grid-scroll"><div className="gdr-grid" style={{gridTemplateColumns:`repeat(${w},112px)`,gridTemplateRows:`repeat(${h},auto)`}}>
 {model.tiles.map(t=><button type="button" key={t.piece.id} className="gdr-grid-tile" disabled={disabled} style={{gridColumn:t.x-minX+1,gridRow:t.y-minY+1}} onClick={()=>onSelect?.(t.piece.id)} aria-label={`${t.piece.label||'타일'} · ${t.x}, ${t.y}`}>
 <small>{t.x}, {t.y}</small>{renderArt?.(t.piece)}<strong>{t.piece.label||'지형 타일'}</strong>
 {t.followers.map(f=><span key={f.piece.id}>{f.piece.label||'미플'} → {f.feature?.label||'내부 위치 모름'}</span>)}
 </button>)}
 </div></div>{model.unmappedIds.length>0&&<p className="gdr-help">정확한 칸 좌표가 없는 타일 {model.unmappedIds.length}개는 기존 배치와 원본에 남아 있어요.</p>}
 </section>;
}
