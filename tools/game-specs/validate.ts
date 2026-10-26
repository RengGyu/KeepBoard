import { readFile } from 'node:fs/promises';

export type Issue = { path: string; code: string; message: string };
export type Specification = Record<string, any>;
export const specificationSchema = JSON.parse(await readFile(new URL('../../game-specifications/schema.json', import.meta.url), 'utf8'));
const object = (v: unknown): v is Record<string, any> => v !== null && typeof v === 'object' && !Array.isArray(v);
const canonical = (v: any): any => Array.isArray(v) ? v.map(canonical) : object(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const equal = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const pointer = (key: string) => key.replaceAll('~', '~0').replaceAll('/', '~1');
const resolve = (root: any, ref: string) => ref.startsWith('#/') ? ref.slice(2).split('/').reduce((n, k) => n?.[k.replaceAll('~1', '/').replaceAll('~0', '~')], root) : undefined;
const keywords = new Set(['$schema','$id','$defs','$ref','title','description','type','enum','const','properties','required','additionalProperties','items','minItems','uniqueItems','minLength','pattern','minimum','maximum']);

/** Fail closed if the maintained schema starts using a keyword this dependency-free runner cannot evaluate. */
export function inspectSchema(root = specificationSchema): Issue[] {
  const issues: Issue[] = [];
  function walk(node: any, path: string) {
    const fail = (message: string) => issues.push({ path, code: 'schema', message });
    if (typeof node === 'boolean') return;
    if (!object(node)) { fail('Schema must be an object or boolean.'); return; }
    for (const key of Object.keys(node)) if (!keywords.has(key)) fail(`Unsupported schema keyword: ${key}`);
    if (node.$ref !== undefined && (typeof node.$ref !== 'string' || resolve(root, node.$ref) === undefined)) fail('Only existing local JSON Pointer references are supported.');
    if (node.type !== undefined) {
      const types = Array.isArray(node.type) ? node.type : [node.type];
      if (!types.length || new Set(types).size !== types.length || !types.every((t: unknown) => ['null','object','array','string','number','integer','boolean'].includes(String(t)))) fail('Invalid type keyword.');
    }
    if (node.enum !== undefined && (!Array.isArray(node.enum) || !node.enum.length)) fail('enum must be a nonempty array.');
    if (node.required !== undefined && (!Array.isArray(node.required) || node.required.some((k: unknown) => typeof k !== 'string'))) fail('required must be an array of property names.');
    for (const key of ['minItems','minLength']) if (node[key] !== undefined && (!Number.isInteger(node[key]) || node[key] < 0)) fail(`${key} must be a nonnegative integer.`);
    for (const key of ['minimum','maximum']) if (node[key] !== undefined && (typeof node[key] !== 'number' || !Number.isFinite(node[key]))) fail(`${key} must be finite.`);
    if (node.uniqueItems !== undefined && typeof node.uniqueItems !== 'boolean') fail('uniqueItems must be boolean.');
    if (node.pattern !== undefined) { try { if (typeof node.pattern !== 'string') throw Error(); new RegExp(node.pattern, 'u'); } catch { fail('Invalid pattern.'); } }
    for (const key of ['properties','$defs']) if (node[key] !== undefined) {
      if (!object(node[key])) fail(`${key} must be an object.`);
      else for (const [name, child] of Object.entries(node[key])) walk(child, `${path}/${key}/${pointer(name)}`);
    }
    for (const key of ['items','additionalProperties']) if (node[key] !== undefined) walk(node[key], `${path}/${key}`);
  }
  walk(root, '#'); return issues;
}

export function validateSchema(value: unknown, schema = specificationSchema): Issue[] {
  const issues = inspectSchema(schema);
  if (issues.length) return issues;
  function check(value: any, node: any, path: string, depth: number) {
    const fail = (code: string, message: string) => issues.push({ path: path || '/', code, message });
    if (depth > 100) { fail('depth', 'Definition nesting limit exceeded.'); return; }
    if (node === true) return;
    if (node === false) { fail('schema', 'Value is not allowed.'); return; }
    if (node.$ref) check(value, resolve(schema, node.$ref), path, depth + 1);
    const matches = (type: string) => type === 'null' ? value === null : type === 'object' ? object(value) : type === 'array' ? Array.isArray(value) : type === 'integer' ? Number.isInteger(value) : type === 'number' ? typeof value === 'number' && Number.isFinite(value) : typeof value === type;
    if (node.type && !(Array.isArray(node.type) ? node.type : [node.type]).some(matches)) { fail('type', `Expected ${[].concat(node.type).join('|')}.`); return; }
    if ('const' in node && !equal(value, node.const)) fail('const', 'Value does not match the declared constant.');
    if (node.enum && !node.enum.some((v: unknown) => equal(v, value))) fail('enum', 'Value is outside the declared enumeration.');
    if (typeof value === 'string') {
      if (node.minLength !== undefined && [...value].length < node.minLength) fail('minLength', 'String is too short.');
      if (node.pattern && !new RegExp(node.pattern, 'u').test(value)) fail('pattern', 'String does not match the declared pattern.');
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) fail('number', 'Number must be finite.');
      if (node.minimum !== undefined && value < node.minimum) fail('minimum', 'Number is below the minimum.');
      if (node.maximum !== undefined && value > node.maximum) fail('maximum', 'Number exceeds the maximum.');
    }
    if (Array.isArray(value)) {
      if (node.minItems !== undefined && value.length < node.minItems) fail('minItems', 'Array is too short.');
      if (node.uniqueItems && new Set(value.map(v => JSON.stringify(canonical(v)))).size !== value.length) fail('uniqueItems', 'Array contains repeated values.');
      if (node.items !== undefined) value.forEach((v, i) => check(v, node.items, `${path}/${i}`, depth + 1));
    } else if (object(value)) {
      for (const key of node.required ?? []) if (!Object.hasOwn(value, key)) issues.push({ path: `${path}/${pointer(key)}`, code: 'required', message: 'Required property is missing.' });
      for (const [key, child] of Object.entries(value)) {
        if (Object.hasOwn(node.properties ?? {}, key)) check(child, node.properties[key], `${path}/${pointer(key)}`, depth + 1);
        else if (node.additionalProperties === false) issues.push({ path: `${path}/${pointer(key)}`, code: 'additionalProperties', message: 'Unknown property; input was not silently discarded.' });
        else if (object(node.additionalProperties)) check(child, node.additionalProperties, `${path}/${pointer(key)}`, depth + 1);
      }
    }
  }
  check(value, schema, '', 0); return issues;
}

