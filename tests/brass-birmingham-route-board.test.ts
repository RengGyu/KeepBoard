import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { register } from 'node:module';
import { readFile } from 'node:fs/promises';
import { catalogPacks } from '../gamepacks/catalog.ts';
import { validateGenericRecord, type GenericRecord } from '../shared/genericRecord.ts';
import { emptyGameReadout, setReadoutValue, type GameReadout } from '../shared/readouts/registry.ts';
import { recordSurfacePoint } from '../src/boardVisuals.ts';
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

test('Brass Birmingham route overlay places a link on the full map and preserves endpoints/owner across validation and reopen', async () => {
  const originalFetch = globalThis.fetch, hadWindow = Object.hasOwn(globalThis, 'window'), originalWindow = (globalThis as any).window;
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/brass-birmingham/board.json', import.meta.url), 'utf8'));
  const mapping = JSON.parse(await readFile(new URL('../public/game-art/boards/mapping.json', import.meta.url), 'utf8'));
  const piecesSvg = await readFile(new URL('../public/game-art/real-boards/brass-birmingham/pieces.svg', import.meta.url), 'utf8');
  const pack = catalogPacks.find(item => item.id === 'brass-birmingham')!;
  assert.equal(board.recordingMode, 'interactive-network'); assert.equal(board.network.cities.length, 25); assert.equal(board.network.routes.length, 43);
  let readout = emptyGameReadout(pack, 'links');
  readout = setReadoutValue(pack, readout, 'owner', 'p1', { playerIds: ['p1'] });
  const link = { id: 'link-1', componentId: 'links', variant: null, quantity: 1, label: '링크 타일', anchor: '', evidenceId: null, region: null, readout };
  const record: GenericRecord = { version: 'game-component-record-v1', pieces: [link] }; let saved: GenericRecord | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/board.json')) return new Response(JSON.stringify(board), { status: 200 });
    if (url.endsWith('/pieces.svg')) return new Response(piecesSvg, { status: 200 });
    if (url.endsWith('/mapping.json')) return new Response(JSON.stringify(mapping), { status: 200 });
    return new Response('', { status: 404 });
  }) as typeof fetch;
  (globalThis as any).window = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  const props = { pack, fieldKey: 'network.scene', record, selected: link.id, busy: false, onChange: (next: GenericRecord) => { saved = next; } };
  const ui = mount(GameBoardRecord, props);
  try {
    await loadRealAssets('brass-birmingham'); await new Promise(resolve => setImmediate(resolve)); ui.render();
    const map = find(ui.tree, node => node.type === 'div' && String(node.props.className).includes('gb-network-map'));
    assert.match(map.props['aria-label'], /판/);
    assert.equal(nodes(ui.tree).filter(node => node.type === 'span' && String(node.props.className).includes('gb-city-label')).length, 25);
    assert.equal(nodes(ui.tree).filter(node => node.type === 'g' && node.props.role === 'button').length, 43);
    const svg = find(ui.tree, node => node.type === 'svg' && String(node.props.className).includes('gb-network-hit-layer'));
    const area = board.areas.find((candidate: any) => candidate.id === 'routes');
    const route = board.network.routes[0], segment = route.segments[0], [bx, by, bw, bh] = area.bounds;
    const surface: any = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 1000 }) };
    svg.props.ref.current = { getBoundingClientRect: () => ({ left: bx, top: by, width: bw, height: bh }), closest: () => surface };
    const routeButton = find(ui.tree, node => node.type === 'g' && node.props.role === 'button' && String(node.props['aria-label']).startsWith('연결 1,'));
    assert.match(routeButton.props['aria-label'], /유형 직접 확인/);
    const clientX = bx + (segment.x - bx) / bw * 680, clientY = by + (segment.y - by) / bh * 700;
    routeButton.props.onClick({ clientX, clientY, stopPropagation() {} });
    assert(saved);
    const placed = saved!.pieces[0];
    assert.deepEqual(placed.placement, { areaId: 'network', ...recordSurfacePoint(segment.x, segment.y, 1000, 1000), rotation: 0 });
    const placedReadout = placed.readout as GameReadout;
    assert.equal(placedReadout.values.owner, 'p1');
    assert.equal(placedReadout.values.endpoints, `${board.network.cities.find((city: any) => city.id === route.from).label}–${board.network.cities.find((city: any) => city.id === route.to).label}`);
    assert.equal(placedReadout.values.linkType, null, 'map position does not guess canal versus rail');
    const reopened = validateGenericRecord(saved as any, pack, 'network.scene', [], { playerIds: ['p1'] });
    assert.deepEqual(reopened.pieces[0].placement, placed.placement);
    assert.deepEqual(reopened.pieces[0].readout, placed.readout);
  } finally {
    ui.dispose(); globalThis.fetch = originalFetch;
    if (hadWindow) (globalThis as any).window = originalWindow; else delete (globalThis as any).window;
  }
});
