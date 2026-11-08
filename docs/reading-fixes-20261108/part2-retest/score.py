"""Part 2: lean format vs named format (both Terra-high + Q), frozen FINAL evaluator and references, decoded records."""
import sys,json,pathlib,importlib.util,collections,statistics as st
sys.dont_write_bytecode=True
D=pathlib.Path(__file__).resolve().parent;P=D.parents[1]/'accuracy-goal-20261106'/'implementation';A=pathlib.Path('/private/tmp/kb-terra-high-final8-20261108');L=pathlib.Path('/private/tmp/kb-reading-fixes-part2');C=collections.Counter
load=lambda p:json.loads(pathlib.Path(p).read_text());sp=importlib.util.spec_from_file_location('F',P/'final-evaluation.py');F=importlib.util.module_from_spec(sp);sp.loader.exec_module(F)
plan=load(P/'final'/'evaluation-plan.json');res=load(D/'result.json');old=load(D.parents[1]/'terra-high-final8-20261108'/'result.json');rows=[];facts={}
for s in plan['scenes']:
 for arm,base,tag in [('NAMED',A,'THQ'),('LEAN',L,'LEAN')]:
  for rep in [1,2]:
   p=base/f"{s['id']}-{tag}-r{rep}.json"
   if not p.exists():rows.append(dict(game=s['gameId'],arm=arm,repeat=rep,unavailable=True,denominator=len(s['primaryFacts'])));continue
   a=load(p);r=F.score(s,a['decodedRecords']);pr=F.precision(s,a['decodedRecords'],False);rows.append(dict(game=s['gameId'],arm=arm,repeat=rep,denominator=r['denominator'],counts=dict(r['counts']),fields={k:dict(v) for k,v in r['fields'].items()},precision=dict(pr['counts']),rows=len(a['decodedRecords'])))
   facts[(arm,s['id'],rep)]={f['semanticFactId']:f['status'] for f in r['facts']}
def agg(rs):
 ok=[r for r in rs if not r.get('unavailable')];return dict(denominator=sum(r['denominator'] for r in rs),unavailable=sum(1 for r in rs if r.get('unavailable')),counts=dict(sum((C(r['counts']) for r in ok),C())),precision=dict(sum((C(r['precision']) for r in ok),C())),fields={k:dict(sum((C(r['fields'][k]) for r in ok),C())) for k in ['numeric','text','color','complex']},rows=sum(r['rows'] for r in ok))
arms={a:agg([r for r in rows if r['arm']==a]) for a in ['NAMED','LEAN']};games=sorted({r['game'] for r in rows});per={g:{a:agg([r for r in rows if r['arm']==a and r['game']==g]) for a in arms} for g in games}
t=C()
for (a,s,rep),fa in facts.items():
 if a!='NAMED' or ('LEAN',s,rep) not in facts:continue
 fb=facts[('LEAN',s,rep)]
 for i,x in fa.items():y=fb[i];t['retained' if x==y=='correct' else 'regressed' if x=='correct' else 'recovered' if y=='correct' else 'neither']+=1
def tim(rs):
 ok=[r for r in rs if r.get('usage')];s_=[r['providerMs']/1000 for r in ok];o=[r['usage']['output_tokens'] for r in ok];re=[r['usage']['output_tokens_details'].get('reasoning_tokens',0) for r in ok];return dict(n=len(ok),meanS=round(st.mean(s_),1),maxS=round(max(s_),1),meanOut=round(st.mean(o)),meanReason=round(st.mean(re)),maxOut=max(o),usd=round(sum(r.get('estimatedUSD') or 0 for r in ok),3))
lat={'NAMED':tim([r for r in old['rows'] if r['arm']=='THQ']),'LEAN':tim(res['rows'])}
out=dict(arms=arms,perGame=per,transitions=dict(t),timing=lat,calls=res['calls'],halt=res.get('halt'),rows=rows);(D/'scores.json').write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n')
for a in arms:print(a,arms[a]['denominator'],arms[a]['counts'],'unav',arms[a]['unavailable'],'rows',arms[a]['rows'],{k:arms[a]['precision'].get(k) for k in ['correct','wrong','unresolved']})
for g in games:print(g,per[g]['NAMED']['denominator'],{a:per[g][a]['counts'] for a in arms})
for a in arms:print(a,arms[a]['fields'])
print(dict(t));print(lat)
