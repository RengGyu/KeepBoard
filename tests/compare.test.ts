import test from 'node:test';
import assert from 'node:assert/strict';
import type { FieldDefinition, Value } from '../shared/types.ts';
import { compareStateValues } from '../server/compare.ts';

const board: FieldDefinition = { key: 'layout', label: 'Board', description: '', scope: 'public', type: 'json', acquisition: 'observe', group: 'board' };
const deck: FieldDefinition = { ...board, key: 'deck', group: 'cards' };

test('object keys are canonical and board component collections ignore listing order', () => {
  assert.equal(compareStateValues(deck, { red: 1, blue: { cards: 2, tokens: 3 } }, { blue: { tokens: 3, cards: 2 }, red: 1 }), true);
  const expected: Value = { pieces: [{ id: 'road-1', owner: 'red', position: [1, 2] }, { id: 'road-2', owner: 'blue', position: [3, 4] }] };
  const observed: Value = { pieces: [{ position: [3, 4], owner: 'blue', id: 'road-2' }, { position: [1, 2], id: 'road-1', owner: 'red' }] };
  assert.equal(compareStateValues(board, expected, observed), true);
  assert.equal(compareStateValues({ ...deck, key: 'board.layout' }, expected, observed), true);
});

test('position, owner, direction, attachment and identity changes remain differences', () => {
  const piece = { id: 'road-1', owner: 'red', position: [1, 2], direction: 'north', attachment: 'city-1' };
  const changes: Record<string, Value> = { id: 'road-2', owner: 'blue', position: [2, 1], direction: 'south', attachment: 'city-2' };
  for (const [key, value] of Object.entries(changes)) {
    assert.equal(compareStateValues(board, [piece], [{ ...piece, [key]: value }]), false, key);
  }
});

test('non-board arrays and board primitive arrays or coordinate tuples retain sequence', () => {
  assert.equal(compareStateValues(deck, [{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'a' }]), false);
  assert.equal(compareStateValues(deck, ['knight', 'victoryPoint'], ['victoryPoint', 'knight']), false);
  assert.equal(compareStateValues(board, [1, 2], [2, 1]), false);
  assert.equal(compareStateValues(board, [[1, 2], [3, 4]], [[3, 4], [1, 2]]), false);
});

test('unordered board collections preserve duplicate counts', () => {
  const red = { owner: 'red', position: [1, 2] };
  const blue = { owner: 'blue', position: [3, 4] };
  assert.equal(compareStateValues(board, [red, red, blue], [blue, red, red]), true);
  assert.equal(compareStateValues(board, [red, red, blue], [blue, blue, red]), false);
  assert.equal(compareStateValues(board, [red, red, blue], [red, blue]), false);
});
