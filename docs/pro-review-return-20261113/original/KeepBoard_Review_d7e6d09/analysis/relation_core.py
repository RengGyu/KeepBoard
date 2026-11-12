#!/usr/bin/env python3
"""Small, executable algorithm reference. NOT wired into production.

Corners and positive-side reference must come from observed/confirmed landmarks
in one qualified source scope; this file does not infer them or an owner.
Coordinates may be pixels or another common aspect-correct plane. The caller
keeps original image boxes, values and identities unchanged.
"""
from __future__ import annotations
import json, math
import numpy as np

def frame_from_corners(corners):
    """Source semantic TL,TR,BR,BL -> unit board plane; no guessed orientation.

    Requires a strictly convex, ordered, nondegenerate quad. Four points exactly
    determine a projective transform; fitting them is NOT a correctness proof.
    Independent landmarks/uncertainty envelopes must validate real deployment.
    """
    p=np.asarray(corners,dtype=float)
    if p.shape!=(4,2) or not np.isfinite(p).all():raise ValueError('four finite semantic corners required')
    cross=[]
    for i in range(4):
        a=p[(i+1)%4]-p[i];b=p[(i+2)%4]-p[(i+1)%4]
        cross.append(a[0]*b[1]-a[1]*b[0])
    if not(all(c>1e-10 for c in cross) or all(c< -1e-10 for c in cross)):raise ValueError('quad must be convex and ordered')
    rows=[];rhs=[]
    for (x,y),(u,v) in zip(p,[(0,0),(1,0),(1,1),(0,1)]):
        rows += [[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]];rhs += [u,v]
    a=np.asarray(rows);b=np.asarray(rhs)
    if np.linalg.matrix_rank(a)<8:raise ValueError('degenerate registration')
    h=np.append(np.linalg.solve(a,b),1).reshape(3,3)
    if not np.isfinite(h).all() or abs(np.linalg.det(h))<1e-12:raise ValueError('singular registration')
    return h.tolist()

def project(matrix,point):
    h=np.asarray(matrix,dtype=float);p=np.asarray([*point,1],dtype=float)
    if h.shape!=(3,3) or p.shape!=(3,) or not(np.isfinite(h).all() and np.isfinite(p).all()):raise ValueError('invalid projection')
    q=h@p
    if abs(q[2])<1e-12:raise ValueError('projective horizon')
    return (float(q[0]/q[2]),float(q[1]/q[2]))

def side_of_line(point,start,end,positive_reference,margin):
    """Board-relative A/B, invariant to translating/rotating the source frame.
    positive_reference is an observed board-side landmark, NOT image centre.
    margin is a supplied positional-uncertainty halfwidth in the same units.
    """
    coords=[*point,*start,*end,*positive_reference,margin]
    if not all(math.isfinite(v) for v in coords) or margin<0:raise ValueError('invalid side geometry')
    dx,dy=end[0]-start[0],end[1]-start[1];length=math.hypot(dx,dy)
    if length<1e-12:return None
    signed=lambda p:((p[0]-start[0])*(-dy)+(p[1]-start[1])*dx)/length
    ref=signed(positive_reference);at=signed(point)
    if abs(ref)<=1e-12 or abs(at)<=margin:return None
    return 'side-B' if at*ref>0 else 'side-A'

def group_key(source_key,board_ref,role,lane=None):
    """Qualified board-local grouping; an unknown board is never 'board 1'."""
    if not source_key or not board_ref or not role:raise ValueError('source, board, role are required')
    return json.dumps([source_key,board_ref,role,lane],ensure_ascii=False,separators=(',',':'))

def partial_order(ids,observed_before):
    """Topological levels, not a fabricated total physical order.
    Stable alphabetical order inside a level is DISPLAY order only.
    Cycles and nodes depending on cycles remain visible as unresolved.
    """
    ids=list(dict.fromkeys(ids));allowed=set(ids);edges={x:set() for x in ids};rejected=[]
    for a,b in observed_before:
        if a not in allowed or b not in allowed or a==b:rejected.append([a,b]);continue
        edges[a].add(b)
    indegree={x:0 for x in ids}
    for targets in edges.values():
        for b in targets:indegree[b]+=1
    pending=set(ids);levels=[]
    while pending:
        ready=sorted(x for x in pending if indegree[x]==0)
        if not ready:break
        levels.append(ready)
        for x in ready:
            pending.remove(x)
            for b in edges[x]:indegree[b]-=1
    return dict(levels=levels,unresolved=sorted(pending),rejected_edges=rejected,
                total_order_known=not pending and not rejected and all(len(x)==1 for x in levels))
