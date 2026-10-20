import test from 'node:test';
import assert from 'node:assert/strict';
import { CATAN_TOPOLOGY, createComponent, normalizeScene, resolveSlotId, type ComponentScene, type SceneComponent, type SceneKind, type SceneLocation } from '../shared/scene.ts';
import { changeSceneComponentKind, moveSceneComponent, sameSceneLocation, slotOccupants } from '../shared/sceneMoves.ts';

const empty: ComponentScene = { version: 1, coverage: 'partial', components: [] };
const edge = (index: number): SceneLocation => ({ type: 'edge', id: CATAN_TOPOLOGY.edges[index].id });
const vertex = (index: number): SceneLocation => ({ type: 'vertex', id: CATAN_TOPOLOGY.vertices[index].id });
const hex = (index: number): SceneLocation => ({ type: 'hex', id: CATAN_TOPOLOGY.hexes[index].id });
const unplaced: SceneLocation = { type: 'unplaced', id: null };
function piece(id: string, kind: SceneKind, location: SceneLocation, extra: Partial<SceneComponent> = {}): SceneComponent {
  return createComponent(empty, kind, { id, location, quantity: 1, ownerId: 'red', evidenceId: `photo-${id}`, region: { x: .1, y: .2, width: .1, height: .1 }, ...extra });
}
function scene(...components: SceneComponent[]): ComponentScene { return { ...empty, components }; }
function byId(value: ComponentScene, id: string) { return value.components.find(component => component.id === id)!; }

test('occupied roads exchange only their locations in one immutable transaction', () => {
  const a = piece('red-road', 'road', edge(0), { face: 'front', direction: 25, attachedToId: 'marker', note: 'original note' });
  const b = piece('blue-road', 'road', edge(1), { ownerId: 'blue' });
  const marker = piece('marker', 'token', hex(0));
  const before = scene(a, b, marker);
  const frozen = JSON.stringify(before);
  const result = moveSceneComponent(before, a.id, b.location);
  assert.equal(result.status, 'swapped');
  assert.deepEqual(result.changedIds, [a.id, b.id]);
  assert.deepEqual(byId(result.scene, a.id), { ...a, location: b.location });
  assert.deepEqual(byId(result.scene, b.id), { ...b, location: a.location });
  assert.equal(byId(result.scene, marker.id), marker);
  assert.equal(JSON.stringify(before), frozen, 'undo retains the complete prior state');
  const undone = [before, result.scene].slice(0, -1).at(-1)!;
  assert.equal(undone, before, 'the swap is one history entry');
});

test('a settlement exchanges with a city, regardless of ownership, without upgrading or deleting either', () => {
  const a = piece('village', 'settlement', vertex(0));
  const b = piece('city', 'city', vertex(3), { ownerId: 'blue' });
  const result = moveSceneComponent(scene(a, b), a.id, b.location);
  assert.equal(result.status, 'swapped');
  assert.deepEqual(result.scene.components.map(component => [component.id, component.kind, component.ownerId, component.location]), [[a.id, 'settlement', 'red', b.location], [b.id, 'city', 'blue', a.location]]);
});

test('terrain move separates its known inline number and leaves both number representations and robber at original slots', () => {
  const a = piece('forest', 'terrain', hex(0), { variant: 'forest', number: 6 });
  const b = piece('desert', 'terrain', hex(1), { variant: 'desert' });
  const number = piece('token', 'number-token', hex(1), { number: 8 });
  const robber = piece('robber', 'robber', hex(0));
  const result = moveSceneComponent(scene(a, b, number, robber), a.id, b.location);
  assert.equal(result.status, 'swapped');
  const { number: inlineNumber, ...tileWithoutNumber } = a;
  assert.equal(inlineNumber, 6);
  assert.deepEqual(byId(result.scene, a.id), { ...tileWithoutNumber, location: b.location });
  const separated = result.scene.components.find(component => component.kind === 'number-token' && component.id !== number.id)!;
  assert.equal(separated.number, 6);
  assert.deepEqual(separated.location, a.location);
  assert.equal(separated.evidenceId, a.evidenceId);
  assert.equal(separated.region, null);
  assert.equal(byId(result.scene, number.id), number);
  assert.equal(byId(result.scene, robber.id), robber);
  const onlyNumber = moveSceneComponent(result.scene, number.id, hex(0));
  assert.equal(onlyNumber.status, 'swapped', 'the independently recorded numbers exchange without moving terrain or robber');
});

test('two independent number tokens exchange without changing their terrain', () => {
  const terrain = piece('terrain', 'terrain', hex(0));
  const a = piece('a', 'number-token', hex(0), { number: 6 });
  const b = piece('b', 'number-token', hex(1), { number: 8 });
  const result = moveSceneComponent(scene(terrain, a, b), a.id, b.location);
  assert.equal(result.status, 'swapped');
  assert.equal(byId(result.scene, terrain.id), terrain);
  assert.equal(byId(result.scene, a.id).number, 6);
  assert.equal(byId(result.scene, b.id).number, 8);
});

