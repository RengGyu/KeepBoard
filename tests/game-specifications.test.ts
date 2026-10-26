import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { catalogCoverage, inspectSchema, normalizedJSON, validateSchema, validateSpecification } from '../tools/game-specs/validate.ts';
import { importSpecifications, inspectInput, readCatalog } from '../tools/game-specs/io.ts';
import { catanContractProbe, fromCatanPack } from '../tools/game-specs/catan-adapter.ts';
import { catanPack } from '../gamepacks/catan.ts';
const template = JSON.parse(await readFile(new URL('../game-specifications/template.json', import.meta.url), 'utf8'));
const fixture = () => structuredClone(template);
const extension = (id: string, patches: any[], requires: string[] = [], conflicts: string[] = []) => ({ id, name: id, kind: 'expansion', compatible_edition_ids: ['edition-to-confirm'], patches, requires, conflicts, gaps: [], source_refs: [], confidence: 'unclear' });
const codes = (spec: unknown) => validateSpecification(spec).issues.map(i => i.code);

test('the reusable contract and local validator exist independently of product code', async () => {
  const schema = await readFile(new URL('../game-specifications/schema.json', import.meta.url), 'utf8').catch(() => null);
  assert.notEqual(schema, null, 'a reusable schema must exist');
  assert.equal(JSON.parse(schema!).properties.schema_version.const, '1.0');
  const validator = await import('../tools/game-specs/validate.ts').catch(() => null);
  assert.equal(typeof validator?.validateSpecification, 'function');
});

test('the schema is evaluable; valid free and dynamically growing networks do not assume 19 cells', () => {
  assert.deepEqual(inspectSchema(), []);
  assert.equal(validateSpecification(fixture()).valid, true);
  const spec = fixture(); spec.layout.areas[0].topology = 'graph';
  assert.equal(validateSpecification(spec).valid, true);
  spec.layout.areas[0].dynamic = false; spec.layout.areas[0].fixed_slot_count = 37;
  assert.equal(validateSpecification(spec).valid, true);
  spec.layout.areas[0].dynamic = true;
  assert(codes(spec).includes('layout'), 'variable slot counts cannot silently assert a fixed count');
});

test('invalid fixtures reject missing sections, false types, negative counts and unknown live-data properties', async () => {
  const invalid = JSON.parse(await readFile(new URL('../game-specifications/fixtures/invalid.json', import.meta.url), 'utf8'));
  const result = validateSpecification(invalid);
  assert.equal(result.valid, false);
  assert(result.issues.some(i => i.code === 'minimum'));
  assert(result.issues.some(i => i.code === 'additionalProperties'));
  const spec = fixture(); delete spec.resume; assert(codes(spec).includes('required'));
  spec.resume = false; assert(codes(spec).includes('type'));
  assert(inspectSchema({type:'object',oneOf:[]}).some(i => i.code === 'schema'), 'unsupported keywords must not be ignored');
  assert(inspectSchema({$ref:'https://example.test/schema'}).some(i => i.code === 'schema'), 'no remote schema fetch');
  assert(validateSchema(1,{$defs:{n:{type:'integer'}},$ref:'#/$defs/n',minimum:2}).some(i=>i.code==='minimum'),'local references must not skip sibling constraints');
});

test('IDs, rule conditions, correction references and preserve dependency cycles are checked', () => {
  const spec = fixture(); spec.components.push(structuredClone(spec.components[0])); assert(codes(spec).includes('duplicate-id'));
  spec.components.pop(); spec.layout.areas[0].component_ids.push('missing'); assert(codes(spec).includes('reference'));
  spec.layout.areas[0].component_ids.pop(); spec.rules = [{id:'r',name:'r',kind:'derived',scope:'public',summary:'synthetic',field_ids:['public.scene'],component_ids:[],area_ids:[],when:{op:'not',conditions:[]},effect:{field_id:'missing',value:true},source_refs:[],confidence:'unclear'}];
  assert(codes(spec).includes('condition'));assert(codes(spec).includes('reference'));
  spec.rules = []; const preserve = {id:'a',label:'a',scope:'public',visibility:'public',field_ids:['public.scene'],method:'photo',order_sensitive:false,steps:['사진대로'],after:['b'],source_refs:[],confidence:'unclear'};
  spec.resume.preserve_procedures=[preserve,{...preserve,id:'b',after:['a']}];assert(codes(spec).includes('preserve-cycle'));
});

