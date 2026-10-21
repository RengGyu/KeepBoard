"""Apply only baseline-81 components after evidence decisions. No product edits."""
import collections,json,pathlib,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[2];HERE=pathlib.Path(__file__).resolve().parent
results=json.loads((HERE/'results.json').read_text());baseline=json.loads((HERE/'baseline.json').read_text())
allowed={(g['game_id'],c['id']) for g in baseline['games'] for c in g['components']}
assert len(allowed)==81
bygame=collections.defaultdict(list)
for row in results['rows']:
 assert (row['game_id'],row['component_id']) in allowed
 bygame[row['game_id']].append(row)
overrides={};changed=[]
for id,rows in bygame.items():
 path=ROOT/'docs/research/game-specs-120/games'/f'{id}.json';g=json.loads(path.read_text());before=path.read_bytes()
 for row in rows:
  if row['status']!='confirmed':continue
  assert row['official_source']['access']=='opened' and row['official_source']['location'] and row['art_recipe']
  c=next(c for c in g['components'] if c['id']==row['component_id']);source=row['official_source']
  c['description']=row['verified_facts']+' 대표형의 정체와 이 범위만 확인했으며 전체 인쇄 앞면·전체 규칙 검증은 아니다.'
  c['confidence']='verified';c['source_refs']=list(dict.fromkeys([*c['source_refs'],source['id']]))
  c['variants']=[v[0] for v in row['art_recipe']]
  # Preserve original grouped quantity and every unrelated component/rule/field.
  original=next(c0 for g0 in baseline['games'] if g0['game_id']==id for c0 in g0['components'] if c0['id']==c['id'])
  assert c['quantity']==original['quantity']
  record={'id':source['id'],'title':source['title'],'url':source['url'],'kind':'official-rules' if '.pdf' in source['url'].lower() else 'official-product','access':'opened','checked_at':source['checked_at'],'note':source['location']+' — '+row['verified_facts']+' 전체 규칙/인쇄 변종 확인으로 확대하지 않음.'}
  g['sources']=[s for s in g['sources'] if s['id']!=record['id']]+[record]
  for supplement in row.get('support_sources',[]):
   c['source_refs']=list(dict.fromkeys([*c['source_refs'],supplement['id']]))
   record2={'id':supplement['id'],'title':supplement['title'],'url':supplement['url'],'kind':'official-rules','access':'opened','checked_at':supplement['checked_at'],'note':supplement['location']+' — 구성물 확인 보조 근거; 전체 규칙 검증으로 확대하지 않음.'}
   g['sources']=[s for s in g['sources'] if s['id']!=record2['id']]+[record2]
  overrides[id+':'+c['id']]={'variants':[{'name':name,'expression':expression} for name,expression in row['art_recipe']],'color_role':row['color_role'],'owner_color_supported':row['color_role']=='owner','confirmation_status':'confirmed','evidence_source_refs':[source['id']],'source_location':source['location'],'whole_inventory':False}
  if (id,c['id']) in [('arkham-lcg','locations'),('arkham-lcg','decks'),('istanbul','cards')]:overrides[id+':'+c['id']]['hidden_layers']=[]
  overrides[id+':'+c['id']]['evidence_source_refs']=c['source_refs']
 path.write_text(json.dumps(g,ensure_ascii=False,indent=2)+'\n') if any(r['status']=='confirmed' for r in rows) else None
 if before!=path.read_bytes():changed.append(str(path.relative_to(ROOT)))
(ROOT/'docs/game-art/confirmed-components.json').write_text(json.dumps(overrides,ensure_ascii=False,indent=2)+'\n')

# Refresh only directly linked source-index entries and component coverage records.
folder=ROOT/'docs/research/game-specs-120';index=json.loads((folder/'source-index.json').read_text())
for entry in index:
 entry['uses']=[u for u in entry['uses'] if '.art-confirmation.' not in u['id']]
for game in bygame:
 g=json.loads((folder/'games'/f'{game}.json').read_text())
 for source in g['sources']:
  if '.art-confirmation.' not in source['id']:continue
  entry=next((e for e in index if e['url']==source['url']),None)
  if entry is None:entry={'url':source['url'],'uses':[]};index.append(entry)
  entry['uses'].append({'game_id':game,**source})
(folder/'source-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
coverage=json.loads((folder/'coverage.json').read_text())
for entry in coverage['games']:
 if entry['game_id'] not in bygame:continue
 g=json.loads((folder/'games'/(entry['game_id']+'.json')).read_text())
 entry['unclear_component_groups']=[c['id'] for c in g['components'] if c['confidence']=='unclear'];entry['source_count']=len(g['sources'])
 entry['art_confirmation']={'confirmed_component_ids':[r['component_id'] for r in bygame[entry['game_id']] if r['status']=='confirmed'],'partial_component_ids':[r['component_id'] for r in bygame[entry['game_id']] if r['status']=='partial'],'public_evidence_insufficient_ids':[r['component_id'] for r in bygame[entry['game_id']] if r['status']=='public-evidence-insufficient'],'report':'../../art-confirmation/results.json','full_rules_verified':False}
coverage['art_confirmation']={'baseline':81,**results['counts'],'intentional_catan_unknown_preserved':True,'report':'../../art-confirmation/results.json'}
(folder/'coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+'\n')
(HERE/'applied.json').write_text(json.dumps({'target_game_files':[str(pathlib.Path('docs/research/game-specs-120/games')/(id+'.json')) for id,rows in bygame.items() if any(r['status']=='confirmed' for r in rows)],'changed_this_run':changed,'confirmed_components':len(overrides),'unknown_components_retained':81-len(overrides),'intentional_catan_unknown_preserved':True},ensure_ascii=False,indent=2)+'\n')
print('applied',len(overrides),'components in',len(changed),'games; remaining source-unclear',81-len(overrides))