const collections: Record<string, { path: string[]; definition: string }> = {
  components: { path: ['components'], definition: 'component' }, areas: { path: ['layout','areas'], definition: 'area' },
  relations: { path: ['layout','relations'], definition: 'relation' }, state_fields: { path: ['state_fields'], definition: 'field' },
  rules: { path: ['rules'], definition: 'rule' }, preserve_procedures: { path: ['resume','preserve_procedures'], definition: 'preserve' },
  correction_targets: { path: ['recognition_correction','correction_targets'], definition: 'target' },
};
function extensionOrder(spec: Specification, selected: string[], issues: Issue[]) {
  const map = new Map<string, any>(spec.extensions.map((e: any) => [e.id, e]));
  const visited = new Set<string>(), visiting = new Set<string>(), ordered: any[] = [];
  const fail = (code: string, message: string) => issues.push({ path: '/extensions', code, message });
  const visit = (id: string) => {
    if (visiting.has(id)) { fail('extension-cycle', `Dependency cycle at ${id}.`); return; }
    if (visited.has(id)) return;
    const extension = map.get(id);
    if (!extension) { fail('reference', `Unknown extension ${id}.`); return; }
    visiting.add(id); for (const dependency of extension.requires) visit(dependency);
    visiting.delete(id); visited.add(id); ordered.push(extension);
  };
  for (const id of selected) visit(id);
  const ids = new Set(ordered.map(e => e.id));
  for (const e of ordered) {
    for (const conflict of e.conflicts) if (ids.has(conflict)) fail('extension-conflict', `${e.id} conflicts with ${conflict}.`);
  }
  if (ordered.filter(e => e.kind === 'edition').length > 1) fail('edition', 'Select at most one edition patch.');
  return ordered;
}

