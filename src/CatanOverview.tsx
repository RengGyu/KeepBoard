import { useEffect, useRef, useState } from 'react';
import type { SessionView, Value } from '../shared/types';
import { CATAN_TOPOLOGY, COASTAL_EDGES, coastalEdge, harborPoint } from '../shared/scene';
import { canonicalBoard, confirmed, factValue, inspectTrade, objectValue, playerSummary, RESOURCE_NAMES, RESOURCES, tradeRemaining, type KnownNumber, type Resource, type TradeRecord } from '../shared/catanSummary';
import { CountsEditor, type Mutate } from './Fields';
import { api } from './api';
import { Modal } from './ui';
import './catan-workspace.css';

const showNumber = (n: KnownNumber) => n.value !== null ? String(n.value) : '모름';
export function CatanOverview({ view, ownerId, busy, mutate, onOwner, onReadyToSave }: { view: SessionView; ownerId?: string; busy: boolean; mutate: Mutate; onOwner: (id?: string) => void; onPreserve?: () => void; onReadyToSave?: (save: (() => Promise<void>) | null) => void }) {
  const { session, pack } = view;
  const [tradePlayer, setTradePlayer] = useState<string | null>(null);
  const saves = useRef(new Map<string, () => Promise<void>>());
  useEffect(() => { onReadyToSave?.(async () => { for (const save of [...saves.current.values()]) await save(); }); return () => onReadyToSave?.(null); });
  if (pack.id !== 'catan-base') return null;
  const own = ownerId ? playerSummary(session, ownerId) : null;
  const setField = (field: string, value: Value, subject?: string) => mutate(() => api.update(session.id, { answers: [{ field, value, ownerId: subject }] }));
  const counts = (key: string, label: string, kind: 'resource' | 'development' | 'pieces') => {
    if (!ownerId || !pack.fields.some(f => f.key === key)) return null;
    const accepted = confirmed(session, key, ownerId);
    const candidate = session.assertions.filter(a => a.field === key && a.ownerId === ownerId && a.status !== 'accepted' && (!accepted || a.updatedAt > accepted.updatedAt)).at(-1);
    return <CountsEditor key={`${ownerId}:${key}`} field={{ id: key, label: label + (candidate ? ' · 사진 후보' : '') }} value={(candidate || accepted)?.value} kind={kind} busy={busy} forceSave={!!candidate} onReadyToSave={save => { if (save) saves.current.set(key, save); else saves.current.delete(key); }} onSave={value => setField(key, value, ownerId)}/>;
  };
  const hiddenField = pack.fields.find(f => f.key === 'player.score.hiddenVictoryPoints');
  const hiddenFact = ownerId ? session.assertions.filter(a => a.field === hiddenField?.key && a.ownerId === ownerId).at(-1) : undefined;
  return <section className="catan-overview simple-assets" aria-label={ownerId ? '개인 보유 정보' : '플레이어 카드와 말'}>
    {own && ownerId ? <div className="catan-owner-assets"><h3>{session.players.find(p => p.id === ownerId)?.name} 보유 정보</h3><p className="small muted">개인 점수 {showNumber(own.totalScore)} · 자원 {showNumber(own.resourceTotal)}장</p>
      {counts('player.resources.counts', '자원 카드', 'resource')}
      {counts('player.development.handCounts', '개발 카드 · 비공개 승점 포함', 'development')}
      <details><summary>남은 말·기타 보유 기록 +</summary>
        {counts('player.pieces.remaining', '남은 말', 'pieces')}
        {hiddenField && hiddenFact && <PrivateCount key={`${ownerId}:${hiddenField.key}`} label="별도로 기록한 비공개 승점" value={hiddenFact.value} busy={busy} forceSave={hiddenFact.status !== 'accepted'} onSave={value => setField(hiddenField.key, value, ownerId)} onReadyToSave={save => { if (save) saves.current.set(hiddenField.key, save); else saves.current.delete(hiddenField.key); }}/>}
      </details>
    </div> : <details><summary>플레이어 보기 +</summary><div className="catan-players">{session.players.map(p => { const info = playerSummary(session, p.id); return <article key={p.id}><button className="catan-player-name" onClick={() => onOwner(p.id)}><span className="player-dot" style={{ background: p.color }}/><strong>{p.name} 보유 정보</strong></button><p>자원 {showNumber(info.resourceTotal)}장 · 공개 점수 {showNumber(info.publicScore)}</p><button className="button text small-button" onClick={() => setTradePlayer(p.id)}>교역 비율 보기</button></article>; })}</div></details>}
    {tradePlayer && <TradeDialog key={tradePlayer} viewerOwner={ownerId} view={view} playerId={tradePlayer} busy={busy} onClose={() => setTradePlayer(null)} onSave={value => setField('turn.trade', value)}/>}
  </section>;
}

