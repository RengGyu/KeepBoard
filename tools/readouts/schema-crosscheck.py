"""Independent JSON Schema library cross-check against synthetic fixture payloads.
Runtime validators additionally enforce real player/evidence IDs and relational constraints.
"""
from pathlib import Path
import json,sys,copy
from jsonschema import Draft202012Validator
result=Path(sys.argv[1]);fixture_root=Path(sys.argv[2]);stats={'schemas':0,'valid_payloads':0,'invalid_extra_keys':0,'invalid_wrong_game':0}
for path in sorted((result/'schemas').glob('*.schema.json')):
 game=path.name.removesuffix('.schema.json');schema=json.loads(path.read_text());Draft202012Validator.check_schema(schema);v=Draft202012Validator(schema);stats['schemas']+=1
 fixture=json.loads((fixture_root/(game+'.json')).read_text())
 for e in fixture['entries']:
  if e['collection']!='enabled':continue
  for mode in ['unknown','typed']:
   payload=e[mode]['readout'];v.validate(payload);stats['valid_payloads']+=1
   bad=copy.deepcopy(payload);bad['values']['__invented']=9
   assert list(v.iter_errors(bad)),game+' allowed unknown detail key';stats['invalid_extra_keys']+=1
   bad=copy.deepcopy(payload);bad['schema']='different-game-v1'
   assert list(v.iter_errors(bad)),game+' allowed wrong schema';stats['invalid_wrong_game']+=1
assert stats['schemas']==117
print(json.dumps({'result':'PASS','method':'jsonschema Draft202012Validator, not product validator','limits':'Does not establish game rules, image recognition or authentic users/evidence.','counts':stats},ensure_ascii=False,indent=2))
