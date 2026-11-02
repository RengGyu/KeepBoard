import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { register } from 'node:module';
import { readFile } from 'node:fs/promises';
import { catalogPacks } from '../gamepacks/catalog.ts';
import { validateGenericRecord, type GenericRecord } from '../shared/genericRecord.ts';
import { loadRealAssets } from '../src/realBoards.ts';
import { realAreasFor } from '../src/realBoards.ts';

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
  { gameId: 'space-base', fieldKey: 'market.scene', slotCount: 18, componentId: 'ships', label: 'shipyard card' },
  { gameId: 'space-base', fieldKey: 'tracks.scene', slotCount: 123, componentId: 'markers', label: 'track marker' },
  { gameId: 'space-base', fieldKey: 'roll.scene', slotCount: 2, componentId: 'dice', label: 'roll die' },
  { gameId: 'cascadia', fieldKey: 'offer.scene', slotCount: 8, componentId: 'habitat', label: 'habitat offer' },
  { gameId: 'cascadia', fieldKey: 'goals.scene', slotCount: 5, componentId: 'scoring', label: 'scoring goal' },
  { gameId: 'everdell', fieldKey: 'common.scene', slotCount: 16, componentId: 'cards', label: 'meadow card' },
  { gameId: 'everdell', fieldKey: 'city.scene', slotCount: 15, componentId: 'cards', label: 'city card' },
  { gameId: 'barrage', fieldKey: 'basin.scene', slotCount: 63, componentId: 'structures', label: 'dam structure' },
  { gameId: 'barrage', fieldKey: 'company.scene', slotCount: 19, componentId: 'structures', label: 'company stock structure' },
  { gameId: 'agricola', fieldKey: 'farm-area.scene', slotCount: 15, componentId: 'farm', label: 'farm tile' },
  { gameId: 'agricola', fieldKey: 'actions.scene', slotCount: 24, componentId: 'cards', label: 'round action card' },
  { gameId: 'ark-nova', fieldKey: 'action-row.scene', slotCount: 5, componentId: 'actions', label: 'action card' },
  { gameId: 'ark-nova', fieldKey: 'shared.scene', slotCount: 10, componentId: 'cards', label: 'shared display card', players: 4 },
  { gameId: 'ark-nova', fieldKey: 'shared.scene', slotCount: 9, componentId: 'cards', label: 'shared display card', players: 3 },
  { gameId: 'grand-austria-hotel', fieldKey: 'hotel.scene', slotCount: 20, componentId: 'rooms', label: 'hotel room' },
  { gameId: 'grand-austria-hotel', fieldKey: 'cafe.scene', slotCount: 3, componentId: 'guests', label: 'cafe guest' },
  { gameId: 'grand-austria-hotel', fieldKey: 'actions.scene', slotCount: 11, componentId: 'dice', label: 'action die' },
  { gameId: 'race-for-the-galaxy', fieldKey: 'actions.scene', slotCount: 7, componentId: 'cards', label: 'selected phase card' },
  { gameId: 'le-havre', fieldKey: 'harbor.scene', slotCount: 7, componentId: 'workers', label: 'supply ship' },
  { gameId: 'orleans', fieldKey: 'tracks.scene', slotCount: 18, componentId: 'events', label: 'round event tile' },
  { gameId: 'castles-burgundy', fieldKey: 'duchy.scene', slotCount: 37, componentId: 'hexes', label: 'duchy hex tile', players: 4 },
  { gameId: 'castles-burgundy', fieldKey: 'depots.scene', slotCount: 34, componentId: 'hexes', label: 'depot tile', players: 4 },
  { gameId: 'castles-mad-ludwig', fieldKey: 'market.scene', slotCount: 7, componentId: 'rooms', label: 'room market tile' },
  { gameId: 'through-the-ages', fieldKey: 'row.scene', slotCount: 13, componentId: 'cards', label: 'civilization row card' },
  { gameId: 'hansa-teutonica', fieldKey: 'skills.scene', slotCount: 23, componentId: 'board', label: 'ability marker' },
  { gameId: 'hansa-teutonica', fieldKey: 'tracks.scene', slotCount: 11, componentId: 'tradesmen', label: 'completed city marker' },
  { gameId: 'pandemic', fieldKey: 'status.scene', slotCount: 4, componentId: 'disease', label: 'cure marker' },
  { gameId: 'splendor-duel', fieldKey: 'market.scene', slotCount: 12, componentId: 'cards', label: 'market card' },
  { gameId: 'heat', fieldKey: 'circuit.scene', slotCount: 4, componentId: 'track', label: 'selected circuit' },
  { gameId: 'heat', fieldKey: 'player.scene', slotCount: 6, componentId: 'cars', label: 'player mat marker' },
  { gameId: 'pandemic-legacy-1', fieldKey: 'campaign.scene', slotCount: 12, componentId: 'record', label: 'campaign month marker' },
  { gameId: 'seti', fieldKey: 'public.scene', slotCount: 3, componentId: 'cards', label: 'face-up market card' },
  { gameId: 'apiary', fieldKey: 'actions.scene', slotCount: 34, componentId: 'tiles', label: 'confirmed 4–5 player action slot', players: 5 },
  { gameId: 'apiary', fieldKey: 'actions.scene', slotCount: 0, componentId: 'tiles', label: 'unverified 1–3 player action area', players: 3 },
  { gameId: 'marvel-champions', fieldKey: 'enemy.scene', slotCount: 1, componentId: 'identities', label: 'current villain identity' },
  { gameId: 'marvel-champions', fieldKey: 'hero.scene', slotCount: 1, componentId: 'identities', label: 'selected player hero identity' },
  { gameId: 'wyrmspan', fieldKey: 'caves.scene', slotCount: 15, componentId: 'cards', label: 'dragon or player-mat card position' },
  { gameId: 'wyrmspan', fieldKey: 'market.scene', slotCount: 6, componentId: 'cards', label: 'face-up cave/dragon market card' },
  { gameId: 'bohnanza', fieldKey: 'fields.scene', slotCount: 3, componentId: 'cards', label: 'top bean card on a field', players: 3 },
  { gameId: 'bohnanza', fieldKey: 'fields.scene', slotCount: 2, componentId: 'cards', label: 'top bean card on a field', players: 5 },
  { gameId: 'bohnanza', fieldKey: 'fields.scene', slotCount: 0, componentId: 'cards', label: 'unverified two-player field layout', players: 2 },
  { gameId: 'bohnanza', fieldKey: 'trade.scene', slotCount: 2, componentId: 'cards', label: 'revealed trade card' },
  { gameId: 'crew-deep-sea', fieldKey: 'trick.scene', slotCount: 3, componentId: 'cards', label: 'player card in trick', players: 3 },
  { gameId: 'crew-deep-sea', fieldKey: 'trick.scene', slotCount: 4, componentId: 'cards', label: 'player card in trick', players: 4 },
  { gameId: 'crew-deep-sea', fieldKey: 'trick.scene', slotCount: 5, componentId: 'cards', label: 'player card in trick', players: 5 },
  { gameId: 'crew-deep-sea', fieldKey: 'trick.scene', slotCount: 0, componentId: 'cards', label: 'unverified two-player trick layout', players: 2 },
  { gameId: 'crew-deep-sea', fieldKey: 'communication.scene', slotCount: 4, componentId: 'cards', label: 'public communication card', players: 5 },
  { gameId: 'crew-deep-sea', fieldKey: 'communication.scene', slotCount: 4, componentId: 'tokens', label: 'sonar position token', players: 5 },
  { gameId: 'crew-deep-sea', fieldKey: 'communication.scene', slotCount: 0, componentId: 'tokens', label: 'unverified two-player communication layout', players: 2 },
  { gameId: 'paleo', fieldKey: 'camp.scene', slotCount: 10, componentId: 'progress', label: 'victory marker' },
  { gameId: 'descent-legends-dark', fieldKey: 'hero.scene', slotCount: 3, componentId: 'cards', label: 'starting hero card' },
  { gameId: 'gaia-project', fieldKey: 'research.scene', slotCount: 15, componentId: 'tech', label: 'technology tile' },
  { gameId: 'age-of-innovation', fieldKey: 'player.scene', slotCount: 17, componentId: 'map', label: 'building inventory' },
  { gameId: 'age-of-innovation', fieldKey: 'round.scene', slotCount: 9, componentId: 'tiles', label: 'round tile' },
  { gameId: 'anachrony', fieldKey: 'timeline.scene', slotCount: 7, componentId: 'boards', label: 'timeline board' },
  { gameId: 'anachrony', fieldKey: 'player.scene', slotCount: 34, componentId: 'buildings', label: 'building tile' },
  { gameId: 'star-wars-outer-rim', fieldKey: 'market.scene', slotCount: 6, componentId: 'cards', label: 'market deck top' },
  { gameId: 'terra-mystica', fieldKey: 'faction.scene', slotCount: 20, componentId: 'buildings', label: 'building supply' },
  { gameId: 'terra-mystica', fieldKey: 'cults.scene', slotCount: 60, componentId: 'resources', label: 'cult track marker' },
  { gameId: 'dune-imperium-uprising', fieldKey: 'board.scene', slotCount: 43, componentId: 'resources', label: 'faction influence marker' },
  { gameId: 'dune-imperium-uprising', fieldKey: 'conflict.scene', slotCount: 12, componentId: 'troops', label: 'conflict troop' },
  { gameId: 'dune-imperium-uprising', fieldKey: 'display.scene', slotCount: 17, componentId: 'cards', label: 'Imperium row card' },
  { gameId: 'dune-imperium-uprising', fieldKey: 'hand.scene', slotCount: 5, componentId: 'cards', label: 'private hand card' },
  { gameId: 'istanbul', fieldKey: 'city.scene', slotCount: 16, componentId: 'places', label: 'Place tile', players: 2 },
  { gameId: 'istanbul', fieldKey: 'wheelbarrow.scene', slotCount: 6, componentId: 'goods', label: 'two-player ruby', players: 2 },
  { gameId: 'istanbul', fieldKey: 'wheelbarrow.scene', slotCount: 5, componentId: 'goods', label: 'three-player ruby', players: 3 },
  { gameId: 'just-one', fieldKey: 'writing.scene', slotCount: 2, componentId: 'boards', label: 'private clue easel', players: 3 },
  { gameId: 'just-one', fieldKey: 'writing.scene', slotCount: 1, componentId: 'boards', label: 'private clue easel', players: 5 },
  { gameId: 'just-one', fieldKey: 'clues.scene', slotCount: 4, componentId: 'boards', label: 'revealed clue easel', players: 3 },
  { gameId: 'just-one', fieldKey: 'clues.scene', slotCount: 6, componentId: 'boards', label: 'revealed clue easel', players: 4 },
  { gameId: 'just-one', fieldKey: 'clues.scene', slotCount: 4, componentId: 'boards', label: 'revealed clue easel', players: 5 },
  { gameId: 'just-one', fieldKey: 'clues.scene', slotCount: 5, componentId: 'boards', label: 'revealed clue easel', players: 6 },
  { gameId: 'just-one', fieldKey: 'clues.scene', slotCount: 6, componentId: 'boards', label: 'revealed clue easel', players: 7 }
];