function PrivateCount({ label, value, busy, forceSave, onSave, onReadyToSave }: { label: string; value: Value; busy: boolean; forceSave: boolean; onSave: (value: Value) => Promise<void>; onReadyToSave: (save: (() => Promise<void>) | null) => void }) {
  const incoming = typeof value === 'number' ? String(value) : '';
  const [draft, setDraft] = useState(incoming), [error, setError] = useState('');
  const edited = useRef(false);
  useEffect(() => { if (!edited.current) setDraft(incoming); }, [incoming]);
  async function save() {
    const next = draft === '' ? null : Number(draft);
    if (next !== null && (!Number.isInteger(next) || next < 0)) { setError('0 이상의 수를 입력해 주세요.'); throw new Error('비공개 승점을 확인해 주세요.'); }
    await onSave(next); edited.current = false; setError('');
  }
  useEffect(() => { onReadyToSave(edited.current || forceSave ? save : null); return () => onReadyToSave(null); });
  return <form className="field-editor" onSubmit={event => { event.preventDefault(); void save().catch(() => {}); }}><label>{label}<input type="number" inputMode="numeric" min={0} step={1} placeholder="모름" value={draft} disabled={busy} onChange={event => { edited.current = true; setDraft(event.target.value); }}/></label><button className="button secondary small-button" disabled={busy}>반영</button>{error && <p role="alert">{error}</p>}</form>;
}

