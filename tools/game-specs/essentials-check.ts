import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { validateSpecification } from './validate.ts';

type Row = Record<string, any>;
const F001_OLD='가족 원반·울타리·외양간은 개인색 구성물이다. 개인 공급과 농장/행동칸의 위치를 구별한다. 개인당 가족5·울타리15·외양간4가 표기되지만 이 묶음의 단일 quantity로 합산하지 않는다. 대표형의 정체와 이 범위만 확인했으며 전체 인쇄 앞면·전체 규칙 검증은 아니다.';
const F001_NEW='가족 말(사람형)·울타리·외양간은 개인색 구성물이다. 개인 공급과 농장/행동칸의 위치를 구별한다. 개인당 가족5·울타리15·외양간4가 표기되지만 이 묶음의 단일 quantity로 합산하지 않는다. 대표형의 정체와 이 범위만 확인했으며 전체 인쇄 앞면·전체 규칙 검증은 아니다.';
/** Approved F001 only; never use mutable receipt hashes to allow arbitrary component changes. */
export function expectedEssentialsComponents(gameId:string,baseline:Row[]):Row[]{
 const expected=structuredClone(baseline);
 if(gameId==='agricola'&&expected[1]?.id==='people'&&expected[1].description===F001_OLD)expected[1].description=F001_NEW;
 return expected;
}
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const read = async (file: string) => JSON.parse(await readFile(file, 'utf8'));

/** Data invariants only. A passing result never certifies game rules or recognition. */
export async function checkEssentials(root = process.cwd()) {
  const prefix = `${root}/docs/game-essentials/`;
  const baseline: Row[] = await read(prefix + 'baseline.json');
  const manifest = await read(prefix + 'manifest.json');
  const evidence = await read(prefix + 'evidence.json');
  const errors: string[] = [];
  const specs = new Map<string, Row>();
  const gameFiles = await readdir(`${root}/docs/research/game-specs-120/games`);
  if (gameFiles.filter(f => f.endsWith('.json')).length !== 120) errors.push('expected 120 specification files');
  if (baseline.length !== 120 || manifest.games.length !== 120) errors.push('expected 120 baseline/manifest rows');
  if (new Set(manifest.games.map((r: Row) => r.game_id)).size !== 120) errors.push('manifest IDs are not unique');
  for (const old of baseline) {
    const row = manifest.games.find((r: Row) => r.game_id === old.game_id);
    const raw = await readFile(`${root}/${old.path}`, 'utf8');
    const spec = JSON.parse(raw);
    specs.set(spec.game_id, spec);
    if (!row || row.final_sha256 !== sha(raw)) errors.push(`${old.game_id}: missing row or stale digest`);
    if (!validateSpecification(spec).valid) errors.push(`${old.game_id}: original schema/references invalid`);
    if (spec.game_id !== old.spec.game_id || spec.schema_version !== old.spec.schema_version || JSON.stringify(spec.edition) !== JSON.stringify(old.spec.edition)) errors.push(`${old.game_id}: stable ID/schema/edition changed`);
    if (JSON.stringify(spec.components) !== JSON.stringify(expectedEssentialsComponents(old.game_id,old.spec.components))) errors.push(`${old.game_id}: components changed`);
    for (const prior of old.spec.state_fields) {
      const field = spec.state_fields.find((f: Row) => f.id === prior.id);
      if (!field) { errors.push(`${old.game_id}: removed field ${prior.id}`); continue; }
      for (const key of ['scope', 'visibility', 'type', 'lifetime', 'options', 'visible_to_roles', 'option_source', 'confidence']) {
        if (JSON.stringify(field[key]) !== JSON.stringify(prior[key])) errors.push(`${old.game_id}.${prior.id}: changed ${key}`);
      }
    }
    for (const [actual, previous, name] of [
      [spec.resume.required_field_ids, old.spec.resume.required_field_ids, 'required'],
      [spec.recognition_correction.must_ask_field_ids, old.spec.recognition_correction.must_ask_field_ids, 'must_ask'],
    ]) if (JSON.stringify(actual) !== JSON.stringify(previous)) errors.push(`${old.game_id}: expanded ${name}`);
    if (spec.resume.opening_policy !== 'retain-saved-turn') errors.push(`${old.game_id}: saved turn policy lost`);
    for (const field of spec.state_fields.filter((f: Row) => !old.spec.state_fields.some((p: Row) => p.id === f.id))) {
      if (!field.source_refs.some((ref: string) => evidence.sources.some((s: Row) => s.spec_source_id === ref && s.game_id === spec.game_id && s.location && s.url))) errors.push(`${spec.game_id}.${field.id}: missing scoped primary evidence`);
      if (field.visibility !== 'public' && (field.acquisition.includes('photo') || spec.recognition_correction.photographable_field_ids.includes(field.id))) errors.push(`${spec.game_id}.${field.id}: hidden content requested as photo`);
    }
    if (spec.game_id !== 'catan') {
      const covered = new Set(spec.resume.preserve_procedures.flatMap((p: Row) => p.field_ids));
      for (const field of spec.state_fields.filter((f: Row) => f.type === 'component-scene')) {
        if (!covered.has(field.id)) errors.push(`${spec.game_id}.${field.id}: missing physical preservation path`);
      }
      for (const p of spec.resume.preserve_procedures.filter((p: Row) => p.id.includes('essentials'))) {
        if (p.confidence !== 'recommendation') errors.push(`${spec.game_id}.${p.id}: packing advice promoted to verified rule`);
      }
    }
  }
  for (const source of evidence.sources) {
    if (!specs.has(source.game_id) || !source.location || !source.edition || !source.url) errors.push(`${source.game_id}: incomplete source receipt`);
    if (source.local_text) {
      const raw = await readFile(`${root}/${source.local_text}`, 'utf8');
      if (sha(raw) !== source.local_text_sha256) errors.push(`${source.game_id}: local text hash mismatch`);
    }
  }
  return { valid: errors.length === 0, games: specs.size, officialScopedGames: evidence.sources.length, errors, factualCompleteness: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await checkEssentials();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.valid ? 0 : 1;
}
