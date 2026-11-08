"""Same frozen evaluator (final-evaluation.py) and frozen references as transfer12; all arms decoded by current code."""
import sys,json,pathlib,importlib.util,collections,copy
sys.dont_write_bytecode=True
D=pathlib.Path(__file__).resolve().parent;I=D.parent/'accuracy-improvement-20261106'/'implementation';P=D.parent/'accuracy-goal-20261106'/'implementation';W=pathlib.Path('/private/tmp/kb-terra-high-transfer-20261108')
load=lambda p:json.loads(pathlib.Path(p).read_text());sp=importlib.util.spec_from_file_location('F',P/'final-evaluation.py');F=importlib.util.module_from_spec(sp);sp.loader.exec_module(F)
spec=importlib.util.spec_from_file_location('T',I/'score-transfer12.py')
pf=load(I/'transfer12-preflight.json');pre=load(D/'preflight.json');res=load(D/'result.json');freeze=load(D.parent/'accuracy-improvement-20261106'/'research'/'references'/'freeze.json');C=collections.Counter
def equivalent(records,task):
 out=copy.deepcopy(records)
 if task['definition'].get('nativeBridge')!='splendor':return out
 types={(c['id'],p['id']):p['type'] for c in task['definition']['components'] for p in c['properties']}
 for r in out:
  for k,v in list(r.get('values',{}).items()):
   if types.get((r['kind'],k))=='marks' and isinstance(v,dict):r['values'][k]=[{'symbol':s,'value':x} for s,x in v.items()]
 return out
jobs=[(j,W/(j['id']+'.current.json')) for j in pf['jobs']]+[(j,W/(j['id']+'.json')) for j in pre['jobs']]
rows=[];facts={}
for scene in pf['scenes']:
 ref=next(r for r in freeze['references'] if r['id']==scene['id']);task=load(next(j for j in pf['jobs'] if j['scene']==scene['id'])['taskPath']);sc=F.convert(load(ref['path']),task)
 for j,path in jobs:
  if j['scene']!=scene['id']:continue
  a=load(path);s=F.score(sc,equivalent(a['finalRecords'],task));pr=F.precision(sc,equivalent(a['finalRecords'],task),False)
  rows.append(dict(id=j['id'],game=scene['gameId'],arm=j['arm'],repeat=j['repeat'],denominator=s['denominator'],counts=dict(s['counts']),fields={k:dict(v) for k,v in s['fields'].items()},precision=dict(pr['counts'])))
  facts[(j['arm'],scene['gameId'],j['repeat'])]={f['id']:f['status'] for f in s['facts']}
arms={}
for arm in ['LB','TQ','TH']:
 rs=[r for r in rows if r['arm']==arm];arms[arm]=dict(denominator=sum(r['denominator'] for r in rs),counts=dict(sum((C(r['counts']) for r in rs),C())),precision=dict(sum((C(r['precision']) for r in rs),C())),
  perGame={g:dict(sum((C(r['counts']) for r in rs if r['game']==g),C())) for g in ['splendor','ticket-to-ride','six-nimmt']},fields={k:dict(sum((C(r['fields'][k]) for r in rs),C())) for k in ['numeric','text','color','complex']})
trans={}
for a,b in [('TQ','TH'),('LB','TH')]:
 t=C()
 for (arm,g,rep),fa in facts.items():
  if arm!=a:continue
  fb=facts[(b,g,rep)]
  for i,x in fa.items():y=fb[i];t['retained' if x==y=='correct' else 'regressed' if x=='correct' else 'recovered' if y=='correct' else 'neither']+=1
 trans[f'{a}->{b}']=dict(t)
lat={arm:[r['providerMs']/1000 for r in res['rows']] for arm in ['TH']}
old=load(I/'transfer12-result.json')
for arm in ['LB','TQ']:lat[arm]=[r['providerMs']/1000 for r in old['rows'] if r['arm']==arm]
cost={'TH':sum(r['estimatedUSD'] for r in res['rows'])};cost.update({arm:sum(r['estimatedUSD'] or 0 for r in old['rows'] if r['arm']==arm) for arm in ['LB','TQ']})
out=dict(arms=arms,transitions=trans,latencySeconds={k:dict(mean=round(sum(v)/len(v),1),max=round(max(v),1)) for k,v in lat.items()},costUSD=cost,rows=rows,
 note='All arms decoded by current product code; references/evaluator frozen; AI partial references, not human truth; one config change (effort) between TQ and TH.')
(D/'scores.json').write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n')
for a in arms:print(a,arms[a]['denominator'],arms[a]['counts'],'| per game',arms[a]['perGame'],'| prec',arms[a]['precision'])
print(trans);print(out['latencySeconds']);print({k:round(v,4) for k,v in cost.items()})
for a in arms:print(a,arms[a]['fields'])
