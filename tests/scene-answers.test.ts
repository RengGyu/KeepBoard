import test from 'node:test';
import assert from 'node:assert/strict';
import { createComponent, type ComponentScene, type SceneComponent } from '../shared/scene.ts';
import { sceneAnswers } from '../shared/sceneFields.ts';

const empty: ComponentScene = { version: 1, coverage: 'partial', components: [] };
const fields = [{ key: 'board.layout', scope: 'public' as const }, { key: 'robber.hexAnchor', scope: 'public' as const }];
const robber = (extra: Partial<SceneComponent> = {}) => createComponent(empty, 'robber', { id: 'robber', quantity: 1, location: { type: 'hex', id: 'r3c3' }, evidenceId: 'photo', region: { x: .1, y: .2, width: .1, height: .1 }, ...extra });

test('public board save sends its unique exact robber anchor in the same answers transaction', () => {
  const value = { ...empty, components: [robber({ location: { type: 'hex', id: 'r2c2' } })] };
  const before = JSON.stringify(value);
  const answers = sceneAnswers('board.layout', value, undefined, fields);
  assert.equal(answers[0].value, value);
  assert.deepEqual(answers[1], { field: 'robber.hexAnchor', ownerId: undefined, value: 'r2c2' });
  assert.equal(JSON.stringify(value), before);
});

test('absent/duplicate/uncounted/unplaced robber clears stale separate fact without guessing a position', () => {
  for (const components of [[], [robber(), robber({ id: 'second', location: { type: 'hex', id: 'r2c2' } })], [robber({ quantity: null })], [robber({ quantity: 2 })], [robber({ location: { type: 'hex', id: null } })], [robber({ location: { type: 'unplaced', id: null } })], [robber({ quantity: 0 })]]) {
    const answers = sceneAnswers('board.layout', { ...empty, components }, undefined, fields);
    assert.equal(answers.length, 2);
    assert.equal(answers[1].value, null, JSON.stringify(components));
  }
});

test('personal scenes and packs without the separate public field are not synchronized', () => {
  const value = { ...empty, components: [robber()] };
  assert.equal(sceneAnswers('player.components.observed', value, 'red', fields).length, 1);
  assert.equal(sceneAnswers('board.layout', value, 'red', fields).length, 1);
  assert.equal(sceneAnswers('board.layout', value, undefined, fields.slice(0, 1)).length, 1);
  assert.equal(sceneAnswers('components.observed', value, undefined, fields).length, 1);
});
