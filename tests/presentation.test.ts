import test from 'node:test';
import assert from 'node:assert/strict';
import type { Assertion, Evidence, FieldDefinition, SessionView } from '../shared/types.ts';
import { derivePhotoTargets, normalizedRegion, presentationEvidence, previewValue, regionIdentity, regionsForEvidence, surroundingRegion, targetKey, targetLocation, targetsForPreservation } from '../src/presentation.ts';

const date = '2026-10-20T00:00:00.000Z';
const field = (key: string, scope: 'public' | 'player' = 'public', extra: Partial<FieldDefinition> = {}): FieldDefinition => ({ key, label: key, description: '', type: 'number', scope, acquisition: 'observe', group: 'board', ...extra });
const photo = (id: string, ownerId?: string): Evidence => ({ id, url: `/${id}.jpg`, capturedAt: date, captureEpoch: 'epoch', label: id, kind: 'photo', scope: ownerId ? 'player' : 'public', ownerId });
const assertion = (id: string, field: string, extra: Partial<Assertion> = {}): Assertion => ({ id, field, value: 2, basis: 'observation', status: 'candidate', evidenceIds: ['photo-1'], updatedAt: date, ...extra });
function fixture(): SessionView {
  const pack = { id: 'pack', version: '1', title: 'Pack', edition: '1', description: '', sources: [], fields: [field('pieces'), field('hidden', 'player', { acquisition: 'ask', preservationId: 'hand' })], requirements: [], derivedRules: [], preservationTemplates: [{ id: 'board', label: 'Board', description: '', scope: 'public' as const, conditions: [], restoreAfter: [], visualFields: ['pieces'] }, { id: 'hand', label: 'Hand', description: '', scope: 'player' as const, conditions: [], restoreAfter: [] }], supportGaps: [] };
  return { pack, session: { id: 'session', name: 'Test', createdAt: date, updatedAt: date, gamePackId: 'pack', gamePackVersion: '1', captureEpoch: 'epoch', turnInstanceId: 'turn', stage: 'capture', players: [{ id: 'red', name: 'Red', color: 'red' }, { id: 'blue', name: 'Blue', color: 'blue' }], evidence: [photo('photo-1'), photo('photo-2'), photo('red-photo', 'red'), photo('blue-photo', 'blue')], assertions: [], preservations: [{ id: 'public:board', templateId: 'board', label: 'Board', description: '', conditions: [], container: 'Box', packed: true, restored: false, restoreAfter: [] }, ...['red', 'blue'].map(ownerId => ({ id: `${ownerId}:hand`, templateId: 'hand', label: 'Hand', description: '', conditions: [], container: `${ownerId} bag`, ownerId, packed: true, restored: false, restoreAfter: [] }))], snapshots: [], notes: {}, activity: [], example: false }, questions: [], derived: [], briefing: [], ready: false, progress: { resolved: 0, total: 1 }, differences: [] };
}

test('overlay and crop list resolve to the same stable field+owner target; region follows evidenceIds order', () => {
  const view = fixture();
  const region = { x: .2, y: .3, width: .1, height: .15 };
  view.session.assertions.push(assertion('candidate-1', 'pieces', { evidenceIds: ['photo-2', 'photo-1'], region }));
  const targets = derivePhotoTargets(view);
  const overlay = regionsForEvidence(targets, 'photo-2')[0];
  const target = targets.find(item => item.key === overlay.targetKey)!;
  assert.equal(target.key, targetKey('pieces'));
  assert.equal(overlay.id, regionIdentity('photo-2', 'candidate-1'));
  assert.equal(targetLocation(target, overlay.id), overlay);
  assert.equal(regionsForEvidence(targets, 'photo-1').length, 0);
  assert.equal(overlay.region?.x, region.x);
  view.session.assertions[0] = assertion('user-correction', 'pieces', { status: 'accepted', basis: 'user', evidenceIds: ['photo-2'], region, value: 3 });
  assert.equal(derivePhotoTargets(view)[0].key, target.key);
  assert.equal(derivePhotoTargets(view)[0].accepted?.value, 3);
});

