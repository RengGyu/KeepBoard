"""Bounded baseline/result/spec/art consistency checks, not factual recognition QA."""
import collections, hashlib, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
load = lambda p: json.loads(p.read_text())
baseline = load(HERE / 'baseline.json')
results = load(HERE / 'results.json')
original = {(g['game_id'], c['id']): c for g in baseline['games'] for c in g['components']}
rows = {(r['game_id'], r['component_id']): r for r in results['rows']}
assert len(original) == len(rows) == len(results['rows']) == 81
assert original.keys() == rows.keys()
counts = dict(collections.Counter(r['status'] for r in rows.values()))
assert counts == results['counts'] == {'confirmed': 55, 'partial': 16, 'public-evidence-insufficient': 10}
specs = {p.stem: load(p) for p in (ROOT / 'docs/research/game-specs-120/games').glob('*.json')}
games = load(ROOT / 'public/game-art/games.json')['games']
assert len(specs) == len(games) == 120
assert sum(len(g['components']) for g in specs.values()) == 437
mapping = {(g['game_id'], c['component_id']): c for g in games for c in g['components']}
source_index = load(ROOT / 'docs/research/game-specs-120/source-index.json')
local_sources = set()
for key, row in rows.items():
    game, cid = key
    spec = specs[game]
    component = next(c for c in spec['components'] if c['id'] == cid)
    assert component['quantity'] == original[key]['quantity'] is None
    source = row['official_source']
    assert source['access'] == 'opened' and source['url'].startswith('https://')
    assert source['location'] and source['title'] and row['selected_edition']
    assert not row['full_printed_inventory_verified']
    for evidence in [source, *row.get('support_sources', [])]:
        if evidence.get('local_path'):
            path = ROOT / evidence['local_path']
            assert path.is_file(), path
            assert hashlib.sha256(path.read_bytes()).hexdigest() == evidence['local_sha256'], path
            local_sources.add(evidence['local_path'])
    if row['status'] == 'confirmed':
        assert component['confidence'] == 'verified' and row['art_recipe'] and row['remaining_needed'] is None
        assert mapping[key]['status'] != 'unclear'
        assert mapping[key]['confirmation_status'] == 'confirmed'
        assert component['variants'] == [v[0] for v in row['art_recipe']]
        for evidence in [source, *row.get('support_sources', [])]:
            assert evidence['id'] in component['source_refs']
            record = next(s for s in spec['sources'] if s['id'] == evidence['id'])
            assert record['url'] == evidence['url'] and record['access'] == 'opened'
            assert any(e['url'] == evidence['url'] and any(u['id'] == evidence['id'] for u in e['uses']) for e in source_index)
    else:
        assert component == original[key], key
        assert mapping[key]['status'] == 'unclear' and row['remaining_needed']
before = load(HERE / 'source-hashes-before.json')['hashes']
assert set(before) == set(specs)
changed = []
for g in games:
    path = ROOT / g['source_spec']
    sha = hashlib.sha256(path.read_bytes()).hexdigest()
    assert sha == g['source_sha256']
    disk_mapping = load(ROOT / f"public/game-art/games/{g['game_id']}/mapping.json")
    assert disk_mapping == g
    assert {c['id'] for c in specs[g['game_id']]['components']} == {c['component_id'] for c in g['components']}
    if sha != before[g['game_id']]: changed.append(g['game_id'])
expected_changed = sorted({game for (game, _), row in rows.items() if row['status'] == 'confirmed'})
assert sorted(changed) == expected_changed and len(changed) == 29
assert 'catan' not in changed
unclear = [(g['game_id'], c['component_id']) for g in games for c in g['components'] if c['status'] == 'unclear']
intentional = [(g['game_id'], c['component_id']) for g in games for c in g['components'] if c['status'] == 'unclear' and c['source_confidence'] != 'unclear']
assert len(unclear) == 27 and len(intentional) == 1 and intentional[0][0] == 'catan'
report = {
    'status': 'VERIFIED', 'baseline_components': 81, 'counts': counts,
    'games': 120, 'components': 437, 'changed_spec_games': sorted(changed),
    'changed_spec_game_count': len(changed), 'unchanged_other_spec_hashes': True,
    'local_evidence_hashes_checked': len(local_sources), 'quantity_null_preserved': 81,
    'remaining_source_unclear': 26, 'intentional_catan_unknown_preserved': intentional,
    'mapping_hashes_and_component_ids_match': True, 'source_refs_and_index_match': True,
    'limits': ['This verifies recorded evidence linkage and bounded artifact consistency, not the truth of every rule.',
               'Confirmed means representative identities and stated restoration semantics, not all printed variants.',
               'No factual 120-game product support or physical recognition accuracy claim.']
}
(HERE / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False))
