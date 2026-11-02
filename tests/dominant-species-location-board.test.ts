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

test('Dominant Species dynamic Earth map saves free placement on earth.scene and restores it', async () => {
  const originalFetch = globalThis.fetch, hadWindow = Object.hasOwn(globalThis, 'window'), originalWindow = (globalThis as any).window;
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/dominant-species/board.json', import.meta.url), 'utf8'));
  const mapping = JSON.parse(await readFile(new URL('../public/game-art/boards/mapping.json', import.meta.url), 'utf8'));
  const piecesSvg = await readFile(new URL('../public/game-art/real-boards/dominant-species/pieces.svg', import.meta.url), 'utf8');
  const pack = catalogPacks.find(item => item.id === 'dominant-species')!;
  assert.equal(board.recordingMode, 'location-only');
  const earth = board.areas.find((candidate: any) => candidate.id === 'earth');
  assert.equal(earth.placement, 'location-only');
  assert.equal(earth.illustration.length, 7, 'the setup illustration retains the official one-center-plus-six-tundra map');
  const piece = { id: 'species-1', componentId: 'animals', variant: null, quantity: 1, label: '종 큐브', anchor: '', evidenceId: null, region: null };
  const record: GenericRecord = { version: 'game-component-record-v1', pieces: [piece] }; let saved: GenericRecord | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/board.json')) return new Response(JSON.stringify(board), { status: 200 });
    if (url.endsWith('/pieces.svg')) return new Response(piecesSvg, { status: 200 });
    if (url.endsWith('/mapping.json')) return new Response(JSON.stringify(mapping), { status: 200 });
    return new Response('', { status: 404 });
  }) as typeof fetch;
  (globalThis as any).window = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  const props = { pack, fieldKey: 'earth.scene', record, selected: piece.id, busy: false, onChange: (next: GenericRecord) => { saved = next; } };
  const ui = mount(GameBoardRecord, props);
  try {
    await loadRealAssets('dominant-species'); await new Promise(resolve => setImmediate(resolve)); ui.render();
    const map = find(ui.tree, node => node.type === 'div' && String(node.props.className).includes('gb-location-map'));
    assert.match(map.props['aria-label'], /위치 기록/);
    assert.equal(nodes(ui.tree).filter(node => node.type === 'button' && String(node.props.className).includes('gb-location-target')).length, 0, 'the expanding hex earth is placed freely rather than snapped to a fixed grid');
    map.props.onClick({ clientX: 210, clientY: 155, currentTarget: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 310 }) } });
    assert(saved);
    const placed = saved!.pieces[0], expected = recordSurfacePoint(210, 155, 420, 310);
    assert.deepEqual(placed.placement, { areaId: 'earth', ...expected, rotation: 0 });
    const validated = validateGenericRecord(saved as any, pack, 'earth.scene', []);
    assert.deepEqual(validated.pieces[0].placement, placed.placement);
    const reopened = mount(GameBoardRecord, { ...props, record: validated, onChange() {} });
    try {
      await new Promise(resolve => setImmediate(resolve)); reopened.render();
      const restored = find(reopened.tree, node => node.type === 'button' && String(node.props.className).includes('gb-piece') && String(node.props.className).includes('placed'));
      assert.match(restored.props.style.left, /0\.\d+ \* \(100% - 80px\)/);
      assert.match(restored.props.style.top, /0\.\d+ \* \(100% - 80px\)/);
    } finally { reopened.dispose(); }

    let trackSaved: GenericRecord | undefined;
    const trackProps = { pack, fieldKey: 'tracks.scene', record, selected: piece.id, busy: false, onChange: (next: GenericRecord) => { trackSaved = next; } };
    const trackUi = mount(GameBoardRecord, trackProps);
    try {
      await new Promise(resolve => setImmediate(resolve)); trackUi.render();
      const scoreSlot = find(trackUi.tree, node => node.type === 'button' && String(node.props.className).includes('gb-slot') && String(node.props['aria-label']).startsWith('동물 점수'));
      scoreSlot.props.onClick();
      assert(trackSaved);
      assert.equal(trackSaved!.pieces[0].placement?.areaId, 'tracks');
      const trackValidated = validateGenericRecord(trackSaved as any, pack, 'tracks.scene', []);
      const trackResume = mount(GameBoardRecord, { ...trackProps, record: trackValidated, onChange() {} });
      try {
        await new Promise(resolve => setImmediate(resolve)); trackResume.render();
        const restoredTrackPiece = find(trackResume.tree, node => node.type === 'button' && String(node.props.className).includes('gb-piece') && String(node.props.className).includes('placed'));
        assert.equal(restoredTrackPiece.props['aria-label'], '종 큐브, 1개');
      } finally { trackResume.dispose(); }
    } finally { trackUi.dispose(); }
  } finally {
    ui.dispose(); globalThis.fetch = originalFetch;
    if (hadWindow) (globalThis as any).window = originalWindow; else delete (globalThis as any).window;
  }
});
