import type {ReactNode} from 'react';
import type {GenericPiece,GenericRecord} from '../shared/genericRecord';
import type {GamePack} from '../shared/types';
import {estimateBoardStructure,type EstimatedStructureOverride} from '../shared/estimatedBoardStructure';
import {pieceFaceValues} from './pieceFaceValues';
import './estimated-board.css';
type Structure=ReturnType<typeof estimateBoardStructure>;

export function EstimatedBoardSummary({structure,scope='field'}:{structure:Structure;scope?:'field'|'all'}){
 const m=structure.metrics,unassigned=new Set(structure.unassigned.map(p=>p.assertionId+':'+p.pieceId));
 const canonical=structure.retained.filter(i=>i.position.space==='board').length,manual=structure.retained.filter(i=>i.position.space!=='board').length+structure.placements.filter(p=>p.basis==='manual').length,estimated=structure.placements.filter(p=>p.basis==='estimated'&&!unassigned.has(p.assertionId+':'+p.pieceId)).length;
 return <div className="estimated-summary" role="status"><strong>배치 {m.placed}/{m.total} · 읽힌 값 {m.readKnown}/{m.readTotal} · 오독 {m.errorKnown===null?'미확인':m.errorKnown}</strong><details className="estimated-summary-details"><summary>배치 구분·영역</summary><small>정식 칸 {canonical} · 수동 {manual} · 추정 {estimated} · 미분류 {unassigned.size}</small>{structure.areas.filter(a=>scope==='all'||a.total>0).map(a=><small key={a.id}>{a.id==='unclassified'?`분류 대기 ${a.total}개`:a.total===0?`${a.label} 관측 0개 · 확인 자료 없음`:`${a.label} ${a.placed}/${a.total}${a.placed===0?' · 복원 미완료':a.unassigned>0?' · 일부 미배치':''}`}</small>)}</details></div>;
}

