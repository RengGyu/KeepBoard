import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATAN_TOPOLOGY, SCENE_KINDS, compatibleLocationTypes, inspectScene, isCompatibleLocation, normalizeScene, normalizeSceneDetailed,
  resolveSlotId, sceneJSONSchema, slotPoint, snapToSlot, type ComponentScene,
} from '../shared/scene.ts';

test('explicit unknown quantity survives board normalization and JSON round-trip; legacy missing quantity keeps its default', () => {
  const road = {kind: 'road', location: {type: 'edge', id: 'r1c1.E'}};
  const scene = normalizeScene({version: 2, coverage: 'partial', components: [
    {...road, id: 'unknown', quantity: null},
    {...road, id: 'unknown-with-legacy-count', quantity: null, count: 7},
    {...road, id: 'zero', quantity: 0, count: 7},
    {...road, id: 'legacy-count', count: 2},
    {...road, id: 'legacy-missing'},
  ]});
  assert.deepEqual(scene.components.map(c => c.quantity), [null, null, 0, 2, 1]);
  assert.deepEqual(normalizeScene(JSON.parse(JSON.stringify(scene))), scene);
});

test('Catan topology has 19 hexes, 54 deduplicated vertices and 72 edges', () => {
  const { hexes, vertices, edges } = CATAN_TOPOLOGY;
  assert.equal(hexes.length, 19);
  assert.equal(vertices.length, 54);
  assert.equal(edges.length, 72);
  assert.deepEqual([1, 2, 3, 4, 5].map(row => hexes.filter(h => h.row === row).length), [3, 4, 5, 4, 3]);
  assert.equal(new Set(vertices.map(v => v.id)).size, 54);
  assert.equal(new Set(edges.map(e => e.id)).size, 72);
  for (const hex of hexes) {
    assert.equal(new Set(hex.vertexIds).size, 6, hex.id);
    assert.equal(new Set(hex.edgeIds).size, 6, hex.id);
  }
  // 24 inner corners touch 3 hexes; 42 inner sides touch 2.
  assert.equal(vertices.filter(v => v.hexIds.length === 3).length, 24);
  assert.equal(edges.filter(e => e.hexIds.length === 2).length, 42);
  assert.equal(vertices.reduce((n, v) => n + v.hexIds.length, 0), 114);
  for (const edge of edges) {
    const [a, b] = edge.vertexIds.map(id => CATAN_TOPOLOGY.byId.vertex.get(id)!);
    assert.ok(Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - 1) < 1e-9, edge.id);
    assert.ok(a.edgeIds.includes(edge.id) && b.edgeIds.includes(edge.id));
  }
  // Matches the pack's schematic anchors: r3c3 is the axial origin, r1c1 is q0 r-2.
  assert.deepEqual([CATAN_TOPOLOGY.byId.hex.get('r3c3')!.q, CATAN_TOPOLOGY.byId.hex.get('r3c3')!.r], [0, 0]);
  assert.deepEqual([CATAN_TOPOLOGY.byId.hex.get('r1c1')!.q, CATAN_TOPOLOGY.byId.hex.get('r1c1')!.r], [0, -2]);
  assert.equal(CATAN_TOPOLOGY.byId.hex.get('r3c3')!.neighborHexIds.length, 6);
});

test('shared corners and sides resolve to one stable id from any adjacent hex alias', () => {
  const north = resolveSlotId('vertex', 'r3c3.N');
  assert.ok(north);
  assert.equal(resolveSlotId('vertex', 'r2c2.SE'), north);
  assert.equal(resolveSlotId('vertex', 'r2c3 sw'), north);
  assert.equal(resolveSlotId('vertex', 'R2C3-SW'), north);
  assert.equal(resolveSlotId('edge', 'r3c3.NE'), resolveSlotId('edge', 'r2c3:SW'));
  assert.equal(resolveSlotId('hex', 'r3c2'), 'r3c2');
  assert.equal(resolveSlotId('hex', 'r6c1'), null);
  assert.equal(resolveSlotId('vertex', 'r3c3.E'), null, 'E is a side, not a corner');
  assert.equal(resolveSlotId('edge', 'r3c3'), null);
});

test('snapping picks the nearest geometrically compatible slot and ignores far points', () => {
  const edge = CATAN_TOPOLOGY.byId.edge.get(resolveSlotId('edge', 'r3c3.E')!)!;
  assert.deepEqual(snapToSlot('road', { x: edge.x + 0.1, y: edge.y - 0.05 }), { type: 'edge', id: edge.id });
  const vertex = CATAN_TOPOLOGY.byId.vertex.get(resolveSlotId('vertex', 'r3c3.S')!)!;
  assert.deepEqual(snapToSlot('settlement', { x: vertex.x - 0.12, y: vertex.y + 0.1 }), { type: 'vertex', id: vertex.id });
  assert.deepEqual(snapToSlot('city', vertex), { type: 'vertex', id: vertex.id });
  const hex = CATAN_TOPOLOGY.byId.hex.get('r4c2')!;
  assert.deepEqual(snapToSlot('robber', { x: hex.x + 0.3, y: hex.y - 0.2 }), { type: 'hex', id: 'r4c2' });
  // Hex centre is a full unit from every corner: a settlement there does not snap.
  assert.equal(snapToSlot('settlement', hex), null);
  assert.equal(snapToSlot('road', { x: 20, y: 20 }), null);
  assert.equal(snapToSlot('resource-card', hex), null, 'cards have no board slot');
  assert.deepEqual(slotPoint({ type: 'hex', id: 'r4c2' }), hex);
});

