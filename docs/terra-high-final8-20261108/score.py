"""FINAL frozen evaluator and references. B=stored Terra-low (no Q), TLQ/THQ=new; all decoded by current code. AI partial references."""
import sys,json,pathlib,importlib.util,collections
sys.dont_write_bytecode=True
D=pathlib.Path(__file__).resolve().parent;P=D.parent/'accuracy-goal-20261106'/'implementation';W=pathlib.Path('/private/tmp/kb-terra-high-final8-20261108');C=collections.Counter
load=lambda p:json.loads(pathlib.Path(p).read_text());sp=importlib.util.spec_from_file_location('F',P/'final-evaluation.py');F=importlib.util.module_from_spec(sp);sp.loader.exec_module(F)
plan=load(P/'final'/'evaluation-plan.json');res=load(D/'result.json');rows=[];facts={}
for s in plan['scenes']:
 for arm in ['B','TLQ','THQ']:
  for rep in [1,2]:
   p=W/f"{s['id']}-{arm}-r{rep}.json"
   if not p.exists():rows.append(dict(scene=s['id'],game=s['gameId'],arm=arm,repeat=rep,unavailable=True,denominator=len(s['primaryFacts'])));continue
   a=load(p);r=F.score(s,a['decodedRecords']);pr=F.precision(s,a['decodedRecords'],False);g=F.score(s,a['decodedRecords'],'group')
   rows.append(dict(scene=s['id'],game=s['gameId'],arm=arm,repeat=rep,denominator=r['denominator'],counts=dict(r['counts']),fields={k:dict(v) for k,v in r['fields'].items()},precision=dict(pr['counts']),group=dict(g['counts']),rows=len(a['decodedRecords'])))
   facts[(arm,s['id'],rep)]={f['semanticFactId']:f['status'] for f in r['facts']}
def agg(rs):
 ok=[r for r in rs if not r.get('unavailable')];return dict(denominator=sum(r['denominator'] for r in rs),unavailableDenominator=sum(r['denominator'] for r in rs if r.get('unavailable')),counts=dict(sum((C(r['counts']) for r in ok),C())),precision=dict(sum((C(r['precision']) for r in ok),C())),fields={k:dict(sum((C(r['fields'][k]) for r in ok),C())) for k in ['numeric','text','color','complex']})
arms={a:agg([r for r in rows if r['arm']==a]) for a in ['B','TLQ','THQ']}
games=sorted({r['game'] for r in rows});per={g:{a:agg([r for r in rows if r['arm']==a and r['game']==g]) for a in arms} for g in games}
trans={}
for x,y in [('TLQ','THQ'),('B','THQ'),('B','TLQ')]:
 t=C()
 for (a,s,rep),fa in facts.items():
  if a!=x or (y,s,rep) not in facts:continue
  for i,st in fa.items():
   o=facts[(y,s,rep)][i];t['retained' if st==o=='correct' else 'regressed' if st=='correct' else 'recovered' if o=='correct' else 'neither']+=1
 trans[x+'->'+y]=dict(t)
lat={a:[r['providerMs']/1000 for r in res['rows'] if r['arm']==a] for a in ['TLQ','THQ']};cost={a:sum(r.get('estimatedUSD') or 0 for r in res['rows'] if r['arm']==a) for a in lat}
stab={}
for a in arms:
 c=C()
 for s in plan['scenes']:
  f1,f2=facts.get((a,s['id'],1)),facts.get((a,s['id'],2))
  if f1 and f2:
   for i in f1:c['same' if (f1[i]=='correct')==(f2[i]=='correct') else 'flip']+=1
 stab[a]=dict(c)
out=dict(arms=arms,perGame=per,transitions=trans,repeatStability=stab,latency={a:dict(n=len(v),mean=round(sum(v)/len(v),1),max=round(max(v),1)) for a,v in lat.items() if v},costUSD=cost,calls=res['calls'],halt=res.get('halt'),rows=rows,note='AI partial references; FINAL photos already used once, comparison not fresh validation.')
(D/'scores.json').write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n')
for a in arms:print(a,arms[a]['denominator'],arms[a]['counts'],'unavail',arms[a]['unavailableDenominator'],'prec',{k:arms[a]['precision'].get(k) for k in ['correct','wrong','unresolved']})
for g in games:print(g,{a:per[g][a]['counts'] for a in arms},per[g]['B']['denominator'])
for a in arms:print(a,arms[a]['fields'])
print(trans,stab,out['latency'],{k:round(v,3) for k,v in cost.items()})
