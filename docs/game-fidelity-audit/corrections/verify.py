"""Bounded correction verification. No Store, network, server or user data access."""
from pathlib import Path
import hashlib,json,subprocess,sys
ROOT=Path(__file__).resolve().parents[3]
D=ROOT/'docs/game-fidelity-audit/corrections'
def read(p):return json.loads((ROOT/p).read_text())
def sha(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
def emit(p,value):(ROOT/p).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
base=read('docs/game-fidelity-audit/corrections/baseline.json');plans=read('docs/game-art/fidelity-corrections.json');claims=read('docs/game-fidelity-audit/review/claims.json');receipt=read('docs/game-fidelity-audit/corrections/F001-source-correction.json')
assert len(plans)==20
assert sha('docs/game-fidelity-audit/review/findings.json')==base['findingsSHA']
assert sha('docs/game-essentials/baseline.json')==receipt['legacyBaselineSHA256']
old=read('docs/game-fidelity-audit/corrections/agricola-before.json');new=read('docs/research/game-specs-120/games/agricola.json');expected=json.loads(json.dumps(old));assert expected['components'][1]['description']==receipt['old'];expected['components'][1]['description']=receipt['new'];assert new==expected
changed_specs=[p for p,h in base['files'].items() if p.startswith('docs/research/game-specs-120/games/') and sha(p)!=h]
assert changed_specs==['docs/research/game-specs-120/games/agricola.json']
original_svgs=[p for p in base['files'] if p.endswith('.svg') and '/checkpoints/' not in p and p!='public/game-art/representative.svg']
assert all(sha(p)==base['files'][p] for p in original_svgs)
untouched=0;rows=[]
for game in claims:
 m=read(game['mappingPath'])
 for oldc in game['mappedComponents']:
  c=next(c for c in m['components'] if c['component_id']==oldc['component_id']);key=game['gameId']+':'+c['component_id']
  if key not in plans:assert c==oldc,key;untouched+=1;continue
  plan=plans[key];assert c['fidelity_correction']['finding_id']==plan['finding_id']
  assert c['source_quantity']==oldc['source_quantity']
  for v in oldc['variants']:
   kept=next(x for x in c['variants'] if x['name']==v['name'])
   if v['name'] not in plan.get('keep_legacy_names',[]):assert kept['unresolved']
  rows.append({'findingId':plan['finding_id'],'gameId':game['gameId'],'componentId':c['component_id'],'mappingPath':game['mappingPath']+'#/components/'+str(m['components'].index(c)),'sourceURL':plan['source_url'],'sourceLocation':plan['source_location'],'verifiedScope':plan['scope'],'before':{'colorRole':oldc['color_role'],'ownerColorSupported':oldc['owner_color_supported'],'variants':[v['name'] for v in oldc['variants']]},'after':{'colorRole':c['color_role'],'variants':[{'name':v['name'],'colorRole':v.get('color_role'),'ownerColorSupported':v.get('owner_color_supported'),'color':v.get('color'),'layers':v['layers']} for v in c['variants'] if not v.get('unresolved')],'unresolvedLegacy':[v['name'] for v in c['variants'] if v.get('unresolved')]},'status':'CORRECTED_SCOPED','visualEvidence':'screenshots/contact.png — actual GameComponentArt synthetic contact before final owner-building correction; F018/F020 owner cells are preliminary, not final evidence' if plan['finding_id'] in ['F018','F020'] else 'screenshots/contact.png — actual GameComponentArt synthetic contact, not production UI','limits':'Representative silhouettes / semantic colors; not all printed faces or exact printed shades.'})
assert len(rows)==20
freeze=read('docs/game-essentials/data-freeze.json');assert len(freeze['files'])==120
assert all(sha(p)==h for p,h in freeze['files'].items())
digest=hashlib.sha256(''.join(p+' '+h+'\n' for p,h in sorted(freeze['files'].items())).encode()).hexdigest();assert digest==freeze['spec_digest']
oldpack=read('docs/game-fidelity-audit/corrections/agricola-pack-before.json');packs=read('gamepacks/generated/game-essentials.json');pack=next(p for p in packs if p['id']==oldpack['id']);assert pack['version']!=oldpack['version'];assert pack['runtime']['components']==oldpack['runtime']['components']
pending=read('docs/game-board-visuals/fidelity-pending.json');assert not pending['items'];assert len(pending['resolved'])==20
# Both generators must reproduce current files byte-for-byte.
paths=[p for p in (ROOT/'public/game-art').rglob('*') if p.is_file() and p.suffix not in ['.zip','.png']]
before={str(p.relative_to(ROOT)):sha(str(p.relative_to(ROOT))) for p in paths}
subprocess.run([sys.executable,'docs/game-art/build.py','--limit','120'],cwd=ROOT,check=True,capture_output=True)
assert all(sha(p)==h for p,h in before.items()),'Non-deterministic art generation'
subprocess.run([sys.executable,'tools/game-board-visuals/generate.py','--check'],cwd=ROOT,check=True,capture_output=True)
rows.sort(key=lambda r:r['findingId']);emit('docs/game-fidelity-audit/corrections/results.json',rows)
report={'status':'VERIFIED_SCOPED','findings':len(rows),'games':len(set(r['gameId'] for r in rows)),'untouchedAuditedComponents':untouched,'originalStandaloneSVGsUnchanged':len(original_svgs),'sourceSpecChanges':changed_specs,'legacyBaselineUnchanged':True,'auditFindingsUnchanged':True,'legacyUnresolvedNames':sum(len(r['after']['unresolvedLegacy']) for r in rows),'artDeterministic':True,'boardGenerationCheck':True,'sourceDigest':digest,'agricolaVersionBefore':oldpack['version'],'agricolaVersionAfter':pack['version'],'recordMigrationPerformed':False,'limits':['No full suite/build (integration owner reserved).','No actual user data read or migrated.','Contact is synthetic actual-component render, not production app screenshot.','Sagrada 30-cell grid directly viewed; Tokyo extra-green full grid not visually reviewed after browser disconnected.','Old public checkpoint PNGs/overview retained as historical; checkpoint SVGs are current. Contact predates final F018/F020 owner-building fix; those final owner cells require integration visual review.']}
emit('docs/game-fidelity-audit/corrections/verification.json',report);print(json.dumps(report,ensure_ascii=False))
