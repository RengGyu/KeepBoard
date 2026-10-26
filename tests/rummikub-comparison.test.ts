import test from 'node:test';
import assert from 'node:assert/strict';
import { compareStateValues } from '../server/compare.ts';
import type { FieldDefinition, Value } from '../shared/types.ts';

const field: FieldDefinition = { key: 'table.scene', label: '공용 묶음', description: '', scope: 'public', type: 'json', acquisition: 'observe', group: 'board' };
const board = (reverse = false, photo = 'old-photo'): Value => {
  const tiles = [{ id: `${photo}-a`, kind: 'number', color: 'red', number: 7, face: 'front', evidenceIds: [photo], region: { x: .1, y: .1, width: .1, height: .2 } }, { id: `${photo}-b`, kind: 'number', color: 'blue', number: 7, face: 'front', evidenceIds: [photo], region: null }];
  return { version: 'rummikub-classic-v1', ownerId: null, coverage: 'partial', groups: [{ id: `${photo}-group`, label: photo, tiles: reverse ? tiles.reverse() : tiles }], loose: [] };
};

test('Rummikub restoration detects tile reordering instead of sorting the group as Catan components', () => {
  assert.equal(compareStateValues(field, board(), board(true)), false);
});

test('Rummikub restoration ignores new-photo crop and generated IDs while comparing actual tile state', () => {
  assert.equal(compareStateValues(field, board(), board(false, 'new-photo')), true);
  const changed = board(false, 'new-photo') as any;
  changed.groups[0].tiles[0].number = 8;
  assert.equal(compareStateValues(field, board(), changed), false);
});
