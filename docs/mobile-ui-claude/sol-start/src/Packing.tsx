import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, CheckSquare2, Package, Square } from 'lucide-react';
import type { Preservation } from '../shared/types';

export function PreservationItem({ item, owner, busy, restoring, onChange, onReadyToSave, children }: { item: Preservation; owner: string; busy: boolean; restoring?: boolean; onChange: (body: { container?: string; packed?: boolean; restored?: boolean }) => Promise<void>; onReadyToSave?: (save:(()=>Promise<void>)|null)=>void; children?: ReactNode }) {
  const [container, setContainer] = useState(item.container);
  const [error, setError] = useState('');
  const latestContainer=useRef(item.container),savedContainer=useRef(item.container);
  useEffect(() => { if(latestContainer.current===savedContainer.current){latestContainer.current=item.container;setContainer(item.container);}savedContainer.current=item.container; }, [item.container]);
  const change = async (body: { container?: string; packed?: boolean; restored?: boolean }, propagate=false) => {
    setError('');
    try { await onChange(body); if(body.container!==undefined)savedContainer.current=body.container; } catch (reason) { setError(reason instanceof Error ? reason.message : '변경하지 못했습니다.'); if(propagate)throw reason; }
  };
  useEffect(()=>{onReadyToSave?.(!restoring&&latestContainer.current!==savedContainer.current?async()=>{await change({container:latestContainer.current},true);}:null);return()=>onReadyToSave?.(null);});
  const checked = restoring ? item.restored : item.packed;
  return <article id={`preservation-${item.id}`} className={`preservation ${checked ? 'checked' : ''}`}><div className="preservation-heading"><span className="preservation-icon"><Package size={21}/></span><div><span className="small muted">{owner}</span><h3>{item.label}</h3></div><button role="checkbox" aria-checked={checked} aria-label={`${item.label} ${restoring ? '복원' : '포장'} 완료`} className="check-control" disabled={busy} onClick={() => void change(restoring ? { restored: !item.restored } : { container, packed: !item.packed })}>{checked ? <CheckSquare2 size={25}/> : <Square size={25}/>}</button></div>
    <p>{item.description}</p><details><summary>보관 조건 더 보기 +</summary><ul className="condition-list">{item.conditions.map((condition, index) => <li key={index}><Check size={13}/>{condition}</li>)}</ul></details>
    {restoring ? <div className="container-location"><Package size={15}/><span>보관 위치</span><strong>{item.container || '기록된 위치 없음'}</strong></div> : <form className="container-form" onSubmit={event => { event.preventDefault(); void change({ container }); }}><label htmlFor={`container-${item.id}`}>어디에 보관하나요?</label><div className="field-control"><input id={`container-${item.id}`} value={container} disabled={busy} onChange={event => {latestContainer.current=event.target.value;setContainer(event.target.value);}} placeholder="예: 빨간 지퍼백 · 상자 왼쪽"/><button className="button secondary small-button" disabled={busy || container === item.container}>위치 저장</button></div></form>}
    {children}{error && <p className="inline-error small">{error}</p>}
  </article>;
}

export function restoreOrder(items: Preservation[]): Preservation[] {
  const result: Preservation[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (item: Preservation) => {
    if (visited.has(item.id) || visiting.has(item.id)) return;
    visiting.add(item.id);
    for (const dependency of item.restoreAfter) for (const match of items) if ((match.templateId === dependency || match.id === dependency) && (!match.ownerId || match.ownerId === item.ownerId)) visit(match);
    visiting.delete(item.id); visited.add(item.id); result.push(item);
  };
  items.forEach(visit);
  return result;
}
