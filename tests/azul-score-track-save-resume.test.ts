import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Import the app from a disposable cwd so the test cannot load the user's real Store or settings.
const project = process.cwd();
const bootstrap = await mkdtemp(path.join(os.tmpdir(), 'kb-azul-bootstrap-'));
process.chdir(bootstrap);
const { createApp } = await import('../server/index.ts');
const { Store } = await import('../server/store.ts');
process.chdir(project);
await rm(bootstrap, { recursive: true, force: true });

test('Azul score scalar saves, reloads, and resumes without changing its player field', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-azul-score-'));
  const store = new Store(root, path.join(project, 'public'));
  const app = await createApp({ store });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const call = async (route: string, method = 'GET', body?: unknown) => {
    const response = await fetch(base + route, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() as any };
  };

  try {
    const created = await call('/api/sessions', 'POST', { gamePackId: 'azul', players: [{ id: 'p1', name: '하나', color: 'blue' }] });
    assert.equal(created.status, 201);
    const score = created.body.pack.fields.find((field: { key: string }) => field.key === 'score');
    assert.equal(score.type, 'number');
    assert.equal(score.scope, 'player');
    assert.equal(score.visibility, 'public');
    const id = created.body.session.id as string;
    const prefix = `/api/sessions/${id}`;

    assert.equal((await call(prefix, 'PATCH', { answers: [{ field: 'score', ownerId: 'p1', value: 42 }] })).status, 200);
    const saved = await call(prefix, 'PATCH', { answers: [{ field: 'score', ownerId: 'p1', value: 42 }] });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.session.assertions.find((row: { field: string; ownerId?: string }) => row.field === 'score' && row.ownerId === 'p1')?.value, 42);
    assert.equal((await call(prefix + '/commit', 'POST', { allowIncomplete: true })).status, 200);

    assert.equal((await call(prefix, 'PATCH', { answers: [{ field: 'score', ownerId: 'p1', value: 19 }] })).status, 200);
    const beforeResume = await call(prefix);
    assert.equal(beforeResume.body.session.assertions.find((row: { field: string; ownerId?: string }) => row.field === 'score' && row.ownerId === 'p1')?.value, 19);
    assert.equal((await call(prefix + '/resume', 'POST', { scope: 'public' })).status, 200);
    const reopened = await call(prefix);
    assert.equal(reopened.body.session.assertions.find((row: { field: string; ownerId?: string }) => row.field === 'score' && row.ownerId === 'p1')?.value, 42);
    assert.equal(reopened.body.pack.version, created.body.pack.version);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
