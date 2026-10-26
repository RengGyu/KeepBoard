"""Validate this research catalogue, not app behavior or the truth of web sources."""
import csv
import json
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
data = json.loads((ROOT / 'catalog.json').read_text())
games = data['games']
sources = {s['source_id']: s for s in data['sources']}
assert len(sources) == len(data['sources'])
assert len(games) == 120
assert len({g['game_id'] for g in games}) == 120
assert len({g['name_en'].casefold() for g in games}) == 120
assert Counter(g['priority_group'] for g in games) == {'P1': 24, 'P2': 36, 'P3': 60}
assert sum(g['initial_target'] for g in games) == 60
assert [g['game_id'] for g in games if g['current_support_status'] != 'catalogue_only'] == ['catan']
assert games[0]['current_support_status'] == 'tested_catan_reported'
assert data['recommendation']['current_tested_count_reported'] == 1
assert data['recommendation']['catalogue_count'] == len(games)
assert data['recommendation']['proposed_base_catalogue_target'] == 1000
assert data['recommendation']['compared_catalogue_scales'] == [1000, 5000, 10000]

for src in sources.values():
    parsed = urlparse(src['url'])
    assert parsed.scheme in ['http', 'https'] and parsed.netloc
    assert 'pending' not in src['access_status']

for g in games:
    assert g['base_game'] is True
    assert g['reference_source_id'] in sources
    assert g['publisher_or_reference_url'] == sources[g['reference_source_id']]['url']
    assert g['initial_target'] == (g['priority_group'] in ['P1', 'P2'])
    assert g['default_capture_mode'] == 'photo_common'
    assert g['expected_recording_mode'] in ['photo_common', 'small_layout_profile', 'optional_special_extension']
    assert g['bgg_rank'] is g['bgg_num_ratings'] is g['bgg_owned'] is None
    for key in ['players_min', 'players_max', 'playtime_min_minutes', 'playtime_max_minutes',
                'playtime_per_player_minutes', 'campaign_total_min_minutes', 'campaign_total_max_minutes']:
        val = g[key]
        assert val is None or (type(val) is int and val > 0), (g['game_id'], key)
        if val is not None:
            assert g['metadata_source_url'] and g['metadata_evidence_status'] != 'unverified'
    for lo, hi in [('players_min', 'players_max'), ('playtime_min_minutes', 'playtime_max_minutes')]:
        if g[lo] is not None and g[hi] is not None:
            assert g[lo] <= g[hi]
    if g['playtime_per_player_minutes'] is not None:
        assert g['playtime_min_minutes'] is g['playtime_max_minutes'] is None
    assert len(g['popularity_signal_ids']) == len(g['popularity_source_urls'])
    assert g['popularity_source_urls'] == [sources[s]['url'] for s in g['popularity_signal_ids']]
    assert g['proposed_saved_elements'] and g['selection_reason'] and g['edition_compatibility_note']

by_id = {g['game_id']: g for g in games}
assert by_id['dune-imperium-uprising']['allowed_player_counts'] == [1, 2, 3, 4, 6]
assert by_id['dobble']['playtime_display'] == '15분 이하'
assert by_id['sleeping-gods']['playtime_max_minutes'] == 90
assert by_id['sleeping-gods']['campaign_total_max_minutes'] == 1200
assert by_id['mage-knight']['players_max'] == 4
assert by_id['mage-knight']['materials_availability'] == 'prior_related_edition_rules_only'
assert by_id['arkham-lcg']['materials_availability'] == 'prior_related_edition_rules_only'

with (ROOT / 'catalog.csv').open(encoding='utf-8-sig', newline='') as f:
    csv_rows = list(csv.DictReader(f))
assert len(csv_rows) == len(games)
for actual, expected in zip(csv_rows, games):
    assert set(actual) == set(expected)
    for key, value in expected.items():
        rendered = json.dumps(value, ensure_ascii=False) if isinstance(value, (list, dict)) else ('' if value is None else str(value))
        assert actual[key] == rendered, (expected['game_id'], key)

def stats(rows):
    return {
        'count': len(rows),
        'players_known': sum(g['players_min'] is not None for g in rows),
        'metadata_with_source': sum(g['metadata_source_url'] is not None for g in rows),
        'whole_playtime_indication_known': sum(g['playtime_min_minutes'] is not None or g['playtime_max_minutes'] is not None for g in rows),
        'per_player_playtime_only': sum(g['playtime_per_player_minutes'] is not None for g in rows),
        'playtime_unverified': sum(g['playtime_display'] == '미확인' for g in rows),
        'whole_playtime_max_at_most_45': sum(g['playtime_max_minutes'] is not None and g['playtime_max_minutes'] <= 45 for g in rows),
        'whole_playtime_min_at_least_90': sum(g['playtime_min_minutes'] is not None and g['playtime_min_minutes'] >= 90 for g in rows),
        'popularity_signal_rows': sum(bool(g['popularity_signal_ids']) for g in rows),
        'metadata_access': dict(Counter(g['metadata_evidence_status'] for g in rows)),
        'modes': dict(Counter(g['expected_recording_mode'] for g in rows)),
        'state_families': dict(Counter(g['state_family'] for g in rows)),
    }

report = {
    'status': 'pass',
    'checked_at': data['as_of'],
    'scope': '자료 구조·중복 ID·단계 수량·출처 연결·숫자/null·판본 예외·CSV/JSON 동일성. 링크 재접속/웹 사실 재검증/제품 시험은 이 스크립트 범위 아님.',
    'all': stats(games),
    'initial_60': stats([g for g in games if g['initial_target']]),
    'P1': stats([g for g in games if g['priority_group'] == 'P1']),
    'P2': stats([g for g in games if g['priority_group'] == 'P2']),
    'source_count': len(sources),
    'source_access': dict(Counter(s['access_status'] for s in sources.values())),
}
(ROOT / 'validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': 'pass', 'games': len(games), 'initial_target': 60,
                  'whole_playtime_known': report['all']['whole_playtime_indication_known'],
                  'per_player_time_only': report['all']['per_player_playtime_only'],
                  'time_unverified': report['all']['playtime_unverified'],
                  'csv_json_equal': True}, ensure_ascii=False))
