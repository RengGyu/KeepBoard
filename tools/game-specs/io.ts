import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { catalogCoverage, normalizedJSON, validateSpecification, type Specification } from './validate.ts';

export const defaultCatalog = new URL('../../docs/research/initial-supported-games/catalog.json', import.meta.url);
export async function readCatalog(file: string | URL = defaultCatalog) {
  const raw = JSON.parse(await readFile(file, 'utf8'));
  if (!Array.isArray(raw.games) || raw.games.some((g: any) => !g || typeof g.game_id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(g.game_id))) throw new Error('Catalog needs games with canonical game_id values.');
  const ids = new Set<string>(raw.games.map((g: any) => g.game_id));
  if (ids.size !== raw.games.length) throw new Error('Catalog contains duplicate game IDs.');
  return ids;
}

async function jsonFiles(input: string): Promise<string[]> {
  const stat = await lstat(input);
  if (stat.isSymbolicLink()) throw new Error('Specification input must not be a symlink.');
  if (stat.isFile()) {
    if (path.extname(input) !== '.json') throw new Error('Input files must use .json.');
    return [input];
  }
  if (!stat.isDirectory()) throw new Error('Input must be a JSON file or directory.');
  const entries = await readdir(input, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isSymbolicLink()) throw new Error('Specification directory contains a symlink.');
    if (entry.isDirectory() || entry.isFile() && entry.name.endsWith('.json')) result.push(...await jsonFiles(path.join(input, entry.name)));
  }
  return result;
}

/** Each source file is one definition. Never reinterpret catalogs, live sessions or arbitrary envelopes as specifications. */
export async function inspectInput(input: string, options: { catalog?: string; extensions?: string[] } = {}) {
  const ids = await readCatalog(options.catalog ?? defaultCatalog);
  const files = await jsonFiles(path.resolve(input));
  const results: { file: string; sha256: string; valid: boolean; issues: { path: string; code: string; message: string }[]; warnings: { path: string; code: string; message: string }[]; applied: string[] }[] = [];
  const specifications: Specification[] = [];
  const unknownIds: string[] = [];
  for (const file of files) {
    const data = await readFile(file);
    const record = { file, sha256: createHash('sha256').update(data).digest('hex') };
    try {
      const parsed = JSON.parse(data.toString('utf8'));
      const checked = validateSpecification(parsed, { catalogIds: ids, extensions: options.extensions });
      results.push({ ...record, valid: checked.valid, issues: checked.issues, warnings: checked.warnings, applied: checked.applied });
      if (checked.specification) specifications.push(checked.specification);
      else if (checked.issues.length && checked.issues.every(issue => issue.code === 'catalog')) unknownIds.push(parsed.game_id);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      results.push({ ...record, valid: false, issues: [{ path: '/', code: 'json', message: 'Invalid JSON; source contents were not printed or repaired.' }], warnings: [], applied: [] });
    }
  }
  const coverage = catalogCoverage([...specifications, ...unknownIds.map(game_id => ({ game_id }))], ids);
  return { valid: files.length > 0 && results.every(r => r.valid) && !coverage.duplicate.length && !coverage.unknown.length, files: results, coverage, specifications, factualVerification: false as const };
}

/** Publish only to a NEW directory after every input has passed. Source files are never edited. */
export async function importSpecifications(input: string, destination: string, options: { catalog?: string; extensions?: string[]; complete?: boolean } = {}) {
  const inspected = await inspectInput(input, options);
  if (!inspected.valid || options.complete && !inspected.coverage.complete) throw new Error('Import rejected; validate inputs/coverage first. No output was written.');
  const output = path.resolve(destination);
  if (output === path.parse(output).root) throw new Error('Output must be a new specification directory.');
  try { await lstat(output); throw new Error('Output already exists; no files were overwritten.'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const parent = path.dirname(output);
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(path.join(parent, '.game-specs-import-'));
  try {
    for (const spec of inspected.specifications) await writeFile(path.join(staging, `${spec.game_id}.json`), normalizedJSON(spec), { flag: 'wx' });
    await writeFile(path.join(staging, '.import-manifest.json'), JSON.stringify({ schema_version: '1.0', factualVerification: false, coverage: inspected.coverage, sources: inspected.files, selected_extensions: options.extensions ?? [] }, null, 2) + '\n', { flag: 'wx' });
    await rename(staging, output);
  } catch (error) { await rm(staging, { recursive: true, force: true }); throw error; }
  return { destination: output, ...inspected };
}
