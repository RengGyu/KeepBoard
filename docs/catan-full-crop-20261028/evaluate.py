"""Post-response direct visual adjudication; no model calls, GT rewriting, or value-based matching."""
import collections, hashlib, json, pathlib, os
from PIL import Image, ImageDraw
ROOT=pathlib.Path(__file__).resolve().parent
PRIVATE=pathlib.Path('/private/tmp/kb-catan-full-crop-20261028')
REF=ROOT.parent/'argon-full-elements-comparison-20261028/catan-visible-reference.json'
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def save(p,d):
    p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');os.chmod(p,0o600)
# Explicit correspondence fixed by looking at original/crops, independently of predicted values.
# Same-source fragments with conflicting kinds are retained in each group's rawRefs.
MAP={
'upper-left':dict(enumerate(['t01','t02','t03','t04','t05','t06','t07','t08','t09','t10','t11','t13','t14','t15','t18','t19','t17','n01','n02','n03','n04','n05','n06','n07','n08','n09','n10','n13','n14','n12','p02','p11','p03','p04','p06','p05','p07','p08','p01','additional-white-road','p12','p13','p09'])),
'upper-right':dict(enumerate(['t03','n03','t07','n07','t06','n06','t11','n10','t12','n11','t16','n15','t15','n14','t19','n18','t18','p10','p09','additional-coastal-marking','h04'])),
'lower-left':dict(enumerate(['t17','t18','t13','t14','t15','t19','n16','n17','n13','n18','p01','p13','p12','additional-white-road','p05','p08','h06','h05'])),
'lower-right':dict(enumerate(['t19','t18','t15','t16','n18','n17','h05','h04']))}
def main():
    plan=json.load(open(PRIVATE/'plan.json'));result=json.load(open(PRIVATE/'result.json'));ref=json.load(open(REF));refs={x['id']:x for x in ref['objects']}
    assert sha(plan['source']['path'])==plan['source']['sha256']
    rows=[];groups=collections.defaultdict(list)
    for r in result['rows']:
        assert r['http']==200 and r['finishReason']=='STOP'
        assert sha(PRIVATE/(r['id']+'.native.json'))==r['rawSHA']
        c=next(c for c in plan['crops'] if c['id']==r['id']);l,t,rr,b=c['sourceBoxPx']
        assert sha(c['requestPath'])==c['requestSHA']
        assert len(r['parsed']['items'])==len(MAP[r['id']])
        for i,x in enumerate(r['parsed']['items']):
            y1,x1,y2,x2=x['box_1000'];assert 0<=x1<x2<=1000 and 0<=y1<y2<=1000
            box=[l+x1*(rr-l)/1000,t+y1*(b-t)/1000,l+x2*(rr-l)/1000,t+y2*(b-t)/1000]
            out={**x,'rawRef':r['id']+':'+str(i),'originalBoxPx':box,'visualCorrespondence':MAP[r['id']][i]}
            rows.append(out);groups[MAP[r['id']][i]].append(out)
    merged=[]
    for ident,items in groups.items():
        # Largest visible envelope is display-only; conflicts are never overwritten.
        representative=max(items,key=lambda x:(x['originalBoxPx'][2]-x['originalBoxPx'][0])*(x['originalBoxPx'][3]-x['originalBoxPx'][1]))
        variants={k:sorted(set(str(x[k]) for x in items)) for k in ['kind','terrainType','number','color','ratio','resource']}
        merged.append({'id':ident,'reference':refs.get(ident),'rawRefs':[x['rawRef'] for x in items],'displayBoxPx':representative['originalBoxPx'],'variants':variants,'seamConflict':any(len(v)>1 for k,v in variants.items() if k in ['kind','terrainType'] and not set(v)<=set(['hill','hills','None']) and not set(v)<=set(['mountain','mountains','None']) and not set(v)<=set(['field','fields','None']))})
    save(PRIVATE/'original-coordinate-results.json',{'rawItems':rows,'visualGroups':merged,'missingReferenceIds':[x for x in refs if x not in groups],'dedup':'Manual source-box/visual identity grouping, not count- or value-based. Conflicting same-object kinds remain in variants; no inferred hidden observations.'})
    totals={k:sum(r.get('usage',{}).get(k,0) for r in result['rows']) for k in ['promptTokenCount','candidatesTokenCount','thoughtsTokenCount','totalTokenCount']}
    high_numbers=[x for x in ref['objects'] if x['kind']=='number-token' and x['confidence']=='high' and x.get('number') is not None]
    vals=[]
    for x in high_numbers:
        v={q['number'] for q in groups[x['id']] if q['number'] is not None}
        vals.append({'referenceId':x['id'],'referenceNumber':x['number'],'observedNumbers':sorted(v),'status':'correct' if v=={x['number']} else 'wrong' if x['number'] not in v else 'conflicting'})
    save(PRIVATE/'high-confidence-number-comparison.json',vals)
    same_kind_groups=len(set((x['visualCorrespondence'],x['kind']) for x in rows))
    report={'version':'catan-full-crop-result-v1','evidence':'VERIFIED runtime/hash; direct AI visual interpretation, not certified human GT','sourceSHA':plan['source']['sha256'],'referenceSHA':sha(REF),'planSHA':sha(PRIVATE/'plan.json'),'promptSHA':plan['promptSHA'],'calls':4,'retries':0,'appCalls':0,'http200':4,'parallelWallMs':result['parallelWallMs'],'usage':totals,'thoughtsAccounting':'No thoughtsTokenCount field returned in any crop; aggregate 0 is reported/absent, not proof of zero internal computation.','cropResults':[{k:r.get(k) for k in ['id','http','elapsedMs','requestSHA','rawSHA','reportedModel','responseId','finishReason','usage']} for r in result['rows']],
    'rawObjectCount':len(rows),'rawKindCounts':dict(collections.Counter(x['kind'] for x in rows)),'sameKindSeamGroupCount':same_kind_groups,'sameKindRepeatedRows':len(rows)-same_kind_groups,'crossKindConflictPhysicalGroups':same_kind_groups-len(groups),'visualIdentityGroupCount':len(groups),'dedupClarification':'58 same-kind source groups remain after 32 repeated rows; three cross-kind conflicts are linked to the same physical identities for review only, never silently discarded. 55 physical candidate groups are not 55 correct objects.','missingFrozenReferenceIds':[x for x in refs if x not in groups],'fullAccuracy':None,
    'assessment':{
      'terrain':{'assessableObjects':19,'physicalMatches':19,'misses':0,'unanimousCorrectTerrainValues':18,'seamValueConflictObjects':1,'conflict':'t16 is hills in upper-right but clipped lower-right fragment is mountains. hill/hills, field/fields, mountain/mountains are grammatical aliases only.'},
      'number-token':{'assessablePhysicalDiscs':18,'physicalMatches':18,'misses':0,'highConfidenceValueDenominator':len(high_numbers),'highConfidenceCorrect':sum(x['status']=='correct' for x in vals),'highConfidenceWrong':sum(x['status']=='wrong' for x in vals),'wrongReferenceIds':[x['referenceId'] for x in vals if x['status']=='wrong'],'unknownFrozenValues':['n01','n12'],'mediumConfidenceNotInStrictScore':['n06','n10'],'note':'n02 frozen 6 is returned as 9. n01 is returned as 8 but the prior reference is null, so not scored. Occluded n12 is detected with null.'},
      'robber':{'assessableObjects':1,'physicalMatches':1,'misses':0,'kindAndColorCorrect':1},
      'road':{'definiteVisibleDenominator':5,'definitePhysicalMatches':5,'missesWithinDefiniteDenominator':0,'additionalSubtypeUncertainObjects':1,'seamWrongKindFragments':['lower-left:14','lower-left:15'],'note':'Both red road fragments actually correspond to buildings p05/p08. p06 is a real red object but exact road/settlement subtype remains uncertain.'},
      'settlement':{'exactSubtypeDenominator':None,'rawRows':2,'reason':'Custom sculpted buildings have uncertain settlement/city silhouettes; physical building correspondence is assessed jointly below.'},
      'city':{'exactSubtypeDenominator':None,'rawRows':6,'reason':'No certified settlement-versus-city GT; raw labels and conflicting fragments are preserved.'},
      'buildings-joint':{'definitePhysicalDenominator':6,'definitePhysicalMatches':6,'missesWithinDefiniteDenominator':0,'uncertainPhotoAndBoxCorrespondence':['p11'],'note':'Top blue building is now present as upper-left:30. The pale upper piece p11 is uncertain and its predicted box is displaced upward; not credited as definite.'},
      'harbor':{'frozenCandidateMarkings':6,'referenceBoxMatches':3,'referenceMisses':['h01','h02','h03'],'newVisuallySupportedCoastalMarking':1,'newMarkingRawRef':'upper-right:19','highConfidenceRatioDenominator':2,'highConfidenceRatioCorrect':2,'resourceAccuracy':None,'note':'Lower two printed 3:1 ratios are visually supported. Right two 2:1 readings are tentative; resource icon not confidently readable. Old census is not exhaustive.'}},
    'referenceCaveats':[{'referenceId':'n06','type':'suspected-reference-value-error','oldValue':9,'directCropReading':4,'evidence':'Source x476..543,y493..539 shows a rotated 4; both overlapping crop responses also say 4. Excluded from strict high-confidence score; prior reference unchanged.'},{'referenceId':'additional-white-road','type':'prior-census-omission','boxPx':[420,800,484,845],'evidence':'Pale narrow physical road beside lower white building, visible in original and two crops; counted as direct visual supplement, not inserted into old GT.'},{'referenceId':'additional-coastal-marking','type':'prior-census-omission-or-uncertainty','boxPx':[897,578,928,601],'evidence':'Printed coastal ratio marking at right edge. It is not a physical road/building; old sparse census lacks this candidate.'}],
    'privateArtifacts':{'directory':str(PRIVATE),'originalCoordinates':str(PRIVATE/'original-coordinate-results.json'),'annotatedOverview':str(PRIVATE/'overview.jpg')},
    'baselineComparison':{'whole':{'elapsedMs':45665,'totalTokens':12091,'task':'native canonical scene schema, different prompt/output contract','note':'Baseline raw reported no roads/harbors, and only 4 building rows; those counts are not physical recall.'},'limitedParallelROI':{'elapsedMs':8872,'totalTokens':6729,'task':'road/building/harbor only, incomplete photo coverage','note':'Cannot claim full-crop speed superiority: all-kind full-board job took longer than limited task.'},'current':{'elapsedMs':result['parallelWallMs'],'totalTokens':totals['totalTokenCount'],'task':'all requested kinds in four full-board quadrants, no canonical slots'},'moneyCost':None,'moneyLimit':'No invoice or certified current per-token billing inspected; token usage is measured, money is not.'},
    'limitations':['One previously used photo, no holdout or general accuracy claim.','Source board is itself cut off at left; no inventory completion.','Direct visual grouping is post-response adjudication, not a reusable production dedup solver.','All returned boxes are preserved; an object match does not certify exact boundary or topology.','Largest-envelope display record does not suppress seam attribute conflicts.']}
    save(ROOT/'result.json',report)
    im=Image.open(plan['source']['path']).convert('RGB');draw=ImageDraw.Draw(im)
    colors={'t':'#0088ff','n':'#ff8c00','p':'#cc00cc','h':'#00aa66','a':'#ff0000'}
    for x in merged:
        box=x['displayBoxPx'];color=colors.get(x['id'][0],'red');draw.rectangle(box,outline=color,width=2);draw.text((box[0],box[1]),x['id'],fill=color,stroke_width=1,stroke_fill='white')
    im.save(PRIVATE/'overview.jpg',quality=95);os.chmod(PRIVATE/'overview.jpg',0o600)
    print(json.dumps({'raw':len(rows),'visualGroups':len(groups),'sameKindRepeatedRows':len(rows)-same_kind_groups,'crossKindConflicts':same_kind_groups-len(groups),'tokens':totals,'wallMs':result['parallelWallMs'],'strictNumber':collections.Counter(x['status'] for x in vals),'reportSHA':sha(ROOT/'result.json')},ensure_ascii=False))
if __name__=='__main__':main()