test('additional confirmed tracks and setup slots persist through the existing record fields', async () => {
  const originalFetch = globalThis.fetch, hadWindow = Object.hasOwn(globalThis, 'window'), originalWindow = (globalThis as any).window;
  const mapping = JSON.parse(await readFile(new URL('../public/game-art/boards/mapping.json', import.meta.url), 'utf8'));
  const packs = new Map(catalogPacks.map(pack => [pack.id, pack]));
  const boards = new Map<string, any>(), pieces = new Map<string, string>();
  for (const item of cases) {
    if (!boards.has(item.gameId)) {
      boards.set(item.gameId, JSON.parse(await readFile(new URL(`../public/game-art/real-boards/${item.gameId}/board.json`, import.meta.url), 'utf8')));
      pieces.set(item.gameId, await readFile(new URL(`../public/game-art/real-boards/${item.gameId}/pieces.svg`, import.meta.url), 'utf8').catch(() => ''));
    }
    const board = boards.get(item.gameId);
    assert.equal(board.status, 'partial'); assert.equal(board.recordingMode, 'partial-slots');
    assert.equal(realAreasFor(board, item.fieldKey, item.players).flatMap(area => area.slots).length, item.slotCount, `${item.gameId}/${item.fieldKey} source slot count`);
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
      const piece = { id: `${item.gameId}-${item.fieldKey}-selected`, componentId: item.componentId, variant: null, quantity: 1, label: item.label, anchor: '', evidenceId: null, region: null };
      const record: GenericRecord = { version: 'game-component-record-v1', pieces: [piece] }; let saved: GenericRecord | undefined;
      const props = { players: item.players, pack, fieldKey: item.fieldKey, record, selected: piece.id, busy: false, onChange: (next: GenericRecord) => { saved = next; } };
      const ui = mount(GameBoardRecord, props);
      try {
        await new Promise(resolve => setImmediate(resolve)); ui.render();
        const slotButtons = nodes(ui.tree).filter(node => node.type === 'button' && String(node.props.className).includes('gb-slot'));
        assert.equal(slotButtons.length, item.slotCount, `${item.gameId}/${item.fieldKey} should expose only its verified slots`);
        if (item.slotCount === 0) continue;
        const compatibleSlot = slotButtons.find(node => !node.props.disabled);
        assert(compatibleSlot, `${item.gameId}/${item.fieldKey} should have a slot for ${item.componentId}`);
        compatibleSlot.props.onClick();
        assert(saved, `${item.gameId}/${item.fieldKey} should persist a placement`);
        const binding = pack.runtime!.fieldBindings!.find(candidate => candidate.key === item.fieldKey)!;
        assert.equal(saved!.pieces[0].placement?.areaId, binding.areaIds[0]);
        const validated = validateGenericRecord(saved as any, pack, item.fieldKey, []);
        assert.deepEqual(validated.pieces[0].placement, saved!.pieces[0].placement);
        const reopened = mount(GameBoardRecord, { ...props, record: validated, onChange() {} });
        try {
          await new Promise(resolve => setImmediate(resolve)); reopened.render();
          const filled = find(reopened.tree, node => node.type === 'button' && String(node.props.className).includes('gb-slot') && String(node.props.className).includes('filled'));
          assert.match(String(filled.props['aria-label']), new RegExp(item.label));
        } finally { reopened.dispose(); }
      } finally { ui.dispose(); }
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (hadWindow) (globalThis as any).window = originalWindow; else delete (globalThis as any).window;
  }
});

