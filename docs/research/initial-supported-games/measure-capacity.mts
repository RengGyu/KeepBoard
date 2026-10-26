// Research only. Imports pure definitions; no server, store, settings or AI calls.
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { catanPack } from '../../../gamepacks/catan.ts';
import { CATAN_TOPOLOGY, normalizeSceneDetailed } from '../../../shared/scene.ts';

const root = new URL('../../../', import.meta.url);
const out = new URL('./', import.meta.url);
const bytes = (value: unknown) => Buffer.from(JSON.stringify(value), 'utf8');
const rows: Record<string, unknown>[] = [];
const paths = [
  'docs/research/lightweight-game-onboarding/profile.template.json',
  'docs/research/lightweight-game-onboarding/examples/ti4.profile.json',
  'docs/research/lightweight-game-onboarding/examples/arkham.profile.json',
  'docs/lightweight-catan-trial/profile.json',
  'docs/lightweight-catan-trial/compiled-profile.json',
];
for (const path of paths) {
  const raw = await readFile(new URL(path, root));
  const value = JSON.parse(raw.toString('utf8'));
  const compact = bytes(value);
  rows.push({ path, file_bytes: raw.byteLength, compact_json_bytes: compact.byteLength,
    compact_gzip9_bytes: gzipSync(compact, { level: 9 }).byteLength,
    sha256_file: createHash('sha256').update(raw).digest('hex'),
    fields_count: Array.isArray(value.fields) ? value.fields.length : null });
}
const compact = bytes(catanPack);
rows.unshift({ path: 'gamepacks/catan.ts + gamepacks/catanProfile.ts (export catanPack)',
  compact_json_bytes: compact.byteLength,
  pretty_json_bytes: Buffer.byteLength(JSON.stringify(catanPack, null, 2), 'utf8'),
  compact_gzip9_bytes: gzipSync(compact, { level: 9 }).byteLength,
  sha256_compact: createHash('sha256').update(compact).digest('hex'),
  version: catanPack.version, fields_count: catanPack.fields.length,
  requirements_count: catanPack.requirements.length,
  derived_rules_count: catanPack.derivedRules.length });
const sources = [];
for (const path of ['gamepacks/catan.ts', 'gamepacks/catanProfile.ts', 'shared/scene.ts']) {
  const raw = await readFile(new URL(path, root));
  sources.push({ path, file_bytes: raw.byteLength, sha256: createHash('sha256').update(raw).digest('hex') });
}
const sample = normalizeSceneDetailed({ version: 2, coverage: 'partial', components: [
  { id: 'synthetic-extra-hex', kind: 'terrain', variant: 'sea', quantity: 1, ownerId: null,
    location: { type: 'hex', id: 'r6c1' }, region: null, evidenceId: null },
  { id: 'synthetic-ship', kind: 'ship', quantity: 1, ownerId: null,
    location: { type: 'edge', id: 'r3c3.NE' }, region: null, evidenceId: null },
] });
const result = { measured_at: new Date().toISOString(), evidence_level: 'VERIFIED_LOCAL',
  scope: '현재 정의와 허용된 연구 프로필의 UTF-8/JSON/gzip byte. 평균 게임/확장/PDF/아트 크기 측정 아님.',
  definitions: rows, source_files: sources,
  topology: { id: CATAN_TOPOLOGY.id, hexes: CATAN_TOPOLOGY.hexes.length,
    vertices: CATAN_TOPOLOGY.vertices.length, edges: CATAN_TOPOLOGY.edges.length },
  synthetic_current_contract_probe: { input_summary: '새 hex r6c1, 새 kind ship; 합성 값만 사용',
    components: sample.scene.components.map(c => ({ id: c.id, kind: c.kind, variant: c.variant, location: c.location })),
    adjustments: sample.adjustments },
};
await writeFile(new URL('measurements.json', out), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ definitions: rows, topology: result.topology, probe: result.synthetic_current_contract_probe }, null, 2));
