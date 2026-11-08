"""Final report: frozen scorer + reporting-only wording rule, decoded and saved stages, per-game averages. No provider calls."""
import sys,json,pathlib,importlib.util,collections,statistics as st
sys.dont_write_bytecode=True
D=pathlib.Path(__file__).resolve().parent;sys.path.insert(0,str(D));from rules import equivalent
R=D.parents[1];P=R/'accuracy-goal-20261106'/'implementation';A=pathlib.Path('/private/tmp/kb-terra-high-final8-20261108');L=pathlib.Path('/private/tmp/kb-reading-fixes-part2');S=pathlib.Path('/private/tmp/kb-reading-fixes-final-scoring');C=collections.Counter
load=lambda p:json.loads(pathlib.Path(p).read_text());sp=importlib.util.spec_from_file_location('F',P/'final-evaluation.py');F=importlib.util.module_from_spec(sp);sp.loader.exec_module(F)
plan=load(P/'final'/'evaluation-plan.json');ARMS={'B':A,'TLQ':A,'THQ':A,'LEAN':L};rows=[];reclass=[]
def tally(sc):
 c=C(f['status'] for f in sc['facts']);fixed=[f for f in sc['facts'] if equivalent(f)];c2=c.copy();c2['wrong']-=len(fixed);c2['correct']+=len(fixed);return dict(c),dict(c2),fixed
for s in plan['scenes']:
 for arm,base in ARMS.items():
  for rep in [1,2]:
   dec=load(base/f"{s['id']}-{arm}-r{rep}.json")['decodedRecords'];sav=load(S/f"{s['id']}-{arm}-r{rep}.saved.json")
   a=F.score(s,dec);b=F.score(s,sav);d0,d1,fx=tally(a);s0,s1,_=tally(b)
   rows.append(dict(game=s['gameId'],arm=arm,repeat=rep,denominator=a['denominator'],decodedFrozen=d0,decoded=d1,savedFrozen=s0,saved=s1,lostOnSave=sum(1 for x,y in zip(a['facts'],b['facts']) if x['status']=='correct' and y['status']!='correct'),decodedRows=len(dec),savedRows=len(sav)))
   reclass+=[dict(arm=arm,game=s['gameId'],repeat=rep,fact=f['semanticFactId'].split('/',1)[1],expected=f['expected'],actual=f['actual']) for f in fx]
def total(arm,key):
 c=C()
 for r in rows:
  if r['arm']==arm:c.update(r[key])
 return dict(c)
def macro(arm,key,skip=()):
 v=[]
 for g in sorted({r['game'] for r in rows}):
  rr=[r for r in rows if r['arm']==arm and r['game']==g];den=sum(r['denominator'] for r in rr)
  if den and g not in skip:v.append(sum(r[key].get('correct',0) for r in rr)/den)
 return round(100*st.mean(v),1),len(v)
out={'denominator':484,'arms':{a:dict(decodedFrozen=total(a,'decodedFrozen'),decoded=total(a,'decoded'),savedFrozen=total(a,'savedFrozen'),saved=total(a,'saved'),lostOnSave=sum(r['lostOnSave'] for r in rows if r['arm']==a),macroPct=macro(a,'decoded'),macroPctNoRummikub=macro(a,'decoded',('rummikub',)),macroPctSaved=macro(a,'saved')) for a in ARMS},
 'perGame':{g:{a:{'den':sum(r['denominator'] for r in rows if r['arm']==a and r['game']==g),'correct':sum(r['decoded'].get('correct',0) for r in rows if r['arm']==a and r['game']==g),'wrong':sum(r['decoded'].get('wrong',0) for r in rows if r['arm']==a and r['game']==g)} for a in ARMS} for g in sorted({r['game'] for r in rows})},'reclassified':reclass,'rows':rows}
(D/'scores.json').write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n')
for a,v in out['arms'].items():print(a,'decoded',v['decoded'],'| saved',v['saved'],'| frozen',v['decodedFrozen'].get('correct'),v['decodedFrozen'].get('wrong'),'| lostOnSave',v['lostOnSave'],'| macro',v['macroPct'],v['macroPctNoRummikub'],v['macroPctSaved'])
for g,v in out['perGame'].items():print(g,{a:(x['correct'],x['wrong'],x['den']) for a,x in v.items()})
print(len(reclass),C((x['arm'],x['game']) for x in reclass).most_common(12))
print([ (x['expected'],x['actual']) for x in reclass if x['arm']=='LEAN' and x['game']!='azul'][:10])
