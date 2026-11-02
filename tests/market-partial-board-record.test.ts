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

const cases = [
  { gameId: 'star-realms', slotCount: 6, slotLabel: '공용 Trade Row', componentId: 'cards', pieceLabel: 'Trade Row card' },
  { gameId: 'clank-catacombs', slotCount: 6, slotLabel: '던전 공개 카드 여섯 장', componentId: 'cards', pieceLabel: 'Dungeon market card' },
  { gameId: 'lost-ruins-arnak', slotCount: 6, slotLabel: '도구·유물 카드 시장', componentId: 'cards', pieceLabel: 'Arnak market card' },
  { gameId: 'power-grid', slotCount: 8, slotLabel: '발전소 시장', componentId: 'plants', pieceLabel: 'Power plant card' }
];

test('source-confirmed public card markets save and reopen on their existing runtime field', async () => {
  const originalFetch = globalThis.fetch, hadWindow = Object.hasOwn(globalThis, 'window'), originalWindow = (globalThis as any).window;
  const mapping = JSON.parse(await readFile(new URL('../public/game-art/boards/mapping.json', import.meta.url), 'utf8'));
  const packs = new Map(catalogPacks.map(pack => [pack.id, pack]));
  const boards = new Map<string, any>(), pieces = new Map<string, string>();
  for (const item of cases) {
    boards.set(item.gameId, JSON.parse(await readFile(new URL(`../public/game-art/real-boards/${item.gameId}/board.json`, import.meta.url), 'utf8')));
    pieces.set(item.gameId, await readFile(new URL(`../public/game-art/real-boards/${item.gameId}/pieces.svg`, import.meta.url), 'utf8'));
    const board = boards.get(item.gameId);
    assert.equal(board.status, 'partial'); assert.equal(board.recordingMode, 'partial-slots');
    assert.equal(board.areas.flatMap((area: any) => area.slots).length, item.slotCount);
  }
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/mapping.json')) return new Response(JSON.stringify(mapping), { status: 200 });
    const match = url.match(/\/game-art\/real-boards\/([^/]+)\/(board\.json|pieces\.svg)$/);
    if (match?.[2] === 'board.json') return new Response(JSON.stringify(boards.get(match[1])), { status: 200 });
    if (match?.[2] === 'pieces.svg') return new Response(pieces.get(match[1]) ?? '', { status: pieces.has(match[1]) ? 200 : 404 });
    return new Response('', { status: 404 });
  }) as typeof fetch;
  (globalThis as any).window = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };

  try {
    for (const item of cases) {
      const pack = packs.get(item.gameId)!;
      await loadRealAssets(item.gameId);
      const piece = { id: `${item.gameId}-selected`, componentId: item.componentId, variant: null, quantity: 1, label: item.pieceLabel, anchor: '', evidenceId: null, region: null };
      const record: GenericRecord = { version: 'game-component-record-v1', pieces: [piece] }; let saved: GenericRecord | undefined;
      const props = { pack, fieldKey: 'market.scene', record, selected: piece.id, busy: false, onChange: (next: GenericRecord) => { saved = next; } };
      const ui = mount(GameBoardRecord, props);
      try {
        await new Promise(resolve => setImmediate(resolve)); ui.render();
        assert.equal(nodes(ui.tree).filter(node => node.type === 'button' && String(node.props.className).includes('gb-slot')).length, item.slotCount, `${item.gameId} should expose only its generated market positions`);
        find(ui.tree, node => node.type === 'button' && String(node.props.className).includes('gb-slot') && String(node.props['aria-label']).startsWith(item.slotLabel)).props.onClick();
        assert(saved, `${item.gameId} should save a selected card position`);
        assert.equal(saved!.pieces[0].placement?.areaId, 'market');
        const validated = validateGenericRecord(saved as any, pack, 'market.scene', []);
        assert.deepEqual(validated.pieces[0].placement, saved!.pieces[0].placement);
        const reopened = mount(GameBoardRecord, { ...props, record: validated, onChange() {} });
        try {
          await new Promise(resolve => setImmediate(resolve)); reopened.render();
          const filled = find(reopened.tree, node => node.type === 'button' && String(node.props.className).includes('gb-slot') && String(node.props.className).includes('filled'));
          assert.match(String(filled.props['aria-label']), new RegExp(item.pieceLabel));
        } finally { reopened.dispose(); }
      } finally { ui.dispose(); }
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (hadWindow) (globalThis as any).window = originalWindow; else delete (globalThis as any).window;
  }
});