function patchSpecification(spec: Specification, selected: string[]): { specification: Specification; issues: Issue[]; applied: string[] } {
  const issues: Issue[] = [], result = structuredClone(spec);
  const order = extensionOrder(spec, selected, issues);
  if (issues.length) return { specification: result, issues, applied: [] };
  for (const extension of order) {
    if (!extension.compatible_edition_ids.includes(result.edition.id)) { issues.push({ path: `/extensions/${extension.id}`, code: 'edition', message: 'Extension is incompatible with the edition after its dependencies.' }); continue; }
    for (const patch of extension.patches) {
      const path = `/extensions/${extension.id}/patches/${patch.id}`;
      const fail = (message: string) => issues.push({ path, code: 'patch', message });
      if (patch.collection === 'edition') {
        if (extension.kind !== 'edition' || patch.op !== 'replace') { fail('Only an edition extension may explicitly replace edition metadata.'); continue; }
        result.edition = structuredClone(patch.value); continue;
      }
      const collection = collections[patch.collection];
      if (!collection) { fail('Unsupported patch collection.'); continue; }
      const items = collection.path.reduce((v, key) => v[key], result) as any[];
      const index = items.findIndex(v => v.id === patch.id);
      if (patch.op === 'add' && index >= 0) { fail('Add would overwrite an existing ID.'); continue; }
      if (patch.op !== 'add' && index < 0) { fail('Replace/remove target does not exist.'); continue; }
      if (patch.op === 'remove') items.splice(index, 1);
      else if (patch.op === 'add') items.push(structuredClone(patch.value));
      else items[index] = structuredClone(patch.value);
    }
  }
  for (const extension of order.filter(e => e.kind !== 'edition')) if (!extension.compatible_edition_ids.includes(result.edition.id)) issues.push({ path: `/extensions/${extension.id}`, code: 'edition', message: 'Selected extension is incompatible with the final edition.' });
  return { specification: result, issues, applied: order.map(e => e.id) };
}

