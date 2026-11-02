import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const project = process.cwd();
const bootstrap = await mkdtemp(path.join(os.tmpdir(), 'kb-calico-bootstrap-'));
process.chdir(bootstrap);
const { createApp } = await import('../server/index.ts');
const { Store } = await import('../server/store.ts');
process.chdir(project);
await rm(bootstrap, { recursive: true, force: true });

test('Calico patch and goal placements save and resume on their original player field', async () => {
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/calico/board.json', import.meta.url), 'utf8'));
  const patchSlot = board.areas.find((area: any) => area.id === 'patch-cells').slots.find((slot: any) => slot.id === 'calico-quilt-c1-r1');
  const goalSlot = board.areas.find((area: any) => area.id === 'design-goals').slots.find((slot: any) => slot.id === 'calico-quilt-c2-r2');
  const expected = { version: 'game-component-record-v1', pieces: [
    { id: 'patch-1', componentId: 'patches', variant: null, quantity: 1, label: '실물 패치', anchor: '', evidenceId: null, region: null, placement: { areaId: 'quilt', x: (patchSlot.x + patchSlot.w / 2) / 1000, y: (patchSlot.y + patchSlot.h / 2) / 1000, rotation: 0 } },
    { id: 'goal-1', componentId: 'boards', variant: null, quantity: 1, label: '목표 타일', anchor: '', evidenceId: null, region: null, placement: { areaId: 'quilt', x: (goalSlot.x + goalSlot.w / 2) / 1000, y: (goalSlot.y + goalSlot.h / 2) / 1000, rotation: 0 } },
  ] };
  const root = await mkdtemp(path.join(os.tmpdir(), 'kb-calico-board-'));
  const store = new Store(root, path.join(project, 'public'));
  const app = await createApp({ store });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const call = async (route: string, method = 'GET', body?: unknown) => {
    const response = await fetch(base + route, { method, headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    const created = await call('/api/sessions', 'POST', { gamePackId: 'calico', players: [{ id: 'p1', name: '하나', color: 'blue' }] });
    assert.equal(created.status, 201);
    const id = created.body.session.id as string;
    const route = `/api/sessions/${id}`;
    const save = await call(route, 'PATCH', { answers: [{ field: 'quilt.scene', ownerId: 'p1', value: expected }] });
    assert.equal(save.status, 200);
    assert.equal((await call(route + '/commit', 'POST', { allowIncomplete: true })).status, 200);

    const changed = structuredClone(expected);
    changed.pieces[0].placement.x = 0.95;
    assert.equal((await call(route, 'PATCH', { answers: [{ field: 'quilt.scene', ownerId: 'p1', value: changed }] })).status, 200);
    assert.equal((await call(route + '/resume', 'POST', { scope: 'public' })).status, 200);
    const reopened = await call(route);
    assert.deepEqual(reopened.body.session.assertions.find((row: any) => row.field === 'quilt.scene' && row.ownerId === 'p1')?.value, expected);
    assert.equal(reopened.body.pack.version, created.body.pack.version);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