test('Apiary exposes only the verified 4–5 player action board, not those slots for 1–3 players', async () => {
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/apiary/board.json', import.meta.url), 'utf8'));
  assert.equal(board.status, 'partial');
  assert.equal(board.recordingMode, 'partial-slots');
  const areaIds = ['advance', 'explore', 'carve'];
  const expected = { advance: 9, explore: 16, carve: 9 };
  for (const players of [1, 2, 3]) {
    const hidden = new Set(board.playerCount[String(players)].hideAreas);
    assert.deepEqual([...hidden].sort(), [...areaIds].sort());
    assert.equal(board.areas.filter((area: any) => areaIds.includes(area.id) && !hidden.has(area.id)).flatMap((area: any) => area.slots).length, 0);
    assert.deepEqual(realAreasFor(board, 'actions.scene', players).filter(area => areaIds.includes(area.id)), [], `${players} players must not see the unverified 4–5 player action board`);
  }
  for (const [areaId, count] of Object.entries(expected)) {
    const area = board.areas.find((candidate: any) => candidate.id === areaId);
    assert.equal(area.slots.length, count, `${areaId} should preserve the official 4–5 player layout`);
    assert.equal(area.field, 'actions.scene');
    assert.deepEqual(area.accepts, ['tiles']);
  }
  assert.equal(areaIds.reduce((sum, id) => sum + board.areas.find((area: any) => area.id === id).slots.length, 0), 34);
});

