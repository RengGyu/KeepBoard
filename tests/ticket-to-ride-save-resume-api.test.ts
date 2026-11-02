import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { SessionView } from '../shared/types.ts';
import type { GenericRecord } from '../shared/genericRecord.ts';
import { emptyGameReadout, setReadoutValue } from '../shared/readouts/registry.ts';

const project = process.cwd();
const bootstrap = await mkdtemp(path.join(os.tmpdir(), 'kb-ticket-to-ride-import-'));
process.chdir(bootstrap);
for (const key of ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'DEEPSEEK_API_KEY', 'KEEPBOARD_AI_GATEWAY_URL', 'KEEPBOARD_AI_ALIAS']) delete process.env[key];
const { createApp } = await import('../server/index.ts');
const { Store } = await import('../server/store.ts');
process.chdir(project);
await rm(bootstrap, { recursive: true, force: true });

test('Ticket to Ride route owner, city pair, segment, and placement survive the existing session save/resume API', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-ticket-to-ride-api-'));
  const app = await createApp({ store: new Store(root, path.join(project, 'public')) });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const port = (server.address() as { port: number }).port;
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
      gamePackId: 'ticket-to-ride',
      players: [{ id: 'p1', name: '첫 번째', color: 'red' }, { id: 'p2', name: '두 번째', color: 'blue' }]
    });
    assert.equal(created.status, 201);
    const view = created.body as SessionView;
    const prefix = `/api/sessions/${view.session.id}`;
    const pack = view.pack;
    let readout = emptyGameReadout(pack, 'trains');
    readout = setReadoutValue(pack, readout, 'owner', 'p2', { playerIds: ['p1', 'p2'] });
    readout = setReadoutValue(pack, readout, 'route', '1: 밴쿠버–시애틀');
    readout = setReadoutValue(pack, readout, 'segment', 1);
    const record: GenericRecord = {
      version: 'game-component-record-v1',
      pieces: [{
        id: 'claimed-route-train', componentId: 'trains', variant: null, quantity: 1,
        label: '열차 말', anchor: '', evidenceId: null, region: null,
        placement: { areaId: 'map-area', x: 0.18, y: 0.21, rotation: 0 }, readout
      }]
    };

    assert.equal((await call(prefix, 'PATCH', { answers: [{ field: 'map-area.scene', value: record }] })).status, 200);
    assert.equal((await call(`${prefix}/commit`, 'POST', { allowIncomplete: true })).status, 200);
    const reopened = (await call(prefix)).body as SessionView;
    const accepted = reopened.session.assertions.find(row => row.field === 'map-area.scene' && row.status === 'accepted');
    assert.deepEqual(accepted?.value, record);
    assert.deepEqual(reopened.session.snapshots.at(-1)?.assertions.find(row => row.field === 'map-area.scene')?.value, record);
    assert.equal(reopened.pack.version, pack.version);
    assert.equal(reopened.pack.runtime?.source.sha256, pack.runtime?.source.sha256);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
