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
  const slots: any[] = [];
  let cursor = 0;
  let tree: any;
  let pending: (() => void)[] = [];
  const dispatcher = {
    useMemo(fn: () => unknown) { cursor++; return fn(); },
    useState(value: any) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value;
      return [slots[i], (next: any) => slots[i] = typeof next === 'function' ? next(slots[i]) : next];
    },
    useRef(value: any) { const i = cursor++; return slots[i] ??= { current: value }; },
    useEffect(effect: () => any, deps?: any[]) {
      const i = cursor++, old = slots[i];
      if (!old || !deps || deps.some((v, j) => !Object.is(v, old.deps?.[j]))) pending.push(() => {
        if (typeof old?.cleanup === 'function') old.cleanup();
        slots[i] = { deps, cleanup: effect() };
      });
    }
  };
  const render = () => {
    cursor = 0; pending = [];
    const previous = internals.H; internals.H = dispatcher;
    try { tree = component(props); } finally { internals.H = previous; }
    for (const effect of pending) effect();
    return tree;
  };
  render();
  return { render, get tree() { return tree; }, dispose() { for (const slot of slots) if (typeof slot?.cleanup === 'function') slot.cleanup(); } };
}

function nodes(tree: any): any[] {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}

function find(tree: any, predicate: (node: any) => boolean) {
  const node = nodes(tree).find(predicate);
  assert(node, 'expected UI element missing');
  return node;
}

test('Clue location-only board renders its pinned partial map and saves figure coordinates on the existing scene field', async () => {
  const originalFetch = globalThis.fetch;
  const hadWindow = Object.hasOwn(globalThis, 'window');
  const originalWindow = (globalThis as any).window;
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/clue/board.json', import.meta.url), 'utf8'));
  const mapping = JSON.parse(await readFile(new URL('../public/game-art/boards/mapping.json', import.meta.url), 'utf8'));
  const piecesSvg = await readFile(new URL('../public/game-art/real-boards/clue/pieces.svg', import.meta.url), 'utf8');
  const pack = catalogPacks.find(item => item.id === 'clue')!;
  const figure = { id: 'suspect-1', componentId: 'figures', variant: null, quantity: 1, label: 'suspect', anchor: '', evidenceId: null, region: null };
  const record: GenericRecord = { version: 'game-component-record-v1', pieces: [figure] };
  let saved: GenericRecord | undefined;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/board.json')) return new Response(JSON.stringify(board), { status: 200 });
    if (url.endsWith('/pieces.svg')) return new Response(piecesSvg, { status: 200 });
    if (url.endsWith('/mapping.json')) return new Response(JSON.stringify({ games: [mapping.games.find((item: any) => item.gameId === 'clue')] }), { status: 200 });
    return new Response('', { status: 404 });
  }) as typeof fetch;
  (globalThis as any).window = {};

  const ui = mount(GameBoardRecord, {
    pack, fieldKey: 'mansion.scene', record, selected: figure.id, busy: false,
    onChange: (next: GenericRecord) => { saved = next; }
  });
  try {
    await loadRealAssets('clue');
    await new Promise(resolve => setImmediate(resolve));
    ui.render();
    assert.equal((await loadRealAssets('clue'))?.board.status, 'partial');
    const surface = find(ui.tree, node => node.type === 'div' && String(node.props.className).includes('gb-location-map'));
    assert.match(surface.props['aria-label'], /위치 기록/);
    surface.props.onClick({
      clientX: 100, clientY: 130,
      currentTarget: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }) }
    });
    assert.deepEqual(saved?.pieces[0].placement, { areaId: 'mansion', x: 0.5, y: 0.75, rotation: 0 });
    const validated = validateGenericRecord(saved as any, pack, 'mansion.scene', []);
    assert.deepEqual(validated.pieces[0].placement, saved?.pieces[0].placement);
    const reopened = mount(GameBoardRecord, { pack, fieldKey: 'mansion.scene', record: validated, selected: figure.id, busy: false });
    try {
      await new Promise(resolve => setImmediate(resolve));
      reopened.render();
      const placed = find(reopened.tree, node => node.type === 'button' && String(node.props.className).includes('gb-piece') && String(node.props.className).includes('placed'));
      assert.equal(placed.props.style.left, 'calc(40px + 0.5 * (100% - 80px))');
      assert.equal(placed.props.style.top, 'calc(40px + 0.75 * (100% - 80px))');
    } finally { reopened.dispose(); }
  } finally {
    ui.dispose();
    globalThis.fetch = originalFetch;
    if (hadWindow) (globalThis as any).window = originalWindow;
    else delete (globalThis as any).window;
  }
});

test('partial boards without an explicit location-only capability stay hidden from the real-board consumer', async () => {
  const originalFetch = globalThis.fetch;
  const board = { gameId: 'partial-test', status: 'partial', svg: 'board.svg', viewBox: [0, 0, 1000, 1000], areas: [] };
  globalThis.fetch = (async () => new Response(JSON.stringify(board), { status: 200 })) as typeof fetch;
  try { assert.equal(await loadRealAssets('partial-test'), null); }
  finally { globalThis.fetch = originalFetch; }
});
