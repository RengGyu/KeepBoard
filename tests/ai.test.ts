import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeObservations, parseModelJSON } from '../server/ai/index.ts';
import { observationPrompt } from '../server/ai/prompt.ts';
import type { Evidence, GamePack, Session } from '../shared/types.ts';

const pack: GamePack = {
  id: 'tiny', title: '작은 팩', version: '1', edition: 'test', description: '', sources: [],
  fields: [
    { key: 'count', label: '말', description: '', scope: 'public', type: 'number', acquisition: 'observe', group: 'board' },
    { key: 'phase', label: '단계', description: '', scope: 'public', type: 'text', acquisition: 'ask', group: 'turn' },
    { key: 'hand', label: '손패', description: '', scope: 'player', type: 'number', acquisition: 'observe', group: 'hand' },
  ], requirements: [], derivedRules: [], preservationTemplates: [], supportGaps: [],
};
const evidence: Evidence[] = [{ id: 'photo', url: '/uploads/example.jpg', capturedAt: '2026-10-20', captureEpoch: 'epoch', label: '판', scope: 'public', kind: 'photo' }];

test('image output links readable fields to supplied originals and leaves temporal facts to questions', () => {
  const result = normalizeObservations({ summary: '말 두 개', assertions: [
    { field: 'count', value: 2, evidenceIds: ['photo'], confidence: 0.8 },
    { field: 'phase', value: 'build', evidenceIds: ['photo'] },
    { field: 'hand', value: 7, evidenceIds: ['photo'] },
    { field: 'count', value: 99, evidenceIds: ['nonexistent'] },
  ] }, pack, evidence, 'same-turn');
  assert.equal(result.assertions.length, 1);
  assert.equal(result.assertions[0].value, 2);
  assert.equal(result.assertions[0].status, 'candidate');
  assert.equal(result.assertions[0].turnInstanceId, 'same-turn');
});

test('private image candidates retain the photographed owner', () => {
  const result = normalizeObservations({ assertions: [{ field: 'hand', value: 4, evidenceIds: ['photo'] }] }, pack, [{ ...evidence[0], ownerId: 'red', scope: 'player' }], 'turn');
  assert.equal(result.assertions[0].ownerId, 'red');
});

test('model JSON accepts a fenced object and explains unreadable output', () => {
  assert.deepEqual(parseModelJSON('```json\n{"a":1}\n```'), { a: 1 });
  assert.throws(() => parseModelJSON('I cannot read this.'), /모델 응답/);
});

test('restoration prompt distinguishes the observed table from saved context', () => {
  const session = { players: [], assertions: [], turnInstanceId: 'turn' } as unknown as Session;
  const text = observationPrompt(session, pack, evidence, '숫자 확대', 'restore');
  assert.match(text, /CURRENT restored table/);
  assert.match(text, /not proof/);
  assert.match(text, /숫자 확대/);
});
