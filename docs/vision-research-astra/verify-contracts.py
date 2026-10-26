"""Check research contract integrity, not game-rule truth or photo accuracy."""
from pathlib import Path
import hashlib,json,csv,collections
OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
catalog={r['game_id'] for r in read(ROOT/'docs/research/initial-supported-games/catalog.json')['games']}
manifest=read(OUT/'manifest.json')
games=[read(p) for p in sorted((OUT/'games').glob('*.json'))]
assert len(games)==len(catalog)==120
assert {g['game_id'] for g in games}==catalog
sources={s['id'] for s in read(OUT/'sources.json')['sources']}
counts=collections.Counter()
for g in games:
    gid=g['game_id'];assert g['capture_focus'] and g['critical_resume_distinction']
    assert sha(ROOT/g['pinned_source']['path'])==g['pinned_source']['sha256']
    assert g['pinned_source']['runtime_match'] is True
    assert g['basis']['real_photo_accuracy_verified'] is False
    assert g['basis']['whole_game_rules_verified'] is False
    assert set(g['basis']['inherited_evidence_ids']).issubset(sources)
    assert set(g['basis']['official_scoped_checks_this_task']).issubset(sources)
    component_ids={c['component_id'] for c in g['components']}
    area_ids=[a['id'] for a in g['areas']]
    assert len(set(area_ids))==len(area_ids)
    assert sorted(x for ids in g['partitions'].values() for x in ids)==sorted(area_ids)
    for a in g['areas']:
        assert set(a['allowed_component_ids']).issubset(component_ids)
        assert a['id'] in g['partitions'][a['partition']]
        if a['partition']=='do_not_infer':
            assert a['allowed_component_ids']==[] and a['current_ai_destination_fields']==[]
            assert not a['capture_allowed_current']
        if a['partition']=='owner_private':assert a['scope']=='player' and a['visibility']=='owner'
        if a['partition']=='player_public':assert a['scope']=='player' and a['visibility']=='public'
        if a['partition']=='common_public':assert a['scope']=='public' and a['visibility']=='public'
        counts[a['partition']]+=1
    for c in g['components']:
        assert set(c['spec_source_refs']).issubset(sources)
        assert not (set(c['visible_attribute_keys'])&set(c['manual_attribute_keys']))
        assert set(c['must_preserve_readout_keys'])==set(c['visible_attribute_keys'])|set(c['manual_attribute_keys'])
        assert c['inventory_quantity_is_not_observed_quantity'] is True
for f in manifest['files']:assert sha(OUT/f['path'])==f['sha256']
assert dict(counts)==manifest['partition_area_counts']
csvrows=list(csv.DictReader((OUT/'coverage.csv').open()));assert {r['game_id'] for r in csvrows}==catalog
assert len({g['capture_focus'] for g in games})==120
photo=read(OUT/'photo-review.json')
assert len(photo['rows'])==7 and len({r['game_id'] for r in photo['rows']})==6
assert len({r['sha256'] for r in photo['rows']})==7
assert all(not r['accuracy_test_executed'] and r['same_static_state_with_other_images']=='UNKNOWN' for r in photo['rows'])
availability=read(OUT/'corpus-availability.json')
assert set(availability['games'])==catalog and all(g['provided_image_rows']>0 for g in availability['games'].values())
assert sha(ROOT/availability['index_path'])==availability['index_sha256']
code=read(OUT/'sol1-source-check.json');assert all(f['matches_manifest'] for f in code['files'])
assert code['sourceDigest']==code['digest_recomputed']
experiment=read(OUT/'experiment-card.json')
assert experiment['request_cap_including_failures']==6 and experiment['automatic_retries']==0
assert len(experiment['inputs'])==3 and len(experiment['execution_order'])==6
assert [i['scope'] for i in experiment['inputs']]==['public','owner','owner']
assert {i['sha256'] for i in experiment['inputs']}.issubset({r['sha256'] for r in photo['rows']})
for i in experiment['inputs']:
    assert sha(Path(i['local_path']))==i['sha256']
    if i['scope']=='owner':assert i['owner_id']=='synthetic-review-owner'
visual=read(OUT/'visual-reviews.json')
assert set(visual['games'])==catalog and visual['render_metadata_variants']==1300
assert all(r['real_photo_accuracy_verified'] is False for r in visual['games'].values())
sol2=read(OUT/'sol2-source-check.json')
assert len(sol2['files'])==2 and sol2['focused_test']['actual_exit']==0
for f in sol2['files']:
    assert sha(ROOT/'docs/game-visuals-full-audit/fix/after'/f['path'])==f['after_sha256']
    assert sha(Path(sol2['snapshot'])/f['path'])==f['after_sha256']
    assert f['matches_after_manifest'] and f['snapshot_matches_after']
assert sha(OUT/'sol2-focused-test.log')==sol2['focused_test']['log_sha256']
result={'checked_at':'2026-10-23','status':'VERIFIED_STRUCTURAL_ONLY','checks':{
 'exact_catalog_game_ids':120,'current_pinned_source_sha_matches':120,'manifest_contract_sha_matches':120,
 'unique_game_capture_focus':120,'csv_rows':120,'partition_areas':dict(counts),
 'do_not_infer_regions_never_photo_enabled':counts['do_not_infer'],'official_source_reference_resolution':'pass',
 'visible_manual_attr_disjoint':'pass','photo_review_unique_images':7,'photo_review_games':6,
 'sol1_changed_source_hash_matches':len(code['files']),'fixed_experiment_inputs_sha':3,'experiment_request_cap':6,
 'visual_review_exact_ids':120,'visual_metadata_variants':1300,'sol2_changed_source_hash_matches':2,'sol2_focused_tests':sol2['focused_test']['pass'],'sol2_after_browser':'NOT_EXECUTED',
 'collector_index_game_ids':120,'collector_selected_metadata_rows':availability['index_selected_images'],'collector_retained_reported':availability['retained_images_reported']},
 'limits':['No live model calls','No user private sources','No all-game rule/edition truth validation','No real photo accuracy certification'],
 'product_writes':0,'real_model_calls':0,'exit':0}
(OUT/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
