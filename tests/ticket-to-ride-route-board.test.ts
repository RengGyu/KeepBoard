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
import { ChipPick } from '../src/QuickPick.tsx';

register('../docs/board-story/feedback/skip-css.mjs', import.meta.url);
const { GameBoardRecord } = await import('../src/GameBoardRecord.tsx');
const { GameDetailFields } = await import('../src/readouts/GameDetailFields.tsx');
const { GameDetailReadout } = await import('../src/readouts/GameDetailReadout.tsx');

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

test('Ticket to Ride route map places a train in the chosen route segment and preserves owner through validation/reopen', async () => {
  const originalFetch = globalThis.fetch, hadWindow = Object.hasOwn(globalThis, 'window'), originalWindow = (globalThis as any).window;
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/ticket-to-ride/board.json', import.meta.url), 'utf8'));
  const boardSvg = await readFile(new URL('../public/game-art/real-boards/ticket-to-ride/board.svg', import.meta.url), 'utf8');
  const mapping = JSON.parse(await readFile(new URL('../public/game-art/boards/mapping.json', import.meta.url), 'utf8'));
  const piecesSvg = await readFile(new URL('../public/game-art/real-boards/ticket-to-ride/pieces.svg', import.meta.url), 'utf8');
  const pack = catalogPacks.find(item => item.id === 'ticket-to-ride')!;
  assert.equal(board.recordingMode, 'location-only'); assert.equal(board.network.cities.length, 36); assert.equal(board.network.routes.length, 98);
  assert.equal((boardSvg.match(/id="city-node-/g) ?? []).length, 36, 'the static board draws every city node');
  assert.equal((boardSvg.match(/id="route-segment-/g) ?? []).length, board.network.routes.reduce((sum: number, route: any) => sum + route.length, 0), 'the static board draws every physical route segment');
  assert.match(boardSvg, /id="network-map"/);
  let readout = emptyGameReadout(pack, 'trains');
  readout = setReadoutValue(pack, readout, 'owner', 'p1', { playerIds: ['p1'] });
  readout = setReadoutValue(pack, readout, 'route', '기존 노선', {});
  readout = setReadoutValue(pack, readout, 'segment', 2, {});
  const train = { id: 'train-1', componentId: 'trains', variant: null, quantity: 1, label: '열차 말', anchor: '', evidenceId: null, region: null, readout };
  const record: GenericRecord = { version: 'game-component-record-v1', pieces: [train] }; let saved: GenericRecord | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/board.json')) return new Response(JSON.stringify(board), { status: 200 });
    if (url.endsWith('/pieces.svg')) return new Response(piecesSvg, { status: 200 });
    if (url.endsWith('/mapping.json')) return new Response(JSON.stringify(mapping), { status: 200 });
    return new Response('', { status: 404 });
  }) as typeof fetch;
  (globalThis as any).window = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  const players = [{ id: 'p1', name: '첫 번째', color: 'red' }, { id: 'p2', name: '두 번째', color: 'blue' }];
  const props = { pack, fieldKey: 'map-area.scene', record, playerDetails: players, selected: train.id, busy: false, onChange: (next: GenericRecord) => { saved = next; } };
  const ui = mount(GameBoardRecord, props);
  try {
    await loadRealAssets('ticket-to-ride'); await new Promise(resolve => setImmediate(resolve)); ui.render();
    const map = find(ui.tree, node => node.type === 'div' && String(node.props.className).includes('gb-network-map'));
    assert.match(map.props['aria-label'], /위치 기록/);
    assert.equal(nodes(ui.tree).filter(node => node.type === 'span' && String(node.props.className).includes('gb-city-label')).length, 36);
    assert.equal(nodes(ui.tree).filter(node => node.type === 'g' && node.props.role === 'button').length, 98);
    const svg = find(ui.tree, node => node.type === 'svg' && String(node.props.className).includes('gb-network-hit-layer'));
    const surface: any = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 650, height: 440 }) };
    svg.props.ref.current = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 650, height: 440 }), closest: () => surface };
    const routeButton = find(ui.tree, node => node.type === 'g' && node.props.role === 'button' && String(node.props['aria-label']).startsWith('노선 1,'));
    const route = board.network.routes[0], segment = route.segments[0], [bx, by, bw, bh] = board.areas[0].bounds;
    const clientX = (segment.x - bx) / bw * 650, clientY = (segment.y - by) / bh * 440;
    routeButton.props.onClick({ clientX, clientY, stopPropagation() {} });
    assert(saved);
    const placed = saved!.pieces[0];
    const expected = recordSurfacePoint(clientX, clientY, 650, 440);
    assert.deepEqual(placed.placement, { areaId: 'map-area', x: expected.x, y: expected.y, rotation: 0 });
    const placedReadout=placed.readout as GameReadout;
    assert.equal(placedReadout.values.owner, 'p1');
    assert.equal(placedReadout.values.route, '1: 밴쿠버–시애틀');
    assert.equal(placedReadout.values.segment, segment.index);

    props.record = saved!;
    ui.render();
    const updatedSvg = find(ui.tree, node => node.type === 'svg' && String(node.props.className).includes('gb-network-hit-layer'));
    updatedSvg.props.ref.current = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 650, height: 440 }), closest: () => surface };
    const movedRoute = board.network.routes[4], movedSegment = movedRoute.segments[2];
    const movedX = (movedSegment.x - bx) / bw * 650, movedY = (movedSegment.y - by) / bh * 440;
    find(ui.tree, node => node.type === 'g' && node.props.role === 'button' && String(node.props['aria-label']).startsWith('노선 5,'))
      .props.onClick({ clientX: movedX, clientY: movedY, stopPropagation() {} });
    assert(saved);
    const moved = saved!.pieces[0];
    const movedReadout = moved.readout as GameReadout;
    assert.deepEqual(moved.placement, { areaId: 'map-area', ...recordSurfacePoint(movedX, movedY, 650, 440), rotation: 0 });
    assert.equal(movedReadout.values.route, '5: 포틀랜드–샌프란시스코');
    assert.equal(movedReadout.values.segment, movedSegment.index);

    let edited = moved;
    const detailFields = GameDetailFields({ pack, piece: moved, record: saved!, players, disabled: false, onPatch: change => { edited = { ...edited, ...change }; } });
    const ownerPicker = find(detailFields, node => node.type === ChipPick && node.props.label === '소유 플레이어');
    ownerPicker.props.onChange('p2');
    assert.equal((edited.readout as GameReadout).values.owner, 'p2', 'the existing detail editor can change route ownership');
    assert.equal((edited.readout as GameReadout).values.route, movedReadout.values.route);
    assert.equal((edited.readout as GameReadout).values.segment, movedReadout.values.segment);
    const ownerSummary = GameDetailReadout({ pack, piece: edited, players, compact: true });
    assert.equal(find(ownerSummary, node => node.type === 'strong' && node.props.children === '두 번째').props.children, '두 번째', 'the selected owner is visible by player name');
    saved = { ...saved!, pieces: saved!.pieces.map(candidate => candidate.id === edited.id ? edited : candidate) };
    const reopened = validateGenericRecord(saved as any, pack, 'map-area.scene', [], { playerIds: players.map(player => player.id) });
    assert.deepEqual(reopened.pieces[0].placement, edited.placement);
    assert.deepEqual(reopened.pieces[0].readout, edited.readout);
    assert.equal((reopened.pieces[0].readout as GameReadout).values.owner, 'p2');
    props.record = reopened;
    ui.render();
    const boardOwnerSummary = find(ui.tree, node => node.type === GameDetailReadout && node.props.piece?.id === edited.id);
    assert.deepEqual(boardOwnerSummary.props.players, players, 'board summaries receive session players after reopen');
    const resume = mount(GameBoardRecord, { ...props, record: reopened, onChange() {} });
    try { await new Promise(resolve => setImmediate(resolve)); resume.render(); const restored = find(resume.tree, node => node.type === 'button' && String(node.props.className).includes('gb-piece') && String(node.props.className).includes('placed')); assert.match(restored.props.style.left, /0\.\d+ \* \(100% - 80px\)/); }
    finally { resume.dispose(); }
  } finally {
    ui.dispose(); globalThis.fetch = originalFetch;
    if (hadWindow) (globalThis as any).window = originalWindow; else delete (globalThis as any).window;
  }
});
