import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../server/store.ts';
import { normalizeObservations, saveAISettings } from '../server/ai/index.ts';
import { rummikubPack } from '../gamepacks/rummikub.ts';
import type { Evidence, GamePack, SessionView } from '../shared/types.ts';

// Server startup must not load the project's real .env in a synthetic test.
const project=process.cwd(),bootstrap=await mkdtemp(path.join(os.tmpdir(),'kb-rummikub-bootstrap-'));process.chdir(bootstrap);
const {createApp}=await import('./fixtures/drawingTestApp');process.chdir(project);await rm(bootstrap,{recursive:true,force:true});

const tile = (id: string, color: string | null, number: number | null) => ({ id, kind: 'number', color, number, face: 'front', evidenceIds: [], region: null });
const scene = (ownerId: string | null, tiles: unknown[]) => ({ version: 'rummikub-classic-v1', ownerId, coverage: 'partial', groups: [{ id: 'group-one', label: '중단한 묶음', tiles }], loose: [] });

test('AI scene evidence follows public/private photo scope even if a caller passes mixed evidence', () => {
  const photo = (id: string, ownerId?: string): Evidence => ({ id, url: '/synthetic.png', capturedAt: '', captureEpoch: 'epoch', label: '', scope: ownerId ? 'player' : 'public', ownerId, kind: 'photo' });
  const shared = photo('shared'), mine = photo('mine', 'red'), other = photo('other', 'blue');
  const raw = (ownerId: string | null, evidenceIds: string[]) => ({ assertions: [{ field: ownerId ? 'rack.scene' : 'table.scene', ownerId, evidenceIds, value: scene(ownerId, [tile('seen', 'green', 7)]) }] });
  assert.equal(normalizeObservations(raw(null, [mine.id]), rummikubPack, [shared, mine], 'turn', ['red', 'blue']).assertions.length, 0, 'a public assertion cannot cite only a private image');
  assert.equal(normalizeObservations(raw('red', [shared.id]), rummikubPack, [mine, shared], 'turn', ['red', 'blue']).assertions.length, 0, 'AI cannot infer a private rack from a public image; manual rack provenance is a separate policy');
  assert.equal(normalizeObservations(raw('red', [other.id]), rummikubPack, [mine, other], 'turn', ['red', 'blue']).assertions.length, 0, 'another owner is never an AI rack source');
  const publicCandidate = normalizeObservations(raw(null, [shared.id, mine.id]), rummikubPack, [shared, mine], 'turn', ['red', 'blue']).assertions[0];
  assert.deepEqual(publicCandidate.evidenceIds, [shared.id]);
  const privateCandidate = normalizeObservations(raw('red', [mine.id, shared.id, other.id]), rummikubPack, [mine, shared, other], 'turn', ['red', 'blue']).assertions[0];
  assert.deepEqual(privateCandidate.evidenceIds, [mine.id]);
  assert.equal((privateCandidate.value as any).groups[0].tiles[0].color, null, 'unsupported Classic ink is unknown, never orange or a player color');
  assert(privateCandidate.ownerId==='red');
});

test('a completely observed empty Rummikub table is different from an unreadable partial photo', () => {
  const photo: Evidence = { id: 'empty-table', url: '/uploads/synthetic.png', capturedAt: '', captureEpoch: 'epoch', label: '', scope: 'public', kind: 'photo' };
  const raw = (coverage: string) => ({ assertions: [{ field: 'table.scene', evidenceIds: [photo.id], value: { version: 'rummikub-classic-v1', ownerId: null, coverage, groups: [], loose: [] } }] });
  assert.equal(normalizeObservations(raw('full'), rummikubPack, [photo], 'turn').assertions.length, 1);
  assert.equal(normalizeObservations(raw('partial'), rummikubPack, [photo], 'turn').assertions.length, 0);
});

test('a photographed tile back cannot assert a hidden number or joker identity', () => {
  const photo: Evidence = { id: 'back-photo', url: '/uploads/synthetic.png', capturedAt: '', captureEpoch: 'epoch', label: '', scope: 'public', kind: 'photo' };
  const hidden = { ...tile('hidden', 'blue', 9), kind: 'joker', face: 'back', representedColor: 'red', representedNumber: 13, evidenceIds: [photo.id] };
  const result = normalizeObservations({ assertions: [{ field: 'table.scene', value: scene(null, [hidden]), evidenceIds: [photo.id] }] }, rummikubPack, [photo], 'turn');
  const recorded = (result.assertions[0].value as any).groups[0].tiles[0];
  assert.deepEqual([recorded.kind, recorded.color, recorded.number, recorded.representedColor, recorded.representedNumber], ['unknown', null, null, null, null]);
  assert.equal(recorded.face, 'back');
});

