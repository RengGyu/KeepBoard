import test from 'node:test';
import assert from 'node:assert/strict';
import { CATAN_TOPOLOGY, createComponent, type ComponentScene, type SceneComponent, type SceneKind, type SceneLocation } from '../shared/scene.ts';
import { inspectCatanPlacement } from '../shared/catanPlacement.ts';
import { changeSceneComponentKind, moveSceneComponent, slotOccupants } from '../shared/sceneMoves.ts';

const empty: ComponentScene = { version: 1, coverage: 'partial', components: [] };
const loc = (type: SceneLocation['type'], id: string | null): SceneLocation => ({ type, id });
const unplaced = loc('unplaced', null);
const h = (index: number) => loc('hex', CATAN_TOPOLOGY.hexes[index].id);
function c(id: string, kind: SceneKind, location: SceneLocation, extra: Partial<SceneComponent> = {}): SceneComponent {
  return createComponent(empty, kind, { id, quantity: 1, ownerId: 'red', location, ...extra });
}
const scene = (...components: SceneComponent[]): ComponentScene => ({ ...empty, components });
const neighbors = (vertexId: string) => CATAN_TOPOLOGY.byId.vertex.get(vertexId)!.edgeIds.map(id => CATAN_TOPOLOGY.byId.edge.get(id)!.vertexIds.find(other => other !== vertexId)!);
const first = CATAN_TOPOLOGY.vertices.find(vertex => vertex.edgeIds.length === 2)!;
const adjacent = neighbors(first.id)[0];
const distanceTwo = neighbors(adjacent).find(id => id !== first.id && !neighbors(first.id).includes(id))!;
const far = CATAN_TOPOLOGY.vertices.find(vertex => vertex.id !== adjacent && vertex.id !== first.id && !neighbors(adjacent).includes(vertex.id))!;

test('new buildings adjacent to a known building are blocked regardless of owner/kind; correction is explicitly recordable', () => {
  for (const kind of ['settlement', 'city'] as const) {
    const existing = c('existing', 'city', loc('vertex', first.id), { ownerId: 'blue' });
    const incoming = c('new', kind, unplaced);
    const before = scene(existing, incoming);
    const result = moveSceneComponent(before, incoming.id, loc('vertex', adjacent));
    assert.equal(result.status, 'rejected');
    assert.equal(result.canRecordOriginal, true);
    assert.equal(result.scene, before, 'failed placement changes no quantity or record');
    const recorded = moveSceneComponent(before, incoming.id, loc('vertex', adjacent), { intent: 'correct' });
    assert.equal(recorded.status, 'moved');
    assert.ok(inspectCatanPlacement(recorded.scene).some(issue => issue.code === 'building-distance'));
    const moved = moveSceneComponent(scene(existing, { ...incoming, location: loc('vertex', far.id) }), incoming.id, loc('vertex', adjacent));
    assert.equal(moved.status, 'moved', 'known board pieces are record corrections by default');
  }
});

test('two-edge spacing and coastal vertices are accepted without requiring three neighbors', () => {
  assert.equal(first.edgeIds.length, 2);
  const before = scene(c('existing', 'settlement', loc('vertex', first.id)), c('new', 'settlement', unplaced, { ownerId: 'blue' }));
  const result = moveSceneComponent(before, 'new', loc('vertex', distanceTwo));
  assert.equal(result.status, 'moved');
  assert.equal(inspectCatanPlacement(result.scene).some(issue => issue.code === 'building-distance'), false);
});

test('rule-blocked counted supply preserves every quantity until original recording is explicitly requested', () => {
  const value = scene(c('existing', 'settlement', loc('vertex', first.id)), c('pile', 'settlement', loc('area', 'supply'), { quantity: 4 }));
  const blocked = moveSceneComponent(value, 'pile', loc('vertex', adjacent));
  assert.equal(blocked.status, 'rejected');
  assert.equal(blocked.scene, value);
  assert.equal(blocked.scene.components[1].quantity, 4);
  const recorded = moveSceneComponent(value, 'pile', loc('vertex', adjacent), { intent: 'correct' });
  assert.equal(recorded.status, 'split');
  assert.equal(recorded.scene.components.reduce((sum, component) => sum + component.quantity!, 0), 5);
});

