"""Offline raw-only comparison. Private per-object details, shared aggregates only."""
import json, pathlib, hashlib, collections
HERE=pathlib.Path(__file__).resolve().parent
pre=json.loads((HERE/'preflight.json').read_text());root=pathlib.Path(pre['privateDirectory'])
hashfile=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
ALIASES={'wood':'forest','sheep':'pasture','brick':'hills','wheat':'fields','ore':'mountains','초록':'green','초록색':'green','녹색':'green','보라':'purple','보라색':'purple','노랑':'yellow','노란색':'yellow','빨강':'red','빨간색':'red','파랑':'blue','파란색':'blue','청색':'blue','흰색':'white','백색':'white','검은색':'black','흑색':'black','적색':'red'}
def canon(x):return ALIASES.get(x,x)
def box(x):
 if isinstance(x,dict):x=[x.get(k) for k in ['x','y','width','height']]
 if not isinstance(x,list) or len(x)!=4 or any(not isinstance(n,(int,float)) or isinstance(n,bool) for n in x):return None
 a,b,w,h=x
 return x if 0<=a<=1 and 0<=b<=1 and w>0 and h>0 and a+w<=1.000001 and b+h<=1.000001 else None
def flatten(d,g,arm):
 if arm=='B':return [{**o,'box':box(o.get('box'))} for o in d.get('objects',[])]
 out=[]
 for a in d.get('assertions',[]):
  v=a.get('value',{})
  if not isinstance(v,dict):continue
  for o in v.get('components',v.get('pieces',[])):
   r=o.get('readout') or {};z=r.get('values') or {};kind=o.get('kind') if g=='catan' else (r.get('kind') or o.get('componentId'));kind={'nobles':'noble','chips':'token','dice':'die'}.get(kind,kind)
   out.append({'id':o.get('id'),'kind':kind,'box':box(o.get('region')),'terrain':o.get('variant') if kind=='terrain' else None,'number':o.get('number'),'observedColor':o.get('ownerId') if g=='catan' else None,'location':o.get('location'),'points':r.get('points'),'bonus':r.get('bonus'),'cost':r.get('cost'),'requirements':r.get('requirements'),'color':z.get('observedColor') or z.get('dieColor') or r.get('color'),'value':z.get('dieValue'),'quantity':o.get('quantity'),'field':a.get('field'),'present':{'terrain':'variant' in o,'number':'number' in o,'points':'points' in r,'bonus':'bonus' in r,'color':any(k in z for k in ['observedColor','dieColor']) or 'color' in r,'value':'dieValue' in z}})
 return out
def strict_match(pred,gt,w,h):
 choices={};reverse=collections.defaultdict(list)
 for p in pred:
  b=p.get('box');ids=[]
  if b:
   x,y,bw,bh=b
   ids=[i for i,g in enumerate(gt) if x<=g['centerPx'][0]/w<=x+bw and y<=g['centerPx'][1]/h<=y+bh]
  choices[p['id']]=ids
  for i in ids:reverse[i].append(p['id'])
 matches={i:next(p for p in pred if p['id']==ids[0]) for i,ids in reverse.items() if len(ids)==1 and len(choices[ids[0]])==1}
 return matches,{'matched':len(matches),'GTobjects':len(gt),'predicted':len(pred),'invalidOrMissingBox':sum(p.get('box') is None for p in pred),'ambiguousPredictions':sum(len(v)>1 for v in choices.values()),'unmatchedOrAmbiguousGT':len(gt)-len(matches)}
def score(gt,matches,key):
 counts=collections.Counter();rows=[]
 for i,g in enumerate(gt):
  p=matches.get(i);val=p.get(key) if p else None;expected=g[key]
  present=p.get('present',{}).get(key,key in p) if p else False
  status='ambiguous-object-correspondence' if not p else 'missing-property' if not present else 'unknown-null' if val is None else 'correct' if canon(val)==canon(expected) else 'wrong'
  counts[status]+=1;rows.append({'GTid':g['id'],'predictionId':p.get('id') if p else None,'expected':expected,'predicted':val,'status':status})
 return dict(counts),rows
