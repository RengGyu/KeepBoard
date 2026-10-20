import test from 'node:test';
import assert from 'node:assert/strict';
import { createComponent, type ComponentScene } from '../shared/scene';
import { editSceneSelection } from '../shared/sceneEditing';

function fixture(): ComponentScene {
  const scene: ComponentScene = { version: 2, coverage: 'partial', components: [] };
  scene.components = [
    createComponent(scene, 'road', { id: 'r', ownerId: 'red', quantity: 7, evidenceId: 'photo', note: '묶음' }),
    createComponent(scene, 'settlement', { id: 's', ownerId: 'red', quantity: 1 }),
    createComponent(scene, 'terrain', { id: 't', variant: 'forest', quantity: 1 }),
    createComponent(scene, 'token', { id: 'attached', attachedToId: 'r', quantity: 1 }),
  ];
  return scene;
}

test('batch color edits preserve quantities, source, unrelated pieces and the undo snapshot', () => {
  const before = fixture(), original = structuredClone(before);
  const after = editSceneSelection(before, ['r', 's', 'stale'], { ownerId: 'blue' });
  assert.deepEqual(after.components.map(c => c.ownerId), ['blue', 'blue', null, null]);
  assert.equal(after.components[0].quantity, 7);
  assert.equal(after.components[0].evidenceId, 'photo');
  assert.equal(after.components[0].note, '묶음');
  assert.deepEqual(before, original);
});

test('mixed kinds cannot accidentally acquire an owner through a batch edit', () => {
  const before = fixture();
  assert.equal(editSceneSelection(before, ['r', 't'], { ownerId: 'blue' }), before);
});

test('batch deletion clears only references to deleted pieces and leaves undo intact', () => {
  const before = fixture(), original = structuredClone(before);
  const after = editSceneSelection(before, ['r', 's', 'r'], 'delete');
  assert.deepEqual(after.components.map(c => c.id), ['t', 'attached']);
  assert.equal(after.components[1].attachedToId, null);
  assert.deepEqual(before, original);
  assert.equal(editSceneSelection(before, ['missing'], 'delete'), before);
});
