#!/usr/bin/env python3
"""Offline, value-blind correspondence. No network or model calls.

Inputs use normalized [left, top, right, bottom] *visible-face* boxes.
Colour, numeric values, labels, provider IDs and inferred sourceAreaId are NOT
identity gates. Source image hash is a gate when supplied on both sides.
The geometric thresholds below are exposed diagnostic defaults, not calibrated
KeepBoard performance targets. Freeze them before adjudicating evaluated values.
"""
from __future__ import annotations
import argparse, csv, json, math
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
import numpy as np
from scipy.optimize import linear_sum_assignment

@dataclass(frozen=True)
class MatchPolicy:
    min_iou: float = .05
    max_normalized_center: float = .65
    min_area_ratio: float = .15
    ambiguity_cost_delta: float = .06
    unmatched_cost: float = .8
    merge_cover: float = .8
    distinct_face_iou: float = .1


def valid_box(b: Any) -> bool:
    return (isinstance(b, (list, tuple)) and len(b) == 4 and
            all(isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x) for x in b)
            and 0 <= b[0] < b[2] <= 1 and 0 <= b[1] < b[3] <= 1)


def area(b): return (b[2]-b[0])*(b[3]-b[1])
def intersection(a,b): return max(0,min(a[2],b[2])-max(a[0],b[0]))*max(0,min(a[3],b[3])-max(a[1],b[1]))
def iou(a,b):
    z=intersection(a,b)
    return z/(area(a)+area(b)-z)
def source_compatible(a,b):
    return not(a.get('source_sha') and b.get('source_sha')) or a['source_sha']==b['source_sha']


def match_objects(truth: list[dict], predictions: list[dict], *, aspect: float=1,
                  policy: MatchPolicy=MatchPolicy()) -> dict:
    """Return stable one-to-one correspondences, ambiguity and suspected merges.

    A Hungarian solution alone is NOT an identity proof. Forbid each selected
    edge and solve again; near-equal alternative assignments are withheld. A
    broad detection covering multiple distinct visible faces is NOT silently
    credited as one correct individual. Overlapping reference boxes remain
    ambiguous instead of becoming an automatic merge claim.
    """
    if not math.isfinite(aspect) or aspect<=0: raise ValueError('aspect must be positive')
    for collection in (truth,predictions):
        ids=[o['id'] for o in collection]
        if len(ids)!=len(set(ids)): raise ValueError('IDs must be unique within a source layer')
    gt=[o for o in truth if valid_box(o.get('bbox'))]
    pr=[o for o in predictions if valid_box(o.get('bbox'))]
    out=dict(matches=[],ambiguous=[],merged_candidates=[],unmatched_truth=[],unmatched_predictions=[],
             invalid_truth=[o['id'] for o in truth if not valid_box(o.get('bbox'))],
             invalid_predictions=[o['id'] for o in predictions if not valid_box(o.get('bbox'))],
             policy=asdict(policy), evidence_kind='geometric_correspondence_not_visual_adjudication')
    merged_g=set(); merged_p=set()
    for j,p in enumerate(pr):
        covered=[i for i,g in enumerate(gt) if source_compatible(g,p) and intersection(g['bbox'],p['bbox'])/area(g['bbox'])>=policy.merge_cover]
        distinct=[(a,b) for k,a in enumerate(covered) for b in covered[k+1:]
                  if iou(gt[a]['bbox'],gt[b]['bbox'])<policy.distinct_face_iou]
        # A truth annotation may itself explicitly be a pile/group.
        distinct=[(a,b) for a,b in distinct if not gt[a].get('is_group') and not gt[b].get('is_group')]
        if distinct:
            affected=set(sum(([a,b] for a,b in distinct),[]));merged_g.update(affected);merged_p.add(j)
            out['merged_candidates'].append(dict(prediction_id=p['id'],truth_ids=[gt[i]['id'] for i in sorted(affected)],
                status='wide_box_multiple_visible_faces_requires_review'))
    n,m=len(gt),len(pr);size=n+m;BIG=1e6
    if not size:return out
    cost=np.full((size,size),BIG,dtype=float);diagnostics={}
    for i,g in enumerate(gt):
        a=g['bbox'];ad=math.hypot((a[2]-a[0])*aspect,a[3]-a[1])
        for j,p in enumerate(pr):
            if j in merged_p or not source_compatible(g,p):continue
            b=p['bbox'];bd=math.hypot((b[2]-b[0])*aspect,b[3]-b[1]);ov=iou(a,b)
            distance=math.hypot(((a[0]+a[2]-b[0]-b[2])/2)*aspect,(a[1]+a[3]-b[1]-b[3])/2)/max((ad+bd)/2,1e-12)
            ratio=min(area(a),area(b))/max(area(a),area(b))
            if ratio<policy.min_area_ratio or not(ov>=policy.min_iou or distance<=policy.max_normalized_center):continue
            v=.65*(1-ov)+.35*min(distance,1.5)
            cost[i,j]=v;diagnostics[i,j]=dict(iou=ov,normalized_center_distance=distance,cost=v)
        cost[i,m+i]=policy.unmatched_cost
    for j in range(m):cost[n+j,j]=policy.unmatched_cost
    cost[n:,m:]=0
    rr,cc=linear_sum_assignment(cost);base=float(cost[rr,cc].sum())
    pairs={(i,j) for i,j in zip(rr,cc) if i<n and j<m and cost[i,j]<BIG/2}
    ambiguous_g=set();ambiguous_p=set();alternative_edges=set()
    for i,j in sorted(pairs):
        alternative=cost.copy();alternative[i,j]=BIG
        r,c=linear_sum_assignment(alternative);delta=float(alternative[r,c].sum())-base
        if delta<=policy.ambiguity_cost_delta+1e-9:
            ap={(a,b) for a,b in zip(r,c) if a<n and b<m and alternative[a,b]<BIG/2}
            changed=pairs.symmetric_difference(ap)
            for a,b in changed:
                ambiguous_g.add(a);ambiguous_p.add(b);alternative_edges.add((a,b))
    for i,j in sorted(pairs):
        if i in ambiguous_g or j in ambiguous_p:continue
        out['matches'].append(dict(truth_id=gt[i]['id'],prediction_id=pr[j]['id'],**diagnostics[i,j],status='proposed_geometry_match'))
    for i,j in sorted(alternative_edges):
        out['ambiguous'].append(dict(truth_id=gt[i]['id'],prediction_id=pr[j]['id'],status='competing_correspondence',**diagnostics.get((i,j),{})))
    matched_g={r['truth_id'] for r in out['matches']};matched_p={r['prediction_id'] for r in out['matches']}
    out['unmatched_truth']=[g['id'] for i,g in enumerate(gt) if g['id'] not in matched_g and i not in ambiguous_g and i not in merged_g]
    out['unmatched_predictions']=[p['id'] for j,p in enumerate(pr) if p['id'] not in matched_p and j not in ambiguous_p and j not in merged_p]
    return out


