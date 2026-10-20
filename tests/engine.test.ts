import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { FieldDefinition, GamePack, Session } from '../shared/types.ts';
import { answerField, nextTurn, recompute } from '../server/engine.ts';
import { Store } from '../server/store.ts';

const field = (key: string, scope: 'public' | 'player', type: FieldDefinition['type'] = 'boolean', acquisition: FieldDefinition['acquisition'] = 'ask', group = 'turn'): FieldDefinition => ({ key, label: key, description: key, scope, type, acquisition, group });
const pack: GamePack = {
  id: 'test', version: '1', title: 'Test', edition: '1', description: 'Declarative test pack', sources: [], supportGaps: [],
  fields: [field('hasCards', 'player'), field('newCard', 'player'), { ...field('cardKind', 'player', 'select'), options: [{ value: 'knight', label: 'Knight' }, { value: 'victoryPoint', label: 'Victory point' }] }, field('canPlay', 'player'), field('secretHand', 'player', 'text'), field('cards', 'player', 'json', 'preserve', 'private'), field('board', 'public', 'json', 'observe', 'board'), field('currentPlayer', 'public', 'text')],
  requirements: [
    { id: 'cards-present', scope: 'player', fields: ['hasCards'], reason: 'Determine private state', priority: 10 },
    { id: 'secret', scope: 'player', fields: ['secretHand'], when: { field: 'hasCards', owner: '$owner', op: 'eq', value: true }, reason: 'Only card owners need this', priority: 8 },
    { id: 'pack', scope: 'player', fields: ['cards'], reason: 'Preserve hidden order', priority: 4 },
  ],
  derivedRules: [{ id: 'card-eligibility', scope: 'player', field: 'canPlay', value: true, reason: 'Victory points may be revealed even when newly obtained', when: { op: 'and', conditions: [{ field: 'hasCards', owner: '$owner', op: 'eq', value: true }, { op: 'or', conditions: [{ field: 'newCard', owner: '$owner', op: 'eq', value: false }, { field: 'cardKind', owner: '$owner', op: 'eq', value: 'victoryPoint' }] }] } }],
  preservationTemplates: [{ id: 'board', label: 'Board', description: 'Preserve board', scope: 'public', conditions: ['Keep orientation'], restoreAfter: [] }, { id: 'cards', label: 'Cards', description: 'Keep hand private', scope: 'player', conditions: ['Keep owner label', 'Keep card order'], restoreAfter: ['board'] }],
};

function session(): Session {
  return { id: 'session-test', name: 'Test', createdAt: '2026-10-20T00:00:00.000Z', updatedAt: '2026-10-20T00:00:00.000Z', gamePackId: pack.id, gamePackVersion: pack.version, gamePack: structuredClone(pack), captureEpoch: 'capture-1', turnInstanceId: 'turn-1', stage: 'questions', players: [{ id: 'red', name: 'Red', color: 'red' }, { id: 'blue', name: 'Blue', color: 'blue' }], evidence: [], assertions: [], preservations: [], snapshots: [], notes: {}, activity: [], example: false };
}

test('conditional hidden questions expand per player; candidates do not fulfill required facts', () => {
  const value = session();
  let view = recompute(value, pack);
  assert.equal(view.questions.some(question => question.field === 'secretHand'), false);
  value.assertions.push({ id: 'candidate', field: 'hasCards', ownerId: 'red', value: true, status: 'candidate', basis: 'observation', evidenceIds: ['photo'], updatedAt: value.updatedAt });
  view = recompute(value, pack);
  assert.ok(view.questions.some(question => question.id === 'red:hasCards'));
  assert.equal(view.questions.some(question => question.field === 'secretHand'), false);
  answerField(value, pack, 'hasCards', true, 'red');
  answerField(value, pack, 'hasCards', false, 'blue');
  view = recompute(value, pack);
  assert.ok(view.questions.some(question => question.id === 'red:secretHand'));
  assert.equal(view.questions.some(question => question.id === 'blue:secretHand'), false);
});

test('changed answers remove obsolete derived facts and maintain the victory-point exception', () => {
  const value = session();
  answerField(value, pack, 'hasCards', true, 'red');
  answerField(value, pack, 'newCard', true, 'red');
  answerField(value, pack, 'cardKind', 'knight', 'red');
  assert.equal(recompute(value, pack).derived.some(item => item.field === 'canPlay'), false);
  answerField(value, pack, 'cardKind', 'victoryPoint', 'red');
  assert.equal(recompute(value, pack).derived.find(item => item.field === 'canPlay')?.value, true);
  answerField(value, pack, 'cardKind', 'knight', 'red');
  assert.equal(recompute(value, pack).derived.some(item => item.field === 'canPlay'), false);
  answerField(value, pack, 'newCard', false, 'red');
  assert.equal(recompute(value, pack).derived.find(item => item.field === 'canPlay')?.value, true);
  answerField(value, pack, 'hasCards', false, 'red');
  assert.equal(recompute(value, pack).derived.some(item => item.field === 'canPlay'), false);
});

test('preservation conditions and dependency ids are generated and packed containers fulfill matching fields', () => {
  const value = session();
  let view = recompute(value, pack);
  const red = value.preservations.find(item => item.id === 'red:cards')!;
  assert.deepEqual(red.restoreAfter, ['public:board']);
  assert.deepEqual(red.conditions, ['Keep owner label', 'Keep card order']);
  red.container = 'Red envelope';
  red.packed = true;
  view = recompute(value, pack);
  assert.equal(view.questions.some(item => item.id === 'red:cards'), false);
  assert.ok(view.questions.some(item => item.id === 'blue:cards'));
  assert.equal(view.session.preservations.find(item => item.id === red.id)?.container, 'Red envelope');
});

