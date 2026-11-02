"""Validate independently frozen photo references and assemble the service-only case list."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from PIL import Image

p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--limit',type=int,default=119);p.add_argument('--exclude-experiment');a=p.parse_args()
load=lambda path:json.loads(Path(path).read_text())
sha=lambda path:hashlib.sha256(Path(path).read_bytes()).hexdigest()
defs={d['gameId']:d for d in load('game-photo-definitions/index.json')['games'] if d['gameId']!='catan'}
root=Path('/private/tmp/keepboard-service-all-games-20261027-references')
seen={};cases=[];blocked=[]
used=set()
if a.exclude_experiment:
 for claim in Path(a.exclude_experiment).rglob('attempt-ledger.json'):
  d=load(claim)
  if isinstance(d,dict):
   if d.get('gameId'):used.add(d['gameId'])
   used.update(row['gameId'] for row in d.get('attempts',[]) if row.get('gameId'))
 for claim in Path(a.exclude_experiment).rglob('single-attempt.claim'):
  try:
   d=load(claim)
   if d.get('gameId'):used.add(d['gameId'])
  except (json.JSONDecodeError,TypeError):pass
for f in sorted(root.glob('sol*/*.json')):
 r=load(f)
 if not isinstance(r,dict):continue
 gid=r.get('gameId')
 if gid not in defs:continue
 assert gid not in seen,(gid,'duplicate reference');seen[gid]=True
 if r.get('suitability')!='suitable':blocked.append({'gameId':gid,'reason':r.get('suitabilityReason',r.get('suitability'))});continue
 assert r.get('directView') is True and r['referenceKind']=='independent Sol visual interpretation',gid
 d=defs[gid];assert r['packId']==d['packId'],gid
 area=next(x for x in d['areas'] if x['id']==r['areaId']);assert r['partition']==area['partition'],gid
 assert sha(r['path'])==r['sourceSHA'],gid
 with Image.open(r['path']) as im:assert list(im.size)==[r['width'],r['height']],gid
 assert len(r['anchors'])>=1,(gid,'no independent visible anchor')
 ids=set()
 unsupported=[]
 for anchor in r['anchors']:
  assert anchor['id'] not in ids;ids.add(anchor['id']);x,y,X,Y=anchor['boxPx'];assert 0<=x<X<=r['width'] and 0<=y<Y<=r['height'],(gid,anchor)
  assert anchor['componentId'] in area['componentIds'],(gid,anchor)
  comp=next(c for c in d['components'] if c['id']==anchor['componentId'])
  props={q['id']:q for q in comp['properties'] if q['acquisition']=='visible' and q['type']!='player' and q['id'] not in comp['manualPropertyIds']}
  for key,value in anchor.get('properties',{}).items():
   assert key in props and value is not None,(gid,anchor['id'],key)
   if re.search(r'owner|player|role|turn|hidden|secret',key,re.I):unsupported.append({'anchorId':anchor['id'],'componentId':anchor['componentId'],'propertyId':key,'reason':'Declared visible property excluded by hosted reader policy'})
   q=props[key]
   if q['type']=='integer':assert isinstance(value,int) and not isinstance(value,bool),(gid,anchor['id'],key,'expected integer reference')
   if q['type']=='boolean':assert isinstance(value,bool),(gid,anchor['id'],key,'expected boolean reference')
   if q['type']=='text':assert isinstance(value,str),(gid,anchor['id'],key,'expected text reference')
   if q['type']=='marks':assert isinstance(value,list),(gid,anchor['id'],key,'expected marks reference')
   if q.get('options') and q['type']!='marks':assert value in [o['value'] for o in q['options']],(gid,anchor['id'],key,value)
 if gid in used:continue
 c={k:r[k] for k in ['gameId','packId','sourceSHA','path','mime','width','height','areaId','partition']}
 c.update(referencePath=str(f),referenceSHA=sha(f))
 if unsupported:c['unsupportedReferenceProperties']=unsupported
 if area['partition']=='owner_private':c['ownerId']='evaluation-owner'
 cases.append(c)
cases=sorted(cases,key=lambda c:c['gameId'])[:a.limit]
out={'version':'service-all-games-v1','cases':cases,'notYetReferenced':sorted(set(defs)-set(seen)),'blocked':blocked,'reviewedCount':len(seen),'limitations':['Independent sparse visible anchors, not an exhaustive object inventory or certified ground truth.','Only cases with direct Sol photo suitability and frozen references are eligible.']}
Path(a.out).parent.mkdir(parents=True,exist_ok=True);Path(a.out).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'approvedCases':len(cases),'reviewed':len(seen),'blocked':len(blocked),'notYetReferenced':len(out['notYetReferenced'])}))
