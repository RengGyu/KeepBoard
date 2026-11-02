import json,collections
from pathlib import Path
P=Path('docs/dice-research-20261102');s=json.load(open('docs/terra-detail-20261102/scores-audited.json'))['reports'];r=next(x for x in s if x['id']=='sagrada-default-replay');truth={o['predictedId']:{'object':o['id'],'expected':a['expected'],'legacy':a['actual']}for o in r['raw']['details']for a in o['attributes']if a['id']=='dieValue'}
out={'knownDice':len(truth),'reference':'audited AI reference; one photo; 1 unknown die excluded','legacyCorrect':sum(x['expected']==x['legacy']for x in truth.values()),'conditions':[]}
x=json.load(open(P/'local-classifier.json'));rows=[]
for row in x['rows']:
 if row['id'] not in truth:continue
 t=truth[row['id']];rows.append({**t,**row,'correctD6':int(row['d6Class'].split('_')[1])==t['expected'],'correctUnrestricted':row['topClass']=='d6_'+str(t['expected'])})
out['conditions'].append({'name':'public-specialist','known':len(rows),'correctD6':sum(x['correctD6']for x in rows),'correctUnrestricted':sum(x['correctUnrestricted']for x in rows),'seconds20Crops':x['seconds20Crops'],'rows':rows})
if (P/'pip-results.json').exists():
 for r in json.load(open(P/'pip-results.json'))['rows']:
  rows=[];by=collections.Counter(x['id']for x in r['items']);assert all(n==1 for n in by.values())
  for v in r['items']:
   if v['id'] not in truth:continue
   points=v['pipCenters'];valid=len({(q['x'],q['y'])for q in points})==len(points) and all(0<=q['x']<=1000 and 0<=q['y']<=1000 for q in points);value=len(points)if valid and not v['uncertain'] and 1<=len(points)<=6 else None;rows.append({**truth[v['id']],'id':v['id'],'value':value,'correct':value==truth[v['id']]['expected'],'centresValid':valid})
  out['conditions'].append({'name':'pip-centres-'+str(r['trial']),'known':len(rows),'correct':sum(x['correct']for x in rows),'unknown':sum(x['value']is None for x in rows),'wrong':sum(not x['correct']and x['value']is not None for x in rows),'providerMs':r['providerMs'],'rows':rows})
json.dump(out,open(P/'scores.json','w'),indent=2);print({k:v for k,v in out.items()if k!='conditions'});print([{k:v for k,v in x.items()if k!='rows'}for x in out['conditions']])