test('canonical aliases at the same slot are no-op and never create an undo entry', () => {
  const id = resolveSlotId('edge', 'r3c3.NE')!;
  const source = piece('road', 'road', { type: 'edge', id });
  const value = scene(source);
  assert.ok(sameSceneLocation(source.location, { type: 'edge', id: 'r2c3.SW' }));
  const result = moveSceneComponent(value, source.id, { type: 'edge', id: 'r2c3.SW' });
  assert.equal(result.status, 'noop');
  assert.equal(result.scene, value);
  assert.deepEqual(result.changedIds, []);
});

test('a counted pile splits one onto an empty slot, conserving quantity and source metadata', () => {
  const pile = piece('pile', 'road', { type: 'area', id: 'supply' }, { quantity: 4, variant: 'custom', number: 3, direction: 45, face: 'back', note: 'counted together' });
  const result = moveSceneComponent(scene(pile), pile.id, edge(0));
  assert.equal(result.status, 'split');
  assert.equal(byId(result.scene, pile.id).quantity, 3);
  const child = result.scene.components.find(component => component.id !== pile.id)!;
  assert.deepEqual(child, { ...pile, id: child.id, location: edge(0), quantity: 1 });
  assert.equal(result.selectedId, child.id);
  assert.equal(result.scene.components.reduce((sum, component) => sum + component.quantity!, 0), 4);
});

test('zero and unknown supplies cannot create board pieces; one piece retains its id', () => {
  for (const quantity of [0, null]) {
    const pile = piece('pile', 'road', unplaced, { quantity });
    const before = scene(pile);
    const result = moveSceneComponent(before, pile.id, edge(0));
    assert.equal(result.status, 'rejected');
    assert.equal(result.scene, before);
    assert.deepEqual(result.changedIds, []);
  }
  const one = piece('one', 'road', unplaced);
  const result = moveSceneComponent(scene(one), one.id, edge(0));
  assert.equal(result.status, 'moved');
  assert.equal(result.scene.components.length, 1);
  assert.equal(result.scene.components[0].id, one.id);
});

test('unplaced/new/pile entries reject occupied destinations without losing the occupant or any count', () => {
  for (const quantity of [1, 5, null]) {
    const source = piece('source', 'settlement', unplaced, { quantity });
    const occupant = piece('occupant', 'city', vertex(0));
    const value = scene(source, occupant);
    const result = moveSceneComponent(value, source.id, occupant.location);
    assert.equal(result.status, 'rejected');
    assert.equal(result.scene, value);
    assert.match(result.message, /먼저.*보드 밖/);
  }
});

test('ambiguous source/destination or counted occupied slot refuses to choose a hidden occupant', () => {
  const a = piece('a', 'road', edge(0));
  for (const others of [[piece('b', 'road', edge(1)), piece('c', 'road', edge(1))], [piece('pile', 'road', edge(1), { quantity: 2 })], [piece('peer', 'road', edge(0))]]) {
    const value = scene(a, ...others);
    const result = moveSceneComponent(value, a.id, edge(1));
    assert.equal(result.status, 'rejected');
    assert.equal(result.scene, value);
    assert.match(result.message, /여러/);
  }
  const bad = scene(a, piece('peer', 'road', edge(0)));
  assert.equal(moveSceneComponent(bad, a.id, unplaced).status, 'moved', 'explicit off-board removal can repair duplicate records');
});

test('movement rejects incompatible/missing targets and does not treat zero entries or decorative markers as occupants', () => {
  const a = piece('a', 'road', edge(0));
  const before = scene(a, piece('zero', 'road', edge(1), { quantity: 0 }), piece('note', 'unknown', edge(1)));
  assert.equal(slotOccupants(before, a, edge(1)).length, 0);
  assert.equal(moveSceneComponent(before, a.id, edge(1)).status, 'moved');
  assert.equal(moveSceneComponent(before, a.id, hex(0)).status, 'rejected');
  assert.equal(moveSceneComponent(before, a.id, { type: 'edge', id: 'bad' }).status, 'rejected');
  assert.equal(moveSceneComponent(before, 'missing', edge(1)).status, 'rejected');
  assert.deepEqual(normalizeScene(before), before);
});

test('kind edits share the building occupancy invariant and never replace another component', () => {
  const village = piece('village', 'settlement', vertex(0));
  const marker = piece('marker', 'unknown', vertex(0));
  const before = scene(village, marker);
  const blocked = changeSceneComponentKind(before, marker.id, 'city');
  assert.equal(blocked.status, 'rejected');
  assert.equal(blocked.scene, before);
  const upgrade = changeSceneComponentKind(scene(village), village.id, 'city');
  assert.equal(upgrade.status, 'updated');
  assert.deepEqual(upgrade.scene.components[0], { ...village, kind: 'city' });
  const incompatible = changeSceneComponentKind(scene(village), village.id, 'road');
  assert.deepEqual(incompatible.scene.components[0].location, { type: 'edge', id: null });
  assert.equal(incompatible.scene.components[0].evidenceId, village.evidenceId);
});
