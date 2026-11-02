import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Info, Minus, Pencil, Plus } from 'lucide-react';
import type { Assertion, FieldDefinition, Question, SessionView, Value } from '../shared/types';
import { GameComponentArt } from './GameComponentArt';
import { RESOURCES, DEVELOPMENTS, RESOURCE_NAMES, objectValue, conditionMatches } from '../shared/catanSummary';
import { api } from './api';
import { formatValue } from './ui';
import { previewValue } from './presentation';

export type Mutate = (task: () => Promise<SessionView>, message?: string, options?: {localError?:boolean}) => Promise<void>;
export const fire = (promise: Promise<unknown>) => { void promise.catch(() => {}); };

export function FieldEditor({ field, value, onSave, onPreserve, busy, compact = false, onReadyToSave, players }: { field: Pick<Question, 'id' | 'label' | 'description' | 'type' | 'options' | 'reason'> & { acquisition?: Question['acquisition']; preservationId?: string; key?: string; field?: string; ui?: FieldDefinition['ui'] }; value?: Value; onSave: (value: Value) => Promise<void>; onPreserve?: () => void; busy: boolean; compact?: boolean; onReadyToSave?:(save:(()=>Promise<void>)|null)=>void; players?: readonly { id: string; name: string }[] }) {
  const [draft, setDraft] = useState(value === undefined || value === null ? '' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value));
  const edited = useRef(false);
  const latestDraft = useRef(draft);
  const edit = (text: string) => { edited.current = true; latestDraft.current = text; setDraft(text); setSaved(false); };
  const incoming = value === undefined || value === null ? '' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (!edited.current) { setDraft(incoming); latestDraft.current = incoming; } }, [incoming]);
  async function saveDraft(){
    setError(''); setSaved(false);
    try {
      let next: Value = draft.trim() === '' ? null : draft;
      if (draft.trim() && field.type === 'json') { try { next = JSON.parse(draft); } catch { throw new Error('올바른 JSON 형식으로 입력하세요.'); } }
      if (draft.trim() && field.type === 'number') { next = Number(draft); if (!Number.isFinite(next)) throw new Error('숫자를 입력하세요.'); }
      if (draft && field.type === 'boolean') next = draft === 'true';
      await onSave(next); if (latestDraft.current === draft) { edited.current = false; setSaved(true); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : '기록하지 못했습니다.'); throw reason; }
  }
  useEffect(()=>{onReadyToSave?.(edited.current?saveDraft:null);return()=>onReadyToSave?.(null);});
  const key = field.field || field.key || field.id;
  const editor = field.ui?.editor || (key.includes('player.resources.counts') ? 'resource-counts' : key.includes('player.development.handCounts') ? 'development-counts' : undefined);
  if (editor === 'resource-counts' || editor === 'development-counts' || key.includes('player.pieces.remaining')) return <CountsEditor field={field} value={value} onSave={onSave} onPreserve={onPreserve} busy={busy} kind={editor==='development-counts'?'development':key.includes('player.pieces.remaining')?'pieces':'resource'}/>;
  const inputId = `field-${field.id}`;
  if (field.acquisition === 'preserve' && onPreserve) return <div className="field-editor"><strong>{field.label}</strong><p className="field-description">{field.description}</p><p className="field-reason">{field.reason}</p><button className="button secondary small-button" disabled={busy} onClick={onPreserve}>실물 묶음 보관으로 해결</button></div>;
  // Yes/no and short choice lists: one tap records the value (the "?" chip records unknown).
  // "Whose turn" / "starting player" are free text in generated packs; the players are the choices (their name is what is stored).
  const playerChoice = field.type === 'text' && !!players?.length && (key === 'turn' || key.endsWith('starting-player'));
  const tapChoice = playerChoice || field.type === 'boolean' || (field.type === 'select' && (field.options?.length ?? 0) <= 10);
  const pick = (text: string) => { edit(text); setError(''); const next: Value = text === '' ? null : field.type === 'boolean' ? text === 'true' : text; fire(onSave(next).then(() => { if (latestDraft.current === text) { edited.current = false; setSaved(true); } }).catch(reason => { setError(reason instanceof Error ? reason.message : '기록하지 못했습니다.'); })); };
  const control = { id: inputId, value: draft, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { edit(event.target.value); } };
  return <form className={`field-editor ${compact ? 'compact' : ''}`} onSubmit={async event => {
    event.preventDefault(); fire(saveDraft());
  }}>
    <div className="field-label"><label htmlFor={inputId}>{field.label}</label>{value !== undefined && value !== null && <span className="recorded-label"><Check size={12}/>기록됨</span>}</div>
    {field.description && <p className="field-description">{field.description}</p>}
    {!compact && field.reason && <p className="field-reason">확인 이유 · {field.reason}</p>}
    <div className={`field-control ${field.type === 'json' ? 'stacked-control' : ''}`}>
      {playerChoice ? <><TapChoices label={field.label} options={players!.map(p => ({ value: p.name, label: p.name }))} value={draft} busy={busy} onPick={pick}/><details className="field-other"><summary>직접 입력</summary><input {...control} type="text" placeholder="예: 진행자" onBlur={() => { if (edited.current) fire(saveDraft()); }}/></details></>
        : field.type === 'boolean' ? <TapChoices label={field.label} options={[{ value: 'true', label: '예' }, { value: 'false', label: '아니요' }]} value={draft} busy={busy} onPick={pick}/>
        : field.type === 'select' && (field.options?.length ?? 0) <= 10 ? <TapChoices label={field.label} options={field.options ?? []} value={draft} busy={busy} onPick={pick}/>
        : field.type === 'select' ? <select {...control}><option value="">모름 · 아직 미확인</option>{field.options?.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
        : field.type === 'json' ? <textarea {...control} rows={3} placeholder='예: {"wood": 2}' spellCheck={false}/>
        : field.type === 'number' ? <div className="number-stepper"><button className="icon-button" type="button" aria-label={`${field.label} 1 줄이기`} disabled={busy} onClick={() => { edit(String((Number(draft) || 0) - 1)); }}><Minus size={14}/></button><input {...control} type="number" step="any" inputMode="decimal" placeholder="모름"/><button className="icon-button" type="button" aria-label={`${field.label} 1 늘리기`} disabled={busy} onClick={() => { edit(String((Number(draft) || 0) + 1)); }}><Plus size={14}/></button></div>
        : <input {...control} type="text" placeholder="확인한 내용을 입력하세요"/>}
      {!tapChoice && <button className="button secondary small-button" disabled={busy}>{saved ? <Check size={15}/> : null}{saved ? draft.trim() ? '기록 완료' : '미확인으로 남김' : draft === '' ? '미확인 유지' : '기록'}</button>}{tapChoice && saved && <span className="recorded-label" role="status"><Check size={12}/>기록됨</span>}
    </div>{!tapChoice && field.type !== 'select' && <button type="button" className="button text small-button unknown-value" disabled={busy || draft === ''} onClick={() => { edit(''); }}>아직 모름</button>}{field.preservationId && onPreserve && <button type="button" className="button text small-button" disabled={busy} onClick={onPreserve}>입력 대신 실물 묶음으로 보관</button>}{error && <p className="inline-error small" role="alert">{error}</p>}
  </form>;
}