test('multiple Rummikub scenes for one field are held for review instead of silently losing groups', () => {
  const photo: Evidence = { id: 'multiple-scenes', url: '/uploads/synthetic.png', capturedAt: '', captureEpoch: 'epoch', label: '', scope: 'public', kind: 'photo' };
  const assertions = [1, 7, 13].map(number => ({ field: 'table.scene', evidenceIds: [photo.id], value: scene(null, [tile(`tile-${number}`, 'blue', number)]) }));
  const result = normalizeObservations({ assertions }, rummikubPack, [photo], 'turn');
  assert.equal(result.assertions.length, 0, 'do not keep only the last group or guess how separate scenes overlap');
  assert(result.warnings.some(message => message.includes('여러') && message.includes('보류')));
});

test('Rummikub is selectable and preserves duplicate physical tiles, rack privacy, evidence and the saved turn across restart', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'keepboard-rummikub-journey-'));
  const launch = async () => {
    const server = (await createApp({ store: new Store(directory) })).listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address(); assert(address && typeof address !== 'string');
    return { server, base: `http://127.0.0.1:${address.port}` };
  };
  let app = await launch(), token = '';
  const stop = async () => { app.server.closeAllConnections(); await new Promise<void>(resolve => app.server.close(() => resolve())); };
  const call = async <T = SessionView>(route: string, method = 'GET', body?: unknown): Promise<T> => {
    const response = await fetch(app.base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { 'X-KeepBoard-Private-Token': token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    assert(response.ok, `${method} ${route}: ${await response.clone().text()}`);
    return response.json();
  };
  try {
    const packs = await call<GamePack[]>('/api/packs');
    assert(packs.some(p => p.id === 'rummikub'), 'the real create-game selector must receive a runtime Rummikub pack');
    let view = await call('/api/sessions', 'POST', { gamePackId: 'rummikub', gamePackVersion: rummikubPack.version, name: '합성 루미큐브' });
    const route = `/api/sessions/${view.session.id}`, turn = view.session.turnInstanceId;
    const uploaded = await call(`${route}/evidence`, 'POST', { dataUrl: 'data:image/png;base64,aGVsbG8=', expectedCaptureEpoch: view.session.captureEpoch });
    const photo = uploaded.session.evidence.at(-1)!;
    const privateUpload = await call(`${route}/evidence`, 'POST', { dataUrl: 'data:image/png;base64,aGVsbG8=', scope: 'player', ownerId: 'red', expectedCaptureEpoch: view.session.captureEpoch });
    const privatePhoto = privateUpload.session.evidence.at(-1)!;
    const publicScene = scene(null, [tile('copy-a', 'red', 1), tile('copy-b', 'red', 1), tile('seven', 'black', 7), { id: 'joker', kind: 'joker', color: null, number: null, face: 'front', evidenceIds: [photo.id], region: { x: .1, y: .2, width: .1, height: .1 }, representedColor: null, representedNumber: null }, tile('thirteen', 'blue', 13)]);
    const rack = scene('red', [tile('rack-a', 'black', 13), tile('rack-b', null, null)]);
    (publicScene.groups[0].tiles[0] as any).evidenceIds = [privatePhoto.id];
    view = await call(route, 'PATCH', { answers: [{ field: 'table.scene', value: publicScene }, { field: 'rack.scene', ownerId: 'red', value: rack }, { field: 'currentPlayer', value: 'blue' }], notes: { public: '재배열 중, 묶음은 아직 불완전', red: '받침대는 봉투 A' } });
    const recorded = view.session.assertions.find(a => a.field === 'table.scene')!;
    assert(recorded.evidenceIds.includes(photo.id), 'manually corrected tiles retain their actual photo reference');
    const data = recorded.value as any;
    assert.equal(data.ownerId, null, 'the table field owns its scope, not an owner embedded in input JSON');
    assert.deepEqual(data.groups[0].tiles[0].evidenceIds, [], 'public table values cannot expose a private rack photo reference');
    assert.deepEqual(data.groups[0].tiles.map((t: any) => [t.id, t.number]), [['copy-a', 1], ['copy-b', 1], ['seven', 7], ['joker', null], ['thirteen', 13]]);
    assert.equal((view.session.assertions.find(a => a.field === 'rack.scene')!.value as any).groups[0].tiles[0].color, 'black', 'tile color is not the owner display color');
    const malformed = await fetch(app.base + route, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: [{ field: 'table.scene', value: { arbitrary: true } }] }) });
    assert.equal(malformed.status, 400, 'a wrong scene envelope must not overwrite the recorded table');
    const wrongOwner = await fetch(app.base + route, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: [{ field: 'rack.scene', ownerId: 'red', value: { ...rack, ownerId: 'blue' } }] }) });
    assert.equal(wrongOwner.status, 400, 'a rack cannot silently change the owner named by its field');
    view = await call(`${route}/commit`, 'POST', { allowIncomplete: true });
    const snapshot = structuredClone(view.session.snapshots.at(-1)!);
    await stop(); app = await launch();
    view = await call(route);
    assert.equal(view.session.turnInstanceId, turn);
    assert.deepEqual(view.session.snapshots.at(-1), snapshot);
    assert.equal(view.session.notes.red, '받침대는 봉투 A');
    await call(`${route}/privacy/red`, 'PUT', { enabled: true, pin: '1234' });
    view = await call(route);
    assert(!view.session.assertions.some(a => a.field === 'rack.scene' && a.ownerId === 'red'));
    assert(!view.session.snapshots[0].assertions.some(a => a.field === 'rack.scene' && a.ownerId === 'red'));
    assert(view.session.assertions.some(a => a.field === 'table.scene'));
    const unlocked = await call<{ token: string }>(`${route}/privacy/red/unlock`, 'POST', { pin: '1234' }); token = unlocked.token;
    view = await call(route);
    assert.equal((view.session.assertions.find(a => a.field === 'rack.scene')!.value as any).ownerId, 'red');
    await call(route, 'PATCH', { notes: { public: '저장 이후 초안' } });
    view = await call(`${route}/resume`, 'POST', {});
    assert.equal(view.session.turnInstanceId, turn);
    assert.equal(view.session.notes.public, '재배열 중, 묶음은 아직 불완전');
    assert.deepEqual(view.session.assertions.find(a => a.field === 'table.scene')!.value, recorded.value);
  } finally { await stop(); await rm(directory, { recursive: true, force: true }); }
});