test('compatibility is geometric only, not rule legality', () => {
  assert.deepEqual(compatibleLocationTypes('road'), ['edge', 'area', 'unplaced']);
  assert.ok(!isCompatibleLocation('road', { type: 'vertex', id: 'r3c3.N' }));
  assert.ok(!isCompatibleLocation('settlement', { type: 'vertex', id: 'r9c9.N' }));
  // Two adjacent settlements break the distance rule but are still a recordable placement.
  const a = resolveSlotId('vertex', 'r3c3.N')!, b = resolveSlotId('vertex', 'r3c3.NE')!;
  assert.ok(isCompatibleLocation('settlement', { type: 'vertex', id: a }) && isCompatibleLocation('settlement', { type: 'vertex', id: b }));
  const scene = normalizeScene({ version: 1, coverage: 'partial', components: [
    { id: 's1', kind: 'settlement', ownerId: 'red', location: { type: 'vertex', id: a } },
    { id: 's2', kind: 'settlement', ownerId: 'blue', location: { type: 'vertex', id: b } },
    { id: 'r1', kind: 'road', ownerId: 'blue', location: { type: 'edge', id: 'r1c1.NW' } },
  ] });
  assert.equal(scene.components.length, 3);
  assert.deepEqual(inspectScene(scene), [], 'no legality findings');
});

test('normalized scene has the stored shape and is stable through JSON', () => {
  const raw = { version: 1, coverage: 'full', components: [
    { id: 'hex-a', kind: 'terrain', variant: 'Wheat', location: { type: 'hex', id: 'r1c1' }, number: 6, region: { x: 0.1, y: 0.2, width: 0.1, height: 0.1 }, evidenceId: 'photo-1' },
    { id: 'road-a', kind: 'road', ownerId: 'red', location: { type: 'edge', id: 'r2c3 sw' }, direction: -30, face: 'front' },
  ] };
  const scene = normalizeScene(raw, ['photo-1']);
  assert.deepEqual(Object.keys(scene), ['version', 'coverage', 'components']);
  assert.equal(scene.version, 1);
  assert.equal(scene.coverage, 'full');
  const [terrain, road] = scene.components;
  for (const key of ['id', 'kind', 'variant', 'ownerId', 'quantity', 'location', 'region', 'evidenceId']) assert.ok(key in terrain, key);
  assert.equal(terrain.variant, 'fields');
  assert.equal(terrain.quantity, 1, 'one piece on a board slot');
  assert.equal(terrain.number, 6);
  assert.equal(road.location.id, resolveSlotId('edge', 'r3c3.NE'));
  assert.equal(road.direction, 330);
  assert.equal(road.face, 'front');
  assert.equal(road.region, null);
  assert.equal(road.evidenceId, null);
  assert.deepEqual(normalizeScene(JSON.parse(JSON.stringify(scene)), ['photo-1']), scene);
  assert.equal(normalizeSceneDetailed(JSON.stringify(raw)).recognized, true, 'JSON string input');
});

test('partial and unknown facts stay unknown; nothing is invented', () => {
  const { scene, adjustments } = normalizeSceneDetailed({ version: 1, coverage: 'partial', components: [
    { id: 't1', kind: 'terrain', variant: null, location: { type: 'hex', id: 'r3c3' } },
    { id: 'rob', kind: 'robber', location: { type: 'hex', id: null } },
    { id: 's1', kind: 'settlement', location: { type: 'vertex', id: 'r3c3.E' } },
    { id: 'c1', kind: 'city', location: { type: 'hex', id: 'r3c3' } },
    { id: 'n7', kind: 'number-token', number: 7, location: { type: 'hex', id: 'r1c2' } },
    { id: 'x', kind: 'dragon' },
  ] });
  const byId = Object.fromEntries(scene.components.map(c => [c.id, c]));
  assert.equal(scene.components.length, 6, 'no terrain filled into the other 18 hexes');
  assert.equal(byId.t1.variant, null);
  assert.deepEqual(byId.rob.location, { type: 'hex', id: null });
  assert.deepEqual(byId.s1.location, { type: 'vertex', id: null }, 'bad slot id kept as unknown slot, not guessed');
  assert.deepEqual(byId.c1.location, { type: 'vertex', id: null }, 'city on a hex keeps only "on the board"');
  assert.equal(byId.n7.number, null);
  assert.equal(byId.x.kind, 'unknown');
  assert.deepEqual(byId.x.location, { type: 'unplaced', id: null });
  assert.equal(byId.x.quantity, null);
  assert.ok(adjustments.length >= 4);
  for (const c of scene.components) { assert.equal(c.region, null); assert.equal(c.evidenceId, null); }
  assert.deepEqual(inspectScene(scene).map(i => i.code).sort(), ['slot-unknown', 'slot-unknown', 'slot-unknown']);
});