test('preservation links use declared visualFields/preservationId/exact key and retain owner separation', () => {
  const view = fixture();
  assert.deepEqual(targetsForPreservation(derivePhotoTargets(view), view.session.preservations[0]).map(item => item.field.key), ['pieces']);
  const red = derivePhotoTargets(view, 'red');
  const blue = derivePhotoTargets(view, 'blue');
  assert.equal(targetsForPreservation(red, view.session.preservations[1])[0].key, targetKey('hidden', 'red'));
  assert.equal(targetsForPreservation(red, view.session.preservations[2]).length, 0);
  assert.notEqual(red[0].key, blue[0].key);
  view.pack.fields.push(field('board'));
  assert.ok(targetsForPreservation(derivePhotoTargets(view), view.session.preservations[0]).some(item => item.field.key === 'board'));
  view.pack.fields.push(field('almost-board'));
  assert.equal(derivePhotoTargets(view).some(item => item.field.key === 'almost-board'), false);
});

test('missing or invalid region retains whole original without fabricated overlays, including hidden fields', () => {
  const view = fixture();
  view.session.assertions.push(assertion('no-region', 'pieces'));
  const target = derivePhotoTargets(view)[0];
  assert.equal(targetLocation(target)?.evidence.id, 'photo-1');
  assert.equal(targetLocation(target)?.region, undefined);
  assert.equal(regionsForEvidence([target], 'photo-1').length, 0);
  const hidden = derivePhotoTargets(view, 'red')[0];
  assert.equal(targetLocation(hidden)?.evidence.id, 'red-photo');
  assert.equal(targetLocation(hidden)?.contextOnly, true);
  assert.equal(targetLocation(hidden)?.region, undefined);
  assert.equal(normalizedRegion({ x: 2, y: 0, width: .1, height: .1 }), undefined);
  assert.equal(normalizedRegion({ x: 0, y: 0, width: Number.NaN, height: 1 }), undefined);
  assert.deepEqual(presentationEvidence(view).map(item => item.id), ['photo-1', 'photo-2']);
  assert.equal(presentationEvidence(view, 'red').some(item => item.id === 'blue-photo'), false);
});

test('restore keeps saved target crop and archived original ahead of a new observed location', () => {
  const view = fixture();
  const saved = assertion('saved-assertion', 'pieces', { status: 'accepted', region: { x: .1, y: .1, width: .2, height: .2 } });
  view.session.snapshots.push({ id: 'saved', createdAt: date, captureEpoch: 'old', turnInstanceId: 'turn', gamePackVersion: '1', assertions: [saved], evidence: [photo('photo-1')], preservations: [], notes: {} });
  view.session.evidence = [photo('current')];
  view.session.assertions = [assertion('new-candidate', 'pieces', { evidenceIds: ['current'], region: { x: .7, y: .7, width: .1, height: .1 } })];
  const targets = derivePhotoTargets(view, undefined, true);
  const savedTarget = targetsForPreservation(targets, view.session.preservations[0])[0];
  assert.equal(targetLocation(savedTarget)?.evidence.id, 'photo-1');
  assert.equal(targetLocation(savedTarget)?.snapshot, true);
  assert.equal(savedTarget.candidates[0].id, 'new-candidate');
  assert.equal(targetLocation(savedTarget)?.targetKey, regionsForEvidence(targets, 'current')[0].targetKey);
});

test('surrounding crop contains the target and stays inside original boundaries', () => {
  for (const region of [{ x: .01, y: .03, width: .05, height: .04 }, { x: .8, y: .8, width: .2, height: .2 }]) {
    const crop = surroundingRegion(region);
    assert.ok(crop.x <= region.x && crop.y <= region.y);
    assert.ok(crop.x + crop.width >= region.x + region.width);
    assert.ok(crop.y + crop.height >= region.y + region.height);
    assert.ok(crop.x >= 0 && crop.y >= 0 && crop.x + crop.width <= 1 && crop.y + crop.height <= 1);
  }
});

test('a missing first source never transfers its region to another supporting photo', () => {
  const view = fixture();
  view.session.assertions = [assertion('missing-source', 'pieces', { evidenceIds: ['missing-photo', 'photo-2'], region: { x: .1, y: .1, width: .2, height: .2 } })];
  const target = derivePhotoTargets(view)[0];
  assert.equal(targetLocation(target)?.evidence.id, 'photo-2');
  assert.equal(targetLocation(target)?.region, undefined);
  assert.equal(regionsForEvidence([target], 'photo-2').length, 0);
});

test('list values summarize structured state and resolve option/player labels', () => {
  assert.equal(previewValue({ tiles: [1, 2], roads: [] }), '2개 항목의 기록');
  assert.equal(previewValue([1, 2, 3]), '3개 항목의 기록');
  assert.equal(previewValue('build', { options: [{ value: 'build', label: '건설 및 거래' }] }), '건설 및 거래');
  assert.equal(previewValue('red', undefined, fixture().session.players), 'Red');
});
