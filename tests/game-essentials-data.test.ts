import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkEssentials } from '../tools/game-specs/essentials-check.ts';
const spec = async (id: string) => JSON.parse(await readFile(new URL(`../docs/research/game-specs-120/games/${id}.json`, import.meta.url), 'utf8'));
const field = (s: any, id: string) => s.state_fields.find((f: any) => f.id === id);
const preserved = (s: any, id: string) => s.resume.preserve_procedures.find((p: any) => p.field_ids.includes(id));

test('all 120 data records retain IDs, scopes, unknown-save policy and inspectable provenance', async () => {
  const result = await checkEssentials();
  assert.deepEqual(result.errors, []);
  assert.equal(result.games, 120);
  assert.equal(result.factualCompleteness, false);
});

test('starting markers do not replace the active player; physical harvest remains unrevealed', async () => {
  const s = await spec('caverna');
  assert(field(s, 'turn'));
  assert(field(s, 'starting-player'));
  assert.match(field(s, 'starting-player').description, /넘기지 않는다/);
  assert.equal(field(s, 'harvest-markers.scene').visibility, 'hidden');
  assert.equal(preserved(s, 'harvest-markers.scene').confidence, 'recommendation');
  assert(!s.resume.required_field_ids.includes('starting-player'));
});

test('face-down physical cards can be publicly consultable or secret according to the specific source', async () => {
  const duel = await spec('seven-wonders-duel');
  const mars = await spec('terraforming-mars');
  const arkham = await spec('arkham-horror-3');
  assert.equal(field(duel, 'discard.scene').visibility, 'public');
  assert.equal(field(mars, 'project-decks.scene').visibility, 'hidden');
  assert.equal(field(arkham, 'event-discard.scene').visibility, 'public');
  assert.equal(field(arkham, 'event-deck.scene').visibility, 'hidden');
});

test('earned fear and unrevealed objective slots preserve order without requesting hidden faces', async () => {
  for (const [id, fid] of [['spirit-island', 'earned-fear.scene'], ['twilight-imperium-4', 'future-objectives.scene']]) {
    const s = await spec(id!);
    assert.equal(field(s, fid!).visibility, 'hidden');
    assert.equal(preserved(s, fid!).order_sensitive, true);
    assert(!s.recognition_correction.photographable_field_ids.includes(fid));
    assert.match(preserved(s, fid!).steps.join(' '), /펼치|숨은 면/);
  }
});

test('Jaipur does not require a public camel count; Rummikub rollback baseline stays optional', async () => {
  const jaipur = await spec('jaipur');
  assert.equal(field(jaipur, 'herd-private.scene').visibility, 'owner');
  assert.match(field(jaipur, 'camels.scene').description, /알릴 의무가 없다/);
  assert(!jaipur.resume.required_field_ids.includes('herd-private.scene'));
  const rummikub = await spec('rummikub');
  assert.equal(field(rummikub, 'manipulation-baseline').confidence, 'recommendation');
  assert.match(field(rummikub, 'manipulation-baseline').description, /과거 상태가 없으면 모름/);
  assert(preserved(rummikub, 'table.scene'));
});