/** Existing physical IDs and artwork in the shared estimator's rows; never writes automatic placements. */
export function EstimatedBoardView({pack,structure,record,assertionId,contextPieces=[],renderPiece,onSelect,selected,busy}:{pack:GamePack;structure:Structure;record:GenericRecord;assertionId:string;contextPieces?:readonly GenericPiece[];renderPiece:(p:GenericPiece)=>ReactNode;onSelect:(id:string)=>void;selected?:string;busy:boolean}){
 const placements=structure.placements.filter(p=>p.assertionId===assertionId&&record.pieces.some(piece=>piece.id===p.pieceId)),ids=new Set(placements.map(p=>p.pieceId));
 if(!placements.length&&!structure.areas.length)return null;
 const piece=(id:string)=>record.pieces.find(p=>p.id===id)!;
 const anchorLabel=(id:string)=>{const p=record.pieces.find(p=>p.id===id)??contextPieces.find(p=>p.id===id);return p?pieceFaceValues(pack,p).filter(v=>!v.unknown).map(v=>v.text).join(' · '):'';};
 const render=(id:string)=>{const p=piece(id),values=pieceFaceValues(pack,p),known=values.filter(v=>!v.unknown),kind=pack.runtime?.components.find(c=>c.id===p.componentId)?.kind,unread=known.length===0,rich=known.some(v=>v.text.length>18);
  return <button type="button" key={id} className={['estimated-piece',selected===id?'selected':'',unread?'unread':'',kind==='card'?'is-card':kind==='board'?'is-board':'is-token',rich?'rich-values':''].filter(Boolean).join(' ')} data-drawing-piece={id} aria-pressed={selected===id} disabled={busy} onClick={()=>onSelect(id)}>{renderPiece(p)}{values.length===0&&<strong className="estimated-unknown-value">{pack.runtime?.components.find(c=>c.id===p.componentId)?.name??'종류'} ?</strong>}</button>;};
 const children=(id:string)=>placements.filter(p=>p.attachedToPieceId===id&&p.pieceId!==id);
 const renderWithAttachments=(id:string)=><div key={id} className="estimated-piece-group">{render(id)}{children(id).length>0&&<div className="estimated-attachments"><small>부착 · 추정/수동</small>{children(id).map(c=>render(c.pieceId))}</div>}</div>;
 const roots=(g:Structure['groups'][number])=>placements.filter(p=>p.groupId===g.id&&(!p.attachedToPieceId||!ids.has(p.attachedToPieceId))).sort((a,b)=>a.order-b.order||a.pieceId.localeCompare(b.pieceId));
 const groups=structure.groups.filter(g=>roots(g).length>0||g.side!==null&&placements.some(p=>{const other=structure.groups.find(q=>q.id===p.groupId);return other?.sourceKey===g.sourceKey&&other.areaId===g.areaId;}));
 const groupLabel=(g:Structure['groups'][number])=>g.role==='expedition'||g.role==='discard'?[g.side==='near'?'가까운 편':g.side==='far'?'먼 편':null,g.role==='discard'?'버림':'원정',g.color].filter(Boolean).join(' · '):g.label;
 const renderGroup=(g:Structure['groups'][number])=>{
   const shown=roots(g),anchor=g.anchorPieceId&&structure.gameId!=='seven-wonders'?anchorLabel(g.anchorPieceId):'',label=groupLabel(g);
   const inGrid=(p:Structure['placements'][number])=>!!g.grid&&!!p.cell&&p.cell.row>=1&&p.cell.row<=g.grid.rows&&p.cell.column>=1&&p.cell.column<=g.grid.columns;
   return <section key={g.id} className="estimated-group" data-estimated-group={g.id} data-estimated-role={g.role} data-estimated-side={g.side??undefined}><h4>{label}{anchor&&<span> · {anchor}</span>} <small>{shown.length}개</small></h4>
    {shown.some(p=>p.attachedToPieceId&&!ids.has(p.attachedToPieceId))&&<small>연결 대상 · {shown.filter(p=>p.attachedToPieceId&&!ids.has(p.attachedToPieceId)).map(p=>anchorLabel(p.attachedToPieceId!)||'카드').join(' · ')} (다른 기록 영역)</small>}
    {g.grid&&<small className="estimated-grid-context">{g.grid.basis==='manual-slot-order'?'수동':'추정'} {g.grid.rows}×{g.grid.columns} · 인쇄 방향 미확정</small>}
    <div className="estimated-row-pan" tabIndex={0} aria-label={label+' · 가로로 밀어 보기'}>
    {g.grid?<div className="estimated-grid" style={{gridTemplateColumns:`repeat(${g.grid.columns}, 64px)`}} aria-label={g.grid.basis==='manual-slot-order'?'수동 창문 칸':'사진 기준 추정 창문 칸'}>{Array.from({length:g.grid.rows},(_,row)=>Array.from({length:g.grid!.columns},(_,column)=><div key={row+':'+column} className="estimated-cell" data-estimated-row={row+1} data-estimated-column={column+1} aria-label={`추정 ${row+1}행 ${column+1}열`}><small>{row+1}·{column+1}</small>{shown.filter(p=>p.cell?.row===row+1&&p.cell.column===column+1).map(p=>renderWithAttachments(p.pieceId))}</div>))}</div>:<div className="estimated-row">
    {!shown.length&&<small>이번 관측 0개 · 실제 부재는 미확인</small>}
    {g.slots.length?g.slots.map(slot=><div key={slot} className="estimated-slot"><span>{slot}</span>{shown.filter(p=>p.slot===slot).map(p=>renderWithAttachments(p.pieceId))}</div>):shown.map(p=>renderWithAttachments(p.pieceId))}
    {g.slots.length>0&&shown.filter(p=>p.slot===null).length>0&&<div className="estimated-slot"><span>자리 ?</span>{shown.filter(p=>p.slot===null).map(p=>renderWithAttachments(p.pieceId))}</div>}
    </div>}
    {g.grid&&shown.some(p=>!inGrid(p))&&<div className="estimated-row"><span>칸 ?</span>{shown.filter(p=>!inGrid(p)).map(p=>renderWithAttachments(p.pieceId))}</div>}
    </div>
   </section>;
  };
 const emptyGroups=groups.filter(g=>roots(g).length===0),activeGroups=groups.filter(g=>roots(g).length>0),contextGroups=activeGroups.filter(g=>g.areaId==='board'),mainGroups=activeGroups.filter(g=>g.areaId!=='board');
 const nearFirst=(rows:Structure['groups'])=>{const sources=new Map<string,Structure['groups']>();for(const g of rows)sources.set(g.sourceKey,[...(sources.get(g.sourceKey)??[]),g]);return [...sources.values()].flatMap(gs=>[...gs.filter(g=>g.side==='near'),...gs.filter(g=>g.side==='far'),...gs.filter(g=>g.side===null)]);};
 const displayedMain=structure.gameId==='lost-cities'?nearFirst(mainGroups):mainGroups,displayedEmpty=structure.gameId==='lost-cities'?nearFirst(emptyGroups):emptyGroups;
 const clusters=new Map<string,{anchorId:string|null;groups:Structure['groups']}>();
 if(structure.gameId==='seven-wonders')for(const g of activeGroups){const own=g.areaId==='wonder'?placements.find(p=>p.groupId===g.id&&piece(p.pieceId).componentId==='wonder')?.pieceId:null,anchorId=g.anchorPieceId??own??null,key=anchorId?JSON.stringify([g.sourceKey,anchorId]):'unassigned';const cluster=clusters.get(key)??{anchorId,groups:[]};cluster.groups.push(g);clusters.set(key,cluster);}
 const areaOrder=['wonder','tableau','coins','military'];
 return <section className="estimated-board" aria-label="추정 복원판"><EstimatedBoardSummary structure={structure}/><span className="estimated-badge">추정 배치 · 사람 소유를 뜻하지 않음</span>{structure.gameId==='seven-wonders'?[...clusters.entries()].sort(([a],[b])=>a==='unassigned'?1:b==='unassigned'?-1:a.localeCompare(b)).map(([key,c])=><section className="estimated-cluster" key={key} data-estimated-anchor={c.anchorId??'unassigned'}><h3>{c.anchorId?'불가사의판 · '+(anchorLabel(c.anchorId)||'이름 ?'):'판 연결 미분류'}</h3>{c.groups.filter(g=>g.areaId!=='wonder').sort((a,b)=>areaOrder.indexOf(a.areaId)-areaOrder.indexOf(b.areaId)||a.id.localeCompare(b.id)).map(renderGroup)}{c.groups.some(g=>g.areaId==='wonder')&&<details className="estimated-context"><summary>불가사의판 기준 보기</summary>{c.groups.filter(g=>g.areaId==='wonder').map(renderGroup)}</details>}</section>):displayedMain.map(renderGroup)}{contextGroups.length>0&&<details className="estimated-context"><summary>판 기준 보기</summary>{contextGroups.map(renderGroup)}</details>}{emptyGroups.length>0&&<details className="estimated-empty-groups"><summary>관측 없는 줄 {emptyGroups.length}개</summary>{displayedEmpty.map(renderGroup)}</details>}</section>;
}

