import json,hashlib,statistics
from pathlib import Path
root=Path(__file__).resolve().parent
read=lambda n:json.loads((root/n).read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
baseline=[];refs={};sources=[]
for group in ['sol1','sol2']:
 score=read('scores-'+group+'.json');ref=read('references-'+group+'.json');refpath=root/('references-'+group+'.json')
 assert read('reference-freeze.json')['references'][group]==sha(refpath)
 assert score.get('referenceSHA')==sha(refpath)
 refs.update({c['gameId']:c for c in ref['cases']});sources.append({'path':'scores-'+group+'.json','sha256':sha(root/('scores-'+group+'.json'))})
 for c in score['cases']:
  m=c['metrics'];assert 0<=m['individualDetected']<=m['referenceObjects'];assert 0<=m['correctAttributes']<=m['readableAttributes']
  kindDenom=c.get('kindScorableDenominator',m['referenceObjects']);assert m['correctKind']<=kindDenom
  baseline.append({'gameId':c['gameId'],**m,'kindDenominator':kindDenom,'referenceIssues':c.get('referenceIssues',[]),'regionExhaustive':c.get('regionExhaustive',c.get('exhaustiveWithinAssessedRegion',False))})
assert len(baseline)==20 and len({c['gameId'] for c in baseline})==20
keys=['referenceObjects','individualDetected','correctKind','kindDenominator','readableAttributes','correctAttributes']
tot={k:sum(c[k] for c in baseline) for k in keys}
tot['individualRecoveryPercent']=100*tot['individualDetected']/tot['referenceObjects'];tot['kindRecoveryPercent']=100*tot['correctKind']/tot['kindDenominator'];tot['requestedReadableAttributeRecoveryPercent']=100*tot['correctAttributes']/tot['readableAttributes']
# Semantic fields exclude front/back; no claim they are independent observations.
semantic={'readableAttributes':0,'correctAttributes':0};disputed=[]
for group in ['sol1','sol2']:
 for c in read('scores-'+group+'.json')['cases']:
  caseSemantic={'readableAttributes':0,'correctAttributes':0}
  for o in c.get('objects',c.get('referenceObjectEvidence',[])):
   for a in o.get('attributes',o.get('attributeOutcomes',[])):
    if a.get('includedInDenominator',True) and a['id']!='face':
     semantic['readableAttributes']+=1;semantic['correctAttributes']+=a.get('correct') is True
     caseSemantic['readableAttributes']+=1;caseSemantic['correctAttributes']+=a.get('correct') is True
  next(x for x in baseline if x['gameId']==c['gameId'])['semanticAttributesExcludingFace']=caseSemantic
  if c.get('referenceIssues'):disputed.append({'gameId':c['gameId'],'issues':c['referenceIssues']})
semantic['percent']=100*semantic['correctAttributes']/semantic['readableAttributes']
summary={'status':'COMPLETED_BASELINE','scope':'20 non-Catan selected photograph areas / visible AI reference targets; not whole-photo human-verified accuracy or placement accuracy','totals':tot,'macroAcross20Games':{'individualRecoveryPercent':statistics.mean(c['individualDetected']/c['referenceObjects'] for c in baseline)*100,'semanticAttributeRecoveryPercent':statistics.mean(c['semanticAttributesExcludingFace']['correctAttributes']/c['semanticAttributesExcludingFace']['readableAttributes'] for c in baseline)*100},'semanticAttributesExcludingFace':semantic,'games':baseline,'referenceIssues':disputed,'scoreFiles':sources,'timing':read('baseline-summary.json'),'interpretation':'Grouped outputs are not individual recovery. Missing/unknown requested readable attributes remain failures. Colour aliases can occur in separate schema fields; these are field-level counts, not independent semantic facts. Frozen reference issues remain separately visible; mismatches at those entries are not confirmed model errors.'}
aug=[]
for group in ['sol1','sol2']:
 p=root/('scores-'+group+'-augmented.json')
 if p.exists():
  d=read(p.name);aug.extend(d['cases']);sources.append({'path':p.name,'sha256':sha(p)})
if len(aug)==4:
 pairs=[]
 for c in aug:
  old=next(x for x in baseline if x['gameId']==c['gameId']);pairs.append({'gameId':c['gameId'],'baseline':{k:old[k] for k in ['referenceObjects','individualDetected','correctKind','readableAttributes','correctAttributes']},'augmented':c['metrics']})
 summary['dataPackExperiment']={'pairs':pairs,'callEvidence':read('augmented-summary.json'),'singlePairsOnly':True,'notAutomaticPlacementValidation':True}
 summary['status']='COMPLETED_BASELINE_AND_FOUR_DATA_PAIRS'
(root/'result.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'totals':tot,'semanticExcludingFace':semantic,'augmentedCases':len(aug)},ensure_ascii=False))