export function CandidateRow({ assertion, field, owner, busy, onAccept, onEdit, onEvidence }: { assertion: Assertion; field?: FieldDefinition; owner: string; busy: boolean; onAccept: () => void; onEdit: (value: Value) => Promise<void>; onEvidence: () => void }) {
  const [editing, setEditing] = useState(false);
  return <article className={`candidate ${assertion.status === 'conflict' ? 'candidate-conflict' : ''}`}>
    <div className="candidate-top"><span className="small muted">{owner} · {assertion.basis === 'example' ? '예시 기록' : '사진에서 제안'}{assertion.confidence !== undefined && ` · 신뢰도 ${Math.round(assertion.confidence * 100)}%`}</span><span className="tag">{assertion.status === 'conflict' ? '확인 필요' : '미확정'}</span></div>
    <div className="candidate-content"><div><strong>{field?.label || assertion.field}</strong><pre>{previewValue(assertion.value, field)}</pre>{assertion.reason && <p>{assertion.reason}</p>}</div><div className="candidate-actions"><button className="button primary small-button" disabled={busy} onClick={onAccept}><Check size={15}/>확인</button><button className="icon-button" aria-label={`${field?.label || assertion.field} 수정`} onClick={() => setEditing(!editing)}><Pencil size={16}/></button></div></div>
    {assertion.evidenceIds.length > 0 && <button className="evidence-link" onClick={onEvidence}>근거 원본 보기 <ChevronDown size={13}/></button>}
    {editing && <FieldEditor field={{ id: assertion.id, label: field?.label || assertion.field, description: field?.description || '', type: field?.type || 'text', options: field?.options, ui: field?.ui, reason: '' }} value={assertion.value} busy={busy} compact onSave={async value => { await onEdit(value); setEditing(false); }}/>}</article>;
}

