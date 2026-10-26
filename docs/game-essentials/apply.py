"""Apply bounded data-only changes from immutable baseline + explicit decisions.
Re-running emits the same game JSON; no live application state is read.
"""
import json,pathlib,hashlib,copy
P=pathlib.Path('docs/game-essentials');base=json.load(open(P/'baseline.json'));decisions={d['game_id']:d for d in json.load(open(P/'decisions.json'))};reviews={r['game_id']:r for r in json.load(open('docs/game-state-review/games.json'))['rows']}
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
implementation='essentials.storage-guidance'
implementation_source=dict(id=implementation,title='KeepBoard 저장·보존 데이터 보완 정책 — 앱 권고, 공식 규칙 아님',url=None,kind='implementation',access='opened',checked_at='2026-10-22',note='docs/game-essentials/README.md 및 decisions.json. 기존 장면을 실물로 보존하기 위한 묶음ID·소유/역할·위아래·봉인·보관위치·미확인값 유지 제안. 게임 기작/공개성의 근거로 사용하지 않는다.')
manifest=[];receipts=[]
for item in base:
 original=item['spec'];g=copy.deepcopy(original);id=g['game_id'];d=decisions.get(id);claims=[]
 if d:
  s=d['source'];src=dict(id=s['id'],title=s['title'],url=s['url'],kind='official-rules',access='opened',checked_at=s['checked_at'],note=s['location']+'; 적용판본: '+str(s['edition'])+'; 확인범위: '+s['confirmed_facts']+' 원문/열람 한계는 docs/game-essentials/evidence.json#'+id)
  g['sources'].append(src)
  evidence=copy.deepcopy(s);evidence['game_id']=id;evidence['spec_source_id']=src['id'];evidence['status']='VERIFIED_SCOPED';evidence['full_rulebook_verified']=False;evidence['rights']='출판사 저작권 유지. 공개열람/로컬 연구용; 재배포/학습/상업 아트 라이선스 아님.'
  if s.get('local_text'):
   p=pathlib.Path(s['local_text']);evidence['local_text_sha256']=sha(p.read_bytes())
   pdf=pathlib.Path(s.get('local_pdf',str(p.with_suffix('.pdf'))))
   if pdf.exists():evidence['local_pdf']=str(pdf);evidence['local_pdf_sha256']=sha(pdf.read_bytes())
  else:evidence['access_note']='공식 web PDF 원문 본문 확인. shell 다운로드는 연결거부로 저장하지 못함. 검색 snippet만으로 판정하지 않음.'
  receipts.append(evidence)
  for f in d['add_fields']:
   assert not any(x['id']==f['id'] for x in g['state_fields'])
   f=copy.deepcopy(f);f.update(acquisition=['manual','physical'] if f['visibility']!='public' else ['photo','manual','physical'] if f['type']=='component-scene' else ['manual'],component_ids=[],area_ids=[],rule_ids=[],source_refs=[src['id']])
   g['state_fields'].append(f)
   claims.append(dict(kind='add-field',path='state_fields.'+f['id'],evidence=src['id'],confidence=f['confidence'],summary=f['label']))
   g['recognition_correction']['correction_targets'].append(dict(id=f['id']+'.essentials-edit',scope=f['scope'],field_ids=[f['id']],component_ids=[],area_ids=[],operations=['note'] if f['visibility']!='public' else ['note','count'] if f['type']=='component-scene' else ['note'],anchor_strategy='필드 ID와 실제 소유자/역할 및 별도 묶음 참조. 모름은 모름으로 유지.',notes=['선택 수동 기록. 사진만으로 비공개 정체·과거 처리·자동 차례를 생성하지 않는다.']))
   if f['type']=='component-scene' and f['visibility']=='public':g['recognition_correction']['photographable_field_ids'].append(f['id'])
  for a in d['amend_fields']:
   f=next(f for f in g['state_fields'] if f['id']==a['id']);f['description']+=' '+a['append']
   if src['id'] not in f['source_refs']:f['source_refs'].append(src['id'])
   # Original broad scene confidence is retained; narrow appended claim has its own receipt.
   claims.append(dict(kind='amend-field',path='state_fields.'+f['id'],evidence=src['id'],confidence='verified-scoped',summary=a['append']))
  for r in d['rules']:
   r=copy.deepcopy(r);r.update(kind='procedure',scope='public',component_ids=[],area_ids=[],source_refs=[src['id']],confidence='recommendation')
   g['rules'].append(r);claims.append(dict(kind='procedure-rule',path='rules.'+r['id'],evidence=src['id'],confidence='recommendation',summary=r['summary']))
  for prior, replacement in d.get('gap_replacements',{}).items():
   assert prior in g['gaps']
   g['gaps'][g['gaps'].index(prior)]=replacement
   claims.append(dict(kind='amend-gap',path='gaps',evidence=src['id'],confidence='verified-scoped',summary=replacement))
 # No broad baseline rewrite of the detailed native Catan spec.
 if id!='catan':
  g['sources'].append(copy.deepcopy(implementation_source))
  # Preserve existing privacy and actual scene grouping, including role/own-hidden cases.
  for pr in g['resume']['preserve_procedures']:
   if pr['method'] in ['ordered-bundle','sealed-bundle']:
    step='내용を確認せず' # placeholder never emitted
    pr['steps'].append('묶음 ID·실제 소유자/허용 역할·봉인 여부·보관 위치를 남긴다. 순서가 있는 묶음은 위/아래 방향과 내부 경계를 유지한다. 내용·수량을 모르면 모름으로 보존하고 펼치지 않는다.')
    if implementation not in pr['source_refs']:pr['source_refs'].append(implementation)
  covered={f for p in g['resume']['preserve_procedures'] for f in p['field_ids']}
  for f in g['state_fields']:
   if f['type']!='component-scene' or f['visibility']=='public' or f['id'] in covered:continue
   ordered=f['id'] in ['round-deck.scene','pool-decks.scene','project-decks.scene','dominance-deck.scene','terrain-stacks.scene','special-buildings.scene','future-objectives.scene','common-decks.scene','earned-fear.scene','event-deck.scene','draw.scene']
   pr=dict(id=f['id']+'.essentials-preserve',label=f['label']+' 실물 보존(선택)',scope=f['scope'],visibility=f['visibility'],field_ids=[f['id']],method='ordered-bundle' if ordered else 'sealed-bundle',order_sensitive=ordered,steps=['해당 필드의 실물만 별도 묶음으로 보관하고 다른 덱·버림·제거·소유자 묶음과 합치지 않는다.','묶음 ID·실제 소유자/허용 역할·봉인 여부·보관 위치를 기록한다. 위치도 민감하면 위치 기록을 생략하고 식별표/봉인 확인만 남긴다.','내용을 알기 위해 펼치거나 숨은 면을 촬영하지 않는다. 이미 의미가 확인된 순서는 위/아래와 내부 경계·줄/슬롯을 그대로 유지한다. 수량/정체 미상도 저장 가능.'],after=[],source_refs=[*f['source_refs'],implementation],confidence='recommendation')
   if f.get('visible_to_roles'):pr['visible_to_roles']=f['visible_to_roles']
   g['resume']['preserve_procedures'].append(pr)
  groups={}
  for f in g['state_fields']:
   if f['type']=='component-scene' and f['visibility']=='public':groups.setdefault(f['scope'],[]).append(f['id'])
  for scope,fields in groups.items():
   pr=dict(id='essentials.public-layout.'+scope,label='공개 배치·묶음 복원 참조(선택)',scope=scope,visibility='public',field_ids=fields,method='manual-note',order_sensitive=False,steps=['정리하기 전에 공개 장면의 참조 사진 또는 수동 배치 기록을 남긴다. 사진 없이도 모름/나중에 저장을 허용한다.','기존 장면의 구역·그룹·층·부착 대상·방향과 같은 것끼리의 중복 인스턴스를 구분한다. 뒷면이 섞인 공개 장면은 위치/앞뒤만 기록하고 정체를 확인하려 뒤집지 않는다.','분해가 필요하면 구역/실제 소유자별 묶음 ID와 보관 위치를 적고 구역 경계를 유지한다. 원래 순서가 의미 있는 줄·덱·부착은 그 관계를 유지; 무순서 풀에 새 게임상 순서를 만들지 않는다.','재개 시 참조 기록과 실물을 비교한 뒤 남은 처리만 이어 간다. 사진과 다른 값을 자동 수용하거나 미지의 정체·수량을 채우지 않는다.'],after=[],source_refs=[implementation],confidence='recommendation')
   g['resume']['preserve_procedures'].append(pr)
  if id=='arkham-lcg':
   g['resume']['preserve_procedures'].append(dict(id='chaos-bag.essentials-preserve',label='혼돈 주머니 봉인 보존(선택)',scope='public',visibility='public',field_ids=['chaos-bag'],method='sealed-bundle',order_sensitive=False,steps=['사용 중인 혼돈 주머니를 다른 토큰 공급/제외분과 섞지 않고 주머니째 봉인한다.','주머니 ID·봉인 여부·보관 위치와 확인한 난이도/캠페인 참조만 기록한다. 구성 미상이어도 열어 확인하지 않고 그대로 저장 가능.','이미 뽑아 해결 중인 토큰은 test의 참조와 별개로 구분하고 재개로 다시 뽑거나 주머니 구성을 초기화하지 않는다.'],after=[],source_refs=['arkham-lcg.essentials.rules',implementation],confidence='recommendation'))
  g['resume']['notes'].append('보존 묶음의 ID/보관 위치/봉인/순서 유지 확인은 내용 정체를 안다는 뜻이 아니다. 공개 총수와 비공개 내용은 기존 공개범위별로 분리하며 모르는 수량을0으로 만들지 않는다.')
  g['resume']['notes'].append('실제 사용하는 차례·시작자/순서·라운드/단계·남은 처리만 기록한다. 없는 기작을 추가하거나 재열기만으로 처리 완료/다음 턴/라운드 리셋을 실행하지 않는다.')
  # Existing pending remains a manual, optional checkpoint; no fabricated effects.
  for f in g['state_fields']:
   if f['id']=='pending':
    if implementation not in f['source_refs']:f['source_refs'].append(implementation)
    f['description']+=' 앱 보존 권고: 이미 완료한 처리와 아직 남은 처리, 해당하는 경우 효과의 대상·출처·종료 시점을 선택 메모로 구분한다. 공개 pending에는 공개된 처리만 적고 비공개 효과의 정체/선택은 소유자·허용 역할 기록에 둔다. 모르는 효과나 종료 조건은 생성하지 않는다.'
  g['recognition_correction']['never_infer'].append('보관 묶음의 존재/봉인/사진에서 내부 정체·정확한 수량·지나간 차례/효과 사용을 추정하지 않는다. 공개 수량의 근거가 없으면 비공개 내용으로부터 공개값을 만들어 내지 않는다.')
  claims.append(dict(kind='storage-guidance',path='resume.preserve_procedures',evidence=implementation,confidence='recommendation',summary='기존 공개 장면의 구역별 복원 참조와 미포함 비공개 실물 묶음 보존, 봉인/보관위치/위아래/unknown 유지'))
 # Only explicit scoped gap corrections above replace prior text; other gaps remain.
 findings=[]
 for f in reviews[id]['findings']:
  status='OUT_OF_SCOPE_RUNTIME' if f['type']=='runtime' else 'UNCLEAR'
  evidence=[]
  if d and f['type']!='runtime':
   # Explicit decisions below, not game-level blanket promotion.
   resolved={'arkham-horror-3':[0],'dune-imperium-uprising':[0,1],'jaipur':[0],'agricola':[0,1],'anachrony':[0],'barrage':[0],'caverna':[0,1],'terraforming-mars':[0,1],'dominant-species':[0],'le-havre':[0],'arkham-lcg':[0,1],'terra-mystica':[],'seti':[],'res-arcana':[],'marvel-champions':[],'twilight-imperium-4':[0,1,2],'spirit-island':[0],'seven-wonders-duel':[0,1],'rummikub':[1],'star-wars-outer-rim':[]}
   idx=reviews[id]['findings'].index(f)
   if idx in resolved.get(id,[]):status='ADDRESSED_SCOPED';evidence=[d['source']['id']]
  findings.append(dict(**f,result=status,source_refs=evidence,needed='해당 런타임 담당 검증; 이 데이터 패키지에서 해결 주장하지 않음' if status=='OUT_OF_SCOPE_RUNTIME' else '' if status=='ADDRESSED_SCOPED' else '선택 판본 공식 규칙의 해당 구성/설치/정보 공개·중단절차 조항 원문. 기존 추정은 미승격.'))
 # Every game has a scoped, explicit evidence boundary, including ones with no earlier finding.
 dimensions={
  'turn_and_order':[f['id'] for f in g['state_fields'] if any(t in (f['id']+' '+f['label']) for t in ['turn','starting-player','first-player','순서','시작','선 플레이어'])],
  'round_phase_pending':[f['id'] for f in g['state_fields'] if any(t in (f['id']+' '+f['label']) for t in ['round','phase','pending','generation','라운드','단계','시대'])],
  'public_fields':[f['id'] for f in g['state_fields'] if f['visibility']=='public'],
  'restricted_fields':[dict(id=f['id'],scope=f['scope'],visibility=f['visibility']) for f in g['state_fields'] if f['visibility']!='public'],
  'preservation_ids':[p['id'] for p in g['resume']['preserve_procedures']],
  'manual_or_physical_only':[f['id'] for f in g['state_fields'] if 'photo' not in f['acquisition']],
  'persistent_effect_review':'pending/게임별 필드·rules·resume·recognition 본문을 데이터 정책과 대조. 카드별 효과·제한 전체 공식 대조 아님.'}
 out=(json.dumps(g,ensure_ascii=False,indent=2)+'\n').encode();p=pathlib.Path(item['path'])
 if g!=original:p.write_bytes(out)
 else:out=p.read_bytes()
 unresolved=[f for f in findings if f['result']=='UNCLEAR']
 manifest.append(dict(game_id=id,name=g['name_ko'],edition=g['edition'],spec_path=item['path'],baseline_sha256=sha((json.dumps(original,ensure_ascii=False,indent=2)+'\n').encode()),final_sha256=sha(out),scope_checked=['state_fields','rules','resume','recognition_correction','sources','gaps'],status='official-scoped-amendment' if d else 'guidance-only' if g!=original else 'retained-existing',official_scope=d['source']['location'] if d else None,official_rules_complete=False,source_links=[{'id':s['id'],'url':s['url'],'kind':s['kind'],'access':s['access']} for s in g['sources']],changes=claims,review_findings=findings,unresolved_findings=len(unresolved),unverified_scope=dict(status='UNCLEAR',reason='선택 판본 전체 상태/카드별 지속효과·정보 공개의 완전 공식대조는 미완료. 이번 scoped claims 밖 기존 recommendation/reported는 확인 사실로 승격하지 않음.',needed_sources=[s['url'] for s in original['sources'] if s['url']],remaining_gap_items=g['gaps']),dimensions=dimensions))
dump(P/'manifest.json',dict(as_of='2026-10-22',games=manifest,game_count=len(manifest),official_scoped_game_count=len(decisions),factual_completeness_claim=False))
dump(P/'evidence.json',dict(as_of='2026-10-22',sources=receipts))
print('wrote',len(manifest),'rows; changed',sum(x['status']!='retained-existing' for x in manifest),'games')