test('Rummikub photo analysis uses the tile contract and cannot infer a private rack from a public photo', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'keepboard-rummikub-analysis-'));
  const prior = process.env.KEEPBOARD_DATA_DIR; process.env.KEEPBOARD_DATA_DIR = directory;
  let evidenceId = '', lastPrompt = '';
  const model = createServer(async (request, response) => {
    const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString());
    lastPrompt = body.contents[0].parts[0].text;
    const observed = scene(null, [tile('one', 'red', 1), tile('seven', 'red', 7), tile('thirteen', 'red', 13)]);
    for (const t of observed.groups[0].tiles as any[]) t.evidenceIds = [evidenceId];
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: '합성 타일 판독', assertions: [{ field: 'table.scene', value: observed, evidenceIds: [evidenceId] }, { field: 'rack.scene', ownerId: 'red', value: scene('red', [tile('hidden', 'blue', 9)]), evidenceIds: [evidenceId] }] }) }] } }] }));
  });
  await new Promise<void>(resolve => model.listen(0, '127.0.0.1', resolve));
  const address = model.address(); assert(address && typeof address !== 'string');
  const server = (await createApp({ store: new Store(directory) })).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const apiAddress = server.address(); assert(apiAddress && typeof apiAddress !== 'string');
  const call = async (route: string, body: unknown): Promise<SessionView> => {
    const response = await fetch(`http://127.0.0.1:${apiAddress.port}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert(response.ok, await response.clone().text()); return response.json();
  };
  try {
    await saveAISettings({ provider: 'gemini', model: 'synthetic-only', apiKey: 'test-only', baseUrl: `http://127.0.0.1:${address.port}` });
    let view = await call('/api/sessions', { gamePackId: 'rummikub', gamePackVersion: rummikubPack.version });
    const route = `/api/sessions/${view.session.id}`;
    view = await call(`${route}/evidence`, { dataUrl: 'data:image/png;base64,aGVsbG8=', expectedCaptureEpoch: view.session.captureEpoch });
    evidenceId = view.session.evidence[0].id;
    view = await call(`${route}/analyze`, { evidenceIds: [evidenceId], expectedCaptureEpoch: view.session.captureEpoch });
    const candidate = view.session.assertions.find(a => a.field === 'table.scene' && a.status === 'candidate'); assert(candidate);
    assert.deepEqual((candidate.value as any).groups[0].tiles.map((t: any) => t.number), [1, 7, 13]);
    assert(!view.session.assertions.some(a => a.field === 'rack.scene'));
    assert(!lastPrompt.includes('Full means all19 terrain cells'), 'the Rummikub request must not contain the Catan full-board instruction');
    assert(lastPrompt.includes('rummikub-classic-v1'));
    view = await call(`${route}/assertions/${candidate.id}/accept`, {});
    assert.equal(view.session.assertions.find(a => a.id === candidate.id)?.status, 'accepted');
  } finally {
    server.closeAllConnections(); model.closeAllConnections();
    await Promise.all([new Promise<void>(resolve => server.close(() => resolve())), new Promise<void>(resolve => model.close(() => resolve()))]);
    if (prior === undefined) delete process.env.KEEPBOARD_DATA_DIR; else process.env.KEEPBOARD_DATA_DIR = prior;
    await rm(directory, { recursive: true, force: true });
  }
});
