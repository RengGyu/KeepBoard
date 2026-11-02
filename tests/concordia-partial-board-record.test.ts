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

test('Concordia confirmed public market and personal store slots persist on their runtime fields', async () => {
  const originalFetch = globalThis.fetch, hadWindow = Object.hasOwn(globalThis, 'window'), originalWindow = (globalThis as any).window;
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/concordia/board.json', import.meta.url), 'utf8'));
  const mapping = JSON.parse(await readFile(new URL('../public/game-art/boards/mapping.json', import.meta.url), 'utf8'));
  const piecesSvg = await readFile(new URL('../public/game-art/real-boards/concordia/pieces.svg', import.meta.url), 'utf8');
  const pack = catalogPacks.find(item => item.id === 'concordia')!;
  assert.equal(board.status, 'partial'); assert.equal(board.recordingMode, 'partial-slots');
  assert.equal(board.areas.find((candidate: any) => candidate.id === 'display').slots.length, 7);
  assert.equal(board.areas.find((candidate: any) => candidate.id === 'store').slots.length, 12);
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/board.json')) return new Response(JSON.stringify(board), { status: 200 });
    if (url.endsWith('/pieces.svg')) return new Response(piecesSvg, { status: 200 });
    if (url.endsWith('/mapping.json')) return new Response(JSON.stringify(mapping), { status: 200 });
    return new Response('', { status: 404 });
  }) as typeof fetch;
  (globalThis as any).window = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  try {
    await loadRealAssets('concordia'); await new Promise(resolve => setImmediate(resolve));
    const card = { id: 'card-1', componentId: 'cards', variant: null, quantity: 1, label: '성격 카드', anchor: '', evidenceId: null, region: null };
    const cardRecord: GenericRecord = { version: 'game-component-record-v1', pieces: [card] }; let marketSaved: GenericRecord | undefined;
    const marketProps = { pack, fieldKey: 'display.scene', record: cardRecord, selected: card.id, busy: false, onChange: (next: GenericRecord) => { marketSaved = next; } };
    const market = mount(GameBoardRecord, marketProps);
    try {
      await new Promise(resolve => setImmediate(resolve)); market.render();
      assert(nodes(market.tree).some(node => node.type === 'p' && /부분 기록판/.test(String(node.props.children))));
      const slot = find(market.tree, node => node.type === 'button' && String(node.props.className).includes('gb-slot') && String(node.props['aria-label']).startsWith('카드 진열'));
      slot.props.onClick(); assert(marketSaved);
      assert.equal(marketSaved!.pieces[0].placement?.areaId, 'display');
      const marketValidated = validateGenericRecord(marketSaved as any, pack, 'display.scene', []);
      const marketResume = mount(GameBoardRecord, { ...marketProps, record: marketValidated, onChange() {} });
      try { await new Promise(resolve => setImmediate(resolve)); marketResume.render(); assert(nodes(marketResume.tree).some(node => node.type === 'button' && String(node.props.className).includes('gb-piece') && String(node.props.className).includes('placed'))); }
      finally { marketResume.dispose(); }
    } finally { market.dispose(); }

    const goods = { id: 'goods-1', componentId: 'goods', variant: null, quantity: 1, label: '상품', anchor: '', evidenceId: null, region: null };
    const storeRecord: GenericRecord = { version: 'game-component-record-v1', pieces: [goods] }; let storeSaved: GenericRecord | undefined;
    const storeProps = { pack, fieldKey: 'store.scene', record: storeRecord, selected: goods.id, busy: false, onChange: (next: GenericRecord) => { storeSaved = next; } };
    const store = mount(GameBoardRecord, storeProps);
    try {
      await new Promise(resolve => setImmediate(resolve)); store.render();
      const slot = find(store.tree, node => node.type === 'button' && String(node.props.className).includes('gb-slot') && String(node.props['aria-label']).startsWith('개인 창고'));
      slot.props.onClick(); assert(storeSaved);
      assert.equal(storeSaved!.pieces[0].placement?.areaId, 'store');
      const storeValidated = validateGenericRecord(storeSaved as any, pack, 'store.scene', []);
      assert.deepEqual(storeValidated.pieces[0].placement, storeSaved!.pieces[0].placement);
    } finally { store.dispose(); }
  } finally {
    globalThis.fetch = originalFetch;
    if (hadWindow) (globalThis as any).window = originalWindow; else delete (globalThis as any).window;
  }
});