test('photo crops are never fabricated and only attach to known evidence', () => {
  const crop = { x: 0.2, y: 0.3, width: 0.25, height: 0.1 };
  const value = { version: 1, coverage: 'catalog', components: [
    { id: 'a', kind: 'resource-card', variant: 'ore', quantity: 3, location: { type: 'area', id: 'hand' }, region: crop, evidenceId: null },
    { id: 'b', kind: 'deck', variant: 'development', quantity: null, location: { type: 'area', id: 'supply' }, region: crop, evidenceId: 'missing' },
    { id: 'c', kind: 'road', ownerId: 'red', quantity: 15, location: { type: 'unplaced', id: null }, region: null, evidenceId: 'p1' },
    { id: 'd', kind: 'token', region: { x: 0.9, y: 0.9, width: 0.5, height: 0.5 }, evidenceId: 'p1' },
    { id: 'e', kind: 'token', region: { x: 0.1, y: 0.1, width: 0, height: 0.2 }, evidenceId: 'p1' },
  ] };
  const scene = normalizeScene(value, ['p1', 'p2']);
  const [a, b, c, d, e] = scene.components;
  assert.equal(scene.coverage, 'catalog');
  assert.deepEqual([a.evidenceId, a.region], ['p1', crop], 'unattributed crop belongs to the first photo, like Assertion.region');
  assert.deepEqual([b.evidenceId, b.region, b.quantity], [null, null, null]);
  assert.deepEqual([c.evidenceId, c.region, c.quantity], ['p1', null, 15]);
  assert.deepEqual(d.region, { x: 0.9, y: 0.9, width: 0.1, height: 0.1 }, 'clamped to the photo');
  assert.equal(e.region, null);
  assert.equal(normalizeScene(value, []).components[0].region, null, 'no photo, no crop');
});

test('ids stay unique and stable; references to missing components are cleared', () => {
  const scene = normalizeScene({ version: 1, coverage: 'catalog', components: [
    { id: 'card', kind: 'development-card', face: 'back' },
    { id: 'card', kind: 'token', attachedToId: 'card' },
    { kind: 'token', attachedToId: 'ghost', face: 'sideways' },
  ] });
  assert.deepEqual(scene.components.map(c => c.id), ['card', 'card-1', 'token-1']);
  assert.equal(scene.components[1].attachedToId, 'card');
  assert.equal(scene.components[2].attachedToId, null);
  assert.equal(scene.components[0].face, 'back');
  assert.equal(scene.components[2].face, null);
});

test('values that are not scenes are reported and start empty', () => {
  for (const value of [undefined, null, 'not json', { tiles: [] }, 42]) {
    const result = normalizeSceneDetailed(value);
    assert.equal(result.recognized, false);
    assert.deepEqual(result.scene, { version: 2, coverage: 'partial', components: [], coverageByLayer: {} });
  }
  assert.equal(normalizeSceneDetailed([{ id: 'a', kind: 'robber' }]).scene.components.length, 1, 'bare component array');
  assert.equal(normalizeScene({ coverage: 'everything', components: [] }).coverage, 'partial');
});

test('inspection reports overlaps and full-board gaps without blocking', () => {
  const v = resolveSlotId('vertex', 'r5c3.S')!;
  const scene: ComponentScene = normalizeScene({ version: 1, coverage: 'full', components: [
    { id: 'a', kind: 'settlement', location: { type: 'vertex', id: v } },
    { id: 'b', kind: 'city', location: { type: 'vertex', id: v } },
    { id: 't', kind: 'terrain', variant: 'desert', location: { type: 'hex', id: 'r3c3' } },
  ] });
  const issues = inspectScene(scene);
  assert.deepEqual(issues.find(i => i.code === 'slot-shared')?.componentIds, ['a', 'b']);
  assert.match(issues.find(i => i.code === 'hex-without-terrain')!.message, /18개/);
});

test('model schema mirrors the scene contract', () => {
  const item = sceneJSONSchema.properties.components.items;
  assert.deepEqual([...sceneJSONSchema.required], ['version', 'coverage', 'components']);
  assert.deepEqual([...item.properties.kind.enum], [...SCENE_KINDS]);
  assert.deepEqual([...item.required], ['id', 'kind', 'variant', 'ownerId', 'quantity', 'location', 'region', 'evidenceId']);
  assert.deepEqual([...item.properties.location.properties.type.enum], ['hex', 'edge', 'vertex', 'area', 'unplaced']);
  assert.ok(item.properties.region.nullable && item.properties.variant.nullable);
  const types = new Set<string>();
  const walk = (node: unknown) => { if (node && typeof node === 'object') { const n = node as Record<string, unknown>; if (typeof n.type === 'string') types.add(n.type); Object.values(n).forEach(walk); } };
  walk(sceneJSONSchema);
  for (const type of types) assert.ok(['OBJECT', 'ARRAY', 'STRING', 'INTEGER', 'NUMBER'].includes(type), `Gemini type ${type}`);
});