test('owner-hidden and role-limited information cannot be mislabeled as public or exposed by public correction/preservation', () => {
  const spec = fixture(); const field=spec.state_fields[0];field.visibility='owner';assert(codes(spec).includes('privacy'));
  field.scope='player';spec.recognition_correction.correction_targets[0].scope='player';assert.equal(validateSpecification(spec).valid,true);
  field.visibility='own-hidden';assert.equal(validateSpecification(spec).valid,true);
  field.visibility='role-limited';assert(codes(spec).includes('privacy'));
  field.visible_to_roles=['observer'];assert(codes(spec).includes('reference'));
  spec.roles=[{id:'observer',name:'관찰자',description:'허용된 역할'}];assert.equal(validateSpecification(spec).valid,true);
  spec.recognition_correction.correction_targets[0].scope='public';assert(codes(spec).includes('privacy'));
  spec.recognition_correction.correction_targets[0].scope='player';
  spec.resume.preserve_procedures=[{id:'leak',label:'leak',scope:'public',visibility:'public',field_ids:['public.scene'],method:'manual-note',order_sensitive:false,steps:['synthetic'],after:[],source_refs:[],confidence:'unclear'}];assert(codes(spec).includes('privacy'));
});

test('source confidence checks references without claiming official-rule truth; derived fields cannot be photographic evidence', () => {
  const spec=fixture();spec.edition.confidence='verified';assert(codes(spec).includes('evidence'));
  spec.edition.source_refs=['missing'];assert(codes(spec).includes('reference'));
  spec.sources=[{id:'missing',title:'Synthetic',url:null,kind:'implementation',access:'opened',checked_at:'2026-10-21',note:'Metadata only'}];
  assert.equal(validateSpecification(spec).valid,true,'opened metadata is not a factual certificate');
  spec.state_fields[0].acquisition=['derived'];assert(codes(spec).includes('recognition'));
});

test('extension dependency closure materializes additions and replacements; originals are untouched and output revalidates', () => {
  const spec=fixture(),piece={...spec.components[0],id:'extra',name:'Extra'};
  spec.extensions=[extension('a',[{op:'add',collection:'components',id:'extra',value:piece}]),extension('b',[{op:'replace',collection:'components',id:'extra',value:{...piece,quantity:4}}],['a'])];
  const before=normalizedJSON(spec),result=validateSpecification(spec,{extensions:['b']});
  assert.equal(result.valid,true,JSON.stringify(result.issues));assert.deepEqual(result.applied,['a','b']);
  assert.equal(result.specification!.components.find((c:any)=>c.id==='extra').quantity,4);
  assert.equal(validateSpecification(result.specification).valid,true);assert.equal(normalizedJSON(spec),before);
  spec.extensions[0].requires=['b'];assert(codes(spec).includes('extension-cycle'));
});

test('conflicting branches, dangling removals, patch type/ID mismatch and silent edition changes are rejected', () => {
  const spec=fixture(),piece={...spec.components[0],id:'extra'};
  spec.extensions=[extension('a',[{op:'add',collection:'components',id:'extra',value:piece}],[],['b']),extension('b',[{op:'add',collection:'components',id:'other',value:{...piece,id:'other'}}])];
  assert(validateSpecification(spec,{extensions:['a','b']}).issues.some(i=>i.code==='extension-conflict'));
  spec.extensions=[extension('remove-piece',[{op:'remove',collection:'components',id:'piece'}])];assert.equal(validateSpecification(spec).valid,false);
  spec.extensions=[extension('bad',[{op:'add',collection:'components',id:'extra',value:{...piece,id:'mismatch'}}])];assert(codes(spec).includes('patch'));
  spec.extensions=[extension('bad',[{op:'replace',collection:'edition',id:'next-edition',value:{...spec.edition,id:'next-edition'}}])];assert(codes(spec).includes('patch'));
  spec.extensions[0].kind='edition';const changed=validateSpecification(spec,{extensions:['bad']});assert.equal(changed.valid,true);assert.equal(changed.specification!.edition.id,'next-edition');assert.equal(spec.edition.id,'edition-to-confirm');
});

test('an expansion for a changed edition requires that edition patch and is checked against the final edition', () => {
  const spec=fixture(),next={...spec.edition,id:'second-edition',name:'Second'};
  const edition={...extension('edition-two',[{op:'replace',collection:'edition',id:next.id,value:next}]),kind:'edition'};
  const expansion={...extension('new-edition-expansion',[{op:'add',collection:'components',id:'extra',value:{...spec.components[0],id:'extra'}}],['edition-two']),compatible_edition_ids:['second-edition']};
  spec.extensions=[edition,expansion];
  const result=validateSpecification(spec,{extensions:['new-edition-expansion']});
  assert.equal(result.valid,true,JSON.stringify(result.issues));assert.equal(result.specification!.edition.id,'second-edition');
  spec.extensions.push(extension('old-edition-only',[{op:'add',collection:'components',id:'legacy',value:{...spec.components[0],id:'legacy'}}]));
  assert.equal(validateSpecification(spec,{extensions:['old-edition-only','edition-two']}).valid,false);
});

