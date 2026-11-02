"""Score frozen diagnostic outputs; no network or product writes."""
import json
from pathlib import Path
root=Path(__file__).resolve().parent
pre=json.loads((root/'preflight.json').read_text())
results=json.loads((root/'results.json').read_text())
trials=[]
for trial in results['rows']:
    outputs={i['id']:{a['property']:a for a in i['attributes']} for i in trial['items']}
    facts=[]
    for target in pre['targets']:
        for prop,expected in target['expected'].items():
            a=outputs[target['id']][prop]
            status='unknown' if a['value'] is None else 'match' if a['value']==expected else 'disagreement'
            facts.append(dict(cropId=target['id'],caseId=target['caseId'],objectId=target['objectId'],property=prop,expected=expected,actual=a['value'],status=status))
    trials.append(dict(trial=trial['trial'],providerMs=trial['providerMs'],usage=trial['usage'],counts={s:sum(f['status']==s for f in facts) for s in ['match','unknown','disagreement']},facts=facts))
assert all(t['counts']=={'match':8,'unknown':7,'disagreement':1} for t in trials)
summary={'baselineFacts':352,'baselineCorrect':312,'baselineWrong':12,'baselineUnknown':25,'baselineMissing':3,'unknownMissing':28,'diagnosticFactsTested':16,'occludedFactsNotRetested':12,'repeatAgreement':trials[0]['facts']==trials[1]['facts'],'categories':[{'cause':'occluded_negative_state','facts':12,'fractionOf28':12/28,'finding':'Provider occluded abstention; not retested, no recovery claimed.'},{'cause':'physical_outline_plus_face_contract','facts':5,'fractionOf28':5/28,'finding':'All five shapes match in both trials; framing and instructions changed together.'},{'cause':'front_back_not_visually_distinguishable','facts':5,'fractionOf28':5/28,'finding':'All five remain unknown; AI reference fronts not independently certified.'},{'cause':'blurred_print','facts':2,'fractionOf28':2/28,'finding':'Both remain unknown in both trials.'},{'cause':'missed_object_color','facts':3,'fractionOf28':3/28,'finding':'Colors match after oracle localisation; automated detection recovery not tested.'},{'cause':'ink_color_reference_disagreement','facts':1,'fractionOf28':1/28,'finding':'Red both trials vs orange AI reference; unresolved, not counted recovered.'}],'trials':trials,'newCallsForFinalAnalysis':0,'productionAccuracyClaim':False}
(root/'analysis.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'trials':[t['counts'] for t in trials],'repeatAgreement':summary['repeatAgreement'],'newCalls':0}))