test('new number on confirmed desert blocks, but original correction preserves it and zero quantities cannot bypass', () => {
  const desert = c('desert', 'terrain', h(0), { variant: 'desert' });
  const token = c('number', 'number-token', unplaced, { number: null });
  const before = scene(desert, token);
  assert.equal(moveSceneComponent(before, token.id, h(0)).canRecordOriginal, true, 'the token presence is certain even if its number is unreadable');
  const recorded = moveSceneComponent(before, token.id, h(0), { intent: 'correct' });
  assert.equal(recorded.status, 'moved');
  assert.ok(inspectCatanPlacement(recorded.scene).some(issue => issue.code === 'desert-number'));
  assert.equal(moveSceneComponent(scene(desert, { ...token, quantity: 0 }), token.id, h(0), { intent: 'correct' }).status, 'rejected');
  const fixed = moveSceneComponent(recorded.scene, token.id, h(1));
  assert.equal(fixed.status, 'moved');
  assert.equal(inspectCatanPlacement(fixed.scene).some(issue => issue.code === 'desert-number'), false, 'warnings recompute from final scene');
});

test('second board robber is blocked for new placement, while an observed original and normal robber movement remain recordable', () => {
  const before = scene(c('first', 'robber', h(0)), c('second', 'robber', unplaced));
  const blocked = moveSceneComponent(before, 'second', h(1));
  assert.equal(blocked.status, 'rejected');
  assert.equal(blocked.canRecordOriginal, true);
  assert.equal(moveSceneComponent(before, 'second', h(1), { intent: 'correct' }).status, 'moved');
  const ordinary = scene(c('robber', 'robber', h(0)), c('field', 'terrain', h(1), { variant: 'fields' }), c('number', 'number-token', h(1), { number: 8 }));
  const moved = moveSceneComponent(ordinary, 'robber', h(1));
  assert.equal(moved.status, 'moved');
  assert.equal(moved.scene.components.length, 3);
  assert.equal(inspectCatanPlacement(moved.scene).some(issue => issue.code === 'robber-count' || issue.code === 'desert-number'), false);
  assert.equal(moveSceneComponent(moved.scene, 'robber', h(1)).status, 'noop');
});

test('terrain swaps detach both inline numbers at original hexes with source id but no fabricated independent crop', () => {
  const crop = { x: .1, y: .2, width: .3, height: .4 };
  const a = c('a', 'terrain', h(0), { variant: 'forest', number: 6, region: crop, evidenceId: 'photo-a', note: 'tile note' });
  const b = c('b', 'terrain', h(1), { variant: 'desert', number: 8, evidenceId: 'photo-b' });
  const robber = c('robber', 'robber', h(0));
  const before = scene(a, b, robber);
  const beforeJson = JSON.stringify(before);
  const result = moveSceneComponent(before, 'a', h(1));
  assert.equal(result.status, 'swapped');
  assert.equal(result.scene.components.length, 5);
  const [nextA, nextB, nextRobber] = result.scene.components;
  assert.equal(nextA.number, undefined);
  assert.equal(nextB.number, undefined);
  assert.deepEqual(nextA.region, crop);
  assert.equal(nextA.evidenceId, 'photo-a');
  assert.equal(nextRobber, robber);
  const numbers = result.scene.components.filter(component => component.kind === 'number-token');
  assert.deepEqual(numbers.map(component => [component.number, component.location, component.evidenceId, component.region]), [[6, a.location, 'photo-a', null], [8, b.location, 'photo-b', null]]);
  assert.equal(new Set(result.changedIds).size, 4, 'separation and swap are a single complete result');
  assert.equal(JSON.stringify(before), beforeJson, 'one undo can restore original inline representation and positions');
  assert.ok(inspectCatanPlacement(result.scene).some(issue => issue.code === 'desert-number'), 'desert number is preserved as a warning');
});

