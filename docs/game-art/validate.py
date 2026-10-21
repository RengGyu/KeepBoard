"""Focused artifact checks; does not certify physical component identification."""
import collections, hashlib, json, pathlib, re, xml.etree.ElementTree as ET
from html.parser import HTMLParser

ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'public/game-art';DOC=ROOT/'docs/game-art'
registry=json.loads((OUT/'assets.json').read_text())['assets'];assets={a['asset_id']:a for a in registry};assert len(assets)==len(registry)
games=json.loads((OUT/'games.json').read_text())['games'];ids=[g['game_id'] for g in games]
spec_files={p.stem:p for p in (ROOT/'docs/research/game-specs-120/games').glob('*.json')}
assert len(ids)==len(set(ids))==120 and set(ids)==set(spec_files)
components=0;unclear=[];unmade=[];invalid_refs=[]
for game in games:
 source=spec_files[game['game_id']];raw=source.read_bytes();spec=json.loads(raw)
 assert hashlib.sha256(raw).hexdigest()==game['source_sha256']
 assert {c['component_id'] for c in game['components']}=={c['id'] for c in spec['components']}
 for component in game['components']:
  components+=1
  if component['status']=='unclear':unclear.append(game['game_id']+':'+component['component_id'])
  if component['status']=='not-made':unmade.append(game['game_id']+':'+component['component_id'])
  assert component['variants'] and component['source_quantity']==next(c['quantity'] for c in spec['components'] if c['id']==component['component_id'])
  if component['source_confidence']=='unclear':assert component['status']=='unclear' and component['gap']
  for variant in component['variants']:
   for layer in variant['layers']:
    if layer['asset_id'] not in assets:invalid_refs.append(layer['asset_id'])
  for layer in component.get('hidden_layers',[]):
   if layer['asset_id'] not in assets:invalid_refs.append(layer['asset_id'])
  if game['game_id']=='five-tribes' and component['component_id']=='tribes':
   assert not component['owner_color_supported'] and len(component['variants'])==5
 if game.get('area_preview'):
  for layer in game['area_preview']['layers']:assert layer['asset_id'] in assets
assert components==437 and not unmade and not invalid_refs
assert len({g['source_spec'] for g in games})==120

def xml_check(path):
 root=ET.parse(path).getroot();ids=[n.attrib['id'] for n in root.iter() if 'id' in n.attrib];assert len(ids)==len(set(ids)),('duplicate IDs',str(path))
 for n in root.iter():
  for key,value in n.attrib.items():
   for id in re.findall(r'url\(#([^)]*)\)',value):assert id in ids,('unresolved clip/filter',path,id)
   if key.endswith('href') and value.startswith('#'):assert value[1:] in ids,('unresolved use',path,value)
 return root

body_groups=collections.defaultdict(list)
for asset in registry:
 path=ROOT/asset['file'] if asset['classification']=='existing' else OUT/asset['file']
 assert path.is_file(),path
 if asset['classification']=='existing':continue
 root=xml_check(path);assert root.attrib.get('viewBox')=='0 0 120 120'
 body=root[-1];body.attrib.pop('id',None);body_groups[hashlib.sha256(ET.tostring(body)).hexdigest()].append(asset['asset_id'])
duplicates=[ids for ids in body_groups.values() if len(ids)>1]
assert not duplicates,('duplicate new SVG bodies',duplicates)
svg_files=list(OUT.rglob('*.svg'))
for path in svg_files:xml_check(path)

class IdChecker(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.refs=[]
 def handle_starttag(self,tag,attrs):
  for key,value in attrs:
   if key=='id':self.ids.append(value)
   if key in ['href','clip-path'] and value and (value.startswith('#') or value.startswith('url(#')):self.refs.append(value.strip('url()')[1:] if value.startswith('url(') else value[1:])
checker=IdChecker();checker.feed((OUT/'index.html').read_text());assert len(checker.ids)==len(set(checker.ids)), 'duplicate gallery IDs'
assert all(ref in checker.ids for ref in checker.refs)
for n in [20,40,60,80,100,120]:
 assert (OUT/'checkpoints'/f'{n:03}-representative.svg').is_file()
 p=OUT/'checkpoints'/f'{n:03}-representative.png'
 if p.exists():assert p.read_bytes().startswith(b'\x89PNG\r\n\x1a\n')
report={'games':120,'components':components,'asset_counts':dict(collections.Counter(a['classification'] for a in registry)),'component_statuses':dict(collections.Counter(c['status'] for g in games for c in g['components'])),'xml_files_valid':len(svg_files),'duplicate_asset_ids':0,'duplicate_new_svg_bodies':0,'unresolved_asset_refs':invalid_refs,'unmade_components':unmade,'unclear_component_ids':unclear,'source_unclear_components':sum(c['source_confidence']=='unclear' for g in games for c in g['components']),'explicit_unknown_extra':sum(c['source_confidence']!='unclear' and c['status']=='unclear' for g in games for c in g['components']),'source_hashes_match':True,'quantity_preserved':True,'viewBox':'0 0 120 120','limits':['XML/ref/coverage checks do not establish drawing quality or physical recognition accuracy.','Presets do not exhaust printed variants; source unknown quantities remain null.','Browser viewport and geometry observations are recorded separately.']}
(DOC/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='unclear_component_ids'},ensure_ascii=False))
