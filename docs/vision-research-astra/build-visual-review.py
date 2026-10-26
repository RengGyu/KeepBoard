"""Independent interpretation of supplied render evidence; never changes artwork."""
from pathlib import Path
import hashlib,json,collections
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[1]
base=ROOT/'docs/game-visuals-full-audit'
metrics_path=base/'renders/final-all-metrics.json'
raw=metrics_path.read_bytes();metrics=json.loads(raw)
final=json.loads((OUT/'sol2-source-check.json').read_text()) if (OUT/'sol2-source-check.json').exists() else None
if final:
 assert len(final['files'])==2 and all(f['matches_after_manifest'] and f['snapshot_matches_after'] for f in final['files'])
 assert final['focused_test']['actual_exit']==0 and final['focused_test']['pass']==5
catalog=json.loads((ROOT/'docs/research/initial-supported-games/catalog.json').read_text())['games']
games={g['gameId']:g for g in metrics['games']}
assert set(games)=={g['game_id'] for g in catalog} and len(games)==120
affected=['castles-burgundy','grand-austria-hotel','king-of-tokyo','machi-koro','sagrada','space-base','stone-age','war-of-the-ring-2']
viewed={'sagrada':['categories.png','boards.png'],'scout':['categories.png'],'carcassonne':['categories.png','variants.png'],
        'seti':['categories.png','boards.png'],'wingspan':['variants.png'],'clue':['variants.png']}
rows={};reviewed_files=[]
for gid,m in games.items():
 spec=(ROOT/'docs/research/game-specs-120/games'/f'{gid}.json').read_bytes()
 assert hashlib.sha256(spec).hexdigest()==m['sourceSHA']
 for file in viewed.get(gid,[]):
  p=base/'renders/games'/gid/file
  reviewed_files.append({'game_id':gid,'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'method':'direct view_image; projection sheets distinguished from full UI screenshot'})
 issues=[]
 if gid in affected:issues.append({'id':'V001','status':'CONFIRMED_SHARED_CODE_PATH','detail':'known kind=die + variant=null maps to token-shell; Sagrada actual rendered sample visually confirms coin shape','minimum_fix':'GenericPieceArt known category condition recognizes die alongside dice/cube. No face/color inference or readout mutation.'})
 if gid=='wingspan':issues.append({'id':'V002','status':'CONFIRMED_METADATA_OVERBROAD_RECOMMENDATION','detail':'food component declares owner color for both fixed food-symbol tokens and a recolored example food die. Food type is separate from player action-cube color. Current 4 fixed-token pixel invariants are not tint bugs.','minimum_fix':'Use already supported per-variant color_role/owner_color_supported for verified semantic variants. Do not globally recolor 51 candidates or common token-shell.'})
 fixed=bool(final and (gid in affected or gid=='wingspan'))
 if fixed:
  for issue in issues:
   issue['baseline_status']=issue['status'];issue['status']='ISOLATED_CODE_FIXED_AFTER_RENDER_PENDING'
   issue['fix_evidence']='sol2-source-check.json'
   if issue['id']=='V002':issue['remaining']='Only food-die rendering is corrected; four fixed food token metadata declarations remain broad, without current recoloring defect.'
 rows[gid]={'status':'ISOLATED_FIX_VERIFIED_RENDER_PENDING' if fixed else 'NEEDS_CORRECTION' if gid in affected else 'INSUFFICIENT_EVIDENCE',
  'baseline_status':'NEEDS_CORRECTION' if gid in affected else 'INSUFFICIENT_EVIDENCE',
  'decision_scope':'Current known issue and scoped render evidence only; absence of an issue is not whole-game/real-board PASS.',
  'source_sha_matches':True,'rendered_variant_count':m['variantCount'],'board_instance_count':len(m.get('boards',[])),
  'structural_render_errors':[{'variant':v['variant'],'errors':v.get('errors'), 'blank':v.get('blank')} for v in m['variants'] if v.get('errors') or v.get('blank')],
  'direct_visual_files':viewed.get(gid,[]),'real_photo_accuracy_verified':False,'findings':issues,
  'display_requirement':'Original source/crop + legible typed values remain primary. Neutral board/art are schematic; no automatic game-slot/owner/history equivalence.',
  'remaining':'판본 맞는 실물과 영역/방향/부착 관계 대조. 게임별 필요한 영역은 photo_need 참조; 계약 연결 구현의 별도 선행 마일스톤으로 확대하지 않음.'}
counts=collections.Counter(r['status'] for r in rows.values())
result={'checked_at':'2026-10-23','review_status':final['review_status'] if final else 'SCOPED_REVIEW_COMPLETE_WORKER_FINAL_PENDING','metrics_path':str(metrics_path.relative_to(ROOT)),'metrics_sha256':hashlib.sha256(raw).hexdigest(),
 'render_metadata_games':len(games),'render_metadata_variants':sum(g['variantCount'] for g in games.values()),'board_instances':sum(len(g.get('boards',[])) for g in games.values()),
 'direct_render_visual_games':len(viewed),'direct_render_visual_files':len(reviewed_files),'status_counts':dict(counts),
 'confirmed_whole_game_pass':0,'baseline_status_counts':{'NEEDS_CORRECTION':8,'INSUFFICIENT_EVIDENCE':112},
 'after_fix_browser_review':'NOT_EXECUTED' if final else 'PENDING',
 'classification_note':'Baseline 8 die targets. The two-file isolated fix covers those eight games and one Wingspan variant; source and focused tests verified, after browser/integration pending. Other111 insufficient for whole-game fidelity is not a product stop.',
 'reviewed_files':reviewed_files,'games':rows}
(OUT/'visual-reviews.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['games','reviewed_files']},ensure_ascii=False))
