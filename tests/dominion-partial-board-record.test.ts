import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { register } from 'node:module';
import { readFile } from 'node:fs/promises';
import { catalogPacks } from '../gamepacks/catalog.ts';
import { validateGenericRecord, type GenericRecord } from '../shared/genericRecord.ts';
import { loadRealAssets } from '../src/realBoards.ts';

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

test('Dominion confirmed supply piles and trash mat save, validate, and reopen', async () => {
  const originalFetch = globalThis.fetch, hadWindow = Object.hasOwn(globalThis, 'window'), originalWindow = (globalThis as any).window;
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/dominion/board.json', import.meta.url), 'utf8'));
  const mapping = JSON.parse(await readFile(new URL('../public/game-art/boards/mapping.json', import.meta.url), 'utf8'));
  const piecesSvg = await readFile(new URL('../public/game-art/real-boards/dominion/pieces.svg', import.meta.url), 'utf8');
  const pack = catalogPacks.find(item => item.id === 'dominion')!;
  assert.equal(board.status, 'partial'); assert.equal(board.recordingMode, 'partial-slots');
  assert.equal(board.areas.find((candidate: any) => candidate.id === 'basic-supply').slots.length, 7);
  assert.equal(board.areas.find((candidate: any) => candidate.id === 'kingdom-supply').slots.length, 10);
  assert.equal(board.areas.find((candidate: any) => candidate.id === 'trash-mat').slots.length, 1);
  assert.equal(board.areas.flatMap((candidate: any) => candidate.slots).length, 18);
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/board.json')) return new Response(JSON.stringify(board), { status: 200 });
    if (url.endsWith('/pieces.svg')) return new Response(piecesSvg, { status: 200 });
    if (url.endsWith('/mapping.json')) return new Response(JSON.stringify(mapping), { status: 200 });
    return new Response('', { status: 404 });
  }) as typeof fetch;
  (globalThis as any).window = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };

  const card = { id: 'estate-pile', componentId: 'cards', variant: null, quantity: 8, label: 'Estate pile', anchor: '', evidenceId: null, region: null };
  const record: GenericRecord = { version: 'game-component-record-v1', pieces: [card] }; let saved: GenericRecord | undefined;
  const props = { pack, fieldKey: 'supply.scene', record, selected: card.id, busy: false, onChange: (next: GenericRecord) => { saved = next; } };
  const ui = mount(GameBoardRecord, props);
  try {
    await loadRealAssets('dominion'); await new Promise(resolve => setImmediate(resolve)); ui.render();
    assert(nodes(ui.tree).some(node => node.type === 'p' && /부분 기록판/.test(String(node.props.children))));
    const slots = nodes(ui.tree).filter(node => node.type === 'button' && String(node.props.className).includes('gb-slot'));
    assert.equal(slots.length, 18);
    find(ui.tree, node => node.type === 'button' && String(node.props.className).includes('gb-slot') && String(node.props['aria-label']).startsWith('7종 기본 공급 pile')).props.onClick();
    assert(saved);
    assert.equal(saved!.pieces[0].placement?.areaId, 'supply');
    const validated = validateGenericRecord(saved as any, pack, 'supply.scene', []);
    assert.deepEqual(validated.pieces[0].placement, saved!.pieces[0].placement);

    const reopened = mount(GameBoardRecord, { ...props, record: validated, onChange() {} });
    try {
      await new Promise(resolve => setImmediate(resolve)); reopened.render();
      const filledSlot = find(reopened.tree, node => node.type === 'button' && String(node.props.className).includes('gb-slot') && String(node.props.className).includes('filled'));
      assert.match(String(filledSlot.props['aria-label']), /Estate pile/);
      assert(nodes(reopened.tree).some(node => node.type === 'p' && /부분 기록판/.test(String(node.props.children))));
    } finally { reopened.dispose(); }
  } finally {
    ui.dispose(); globalThis.fetch = originalFetch;
    if (hadWindow) (globalThis as any).window = originalWindow; else delete (globalThis as any).window;
  }
});