def attribute_status(reference: dict, value: Any, requested: bool=True) -> str:
    if not requested:return 'not_requested'
    if reference.get('status')!='readable':return 'photo_unjudgeable'
    if value is None:return 'app_unknown'
    # Explicit aliases can be supplied on the reference field. Do not use them
    # to pair objects, change stored values or guess unlisted shade synonyms.
    expected=reference.get('value');aliases=reference.get('aliases',[])
    return 'match' if type(value)==type(expected) and value==expected or value in aliases else 'definite_misread'


def load_case(path: Path) -> dict:
    case=json.loads(path.read_text(encoding='utf-8'))
    if 'content' in case and isinstance(case['content'],str):case=json.loads(case['content'])
    return case


def observations_from_case(case:dict) -> list[dict]:
    """Normalized stored pieces, not a reconstruction of hidden physical items.
    Preserve assertion IDs separately, deduplicate only identical live piece IDs
    on the same evidence/owner. Conflicting variants are marked, not overwritten.
    """
    receipts=case.get('receipts',[]);out={}
    for a in case.get('assertions',[]):
        value=a.get('value',{});pieces=value.get('pieces',[]) if isinstance(value,dict) else []
        attached=a.get('observationReceipts') or [receipts[i] for i in a.get('observationReceiptRefs',[]) if isinstance(i,int) and 0<=i<len(receipts)]
        for p in pieces:
            b=p.get('region');bbox=[b['x'],b['y'],b['x']+b['width'],b['y']+b['height']] if isinstance(b,dict) and all(k in b for k in ('x','y','width','height')) else None
            physical=json.dumps([a.get('ownerId'),p.get('evidenceId'),p['id']],ensure_ascii=False,separators=(',',':'))
            source_areas=set();requested=set();units=set()
            for r in attached:
                req=r.get('request',{});result=r.get('result',{})
                for o in result.get('observations',[]):
                    if r.get('componentRefs',{}).get(o.get('ref'))!=p['id']:continue
                    if o.get('sourceAreaId'):source_areas.add(o['sourceAreaId'])
                    requested.update(req.get('allowedPropertyIds',{}).get(o.get('componentId'),[]))
                    unit=r.get('hostedWire',{}).get('physicalUnits',{}).get(o.get('ref'))
                    if unit:units.add(unit)
            row=dict(id=physical,piece_id=p['id'],assertion_ids=[a['id']],kind=p.get('componentId'),bbox=bbox,
                     source_sha=case.get('sourcePhotoSHA256'),source_areas=sorted(source_areas),
                     values=p.get('readout',{}).get('values',{}),requested=sorted(requested),quantity=p.get('quantity'),
                     is_group=any(u!='single' for u in units),field=a.get('field'),stored=p)
            if physical in out:
                old=out[physical];old['assertion_ids'].append(a['id'])
                if (old['bbox']!=row['bbox'] or old['values']!=row['values'] or
                    old['kind']!=row['kind'] or old['quantity']!=row['quantity'] or
                    old['stored'].get('face')!=row['stored'].get('face')):old['conflicting_live_record']=True
            else:out[physical]=row
    return list(out.values())


