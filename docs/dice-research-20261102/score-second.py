import json,collections
from pathlib import Path
P=Path('docs/dice-research-20261102');score=json.load(open('/private/tmp/kb-terra-crop-oQSwrk/sagrada-roi.full.score.json'));truth={o['predictedId']:{'object':o['referenceId'],'expected':a['expected'],'legacy':a['actual']}for o in score['details']for a in o['attributes']if a['id']=='dieValue'};out={'knownDice':len(truth),'historicalCorrect':sum(t['expected']==t['legacy']for t in truth.values()),'referenceCaution':'die-r3c2 excluded in sensitivity scenario due to prior independent audit uncertainty; original frozen labels unchanged','trials':[]}
for r in json.load(open(P/'second-pip-results.json'))['rows']:
 rows=[];c=collections.Counter(x['id']for x in r['items']);assert len(c)==20 and all(v==1 for v in c.values())
 for a in r['items']:
  if a['id']not in truth:continue
  q=a['pipCenters'];valid=len({(x['x'],x['y'])for x in q})==len(q)and all(0<=x['x']<=1000 and 0<=x['y']<=1000 for x in q);v=len(q)if valid and not a['uncertain']and 1<=len(q)<=6 else None;t=truth[a['id']];rows.append({**t,'id':a['id'],'value':v,'correct':v==t['expected']})
 good=[x for x in rows if x['object']!='die-r3c2'];out['trials'].append({'trial':r['trial'],'correct':sum(x['correct']for x in rows),'wrong':sum(not x['correct']and x['value']is not None for x in rows),'unknown':sum(x['value']is None for x in rows),'sensitivity':{'known':len(good),'correct':sum(x['correct']for x in good),'historicalCorrect':sum(x['legacy']==x['expected']for x in good)},'rows':rows})
json.dump(out,open(P/'second-scores.json','w'),indent=2);print({k:v for k,v in out.items()if k!='trials'});print([{k:v for k,v in r.items()if k!='rows'}for r in out['trials']])