test('terrain same-slot no-op/null/unset values invent no tokens; existing mixed representations stop auto move even when equal', () => {
  for (const number of [null, undefined]) {
    const a = c('a', 'terrain', h(0), { number });
    const b = c('b', 'terrain', h(1));
    const before = scene(a, b);
    assert.equal(moveSceneComponent(before, a.id, h(0)).scene, before);
    assert.equal(moveSceneComponent(before, a.id, h(1)).scene.components.length, 2);
  }
  for (const number of [6, 8]) {
    const a = c('a', 'terrain', h(0), { number: 6 });
    const token = c('token', 'number-token', h(0), { number });
    const before = scene(a, token);
    const result = moveSceneComponent(before, a.id, h(1));
    assert.equal(result.status, 'rejected');
    assert.equal(result.scene, before);
    assert.match(result.message, /내장 숫자.*독립 숫자/);
    assert.equal(result.canRecordOriginal, undefined, 'cannot silently merge ambiguous existing evidence');
  }
  const destinationMixed = scene(c('a', 'terrain', h(0)), c('b', 'terrain', h(1), { number: 6 }), c('number', 'number-token', h(1), { number: 6 }));
  assert.equal(moveSceneComponent(destinationMixed, 'a', h(1)).scene, destinationMixed);
});

test('road connectivity rejects an opponent-blocked endpoint as a connection but accepts the other valid end', () => {
  const junction = CATAN_TOPOLOGY.vertices.find(vertex => vertex.edgeIds.length === 3)!;
  const targetEdge = CATAN_TOPOLOGY.byId.edge.get(junction.edgeIds[0])!;
  const otherEnd = CATAN_TOPOLOGY.byId.vertex.get(targetEdge.vertexIds.find(id => id !== junction.id)!)!;
  const existingRoad = c('existing-road', 'road', loc('edge', junction.edgeIds[1]));
  const opponent = c('opponent', 'settlement', loc('vertex', junction.id), { ownerId: 'blue' });
  const candidate = c('candidate', 'road', loc('edge', targetEdge.id));
  const blocked = inspectCatanPlacement(scene(existingRoad, opponent, candidate)).find(issue => issue.code === 'road-connection' && issue.componentIds.includes(candidate.id));
  assert.match(blocked!.message, /상대 건물/);
  assert.equal(blocked?.certainty, 'check', 'history and initial placement are not inferred');
  const alternate = c('alternate', 'road', loc('edge', otherEnd.edgeIds.find(id => id !== targetEdge.id)!));
  assert.equal(inspectCatanPlacement(scene(existingRoad, opponent, candidate, alternate)).some(issue => issue.code === 'road-connection' && issue.componentIds.includes(candidate.id)), false);
});

test('road extension only requires local connection, never a global route to a village', () => {
  const junction = CATAN_TOPOLOGY.vertices.find(vertex => vertex.edgeIds.length === 3)!;
  const existing = c('existing', 'road', loc('edge', junction.edgeIds[0]));
  const source = c('source', 'road', unplaced);
  const result = moveSceneComponent(scene(existing, source), source.id, loc('edge', junction.edgeIds[1]));
  assert.equal(result.status, 'moved');
  assert.equal(inspectCatanPlacement(result.scene).some(issue => issue.code === 'road-connection' && issue.componentIds.includes(source.id)), false);
});

test('full coverage and unknown owners never turn connection uncertainty into definite new-placement rejection', () => {
  for (const coverage of ['partial', 'full'] as const) {
    const value = { ...scene(c('new', 'settlement', unplaced, { ownerId: null })), coverage };
    const result = moveSceneComponent(value, 'new', loc('vertex', first.id));
    assert.equal(result.status, 'moved');
    const issue = inspectCatanPlacement(result.scene).find(issue => issue.code === 'settlement-connection');
    assert.equal(issue?.certainty, 'check');
    assert.match(issue!.message, /초기/);
    const road = moveSceneComponent({ ...scene(c('new-road', 'road', unplaced, { ownerId: null })), coverage }, 'new-road', loc('edge', first.edgeIds[0]));
    assert.equal(road.status, 'moved');
    assert.ok(inspectCatanPlacement(road.scene).some(issue => issue.code === 'road-connection' && issue.certainty === 'check'));
  }
});

test('observed city input and kind correction require no past village and never execute a gameplay upgrade', () => {
  const source = c('observed-city', 'city', unplaced);
  const result = moveSceneComponent(scene(source), source.id, loc('vertex', first.id));
  assert.equal(result.status, 'moved');
  assert.equal(inspectCatanPlacement(result.scene).some(issue => issue.code === 'settlement-connection'), false);
  const village = c('village', 'settlement', loc('vertex', first.id));
  const corrected = changeSceneComponentKind(scene(village), village.id, 'city');
  assert.equal(corrected.scene.components.length, 1);
  assert.deepEqual(corrected.scene.components[0], { ...village, kind: 'city' });
});

