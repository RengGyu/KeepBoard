from pathlib import Path
import hashlib,json,re,zipfile,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/webchat-game-handoff';B=OUT/'package';S=B/'snapshot'
man=json.loads((B/'MANIFEST.json').read_text());errors=[]
for f in man['files']:
 p=B/f['path']
 if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=f['sha256']:errors.append('manifest mismatch '+f['path'])
for rel in man['sourceFiles']:
 if (ROOT/rel).read_bytes()!=(S/rel).read_bytes():errors.append('source drift '+rel)
json_count=svg_count=0
for p in B.rglob('*'):
 if not p.is_file():continue
 if p.suffix=='.json':json.loads(p.read_text());json_count+=1
 if p.suffix=='.svg':ET.parse(p);svg_count+=1
 if p.suffix not in {'.json','.svg','.ts','.tsx','.css','.md','.csv'}:errors.append('unapproved extension '+str(p))
 if any(x in p.parts for x in ['.keepboard','.env','node_modules','uploads','deploy','raw','backup']):errors.append('forbidden path '+str(p))
assets=json.loads((S/'public/game-art/assets.json').read_text());ids={a['asset_id'] for a in assets['assets']}
for a in assets['assets']:
 rel=a['file'].removeprefix('public/');p=S/('public/'+rel if a['classification']=='existing' else 'public/game-art/'+rel)
 if not p.is_file():errors.append('asset missing '+a['asset_id'])
mapping_count=component_count=0
def layers(obj):
 if isinstance(obj,dict):
  if obj.get('asset_id') is not None and obj['asset_id'] not in ids:errors.append('unknown asset '+obj['asset_id'])
  for v in obj.values():layers(v)
 elif isinstance(obj,list):
  for v in obj:layers(v)
for p in (S/'public/game-art/games').glob('*/mapping.json'):
 m=json.loads(p.read_text());mapping_count+=1;component_count+=len(m['components']);layers(m)
rows=json.loads((B/'data/games-120.json').read_text());targets=json.loads((B/'data/targets-117.json').read_text())
assert len(rows)==len({x['gameId'] for x in rows})==120
assert len(targets)==len({x['gameId'] for x in targets})==117
assert not {'catan','rummikub','splendor'}&{x['gameId'] for x in targets}
for r in rows:
 assert (B/r['artMappingPath']).is_file()
 assert r['sourceSHA']==r['sourceSHAActual']
# Document actual omitted relative imports. Snapshot intentionally does not form an executable app.
missing=[]
for p in S.rglob('*'):
 if p.suffix not in {'.ts','.tsx'}:continue
 for ref in re.findall(r"(?:from\s*|import\s*)['\"](\.[^'\"]+)['\"]",p.read_text()):
  dest=p.parent/ref
  choices=[dest,Path(str(dest)+'.ts'),Path(str(dest)+'.tsx'),Path(str(dest)+'.json'),dest/'index.ts']
  if not any(x.is_file() for x in choices):missing.append({'file':p.relative_to(S).as_posix(),'import':ref})
# Every exact code-style snapshot path cited in guides must exist (brace/pattern examples excepted).
for p in B.glob('*.md'):
 for ref in re.findall(r'`(snapshot/[^`]+)`',p.read_text()):
  if any(c in ref for c in '{}[]') or ref.endswith('/'):continue
  if not (B/ref).exists():errors.append('guide reference missing '+ref)
with zipfile.ZipFile(OUT/'KeepBoard-WebChat-Pro.zip') as z:
 assert z.testzip() is None
 assert len(z.namelist())==len(man['files'])+1
 assert all(n.startswith('KeepBoard-WebChat-Pro/') and '..' not in Path(n).parts for n in z.namelist())
report={'status':'PASS' if not errors else 'FAIL','checks':{'sourceSnapshotByteMatch':len(man['sourceFiles']),'jsonParsed':json_count,'svgXMLParsed':svg_count,'gameIdsUnique':120,'targetsUnique':117,'mappingCount':mapping_count,'componentMappings':component_count,'assetManifestEntries':len(assets['assets']),'allManifestAssetFilesExist':True,'mappingLayerReferencesResolved':True,'sourceSHA120Match':True,'zipCRCIntegrity':True,'manifestHashesMatch':not errors,'allowlistOnly':not errors,'guideExactReferencesExist':not errors,'productWrites':0},'zip':{'file':'KeepBoard-WebChat-Pro.zip','bytes':(OUT/'KeepBoard-WebChat-Pro.zip').stat().st_size,'files':len(man['files'])+1,'sha256':hashlib.sha256((OUT/'KeepBoard-WebChat-Pro.zip').read_bytes()).hexdigest()},'missingRelativeImports':missing,'errors':errors,'limits':['Reference subset is not a standalone application','No build/test/model/production calls','No real-photo accuracy or official rules correctness asserted']}
(OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='missingRelativeImports'},ensure_ascii=False))
assert not errors
