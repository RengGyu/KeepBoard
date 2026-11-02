"""Geometry-first sparse photo comparison. This does not measure full-image precision/recall."""
import json
import math
import unicodedata

MIN_IOU = .25

def iou(a, b):
    inter=max(0,min(a[2],b[2])-max(a[0],b[0]))*max(0,min(a[3],b[3])-max(a[1],b[1]))
    union=(a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-inter
    return inter/union if union>0 else 0

def same(a,b):
    if isinstance(a,str) and isinstance(b,str):return unicodedata.normalize('NFC',a).strip().casefold()==unicodedata.normalize('NFC',b).strip().casefold()
    if isinstance(a,bool) or isinstance(b,bool):return type(a) is type(b) and a==b
    return a==b

def color_family(value):
    if not isinstance(value,str):return None
    v=unicodedata.normalize('NFC',value).strip().casefold().replace('-', ' ')
    aliases={'파랑':'blue','파란색':'blue','파란':'blue','보라':'purple','보라색':'purple','violet':'purple','빨강':'red','빨간색':'red','빨간':'red','초록':'green','초록색':'green','녹색':'green','노랑':'yellow','노란색':'yellow','노란':'yellow','검정':'black','검은색':'black','검은':'black','하양':'white','흰색':'white','흰':'white','주황':'orange','주황색':'orange','회색':'gray','grey':'gray','분홍':'pink','분홍색':'pink','갈색':'brown'}
    if v in aliases:return aliases[v]
    words=v.split()
    modifiers={'light','dark','bright','pale','deep','vivid','navy'}
    base=[w for w in words if w not in modifiers]
    if len(base)==1 and base[0] in {'blue','purple','red','green','yellow','black','white','orange','gray','pink','brown'}:return base[0]
    return None

def compare(reference, items, semantic_properties=None, unsupported_properties=None):
    semantic_properties=semantic_properties or {}
    unsupported_properties=unsupported_properties or {}
    anchors=reference['anchors'];W,H=reference['width'],reference['height']
    boxes=[]
    for item in items:
        b=item.get('box_1000')
        boxes.append([b[1]*W/1000,b[0]*H/1000,b[3]*W/1000,b[2]*H/1000] if isinstance(b,list) and len(b)==4 else None)
    matrix=[[iou(a['boxPx'],b) if b else 0 for b in boxes] for a in anchors]
    rows=[]
    for i,anchor in enumerate(anchors):
        scores=matrix[i];best=max(scores,default=0);choices=[j for j,v in enumerate(scores) if math.isclose(v,best,abs_tol=1e-12)]
        status='matched';j=choices[0] if choices else None
        if best<MIN_IOU:status='not-localized'
        elif len(choices)!=1:status='ambiguous'
        elif sum(math.isclose(matrix[k][j],max(row[j] for row in matrix),abs_tol=1e-12) for k in range(len(anchors)))!=1 or max(range(len(anchors)),key=lambda k:matrix[k][j])!=i:status='ambiguous'
        item=items[j] if status=='matched' else None
        attrs={}
        if item:
            for p in item.get('attributes',[]):
                if p.get('valueJson') is not None:
                    try:attrs[p['id']]=json.loads(p['valueJson'])
                    except (json.JSONDecodeError,TypeError):pass
            # Quantity/face have mandatory top-level representations, including when duplicate attributes are omitted.
            attrs.update(quantity=item.get('quantity'),face=item.get('face'))
        props=[]
        for key,expected in anchor.get('properties',{}).items():
            assert expected is not None,'Unknown reference values must be outside the scoring denominator'
            actual=attrs.get(key)
            semantic=key in semantic_properties.get(anchor['componentId'],set())
            unsupported=key in unsupported_properties.get(anchor['componentId'],set())
            color_equivalent=key=='observedColor' and color_family(expected) is not None and color_family(expected)==color_family(actual)
            props.append(dict(id=key,reference=expected,service=actual,state='unsupported-by-reader' if unsupported else 'semantic-review-unscored' if semantic else 'unmatched' if not item else 'unknown-or-omitted' if actual is None else 'agrees' if same(expected,actual) else 'agrees-color-family' if color_equivalent else 'differs'))
        rows.append(dict(anchorId=anchor['id'],matchStatus=status,nativeIndex=j if item else None,iou=best,expectedKind=anchor['componentId'],serviceKind=item.get('kind') if item else None,kindAgrees=anchor['componentId']==item.get('kind') if item else False,properties=props))
    matched=sum(r['matchStatus']=='matched' for r in rows);kinds=sum(r['kindAgrees'] for r in rows)
    allprops=[p for r in rows for p in r['properties'] if p['state'] not in ['semantic-review-unscored','unsupported-by-reader']]
    unsupported_count=sum(p['state']=='unsupported-by-reader' for r in rows for p in r['properties'])
    semantic_count=sum(p['state']=='semantic-review-unscored' for r in rows for p in r['properties'])
    exact_good=sum(p['state']=='agrees' for p in allprops)
    good=sum(p['state'] in ['agrees','agrees-color-family'] for p in allprops)
    return dict(anchorCount=len(rows),matchedAnchors=matched,kindAgreements=kinds,visiblePropertyCount=len(allprops),visiblePropertyAgreements=good,exactVisiblePropertyAgreements=exact_good,colorExpressionVariants=good-exact_good,semanticUnscoredProperties=semantic_count,unsupportedProperties=unsupported_count,allSampledAnchorsAgree=matched==kinds==len(rows) and good==len(allprops),nativeObjectCount=len(items),unscoredOutputCount=len(items)-len({r['nativeIndex'] for r in rows if r['nativeIndex'] is not None}),coverage='sparse independent anchors only; extra outputs are unscored',rows=rows)

if __name__=='__main__':
    # A kind/value mismatch cannot change geometric correspondence; unknowns and merged/tied detections never count as correct.
    ref=dict(width=100,height=100,anchors=[dict(id='a',boxPx=[10,10,30,30],componentId='token',properties={'number':6})])
    wire=lambda kind,value,box=[100,100,300,300]:dict(kind=kind,box_1000=box,face='front',quantity=1,attributes=[dict(id='number',valueJson=json.dumps(value) if value is not None else None,unknownReason=None if value is not None else 'unreadable')])
    assert compare(ref,[wire('wrong',9)])['rows'][0]['nativeIndex']==0
    assert compare(ref,[wire('wrong',9)])['kindAgreements']==0
    assert compare(ref,[wire('token',None)])['visiblePropertyAgreements']==0
    assert compare(ref,[wire('token',6),wire('token',6)])['rows'][0]['matchStatus']=='ambiguous'
    assert compare(ref,[wire('token',6)])['allSampledAnchorsAgree']
    assert compare(ref,[])['matchedAnchors']==0
    assert compare(ref,[wire('token',9)],{'token':{'number'}})['semanticUnscoredProperties']==1
    assert compare(ref,[wire('token',9)],unsupported_properties={'token':{'number'}})['unsupportedProperties']==1
    assert color_family('blue')==color_family('light blue')==color_family('파란색')
    assert color_family('red')!=color_family('orange')
    assert color_family('dark green')!=color_family('black')
    print('11 offline comparison checks passed; no model calls')