function TradeDialog({view,playerId,viewerOwner,busy,onClose,onSave}:{view:SessionView;playerId:string;viewerOwner?:string;busy:boolean;onClose:()=>void;onSave:(value:Value)=>Promise<void>}) {
  const existing=objectValue(factValue(view.session,'turn.trade'));
  const initial=existing.playerId===playerId?existing as unknown as TradeRecord:null;
  const [record,setRecord]=useState<TradeRecord>(initial??{kind:'bank',playerId,give:{lumber:4},receive:{ore:1},status:'proposed',given:null,received:null});
  const [error,setError]=useState('');
  const board=canonicalBoard(view.session).scene;
  const info=inspectTrade(view.session,record,viewerOwner),remaining=tradeRemaining(record);
  const update=(patch:Partial<TradeRecord>)=>setRecord(current=>({...current,...patch}));
  const quantity=(which:'give'|'receive'|'given'|'received',resource:string,value:string)=>update({[which]:{...record[which],[resource]:value===''?null:Number(value)}});
  const single=(which:'give'|'receive',resource:string)=>update({[which]:{[resource]:Object.values(record[which])[0]??null}});
  return <Modal title="교역" onClose={onClose} wide><div className="modal-body trade-helper">
    <p>{view.session.players.find(p=>p.id===playerId)?.name}의 교역이에요. 카드 수는 직접 고쳐 주세요.</p>
    <label>거래 종류<select value={record.kind} onChange={e=>update({kind:e.target.value as TradeRecord['kind']})}><option value="bank">은행·항구</option><option value="player">플레이어와 자원 교환</option></select></label>
    {record.kind==='player'&&<label>상대<select value={record.counterpartyId??''} onChange={e=>update({counterpartyId:e.target.value||null})}><option value="">상대 선택</option>{view.session.players.filter(p=>p.id!==playerId).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
    <div className="trade-plan">{(['give','receive'] as const).map(which=><div key={which}><strong>{which==='give'?'줄 자원':'받을 자원'}</strong>{record.kind==='bank'?<><select aria-label={which==='give'?'줄 자원 종류':'받을 자원 종류'} value={Object.keys(record[which])[0]??''} onChange={e=>single(which,e.target.value)}>{RESOURCES.map(r=><option key={r} value={r}>{RESOURCE_NAMES[r]}</option>)}</select><input aria-label={which==='give'?'줄 수량':'받을 수량'} type="number" inputMode="numeric" min={1} step={1} placeholder="모름" value={Object.values(record[which])[0]??''} onChange={e=>quantity(which,Object.keys(record[which])[0],e.target.value)}/></>:RESOURCES.map(r=><label className="trade-resource" key={r}><span>{RESOURCE_NAMES[r]}</span><input aria-label={`${which==='give'?'줄':'받을'} ${RESOURCE_NAMES[r]}`} type="number" min={0} step={1} placeholder="없음/미확인" value={record[which][r]??''} onChange={e=>quantity(which,r,e.target.value)}/></label>)}</div>)}</div>
    <div className="trade-check"><strong>{record.kind==='bank'?`확인 비율 ${info.ratio}:1`:'플레이어 거래 조건'}</strong><p className="small muted">그림에 있는 항구를 기준으로 계산해요.</p>{info.harborIds.length>0&&<><svg className="trade-harbor-map" viewBox="-590 -550 1180 1100" role="img" aria-label="확인한 해안 항구와 이번 비율에 사용한 항구 강조">{COASTAL_EDGES.map(edge=>{const a=CATAN_TOPOLOGY.byId.vertex.get(edge.vertexIds[0])!,b=CATAN_TOPOLOGY.byId.vertex.get(edge.vertexIds[1])!;return <line key={edge.id} x1={a.x*100} y1={a.y*100} x2={b.x*100} y2={b.y*100} stroke="#8baead" strokeWidth={9}/>;})}{board.components.filter(c=>c.kind==='harbor').map(h=>{const p=harborPoint(h.location.id),edge=coastalEdge(h.location.id);if(!p||!edge)return null;const selected=info.harborIds.includes(h.id);return <g key={h.id}>{edge.vertexIds.map(id=>{const v=CATAN_TOPOLOGY.byId.vertex.get(id)!;return <line key={id} x1={p.x*100} y1={p.y*100} x2={v.x*100} y2={v.y*100} stroke={selected?'#c46549':'#a1bcb7'} strokeWidth={selected?9:3}/>;})}<circle cx={p.x*100} cy={p.y*100} r={42} fill={selected?'#c46549':'#f7f7ed'} stroke="#597d74" strokeWidth={4}/><text x={p.x*100} y={p.y*100+12} textAnchor="middle" fill={selected?'white':'#33483c'} fontSize={32}>{h.ratio??'?'}:1</text><title>항구 {h.ratio??'?'}:1</title></g>;})}</svg></>}</div>
    <details><summary>거래 도중 멈췄다면 메모하기 +</summary><label>실제 진행 상태<select value={record.status} onChange={e=>update({status:e.target.value as TradeRecord['status']})}><option value="proposed">내용만 제안</option><option value="in_progress">실제 전달 중</option><option value="completed">교환 완료 확인</option><option value="cancelled">취소 확인</option></select></label>
    <div className="trade-plan">{(['given','received'] as const).map((which,index)=><div key={which}><strong>{index===0?'이미 건넨 수량':'이미 받은 수량'}</strong>{[...new Set([...Object.keys(record[index===0?'give':'receive']),...Object.keys(record[which]??{})])].map(r=><label className="trade-resource" key={r}><span>{RESOURCE_NAMES[r as Resource]}</span><input type="number" aria-label={`${index===0?'이미 건넨':'이미 받은'} ${RESOURCE_NAMES[r as Resource]}`} inputMode="numeric" min={0} step={1} placeholder="모름" value={record[which]?.[r]??''} onChange={e=>quantity(which,r,e.target.value)}/></label>)}<button className="button text small-button" onClick={()=>update({[which]:Object.fromEntries(Object.keys(record[index===0?'give':'receive']).map(r=>[r,0]))})}>아직 전달하지 않음 · 0 확인</button></div>)}</div>
    <p className="trade-remaining">{remaining.length?remaining.join(' · '):record.status==='completed'?'교환 완료 · 다시 실행하지 않습니다':'남은 전달 없음 / 수량 확인 필요'}</p>
    <button className="button primary" disabled={busy||!view.pack.fields.some(f=>f.key==='turn.trade')} onClick={async()=>{try{setError('');await onSave({...record,harborId:info.harborIds[0]??null} as unknown as Value);onClose();}catch(reason){setError(reason instanceof Error?reason.message:'저장 실패');}}}>거래 내용 저장</button>{error&&<p className="inline-error">{error}</p>}</details>
  </div></Modal>;
}
