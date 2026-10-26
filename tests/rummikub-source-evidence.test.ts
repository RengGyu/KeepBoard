import test from 'node:test';
import assert from 'node:assert/strict';
import { answerField } from '../server/engine.ts';
import { rummikubPack } from '../gamepacks/rummikub.ts';
import { applyRummikubCommand, createRummikubTile, emptyRummikub, normalizeRummikubDetailed, rummikubSourceEvidence } from '../shared/rummikub.ts';
import type { Evidence, Session, Value } from '../shared/types.ts';

test('a rack correction keeps its public-photo crop while excluding another private owner', () => {
  const photo = (id: string, ownerId?: string): Evidence => ({ id, url: '/synthetic.png', kind: 'photo', scope: ownerId ? 'player' : 'public', ownerId, capturedAt: 'now', captureEpoch: 'epoch', label: '' });
  const session: Session = { id: 'synthetic', name: 'synthetic', example: false, gamePackId: 'rummikub', gamePackVersion: rummikubPack.version, createdAt: 'now', updatedAt: 'now', captureEpoch: 'epoch', turnInstanceId: 'turn', stage: 'capture', players: [{ id: 'red', name: 'red', color: 'red' }, { id: 'blue', name: 'blue', color: 'blue' }], evidence: [photo('public'), photo('red-private', 'red'), photo('blue-private', 'blue')], assertions: [], preservations: [], snapshots: [], notes: {}, activity: [] };
  const rack = emptyRummikub('red'), region = { x: .1, y: .2, width: .1, height: .2 };
  rack.loose = [createRummikubTile('tile-a', { color: 'blue', number: 7, evidenceIds: ['public', 'red-private', 'blue-private'], region })];
  answerField(session, rummikubPack, 'rack.scene', rack as unknown as Value, 'red');
  const allowed = rummikubSourceEvidence(session.evidence, 'red');
  assert.deepEqual(allowed.map(e => e.id), ['public', 'red-private']);
  assert.deepEqual(rummikubSourceEvidence(session.evidence).map(e => e.id), ['public']);
  const read = normalizeRummikubDetailed(session.assertions[0].value, { ownerId: 'red', evidenceIds: allowed.map(e => e.id) });
  const corrected = applyRummikubCommand(read.scene, { type: 'edit', tileId: 'tile-a', patch: { number: 13 } });
  answerField(session, rummikubPack, 'rack.scene', corrected as unknown as Value, 'red');
  const saved = normalizeRummikubDetailed(session.assertions[0].value, { ownerId: 'red', evidenceIds: allowed.map(e => e.id) }).scene.loose[0];
  assert.equal(saved.number, 13);
  assert.deepEqual(saved.evidenceIds, ['public', 'red-private']);
  assert.deepEqual(saved.region, region);
});
