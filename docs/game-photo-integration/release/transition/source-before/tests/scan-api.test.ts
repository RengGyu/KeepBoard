import {catanPack} from '../gamepacks/catan.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/index.ts';
import { Store } from '../server/store.ts';
import { saveAISettings } from '../server/ai/index.ts';
import type { SessionView } from '../shared/types.ts';

test('exact sweep retries send six originals once per request, retain accepted state and reject stale epochs', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'keepboard-scan-'));
  const previousDirectory = process.env.KEEPBOARD_DATA_DIR;
  process.env.KEEPBOARD_DATA_DIR = directory;
  const received: any[] = [];
  let sweepIds: string[] = [];
  const model = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    received.push(JSON.parse(Buffer.concat(chunks).toString()));
    response.setHeader('Content-Type', 'application/json');
    if (received.length === 1) { response.statusCode = 503; response.end(JSON.stringify({ error: { message: 'local fixture retry' } })); return; }
    const reply = { summary: '스캔 후보', assertions: [{ field: 'robber.hexAnchor', value: 'r1c1', evidenceIds: sweepIds, confidence: .8 }] };
    response.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }] }));
  });
  await new Promise<void>(resolve => model.listen(0, '127.0.0.1', resolve));
  const modelAddress = model.address(); assert(modelAddress && typeof modelAddress !== 'string');
  const app = await createApp({ store: new Store(directory) });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const request = (route: string, body?: unknown, method = 'POST') => fetch(`${base}${route}`, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const call = async (route: string, body?: unknown, method = 'POST') => {
    const response = await request(route, body, method);
    assert.equal(response.status < 300, true, await response.clone().text());
    if (route.endsWith('/evidence') || route.endsWith('/analyze')) {
      const timing = response.headers.get('Server-Timing');
      assert.match(timing || '', /queue;dur=[\d.]+/);
      assert.match(timing || '', /save;dur=[\d.]+/);
      if (route.endsWith('/analyze')) assert.match(timing || '', /provider;dur=[\d.]+/);
      assert(!timing?.includes('test-only'));
    }
    return response.json();
  };
  try {
    await saveAISettings({ provider: 'gemini', model: 'local-only', apiKey: 'test-only', baseUrl: `http://127.0.0.1:${modelAddress.port}` });
    let view: SessionView = await call('/api/sessions', { name: '실사진 묶음', gamePackVersion: catanPack.version, example: true });
    const route = `/api/sessions/${view.session.id}`;
    const epoch = view.session.captureEpoch;
    view = await call(route, { answers: [{ field: 'robber.hexAnchor', value: 'r3c3' }] }, 'PATCH');
    const accepted = structuredClone(view.session.assertions.filter(a => a.status === 'accepted' && a.basis !== 'rule'));
    const upload = (label: string, extra = {}) => call(`${route}/evidence`, { dataUrl: `data:image/png;base64,${Buffer.from(label).toString('base64')}`, label, expectedCaptureEpoch: epoch, ...extra });
    const old = await upload('previous-batch');
    const privatePhoto = await upload('private', { scope: 'player', ownerId: 'red' });
    for (let index = 0; index < 6; index++) {
      const result = await upload(`sweep-${index}`);
      assert.equal(typeof result.createdEvidenceId, 'string');
      const evidence = result.session.evidence.find((item: any) => item.id === result.createdEvidenceId);
      assert.equal(evidence.captureEpoch, epoch);
      assert.equal(evidence.kind, 'photo');
      sweepIds.push(result.createdEvidenceId);
    }
    const analyzeBody = { evidenceIds: [...sweepIds], expectedCaptureEpoch: epoch, purpose: 'capture' };
    const failed = await request(`${route}/analyze`, analyzeBody);
    assert.equal(failed.status >= 400, true);
    view = await call(route, undefined, 'GET');
    assert(sweepIds.every(id => view.session.evidence.some(item => item.id === id)), 'failed AI must preserve originals');
    assert.equal(received.length, 1);
    view = await call(`${route}/analyze`, analyzeBody);
    assert.equal(received.length, 2, 'six images use one model request, explicit retry uses exactly one more');
    for (const payload of received) {
      const parts = payload.contents[0].parts;
      assert.equal(parts.filter((part: any) => part.inline_data).length, 6);
      const metadataLine = parts[0].text.split('\n').find((line: string) => line.startsWith('Photos in order: '));
      const sentIds = JSON.parse(metadataLine.slice('Photos in order: '.length)).map((item: any) => item.id);
      assert.deepEqual(sentIds, sweepIds);
      assert(!sentIds.includes(old.createdEvidenceId));
      assert(!sentIds.includes(privatePhoto.createdEvidenceId));
    }
    assert.deepEqual(view.session.assertions.filter(a => a.status === 'accepted' && a.basis !== 'rule'), accepted, 'model adds candidates; user-accepted values survive');
    const candidate = view.session.assertions.find(a => a.basis === 'observation' && a.status === 'candidate');
    assert.deepEqual(candidate?.evidenceIds, sweepIds);
    await call(`${route}/commit`, { allowIncomplete: true });
    view = await call(`${route}/resume`, {});
    assert.notEqual(view.session.captureEpoch, epoch);
    const fileCount = (await readdir(path.join(directory, 'uploads'))).length;
    const stale = await request(`${route}/evidence`, { dataUrl: 'data:image/png;base64,aGVsbG8=', expectedCaptureEpoch: epoch });
    assert.equal(stale.status, 409);
    assert.equal((await readdir(path.join(directory, 'uploads'))).length, fileCount, 'reject before storing image bytes');
    assert.equal((await request(`${route}/analyze`, analyzeBody)).status, 409);
    assert.equal(received.length, 2, 'stale batch must not call model');
    assert.equal((await request(`${route}/analyze`, { evidenceIds: ['missing'], purpose: 'capture' })).status, 409);
    assert.equal(received.length, 2, 'never silently analyze a subset');
  } finally {
    server.closeAllConnections(); model.closeAllConnections();
    await Promise.all([new Promise<void>(resolve => server.close(() => resolve())), new Promise<void>(resolve => model.close(() => resolve()))]);
    if (previousDirectory === undefined) delete process.env.KEEPBOARD_DATA_DIR; else process.env.KEEPBOARD_DATA_DIR = previousDirectory;
    await rm(directory, { recursive: true, force: true });
  }
});
