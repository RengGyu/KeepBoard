#!/usr/bin/env python3
"""Validate this frozen photo comparison and supplied static HTML, without product execution."""
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from itertools import combinations
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def read(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def key(row):
    return row['case_id'], row['assertion_id'], row['piece_id']


class StaticHTML(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack, self.buttons, self.cells, self.text = [], [], [], []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'data-estimated-row' in attrs:
            self.cells.append((int(attrs['data-estimated-row']), int(attrs['data-estimated-column'])))
        if 'data-drawing-piece' in attrs:
            def nearest(name):
                return next((a[name] for _, a in reversed(self.stack) if name in a), None)
            row, col = nearest('data-estimated-row'), nearest('data-estimated-column')
            self.buttons.append({
                'piece_id': attrs['data-drawing-piece'],
                'group_id': nearest('data-estimated-group'),
                'anchor_cluster': nearest('data-estimated-anchor'),
                'display_cell': [int(row), int(col)] if row is not None else None,
                'dom_index': len(self.buttons),
                'inside_attachment': any('estimated-attachments' in a.get('class', '').split() for _, a in self.stack),
            })
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            self.stack.append((tag, attrs))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, data):
        if data.strip():
            self.text.append(data.strip())


def main():
    output = HERE / 'final-v2-validation.json'
    if output.exists():
        raise SystemExit('Refusing to replace the recorded validation; use a new version for new evidence.')
    old = read(HERE / 'final-v2/pre-existing-evidence-sha256.json')
    assert all(sha(HERE / n) == h for n, h in old.items())
    frozen = read(HERE / 'final-v2/snapshot-freeze.json')
    assert all(sha(ROOT / x['source_path']) == sha(ROOT / x['copy_path']) == x['sha256'] for x in frozen['copied_files'])
    manifest = read(HERE / 'final-v2/freeze.json')
    for section in ('source', 'reusedSources', 'inputs', 'outputs'):
        for x in manifest[section]:
            assert sha(ROOT / x['path']) == x['sha256']
            if 'snapshot' in x:
                assert sha(ROOT / x['snapshot']) == x['sha256']
    source = {key(r): r for r in read(HERE / 'source-matches-v1.json')['rows']}
    stems = {'before': 'interim-v1-before-v2', 'interim': 'interim-v1-after-v2', 'final': 'final-v2-photo'}
    reports = {stage: read(HERE / (stem + '.json')) for stage, stem in stems.items()}
    rowsets = {stage: read(HERE / (stem + '-rows.json')) for stage, stem in stems.items()}
    for stage, rows in rowsets.items():
        assert len(rows) == len(source) == 363 and {key(r) for r in rows} == set(source)
        assert all(all(r[k] == v for k, v in source[key(r)].items()) for r in rows)
        for field, filename in [('source_basis_sha256', 'source-basis.json'), ('source_matches_sha256', 'source-matches-v1.json'), ('script_sha256', 'compare-snapshot.py')]:
            assert reports[stage][field] == sha(HERE / filename)
    htmlchecks, rendered, attachment_routes = [], {}, []
    sg_html = None
    for case in read(HERE / 'final-v2/replay-result.json')['rows']:
        cid = case['caseId']
        structure = read(HERE / 'final-v2/structures' / (cid + '.json'))
        placements = {(x['assertionId'], x['pieceId']): x for x in structure['placements']}
        assert all(x['basis'] != 'manual' for x in structure['placements'])
        assert all(not x.get('hasManualFrame') for x in structure['boardContexts'])
        for i, field in enumerate(case['fields']):
            path = HERE / 'final-v2/rendered' / f'{cid}-{i}.html'
            html = StaticHTML()
            html.feed(path.read_text())
            ids = [x['piece_id'] for x in html.buttons]
            assert len(ids) == len(set(ids)) == field['rendered'] == field['expected']
            for button in html.buttons:
                placement = placements[field['assertionId'], button['piece_id']]
                if button['group_id'] != placement['groupId']:
                    ref = placement.get('attachedToRef')
                    assert ref and button['inside_attachment']
                    parent = placements[ref['assertionId'], ref['pieceId']]
                    assert button['group_id'] == parent['groupId']
                    attachment_routes.append({'case_id': cid, 'piece_id': button['piece_id'], 'parent_piece_id': ref['pieceId'], 'interpretation': 'Explicit attached child is nested under the parent group, not a wrong source-run merge.'})
                rendered[cid, field['assertionId'], button['piece_id']] = button
            htmlchecks.append({'case_id': cid, 'field_index': i, 'path': str(path.relative_to(ROOT)), 'sha256': sha(path), 'drawing_buttons': len(ids), 'expected_estimated_route': field['expected'], 'native_retained_outside_html': field['retained'], 'missing_source_outside_html': field['unplacedWithoutEstimatedView'], 'placement_or_explicit_attachment_group_match': True})
            if cid == 'sagrada-low' and i == 0:
                sg_html = html
    sg = [r for r in rowsets['final'] if r['case_id'] == 'sagrada-low']
    assert len(sg) == 18
    assert all(r['actual_board'] is None and r['actual_anchor_ref'] is None and r['actual_cell'] is None and r['actual_area'] == 'unclassified' and r['actual_display_hypothesis'] == 'unanchored-grid' for r in sg)
    assert all(rendered[key(r)]['display_cell'] == r['photo_cell'] for r in sg)
    empty = sorted(set(sg_html.cells) - {tuple(rendered[key(r)]['display_cell']) for r in sg})
    assert empty == [(2, 2), (2, 5)]
    assert '판 미확정 표시 격자 18개 · 배치 수 제외' in sg_html.text
    lines = {}
    for cid in ('lost-cities-baseline', 'lost-cities-high', 'lost-cities-low', 'lost-cities-medium'):
        rows = [r for r in rowsets['final'] if r['case_id'] == cid and r['photo_role'] == 'expedition' and r['photo_line_id']]
        same = [(a, b) for a, b in combinations(rows, 2) if a['photo_line_id'] == b['photo_line_id']]
        different = [(a, b) for a, b in combinations(rows, 2) if a['photo_line_id'] != b['photo_line_id']]
        lines[cid] = {
            'evaluable_expedition_rows': len(rows), 'fixed_same_run_pairs': len(same),
            'correct_same_run_pairs': sum(a['actual_group_id'] == b['actual_group_id'] and a['board_status'] == b['board_status'] == 'correct' for a, b in same),
            'different_source_run_pairs_checked': len(different),
            'wrong_merges': [{'a': a['piece_id'], 'b': b['piece_id']} for a, b in different if a['actual_group_id'] == b['actual_group_id']],
            'html_correct_same_run_pairs': sum(rendered[key(a)]['group_id'] == rendered[key(b)]['group_id'] for a, b in same),
            'html_wrong_merges': sum(rendered[key(a)]['group_id'] == rendered[key(b)]['group_id'] for a, b in different),
            'scope': 'Source-matched runs only; deferred source geometry is excluded.',
        }
    byid = {(r['case_id'], r['piece_id']): r for r in rowsets['final']}
    order = []
    for x in read(HERE / 'final-v2-photo-relations.json')['source_order_relations']:
        if x['case_id'] == 'lost-cities-baseline':
            a, b = byid[x['case_id'], x['inner']], byid[x['case_id'], x['outer']]
            order.append(rendered[key(a)]['group_id'] == rendered[key(b)]['group_id'] and rendered[key(a)]['dom_index'] < rendered[key(b)]['dom_index'])
    assert len(order) == 53 and all(order)
    crops = [ROOT / 'docs/pro-implementation-20261113/photo-audit/crops' / name for name in ('lc-far-blue.png', 'lc-near-white.png', 'lc-near-yellow.png')] + [HERE / 'crops/7w-right-indices.png']
    result = {
        'validated_at': datetime.now(timezone.utc).isoformat(), 'validator_sha256': sha(Path(__file__)),
        'provided_freeze_sha256': sha(HERE / 'final-v2/freeze.json'),
        'copied_package_files_checked': len(frozen['copied_files']), 'copied_package_files_changed': 0,
        'final_source_manifest_records_verified': {k: len(v) for k, v in frozen['source_manifest_checks'].items()},
        'pre_existing_photo_evaluation_files_checked': len(old), 'pre_existing_files_changed': 0,
        'fixed_photo_rows_each_stage': 363, 'same_source_mapping_and_denominators_cases': 9,
        'source_criteria_changes': 0, 'comparison_script_changed': False, 'manual_placements_or_frames': 0,
        'html_fields': htmlchecks, 'html_drawing_buttons': sum(x['drawing_buttons'] for x in htmlchecks),
        'native_retained_outside_html': sum(x['native_retained_outside_html'] for x in htmlchecks),
        'missing_source_observations_outside_html': sum(len(x['missing_source_outside_html']) for x in htmlchecks),
        'explicit_attachment_parent_group_routes': attachment_routes,
        'lc_line_checks': lines, 'lc_baseline_source_order_pairs_in_html': {'checked': len(order), 'matched': sum(order)},
        'sagrada_low_html_correct_source_cells': 18, 'sagrada_low_empty_cells': empty, 'sagrada_low_unanchored_notice_present': True,
        'crops_reopened_this_final_comparison': [{'path': str(x.relative_to(ROOT)), 'sha256': sha(x)} for x in crops],
        'provider_calls_by_evaluator': 0, 'product_edits_by_evaluator': 0, 'deployments_by_evaluator': 0,
        'browser_or_real_device_checks_by_evaluator': 0,
        'verification_scope': 'Frozen JSON/static HTML and hashes with previously fixed source photo judgments and reopened crops. No product rerun, test-suite, browser-layout or device claim.',
    }
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'path': str(output.relative_to(ROOT)), 'sha256': sha(output), 'html_fields': len(htmlchecks), 'html_buttons': result['html_drawing_buttons'], 'native_outside_html': result['native_retained_outside_html'], 'missing_source_outside_html': result['missing_source_observations_outside_html'], 'attachment_routes': len(attachment_routes)}, indent=2))


if __name__ == '__main__':
    main()