def audit_case(case:dict, truth_case:dict, *, permit_provisional:bool=False) -> dict:
    status=truth_case.get('reviewStatus','unverified')
    if status not in {'direct-photo-reviewed','human-verified'} and not permit_provisional:
        raise ValueError('Ground truth is not visually reviewed; no automatic accuracy claim is allowed.')
    sha=case.get('sourcePhotoSHA256');truth_sha=truth_case.get('sha256')
    if not sha or not truth_sha or sha!=truth_sha:raise ValueError('source image SHA mismatch')
    gt=[dict(o,id=o.get('photoObjectId',o.get('id')),source_sha=sha) for o in truth_case['objects']]
    pr=observations_from_case(case);photos=case.get('photos',[])
    aspect=photos[0].get('width',1)/photos[0].get('height',1) if photos else 1
    correspondence=match_objects(gt,pr,aspect=aspect);gmap={o['id']:o for o in gt};pmap={o['id']:o for o in pr}
    rows=[]
    field_map=truth_case.get('propertyMapping',{})
    for link in correspondence['matches']:
        g,p=gmap[link['truth_id']],pmap[link['prediction_id']]
        for name,reference in g.get('attributes',{}).items():
            pid=field_map.get(name,name)
            requested=pid in p['requested'] if p['requested'] else False
            observed=(p['quantity'] if pid=='quantity' else
                      p['values'].get('face',p['stored'].get('face')) if pid=='face' else p['values'].get(pid))
            outcome='stored_record_conflict' if p.get('conflicting_live_record') else attribute_status(reference,observed,requested)
            rows.append(dict(case_id=case['caseId'],truth_id=g['id'],piece_id=p['piece_id'],field=pid,
                             reference_value=reference.get('value'),observed_value=observed,
                             status=outcome,
                             correspondence_status=link['status'],truth_status=status))
    counts={}
    for r in rows:counts[r['status']]=counts.get(r['status'],0)+1
    exhaustive=truth_case.get('exhaustive',False)
    return dict(caseId=case['caseId'],truthStatus=status,correspondence=correspondence,attributes=rows,
                metrics=dict(attribute_status_counts=counts,whole_photo_accuracy=None,correctly_placed=None,
                    missing_objects=len(correspondence['unmatched_truth']) if exhaustive else None,
                    extra_objects=len(correspondence['unmatched_predictions']) if exhaustive else None,
                    note='No whole-photo or placement accuracy inferred from matches. Review ambiguous/merged boxes and source scope separately.'))


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--case',type=Path,required=True);p.add_argument('--truth',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True);p.add_argument('--allow-provisional',action='store_true')
    args=p.parse_args();case=load_case(args.case);truth=json.loads(args.truth.read_text())
    candidates=truth.get('cases',[truth]);tc=next((c for c in candidates if c.get('sha256')==case.get('sourcePhotoSHA256')),None)
    if tc is None:raise ValueError('no truth for this exact source SHA')
    result=audit_case(case,tc,permit_provisional=args.allow_provisional)
    args.output.mkdir(parents=True,exist_ok=True)
    (args.output/'matching.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    rows=result['attributes'];keys=['case_id','truth_id','piece_id','field','reference_value','observed_value','status','correspondence_status','truth_status']
    with (args.output/'matched-results.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows(rows)
    print(json.dumps(result['metrics'],ensure_ascii=False,indent=2))

if __name__=='__main__':main()