export function RecordedFields({ view, ownerId, busy, mutate }: { view: SessionView; ownerId?: string; busy: boolean; mutate: Mutate }) {
  const fields = view.pack.fields.filter(field => field.scope === (ownerId ? 'player' : 'public') && conditionMatches(field.ui?.showWhen, view.session, ownerId));
  const assertions = [...view.session.assertions.filter(item => item.status === 'accepted'), ...view.derived];
  return <details className="records-details"><summary>전체 상태 보기 · 직접 입력 <span>{fields.length}개 항목</span></summary><div className="records-fields">{fields.map(field => {
    const current = assertions.find(item => item.field === field.key && item.ownerId === ownerId);
    if (view.pack.derivedRules.some(rule => rule.field === field.key)) return <div key={field.key}><strong>{field.label}</strong><p className="derived-label"><Info size={13}/>{current ? formatValue(current.value) : '관련 상태를 확인하면 안내합니다'}</p>{current?.reason && <p className="field-description">{current.reason}</p>}</div>;
    return <div key={field.key}>{current?.basis === 'rule' && <p className="derived-label"><Info size={13}/>확인된 기록에서 도출 · {current.reason}</p>}<FieldEditor field={{ ...field, id: `${ownerId || 'public'}-${field.key}`, reason: '' }} value={current?.value} busy={busy} compact onSave={value => mutate(() => api.update(view.session.id, { answers: [{ field: field.key, value, ownerId }] }), '상태를 기록했어요')}/></div>;
  })}</div></details>;
}

export function CountsEditor({ field, value, onSave, busy, kind = 'resource', onReadyToSave, forceSave = false, game }: { game?:string; field: {id:string;label:string;description?:string}; value?:Value; onSave:(value:Value)=>Promise<void>; onPreserve?:()=>void; busy:boolean; kind?:'resource'|'development'|'pieces'; onReadyToSave?: (save: (() => Promise<void>) | null) => void; forceSave?: boolean }) {
  const keys: readonly string[] = kind === 'development' ? DEVELOPMENTS : kind === 'pieces' ? ['road','settlement','city'] : RESOURCES;
  const names: Record<string,string> = { ...RESOURCE_NAMES, knight:'기사', 'road-building':'도로 건설', 'year-of-plenty':'풍년', monopoly:'독점', 'victory-point':'승점', road:'도로', settlement:'마을', city:'도시' };
  const incoming = JSON.stringify(value);
  const values = () => Object.fromEntries(keys.map(k => [k, objectValue(value)[k] == null ? '' : String(objectValue(value)[k])]));
  const [draft, setDraft] = useState<Record<string,string>>(values);
  const edited = useRef(false);
  const [message, setMessage] = useState('');
  useEffect(() => { if (!edited.current) setDraft(values()); }, [incoming, kind]);
  async function save() {
    const counts = Object.fromEntries(keys.map(k => [k, draft[k] === '' ? null : Number(draft[k])]));
    if (Object.values(counts).some(n => n !== null && (!Number.isInteger(n) || n < 0))) { setMessage('0 이상의 수를 입력해 주세요.'); throw new Error('카드 수를 확인해 주세요.'); }
    await onSave({ ...objectValue(value), ...counts } as Value); edited.current = false; setMessage('반영했어요.');
  }
  useEffect(() => { onReadyToSave?.(edited.current || forceSave ? save : null); return () => onReadyToSave?.(null); });
  return <form className="field-editor counts-editor" onSubmit={event => { event.preventDefault(); fire(save()); }}><strong>{field.label}</strong><div className="counts-grid">{keys.map(key => <label key={key}><GameComponentArt game={game} kind={kind === 'pieces' ? key : kind === 'development' ? 'development-card' : 'resource-card'} variant={kind === 'pieces' ? undefined : key} size={44}/><span>{names[key]}</span><input aria-label={`${field.label} · ${names[key]}`} type="number" min={0} step={1} inputMode="numeric" placeholder="모름" value={draft[key] ?? ''} disabled={busy} onChange={event => { edited.current = true; setDraft(current => ({ ...current, [key]: event.target.value })); setMessage(''); }}/></label>)}</div><p className="small muted">모르면 비워두세요.</p><button className="button secondary small-button" disabled={busy}>반영</button>{message && <p role="status" className="small">{message}</p>}</form>;
}

function TapChoices({ label, options, value, busy, onPick }: { label: string; options: { value: string; label: string }[]; value: string; busy: boolean; onPick: (value: string) => void }) {
  return <div className="qp qp-chips field-choices" role="group" aria-label={label}><div>{options.map(option => <button type="button" key={option.value} aria-pressed={value === option.value} disabled={busy} onClick={() => onPick(option.value)}>{option.label}</button>)}<button type="button" className="qp-unknown" aria-pressed={value === ''} aria-label={`${label} 모름`} disabled={busy} onClick={() => onPick('')}>?</button></div></div>;
}
