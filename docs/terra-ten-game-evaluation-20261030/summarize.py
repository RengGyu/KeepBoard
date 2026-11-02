"""Offline aggregation only; frozen request/reference/result inputs are never rewritten."""
from pathlib import Path
import json, hashlib, statistics, datetime

OUT = Path(__file__).resolve().parent
def read(p): return json.loads(Path(p).read_text())
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def write(name, value): (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
pre = read(OUT / 'preflight.json'); private = Path(pre['privateDir'])
evaluation = read(OUT / 'evaluation-preflight.json'); scores = read(OUT / 'scores.json')
execution = read(OUT / 'recovery-execution.json'); original = read(OUT / 'execution.json')
states = ['correct', 'wrong', 'unknown', 'missing-object', 'observed-unjudged']

def totals(rows):
    result = {key: sum(r[key] for r in rows) for key in ['referenceObjects', 'individualDetected', 'missingIndividual', 'scorableKinds', 'correctKind']}
    for kind in ['attributes', 'nonFaceAttributes', 'nonTextNonFace', 'numeric', 'text']:
        result[kind] = {key: sum(r[kind][key] for r in rows) for key in ['denominator'] + states}
        assert sum(result[kind][key] for key in states) == result[kind]['denominator']
    return result

requests = []
for r in execution['rows']:
    u = r['usage']; inp = u['input_tokens']; out = u['output_tokens']; cr = u['input_tokens_details'].get('cached_tokens', 0); cw = u['input_tokens_details'].get('cache_write_tokens', 0)
    assert inp >= cr + cw
    # Official default 30m cache writes are a total rate, not an additive surcharge.
    cost = ((inp-cr-cw)*1 + cr*.05 + cw*1.25 + out*5)/1e6
    requests.append({'id':r['id'], 'gameId':r['gameId'], 'variant':r['variant'], 'providerMs':r['providerMs'], 'inputTokens':inp, 'cachedReadTokens':cr, 'cacheWriteTokens':cw, 'outputTokens':out, 'reasoningTokens':u['output_tokens_details']['reasoning_tokens'], 'totalTokens':u['total_tokens'], 'estimatedUSD':cost, 'actualInvoiceUSD':None})
    assert inp + out == u['total_tokens']

games=[]
for r in scores['cases']:
    w, crop = r['variants']; timings={q['variant']:q for q in requests if q['gameId']==r['gameId']}
    games.append({'gameId':r['gameId'], 'priorTerraExposure':r['priorTerraExposure'], 'priorGeminiExposure':r['priorGeminiExposure'], 'referencePartitions':r['partitions'],
      'whole':w['editableSubset'], 'roi':crop['editableSubset'], 'fusion':r['fusion']['assessedEditable'],
      'rawWholeRows':w['rawRows'], 'rawROIRows':crop['rawRows'], 'editableTotal':r['fusion']['allEditableObjects'],
      'unresolvedGroups':r['fusion']['unresolvedGroups'], 'unassessedLinks':r['fusion']['unassessedOrUncertainLinks'],
      'timing':timings, 'pairEstimatedUSD':sum(v['estimatedUSD'] for v in timings.values()),
      'fusionMs':r['fusion']['projectMs']})
total_tokens={k:sum(q[k] for q in requests) for k in ['inputTokens','cachedReadTokens','cacheWriteTokens','outputTokens','reasoningTokens','totalTokens']}
summary={'scope':'10 games × one whole + one same-original physical ROI; bounded pre-output partial AI references, not whole-photo or 120-game accuracy',
 'originalAttempts':{'calls':original['calls'],'transportFailures':sum(bool(r.get('transportFailure')) for r in original['rows']),'httpResponses':sum('httpStatus' in r for r in original['rows']),'billingUSD':None,'reachedUpstream':None,'preserved':True},
 'authorizedRecovery':{'calls':execution['calls'],'http200':sum(r.get('httpStatus')==200 for r in execution['rows']),'nativeCompleted':sum(r.get('status')=='completed' for r in execution['rows']),'productCompleted':sum(r['state']=='completed' for r in execution['results']),'peak':execution['peak'],'automaticRetries':0,'firstSuccessGate':execution['firstSucceeded'],'wallMs':execution['wallMs']},
 'totals':{'wholeEditable':totals([r['variants'][0]['editableSubset'] for r in scores['cases']]),'roiEditable':totals([r['variants'][1]['editableSubset'] for r in scores['cases']]),'finalEditable':totals([r['fusion']['assessedEditable'] for r in scores['cases']]),'wholeRawReferenceObjects':sum(r['variants'][0]['rawObjectAndValueMetrics']['referenceObjects'] for r in scores['cases']),
  'rawObservations':sum(r['fusion']['rawObservationCount'] for r in scores['cases']),'finalAllEditableObjects':sum(r['fusion']['allEditableObjects'] for r in scores['cases']),
  'spatialDuplicateCandidates':sum(r['fusion']['assessedEditable']['spatialDuplicateCandidates'] for r in scores['cases']), 'confirmedDuplicatePhysicalObjects':1,'unresolvedDuplicateCandidates':1,
  'confirmedWrongLinksWithinReference':sum(r['fusion']['confirmedWrongLinks'] for r in scores['cases']),'unassessedOrUncertainLinks':sum(r['fusion']['unassessedOrUncertainLinks'] for r in scores['cases'])},
 'numericInterpretation':{'frozenWholeAndFinalMismatches':2,'independentPhotoSupportedModelMisread':1,'referenceSuspectKeptFrozen':1,'noRegrading':True,'numericPhotoAccuracy':None},
 'latency':{'providerMinMs':min(q['providerMs'] for q in requests),'providerMedianMs':statistics.median(q['providerMs'] for q in requests),'providerMaxMs':max(q['providerMs'] for q in requests),'providerSumMs':sum(q['providerMs'] for q in requests),'preprocessMs':[c['preprocessingMs'] for c in pre['calls'] if c['variant']=='whole'],'fusionMsTotal':sum(g['fusionMs'] for g in games),'scanToVerifiedSaveMs':None,'manualCorrectionTimeMs':None,'memoryMeasured':False},
 'usage':total_tokens, 'cost':{'estimatedSuccessfulRecoveryUSD':sum(q['estimatedUSD'] for q in requests),'actualInvoiceUSD':None,'creditBalance':None,'originalFailedAttemptsUSD':None,'currency':'USD','ratesPerMillion':{'input':1,'output':5,'cacheRead':.05,'cacheWrite30m':1.25},'formula':'((input-cached_read-cache_write)*1 + cached_read*.05 + cache_write*1.25 + output*5)/1e6; reasoning is already part of output',
 'verifiedOn':'2026-10-30','sources':['https://developers.openai.com/api/docs/pricing','https://developers.openai.com/api/docs/guides/prompt-caching#monitor-cache-performance'],'defaultCacheTTL':'30m; omitted in request; official default, not a new setting'},
 'games':games, 'wholePhotoAccuracy':None,'productFilesChanged':0,'newCallsDuringScoring':0}
write('summary.json',summary)

# Exploratory surface audit. Groups remain groups: no individual recall/count credit is awarded.
def iou(a,b):
    inter=max(0,min(a[2],b[2])-max(a[0],b[0]))*max(0,min(a[3],b[3])-max(a[1],b[1]))
    return inter/((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-inter) if inter else 0
ref=read(private/'dominion.reference.json');refs=[r for r in ref['objects'] if r['roiRelation']=='full']
task=read(private/'dominion.task.json');im=task['scan']['units'][0]['hosted']['request']['images'][0];w,h=im['width'],im['height'];surface=[]
for variant in ['whole','roi','fusion']:
    d=read(private/('dominion.projection.json' if variant=='fusion' else f'recovery.dominion-{variant}.result.json'))
    pieces=[p for a in d['assertions'] for p in a['value']['pieces'] if p['componentId']=='cards' and p.get('region')]
    boxes=[[p['region']['x']*w,p['region']['y']*h,(p['region']['x']+p['region']['width'])*w,(p['region']['y']+p['region']['height'])*h] for p in pieces]
    matrix=[[iou(r['boxPx'],b) for b in boxes] for r in refs];details=[]
    for i,r in enumerate(refs):
        best=max(matrix[i]);js=[j for j,v in enumerate(matrix[i]) if abs(v-best)<1e-9];p=None
        if best>=.25 and len(js)==1:
            j=js[0];col=[row[j] for row in matrix]
            if abs(max(col)-best)<1e-9 and sum(abs(v-best)<1e-9 for v in col)==1:p=pieces[j]
        attrs=[]
        for prop in ['printedName','cardType']:
            expected=r['attributes'][prop];actual=p['readout']['values'][prop] if p else None
            attrs.append({'property':prop,'caseInsensitiveAgreement':isinstance(actual,str) and expected.casefold().strip()==actual.casefold().strip(),'observed':actual is not None})
        details.append({'referenceId':r['id'],'geometricallyMatchedSurface':p is not None,'attributes':attrs})
    surface.append({'variant':variant,'surfacesMatched':sum(r['geometricallyMatchedSurface'] for r in details),'surfaceDenominator':10,'caseInsensitiveTextAgreements':sum(a['caseInsensitiveAgreement'] for r in details for a in r['attributes']),'textDenominator':20,'details':details})
write('supplemental-surface-audit.json',{'posthocExploratory':True,'frozenPrimaryScoresChanged':False,'method':'Same reciprocal unique maximum IoU >= .25, but explicitly compares top-visible text of group records with top-face references; casefold/trim only. Not individual-card detection, not hidden-stack count.','gameId':'dominion','results':surface,'newProviderCalls':0})

audit={'newProviderCalls':0,'frozenReferencesChanged':False,'frozenScoresChanged':False,'scope':'Selected discrepancies examined after scoring. Interpretive audit does not retroactively change pre-output denominators.',
 'cases':[
 {'id':'old-sagrada-six','evidence':'old-six-diagnosis.json','classification':'5 MODEL_MISREAD_SUPPORTED; 1 UNKNOWN_PHOTO_LIMITED','claim':'All six mismatching numeric values were already in provider raw; five independent top-face readings agree with old reference, one cannot be established securely.','notProven':'Causal contribution of angle, side-face confusion and resolution; a better same-state photo was not available.'},
 {'id':'quacks-cross-kind-duplicate','classification':'VERIFIED_MODEL_KIND_ERROR_AND_FUSION_DUPLICATE','referenceId':'droplet-yellow','sourceSHA':read(private/'quacks.reference.json')['sourceSHA'],'raw':'recovery.quacks-roi.result.json:item-2','projection':'quacks.projection.json',
  'claim':'ROI item-2 boxes the yellow droplet but labels it pot. Whole goods and ROI pot survive as two editable records for that same visible physical object.',
  'pieces':['scan-3b3fdd8761f76fca454f101d2662','scan-bdd3b4270234df80496f4b10c9bb'],'code':['server/observationFusion.ts:compatible','server/observationFusion.ts:projectGenericFusion'],
  'minimumFollowup':'Keep raw claims; replay cross-kind disagreement before a narrow identity/duplicate-warning change. Do not merge every cross-kind overlap: boards legitimately overlap their pieces.'},
 {'id':'carcassonne-refined-parent-blocks-child','classification':'VERIFIED_FUSION_WITHHOLDING','referenceId':'tile-bottom-right','raw':'recovery.carcassonne-roi.result.json:item-23','projection':'carcassonne.projection.json',
  'claim':'ROI single tile item-23 is withheld by partialParent. Its relatedPieceId points to whole item-1 aggregate, which has already been removed from editable pieces by a partial refinement. The mapped child bottom is 453.66 px; aggregate bottom 453.12 px, so strict containment fails by 0.54 px.',
  'parentPieceId':'scan-7c55e1c684bf3167d0b785e91622','code':['server/observationFusion.ts:projectGenericFusion aggregateCandidates/refined','server/observationFusion.ts:partialParent'],
  'minimumFollowup':'Regression for retained aggregate provenance vs editable competitors after refinement; distinguish rounded aggregate extent from individual identity. No photo-specific tolerance or automatic child split from inventory.'},
 {'id':'scout-reference-suspect','classification':'REFERENCE_SUSPECT_NOT_CONFIRMED_MODEL_ERROR','referenceId':'hand-card-06','property':'bottomNumber','frozenReference':7,'provider':1,'photoInspection':'Visible blue oval on red 10 looks like 1; original partial AI reference 7 is suspect. Do not replace frozen reference retrospectively.','evidence':['scout.reference.json','scout-whole.new-score.json','scout-stack-inspection.png'],'needed':'Human verification of the original paired numeral before definitive accuracy scoring.'},
 {'id':'scout-six-nine','classification':'MODEL_MISREAD_SUPPORTED','referenceId':'hand-card-09','property':'bottomNumber','frozenReference':6,'provider':9,'photoInspection':'Yellow paired numeral on blue 2 can be independently read as 6; provider/final retains 9. Orientation confusion is plausible, not isolated causally.','evidence':['scout.reference.json','scout-whole.new-score.json','scout-stack-inspection.png']},
 {'id':'scout-overlapping-extra-card','classification':'UNKNOWN_DUPLICATE_CANDIDATE','referenceId':'hand-card-09','claim':'Geometry flags two records overlapping the reference. A nearly hidden green card is visible between blue cards, so overlap alone cannot establish a hallucinated duplicate.','evidence':['scout.fusion-score.json','scout-stack-inspection.png']},
 {'id':'dominion-group-frontface','classification':'REPRESENTATION_LIMIT_NOT_EMPTY_RECOGNITION','claim':'Whole/ROI output 13/10 card-stack groups. Each selected visible top-face title and type is retained; primary individual count 0/10 does not mean content was absent.','evidence':['supplemental-surface-audit.json','dominion.projection.json'],'limit':'No hidden stack size or separate card instance count established.'},
 {'id':'ticket-group-routes','classification':'VERIFIED_GROUP_OUTPUT_INDIVIDUAL_RECOVERY_MISSING','claim':'All 22 selected wagon references fall within group observations. No separately editable wagon geometry is established; grouped colored route records still exist.','evidence':['ticket-to-ride-whole.new-score.json','ticket-to-ride-roi.new-score.json','ticket-to-ride.projection.json'],'limit':'Do not split groups by legal route lengths; this study did not measure a user reproducing routes from grouped records.'},
 {'id':'codenames-text-reference','classification':'POSTHOC_REFERENCE_SUSPECT_AND_SEMANTIC_VARIATION','claim':'Five cover descriptions differ only in label specificity (blue/red vs blue/red agent). Four word pairs DITCH/PITCH, FUND/YARD, TAP/TAPE, WATCH/WATER need reference recheck; original visibly supports at least YARD and WATER and appears consistent with provider PITCH/TAPE. Frozen text metrics remain observed-unjudged.','evidence':['codenames-whole.new-score.json','codenames-roi.new-score.json'],'needed':'Independent human transcription, no paid model vote or output-conditioned rewrite.'},
 {'id':'blokus-color-language','classification':'POSTHOC_SEMANTIC_EQUIVALENCE','claim':'Whole/final 노랑 versus reference yellow is language variation in two free-text color fields, not a proven color error. Strict exact-text counts remain unchanged.','evidence':['blokus-whole.new-score.json','blokus.fusion-score.json']},
 {'id':'quacks-small-numerals','classification':'UNKNOWN_PHOTO_VS_MODEL_CONTRIBUTION','claim':'Eight numeric references remain zero correct (whole/final seven unknown, one missing; ROI eight missing). Chips are only about 25–29 original pixels across with soft marks; ROI creates no new captured detail. The earlier AI numeric references are not independently human-certified.','needed':'Genuinely sharper same-state closeup and independent transcription; existing crop cannot establish causal attribution.'}
 ]}
write('case-audit.json',audit)
print(json.dumps({'whole':summary['totals']['wholeEditable']['individualDetected'],'roi':summary['totals']['roiEditable']['individualDetected'],'final':summary['totals']['finalEditable']['individualDetected'],'denominator':summary['totals']['finalEditable']['referenceObjects'],'usage':total_tokens,'cost':summary['cost']['estimatedSuccessfulRecoveryUSD'],'latency':summary['latency'],'dominion':[{k:v for k,v in x.items() if k!='details'} for x in surface]},ensure_ascii=False,indent=2))
