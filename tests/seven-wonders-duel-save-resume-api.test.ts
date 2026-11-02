import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { SessionView } from '../shared/types.ts';
import type { GenericRecord } from '../shared/genericRecord.ts';

const project = process.cwd();
const bootstrap = await mkdtemp(path.join(os.tmpdir(), 'kb-seven-wonders-import-'));
process.chdir(bootstrap);
for (const key of ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'DEEPSEEK_API_KEY', 'KEEPBOARD_AI_GATEWAY_URL', 'KEEPBOARD_AI_ALIAS']) delete process.env[key];
const { createApp } = await import('../server/index.ts');
const { Store } = await import('../server/store.ts');
process.chdir(project);
await rm(bootstrap, { recursive: true, force: true });

test('Seven Wonders Duel age and age-tagged card placements survive save and resume', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-seven-wonders-api-'));
  const app = await createApp({ store: new Store(root, path.join(project, 'public')) });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const port = (server.address() as { address: string; port: number }).port;
  async function call(route: string, method = 'GET', body?: unknown) {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: response.status, body: await response.json() as any };
  }
  try {
    const created = await call('/api/sessions', 'POST', {
      gamePackId: 'seven-wonders-duel',
      players: [{ id: 'p1', name: '첫 번째', color: 'red' }, { id: 'p2', name: '두 번째', color: 'blue' }]
    });
    assert.equal(created.status, 201);
    const view = created.body as SessionView;
    const prefix = `/api/sessions/${view.session.id}`;
    const record: GenericRecord = {
      version: 'game-component-record-v1',
      pieces: [{
        id: 'saved-age-two-card', componentId: 'cards', variant: null, quantity: 1,
        label: '시대 카드', anchor: '', evidenceId: null, region: null,
        placement: { areaId: 'structure', x: 0.42, y: 0.37, rotation: 0, layoutVariant: 'age-2' }
      }]
    };

    assert.equal((await call(prefix, 'PATCH', { answers: [
      { field: 'age', value: 2 },
      { field: 'structure.scene', value: record }
    ] })).status, 200);
    assert.equal((await call(`${prefix}/commit`, 'POST', { allowIncomplete: true })).status, 200);
    const reopened = (await call(prefix)).body as SessionView;
    const acceptedAge = reopened.session.assertions.find(row => row.field === 'age' && row.status === 'accepted');
    const acceptedBoard = reopened.session.assertions.find(row => row.field === 'structure.scene' && row.status === 'accepted');
    assert.equal(acceptedAge?.value, 2);
    assert.deepEqual(acceptedBoard?.value, record);
    assert.equal((acceptedBoard?.value as unknown as GenericRecord).pieces[0].placement?.layoutVariant, 'age-2');
    const snapshot = reopened.session.snapshots.at(-1);
    assert.equal(snapshot?.assertions.find(row => row.field === 'age')?.value, 2);
    assert.deepEqual(snapshot?.assertions.find(row => row.field === 'structure.scene')?.value, record);
    assert.equal(reopened.pack.version, view.pack.version);
    assert.equal(reopened.pack.runtime?.source.sha256, view.pack.runtime?.source.sha256);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
