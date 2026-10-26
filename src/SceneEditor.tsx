import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Image as ImageIcon, Map as MapIcon, Plus, Trash2, Undo2, X } from 'lucide-react';
import type { Assertion, Evidence, Player } from '../shared/types';
import {
  coastalEdge, harborPoint, CATAN_NUMBERS, CATAN_TOPOLOGY, HEX_CORNERS, SCENE_KINDS, SCENE_KIND_LABELS,
  SCENE_VARIANTS, boardSlotTypes, createComponent, isBoardSlotType,
  normalizeRegion, normalizeScene, normalizeSceneDetailed, slotPoint, snapToSlot,
  type ComponentScene, type Point, type SceneComponent, type SceneKind, type SceneLocation, type SceneRegion,
} from '../shared/scene';
import { changeSceneComponentKind, moveSceneComponent, sameSceneLocation, type SceneMoveResult } from '../shared/sceneMoves';
import { canEditOwner, editSceneSelection } from '../shared/sceneEditing';
import { observedColorCSS, linkObservedColor } from '../shared/playerColors';
import { GameComponentArt } from './GameComponentArt';
import { PlayerPiece } from './ui';
import { groupSceneComponents, deleteSceneGroupSelection, type SceneGroup } from './sceneGroups';
import './scene-editor.css';

export interface SceneEditorProps {
  value: unknown;
  onSave: (scene: ComponentScene) => Promise<void>;
  players: Player[];
  busy: boolean;
  evidence?: Evidence[];
  onReadyToSave?: (save: (() => Promise<void>) | null) => void;
  ownerId?: string;
  catalogOnly?: boolean;
  forceSave?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onEvidence?: (evidenceId: string, region?: Assertion['region']) => void;
  game?: string;
}

const U = 100; // topology unit → SVG user units
const PAD = 165;
const VIEW = {
  x: CATAN_TOPOLOGY.bounds.minX * U - PAD, y: CATAN_TOPOLOGY.bounds.minY * U - PAD,
  width: (CATAN_TOPOLOGY.bounds.maxX - CATAN_TOPOLOGY.bounds.minX) * U + PAD * 2,
  height: (CATAN_TOPOLOGY.bounds.maxY - CATAN_TOPOLOGY.bounds.minY) * U + PAD * 2,
};
const CORNER_POINTS = HEX_CORNERS.map((_, i) => { const a = (-90 + 60 * i) * Math.PI / 180; return [Math.cos(a), Math.sin(a)] as const; });
const hexPoints = (cx: number, cy: number, r: number) => CORNER_POINTS.map(([dx, dy]) => `${cx + dx * r},${cy + dy * r}`).join(' ');
// Flat-top outer frame around the 19 pointy-top hexes.
const FRAME = Array.from({ length: 6 }, (_, i) => { const a = (60 * i) * Math.PI / 180; return `${Math.cos(a) * 5.85 * U},${Math.sin(a) * 5.85 * U}`; }).join(' ');
const ART_SIZE: Record<SceneKind, number> = {
  harbor: 86, terrain: 236, 'number-token': 68, robber: 78, road: 104, settlement: 58, city: 70,
  'resource-card': 54, 'development-card': 54, token: 50, deck: 56, container: 56, unknown: 50,
};
const NEUTRAL = '#cfcabb';
// One-tap add: every kind stays visible; headings only sort the grid.
const ADD_GROUPS: { label: string; kinds: SceneKind[] }[] = [
  { label: '말', kinds: ['road', 'settlement', 'city', 'robber'] },
  { label: '타일·숫자', kinds: ['terrain', 'number-token', 'harbor'] },
  { label: '카드·기타', kinds: ['resource-card', 'development-card', 'deck', 'token'] },
];
const CATALOG_KINDS: SceneKind[] = ['resource-card', 'development-card', 'deck', 'token', 'container'];
const serialize = (scene: ComponentScene) => JSON.stringify(scene);

function variantLabel(kind: SceneKind, variant: string | null) { return variant ? SCENE_VARIANTS[kind]?.find(o => o.value === variant)?.label ?? variant : null; }
function componentTitle(c: SceneComponent) {
  if(c.kind==='harbor')return `${variantLabel(c.kind,c.variant)??'종류 미확인 항구'} · ${c.ratio??'?'}:1`;
  return [variantLabel(c.kind, c.variant), pieceName(c.kind), typeof c.number === 'number' ? String(c.number) : null].filter(Boolean).join(' ');
}
// ComponentArt fills blanks with a default terrain/card; unknown contents must stay visibly unknown.
function artProps(c: Pick<SceneComponent, 'kind' | 'variant' | 'ownerId' | 'number' | 'ratio' | 'observedColor' | 'face'>, players: Player[]) {
  const owned = c.kind === 'road' || c.kind === 'settlement' || c.kind === 'city';
  const color = c.ownerId ? players.find(p => p.id === c.ownerId)?.color : observedColorCSS(c.observedColor) ?? (owned ? NEUTRAL : undefined);
  if (c.kind === 'terrain' && !c.variant) return { kind: 'unknown', label: '지형 모름', color };
  const variant = c.variant ?? (c.kind === 'resource-card' || c.kind === 'development-card' ? 'unknown' : undefined);
  return { kind: c.kind, variant, color, face: c.face ?? undefined, number: c.kind === 'harbor' ? c.ratio ?? undefined : c.number ?? undefined };
}

