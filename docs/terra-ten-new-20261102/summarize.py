import json, statistics, sys
from pathlib import Path
P=Path(__file__).parent
audited='--audit' in sys.argv
s=json.load(open(P/('scores-audited.json' if audited else 'scores.json')));reports=s['reports'];profiles={}
for condition in ['legacy','compact']:
 rr=[r for r in reports if r['condition']==condition];ms=[r['raw']['metrics']for r in rr];success=[r for r in rr if r['state']=='completed'];
 def sums(section):
  return {key:sum(m[section][key] for m in ms) for key in ['total','correct','wrong','unknown','missing']}
 cats={c:{key:sum(m['factsByCategory'][c][key]for m in ms)for key in ['total','correct','wrong','unknown','missing']}for c in ['number','color','text','boolean','structured','enum']}
 stats={k:sum(m[k]for m in ms)for k in ['referenceObjects','predictedObjects','matched','falseNegative','falsePositive','duplicates','kindDenominator','correctKind','unitCorrect','quantityCorrect']}
 stats.update(attempts=len(rr),successful=len(success),failed=len(rr)-len(success),medianSeconds=statistics.median([r['providerMs']/1000 for r in success])if success else None,successfulWithin30=sum(r['providerMs']<=30000 for r in success),maxSeconds=max([r['providerMs']/1000 for r in rr],default=None),uniqueFacts=sums('uniqueFacts'),strictProperties=sums('attributes'),categories=cats,zeroVisibleCorrection=sum(r['state']=='completed' and r['raw']['zeroVisibleCorrection']for r in rr),referenceUnknown=sum(m['referenceUnknown']['total']for m in ms),observedUnverifiable=sum(m['referenceUnknown']['observedUnverifiable']for m in ms),matchAtIoU50=sum(r['rawAtIoU50']['matched']for r in rr))
 stats['precision']=stats['matched']/(stats['matched']+stats['falsePositive'])if stats['matched']+stats['falsePositive'] else None
 stats['recall']=stats['matched']/stats['referenceObjects']if stats['referenceObjects']else None
 stats['exhaustiveOnly']={k:sum(r['raw']['metrics'][k] for r in rr if r['inventoryExhaustive']) for k in ['referenceObjects','predictedObjects','matched','falseNegative','falsePositive','correctKind']};stats['exhaustiveOnly']['cases']=sum(r['inventoryExhaustive'] for r in rr);profiles[condition]=stats
pairs=[]
for case in dict.fromkeys(r['caseId']for r in reports):
 pair={'caseId':case}
 for condition in ['legacy','compact']:
  r=next((r for r in reports if r['caseId']==case and r['condition']==condition),None)
  if r:pair[condition]={'state':r['state'],'seconds':r['providerMs']/1000,'objects':r['raw']['metrics']['matched'],'referenceObjects':r['raw']['metrics']['referenceObjects'],'falsePositive':r['raw']['metrics']['falsePositive'],'facts':r['raw']['metrics']['uniqueFacts'],'zeroVisibleCorrection':r['raw']['zeroVisibleCorrection']}
 pairs.append(pair)
result={'referenceCaution':'AI visual reference, not human-certified; primary frozen pre-call references. Two partial inventories score distinct objects only; see exhaustive-only and independent audit separately.','profiles':profiles,'pairs':pairs}
(P/('summary-audited.json' if audited else 'summary.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(profiles,ensure_ascii=False,indent=1))
