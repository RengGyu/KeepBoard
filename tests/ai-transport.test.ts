import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { analyzeEvidence, getAIStatus, saveAISettings } from '../server/ai/index.ts';
import type { Evidence, GamePack, Session } from '../shared/types.ts';

test('Gemini and Responses adapters send original image bytes and return evidence-linked candidates', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'keepboard-ai-'));
  const previous = process.env.KEEPBOARD_DATA_DIR;
  process.env.KEEPBOARD_DATA_DIR = directory;
  const received: { url: string; body: any }[] = [];
  const modelReply = JSON.stringify({ summary: '목재 3개', assertions: [{ field: 'wood', value: 3, evidenceIds: ['photo'], confidence: 0.9 }] });
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    received.push({ url: request.url!, body: JSON.parse(Buffer.concat(chunks).toString()) });
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(request.url?.endsWith('/responses')
      ? { output: [{ type: 'message', content: [{ type: 'output_text', text: modelReply }] }] }
      : { candidates: [{ content: { parts: [{ text: modelReply }] } }] }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const baseUrl = `http://127.0.0.1:${address.port}/v1`;
  const pack = { title: 'test', edition: 'test', version: '1', fields: [{ key: 'wood', scope: 'public', type: 'number', acquisition: 'observe' }] } as GamePack;
  const evidence: Evidence[] = [{ id: 'photo', url: 'data:image/png;base64,aGVsbG8=', label: '원본', capturedAt: '2026-10-20', captureEpoch: 'epoch', scope: 'public', kind: 'photo' }];
  const session = { assertions: [], players: [], turnInstanceId: 'actual-turn' } as unknown as Session;
  try {
    for (const provider of ['gemini', 'openai'] as const) {
      await saveAISettings({ provider, apiKey: 'local-test-only', model: 'test-vision', baseUrl });
      const status = await getAIStatus();
      assert.equal(status.configured, true);
      assert.equal('apiKey' in status, false);
      const result = await analyzeEvidence({ session, evidence, pack });
      assert.equal(result.mode, 'live');
      assert.equal(result.assertions[0].value, 3);
      assert.deepEqual(result.assertions[0].evidenceIds, ['photo']);
    }
    assert.match(received[0].url, /models\/test-vision:generateContent/);
    assert.equal(received[0].body.contents[0].parts[1].inline_data.data, 'aGVsbG8=');
    assert.equal(received[1].url, '/v1/responses');
    assert.equal(received[1].body.input[0].content[1].image_url, evidence[0].url);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (previous === undefined) delete process.env.KEEPBOARD_DATA_DIR;
    else process.env.KEEPBOARD_DATA_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
