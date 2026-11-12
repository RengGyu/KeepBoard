#!/usr/bin/env python3
"""Materialize manual Sol visual decisions; offline, never mutates source inputs.
This is bookkeeping, not a new image-recognition model or an accuracy oracle.
"""
from pathlib import Path
from collections import Counter
import csv,json,hashlib,math,datetime,re
from PIL import Image
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
DATA=ROOT/'docs/pro-review-20261113/data'
def read(p): return json.loads(p.read_text())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(n,v): (OUT/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def csvout(n,rows):
 keys=list(dict.fromkeys(k for row in rows for k in row))
 with (OUT/n).open('w',newline='',encoding='utf-8-sig') as f:
  w=csv.DictWriter(f,fieldnames=keys);w.writeheader()
  for r in rows:w.writerow({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else v for k,v in r.items()})
freeze=read(OUT/'independent-freeze.json');assert sha(OUT/'independent-photo-notes.json')==freeze['sha256']
notes=read(OUT/'independent-photo-notes.json')
paths=sorted(DATA.glob('cases/*.json'))+sorted(DATA.glob('packs/*.json'))+sorted(DATA.glob('structures/*.json'))
inputs={str(p.relative_to(ROOT)):sha(p) for p in paths}
sg=[o for o in notes['sagrada'] if o['occupied']]
lc=[dict(o) for o in notes['lost-cities'] if o['role']=='expedition']
# Photo re-review amendments are explicit and never replace the frozen notes.
# Far-yellow shows five distinct exposed black leading bands, not six.
lc=[o for o in lc if o['id']!='far-yellow-6']
for o in lc:
 if o['side']=='far' and o['line']=='yellow':
  i=o['order_from_board'];o['center_px']={1:[455,208],2:[429,201],3:[403,193],4:[379,184],5:[314,174]}[i]
  if i==5:o['visibility']='top-face-visible'
  o['value']='investment' if i<=2 else None
save('photo-amendments.json',{'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'after_model_data_exposure':True,'frozen_notes_unchanged':True,'changes':[{'object':'far-yellow-6','action':'withdraw-as-separate-card','reason':'Re-view of original crop lc-far-yellow-rot165.png shows five distinct leading black bands (two investment symbols + three numeric bands), not six. Original freeze over-segmented the full top card. No model agreement used as truth. Numeric values of three small bands remain null.'}],'additional_photo_correction':{'anchor':'left','frozen_visibleName':'Halikarnassos','corrected_visibleName':'ALEXANDRIA','evidence':'crops/7w-left.png at native resolution clearly prints ALEXANDRIA (A); the initial downscaled full-photo read was wrong. No name was used for correspondence.'},'no_value_corrected_from_model_consensus':True})
CASES={p.stem:read(p) for p in DATA.glob('cases/*.json')}
STRUCT={p.stem:read(p) for p in DATA.glob('structures/*.json')}
def pieces(case):
 return [dict(p,_assertion=a['id'],_field=a['field'],_index=i) for i,(a,p) in enumerate((a,p) for a in case['assertions'] for p in a['value'].get('pieces',[]))]
def box(p):
 b=p.get('region')
 if not b:return None
 return [b['x'],b['y'],b['x']+b['width'],b['y']+b['height']]
def center(p,W,H):
 b=box(p);return [(b[0]+b[2])*W/2,(b[1]+b[3])*H/2] if b else None
def normcolor(v):return {'파란색':'blue','초록색':'green','빨간색':'red','노란색':'yellow','보라색':'purple'}.get(v,v)
rows=[];placement=[];metrics={};matches=[];extra=[]
def prop(case,p,o,field,expected,observed,correspondence='direct-photo-geometry',status=None):
 st=status or ('photo_unjudgeable' if expected is None else 'app_unknown' if observed is None else 'match' if observed==expected else 'definite_misread')
 if correspondence!='direct-photo-geometry': st='correspondence_unclear' if expected is not None else 'photo_unjudgeable'
 rows.append({'case_id':case,'photo_object_id':o['id'],'pieceId':p['id'],'assertionId':p['_assertion'],'model_index':p['_index'],'bbox_original':box(p),'property':field,'photo_value':expected,'observed_value':observed,'status':st,'correspondence_status':correspondence,'crop':o.get('crop'),'evidence_note':o.get('note','')})
for name,case in sorted(CASES.items()):
 pp=pieces(case);st=STRUCT[name];pl={r['pieceId']:r for r in st['placements']};ret={r['pieceId']:r for r in st['retained']};gr={r['id']:r for r in st['groups']}
 if name.startswith('sagrada'):
  pred=[p for p in pp if p['componentId']=='dice' and p['_field'] in ['__photo.public','draft.scene']]
  used=set();cm=[]
  # Bounded visual row/column correspondence: relative position only, no readout used.
  # Original die-top centers were frozen before cases. Body boxes include front face,
  # so a fixed 18px top-to-body offset is used only for correspondence ranking.
  for p in pred:
   xy=center(p,1200,900)
   if xy is None:continue
   distances=sorted((math.hypot(xy[0]-o['center_px'][0],xy[1]-o['center_px'][1]-18),o['id']) for o in sg)
   d,oid=distances[0]; assert d<55 and oid not in used,(name,p['id'],distances[:2]);used.add(oid)
   o=next(o for o in sg if o['id']==oid);v=p['readout']['values'];prop(name,p,o,'dieColor',o['color'],normcolor(v.get('dieColor')));prop(name,p,o,'dieValue',o['top_pips'],v.get('dieValue'))
   target=(o['row']-1)*5+o['column'];q=pl.get(p['id']);r=ret.get(p['id']);slot=q.get('slot') if q else None
   address=None
   if r:
    address=((p.get('spatial') or {}).get('resolved') or {}).get('anchor',{}).get('address')
    m=re.fullmatch(r'r(\d+)c(\d+)',address or '')
    if m:slot=(int(m[1])-1)*5+int(m[2])
   place='match' if slot==target else 'wrong-cell' if slot is not None else 'unassigned-cell'
   placement.append({'game':'sagrada','case_id':name,'pieceId':p['id'],'model_index':p['_index'],'bbox_original':box(p),'photo_object_id':oid,'photo_anchor':'front-window','photo_row':o['row'],'photo_column':o['column'],'current_anchor':q.get('anchorPieceId') if q else (r.get('position',{}).get('instanceKey') if r else None),'current_area':q.get('areaId') if q else (r.get('position',{}).get('areaId') if r else None),'current_slot':slot,'photo_slot':target,'placement_status':place,'judgment_ko':'맞음' if place=='match' else '틀림' if place=='wrong-cell' else '유보','crop':o['crop'],'reason':'Photo row/column, independent of dieColor/dieValue; top pips only.'})
   cm.append({'photo_object_id':oid,'pieceId':p['id'],'index':p['_index'],'distance_px':round(d,3),'status':'direct-photo-geometry'})
  attrs=[r for r in rows if r['case_id']==name];ps=[r for r in placement if r['case_id']==name]
  metrics[name]={'scope':'foreground 18 dice only, not whole photo','truth_physical_objects':18,'prediction_candidates':len(pred),'direct_matches':len(cm),'unmatched_truth':[o['id'] for o in sg if o['id'] not in used],'unmatched_predictions':[],'missing_confirmed':0 if len(cm)==18 else None,'extra_confirmed':0 if len(cm)==18 else None,'attributes_denominator':36,'attribute_counts':dict(Counter(r['status'] for r in attrs)),'placement_denominator':18,'placement_counts':dict(Counter(r['placement_status'] for r in ps)),'whole_photo_accuracy':None}
  matches.append({'case_id':name,'matches':cm})
# LC manual positional correspondence maps: index -> physical ID.
# No values/suit/IDs used as identity gates. Ambiguous low broad boxes are withheld.
mapbase={**{i:f'near-yellow-{i-13}' for i in range(14,19)},**{i:f'near-blue-{i-18}' for i in range(19,24)},**{i:f'near-white-{i-23}' for i in range(24,29)},**{i:f'near-green-{i-28}' for i in range(29,33)},**{i:f'far-white-{10-i}' for i in range(5,10)},**{i:f'far-green-{14-i}' for i in range(10,14)},3:'far-blue-2',4:'far-blue-1',34:'far-yellow-5',35:'far-yellow-4',36:'far-yellow-3',1:'far-yellow-2',2:'far-yellow-1'}
maphigh={**{i:f'near-yellow-{j}' for i,j in zip([10,12,13,14,15],range(1,6))},**{i:f'near-blue-{i-15}' for i in range(16,21)},21:'near-white-1',**{i:f'near-white-{i-21}' for i in range(23,27)},**{i:f'near-green-{i-26}' for i in range(27,31)},**{i:f'far-white-{6-i}' for i in range(1,6)},7:'far-green-3',8:'far-green-2',9:'far-green-1',22:'far-yellow-5',31:'far-yellow-4',32:'far-yellow-3',33:'far-yellow-2',34:'far-yellow-1',35:'far-blue-2',36:'far-blue-1'}
mapmed={**{i:f'near-yellow-{j}' for i,j in zip([11,12,13,14,16],range(1,6))},**{i:f'near-blue-{i-17}' for i in range(18,23)},23:'near-white-1',**{i:f'near-white-{i-22}' for i in range(24,28)},**{i:f'near-green-{i-28}' for i in range(29,33)},**{i:f'far-white-{6-i}' for i in range(1,6)},**{i:f'far-green-{10-i}' for i in range(6,10)},17:'far-yellow-5',28:'far-yellow-4',33:'far-yellow-3',34:'far-yellow-2',35:'far-yellow-1',36:'far-blue-2',37:'far-blue-1'}
maplow={2:'far-white-5',3:'far-white-4',4:'far-white-3',8:'far-green-4',9:'far-green-3',10:'far-green-2',12:'far-green-1',18:'far-yellow-5',29:'far-yellow-4',37:'far-yellow-3',41:'far-blue-2',1:'far-blue-1',19:'near-blue-5',25:'near-yellow-5',26:'near-white-1',32:'near-white-5',**{i:f'near-green-{i-32}' for i in range(33,37)}}
LCMAP={'lost-cities-baseline':mapbase,'lost-cities-high':maphigh,'lost-cities-medium':mapmed,'lost-cities-low':maplow}
for name,mp in LCMAP.items():
 case=CASES[name];pp=pieces(case);st=STRUCT[name];pl={r['pieceId']:r for r in st['placements']};gr={r['id']:r for r in st['groups']};cm=[]
 for i,oid in sorted(mp.items()):
  p=pp[i];o=next(o for o in lc if o['id']==oid);v=p['readout']['values'];q=pl.get(p['id'],{});g=gr.get(q.get('groupId'),{})
  corr='global-y-unit-hypothesis-unconfirmed' if name.endswith('medium') else 'direct-photo-geometry'
  prop(name,p,o,'suit',o['line'],normcolor(v.get('suit')),corr)
  expect_inv=None if o['value'] is None else o['value']=='investment'
  prop(name,p,o,'investments',expect_inv,v.get('investments'),corr)
  if o['value']!='investment':prop(name,p,o,'number',o['value'],v.get('number'),corr)
  # Raw geometric position is diagnostic, independent of displayed side/line.
  xy=center(p,1024,768);photo=o['center_px'];dy=round(xy[1]-photo[1],3) if xy else None
  side='match' if g.get('side')==o['side'] else 'unassigned' if not g.get('side') else 'wrong'
  line='match' if g.get('color')==o['line'] else 'unknown' if not g.get('color') else 'wrong'
  place='match' if side==line=='match' else 'unknown-line' if side=='match' and line=='unknown' else 'wrong'
  if corr!='direct-photo-geometry':place='correspondence-unclear'
  placement.append({'game':'lost-cities','case_id':name,'pieceId':p['id'],'model_index':i,'bbox_original':box(p),'photo_object_id':oid,'photo_anchor':'center-board','photo_side':o['side'],'photo_line':o['line'],'photo_order_from_board':o['order_from_board'],'current_anchor':q.get('anchorPieceId'),'current_area':q.get('areaId'),'current_side':g.get('side'),'current_line':g.get('color'),'current_order':q.get('order'),'placement_status':place,'judgment_ko':'맞음' if place=='match' else '틀림' if place=='wrong' else '유보','crop':o['crop'],'reason':'Physical diagonal board side/color stripe; order listed from board outward. Current order is display rank, whose far-side direction is not semantically specified.','correspondence_status':corr,'raw_center_dy_px':dy})
  cm.append({'photo_object_id':oid,'pieceId':p['id'],'index':i,'status':corr,'raw_center_px':xy,'photo_visible_band_center_px':photo})
 # One exposed central top discard is visually readable. Underlying edges remain withheld.
 topidx={'lost-cities-baseline':41,'lost-cities-high':37,'lost-cities-medium':38,'lost-cities-low':42}[name]
 top=pp[topidx];to=next(o for o in notes['lost-cities'] if o['id']=='central-blue-discard-top')
 tcorr='global-y-unit-hypothesis-unconfirmed' if name.endswith('medium') else 'direct-photo-geometry'
 prop(name,top,to,'suit','blue',top['readout']['values'].get('suit'),tcorr)
 prop(name,top,to,'investments',True,top['readout']['values'].get('investments'),tcorr)
 prop(name,top,to,'face','front',top['readout']['values'].get('face'),tcorr)
 tq=pl.get(top['id'],{});tg=gr.get(tq.get('groupId'),{})
 placement.append({'game':'lost-cities','case_id':name,'pieceId':top['id'],'model_index':topidx,'bbox_original':box(top),'photo_object_id':to['id'],'photo_anchor':'central-discard-top','photo_side':'center','photo_line':'blue','current_area':tq.get('areaId'),'current_line':tg.get('color'),'placement_status':'correspondence-unclear' if tcorr!='direct-photo-geometry' else 'unknown-line' if not tg.get('color') else 'match' if tq.get('areaId')=='discard' and tg.get('color')=='blue' else 'wrong','judgment_ko':'유보','crop':to['crop'],'reason':'Face-up central top card: blue handshake icons. Lower card edges are occluded; no hidden colors/values/count invented.','correspondence_status':tcorr})
 # Roles: back-only red stack is a category error; no hidden number count.
 for p in pp:
  xy=center(p,1024,768)
  if not xy:continue
  # medium withheld because bbox units unconfirmed.
  if not name.endswith('medium') and p['_field']=='discard.scene' and xy[0]<250 and xy[1]>420:
   o={'id':'near-red-pile','crop':'full-photo','note':'Back-only red artwork; not a face-up expedition or colored discard card.'}
   prop(name,p,o,'face','back',p['readout']['values'].get('face'))
   extra.append({'case_id':name,'pieceId':p['id'],'model_index':p['_index'],'category':'role_misread_not_extra_physical_card','detail':'red-card-back observation labeled front/discard. Number/suit hidden values excluded from numeric denominator.'})
 known_pred={p['_index'] for p in pp if p['componentId']=='cards' and p['_field']=='__photo.public' and p['readout']['values'].get('face')=='front'}
 unmatched=sorted(known_pred-set(mp));ut=[o['id'] for o in lc if o['id'] not in mp.values()]
 attrs=[r for r in rows if r['case_id']==name];p_rows=[r for r in placement if r['case_id']==name]
 if name.endswith('high'):
  reason='One far-green front card has region=null, so physical correspondence is withheld rather than invented from color/order. No confirmed omission.'
 elif name.endswith('medium'):
  reason='All 35 links are positional-configuration hypotheses after noticing raw y coordinates approximately 0.75 of photo y. Original bbox and transform are unchanged; value scores are withheld. Extra yellow8 index15 overlaps adjacent physical9/10 region under hypothesis.'
 elif name.endswith('low'):
  reason='20 direct isolated object/outer-face correspondences; 20 broad/competing expedition predictions withheld. Unmatched are not declared omissions or extras.'
 else:reason='35 positional correspondences; far numbers partly unreadable. Display far order opposes from-board rank; direction is reported, not silently scored wrong.'
 metrics[name]={'scope':'35 distinguishable public expedition cards plus one exposed central discard top; central hidden cards/hand/back-stack count not exhaustive','truth_physical_objects':35,'linked_objects':len(mp),'direct_matches':len(mp) if not name.endswith('medium') else 0,'hypothesis_matches':len(mp) if name.endswith('medium') else 0,'unmatched_truth':ut,'unmatched_prediction_indices':unmatched,'missing_confirmed':None,'extra_confirmed':None,'extra_candidates':([{'index':15,'reason':'yellow8 candidate overlaps9/10; cannot isolate a separate physical card'}] if name.endswith('medium') else [{'index':24,'reason':'yellow8 candidate overlaps9/10; no distinct sixth exposed card'},{'index':31,'reason':'white6 candidate overlaps4/8; no distinct sixth exposed card'},{'index':13,'reason':'blue2 candidate displaced above line; broad competing boxes'}] if name.endswith('low') else []),'attribute_denominator':len(attrs),'attribute_counts':dict(Counter(r['status'] for r in attrs)),'placement_denominator':len(p_rows),'placement_counts':dict(Counter(r['placement_status'] for r in p_rows)),'whole_photo_accuracy':None,'note':reason}
 matches.append({'case_id':name,'matches':cm})
# 7W photo-only attachment judgments for all existing 117 rows; value/name/color not scored.
name='seven-wonders-baseline';pp=pieces(CASES[name]);st=STRUCT[name];pl={r['pieceId']:r for r in st['placements']};gr={r['id']:r for r in st['groups']}
anchoridx={0:'front',29:'left',40:'right',51:'upper-right'};anchorid={pp[i]['id']:a for i,a in anchoridx.items()}
truthidx={}
def mark(ids,anchor,crop,reason):
 for i in ids:
  assert i not in truthidx,('duplicate photo judgment',i)
  truthidx[i]=(anchor,crop,reason)
mark([0,1,12,43,44,45,46,47,48,49,50,52,53,54,55,56,57,58,59,60,62,73,84,95,106],'front','crops/7w-front.png','Same front-tableau card orientation and aligned color/resource stacks; coins/tokens on front board or tucked under its edge. Physical attachment, not named human ownership.')
mark(list(range(21,30))+[i for i in range(88,106) if i!=95],'left','crops/7w-left.png','Same left-tableau aligned card bands and under-board/board-top contact; separate from the hand-obscured upper-left tableau.')
mark(list(range(2,8))+list(range(107,117)),'upper-left','crops/7w-upper-left.png','Cards form aligned color stacks around the separate fifth board obscured by hand; two blue-backed cards tucked under that board. See fifth-board-occluded crop. Current output contains no corresponding fifth wonder anchor.')
mark([i for i in range(8,21) if i!=12]+[38,39,41,42,51],'upper-right','crops/7w-upper-right.png','Aligned stacks touch/continue upper-right tableau; brown/gray resource cards at right edge are physically part of this tableau. Does not include central loose AgeIII cards.')
mark([40,61,63,64,65,66,67,68,69,70,71,72,74,75,76,77,78],'right','crops/7w-right.png','Cards aligned with Rhodes tableau; left-extending guild pair belongs to the same contiguous yellow/resource bands; blue-backed cards are tucked under right board.')
# Loose coins/tokens away from board and loose face-down age cards remain owner/anchor-unresolved.
selected={0,1,2,6,8,14,19,21,25,29,40,43,49,55,57,58,62,67,69,72,77,79,83,90,98,102,103,107,112,115,116}
seven=[]
for i,p in enumerate(pp):
 q=pl.get(p['id'],{});g=gr.get(q.get('groupId'),{});cur=q.get('anchorPieceId');ca=anchorid.get(cur)
 if i in anchoridx:ca=anchoridx[i]
 photo,crop,reason=truthidx.get(i,(None,'full-photo','Loose face-down card / off-board coins or tokens / edge object. Photo does not establish physical attachment strongly enough; do not convert nearest board into owner.'))
 status='withheld' if photo is None else 'unassigned' if ca is None else 'match' if ca==photo else 'wrong-anchor'
 row={'game':'seven-wonders','case_id':name,'pieceId':p['id'],'model_index':i,'bbox_original':box(p),'photo_object_id':f'7w-visible-{i:03d}','photo_anchor':photo,'current_anchor':ca,'current_anchor_pieceId':cur,'current_area':q.get('areaId'),'current_group_label':g.get('label'),'placement_status':status,'judgment_ko':'맞음' if status=='match' else '틀림' if status=='wrong-anchor' else '유보','crop':crop,'reason':reason,'stratified_minimum_sample':i in selected}
 placement.append(row);seven.append(row)
 if i in selected:
  b=box(p)
  if b:
   im=Image.open(ROOT/'docs/pro-review-20261113/photos/seven-wonders.jpg');x0=max(0,math.floor(b[0]*im.width)-30);y0=max(0,math.floor(b[1]*im.height)-30);x1=min(im.width,math.ceil(b[2]*im.width)+30);y1=min(im.height,math.ceil(b[3]*im.height)+30)
   im.crop((x0,y0,x1,y1)).save(OUT/'crops'/f'7w-sample-{i:03d}.png')
   row['individual_crop']=f'crops/7w-sample-{i:03d}.png'
metrics[name]={'scope':'117 existing observations; physical tableau attachment only, not card names/hidden values/human owners','audited_observations':117,'stratified_sample_size':len(selected),'status_counts':dict(Counter(r['placement_status'] for r in seven)),'photo_decidable_denominator':sum(r['photo_anchor'] is not None for r in seven),'correctly_anchored':sum(r['placement_status']=='match' for r in seven),'wrong_anchor':sum(r['placement_status']=='wrong-anchor' for r in seven),'unassigned_but_photo_decidable':sum(r['placement_status']=='unassigned' for r in seven),'withheld':sum(r['placement_status']=='withheld' for r in seven),'photo_tableau_zones':5,'existing_wonder_anchors':4,'whole_photo_accuracy':None,'missing_physical_card_count':None,'extra_physical_card_count':None,'note':'The hand-obscured upper-left fifth board is a photo-derived anchor region, not a source edit or invented product board. Formal name/side remain null. Native crop confirms left ALEXANDRIA (A); the frozen initial name was amended explicitly. No name is used as anchor identity.'}
# Store ground truth and outputs. Frozen and later-reviewed layers remain separate.
save('ground-truth.json',{'schemaVersion':1,'reviewStatus':'direct-photo-reviewed-by-Sol-not-human-certified','exhaustive':False,'independentFreeze':freeze,'photos':notes['photos'],'evaluation_units':notes['evaluation_units'],'sagrada':{'scope':'foreground window only','objects':notes['sagrada'],'exhaustive_within_scope':True},'lost-cities':{'scope':'distinguishable public expedition cards, partial values','objects':lc,'central_roles':[o for o in notes['lost-cities'] if o['role']!='expedition'],'exhaustive_within_scope':False,'amendments':'photo-amendments.json'},'seven-wonders':{'anchors':[dict(a,visible_name='ALEXANDRIA') if a['id']=='left' else a for a in notes['seven-wonders']['anchors']],'attachment_judgments':seven,'exhaustive_within_scope':False},'limitations':notes['limitations']+['Later 7W row associations and LC candidate annotations were made after model-data exposure and are labeled accordingly.','LC medium y-unit transform is an unconfirmed diagnostic hypothesis; it is never applied to source bbox or counted as a direct visual-value match.','No whole-photo or 5–10% achievement claim; no new API/model calls; no hidden-value/inapplicable denominator inflation.']})
csvout('matched-results.csv',rows);csvout('placement-audit.csv',placement);save('correspondence.json',matches);save('role-and-extra-candidates.json',extra)
for cname,met in metrics.items():
 ar=[r for r in rows if r['case_id']==cname]
 met['per_property_counts']={k:dict(Counter(r['status'] for r in ar if r['property']==k)) for k in sorted({r['property'] for r in ar})}
 if cname.startswith('lost-cities'):
  value_rows=[r for r in ar if r['property']!='face']
  role_rows=[r for r in ar if r['property']=='face']
  met['value_attribute_denominator']=len(value_rows)
  met['value_attribute_counts']=dict(Counter(r['status'] for r in value_rows))
  met['role_prediction_denominator']=len(role_rows)
  met['expedition_value_counts']=dict(Counter(r['status'] for r in value_rows if r['photo_object_id'].startswith(('near-','far-'))))
  met['central_top_value_counts']=dict(Counter(r['status'] for r in value_rows if r['photo_object_id']=='central-blue-discard-top'))
  met['role_prediction_counts']=dict(Counter(r['status'] for r in role_rows))
  met['note']+=' Role rows include one exposed front central top plus predictions of back-only physical stack; denominator is observation rows, not known independent physical-card count.'
  candidates=[p for p in pieces(CASES[cname]) if p['componentId']=='cards' and p['_field']=='__photo.public' and p['readout']['values'].get('face')=='front']
  met['expedition_prediction_candidates']=len(candidates)
  met['invalid_bbox_candidates']=sum(box(p) is None for p in candidates)
  met['prediction_excess_over_visible_inventory']=len(candidates)-35
  met['prediction_excess_is_not_confirmed_false_positives']=True
for cname,case in CASES.items():
 assert case['sourcePhotoSHA256']==notes['photos'][case['gameId']]['sha256']
save('metrics.json',{'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'evidence_kind':'Sol visual judgments + offline counts; not independent human certification','nine_cases':metrics,'six_effort_cases':[n for n in metrics if n.endswith(('high','medium','low'))],'not_comparable_as_single_accuracy':['scope differs foreground vs full public line','medium LC correspondence withheld','low LC broad/competing boxes withheld','partial photo values and hidden cards excluded'],'whole_photo_accuracy':None,'five_to_ten_percent_target_achieved':None})
assert inputs=={str(p.relative_to(ROOT)):sha(p) for p in paths}
save('source-integrity.json',{'inputs_sha256':inputs,'source_files_unchanged_during_run':True,'frozen_notes_sha256':sha(OUT/'independent-photo-notes.json'),'frozen_notes_match':sha(OUT/'independent-photo-notes.json')==freeze['sha256'],'new_api_or_model_calls':0,'source_bbox_or_values_modified':False})
print(json.dumps({n:{k:v for k,v in m.items() if k in ['direct_matches','attribute_counts','placement_counts','status_counts','linked_objects','stratified_sample_size']} for n,m in metrics.items()},ensure_ascii=False,indent=2))
