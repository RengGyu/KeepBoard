"""Planning arithmetic. These per-game averages are assumptions, not measurements."""
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
# Decimal units: 1 KB=1,000 bytes, 1 MB=1,000,000 bytes, 1 GB=1,000,000,000 bytes.
base_parts = {'rules': 25_000, 'components': 15_000, 'features': 5_000, 'metadata_references': 5_000}
patch_parts = {'rules': 7_000, 'components': 5_000, 'features': 2_000, 'metadata_references': 1_000}
assumptions = {
    'evidence_level': 'PLANNING_ASSUMPTION_NOT_EMPIRICAL_AVERAGE',
    'base_structured_parts_bytes': base_parts,
    'patch_structured_parts_bytes': patch_parts,
    'mean_selected_patches_per_base_game': 2,
    'base_rule_pdf_bytes': 8_000_000,
    'patch_rule_pdf_bytes': 3_000_000,
    'base_reference_art_bytes': 2_000_000,
    'patch_reference_art_bytes': 500_000,
    'session_custom_map_bytes': 10_000,
    'versions_copies_compression': 'one version, one copy, uncompressed; no session photos/state, database/index overhead or embeddings included',
    'media_policy': 'These are optional local-copy capacity allowances, not downloaded assets or redistribution permissions. Link-only references add no PDF/art file bytes here.',
}
B, P = sum(base_parts.values()), sum(patch_parts.values())
E = assumptions['mean_selected_patches_per_base_game']
rows=[]
for N in [1, 1000, 5000, 10000]:
    structured=N*(B+E*P)
    pdf=N*(assumptions['base_rule_pdf_bytes']+E*assumptions['patch_rule_pdf_bytes'])
    art=N*(assumptions['base_reference_art_bytes']+E*assumptions['patch_reference_art_bytes'])
    rows.append({'base_games':N, 'assumed_patch_count':N*E,
                 'structured_bytes':structured,'rule_pdf_bytes':pdf,'reference_art_bytes':art,
                 'total_bytes_excluding_sessions':structured+pdf+art})
sensitivity=[]
for N in [1000,5000,10000]:
    for e in [0,1,2,4]:
        sensitivity.append({'base_games':N,'patches_per_base':e,'structured_bytes':N*(B+e*P)})
profiles=[]
for label,b,p,e in [('lean',10_000,3_000,1),('planning',50_000,15_000,2),('large',200_000,60_000,4)]:
    profiles.append({'assumption':label,'base_bytes':b,'patch_bytes':p,'patches_per_base':e,
                     'per_base_with_patches_bytes':b+e*p,
                     'by_scale_bytes':{str(n):n*(b+e*p) for n in [1000,5000,10000]}})
data={'as_of':'2026-10-21','units':'decimal byte/KB/MB/GB','assumptions':assumptions,
      'formulas':{'structured':'N * (B + E * P)', 'pdf':'N * (D_base + E * D_patch)',
                  'art':'N * (A_base + E * A_patch)',
                  'sessions':'session_count * (custom_map_bytes + observed_state_bytes + photo_bytes)',
                  'version_retention':'sum(actual retained unique base versions, patch versions, media files) + session storage; not every expansion combination'},
      'default_scenario':rows,'patch_count_sensitivity':sensitivity,'structured_size_scenarios':profiles,
      'measured_comparators_file':'measurements.json',
      'note':'No extrapolated average is presented as measured. No raw PDFs, reference images, personal files or model outputs were measured for this projection.'}
assert B==50_000 and P==15_000
assert rows[1]['structured_bytes']==80_000_000
assert rows[-1]['total_bytes_excluding_sessions']==170_800_000_000
(OUT/'capacity-plan.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':'pass','structured_per_base_with_2_patches_bytes':B+E*P,
                  'one_thousand_structured_MB':rows[1]['structured_bytes']/1_000_000,
                  'one_thousand_optional_media_GB':(rows[1]['rule_pdf_bytes']+rows[1]['reference_art_bytes'])/1_000_000_000},ensure_ascii=False))
