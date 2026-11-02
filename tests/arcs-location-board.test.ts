import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { register } from 'node:module';
import { readFile } from 'node:fs/promises';
import { catalogPacks } from '../gamepacks/catalog.ts';
import { validateGenericRecord, type GenericRecord } from '../shared/genericRecord.ts';
import { loadRealAssets } from '../src/realBoards.ts';
import { recordSurfacePoint } from '../src/boardVisuals.ts';

register('../docs/board-story/feedback/skip-css.mjs', import.meta.url);
const { GameBoardRecord } = await import('../src/GameBoardRecord.tsx');

function mount(component: (props: any) => any, props: any) {
  const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const slots: any[] = []; let cursor = 0; let tree: any; let pending: (() => void)[] = [];
  const dispatcher = {
    useMemo(fn: () => unknown) { cursor++; return fn(); },
    useState(value: any) { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], (next: any) => slots[i] = typeof next === 'function' ? next(slots[i]) : next]; },
    useRef(value: any) { const i = cursor++; return slots[i] ??= { current: value }; },
    useEffect(effect: () => any, deps?: any[]) { const i = cursor++, old = slots[i]; if (!old || !deps || deps.some((v, j) => !Object.is(v, old.deps?.[j]))) pending.push(() => { if (typeof old?.cleanup === 'function') old.cleanup(); slots[i] = { deps, cleanup: effect() }; }); }
  };
  const render = () => { cursor = 0; pending = []; const previous = internals.H; internals.H = dispatcher; try { tree = component(props); } finally { internals.H = previous; } for (const effect of pending) effect(); return tree; };
  render(); return { render, get tree() { return tree; }, dispose() { for (const slot of slots) if (typeof slot?.cleanup === 'function') slot.cleanup(); } };
}
function nodes(tree: any): any[] { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
function find(tree: any, predicate: (node: any) => boolean) { const node = nodes(tree).find(predicate); assert(node, 'expected UI element missing'); return node; }

test('Arcs gate/planet targets store map-scene coordinates and restore the selected piece', async () => {
  const originalFetch = globalThis.fetch, hadWindow = Object.hasOwn(globalThis, 'window'), originalWindow = (globalThis as any).window;
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/arcs/board.json', import.meta.url), 'utf8'));
  const mapping = JSON.parse(await readFile(new URL('../public/game-art/boards/mapping.json', import.meta.url), 'utf8'));
  const piecesSvg = await readFile(new URL('../public/game-art/real-boards/arcs/pieces.svg', import.meta.url), 'utf8');
  const pack = catalogPacks.find(item => item.id === 'arcs')!;
  assert.equal(board.recordingMode, 'location-only');
  assert.equal(board.areas.filter((candidate: any) => candidate.placement === 'free-pieces').length, 24);
  const piece = { id: 'ship-1', componentId: 'pieces', variant: null, quantity: 1, label: '함선', anchor: '', evidenceId: null, region: null };
  const record: GenericRecord = { version: 'game-component-record-v1', pieces: [piece] }; let saved: GenericRecord | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/board.json')) return new Response(JSON.stringify(board), { status: 200 });
    if (url.endsWith('/pieces.svg')) return new Response(piecesSvg, { status: 200 });
    if (url.endsWith('/mapping.json')) return new Response(JSON.stringify(mapping), { status: 200 });
    return new Response('', { status: 404 });
  }) as typeof fetch;
  (globalThis as any).window = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  const props = { pack, fieldKey: 'map.scene', record, selected: piece.id, busy: false, onChange: (next: GenericRecord) => { saved = next; } };
  const ui = mount(GameBoardRecord, props);
  try {
    await loadRealAssets('arcs'); await new Promise(resolve => setImmediate(resolve)); ui.render();
    const map = find(ui.tree, node => node.type === 'div' && String(node.props.className).includes('gb-location-map'));
    assert.match(map.props['aria-label'], /위치 기록/);
    const targets = nodes(ui.tree).filter(node => node.type === 'button' && String(node.props.className).includes('gb-location-target'));
    assert.equal(targets.length, 24);
    const target = find(ui.tree, node => node.type === 'button' && node.props.className === 'gb-location-target' && node.props['aria-label'].startsWith('1성단 관문'));
    const [bx, by, bw, bh] = board.areas.find((candidate: any) => candidate.id === 'map').bounds;
    const system = board.areas.find((candidate: any) => candidate.id === 'gate-1'), [tx, ty, tw, th] = system.bounds;
    const surface: any = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 650, height: 650 }) };
    target.props.onClick({ stopPropagation() {}, currentTarget: { closest: () => surface } });
    assert(saved);
    const placed = saved!.pieces[0];
    const expected = recordSurfacePoint((tx + tw / 2 - bx) / bw * 650, (ty + th / 2 - by) / bh * 650, 650, 650);
    assert.deepEqual(placed.placement, { areaId: 'map', ...expected, rotation: 0 });
    const validated = validateGenericRecord(saved as any, pack, 'map.scene', []);
    assert.deepEqual(validated.pieces[0].placement, placed.placement);
    const reopened = mount(GameBoardRecord, { ...props, record: validated, onChange() {} });
    try {
      await new Promise(resolve => setImmediate(resolve)); reopened.render();
      const restored = find(reopened.tree, node => node.type === 'button' && String(node.props.className).includes('gb-piece') && String(node.props.className).includes('placed'));
      assert.match(restored.props.style.left, /0\.\d+ \* \(100% - 80px\)/);
      assert.match(restored.props.style.top, /0\.\d+ \* \(100% - 80px\)/);
    } finally { reopened.dispose(); }
  } finally {
    ui.dispose(); globalThis.fetch = originalFetch;
    if (hadWindow) (globalThis as any).window = originalWindow; else delete (globalThis as any).window;
  }
});
