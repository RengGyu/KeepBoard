"""Validate frozen private annotation/inputs; no repository GT literals.
Original annotation-generation helper remains private with the frozen GT.
"""
import hashlib,json,sys
from pathlib import Path
from PIL import Image,ImageChops
R=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
name=sys.argv[1] if len(sys.argv)>1 else 'pilot-inputs.json'
assert name in ['pilot-inputs.json','quacks-inputs.json']
plan=json.loads((R/name).read_text());rp=Path(plan['reference']['path'])
assert sha(rp)==plan['reference']['sha256'],'Frozen private reference drift'
ref=json.loads(rp.read_text());images={x['variant']:x for x in plan['images']}
for v,i in images.items():
 assert sha(i['path'])==i['sha256'];im=Image.open(i['path']);assert list(im.size)==[i['width'],i['height']]
assert ImageChops.difference(Image.open(images['W']['path']).crop(tuple(plan['cropPx'])),Image.open(images['C']['path'])).getbbox() is None
assert len(ref['objects'])==len({x['id'] for x in ref['objects']})==plan['reference']['denominators']['individualObjects']
attributes=0
for o in ref['objects']:
 attributes+=len(o['scoredPropertyIds'])
 for v,b in o['boxesPx'].items():
  i=images[v];assert 0<=b[0]<b[2]<=i['width'] and 0<=b[1]<b[3]<=i['height']
assert attributes==plan['reference']['denominators']['primaryReadableAttributes']
print(json.dumps(dict(frozenReferenceVerified=True,referenceSHA=sha(rp),objects=len(ref['objects']),attributes=attributes,exactLosslessCrop=True,modelCalls=0)))
