import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/index.ts';
import { Store } from '../server/store.ts';
import type { SessionView } from '../shared/types.ts';

test('save as-is and reopen retain unknowns, private cards, original evidence and the same turn', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'keepboard-quick-save-'));
  const server = (await createApp({ store: new Store(directory) })).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const facts = (items: SessionView['session']['assertions']) => items.filter(a => a.basis !== 'rule');
  async function call(route: string, method = 'GET', body?: unknown): Promise<SessionView> {
    const response = await fetch(`${base}${route}`, {
      method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    assert.equal(response.ok, true, await response.clone().text());
    return response.json();
  }
  try {
    let view = await call('/api/sessions', 'POST', { name: '합성 · 간단 저장', example: true });
    const route = `/api/sessions/${view.session.id}`, turn = view.session.turnInstanceId;
    view = await call(route, 'PATCH', { answers: [{ field: 'currentPlayer', value: null }], notes: { public: '파랑이 자원 받을 차례' } });
    assert.equal(view.ready, false);
    const before = structuredClone(view.session);
    view = await call(`${route}/commit`, 'POST', { allowIncomplete: true });
    view = await call(route);
    assert.equal(view.session.snapshots.length, 1);
    assert.deepEqual(facts(view.session.snapshots[0].assertions), facts(before.assertions));
    assert.deepEqual(view.session.snapshots[0].evidence, before.evidence);
    assert.deepEqual(view.session.snapshots[0].preservations, before.preservations);
    view = await call(`${route}/resume`, 'POST', {});
    assert.equal(view.session.turnInstanceId, turn);
    assert.deepEqual(facts(view.session.assertions), facts(before.assertions));
    assert.deepEqual(view.session.evidence, before.evidence);
    assert.equal(view.session.notes.public, '파랑이 자원 받을 차례');
    assert.equal(view.session.assertions.find(a => a.field === 'currentPlayer')?.value, undefined);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