test('red-number adjacency is warning-only and unknown terrain remains unknown', () => {
  const hex = CATAN_TOPOLOGY.hexes[0];
  const neighbor = hex.neighborHexIds[0];
  const before = scene(c('eight', 'number-token', loc('hex', hex.id), { number: 8 }), c('six', 'number-token', unplaced, { number: 6 }));
  const result = moveSceneComponent(before, 'six', loc('hex', neighbor));
  assert.equal(result.status, 'moved');
  assert.ok(inspectCatanPlacement(result.scene).some(issue => issue.code === 'red-number-adjacency' && issue.certainty === 'check'));
  assert.ok(inspectCatanPlacement(result.scene).some(issue => issue.code === 'number-terrain-unknown'));
  assert.equal(result.scene.components.some(component => component.kind === 'terrain'), false);
});

test('a standalone number exchanges atomically with the inline number occupying the destination number layer', () => {
  const token = c('six', 'number-token', h(0), { number: 6 });
  const tile = c('tile', 'terrain', h(1), { variant: 'fields', number: 8, evidenceId: 'tile-photo', region: { x: .1, y: .2, width: .3, height: .4 } });
  const before = scene(token, tile);
  assert.deepEqual(slotOccupants(before, token, h(1)).map(component => component.id), [tile.id]);
  const result = moveSceneComponent(before, token.id, h(1));
  assert.equal(result.status, 'swapped');
  assert.deepEqual(result.scene.components.find(component => component.id === token.id), { ...token, location: h(1) });
  const nextTile = result.scene.components.find(component => component.id === tile.id)!;
  assert.deepEqual(nextTile.location, tile.location);
  assert.equal(nextTile.number, undefined);
  assert.deepEqual(nextTile.region, tile.region);
  const eight = result.scene.components.find(component => component.kind === 'number-token' && component.id !== token.id)!;
  assert.equal(eight.number, 8);
  assert.deepEqual(eight.location, h(0));
  assert.equal(eight.region, null);
  assert.equal(eight.evidenceId, tile.evidenceId);
  assert.equal(result.changedIds.length, 3);
  assert.equal(before.components.length, 2);
  assert.equal(before.components[1].number, 8, 'original representation remains available for one undo');
});

test('new/unplaced numbers cannot enter inline-occupied slots, even via original recording, and counts remain unchanged', () => {
  for (const quantity of [1, 4]) {
    const token = c('token', 'number-token', unplaced, { number: 6, quantity });
    const tile = c('tile', 'terrain', h(1), { number: 8 });
    const value = scene(token, tile);
    for (const options of [{}, { intent: 'correct' as const }]) {
      const result = moveSceneComponent(value, token.id, h(1), options);
      assert.equal(result.status, 'rejected');
      assert.equal(result.scene, value);
      assert.match(result.message, /내장/);
      assert.equal(result.scene.components[0].quantity, quantity);
    }
  }
});

test('mixed source or destination number representations are explicitly deferred without merging or changing terrain', () => {
  const token = c('token', 'number-token', h(0), { number: 6 });
  const inlineSource = c('source-tile', 'terrain', h(0), { number: 6 });
  const mixedSource = scene(token, inlineSource);
  const blockedSource = moveSceneComponent(mixedSource, token.id, h(1));
  assert.equal(blockedSource.status, 'rejected');
  assert.equal(blockedSource.scene, mixedSource);
  const mixedDestination = scene(token, c('dest-tile', 'terrain', h(1), { number: 8 }), c('dest-token', 'number-token', h(1), { number: 8 }));
  assert.equal(moveSceneComponent(mixedDestination, token.id, h(1)).scene, mixedDestination);
  assert.equal(moveSceneComponent(mixedDestination, token.id, h(1)).status, 'rejected');
});

test('kind correction cannot introduce a standalone number over an inline number; ordinary terrain and number still coexist', () => {
  const marker = c('marker', 'unknown', h(0));
  const value = scene(marker, c('tile', 'terrain', h(0), { number: 8 }));
  assert.equal(changeSceneComponentKind(value, marker.id, 'number-token').status, 'rejected');
  const ordinary = scene(c('token', 'number-token', h(0), { number: 8 }), c('tile', 'terrain', h(0)));
  const moved = moveSceneComponent(ordinary, 'tile', h(1));
  assert.equal(moved.status, 'moved');
  assert.deepEqual(moved.scene.components[0].location, h(0));
});