interface DragState { id: string; pointerId: number; startX: number; startY: number; active: boolean; point: Point | null; snap: SceneLocation | null; offBoard: boolean }
interface History { stack: ComponentScene[]; key: string | null; at: number }
export function SceneEditor({ value, onSave, players, busy, evidence = [], onEvidence, onReadyToSave, forceSave = false, ownerId, catalogOnly = false, onDirtyChange, game }: SceneEditorProps) {
  const incoming = useMemo(() => normalizeSceneDetailed(value), [value]);
  const incomingKey = serialize(incoming.scene);
  const [base, setBase] = useState(incoming);
  const [history, setHistory] = useState<History>({ stack: [incoming.scene], key: null, at: 0 });
  const scene = history.stack[history.stack.length - 1];
  const dirty = serialize(scene) !== serialize(base.scene);
  const [pendingIncoming, setPendingIncoming] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [multiple, setMultiple] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [inlineNumberIds, setInlineNumberIds] = useState<string[]>([]);
  const selectedIds = multiple ? selection.filter(id => scene.components.some(c => c.id === id)) : selectedId ? [selectedId] : [];
  const [moveMode, setMoveMode] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<SceneComponent | null>(null);
  const lastDrafts = useRef<Partial<Record<SceneKind, Partial<SceneComponent>>>>({});
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const [view, setView] = useState<'board' | 'photo'>('board');
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const lastDragEnd = useRef(0);
  const sceneRef = useRef(scene); sceneRef.current = scene;
  const svgRef = useRef<SVGSVGElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => { if (window.innerWidth <= 900 && !multiple && (adding || selectedId)) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [adding, selectedId, multiple]);
  const catalog = catalogOnly || !!ownerId && !scene.components.some(c => slotPoint(c.location));
  const selected = scene.components.find(c => c.id === selectedId) ?? null;
  const picked = scene.components.filter(c => selectedIds.includes(c.id));
  const groups = useMemo(() => groupSceneComponents(scene), [scene]);
  const activeGroup = groups.find(g => g.key === activeGroupKey && g.ids.includes(selectedId ?? ''));
  const inlineNumberSelected = activeGroup?.component.kind === 'number-token' && selected?.kind === 'terrain';
  const inspected = inlineNumberSelected && selected ? { ...selected, kind: 'number-token' as const, variant: null, ownerId: null } : selected;
  function selectGroup(group: SceneGroup) {
    if (multiple) {
      const inline = group.component.kind === 'number-token' ? group.ids.filter(id => scene.components.some(c => c.id === id && c.kind === 'terrain')) : [];
      setInlineNumberIds(ids => [...new Set([...ids.filter(id => !group.ids.includes(id)), ...inline])]);
      setSelection(ids => group.ids.every(id => ids.includes(id)) ? ids.filter(id => !group.ids.includes(id)) : [...new Set([...ids, ...group.ids])]);
    } else { selectComponent(group.ids[0]); setActiveGroupKey(group.key); }
  }
  useEffect(() => {
    if (incomingKey === serialize(base.scene)) { setPendingIncoming(false); return; }
    if (dirty) { setPendingIncoming(true); return; }
    setBase(incoming); setHistory({ stack: [incoming.scene], key: null, at: 0 }); setPendingIncoming(false);
  }, [incomingKey]);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    onReadyToSave?.(dirty || forceSave ? save : null);
    return () => onReadyToSave?.(null);
  });
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function selectComponent(id: string, _armMove = false) {
    if (adding) return;
    if (multiple) { setInlineNumberIds(ids => ids.filter(item => item !== id)); setSelection(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]); return; }
    setSelectedId(id); setMoveMode(false); setActiveGroupKey(null);
  }
  function commit(next: ComponentScene, key: string | null = null) {
    if (next === sceneRef.current) return;
    setHistory(h => { const now = Date.now(); const coalesce = key !== null && h.key === key && now - h.at < 1200 && h.stack.length > 1;
      return { stack: coalesce ? [...h.stack.slice(0, -1), next] : [...h.stack, next].slice(-80), key, at: now }; });
    setMessage(null);
  }
  function patchComponent(id: string, patch: Partial<SceneComponent>, key?: string) {
    const current = sceneRef.current;
    if ('ownerId' in patch && current.components.find(c => c.id === id)?.observedColor) { commit(linkObservedColor(current, id, patch.ownerId ?? null)); return; }
    commit({ ...current, components: current.components.map(c => c.id === id ? { ...c, ...patch } : c) }, key ? `${id}:${key}` : null);
  }
  function undo() { setHistory(h => h.stack.length > 1 ? { stack: h.stack.slice(0, -1), key: null, at: 0 } : h); setMessage(null); }
  function applyEdit(result: SceneMoveResult) {
    if (result.status === 'rejected') { setMessage({ tone: 'error', text: /수량/.test(result.message) ? '수량을 1 이상으로 고친 뒤 옮겨 주세요.' : '이 자리에는 놓을 수 없어요. 다른 자리를 고르거나, 겹친 부품을 먼저 보드 밖으로 옮겨 주세요.' }); return; }
    if (result.status === 'noop') return;
    commit(result.scene); setSelectedId(result.selectedId); setMoveMode(false);
    setMessage({ tone: 'ok', text: result.status === 'swapped' ? '두 부품의 자리를 바꿨어요.' : result.status === 'split' ? '묶음에서 한 개를 옮겼어요.' : '바꿨어요.' });
  }
  function placeComponent(id: string, location: SceneLocation) { if (catalogOnly) return; applyEdit(moveSceneComponent(sceneRef.current, id, location, { intent: 'correct' })); }
  function finishAdd(location: SceneLocation | null = null) {
    if (!draft) return;
    const current = sceneRef.current;
    const component = createComponent(current, draft.kind, { ...draft, id: createComponent(current, draft.kind).id });
    const next = { ...current, components: [...current.components, component] };
    const result = location ? moveSceneComponent(next, component.id, location, { intent: 'correct' }) : null;
    if (result?.status === 'rejected') { setMessage({ tone: 'error', text: '이미 부품이 있는 자리예요. 다른 자리를 골라 주세요.' }); return; }
    lastDrafts.current[draft.kind] = { variant: draft.variant, ownerId: draft.ownerId, number: draft.number, ratio: draft.ratio, face: draft.face, quantity: draft.quantity };
    commit(result?.scene ?? next); setSelectedId(result?.selectedId ?? component.id); closeAdd();
  }
  async function save() {
    setSaving(true); setMessage(null);
    try {
      const clean = normalizeScene(sceneRef.current); await onSave(clean);
      setBase({ scene: clean, adjustments: [], recognized: true }); setPendingIncoming(false); setHistory({ stack: [clean], key: null, at: 0 });
    } catch (error) { setMessage({ tone: 'error', text: '저장하지 못했어요. 다시 눌러 주세요.' }); throw error; }
    finally { setSaving(false); }
  }
  // ---------- drag & tap ----------
  function toBoard(clientX: number, clientY: number): Point | null {
    const svg = svgRef.current, matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    if (p.x < VIEW.x || p.y < VIEW.y || p.x > VIEW.x + VIEW.width || p.y > VIEW.y + VIEW.height) return null;
    return { x: p.x / U, y: p.y / U };
  }
  function beginDrag(event: ReactPointerEvent, id: string) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.stopPropagation();
    if (multiple) { selectComponent(id); return; }
    if (adding) return;
    if (catalogOnly) { selectComponent(id); return; }
    const state: DragState = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, active: false, point: null, snap: null, offBoard: false };
    dragRef.current = state; setDrag(state);
  }
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => {
      const d = dragRef.current;
      if (!d || event.pointerId !== d.pointerId) return;
      if (!d.active && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) < 7) return;
      event.preventDefault();
      const component = sceneRef.current.components.find(c => c.id === d.id);
      const point = view === 'board' ? toBoard(event.clientX, event.clientY) : null;
      const snap = point && component ? snapToSlot(component.kind, point) : null;
      const offBoard = Boolean(document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-scene-drop="off-board"]'));
      const next = { ...d, active: true, point, snap, offBoard };
      dragRef.current = next; setDrag(next);
    };
    const end = (event: PointerEvent) => {
      const d = dragRef.current;
      if (!d || event.pointerId !== d.pointerId) return;
      dragRef.current = null; setDrag(null);
      if (event.type === 'pointercancel') return;
      if (!d.active) { selectComponent(d.id); return; }
      lastDragEnd.current = Date.now();
      const component = sceneRef.current.components.find(c => c.id === d.id);
      if (d.snap) placeComponent(d.id, d.snap);
      else if (d.offBoard && component && isBoardSlotType(component.location.type)) placeComponent(d.id, { type: 'unplaced', id: null });
      else selectComponent(d.id, false);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, view]);


  const photos = [...new Map(evidence.filter(e => e.kind !== 'note').map(e => [e.id, e])).values()];
  const photo = photos.find(p => p.id === (photoId ?? selected?.evidenceId)) ?? photos.find(p => scene.components.some(c => c.evidenceId === p.id && c.region)) ?? photos.at(-1) ?? null;
  const dragComponent = drag?.active ? scene.components.find(c => c.id === drag.id) ?? null : null;
  const targetKind = catalogOnly ? null : adding ? draft?.kind ?? null : multiple ? null : dragComponent?.kind ?? (moveMode ? selected?.kind : null) ?? null;
  const previewScene = adding && draft ? { ...scene, components: [...scene.components, draft] } : scene;
  const closeAdd = () => { setAdding(false); setDraft(null); };
  const beginAdd = () => { setMultiple(false); setSelectedId(null); setMoveMode(false); setView('board'); setAdding(true); setDraft(null); setActiveGroupKey(null); };
  return <div className="scene-editor simple-editor" inert={busy || saving} aria-busy={busy || saving} onKeyDown={event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !['INPUT','TEXTAREA','SELECT'].includes((event.target as HTMLElement).tagName)) { event.preventDefault(); undo(); }
    if (event.key === 'Escape') { closeAdd(); setMoveMode(false); setSelectedId(null); setSelection([]); }
  }}>
    <div className="se-toolbar">
      <div className="se-segment" role="tablist" aria-label="보기">
        <button role="tab" aria-selected={view === 'board'} className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}><MapIcon size={14}/>{catalogOnly ? '목록' : '그림'}</button>
        <button role="tab" aria-selected={view === 'photo'} className={view === 'photo' ? 'active' : ''} disabled={!photos.length} onClick={() => setView('photo')}><ImageIcon size={14}/>원본</button>
      </div>
      <div className="se-actions">
        <button className="button secondary small-button" aria-pressed={multiple} onClick={() => { closeAdd(); setMultiple(!multiple); setSelection([]); setInlineNumberIds([]); setSelectedId(null); setMoveMode(false); }}>{multiple ? '선택 마침' : '여러 개 선택'}</button>
        <button className="button secondary small-button" onClick={beginAdd}><Plus size={15}/>추가</button>
        <button className="button secondary small-button" onClick={undo} disabled={history.stack.length < 2 || saving} aria-label="되돌리기"><Undo2 size={15}/></button>
        {(dirty || forceSave) && <button className="button primary small-button" onClick={() => void save().catch(() => {})} disabled={busy || saving}>반영</button>}
      </div>
    </div>
    {pendingIncoming && <div className="se-banner"><span>새 사진 결과가 있어요. 지금 정정을 반영한 뒤 볼 수 있어요.</span></div>}
    {message && <p className={`se-message ${message.tone}`} role="status">{message.text}</p>}
    {multiple && <div className="se-batch" aria-label="여러 부품 수정"><strong>{picked.length}개 선택</strong><button className="button text small-button" onClick={() => { setSelection([]); setInlineNumberIds([]); }} disabled={!picked.length}>전체 해제</button>
      {picked.length > 0 && picked.every(c => canEditOwner(c.kind)) && <OwnerColors game={game} players={players} value={picked.every(c => c.ownerId === picked[0].ownerId) ? picked[0].ownerId : undefined} onChange={ownerId => commit(editSceneSelection(scene, selectedIds, { ownerId }))}/>}
      <button className="button secondary small-button se-danger" disabled={!picked.length} onClick={() => commit(deleteSceneGroupSelection(scene, selectedIds, inlineNumberIds))}><Trash2 size={14}/>선택 삭제</button>
    </div>}
    <div className={`se-layout ${adding ? 'adding' : ''} ${!adding && (!selected || multiple) ? 'overview' : ''}`}>
      <div className="se-stage">
        {moveMode && !adding && <div className="se-move-banner"><span>옮길 자리를 누르세요. 같은 부품이 있으면 서로 바꿔요.</span><button className="button text small-button" onClick={() => setMoveMode(false)}>취소</button></div>}
        {adding && draft && !catalogOnly && boardSlotTypes(draft.kind).length > 0 && <div className="se-move-banner">추가할 자리를 누르세요.</div>}
        {view === 'board' && catalog && (!targetKind || catalogOnly) ? <div className="se-catalog">{groups.length ? groups.map(group => <GroupButton game={game} key={group.key} group={group} players={players} selected={group.ids.some(id => selectedIds.includes(id))} onClick={() => selectGroup(group)}/>) : <p>사진을 추가하거나 필요한 부품만 놓아 주세요.</p>}</div> : view === 'board' ? <BoardView game={game} svgRef={svgRef} scene={previewScene} players={players} selectedId={adding ? draft?.id ?? null : selectedId} selectedIds={adding && draft ? [draft.id] : selectedIds} selectedHex={null} targetKind={targetKind} drag={drag} dragComponent={dragComponent} onBeginDrag={beginDrag} onSelect={id => selectComponent(id)} onTarget={location => { if (Date.now() - lastDragEnd.current < 250) return; if (adding) finishAdd(location); else if (selected) placeComponent(selected.id, location); }} onHex={() => { if (!multiple && !adding) { setSelectedId(null); setMoveMode(false); } }} onBackground={() => { if (!multiple && !adding) { setSelectedId(null); setMoveMode(false); } }}/>
          : photo && <PhotoView photo={photo} photos={photos} scene={scene} selected={selected} drawing={false} onPhoto={setPhotoId} onSelect={id => selectComponent(id)} onRegion={() => {}}/>}
        <p className="se-hint">{multiple ? '부품을 누르면 선택하거나 해제해요.' : view === 'photo' ? catalogOnly ? '사진의 표시를 눌러 같은 카드를 고쳐요.' : '표시된 부품을 누르면 그림과 같은 부품을 고칠 수 있어요.' : catalogOnly ? '카드를 눌러 종류와 수량을 고쳐요.' : '부품을 눌러 고치거나, 끌어서 자리를 바꿔요.'}</p>
      </div>
      <aside ref={panelRef} className="se-inspector" aria-label={adding ? '부품 추가' : '선택한 부품'}>
        {adding ? <div className="se-form"><header className="se-form-head"><h4>{draft ? `${pieceName(draft.kind)} 추가` : '무엇을 추가할까요?'}</h4><button className="icon-button" aria-label="추가 취소" onClick={closeAdd}><X size={18}/></button></header>
          {!draft ? <div className="se-add-groups">{(catalogOnly ? [{ label: '', kinds: CATALOG_KINDS }] : ADD_GROUPS).map(group => <div className="se-add-group" key={group.label || 'catalog'}>{group.label && <h5>{group.label}</h5>}<div className="se-add-grid">{group.kinds.map(kind => <button key={kind} aria-label={pieceName(kind)} onClick={() => setDraft(createComponent(scene, kind, { quantity: 1, variant: SCENE_VARIANTS[kind]?.[0]?.value ?? null, ...(kind === 'number-token' ? { number: 6 } : {}), ...(kind === 'harbor' ? { ratio: 3 } : {}), ownerId: canEditOwner(kind) ? ownerId ?? null : null, ...lastDrafts.current[kind] }))}><GameComponentArt game={game} {...artProps({ kind, variant: null, ownerId: null }, players)} size={40}/><span>{pieceName(kind)}</span></button>)}</div></div>)}</div> : <>
            <PieceFields game={game} adding catalogOnly={catalogOnly} component={draft} players={players} onPatch={patch => setDraft({ ...draft, ...patch })}/>
            <div className="button-row"><button className="button text small-button" onClick={() => setDraft(null)}>다른 종류</button>{(catalogOnly || !boardSlotTypes(draft.kind).length) && <button className="button primary small-button" onClick={() => finishAdd()}>추가</button>}</div>
            {!catalogOnly && boardSlotTypes(draft.kind).length > 0 && <><button className="button text small-button" onClick={() => finishAdd()}>보드 밖에 추가</button></>}
          </>}
        </div> : selected && !multiple && <div className="se-form"><header className="se-form-head"><GameComponentArt game={game} {...artProps(inspected!, players)} size={48}/><div><h4>{componentTitle(inspected!)}</h4><span className="small muted">{friendlyLocation(selected.location)}</span></div><button className="icon-button" aria-label="선택 해제" onClick={() => { setSelectedId(null); setMoveMode(false); }}><X size={18}/></button></header>
          {activeGroup && activeGroup.ids.length > 1 && <div className="se-group-members" aria-label="묶음의 개별 부품">{activeGroup.ids.map((id, index) => { const member = scene.components.find(c => c.id === id)!; return <button key={id} className={id === selectedId ? 'selected' : ''} aria-pressed={id === selectedId} onClick={() => { setSelectedId(id); setMoveMode(false); }}>{index + 1}<span>{friendlyLocation(member.location)}</span></button>; })}</div>}
          <PieceFields game={game} catalogOnly={catalogOnly} component={inspected!} players={players} onPatch={patch => {
            patchComponent(selected.id, patch);
            if (inlineNumberSelected) {
              const next = { ...scene, components: scene.components.map(c => c.id === selected.id ? { ...c, ...patch } : c) };
              setActiveGroupKey(groupSceneComponents(next).find(g => g.component.kind === 'number-token' && g.ids.includes(selected.id))?.key ?? null);
            }
          }}/>{!inlineNumberSelected && <details><summary>다른 종류로 바꾸기 +</summary><select aria-label="부품 종류 바꾸기" value={selected.kind} onChange={event => applyEdit(changeSceneComponentKind(scene, selected.id, event.target.value as SceneKind))}>{SCENE_KINDS.filter(kind => !catalogOnly || kind === selected.kind || ['resource-card', 'development-card', 'deck', 'token', 'container', 'unknown'].includes(kind)).map(kind => <option key={kind} value={kind}>{pieceName(kind)}</option>)}</select></details>}
          {!catalogOnly && (selected.kind === 'settlement' || selected.kind === 'city') && <button className="button text small-button" onClick={() => applyEdit(changeSceneComponentKind(scene, selected.id, selected.kind === 'city' ? 'settlement' : 'city'))}>{selected.kind === 'city' ? '마을로 바꾸기' : '도시로 바꾸기'}</button>}
          <div className="button-row">{!catalogOnly && !inlineNumberSelected && boardSlotTypes(selected.kind).length > 0 && <button className="button secondary small-button" onClick={() => { setMoveMode(!moveMode); setView('board'); requestAnimationFrame(() => svgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })); }}>자리 옮기기</button>}{!catalogOnly && !inlineNumberSelected && slotPoint(selected.location) && <button className="button text small-button" onClick={() => placeComponent(selected.id, { type: 'unplaced', id: null })}>보드에서 빼기</button>}<button className="button secondary small-button se-danger" onClick={() => { if (inlineNumberSelected) patchComponent(selected.id, { number: null }); else commit(editSceneSelection(scene, [selected.id], 'delete')); setSelectedId(null); setMoveMode(false); }}><Trash2 size={14}/>{inlineNumberSelected ? '숫자 지우기' : '삭제'}</button></div>
          {selected.evidenceId && onEvidence && <button className="button text small-button" onClick={() => onEvidence(selected.evidenceId!, selected.region ?? undefined)}>원본 보기</button>}
        </div>}
      </aside>
    </div>
    {!(catalogOnly && view === 'board') && <details className="se-details" open={multiple || undefined}><summary>부품 목록 더 보기 +</summary><div className="se-list" data-scene-drop="off-board"><div className="se-simple-list">{groups.map(group => <GroupButton game={game} key={group.key} group={group} players={players} selected={group.ids.some(id => selectedIds.includes(id))} onClick={() => selectGroup(group)}/>)}</div></div></details>}
  </div>;
}