function semanticIssues(spec: Specification): Issue[] {
  const issues: Issue[] = [];
  const fail = (path: string, code: string, message: string) => issues.push({ path, code, message });
  const groups: Record<string, any[]> = { components: spec.components, areas: spec.layout.areas, relations: spec.layout.relations, state_fields: spec.state_fields, rules: spec.rules, preserve_procedures: spec.resume.preserve_procedures, correction_targets: spec.recognition_correction.correction_targets, sources: spec.sources, extensions: spec.extensions, roles: spec.roles ?? [] };
  const sets = Object.fromEntries(Object.entries(groups).map(([name, rows]) => [name, new Set(rows.map(r => r.id))]));
  for (const [name, rows] of Object.entries(groups)) if (sets[name].size !== rows.length) fail(`/${name}`, 'duplicate-id', 'IDs must be unique within their collection.');
  const refs = (values: string[], group: string, path: string) => { for (const id of values) if (!sets[group].has(id)) fail(path, 'reference', `Unknown ${group} ID: ${id}`); };
  const visibility = (v: any, path: string) => {
    if (['owner','own-hidden'].includes(v.visibility) && v.scope !== 'player') fail(path, 'privacy', 'Owner/own-hidden visibility requires player scope.');
    if (v.scope === 'public' && v.visibility !== 'public') fail(path, 'privacy', 'Use player or shared-secret scope for nonpublic records.');
    if (v.scope === 'shared-secret' && !['hidden','role-limited'].includes(v.visibility)) fail(path, 'privacy', 'Shared secrets must stay hidden or role-limited.');
    if (v.visibility === 'role-limited' && !v.visible_to_roles?.length) fail(path, 'privacy', 'Role-limited data must declare visible_to_roles.');
    if (v.visibility !== 'role-limited' && v.visible_to_roles?.length) fail(path, 'privacy', 'visible_to_roles requires role-limited visibility.');
    refs(v.visible_to_roles ?? [], 'roles', path + '/visible_to_roles');
  };
  function condition(c: any, path: string) {
    if (!c) return;
    if (['and','or','not'].includes(c.op)) {
      if (!c.conditions?.length || c.op === 'not' && c.conditions.length !== 1 || c.field_id !== undefined || 'value' in c) fail(path, 'condition', 'Logical conditions need children only (not has exactly one).');
      c.conditions?.forEach((child: any, i: number) => condition(child, `${path}/conditions/${i}`));
    } else {
      if (!c.field_id || c.conditions !== undefined) fail(path, 'condition', 'Atomic condition needs one field_id and no children.');
      if (c.field_id) refs([c.field_id], 'state_fields', path);
      if (['eq','neq','gt'].includes(c.op) && !('value' in c)) fail(path, 'condition', 'Comparison value is missing.');
    }
  }
  function evidence(v: any, path: string) {
    refs(v.source_refs, 'sources', path + '/source_refs');
    if (v.confidence === 'verified' && (!v.source_refs.length || !v.source_refs.some((id: string) => spec.sources.some((s: any) => s.id === id && s.access === 'opened')))) fail(path, 'evidence', 'verified requires an opened source reference; this checks metadata, not rule truth.');
  }
  evidence(spec.edition, '/edition');
  if (spec.confidence === 'verified' && !spec.sources.some((s: any) => s.access === 'opened')) fail('/confidence', 'evidence', 'verified needs opened source metadata; this is not factual verification.');
  for (const group of ['components','areas','relations','state_fields','rules','preserve_procedures','extensions']) groups[group].forEach((v, i) => {
    const path = `/${group}/${i}`; evidence(v, path);
    for (const [key, target] of [['component_ids','components'],['area_ids','areas'],['field_ids','state_fields'],['rule_ids','rules'],['required_field_ids','state_fields'],['after','preserve_procedures'],['requires','extensions'],['conflicts','extensions']] as const) if (v[key]) refs(v[key], target, path + '/' + key);
    if (v.visibility) visibility(v, path);
    if (group === 'rules' && v.scope === 'public' && v.field_ids.some((id: string) => spec.state_fields.find((f: any) => f.id === id)?.visibility !== 'public')) fail(path, 'privacy', 'Public rules cannot depend on owner-only or hidden fields.');
    if (group === 'preserve_procedures') {
      const fields = spec.state_fields.filter((f: any) => v.field_ids.includes(f.id));
      if (v.visibility === 'public' && fields.some((f: any) => f.visibility !== 'public') || v.visibility === 'owner' && fields.some((f: any) => f.visibility === 'own-hidden')) fail(path, 'privacy', 'Preservation must not reveal its linked hidden fields.');
      if (v.visibility === 'role-limited' && fields.some((f: any) => f.visibility === 'role-limited' && v.visible_to_roles.some((r: string) => !f.visible_to_roles?.includes(r)))) fail(path, 'privacy', 'Preservation roles exceed field visibility.');
    }
    if (v.from_area_id) refs([v.from_area_id, v.to_area_id], 'areas', path);
    if (v.topology && (v.dynamic && v.fixed_slot_count !== null)) fail(path, 'layout', 'Dynamic areas must not assert a fixed slot count.');
    if (v.kind === 'derived' && !v.effect) fail(path, 'rule', 'Derived rule needs an effect.');
    if (v.kind === 'requirement' && !v.required_field_ids?.length) fail(path, 'rule', 'Requirement needs referenced field IDs.');
    if (v.effect) refs([v.effect.field_id], 'state_fields', path + '/effect');
    condition(v.when, path + '/when');
  });
  for (const [i, f] of spec.state_fields.entries()) {
    if (f.type === 'enum' && !f.options?.length && !f.option_source) fail(`/state_fields/${i}`, 'enum', 'Enum field needs labeled options or an explicit dynamic option_source.');
    if (f.option_source && f.type !== 'enum') fail(`/state_fields/${i}`, 'enum', 'Dynamic option sources are for enum fields only.');
    if (f.option_source === 'roles' && !spec.roles?.length) fail(`/state_fields/${i}`, 'enum', 'Role option source requires declared roles.');
    if (f.options && new Set(f.options.map((o: any) => o.value)).size !== f.options.length) fail(`/state_fields/${i}`, 'duplicate-id', 'Option values must be unique.');
    if (f.acquisition.includes('derived') && spec.recognition_correction.photographable_field_ids.includes(f.id)) fail(`/state_fields/${i}`, 'recognition', 'Derived output cannot be independent photographic input.');
  }
  for (const key of ['required_field_ids','pending_action_fields']) refs(spec.resume[key], 'state_fields', '/resume/' + key);
  for (const key of ['photographable_field_ids','must_ask_field_ids']) refs(spec.recognition_correction[key], 'state_fields', '/recognition_correction/' + key);
  for (const id of spec.recognition_correction.photographable_field_ids) if (!spec.state_fields.find((f: any) => f.id === id)?.acquisition.includes('photo')) fail('/recognition_correction/photographable_field_ids', 'recognition', 'Photo input must declare photo acquisition.');
  for (const id of spec.recognition_correction.must_ask_field_ids) if (!spec.state_fields.find((f: any) => f.id === id)?.acquisition.includes('manual')) fail('/recognition_correction/must_ask_field_ids', 'recognition', 'Asked input must declare manual acquisition.');
  for (const [i, target] of spec.recognition_correction.correction_targets.entries()) {
    for (const [key, group] of [['component_ids','components'],['area_ids','areas'],['field_ids','state_fields']] as const) refs(target[key], group, `/recognition_correction/correction_targets/${i}/${key}`);
    if (target.scope === 'public' && target.field_ids.some((id: string) => spec.state_fields.find((f: any) => f.id === id)?.visibility !== 'public')) fail(`/recognition_correction/correction_targets/${i}`, 'privacy', 'Public correction cannot expose nonpublic fields.');
  }
  refs(spec.custom_setup.editable_area_ids, 'areas', '/custom_setup/editable_area_ids');
  refs(spec.custom_setup.editable_component_ids, 'components', '/custom_setup/editable_component_ids');
  refs(spec.custom_setup.invariant_rule_ids, 'rules', '/custom_setup/invariant_rule_ids');
  const procedures = new Map<string, any>(spec.resume.preserve_procedures.map((p: any) => [p.id, p]));
  const visited = new Set<string>(), visiting = new Set<string>();
  function visit(id: string) { if (visiting.has(id)) { fail('/resume/preserve_procedures', 'preserve-cycle', 'Preservation dependencies contain a cycle.'); return; } if (visited.has(id)) return; visiting.add(id); for (const after of procedures.get(id)?.after ?? []) visit(after); visiting.delete(id); visited.add(id); }
  for (const id of procedures.keys()) visit(id);
  return issues;
}

