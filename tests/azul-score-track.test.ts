import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { scoreForTrackSlot, scoreTrackValue } from '../src/azulScoreTrackModel.ts';

test('Azul score track preserves unknown and out-of-track values instead of moving them', () => {
  const range = { min: 0, max: 100 };
  assert.equal(scoreTrackValue(null, range), null);
  assert.equal(scoreTrackValue(0, range), 0);
  assert.equal(scoreTrackValue(100, range), 100);
  assert.equal(scoreTrackValue(101, range), null);
  assert.equal(scoreTrackValue(4.5, range), null);
  assert.equal(scoreForTrackSlot(37, range), 37);
  assert.equal(scoreForTrackSlot(-1, range), null);
});

test('generated Azul track binds all integer spaces to the existing player score field', async () => {
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/azul/board.json', import.meta.url), 'utf8'));
  const track = board.numericTracks.find((row: { id: string }) => row.id === 'score');
  assert.ok(track);
  assert.equal(track.field, 'score');
  assert.equal(track.scope, 'player');
  assert.deepEqual(track.slots.map((slot: { value: number }) => slot.value), Array.from({ length: 101 }, (_, i) => i));
});
