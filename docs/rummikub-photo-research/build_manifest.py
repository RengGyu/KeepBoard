"""Compile the inspected four-photo index and validate labels against local source bytes."""
import datetime,hashlib,json,pathlib
from PIL import Image
HERE=pathlib.Path(__file__).resolve().parent
load=lambda name:json.loads((HERE/name).read_text())
sources={s['id']:s for s in load('sources.json')}
downloads={s['id']:s for s in load('download-results.json')}
labels={s['id']:s for s in load('labels.json')['photos']}
photos=[]
for author in load('author-results.json'):
 if 'path' not in author:continue
 id=author['id'];s=sources[id];path=HERE/author['path'];digest=hashlib.sha256(path.read_bytes()).hexdigest()
 assert digest==author['sha256']
 with Image.open(path) as im:im.load();assert [im.width,im.height]==labels[id]['dimensions']
 license_evidence={'page':s['page'],'section':'Licensing / Flickr license review','license':s['license'],'license_url':s['license_url'],'author':s['author'],'access':'opened in web tool'}
 if id in downloads:
  license_evidence.update(local_page=downloads[id]['page_local'],local_page_sha256=downloads[id]['page_sha256'])
  assert hashlib.sha256((HERE/downloads[id]['page_local']).read_bytes()).hexdigest()==license_evidence['local_page_sha256']
 if id=='evening-table':license_evidence['evidence_note']='Commons Licensing names CC BY2.0; Flickr review records governortomwolf photo51040251522 and review date2025-02-19. Page title credits Carol Babinsack; include both in attribution.'
 if id=='brewbooks-table':license_evidence['evidence_note']='Commons Licensing and2016-10-17 Flickr review identify CC BY-SA2.0 and original photo14681648425.'
 if id=='ryan-tiles':license_evidence['evidence_note']='Commons Permission section records2010-12-25 Flickr license verification and CC BY-SA2.0 for photo2151702932.'
 if id=='ella-table':license_evidence['evidence_note']='Commons Licensing and2025-02-19 Flickr review identify CC BY2.0 and original photo3600358059.'
 photos.append({'id':id,'status':'downloaded-and-visually-inspected','original_author_page':author['page'],'exact_download_url':author['image_url'],'original_resolution_url':s['image'],'local_path':author['path'],'download_variant':'Published Flickr1024px preview from author page og:image; unchanged downloaded JPEG, not full camera original.','width':author['width'],'height':author['height'],'format':'JPEG','bytes':path.stat().st_size,'sha256':digest,'attribution':s['author']+' — '+author['title']+' — '+s['license']+' — '+author['page'],'license_evidence':license_evidence,'permission_boundary':'Local photo-to-tile correction research. Not installed as production artwork or uploaded to app/AI. If redistributed, retain credit/source/license and indicate any derivative crop; follow the stated ShareAlike terms where applicable.','edition_assessment':{'label':'Rummikub Large Numbers Edition' if id=='evening-table' else 'Rummikub Classic-compatible numbered tile design; exact printing/SKU unknown','classic_exact_edition_confirmed':False,'supplementary_only':id=='evening-table','runtime_color_difference':'green stays green; runtimeColor null; not orange' if id=='evening-table' else None},'manual_labels_file':'labels.json','scope_note':labels[id]['limits'] if 'limits' in labels[id] else labels[id]['role']})
assert len(photos)==4 and set(labels)=={p['id'] for p in photos}
for id,photo in labels.items():
 width,height=photo['dimensions'];instances=list(photo.get('instances',[]));group_by_id={g['id']:g for g in photo['example_groups']}
 for g in photo['example_groups']:
  assert g.get('sequence')=='left-to-right'
  if 'numbers' in g:
   instances.extend({'id':g['id']+':'+str(i),'kind':'number','color':g['color'],'number':n} for i,n in enumerate(g['numbers']))
  else:instances.extend(g['tiles'])
 for a in [*photo.get('instances',[]),*photo['example_groups']]:
  x1,y1,x2,y2=a['bbox_px'];assert 0<=x1<x2<=width and 0<=y1<y2<=height,(id,a)
 assert len({i['id'] for i in instances})==len(instances)
 for tile in instances:
  if tile['kind']=='number':assert 1<=tile['number']<=13
  if tile.get('color')=='green':assert tile['runtimeColor'] is None
  if tile['kind']=='joker':assert tile['assigned_color'] is None and tile['assigned_number'] is None
 for example in photo.get('duplicate_examples',[]):
  for occurrence in example.get('occurrences',[]):
   g=group_by_id[occurrence['group_id']];i=occurrence['index']
   if 'numbers' in g:assert g['color']==example['color'] and g['numbers'][i]==example['number']
   else:assert g['tiles'][i]['color']==example['color'] and g['tiles'][i]['number']==example['number']
shortlist=[]
for id in ['jip-table','juneaugust-table']:
 s=sources[id];shortlist.append({**s,'status':'URL-only; image not visually inspected','failure':downloads[id]['image_error'],'manual_labels':None})
manifest={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'purpose':'Real physical Rummikub photos for photo-to-tile-group correction research','counts':{'downloaded_photos':4,'directly_visually_inspected':4,'classic_compatible_exact_printing_unknown':3,'classic_exact_boxed_edition_confirmed':0,'large_numbers_supplementary':1,'URL_only_unseen_candidates':2,'gameplay_groups_labeled_supplementary_only':15,'display_rows_not_gameplay_melds':8},'photos':photos,'url_only_shortlist':shortlist,'official_source_consulted':{'page':'https://rummikub.com/','status':'opened; footer all rights reserved; no official photos downloaded or license inferred'},'excluded_search_results':['Rummikub sets.svg/digital diagrams','Turkish Okey photos','box-only product art'],'crops':[],'contact_sheet':None,'no_ai_calls_or_app_uploads':True,'limits':['Four independent real physical-tile photographs, not four verified Classic retail editions.','Only the Large Numbers supplementary photograph has confidently labeled actual gameplay groups.','Display rows and piles are not substituted for legal played melds.','Hidden rack values, turn, score, initial meld history and complete counts are not inferred.']}
(HERE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
verification={'status':'VERIFIED within recorded scope','photos_decoded_and_hash_checked':4,'license_page_hashes_checked':3,'supplementary_license_page':'web-opened Commons record, no local HTML snapshot','manual_labels':'IDs/bounds/number range/duplicates/joker nulls/green unsupported checked','ground_truth_method':'Human visual labels, not AI output; not a recognition benchmark result','unseen_URL_only':2,'product_or_spec_or_tests_changed':False,'new_AI_calls':0,'images_transformed':False}
(HERE/'verification.json').write_text(json.dumps(verification,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(manifest['counts'],ensure_ascii=False))
