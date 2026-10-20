import test from 'node:test';
import assert from 'node:assert/strict';
import { catanPack, createExampleAssertions } from '../gamepacks/catan.ts';
import { answerField, recompute } from '../server/engine.ts';
import type { Session } from '../shared/types.ts';

function example(): Session {
  const players = [{ id: 'red', name: '빨강', color: 'red' }, { id: 'blue', name: '파랑', color: 'blue' }, { id: 'white', name: '흰색', color: 'white' }];
  return { id: 'test', name: '예시', createdAt: '2026-10-20', updatedAt: '2026-10-20', gamePackId: catanPack.id, gamePackVersion: catanPack.version, captureEpoch: 'capture', turnInstanceId: 'actual-turn', stage: 'questions', players, evidence: [], assertions: createExampleAssertions(players, 'actual-turn', 'photo'), preservations: [], snapshots: [], notes: {}, activity: [], example: true };
}

test('Catan requires the hidden pending effect and preserves new-knight restriction across reopen', () => {
  const session = example();
  let view = recompute(session, catanPack);
  assert(view.questions.some(q => q.field === 'turn.pendingEffect'));
  assert.equal(view.derived.find(a => a.field === 'player.development.newActionCardUnavailableThisTurn')?.value, true);
  answerField(session, catanPack, 'turn.pendingEffect', 'road_building');
  view = recompute(session, catanPack);
  assert(view.questions.some(q => q.field === 'turn.pendingEffectDetails'));
  answerField(session, catanPack, 'turn.pendingEffectDetails', '첫 번째 도로 완료, 두 번째 도로를 놓기 전');
  const reopened = structuredClone(session);
  view = recompute(reopened, catanPack);
  assert.equal(reopened.turnInstanceId, 'actual-turn');
  assert.match(String(view.derived.find(a => a.field === 'resume.nextProcedure')?.value), /미해결/);
  assert.equal(view.derived.find(a => a.field === 'player.development.newActionCardUnavailableThisTurn')?.value, true);
});

test('Catan physical hands replace transcription and a seven never invents completed or remaining steps', () => {
  const session = example();
  answerField(session, catanPack, 'player.resources.counts', null, 'blue');
  answerField(session, catanPack, 'player.resources.total', null, 'blue');
  recompute(session, catanPack);
  session.preservations.find(p => p.id === 'blue:player-resource-hands')!.packed = true;
  let view = recompute(session, catanPack);
  assert(!view.questions.some(q => q.ownerId === 'blue' && q.field.startsWith('player.resources.')));
  answerField(session, catanPack, 'turn.diceTotal', 7);
  answerField(session, catanPack, 'turn.phase', 'seven_discard');
  view = recompute(session, catanPack);
  assert(view.questions.some(q => q.field === 'robber.resolutionStep'));
  assert.equal(view.derived.some(a => a.field === 'robber.resolutionStep'), false);
  assert.equal(view.questions.filter(q => q.field === 'player.discard.remainingCount').length, 3);
});
