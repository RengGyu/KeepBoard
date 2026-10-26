#!/usr/bin/env python3
"""Index existing browser artifacts; never changes product sources or baseline receipts."""
from pathlib import Path
import csv, hashlib, html, json
from datetime import datetime, timezone
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'docs/game-visuals-full-audit'
def read(p): return json.loads(p.read_text())
def write(name,value):
 p=OUT/name; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
paths=read(OUT/'work-paths.json'); snapshot=Path(paths['snapshot']); data=read(snapshot/'audit/data.json')
games=read(OUT/'games.json'); reports={g['gameId']:read(OUT/f"renders/games/{g['gameId']}/metrics.json") for g in games}
assert len(reports)==120
visual={
 'agricola':'variants: human family shape, fence/stable owner colors, rotated blue, unresolved old discs',
 'carcassonne':'board projection: schematic surface, tile/meeple/category markers; not printed board geometry',
 'sagrada':'categories PNG + actual CUA390: die category is circular token; readout/null/zero visible, no page overflow',
 'wingspan':'variants: food tokens invariant, food die wrongly follows owner red/blue, action cube owner colors',
 'king-of-tokyo':'variants: black/green symbol dice, 1/2/3 and energy/claw/heart; unresolved old examples explicit unknown',
 'catan':'board projection: empty board fixture limitation; native public/owner overview rendered',
 'rummikub':'native TileFace56 cases: Classic 4 colors x1-13 +joker/unknown/back/legacygreen'}
variants=[dict(gameId=gid,**v) for gid,m in reports.items() for v in m['variants']]
owner=[v for v in variants if v['role']=='owner' and v['owner'] and not v['ownerPixelChanged']]
fixed=[v for v in variants if not (v['role']=='owner' and v['owner']) and v['ownerPixelChanged']]
missing=[]
for g in games:
 gid=g['gameId'];m=reports[gid]
 assert m['variantCount']==g['variants']==len(m['variants'])
 sheets={kind:f'renders/games/{gid}/{kind}.png' for kind in ['variants','categories','boards']}
 for kind,p in sheets.items():
  if not (OUT/p).exists(): missing.append(p)
 g.update(renderStatus='RENDERED_SCOPED_WITH_NATIVE_FIXTURE_GAP' if gid=='catan' else 'RENDERED_SCOPED',
  humanVisualStatus='REPRESENTATIVE_INSPECTED' if gid in visual else 'MACHINE_ONLY',
  humanVisualScope=visual.get(gid),sheetPath=sheets['variants'],sheets=sheets,
  metricsPath=f'renders/games/{gid}/metrics.json',renderedVariantCount=len(m['variants']),
  renderedCategoryCount=len(m['categories']),boardSampleCount=len(m['boards']),
  expectedUnknownCount=sum(v['expectedUnknown'] for v in m['variants']),
  ownerInvariantCount=sum(v['role']=='owner' and v['owner'] and not v['ownerPixelChanged'] for v in m['variants']),
  limits='Synthetic renderer output; manual board diagram, not printed-board fidelity or photo recognition validation.'+(' Catan placed-board fixture is not validated; corrected bridge needs browser rerender.' if gid=='catan' else ''))
assert not missing,missing
write('games.json',games)
columns=['gameId','packId','edition','packVersion','sourceSHA','components','variants','areas','renderStatus','humanVisualStatus','humanVisualScope','renderedVariantCount','renderedCategoryCount','boardSampleCount','expectedUnknownCount','ownerInvariantCount','sheetPath','metricsPath','limits']
with (OUT/'games.csv').open('w',newline='',encoding='utf-8-sig') as f:
 w=csv.DictWriter(f,fieldnames=columns,extrasaction='ignore');w.writeheader();w.writerows(games)
write('renders/final-all-metrics.json',{'raw':read(OUT/'renders/raw/final-summary.json'),'games':list(reports.values()),'note':'Rebuilt from per-game files; original all-metrics.json is historical and predates raw-reference/capture/native supplements.'})
write('owner-invariant-observations.json',{'status':'OBSERVATIONS_NOT_BLANKET_DEFECTS','count':len(owner),'scope':'Red/blue signature compared before rotation. Type icons may legitimately be owner-invariant; needs semantic review.', 'variants':owner})
area_rows=[]
for board in data['boards']:
 m=reports[board['gameId']]
 for area in board['areas']:
  matched=[b for b in m['boards'] if b['area']==area['areaId']]
  hidden=area['visibility']=='hidden' or area['status']=='not-needed'
  status='EXCLUDED_HIDDEN_OR_NOT_NEEDED' if hidden else 'GENERIC_AREA_RENDERED' if matched else 'NATIVE_OWNER_HAND_RENDERED' if board['gameId']=='catan' and area['areaId']=='hand' else 'NATIVE_BOARD_FIXTURE_GAP' if board['gameId']=='catan' and area['areaId']=='board' else 'UNBOUND_AREA_METADATA' if not area['fieldKeys'] else 'MISSING'
  area_rows.append(dict(gameId=board['gameId'],**area,auditStatus=status,samples=len(matched)))