test('Outer Rim exposes its six verified market deck tops without inventing faction-track marker positions', async () => {
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/star-wars-outer-rim/board.json', import.meta.url), 'utf8'));
  assert.equal(board.status, 'partial');
  assert.equal(board.recordingMode, 'partial-slots');
  assert.equal(realAreasFor(board, 'market.scene').flatMap(area => area.slots).length, 6);
  assert.equal(realAreasFor(board, 'ship.scene').flatMap(area => area.slots).length, 0);
});

test('Terra Mystica keeps overlapping cult-track capacity distinct from one-place level ten and priest positions', async () => {
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/terra-mystica/board.json', import.meta.url), 'utf8'));
  assert.equal(board.status, 'partial');
  assert.equal(board.recordingMode, 'partial-slots');
  for (const cult of ['fire', 'water', 'earth', 'air']) {
    const track = board.areas.find((area: any) => area.id === `cult-${cult}`);
    assert.equal(track.slots.length, 11);
    assert(track.slots.slice(0, 10).every((slot: any) => slot.capacity === 5));
    assert.equal(track.slots[10].capacity, 1);
    const priests = board.areas.find((area: any) => area.id === `priests-${cult}`);
    assert.equal(priests.slots.length, 4);
    assert(priests.slots.every((slot: any) => slot.capacity === 1));
  }
});