function pieceName(kind: SceneKind) { return kind === 'settlement' ? '마을' : SCENE_KIND_LABELS[kind]; }
function GroupButton({ group, players, selected, onClick, game }: { game?: string; group: SceneGroup; players: Player[]; selected: boolean; onClick: () => void }) {
  const owner = players.find(p => p.id === group.component.ownerId);
  return <button className={selected ? 'selected' : ''} aria-pressed={selected} onClick={onClick}>
    <GameComponentArt game={game} {...artProps(group.component, players)} size={40}/>
    <span><strong>{componentTitle(group.component)}</strong>{owner && <small><i className="se-color-dot" style={{ backgroundColor: owner.color }}/>{owner.name}</small>}</span>
    <b>×{group.quantity ?? '?'}</b>
  </button>;
}
export function OwnerColors({ players, value, onChange, label = '소유색', game }: { label?: string; game?: string; players: Player[]; value: string | null | undefined; onChange: (ownerId: string | null) => void }) {
  return <fieldset className="se-owner-colors"><legend>{label}</legend><div>
    <button type="button" aria-pressed={value === null} className={value === null ? 'selected' : ''} onClick={() => onChange(null)}><i className="se-color-dot"/>모름</button>
    {players.map(player => <button type="button" key={player.id} aria-pressed={value === player.id} className={value === player.id ? 'selected' : ''} onClick={() => onChange(player.id)}><PlayerPiece color={player.color} game={game} size={22}/>{player.name}</button>)}
  </div></fieldset>;
}
function friendlyLocation(location: SceneLocation) {
  if (!location.id || location.type === 'unplaced') return '위치 미정';
  if (location.type === 'area') return '보드 밖';
  const slots = location.type === 'hex' ? CATAN_TOPOLOGY.hexes : location.type === 'edge' ? CATAN_TOPOLOGY.edges : CATAN_TOPOLOGY.vertices;
  const index = slots.findIndex(s => s.id === location.id);
  return `${location.type === 'hex' ? '타일' : location.type === 'edge' ? '길 자리' : '건물 자리'} ${index + 1}`;
}
function PieceFields({ component: c, players, onPatch, adding = false, catalogOnly = false, game }: { catalogOnly?: boolean; adding?: boolean; game?: string; component: SceneComponent; players: Player[]; onPatch: (patch: Partial<SceneComponent>) => void }) {
  const variants = SCENE_VARIANTS[c.kind];
  const cards = ['resource-card','development-card','deck'].includes(c.kind);
  return <div className="se-piece-fields">
    {variants && <label>종류<select value={c.variant ?? ''} onChange={event => { const variant = event.target.value || null; onPatch({ variant, ...(c.kind === 'harbor' ? { ratio: variant === 'generic' ? 3 : variant ? 2 : null } : {}) }); }}><option value="">모름</option>{variants.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}{c.variant && !variants.some(o => o.value === c.variant) && <option value={c.variant}>{c.variant}</option>}</select></label>}
    {canEditOwner(c.kind) && (c.observedColor || !c.ownerId && ['road', 'settlement', 'city'].includes(c.kind)) && <label>사진색 {c.observedColor ? `· ${c.observedColor}` : '· 미확인'}<input type="color" aria-label="사진에서 본 부품 색" value={observedColorCSS(c.observedColor) ?? '#cfcabb'} onInput={event => onPatch({ observedColor: event.currentTarget.value })} onChange={event => onPatch({ observedColor: event.target.value })}/>{c.observedColor && <small className="muted">같은 사진색은 소유색을 함께 연결해요.</small>}</label>}
    {canEditOwner(c.kind) && <OwnerColors game={game} players={players} value={c.ownerId} onChange={ownerId => onPatch({ ownerId })}/>}
    {(c.kind === 'number-token' || (c.kind === 'terrain' && c.number !== undefined)) && <label>숫자<select value={c.number ?? ''} onChange={event => onPatch({ number: event.target.value ? Number(event.target.value) : null })}><option value="">모름</option>{CATAN_NUMBERS.map(n => <option key={n} value={n}>{n}</option>)}</select></label>}
    {c.kind === 'harbor' && <label>교환 비율<select value={c.ratio ?? ''} onChange={event => onPatch({ ratio: event.target.value ? Number(event.target.value) : null })}><option value="">모름</option><option value={3}>3:1</option><option value={2}>2:1</option></select></label>}
    {(!adding || !boardSlotTypes(c.kind).length) && (catalogOnly || !slotPoint(c.location) || c.quantity !== 1) && <label>수량<input type="number" min={0} step={1} inputMode="numeric" placeholder="모름" value={c.quantity ?? ''} onChange={event => { const value = event.target.value === '' ? null : Number(event.target.value); if (value === null || Number.isInteger(value) && value >= 0) onPatch({ quantity: value }); }}/></label>}
    {cards && <label>보이는 면<select value={c.face ?? ''} onChange={event => onPatch({ face: event.target.value as SceneComponent['face'] || null })}><option value="">모름</option><option value="front">앞면</option><option value="back">뒷면</option></select></label>}
  </div>;
}
// ---------- Board ----------
function BoardView({ game, svgRef, scene, players, selectedId, selectedIds, selectedHex, targetKind, drag, dragComponent, onBeginDrag, onSelect, onTarget, onHex, onBackground }: {
  game?: string; svgRef: React.RefObject<SVGSVGElement | null>; scene: ComponentScene; players: Player[]; selectedId: string | null; selectedIds: string[]; selectedHex: string | null; targetKind: SceneKind | null;
  drag: DragState | null; dragComponent: SceneComponent | null;
  onBeginDrag: (event: ReactPointerEvent, id: string) => void; onSelect: (id: string) => void; onTarget: (location: SceneLocation) => void; onHex: (hexId: string) => void; onBackground: () => void;
}) {
  const onBoard = scene.components.filter(c => c.quantity !== 0 && slotPoint(c.location));
  const byHex = new Map<string, SceneComponent[]>();
  for (const c of onBoard) if (c.location.type === 'hex') byHex.set(c.location.id!, [...(byHex.get(c.location.id!) ?? []), c]);
  // Pieces sharing one slot fan out slightly so each stays reachable.
  const stackIndex = new Map<string, number>();
  const offsets = new Map<string, number>();
  for (const c of onBoard) {
    const key = `${c.location.type}:${c.location.id}:${c.kind}`;
    const n = stackIndex.get(key) ?? 0; stackIndex.set(key, n + 1); offsets.set(c.id, n);
  }
  const slotTypes = targetKind ? boardSlotTypes(targetKind) : [];
  const order: SceneKind[] = ['terrain', 'harbor', 'road', 'settlement', 'city', 'number-token', 'token', 'unknown', 'robber'];
  const pieces = onBoard.filter(c => c.id !== dragComponent?.id || !drag?.point).sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || (a.id === selectedId ? 1 : 0) - (b.id === selectedId ? 1 : 0));
  const terrainPieces = pieces.filter(c => c.kind === 'terrain');
  const otherPieces = pieces.filter(c => c.kind !== 'terrain');
  const activeSource = dragComponent ?? scene.components.find(component => component.id === selectedId);
  const isSourceSlot = (location: SceneLocation) => !!activeSource && sameSceneLocation(activeSource.location, location);
  const targetPlans = useMemo(() => {
    const plans = new Map<string, SceneMoveResult>();
    if (!activeSource || !targetKind) return plans;
    for (const type of boardSlotTypes(targetKind)) for (const target of CATAN_TOPOLOGY.byId[type].values()) plans.set(`${type}:${target.id}`, moveSceneComponent(scene, activeSource.id, { type, id: target.id }, { intent: 'correct' }));
    return plans;
  }, [scene, activeSource?.id, targetKind]);
  const targetInfo = (location: SceneLocation) => {
    const plan = targetPlans.get(`${location.type}:${location.id}`);
    
    return { state: plan?.status === 'rejected' ? 'blocked' : plan?.status === 'swapped' ? 'swap' : '', description: `${friendlyLocation(location)}${plan?.status === 'swapped' ? ' · 자리 교환' : ''}` };
  };

  const renderPiece = (c: SceneComponent) => {
    const p = (c.kind === 'harbor' ? harborPoint(c.location.id) : null) ?? slotPoint(c.location)!, n = offsets.get(c.id) ?? 0;
    const size = ART_SIZE[c.kind];
    let x = p.x * U + n * 12, y = p.y * U - n * 12, rotate = 0;
    if (c.kind === 'robber') { x += 44; y -= 14; }
    if (c.kind === 'road' && c.location.type === 'edge') rotate = CATAN_TOPOLOGY.byId.edge.get(c.location.id!)!.angle;
    if (typeof c.direction === 'number' && c.kind !== 'road') rotate = c.direction;
    const tokenOnHex = c.kind === 'terrain' && byHex.get(c.location.id!)?.some(o => o.kind === 'number-token');
    const art = artProps(c, players);
    return <g key={c.id} className={`se-piece se-piece--${c.kind} ${selectedIds.includes(c.id) ? 'selected' : ''}`} transform={`translate(${x} ${y}) rotate(${rotate})`}
      role="button" tabIndex={0} aria-label={`${componentTitle(c)}, ${friendlyLocation(c.location)}`} aria-pressed={selectedIds.includes(c.id)}
      onPointerDown={event => onBeginDrag(event, c.id)}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(c.id); } }}>
      {selectedIds.includes(c.id) && (c.kind === 'terrain'
        ? <polygon className="se-selection" points={hexPoints(0, 0, U * 0.98)}/>
        : <circle className="se-selection" r={size * 0.42}/>)}
      <g transform={`translate(${-size / 2} ${-size / 2})`}><GameComponentArt game={game} {...art} number={tokenOnHex ? undefined : art.number} size={size}/></g>
      {c.kind === 'terrain' ? <polygon className="se-hit" points={hexPoints(0, 0, U * 0.96)}/>
        : c.kind === 'road' ? <rect className="se-hit" x={-size * 0.4} y={-16} width={size * 0.8} height={32} rx={10}/>
        : <circle className="se-hit" r={Math.max(size * 0.4, 22)}/>}
    </g>;
  };

  return <svg ref={svgRef} className="se-board" viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}`} role="group" aria-label="카탄 보드 그림">
    <rect className="se-board-bg" x={VIEW.x} y={VIEW.y} width={VIEW.width} height={VIEW.height} onClick={onBackground}/>
    <text x={VIEW.x+28} y={VIEW.y+40} className="se-sea-label">바다</text>
    <polygon className="se-frame" points={FRAME} onClick={onBackground}/>
    {CATAN_TOPOLOGY.hexes.map(hex => <g key={hex.id}>
      <polygon className={`se-hex-slot ${selectedHex === hex.id ? 'selected' : ''}`} points={hexPoints(hex.x * U, hex.y * U, U * 0.96)} onClick={() => onHex(hex.id)}/>
      {!byHex.get(hex.id)?.some(c => c.kind === 'terrain') && <text className="se-hex-label" x={hex.x * U} y={hex.y * U + 6}>{'＋'}</text>}
    </g>)}
    {terrainPieces.map(renderPiece)}
    {pieces.filter(c=>c.kind==='harbor').map(h=>{ const edge=coastalEdge(h.location.id),p=harborPoint(h.location.id); if(!edge||!p)return null;return <g key={'harbor-links-'+h.id} className={`se-harbor-links ${selectedId===h.id?'selected':''}`}>{edge.vertexIds.map(id=>{const v=CATAN_TOPOLOGY.byId.vertex.get(id)!;return <g key={id}><line x1={p.x*U} y1={p.y*U} x2={v.x*U} y2={v.y*U}/><circle cx={v.x*U} cy={v.y*U} r={8}/></g>;})}</g>;})}
    {otherPieces.map(renderPiece)}
    {slotTypes.includes('hex') && CATAN_TOPOLOGY.hexes.filter(hex => !isSourceSlot({ type: 'hex', id: hex.id })).map(hex => {
      const location: SceneLocation = { type: 'hex', id: hex.id }, info = targetInfo(location);
      return <polygon key={`t-${hex.id}`} className={`se-target se-target-hex ${info.state} ${drag?.snap?.id === hex.id ? 'hot' : ''}`} points={hexPoints(hex.x * U, hex.y * U, U * 0.8)} role="button" tabIndex={0} aria-label={info.description} onClick={() => onTarget(location)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onTarget(location); } }}><title>{info.description}</title></polygon>;
    })}
    {slotTypes.includes('edge') && CATAN_TOPOLOGY.edges.filter(edge => (targetKind !== 'harbor' || edge.hexIds.length === 1) && !isSourceSlot({ type: 'edge', id: edge.id })).map(edge => {
      const location: SceneLocation = { type: 'edge', id: edge.id }, info = targetInfo(location);
      return <rect key={`t-${edge.id}`} className={`se-target se-target-edge ${info.state} ${drag?.snap?.id === edge.id ? 'hot' : ''}`} x={-34} y={-15} width={68} height={30} rx={6} transform={`translate(${edge.x * U} ${edge.y * U}) rotate(${edge.angle})`} role="button" tabIndex={0} aria-label={info.description} onClick={() => onTarget(location)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onTarget(location); } }}><title>{info.description}</title></rect>;
    })}
    {slotTypes.includes('vertex') && CATAN_TOPOLOGY.vertices.filter(vertex => !isSourceSlot({ type: 'vertex', id: vertex.id })).map(vertex => {
      const location: SceneLocation = { type: 'vertex', id: vertex.id }, info = targetInfo(location);
      return <circle key={`t-${vertex.id}`} className={`se-target se-target-vertex ${info.state} ${drag?.snap?.id === vertex.id ? 'hot' : ''}`} cx={vertex.x * U} cy={vertex.y * U} r={23} role="button" tabIndex={0} aria-label={info.description} onClick={() => onTarget(location)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onTarget(location); } }}><title>{info.description}</title></circle>;
    })}
    {drag?.active && dragComponent && drag.point && <g className="se-ghost" transform={`translate(${(drag.snap ? slotPoint(drag.snap)!.x : drag.point.x) * U} ${(drag.snap ? slotPoint(drag.snap)!.y : drag.point.y) * U}) rotate(${drag.snap?.type === 'edge' ? CATAN_TOPOLOGY.byId.edge.get(drag.snap.id!)!.angle : 0})`}>
      <g transform={`translate(${-ART_SIZE[dragComponent.kind] / 2} ${-ART_SIZE[dragComponent.kind] / 2})`}><GameComponentArt game={game} {...artProps(dragComponent, players)} size={ART_SIZE[dragComponent.kind]}/></g>
    </g>}
  </svg>;
}

// ---------- Photo ----------
function PhotoView({ photo, photos, scene, selected, drawing, onPhoto, onSelect, onRegion }: {
  photo: Evidence; photos: Evidence[]; scene: ComponentScene; selected: SceneComponent | null; drawing: boolean;
  onPhoto: (id: string) => void; onSelect: (id: string) => void; onRegion: (region: SceneRegion) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<{ start: Point; end: Point; pointerId: number } | null>(null);
  const regions = scene.components.filter(c => c.evidenceId === photo.id && c.region);
  const point = (event: ReactPointerEvent): Point => {
    const rect = boxRef.current!.getBoundingClientRect();
    return { x: Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1), y: Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1) };
  };
  const rectOf = (d: { start: Point; end: Point }) => ({ x: Math.min(d.start.x, d.end.x), y: Math.min(d.start.y, d.end.y), width: Math.abs(d.end.x - d.start.x), height: Math.abs(d.end.y - d.start.y) });
  return <div className="se-photo">
    {photos.length > 1 && <div className="se-photo-tabs">{photos.map(p => <button key={p.id} className={p.id === photo.id ? 'active' : ''} onClick={() => onPhoto(p.id)}><img src={p.url} alt=""/><span>{p.label}</span></button>)}</div>}
    <div className={`se-photo-frame ${drawing ? 'drawing' : ''}`} ref={boxRef}>
      <img src={photo.url} alt={photo.label} draggable={false}/>
      {regions.map(c => <button key={c.id} className={`se-region ${c.id === selected?.id ? 'selected' : ''}`} style={{ left: `${c.region!.x * 100}%`, top: `${c.region!.y * 100}%`, width: `${c.region!.width * 100}%`, height: `${c.region!.height * 100}%` }}
        onClick={() => onSelect(c.id)} aria-label={componentTitle(c)}><span>{componentTitle(c)}</span></button>)}
      {drawing && <div className="se-draw-layer"
        onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); const p = point(event); setDraft({ start: p, end: p, pointerId: event.pointerId }); }}
        onPointerMove={event => { if (draft && event.pointerId === draft.pointerId) setDraft({ ...draft, end: point(event) }); }}
        onPointerUp={event => { if (!draft) return; const region = normalizeRegion(rectOf({ ...draft, end: point(event) })); setDraft(null); if (region && region.width > 0.005 && region.height > 0.005) onRegion(region); }}
        onPointerCancel={() => setDraft(null)}>
        {draft && (() => { const r = rectOf(draft); return <div className="se-draft" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` }}/>; })()}
      </div>}
    </div>
  </div>;
}

function SourceCrop({ url, region }: { url: string; region: SceneRegion }) {
  const [ratio, setRatio] = useState<number | null>(null);
  const aspect = ratio ? (region.width * ratio) / region.height : region.width / region.height;
  return <div className="se-crop" style={{ aspectRatio: String(aspect) }}>
    <img src={url} alt="" draggable={false} onLoad={event => setRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)}
      style={{ width: `${100 / region.width}%`, height: `${100 / region.height}%`, left: `${-region.x / region.width * 100}%`, top: `${-region.y / region.height * 100}%` }}/>
  </div>;
}

// ---------- Form ----------