assert len(area_rows)==522
assert not [r for r in area_rows if r['auditStatus']=='MISSING']
write('areas.json',area_rows)
hashes={}
for name in ['baseline-hashes.json','render-source-hashes.json']:
 baseline=read(OUT/name);changes=[p for p,h in baseline.items() if not (ROOT/p).is_file() or sha(ROOT/p)!=h]
 hashes[name]={'paths':len(baseline),'changed':changes};assert not changes,changes
manifest=read(OUT/'fix/manifest.json')
for f in manifest['files']:
 assert sha(ROOT/f['path'])==f['beforeSHA256']
 assert sha(snapshot/f['path'])==f['afterSHA256']
write('hash-verification.json',{'shared':hashes,'snapshotProductChanges':[f['path'] for f in manifest['files']],'assetsChanged':0,'packChanges':0})
boards=[b for m in reports.values() for b in m['boards']]
bounds=[v for v in variants if v.get('bbox') and (v['bbox']['x']<0 or v['bbox']['y']<0 or v['bbox']['x']+v['bbox']['width']>120.1 or v['bbox']['y']+v['bbox']['height']>120.1)]
summary=read(OUT/'summary.json')
summary.update(renderedGames=120,renderedVariants=len(variants),renderedVariantSVGs=sum(v['svgCount'] for v in variants),renderedCategories=sum(len(m['categories']) for m in reports.values()),boardSamples=len(boards),genericAreaSamples=sum(bool(b['area']) for b in boards),nativeSamples=sum(bool(b['native']) for b in boards),rawSVG=511,rawPNG=7,rawDecode=read(OUT/'renders/raw/final-summary.json'),blankVariants=sum(v['blank'] for v in variants),variantLoadErrors=[v for v in variants if v['errors']],bboxOutside120=bounds,pageOverflow=[g for g,m in reports.items() if m['pageOverflow']],boardScrollOverflow=[b for b in boards if b['scrollOverflow']],expectedUnknownVariants=sum(v['expectedUnknown'] for v in variants),ownerInvariantObservations=len(owner),nonOwnerPixelChanges=len(fixed),humanVisuallyInspectedGames=len(visual),humanVisualScopes=visual,missingArtifacts=missing,productWrites=0,AIcalls=0,
 limitations=['Baseline variant/category/board rendering is synthetic, not real photo recognition or rule accuracy.',
 'Boards contact sheets are measured DOM/SVG/text projections, not whole app screenshots. 6 surfaces are neutral manual diagrams.',
 'Only 7 games have representative direct image/viewport inspection; 113 are machine-rendered only.',
 'Catan placed board is not validated: baseline harness passed a legacy layout without sceneBridge. Audit-only fixture bridge corrected and pure-tested, rerender pending.',
 'Catan supply area has no fieldKeys; source mapping gap retained, no new product defect inferred.',
 '79 intentionally unknown variant results remain explicit; do not choose a first subtype.',
 '51 owner-advertised pixel-invariant observations require semantic classification, not bulk recoloring.',
 'Isolated two-file patch has pure component/resolver regression only; after9-game browser rerender blocked by CUA timeout.',
 'CUA viewport changed to390, then1440 set/reload timed out; reset not confirmed. No user tabs/data operated.',
 'No exhaustive clipping/pip legibility/actual edition or physical board geometry guarantee.'])
write('summary.json',summary)
write('fix/verification.json',{'status':'PURE_REGRESSION_PASS_BROWSER_AFTER_BLOCKED','command':'node --import tsx --test docs/game-visuals-full-audit/fix/renderer.test.ts','exitCode':0,'tests':5,'browserAfter':{'targetGames':9,'completed':0,'reason':'CUA browser2 unavailable/getState timeout; supervisor accepted bounded handoff without repeated retries.'},'snapshotProductFiles':2,'sharedProductWrites':0,'assetsChanged':0,'packsChanged':0,'nativeCatanBridge':'AUDIT_TOOL_ONLY_PURE_PASS_NOT_BROWSER_RENDERED','viewportReset':'UNCONFIRMED'})
write('human-visual-reviews.json',{'games':visual,'screenShots':'CUA390 Sagrada visible in tool transcript; contact artifacts are actual SVG projections/raster exports, not saved full app screenshots.','semanticAuthority':'Astra reviews edition/physical correctness independently.'})
write('checkpoint.json',{'status':'FINAL_BASELINE_AND_BOUNDED_PATCH_HANDOFF','at':datetime.now(timezone.utc).isoformat(),'completed':['120-game inventory and baseline variants/categories rendering','532 registry +518 raw assets decode','437 generic area instances +4 native samples','Per-game SVG/PNG/metrics;7 representative human scopes','Isolated2file minimal patch;5 focused pure regressions;hashes unchanged'], 'renderedGames':120,'counts':{k:summary[k] for k in ['components','variants','registeredAssets','boardAreas','rawSVG','rawPNG','renderedVariantSVGs','renderedCategories','boardSamples']},'remaining':['After patch:9game browser capture','Catan corrected bridge:placed native board rerender','Viewport reset unconfirmed due CUA disconnect','Astra semantic source/photo comparison'], 'entry':'index.html','patch':'fix/display-corrections.patch','hashVerification':'hash-verification.json','productChanges':0,'AIcalls':0,'ownedServer':'Stopped at final handoff; see README resume commands.'})

