import test from 'node:test';
import assert from 'node:assert/strict';
import { addSavedScanEvidence, createScanBatch, finishScanBatch } from '../src/scanBatch.ts';
import type { Evidence } from '../shared/types.ts';

const context = { id: 'run', sessionId: 'session', captureEpoch: 'opening-epoch', ownerId: 'red', purpose: 'capture' as const, instruction: '숫자', aiEnabled: true };
const photo = (id: string): Evidence => ({ id, scope: 'player', ownerId: 'red', captureEpoch: 'opening-epoch', kind: 'photo', url: '/photo.jpg', label: id, capturedAt: 'now' });

test('batch claims only successful exact run IDs once; explicit retry retains that same list', () => {
  const input = { ...context };
  let batch = createScanBatch(input);
  input.ownerId = 'blue'; input.captureEpoch = 'later';
  batch = addSavedScanEvidence(batch, photo('saved-1'));
  batch = addSavedScanEvidence(batch, photo('saved-2'));
  batch = addSavedScanEvidence(batch, photo('saved-1'));
  const finish = finishScanBatch(batch);
  assert.deepEqual(finish.evidenceIds, ['saved-1', 'saved-2']);
  assert.deepEqual(finishScanBatch(finish.batch).evidenceIds, []);
  // Even if AI fails, no second automatic claim; UI retry uses the retained exact IDs.
  finish.evidenceIds.push('unrelated');
  assert.deepEqual(finish.batch.evidenceIds, ['saved-1', 'saved-2']);
  assert.equal(finish.batch.context.ownerId, 'red');
  assert.equal(finish.batch.context.captureEpoch, 'opening-epoch');
  assert.throws(() => addSavedScanEvidence(finish.batch, photo('late')), /마친 스캔/);
});

test('batch excludes other owners, stale epochs and schematic examples without consuming capacity', () => {
  const batch = createScanBatch(context);
  for (const invalid of [{ ...photo('x'), ownerId: 'blue' }, { ...photo('x'), captureEpoch: 'old' }, { ...photo('x'), scope: 'public' as const }, { ...photo('x'), kind: 'example' as const }]) {
    assert.throws(() => addSavedScanEvidence(batch, invalid), /맞지 않는 사진/);
  }
  assert.deepEqual(batch.evidenceIds, []);
  assert.deepEqual(addSavedScanEvidence(batch, photo('retry')).evidenceIds, ['retry']);
});

test('camera and upload batches share a six-photo cap and no-key finish keeps originals without AI', () => {
  let batch = createScanBatch({ ...context, aiEnabled: false });
  for (let i = 0; i < 6; i++) batch = addSavedScanEvidence(batch, photo(`photo-${i}`));
  assert.throws(() => addSavedScanEvidence(batch, photo('seventh')), /6장/);
  const finish = finishScanBatch(batch);
  assert.deepEqual(finish.evidenceIds, []);
  assert.equal(finish.batch.evidenceIds.length, 6);
  assert.equal(finish.batch.finished, true);
  assert.deepEqual(finishScanBatch(createScanBatch(context)).evidenceIds, []);
});