test('120-ID coverage distinguishes missing, repeated and unknown IDs instead of counting files', async () => {
  const catalog=await readCatalog();assert.equal(catalog.size,120);
  const specs=[...catalog].map(game_id=>({game_id}));assert.equal(catalogCoverage(specs,catalog).complete,true);
  specs.pop();specs.push({...specs[0]},{game_id:'not-in-catalog'});const coverage=catalogCoverage(specs,catalog);
  assert.equal(coverage.complete,false);assert.equal(coverage.present,119);assert.equal(coverage.missing.length,1);assert.equal(coverage.duplicate.length,1);assert.deepEqual(coverage.unknown,['not-in-catalog']);
});

test('import normalizes losslessly only after whole-batch validation; it refuses overwrite and partial invalid output', async () => {
  const root=await mkdtemp(path.join(os.tmpdir(),'keepboard-game-specs-'));
  try {
    const input=path.join(root,'input'),out=path.join(root,'out');await mkdir(input);
    const spec=fixture();spec.game_id='catan';const original=JSON.stringify(spec);await writeFile(path.join(input,'source.json'),original);
    const imported=await importSpecifications(input,out);assert.equal(imported.valid,true);assert.equal(imported.factualVerification,false);
    assert.deepEqual(JSON.parse(await readFile(path.join(out,'catan.json'),'utf8')),spec);assert.equal(await readFile(path.join(input,'source.json'),'utf8'),original);
    assert.equal((await inspectInput(out)).valid,true);assert((await readdir(out)).includes('.import-manifest.json'));
    await assert.rejects(importSpecifications(input,out),/already exists/);
    await writeFile(path.join(input,'invalid.json'),'{"broken":true}');
    const rejected=path.join(root,'rejected');await assert.rejects(importSpecifications(input,rejected),/rejected/);await assert.rejects(readdir(rejected));
    const inspect=await inspectInput(input);assert.equal(inspect.valid,false);
    await assert.rejects(importSpecifications(out,path.join(root,'incomplete'),{complete:true}),/rejected/);
    await writeFile(path.join(input,'unknown.json'),JSON.stringify({...spec,game_id:'not-in-catalog'}));
    assert.deepEqual((await inspectInput(input)).coverage.unknown,['not-in-catalog']);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('CLI exit codes distinguish structurally valid partial input from incomplete 120-game coverage', () => {
  const run=(...args:string[])=>spawnSync(process.execPath,['--import','tsx','tools/game-specs/cli.ts',...args],{cwd:process.cwd(),encoding:'utf8'});
  const valid=run('validate','game-specifications/examples/catan-from-current-pack.json');assert.equal(valid.status,0,valid.stderr);assert.equal(JSON.parse(valid.stdout).factualVerification,false);
  const incomplete=run('coverage','game-specifications/examples/catan-from-current-pack.json');assert.equal(incomplete.status,1);assert.equal(JSON.parse(incomplete.stdout).coverage.missing.length,119);
  assert.equal(run('validate','game-specifications/fixtures/invalid.json').status,1);
});

test('the current detailed Catan fields, conditions, requirements, derived outputs and preservation references survive the research-format adapter', () => {
  const report=catanContractProbe();assert.equal(report.valid,true,JSON.stringify(report.issues));
  assert.equal(report.fields,report.original.fields);assert.equal(report.requirements,report.original.requirements);assert.equal(report.derived,report.original.derived);assert.equal(report.preserve,report.original.preserve);
  const spec=fromCatanPack();assert.equal(spec.resume.opening_policy,'retain-saved-turn');assert.deepEqual(spec.resume.required_field_ids,[]);assert.equal(spec.layout.areas[0].fixed_slot_count,19);assert.equal(spec.confidence,'reported');
  assert.equal(spec.resume.preserve_procedures.find((p:any)=>p.id==='board-public-state').method,'photo');
  for(const f of catanPack.fields) {const mapped=spec.state_fields.find((s:any)=>s.id===f.key);assert.equal(mapped.label,f.label);assert.equal(mapped.scope,f.scope);assert.deepEqual(mapped.options,f.options);}
  const restore=(c:any):any=>({...c,...(c.field_id?{field:c.field_id}:{}),field_id:undefined,...(c.conditions?{conditions:c.conditions.map(restore)}:{})});
  for(const rule of catanPack.derivedRules) {const mapped=spec.rules.find((s:any)=>s.id==='derived.'+rule.id);assert.deepEqual(mapped.effect,{field_id:rule.field,value:rule.value});assert.deepEqual(JSON.parse(JSON.stringify(restore(mapped.when))),rule.when);}
  for(const requirement of catanPack.requirements) assert.deepEqual(spec.rules.find((s:any)=>s.id==='requirement.'+requirement.id).required_field_ids,requirement.fields);
  for(const preservation of catanPack.preservationTemplates) {const mapped=spec.resume.preserve_procedures.find((s:any)=>s.id===preservation.id);assert.deepEqual(mapped.after,preservation.restoreAfter);assert.deepEqual(mapped.steps,[preservation.description,...preservation.conditions]);}
});
