import {catanPack} from '../gamepacks/catan.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/index.ts';
import { Store } from '../server/store.ts';
import type { SessionView, Value } from '../shared/types.ts';

test('Catan example can answer, preserve, save, reload, export/import and resume the same game turn', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'keepboard-journey-'));
  const app = await createApp({ store: new Store(directory) });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const call = async (url: string, method = 'GET', body?: unknown) => {
    const response = await fetch(`${base}${url}`, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
    const result = await response.json();
    assert(response.ok, `${method} ${url}: ${JSON.stringify(result)}`);
    return result;
  };
  try {
    let view: SessionView = await call('/api/sessions', 'POST', { name: '카탄 흐름 확인', gamePackVersion: catanPack.version, example: true });
    const route = `/api/sessions/${view.session.id}`;
    const turn = view.session.turnInstanceId;
    const epoch = view.session.captureEpoch;
    assert(view.session.example);
    assert(view.session.evidence.some(e => e.kind === 'example'));
    // Resolve only what the pack asks. The example remains a declared fixture.
    for (let iteration = 0; iteration < 10; iteration++) {
      const questions = view.questions.filter(q => q.acquisition !== 'preserve');
      if (!questions.length) break;
      const answers = questions.map(q => {
        const value: Value = q.type === 'boolean' ? false : q.type === 'number' ? 0 : q.type === 'select' ? q.options![0].value : q.type === 'json' ? q.ui?.editor === 'development-counts' ? Object.fromEntries(['knight','road-building','year-of-plenty','monopoly','victory-point'].map(k=>[k,0])) : q.ui?.editor === 'resource-counts' ? Object.fromEntries(['lumber','brick','wool','grain','ore'].map(k=>[k,0])) : [] : '기록 없음';
        return { field: q.field, ownerId: q.ownerId, value };
      });
      view = await call(route, 'PATCH', { answers });
    }
    for (const preservation of view.session.preservations) {
      view = await call(`${route}/preservations/${encodeURIComponent(preservation.id)}`, 'PATCH', { container: `${preservation.label} 보관칸`, packed: true });
    }
    assert.equal(view.ready, true, JSON.stringify(view.questions));
    view = await call(`${route}/commit`, 'POST', {});
    assert.equal(view.session.stage, 'saved');
    assert.equal(view.session.snapshots.length, 1);
    const reloaded: SessionView = await call(route);
    assert.equal(reloaded.session.snapshots[0].turnInstanceId, turn);
    assert.equal(reloaded.session.gamePack?.version, view.pack.version);
    const exported = await call(`${route}/export`);
    assert(Object.keys(exported.evidenceData).length > 0);
    const imported: SessionView = await call('/api/sessions/import', 'POST', exported);
    assert.notEqual(imported.session.id, view.session.id);
    const image = await fetch(`${base}${imported.session.evidence[0].url}`);
    assert.equal(image.status, 200);
    await call(route, 'PATCH', { answers: [{ field: 'currentPlayer', value: 'blue' }], notes: { public: '저장하지 않은 초안' } });
    view = await call(`${route}/resume`, 'POST', {});
    assert.equal(view.session.turnInstanceId, turn);
    assert.notEqual(view.session.captureEpoch, epoch);
    assert.equal(view.session.stage, 'restore');
    assert.equal(view.session.snapshots.length, 1);
    assert.equal(view.session.snapshots[0].turnInstanceId, turn);
    assert.equal(view.session.assertions.find(a => a.field === 'currentPlayer')?.value, 'red');
    assert.equal(view.session.notes.public, undefined);
    assert.deepEqual(view.differences, [], '보관 완료가 실제 수량·배치를 덮어쓰면 안 됩니다.');
    const original = view.session.evidence[0];
    view = await call(`${route}/evidence`, 'POST', { dataUrl: 'data:image/png;base64,aGVsbG8=', sourceEvidenceId: original.id, label: '이전 원본의 크롭' });
    const crop = view.session.evidence.at(-1)!;
    assert.equal(crop.captureEpoch, original.captureEpoch);
    assert.equal(crop.kind, 'example');
    const stale = await fetch(`${base}${route}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purpose: 'restore', evidenceIds: [crop.id] }) });
    assert.equal(stale.status, 409, '저장 당시 크롭을 현재 판의 관측으로 사용하면 안 됩니다.');
    view = await call(`${route}/next-turn`, 'POST', { playerId: 'blue' });
    assert.notEqual(view.session.turnInstanceId, turn);
    assert(view.session.preservations.every(p => !p.packed));
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