test('only explicit next-turn rotates turn id and removes only turn-local fields', () => {
  const value = session();
  answerField(value, pack, 'newCard', true, 'red');
  answerField(value, pack, 'board', { robber: 'desert' });
  answerField(value, pack, 'cards', ['wheat'], 'red');
  nextTurn(value, pack, 'blue');
  assert.notEqual(value.turnInstanceId, 'turn-1');
  assert.equal(value.assertions.some(item => item.field === 'newCard'), false);
  assert.deepEqual(value.assertions.find(item => item.field === 'board')?.value, { robber: 'desert' });
  assert.deepEqual(value.assertions.find(item => item.field === 'cards')?.value, ['wheat']);
  assert.equal(value.assertions.find(item => item.field === 'currentPlayer')?.value, 'blue');
});

test('derived evidence only references its own dependencies; restore compares without altering snapshot', () => {
  const value = session();
  answerField(value, pack, 'hasCards', true, 'red');
  answerField(value, pack, 'newCard', false, 'red');
  answerField(value, pack, 'board', { robber: 'desert' });
  value.assertions.find(item => item.field === 'hasCards')!.evidenceIds = ['hand-photo'];
  value.assertions.find(item => item.field === 'board')!.evidenceIds = ['board-photo'];
  let view = recompute(value, pack);
  assert.deepEqual(view.derived.find(item => item.field === 'canPlay')?.evidenceIds, ['hand-photo']);
  value.snapshots.push({ id: 'saved', createdAt: value.updatedAt, captureEpoch: value.captureEpoch, turnInstanceId: value.turnInstanceId, gamePackVersion: pack.version, assertions: structuredClone(value.assertions), evidence: [], preservations: [], notes: {} });
  const baseline = JSON.stringify(value.snapshots);
  value.stage = 'restore';
  value.assertions.push({ id: 'restore-candidate', field: 'board', value: { robber: 'forest' }, basis: 'observation', status: 'candidate', evidenceIds: [], updatedAt: value.updatedAt });
  view = recompute(value, pack);
  assert.deepEqual(view.differences.find(item => item.field === 'board')?.expected, { robber: 'desert' });
  assert.deepEqual(view.differences.find(item => item.field === 'board')?.observed, { robber: 'forest' });
  assert.equal(JSON.stringify(value.snapshots), baseline);
});

test('file store preserves turn and exports actual evidence bytes including historical snapshot evidence', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'keepboard-test-'));
  try {
    const store = new Store(directory);
    const value = session();
    const dataUrl = `data:image/png;base64,${Buffer.from('fixture-image-bytes').toString('base64')}`;
    const url = await store.saveEvidence(dataUrl);
    value.evidence.push({ id: 'evidence-1', url, label: 'Fixture', capturedAt: value.updatedAt, captureEpoch: value.captureEpoch, scope: 'public', kind: 'photo' });
    value.snapshots.push({ id: 'snapshot', createdAt: value.updatedAt, captureEpoch: value.captureEpoch, turnInstanceId: value.turnInstanceId, gamePackVersion: pack.version, assertions: [], evidence: structuredClone(value.evidence), preservations: [], notes: {} });
    value.evidence = [];
    await store.saveSession(value);
    const reopened = await store.getSession(value.id);
    assert.equal(reopened?.turnInstanceId, 'turn-1');
    assert.equal(reopened?.snapshots[0].turnInstanceId, 'turn-1');
    const exported = await store.exportSession(reopened!);
    assert.equal(exported.evidenceData['evidence-1'], dataUrl);
    const restored = await store.importSession(exported);
    assert.notEqual(restored.id, value.id);
    assert.equal(restored.turnInstanceId, value.turnInstanceId);
    const restoredFile = path.join(directory, 'uploads', path.basename(restored.snapshots[0].evidence[0].url));
    assert.equal((await readFile(restoredFile)).toString(), 'fixture-image-bytes');
    assert.deepEqual(restored.gamePack, pack);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('answers are typed by the schema and null removes the assertion', () => {
  const value = session();
  assert.throws(() => answerField(value, pack, 'hasCards', 'yes', 'red'), /boolean/);
  assert.throws(() => answerField(value, pack, 'hasCards', true), /플레이어/);
  answerField(value, pack, 'hasCards', true, 'red');
  answerField(value, pack, 'hasCards', null, 'red');
  assert.equal(value.assertions.some(item => item.field === 'hasCards'), false);
});

 test('correcting a photographed field keeps its source region without treating the new value as observed', () => {
  const value = session();
  const region = { x: 0.2, y: 0.3, width: 0.4, height: 0.2 };
  value.assertions.push({ id: 'visible-board', field: 'board', value: { count: 3 }, basis: 'observation', status: 'candidate', evidenceIds: ['original'], region, updatedAt: value.updatedAt });
  answerField(value, pack, 'board', { count: 4 });
  const corrected = value.assertions.find(item => item.field === 'board')!;
  assert.equal(corrected.basis, 'user');
  assert.deepEqual(corrected.evidenceIds, ['original']);
  assert.deepEqual(corrected.region, region);
  assert.deepEqual(corrected.value, { count: 4 });
});