report={'basis':'Frozen GT/raw-only, strict unique center-in-box, not app/save accuracy','cases':[]}
for step in pre['order']:
 game,arm,seq=step['gameId'],step['arm'],step['sequence'];file=root/f'{seq}-{game}-{arm}.raw.json'
 if not file.exists():continue
 inp=next(i for i in pre['inputs'] if i['gameId']==game);assert hashfile(inp['GTPath'])==inp['GTSHA'];g=json.loads(pathlib.Path(inp['GTPath']).read_text());pred=flatten(json.loads(file.read_text()),game,arm);photo=g['photo'];w,h=photo['width'],photo['height'];groups=[]
 if game=='catan':
  groups=[('terrain',[{'id':t['id'],'centerPx':t['centerPx'],'terrain':t['terrain']} for t in g['tiles']],['terrain']),('number-token',[{'id':t['id'],'centerPx':t['centerPx'],'number':t['number']} for t in g['tiles'] if t['number'] is not None],['number'])]
 elif game=='splendor':groups=[('development',g['market'],['points','bonus']),('noble',g['nobles'],['points']),('token',g['tokenGroups'],['color'])]
 else:groups=[('die',[{'id':f"r{c['row']}c{c['column']}",'centerPx':c['centerPx'],'color':c['observedColor'],'value':c['value']} for c in g['cells'] if c['occupied']],['color','value'])]
 details={'gameId':game,'arm':arm,'sourceSHA':hashfile(file),'objects':pred,'groups':{}};aggregate={'gameId':game,'arm':arm,'rawSHA':hashfile(file),'kindCounts':dict(collections.Counter(p['kind'] for p in pred)),'groups':{}}
 for kind,gt,keys in groups:
  pp=[p for p in pred if p['kind']==kind];matches,metrics=strict_match(pp,gt,w,h);detail={'matching':metrics,'attributes':{}};summary={'matching':metrics,'attributes':{}}
  for key in keys:
   scores,rows=score(gt,matches,key);detail['attributes'][key]={'counts':scores,'rows':rows};summary['attributes'][key]=scores
   summary.setdefault('outputFieldPresence',{})[key]={'present':sum(p.get('present',{}).get(key,key in p) for p in pp),'nonNull':sum(p.get(key) is not None for p in pp),'null':sum(p.get(key) is None for p in pp)}
   if game=='splendor' and kind=='development' and key=='points':
    for confidence in ['high','medium']:
     selected={j:p for j,p in matches.items() if gt[j]['pointsConfidence']==confidence};counts=collections.Counter()
     for row in rows:
      if gt[next(j for j,t in enumerate(gt) if t['id']==row['GTid'])]['pointsConfidence']==confidence:counts[row['status']]+=1
     summary.setdefault('pointsConfidence',{})[confidence]=dict(counts)
  details['groups'][kind]=detail;aggregate['groups'][kind]=summary
  # App slot labels are a separate correspondence, never strict bbox proof.
  if game=='catan' and arm=='A':
   relative={i:p for i,t in enumerate(gt) for p in pp if (p.get('location') or {}).get('id')==t['id']}
   detail['appNamedSlotCorrespondence']={key:{'counts':score(gt,relative,key)[0],'rows':score(gt,relative,key)[1]} for key in keys}
   summary['appNamedSlotCorrespondence']={key:score(gt,relative,key)[0] for key in keys}
  if game=='catan' and arm=='B':
   # Manually inspected original+source-center overlays: explicit p1..p19 terrain,
   # p20..p37 tokens follow photographed rows. Never promoted to strict box success.
   ids=[f'p{j}' for j in (range(1,20) if kind=='terrain' else range(20,38))]
   byid={p['id']:p for p in pp}
   if len(gt)==len(ids) and all(i in byid for i in ids):
    relative={i:byid[pid] for i,pid in enumerate(ids)}
    detail['reviewerRelativeRowCorrespondence']={key:{'counts':score(gt,relative,key)[0],'rows':score(gt,relative,key)[1]} for key in keys}
    summary['reviewerRelativeRowCorrespondence']={key:score(gt,relative,key)[0] for key in keys}
 (root/f'{seq}-{game}-{arm}.evaluation.json').write_text(json.dumps(details,ensure_ascii=False,indent=2));(root/f'{seq}-{game}-{arm}.evaluation.json').chmod(0o600);report['cases'].append(aggregate)
(HERE/'evaluation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'evaluated':len(report['cases']),'privateDetails':str(root),'aggregate':str(HERE/'evaluation.json')}))
