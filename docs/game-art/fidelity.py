"""Apply only the 20 explicitly approved art corrections, retaining legacy identity."""
import hashlib,json,re
from pathlib import Path
import draw as D
import fidelity_shapes as F

PLANS=json.loads((Path(__file__).parent/'fidelity-corrections.json').read_text())

def apply(game, entry, add, common):
 plan=PLANS.get(game+':'+entry['component_id'])
 if not plan:return
 old=entry['variants'];made=[]
 for preset in plan['variants']:
  body=F.draw(preset['shape'],preset.get('value'),preset.get('motif'))
  if preset.get('die_type')=='extra':body=body.replace('#c0d76c',D.INK)
  if preset['shape']=='military' and preset.get('color')=='#3b4541':body=body.replace('fill="'+D.INK+'" stroke="none"','fill="'+D.CREAM+'" stroke="none"')
  if preset.get('color'):
   body=re.sub(r'var\(--owner,#[a-fA-F0-9]+\)',preset['color'],body)
  # Resource cube value labels are an explanatory preset, never an observed quantity.
  if preset['shape']=='cube' and 'value' in preset:body+=D.text(preset['value'],57,78,23,D.CREAM)
  digest=hashlib.sha256(body.encode()).hexdigest()[:12]
  asset=add('common.fidelity-'+preset['shape']+'-'+digest,preset['name']+' · 대표형',body)
  meta={k:v for k,v in preset.items() if k not in ['shape','value','motif']}
  made.append({**meta,'label':preset['name'],'layers':[{'asset_id':asset}]})
 for previous in old:
  if previous['name'] in plan['keep_legacy_names']:
   made.append({**previous,'color_role':'owner','owner_color_supported':True})
  else:
   made.append({'name':previous['name'],'label':previous['name']+' · 기존 종류 미확인','layers':[{'asset_id':common('unknown')}],
    'unresolved':True,'color_role':'unknown','owner_color_supported':False,
    'legacy_reason':'기존 이름만으로 새 구체 유형/값/색을 확정하지 않는다. 저장 원본은 유지한다.'})
 assert len({v['name'] for v in made})==len(made),(game,entry['component_id'])
 entry.update(variants=made,color_role='variant',owner_color_supported=any(v.get('owner_color_supported') for v in made),
  status='common-reuse',fidelity_correction={'finding_id':plan['finding_id'],'source_url':plan['source_url'],
   'source_location':plan['source_location'],'scope':plan['scope'],'legacy_policy':plan['legacy_policy']})
