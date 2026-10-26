// Fresh data store. --gateway opts into the existing local AI service without copying keys.
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../../server/index.ts';
import { Store } from '../../server/store.ts';
import { createRummikubTile, emptyRummikub, rummikubAnswers } from '../../shared/rummikub.ts';
import type { SessionView } from '../../shared/types.ts';
import { getAIStatus } from '../../server/ai/index.ts';

const root = await mkdtemp(path.join(os.tmpdir(), 'keepboard-rummikub-preview-'));
process.env.KEEPBOARD_DATA_DIR = root;
process.env.NODE_ENV = 'production';
for (const key of ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'DEEPSEEK_API_KEY', 'AI_PROVIDER', 'AI_MODEL', 'AI_BASE_URL', 'AI_GATEWAY_URL', 'KEEPBOARD_AI_ALIAS', 'KEEPBOARD_AI_GATEWAY_URL']) delete process.env[key];
if (process.argv.includes('--gateway')) await writeFile(path.join(root, 'ai-routing.json'), JSON.stringify({ mode: 'gateway', url: 'http://127.0.0.1:4330', alias: 'board-vision' }), { mode: 0o600 });
const server = (await createApp({ store: new Store(root), ui: true })).listen(4393, '127.0.0.1');
await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
const base = 'http://127.0.0.1:4393';
async function call(route: string, method: string, body: unknown): Promise<SessionView> {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
const view = await call('/api/sessions', 'POST', { gamePackId: 'rummikub', name: '루미큐브 · 합성 편집 예시' });
const table = emptyRummikub(), rack = emptyRummikub('red');
table.coverage = 'partial';
table.groups = [{ id: 'run', label: '재배열 중인 묶음', tiles: [1, 7, 13].map(number => ({ ...createRummikubTile(`blue-${number}`), kind: 'number', color: 'blue', number })) }];
table.loose = [{ ...createRummikubTile('red-copy-a'), kind: 'number', color: 'red', number: 1 }, { ...createRummikubTile('red-copy-b'), kind: 'number', color: 'red', number: 1 }, { ...createRummikubTile('joker'), kind: 'joker' }];
rack.groups = [{ id: 'rack-row', label: '받침대 첫 줄', tiles: [{ ...createRummikubTile('rack-black-13'), kind: 'number', color: 'black', number: 13 }, createRummikubTile('rack-unknown')] }];
const route = `/api/sessions/${view.session.id}`;
await call(route, 'PATCH', { answers: [...rummikubAnswers(table), ...rummikubAnswers(rack, 'red'), { field: 'currentPlayer', value: 'blue' }], notes: { public: '합성 예시입니다. 합법적인 묶음을 뜻하지 않아요.', red: '타일 색은 플레이어 표시색과 별개예요.' } });
await call(`${route}/commit`, 'POST', { allowIncomplete: true });
console.log(JSON.stringify({ url: `${base}/?session=${view.session.id}`, rackUrl: `${base}/?session=${view.session.id}&player=red`, syntheticOnly: true, aiConfigured: (await getAIStatus()).configured }));
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => { server.close(); server.closeAllConnections(); });