export function EstimatedPlacementControls({pack,piece,record,structure,assertionId,onChange,busy}:{pack:GamePack;piece:GenericPiece;record:GenericRecord;structure:Structure;assertionId:string;onChange:(record:GenericRecord)=>void;busy:boolean}){
 const at=structure.placements.find(p=>p.assertionId===assertionId&&p.pieceId===piece.id);if(!at)return null;
 const group=structure.groups.find(g=>g.id===at.groupId),groups=structure.groups.filter(g=>g.sourceKey===group?.sourceKey);
 const patch=(changes:Partial<EstimatedStructureOverride>)=>{const next:EstimatedStructureOverride={version:'estimated-structure-override-v1',areaId:at.areaId,groupId:at.groupId,order:at.order,slot:at.slot,anchorPieceId:at.anchorPieceId,attachedToPieceId:at.attachedToPieceId,...piece.structureOverride,...changes};onChange({...record,pieces:record.pieces.map(p=>p.id===piece.id?{...p,structureOverride:next}:p)});};
 return <details className="estimated-controls"><summary>{at.basis==='manual'?'수동 구조 정정':'추정 구조 고치기'}</summary>
  <label>줄·영역<select aria-label="추정 줄·영역" disabled={busy} value={at.groupId} onChange={e=>{const g=groups.find(g=>g.id===e.target.value);if(g)patch({groupId:g.id,areaId:g.areaId,anchorPieceId:g.anchorPieceId,slot:null,attachedToPieceId:null});}}>{groups.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
  <label>줄 안 순서<input aria-label="추정 줄 안 순서" type="number" min="0" step="1" disabled={busy} value={at.order} onChange={e=>{const n=Number(e.target.value);if(e.target.value!==''&&Number.isSafeInteger(n)&&n>=0)patch({order:n});}}/></label>
  {group?.slots.length? <label>상대 자리<select aria-label="추정 상대 자리" disabled={busy} value={at.slot??''} onChange={e=>patch({slot:e.target.value===''?null:Number(e.target.value)})}><option value="">?</option>{group.slots.map(n=><option key={n} value={n}>{group.grid?`${Math.floor((n-1)/group.grid.columns)+1}행 ${(n-1)%group.grid.columns+1}열 · ${n}`:n}</option>)}</select></label>:null}
  <label>부착할 카드<select aria-label="추정 부착 카드" disabled={busy} value={at.attachedToPieceId??''} onChange={e=>patch({attachedToPieceId:e.target.value||null})}><option value="">미연결</option>{record.pieces.filter(p=>p.id!==piece.id&&p.evidenceId===piece.evidenceId&&pack.runtime?.components.find(c=>c.id===p.componentId)?.kind==='card').map(p=><option key={p.id} value={p.id}>{pieceFaceValues(pack,p).filter(v=>!v.unknown).map(v=>v.text).join(' · ')||pack.runtime?.components.find(c=>c.id===p.componentId)?.name||p.id}</option>)}</select></label>
  {piece.structureOverride&&<button type="button" className="button text small-button" disabled={busy} onClick={()=>onChange({...record,pieces:record.pieces.map(p=>{if(p.id!==piece.id)return p;const next={...p};delete next.structureOverride;return next;})})}>수동 구조 정정 해제</button>}
 </details>;
}
