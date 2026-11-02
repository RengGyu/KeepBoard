import json,collections,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent
out=collections.Counter();miss=collections.Counter();by_game={};detail=[]
for g in ['sol1','sol2']:
 for c in json.load(open(root/('scores-'+g+'.json')))['cases']:
  gm=collections.Counter()
  for o in c.get('objects',c.get('referenceObjectEvidence',[])):
   if not o['individualDetected']:
    cat='scored_as_group' if o.get('coveredByGroup') or o.get('groupEvidenceItem') else 'no_individual_match'
    miss[cat]+=1;gm[cat]+=1
   for a in o.get('attributes',o.get('attributeOutcomes',[])):
    if a['id']=='face' or not a.get('includedInDenominator',True):continue
    if not o['individualDetected']:out['missing_or_grouped']+=1
    else:
     out['detected_readable_fields']+=1
     if a.get('correct') is True:out['correct_on_detected']+=1
     elif a.get('correct') is None or a.get('referenceIssue'):out['disputed_or_uncertain']+=1
     elif a.get('actual') is None:out['unknown_on_detected']+=1
     else:out['different_value_on_detected']+=1
  by_game[c['gameId']]=dict(gm)
assert sum(miss.values())==175
assert out['missing_or_grouped']+out['detected_readable_fields']==636
assert out['correct_on_detected']+out['disputed_or_uncertain']+out['unknown_on_detected']+out['different_value_on_detected']==out['detected_readable_fields']
priv=Path.home()/'Library/Application Support/KeepBoard/research/twenty-games-pack-study-20261029'
issues=[];rows=0;fields=0
for c in json.load(open(root/'baseline-ledger.json')):
 game=c['gameId'];raw=json.load(open(priv/(game+'.baseline.parsed.json')))['items'];dec=json.load(open(priv/(game+'.baseline.decoded.json')))['observations'];rows+=len(raw)
 if len(raw)!=len(dec):issues.append([game,'row-count'])
 for i,(a,b) in enumerate(zip(raw,dec)):
  if a['kind']!=b['componentId'] or a['quantity']!=b['quantity']:issues.append([game,i,'kind/quantity'])
  for x in a['attributes']:
   if x['valueJson'] is not None and x['unknownReason'] is None:
    v=json.loads(x['valueJson']);actual=b['properties'].get(x['id'],{});fields+=1
    if actual.get('state')!='observed' or actual.get('value')!=v:issues.append([game,i,x['id'],'not-preserved'])
assert not issues
result={'evidence':'OFFLINE_EXISTING_RESPONSES_ONLY','newProviderCalls':0,'changedReferences':0,'frozenScoringMisses':dict(miss),'missesByGame':by_game,'attributeFailureDecomposition':dict(out),'conditionalValueRecoveryPercent':out['correct_on_detected']/out['detected_readable_fields']*100,'nonRecoveredValueShareDueToMissingOrGrouped':out['missing_or_grouped']/(636-out['correct_on_detected'])*100,'decoderAudit':{'baselineCases':20,'rows':rows,'rawObservedFields':fields,'preservationIssues':issues},'cautions':['Conditional rate includes only detected objects and cannot replace whole-scene recovery.','Scored-as-group is the original evaluator label, not proof that every null-quantity row is a group. Splendor visible color recovery is underrepresented by strict individual-object credit.','Empty replies are provider-native; their internal cause is unknown without a controlled follow-up.','No whole+crop/scanner comparison was run in this audit.','AI reference errors and unspecified ROI prevent a pure model-vision accuracy claim.']}
(root/'cause-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
