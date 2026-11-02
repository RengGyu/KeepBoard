import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadRealAssets, realAreasFor, realSlotAccepts } from '../src/realBoards.ts';

test('Calico serves its complete 22-hex quilt and three distinct goal spaces to the real-board consumer', async () => {
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/calico/board.json', import.meta.url), 'utf8'));
  const patchArea = board.areas.find((area: any) => area.id === 'patch-cells');
  const goalArea = board.areas.find((area: any) => area.id === 'design-goals');
  assert.equal(board.status, 'complete');
  assert.equal(patchArea.slots.length, 22);
  assert.equal(goalArea.slots.length, 3);
  assert([...patchArea.slots, ...goalArea.slots].every((slot: any) => slot.shape === 'hex'));
  assert.equal(new Set([...patchArea.slots, ...goalArea.slots].map((slot: any) => slot.id)).size, 25);

  const savedFetch = globalThis.fetch;
  const svg = await readFile(new URL('../public/game-art/real-boards/calico/board.svg', import.meta.url), 'utf8');
  const pieces = await readFile(new URL('../public/game-art/real-boards/calico/pieces.svg', import.meta.url), 'utf8');
  globalThis.fetch = (async (input: RequestInfo | URL) => String(input).endsWith('/board.json')
    ? new Response(JSON.stringify(board), { status: 200 })
    : new Response(pieces, { status: 200 })) as typeof fetch;
  try {
    const assets = await loadRealAssets('calico');
    assert.equal(assets?.board.status, 'complete');
    assert.equal(realAreasFor(assets!.board, 'quilt.scene').length, 3);
    assert.equal(realSlotAccepts(patchArea.accepts, 'patches'), true);
    assert.equal(realSlotAccepts(patchArea.accepts, 'boards'), false);
    assert.equal(realSlotAccepts(goalArea.accepts, 'boards'), true);
    assert.equal(realSlotAccepts(goalArea.accepts, 'patches'), false);
    assert.equal(realSlotAccepts(goalArea.accepts, null), false);
  } finally {
    globalThis.fetch = savedFetch;
  }
});