# Thumbnails preserve complete existing PNGs; full-size sheets remain individually linked.
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',15)
small=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',11)
contacts=[]
for page in range(6):
 canvas=Image.new('RGB',(1440,1390),'#f8f5eb');draw=ImageDraw.Draw(canvas)
 draw.text((20,12),f'KeepBoard actual renderer baseline / page {page+1}/6 / synthetic, NOT physical-board accuracy',font=font,fill='#263b35')
 for i,g in enumerate(games[page*20:(page+1)*20]):
  x=(i%4)*360;y=45+(i//4)*265
  draw.rectangle((x+7,y+2,x+353,y+258),outline='#d2d3c4')
  draw.text((x+14,y+10),g['gameId'],font=font,fill='#263b35')
  for j,kind in enumerate(['variants','boards']):
   im=Image.open(OUT/g['sheets'][kind]).convert('RGB');im.thumbnail((163,195))
   canvas.paste(im,(x+14+j*170+(163-im.width)//2,y+42+(195-im.height)//2))
  draw.text((x+14,y+237),f"variants={g['variants']} areasamples={g['boardSampleCount']} | "+('eyes:subset' if g['gameId'] in visual else 'machine only'),font=small,fill='#46534b')
  if g['gameId']=='catan':draw.text((x+14,y+25),'placed-board fixture GAP',font=small,fill='#ad4933')
 dest=f'renders/contacts/page-{page+1}.png';(OUT/dest).parent.mkdir(parents=True,exist_ok=True);canvas.save(OUT/dest);contacts.append(dest)
write('contact-index.json',{'pages':contacts,'perGame':[{'gameId':g['gameId'],'sheets':g['sheets'],'metrics':g['metricsPath'],'humanScope':g['humanVisualScope']} for g in games]})
rows=''.join(f'<tr><td>{html.escape(g["gameId"])}</td><td>{html.escape(g["edition"])}</td><td>{g["variants"]}</td><td>{g["boardSampleCount"]}</td><td>'+ ' '.join(f'<a href="{v}">{k}</a> <a href="{v[:-3]}svg">SVG</a>' for k,v in g['sheets'].items())+f'</td><td>{html.escape(g["humanVisualStatus"])}</td><td>{html.escape(g["humanVisualScope"] or "Machine only; semantic review pending")}</td></tr>' for g in games)
(OUT/'index.html').write_text('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>120-game visual audit</title><style>body{font:15px/1.5 system-ui;margin:24px;color:#263b35;background:#f8f5eb}a{color:#23609c}table{border-collapse:collapse}td,th{padding:8px;border:1px solid #ccc;text-align:left}nav{display:flex;gap:15px;flex-wrap:wrap}</style><h1>120-game visual audit · baseline</h1><p>120 games /437 categories /1300 variants /532 registered assets /518 raw images /437 generic area instances +4 native samples. Synthetic renderer evidence, not photo or full game fidelity certification.</p><p><strong>Catan placed board fixture gap; after2-file patch browser rendering blocked. Baseline and pure-test patch evidence must stay separate.</strong></p><nav><a href="README.md">handoff</a><a href="summary.json">metrics</a><a href="findings.json">findings</a><a href="fix/display-corrections.patch">isolated patch</a><a href="fix/verification.json">patch checks</a><a href="owner-invariant-observations.json">51 observations</a>'+''.join(f'<a href="{p}">contact{i+1}</a>' for i,p in enumerate(contacts))+'</nav><table><thead><tr><th>game</th><th>edition</th><th>variants</th><th>board samples</th><th>actual output projections</th><th>inspection</th><th>scope</th></tr></thead><tbody>'+rows+'</tbody></table>')
print(json.dumps({'exit':0,'games':len(games),'variants':len(variants),'categories':summary['renderedCategories'],'boardSamples':len(boards),'contacts':len(contacts),'protectedHashes':hashes},ensure_ascii=False))