test('Dune Imperium: Uprising retains four-player shared track capacity and the fixed private/public card rows', async () => {
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/dune-imperium-uprising/board.json', import.meta.url), 'utf8'));
  assert.equal(board.status, 'partial');
  assert.equal(board.recordingMode, 'partial-slots');
  for (const track of board.areas.filter((area: any) => area.id.startsWith('faction-'))) {
    assert.equal(track.slots.length, 7);
    assert(track.slots.every((slot: any) => slot.capacity === 4));
  }
  const score = board.areas.find((area: any) => area.id === 'score-track');
  assert.equal(score.slots.length, 11);
  assert(score.slots.every((slot: any) => slot.capacity === 4));
  assert.equal(realAreasFor(board, 'display.scene').flatMap(area => area.slots).length, 17);
  assert.equal(realAreasFor(board, 'hand.scene').flatMap(area => area.slots).length, 5);
});

test('Istanbul exposes the 16-place base grid and player-count-correct ruby spaces, leaving extension-dependent goods tracks unpinned', async () => {
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/istanbul/board.json', import.meta.url), 'utf8'));
  assert.equal(board.status, 'partial');
  assert.equal(board.recordingMode, 'partial-slots');
  assert.equal(realAreasFor(board, 'city.scene', 2).flatMap(area => area.slots).length, 16);
  assert.equal(realAreasFor(board, 'wheelbarrow.scene', 2).flatMap(area => area.slots).length, 6);
  for (const players of [3, 4, 5]) assert.equal(realAreasFor(board, 'wheelbarrow.scene', players).flatMap(area => area.slots).length, 5);
  assert.equal(board.areas.filter((area: any) => area.id.startsWith('goods-')).flatMap((area: any) => area.slots).length, 0);
});

test('Just One persists the personal and public easel positions within their original field scopes', async () => {
  const pack = catalogPacks.find(candidate => candidate.id === 'just-one')!;
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/just-one/board.json', import.meta.url), 'utf8'));
  assert.equal(board.status, 'partial');
  assert.equal(board.recordingMode, 'partial-slots');
  const personal = pack.runtime!.fieldBindings!.find(binding => binding.key === 'writing.scene')!;
  const publicClues = pack.runtime!.fieldBindings!.find(binding => binding.key === 'clues.scene')!;
  assert.equal(personal.scope, 'player');
  assert.equal(publicClues.scope, 'public');
  assert.deepEqual([3, 4, 5, 6, 7].map(players => realAreasFor(board, 'writing.scene', players).flatMap(area => area.slots).length), [2, 2, 1, 1, 1]);
  assert.deepEqual([3, 4, 5, 6, 7].map(players => realAreasFor(board, 'clues.scene', players).flatMap(area => area.slots).length), [4, 6, 4, 5, 6]);
});