export function validateSpecification(input: unknown, options: { catalogIds?: ReadonlySet<string>; extensions?: string[] } = {}) {
  const issues = validateSchema(input), warnings: Issue[] = [];
  if (issues.length) return { valid: false, issues, warnings, applied: [] as string[], specification: null };
  const spec = input as Specification;
  issues.push(...semanticIssues(spec));
  if (options.catalogIds && !options.catalogIds.has(spec.game_id)) issues.push({ path: '/game_id', code: 'catalog', message: 'Game ID is not in the selected catalog.' });
  for (const [i, e] of spec.extensions.entries()) {
    if (e.kind === 'edition' && e.patches.filter((p: any) => p.collection === 'edition').length !== 1) issues.push({ path: `/extensions/${i}`, code: 'edition', message: 'Edition extension must explicitly replace edition metadata once.' });
    for (const [j, p] of e.patches.entries()) {
      const path = `/extensions/${i}/patches/${j}`;
      if (p.op === 'remove') { if ('value' in p) issues.push({ path, code: 'patch', message: 'Remove cannot carry a replacement value.' }); continue; }
      const definition = p.collection === 'edition' ? 'edition' : collections[p.collection]?.definition;
      if (!object(p.value)) issues.push({ path, code: 'patch', message: 'Add/replace needs a value object.' });
      else if (definition) {
        const wrapper = { $defs: specificationSchema.$defs, $ref: '#/$defs/' + definition };
        issues.push(...validateSchema(p.value, wrapper).map(issue => ({ ...issue, path: path + '/value' + (issue.path === '/' ? '' : issue.path) })));
        if (p.value.id !== p.id) issues.push({ path, code: 'patch', message: 'Patch ID must equal the value ID.' });
      }
    }
  }
  if (issues.length) return { valid: false, issues, warnings, applied: [], specification: null };
  // Check each extension with its dependency closure. Combinations are checked on explicit selection.
  for (const e of spec.extensions) {
    const branch = patchSpecification(spec, [e.id]); issues.push(...branch.issues);
    if (!branch.issues.length) { const shape = validateSchema(branch.specification); issues.push(...shape); if (!shape.length) issues.push(...semanticIssues(branch.specification).map(issue => ({ ...issue, path: `/extensions/${e.id}/resolved${issue.path}` }))); }
  }
  const resolved = patchSpecification(spec, options.extensions ?? []); issues.push(...resolved.issues);
  if (!resolved.issues.length) { const shape = validateSchema(resolved.specification); issues.push(...shape); if (!shape.length) issues.push(...semanticIssues(resolved.specification)); }
  if (options.extensions?.length) resolved.specification.extensions = []; // Detached materialization; source recipes remain in the original input and import manifest.
  if (spec.confidence === 'unclear' || spec.gaps.length) warnings.push({ path: '/gaps', code: 'research-gap', message: 'Structural validity does not resolve declared research gaps.' });
  return { valid: !issues.length, issues, warnings, applied: resolved.applied, specification: issues.length ? null : resolved.specification };
}

export function catalogCoverage(specifications: Specification[], catalogIds: ReadonlySet<string>) {
  const counts = new Map<string, number>();
  for (const spec of specifications) counts.set(spec.game_id, (counts.get(spec.game_id) ?? 0) + 1);
  const duplicate = [...counts].filter(([, n]) => n > 1).map(([id]) => id).sort();
  const unknown = [...counts.keys()].filter(id => !catalogIds.has(id)).sort();
  const missing = [...catalogIds].filter(id => !counts.has(id)).sort();
  return { expected: catalogIds.size, present: [...counts.keys()].filter(id => catalogIds.has(id)).length, missing, unknown, duplicate, complete: !missing.length && !unknown.length && !duplicate.length };
}

/** Object key ordering only; no inferred defaults, translations, array sorting or fact repair. */
export const normalizedJSON = (spec: Specification) => JSON.stringify(canonical(spec), null, 2) + '\n';
