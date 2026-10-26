"""Raw-only offline scoring; source-box matches never use predicted values."""
import json,pathlib,hashlib,collections
H=pathlib.Path(__file__).resolve().parent
pre=json.loads((H/'preflight.json').read_text());root=pathlib.Path(pre['privateDirectory'])
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
ALIASES={'wood':'forest','sheep':'pasture','brick':'hills','wheat':'fields','ore':'mountains','초록':'green','초록색':'green','녹색':'green','보라':'purple','보라색':'purple','노랑':'yellow','노란색':'yellow','빨강':'red','빨간색':'red','파랑':'blue','파란색':'blue','청색':'blue','흰색':'white','백색':'white','검은색':'black','흑색':'black','적색':'red'}
canon=lambda x:ALIASES.get(x,x)
def validbox(v):
 if not isinstance(v,list) or len(v)!=4 or any(not isinstance(n,(int,float)) or isinstance(n,bool) for n in v):return None
 x,y,w,h=v
 return v if 0<=x<=1 and 0<=y<=1 and w>0 and h>0 and x+w<=1.000001 and y+h<=1.000001 else None
def match(pred,gt,w,h):
 forward={};reverse=collections.defaultdict(list)
 for p in pred:
  b=validbox(p.get('box'));ids=[]
  if b:
   x,y,bw,bh=b;ids=[i for i,g in enumerate(gt) if x<=g['centerPx'][0]/w<=x+bw and y<=g['centerPx'][1]/h<=y+bh]
  forward[p['id']]=ids
  for i in ids:reverse[i].append(p)
 matches={i:ps[0] for i,ps in reverse.items() if len(ps)==1 and len(forward[ps[0]['id']])==1}
 return matches,{'matched':len(matches),'GT':len(gt),'predicted':len(pred),'invalidOrMissingBox':sum(validbox(p.get('box')) is None for p in pred),'ambiguousBoxes':sum(len(v)>1 for v in forward.values()),'unmatchedOrAmbiguousGT':len(gt)-len(matches)}
def score(gt,matches,key):
 c=collections.Counter();rows=[]
 for i,g in enumerate(gt):
  p=matches.get(i);v=p.get(key) if p else None
  status='unmatched-or-ambiguous-source' if p is None else 'missing-property' if key not in p else 'unknown-null' if v is None else 'correct' if canon(v)==canon(g[key]) else 'wrong'
  c[status]+=1;rows.append({'GTid':g['id'],'predictionId':p.get('id') if p else None,'expected':g[key],'predicted':v,'status':status,'confidence':g.get('pointsConfidence') if key=='points' else None})
 return dict(c),rows
out={'method':'Frozen prior strict unique center-in-box; separate relative reviewer correspondence not implied','cases':[]}
for step in pre['order']:
 s,g,m=step['sequence'],step['gameId'],step['model'];f=root/f'{s}-{g}-{m}.raw.json'
 if not f.exists():continue
 inp=next(x for x in pre['cases'] if x['gameId']==g);assert sha(inp['GTPath'])==inp['GTSHA'];gt=json.loads(pathlib.Path(inp['GTPath']).read_text());raw=json.loads(f.read_text());pred=raw.get('objects',[])
 assert len({o['id'] for o in pred})==len(pred),'Duplicate raw ids require explicit inspection'
 if g=='catan':groups=[('terrain',[{'id':t['id'],'centerPx':t['centerPx'],'terrain':t['terrain']} for t in gt['tiles']],['terrain']),('number-token',[{'id':t['id'],'centerPx':t['centerPx'],'number':t['number']} for t in gt['tiles'] if t['number'] is not None],['number']),('building',gt['buildings'],['kind','observedColor']),('road',gt['roads'],['observedColor']),('robber',[{'id':'robber-visible','centerPx':gt['robber']['centerPx'],'kind':'robber'}],['kind'])]
 elif g=='splendor':groups=[('development',gt['market'],['points','bonus','quantity']),('noble',gt['nobles'],['points']),('token',gt['tokenGroups'],['color'])]
 else:groups=[('die',[{'id':f"r{x['row']}c{x['column']}",'centerPx':x['centerPx'],'color':x['observedColor'],'value':x['value']} for x in gt['cells'] if x['occupied']],['color','value'])]
 photo=gt['photo'];detail={'gameId':g,'model':m,'rawSHA':sha(f),'groups':{}};summary={'gameId':g,'model':m,'rawSHA':sha(f),'kindCounts':dict(collections.Counter(o.get('kind') for o in pred)),'groups':{}}
 for kind,items,keys in groups:
  pp=[o for o in pred if o.get('kind') in ['settlement','city']] if kind=='building' else [o for o in pred if o.get('kind')==kind];matches,stats=match(pp,items,photo['width'],photo['height']);dd={'matching':stats,'attributes':{}};ss={'matching':stats,'attributes':{},'fieldPresence':{}}
  for key in keys:
   counts,rows=score(items,matches,key);dd['attributes'][key]={'counts':counts,'rows':rows};ss['attributes'][key]=counts;ss['fieldPresence'][key]={'present':sum(key in p for p in pp),'nonNull':sum(p.get(key) is not None for p in pp)}
   if g=='splendor' and kind=='development' and key=='points':
    ss['pointsConfidence']={conf:dict(collections.Counter(r['status'] for r in rows if r['confidence']==conf)) for conf in ['high','medium']}
  detail['groups'][kind]=dd;summary['groups'][kind]=ss
  if g=='catan' and m=='deepseek' and kind in ['terrain','number-token']:
   # Separate reviewer correspondence: t1..t19 / n1..n18 were inspected on
   # original-photo source-center overlays. This does not repair source boxes.
   prefix='t' if kind=='terrain' else 'n';ids=[prefix+str(j+1) for j in range(len(items))];byid={p['id']:p for p in pp}
   if all(i in byid for i in ids):
    relative={i:byid[pid] for i,pid in enumerate(ids)}
    dd['reviewerPhotoRowCorrespondence']={key:{'counts':score(items,relative,key)[0],'rows':score(items,relative,key)[1]} for key in keys};ss['reviewerPhotoRowCorrespondence']={key:score(items,relative,key)[0] for key in keys}
 ef=root/f'{s}-{g}-{m}.evaluation.json';ef.write_text(json.dumps(detail,ensure_ascii=False,indent=2));ef.chmod(0o600);out['cases'].append(summary)
(H/'evaluation.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'evaluated':len(out['cases']),'modelCalls':0}))