test('Seven Wonders Duel selects and saves the matching age layout without reinterpreting placements', async () => {
  const originalFetch = globalThis.fetch;
  const mapping = JSON.parse(await readFile(new URL('../public/game-art/boards/mapping.json', import.meta.url), 'utf8'));
  const directory = '../public/game-art/real-boards/seven-wonders-duel/';
  const boardFiles = new Map<string, any>();
  for (const name of ['board.json', 'variants/board-age-2.json', 'variants/board-age-3.json']) {
    boardFiles.set(name, JSON.parse(await readFile(new URL(directory + name, import.meta.url), 'utf8')));
  }
  const symbols = await readFile(new URL(directory + 'pieces.svg', import.meta.url), 'utf8');
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/game-art/boards/mapping.json')) return new Response(JSON.stringify(mapping), { status: 200 });
    const match = url.match(/\/game-art\/real-boards\/seven-wonders-duel\/(board\.json|variants\/board-age-[23]\.json|pieces\.svg)$/);
    if (!match) return new Response('', { status: 404 });
    if (match[1] === 'pieces.svg') return new Response(symbols, { status: 200 });
    return new Response(JSON.stringify(boardFiles.get(match[1])), { status: 200 });
  }) as typeof fetch;
  try {
    const pack = catalogPacks.find(candidate => candidate.id === 'seven-wonders-duel')!;
    const ageTwo = await loadRealAssets('seven-wonders-duel', 'age-2');
    assert.equal(ageTwo?.board.variant, 'age-2');
    assert.equal(ageTwo?.variantSelector?.field, 'age');
    assert.equal(realAreasFor(ageTwo!.board, 'structure.scene').flatMap(area => area.slots).length, 20);

    const piece = { id: 'age-two-card', componentId: 'cards', variant: null, quantity: 1, label: '시대 카드', anchor: '', evidenceId: null, region: null };
    const record: GenericRecord = { version: 'game-component-record-v1', pieces: [piece] };
    let saved: GenericRecord | undefined;
    let requestedLayout = '';
    const props = { pack, fieldKey: 'structure.scene', record, selected: piece.id, busy: false, layoutVariant: 'age-2', onLayoutVariantChange: (next: string) => { requestedLayout = next; }, onChange: (next: GenericRecord) => { saved = next; } };
    const ui = mount(GameBoardRecord, props);
    try {
      await new Promise(resolve => setImmediate(resolve)); ui.render();
      const selector = find(ui.tree, node => node.type === 'select' && node.props['aria-label'] === '판 구성');
      assert.equal(selector.props.value, 'age-2');
      selector.props.onChange({ target: { value: 'age-3' } });
      assert.equal(requestedLayout, 'age-3');
      const slots = nodes(ui.tree).filter(node => node.type === 'button' && String(node.props.className).includes('gb-slot'));
      assert.equal(slots.length, 20);
      const empty = slots.find(node => !String(node.props.className).includes('filled') && !node.props.disabled);
      assert(empty, 'age II should expose an available card position');
      empty.props.onClick();
      assert.equal(saved?.pieces[0].placement?.layoutVariant, 'age-2');
      const validated = validateGenericRecord(saved as any, pack, 'structure.scene', []);
      assert.equal(validated.pieces[0].placement?.layoutVariant, 'age-2');

      const otherAge = mount(GameBoardRecord, { ...props, record: validated, layoutVariant: 'age-3', onChange() {} });
      try {
        await new Promise(resolve => setImmediate(resolve)); otherAge.render();
        const ageThreeSlots = nodes(otherAge.tree).filter(node => node.type === 'button' && String(node.props.className).includes('gb-slot'));
        assert.equal(ageThreeSlots.length, 20);
        assert.equal(ageThreeSlots.filter(node => String(node.props.className).includes('filled')).length, 0);
        find(otherAge.tree, node => node.type === 'div' && node.props['aria-label'] === '미배치 구성물');
        const preservedTrayPiece = find(otherAge.tree, node => node.type === 'button' && String(node.props.className).includes('gb-piece'));
        assert.equal(preservedTrayPiece.props['aria-label'], '시대 카드, 1개');
        assert(!String(preservedTrayPiece.props.className).includes('placed'));
      } finally { otherAge.dispose(); }

      const reopened = mount(GameBoardRecord, { ...props, record: validated, layoutVariant: 'age-2', onChange() {} });
      try {
        await new Promise(resolve => setImmediate(resolve)); reopened.render();
        const reopenedSlots = nodes(reopened.tree).filter(node => node.type === 'button' && String(node.props.className).includes('gb-slot'));
        assert.equal(reopenedSlots.filter(node => String(node.props.className).includes('filled')).length, 1);
      } finally { reopened.dispose(); }
    } finally { ui.dispose(); }
  } finally { globalThis.fetch = originalFetch; }
});
