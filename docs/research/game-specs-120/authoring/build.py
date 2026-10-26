"""Research-only formatter. Game facts live in the hand-authored batch files.

This does not generate facts, game rules, product packs or recognition results.
"""
import json
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
CAT = json.loads((REPO / 'docs/research/initial-supported-games/catalog.json').read_text())
CATALOG = {g['game_id']: g for g in CAT['games']}
DATE = '2026-10-21'

def refs(conf, source):
    return [source] if conf in ('verified', 'reported') else []

def detailed_catan(draft):
    """Retain the handed-off 57-field contract; do not shrink the reference game."""
    s=json.loads((ROOT/'authoring/catan-detailed-baseline.json').read_text())
    names={'terrain':'지형','number-token':'숫자 토큰','road':'도로','settlement':'마을',
      'city':'도시','robber':'도둑','resource-card':'자원 카드','development-card':'개발 카드',
      'token':'표식·특수 카드','deck':'카드 더미','container':'보관 용기','harbor':'항구','unknown':'미확인 부품'}
    for c in s['components']: c['name']=names[c['id']]
    area_names={'board':'공용 섬·도로·건물·항구','hand':'개인 카드','supply':'공용 공급','ordered-deck':'개발 카드 덱'}
    for a in s['layout']['areas']: a['name']=area_names[a['id']]
    s['sources']+=draft['sources']
    for rule in draft['rules']:
        if rule['id']=='record-only':rule['field_ids']=['currentPlayer','turn.pendingEffect']
        s['rules'].append(rule)
    s['recognition_correction']['never_infer']+=draft['recognition_correction']['never_infer']
    s['resume']['notes']+=['57필드·25조건부 요구·17도출·8보존은 기존 상세 계약 참조다. 현재 앱의 선택 기록 방침을 유지하며 질문 완료를 저장 조건으로 만들지 않는다.',
      'turn/round lifetime은 데이터 의미이며 재열기 시 초기화 명령이 아니다.']
    s['layout']['notes']+=draft['layout']['notes']
    s['custom_setup']['invariant_rule_ids']=['record-only']
    s['custom_setup']['description']+=' 가변 육각·새 항구·선박은 별도 세션 기하/확장 패치가 필요하며 현재19칸 슬롯을 자동 확장하지 않는다.'
    s['gaps']+=draft['gaps']+['상세 참조는 구현솔이 제공한 독립 연구 형식의 스냅샷이다. 원래 제품 팩을 이 작업에서 변경하거나 새로 규칙 검증하지 않았다.']
    return s

def verification_level(g):
    if g.get('verification_status'):return g['verification_status']
    access=g.get('access','search-index');kind=g.get('source_kind','official-product')
    if access=='not-checked':return 'prior-research-reused'
    prefix='rules' if kind in ('official-rules','official-faq') else 'product'
    return prefix+('-text-partial' if access=='opened' else '-index-partial')

def build(g):
    cid=g['id']; cat=CATALOG[cid]; sid=cid+'.primary'
    source={'id':sid,'title':g.get('source_title',cat['name_en']+' — 공식 자료'),
      'url':g['url'],'kind':g.get('source_kind','official-product'),
      'access':g.get('access','search-index'),'checked_at':DATE if g.get('access','search-index') in ('opened','search-index') else None,'note':g['evidence']}
    sources=[source]+g.get('extra_sources',[])
    components=[]
    for row in g['components']:
        i,n,k,desc,*rest=row; conf=rest[0] if rest else 'reported'
        components.append(dict(id=i,name=n,kind=k,quantity=None,quantity_scope='unknown',
          variants=[],properties=['identity','face','owner','quantity'],description=desc,
          source_refs=refs(conf,sid),confidence=conf))
        components[-1].update(g.get('component_overrides',{}).get(i,{}))
    comp_ids=[x['id'] for x in components]
    areas=[]; fields=[]; targets=[]; preserve=[]
    for row in g['areas']:
        i,n,scope,vis,top,ids,anchor=row
        if scope=='public' and vis!='public':scope='shared-secret'
        ids=ids.split(',') if ids else []
        variable=i in g.get('variable_areas','').split(',') or top in ('free','zone','stack')
        area=dict(id=i,name=n,scope=scope,visibility=vis,topology=top,dynamic=variable,
          fixed_slot_count=g.get('fixed_slots',{}).get(i),slot_kinds=[top],component_ids=ids,anchor_contract=anchor,
          description=n+'의 관측 배치를 보관한다. 미확인 위치·방향·수량은 null이며 빈자리와 구별한다.',
          source_refs=[],confidence='recommendation')
        if vis=='role-limited':area['visible_to_roles']=g['area_roles'][i]
        areas.append(area)
        f=dict(id=i+'.scene',label=n,scope=scope,visibility=vis,type='component-scene',
          lifetime=g.get('field_lifetimes',{}).get(i+'.scene','session'),acquisition=['photo','manual','physical'],
          description=anchor+' 각 실물 인스턴스의 종류/소유자/앞뒷면/회전/부착 대상/수량/사진 영역을 독립 보존한다.',
          component_ids=ids,area_ids=[i],rule_ids=[],source_refs=[],confidence='recommendation')
        if vis=='role-limited':f['visible_to_roles']=g['area_roles'][i]
        fields.append(f)
        operations=['add','remove','move','swap','identity','count','note']
        if top in ('hex','grid','graph','free'):operations+=['orientation','attachment']
        if scope=='player' or top in ('hex','graph','free'):operations+=['owner']
        targets.append(dict(id=i+'.edit',scope=scope,component_ids=ids,field_ids=[i+'.scene'],
          area_ids=[i],operations=operations,anchor_strategy=anchor,
          notes=['이동·교환·삭제는 저장 기록 정정이며 실제 턴 수행으로 간주하지 않는다.','한 번의 다중 정정은 하나의 Undo 단위. 원본과 기존 숨은 값은 보존한다.']))
        if top=='stack' or vis!='public':
            p=dict(id=i+'.preserve',label=n+' 보존(선택)',scope=scope,visibility=vis,
              field_ids=[i+'.scene'],method='ordered-bundle' if top=='stack' else 'sealed-bundle',
              order_sensitive=top=='stack',steps=[anchor,'내용을 모르면 펼쳐 확인하지 않고 물리 묶음/소유자와 메모만 남긴다.'],
              after=[],source_refs=[],confidence='recommendation')
            if vis=='role-limited':p['visible_to_roles']=g['area_roles'][i]
            preserve.append(p)
    for row in g['fields']:
        i,n,scope,vis,typ,desc,*rest=row
        a=rest[0].split(',') if rest and rest[0] else []
        f=dict(id=i,label=n,scope=scope,visibility=vis,type=typ,lifetime=g.get('field_lifetimes',{}).get(i,'session'),
          acquisition=['manual'],description=desc,component_ids=[],area_ids=a,rule_ids=[],
          source_refs=[],confidence='recommendation')
        if vis=='role-limited':f['visible_to_roles']=g['field_roles'][i]
        fields.append(f)
    common=[('turn','누구 차례','현재 플레이어/진행자. 모르면 null; 사진으로 차례를 추측하지 않는다.'),
      ('pending','중단한 지점',g['pending']),('note','짧은 메모','원본 상태·하우스룰·정정 사유를 선택적으로 기록한다.')]
    for i,n,d in common:
        fields.append(dict(id=i,label=n,scope='public',visibility='public',type='text',lifetime='session',
          acquisition=['manual'],description=d,component_ids=[],area_ids=[],rule_ids=[],source_refs=[],confidence='recommendation'))
    rules=[]
    for row in g['rules']:
        i,n,summary,conf=row
        if conf=='verified' and source['access']!='opened':conf='reported'
        rules.append(dict(id=i,name=n,kind='procedure',scope='public',summary=summary,
          field_ids=[],component_ids=[],area_ids=[],source_refs=g.get('rule_sources',{}).get(i,refs(conf,sid)),confidence=conf))
    rules.append(dict(id='record-only',name='원상태 보존',kind='constraint',scope='public',
      summary='기록 정정은 실제 게임 행동이 아니다. 불완전·규칙 위반 상태도 저장하며 자동 비용 지불, 점수 확정, 다음 턴 진행을 하지 않는다.',
      field_ids=['turn','pending'],component_ids=[],area_ids=[],source_refs=[],confidence='recommendation'))
    relations=[]
    for row in g.get('relations',[]):
        a,b,d=row
        relations.append(dict(id=a+'.to.'+b,kind='reference',from_area_id=a,to_area_id=b,
          description=d,source_refs=[],confidence='recommendation'))
    spec=dict(schema_version='1.0',game_id=cid,name_ko=cat['name_ko'],name_en=cat['name_en'],
      edition=dict(id='base',name=cat['recommended_edition'],
        compatibility_notes=[cat.get('edition_compatibility_note',''),g['edition_note']],source_refs=[sid],confidence='reported'),
      components=components,layout=dict(areas=areas,relations=relations,
        notes=['좌표/연결은 세션별 실제 판의 기준점으로 등록한다. 확인되지 않은 고정칸 수나 카드별 사전은 생성하지 않는다.',g['layout_note']]),
      state_fields=fields,rules=rules,
      resume=dict(required_field_ids=[],pending_action_fields=['pending'],preserve_procedures=preserve,
        opening_policy='retain-saved-turn',notes=['모름·나중에·그대로 저장을 허용한다. 재열기 시 턴/라운드/카드 방향/숨은 값을 초기화하지 않는다.','lifetime은 값의 적용 범위다. 저장본을 여는 동작만으로 턴/라운드/캠페인 값을 지우지 않는다.',g['resume_note']]),
      recognition_correction=dict(photographable_field_ids=[f['id'] for f in fields if 'photo' in f['acquisition'] and f['visibility']=='public'],
        must_ask_field_ids=[],never_infer=['가려진 구성물의 정체·수량과 덱 순서','소유자 비공개 정보와 사진 밖 상태','이전 행동·자동 점수·승리 확정']+g['never'],
        correction_targets=targets,privacy_policy='owner-scoped'),extensions=[],
      custom_setup=dict(allowed=True,description=g['custom']+' 이는 앱의 기록 허용이며 공식 합법 배치 승인이 아니다.',
        editable_area_ids=[a['id'] for a in areas],editable_component_ids=comp_ids,invariant_rule_ids=['record-only']),
      sources=sources,confidence='reported',gaps=[g['boundary']]+g['gaps']+
        ['전체 카드 효과·판본별 정확한 수량·완전한 규칙 판정은 이 연구명세의 완성 범위가 아니다.',
         '실사진 인식, 정정 UI, 제품 팩 변환 및 저장 재열기 실험은 이 산출물에서 수행하지 않았다.'])
    if 'roles' in g:spec['roles']=g['roles']
    return detailed_catan(spec) if cid=='catan' else spec

def main():
    seeds=[]
    for p in sorted((ROOT/'authoring').glob('batch-*.json')):seeds+=json.loads(p.read_text())
    for p in sorted((ROOT/'authoring').glob('batch-*.txt')):
        current=None
        for line in p.read_text().splitlines():
            if not line or line.startswith('#'):continue
            key,value=line.split('=',1)
            if key=='GAME':
                current=dict(id=value,components=[],areas=[],fields=[],rules=[],relations=[],never=[],gaps=[],examples=[],
                  edition_note='선정 판본을 기준으로 하며 다른 언어/인쇄의 아트·기호·부품 대응은 세션에서 확인한다.',
                  layout_note='고정 좌표 사전은 미작성. 구역 이름과 사진 기준점으로 먼저 복원한다.',
                  resume_note='남은 처리만 선택 메모로 남긴다. 값이 없는 상태도 그대로 연다.',
                  custom='실제로 사용한 배치와 추가 부품을 세션 오버레이로 기록한다.',
                  boundary='기본판만 연구했다. 확장은 기본 game_id에 ID 기반 패치를 더하되 실제 패치는 별도 검증 후 작성한다.')
                seeds.append(current)
            elif key in ('C','A','F','R','L'):
                current[dict(C='components',A='areas',F='fields',R='rules',L='relations')[key]].append(value.split('|'))
            elif key in ('never','gap','example'):
                current[dict(never='never',gap='gaps',example='examples')[key]].append(value)
            elif key in ('roles','area_roles','field_roles','field_lifetimes','extra_sources','rule_sources','component_overrides','fixed_slots'):current[key]=json.loads(value)
            else:current[key]=value
    assert len({s['id'] for s in seeds})==len(seeds),'duplicate seed'
    source_index={}; entries=[]
    for g in seeds:
        s=build(g); (ROOT/'games'/f"{s['game_id']}.json").write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n')
        for src in s['sources']:
            key=src['url'] or src['id']
            if key not in source_index:source_index[key]={'url':src['url'],'uses':[]}
            source_index[key]['uses'].append({'game_id':s['game_id'],**src})
        entries.append(dict(game_id=s['game_id'],name_ko=s['name_ko'],file=f"games/{s['game_id']}.json",
          authoring_status='core-draft-written',verification_status=verification_level(g),
          full_rules_verified=False,
          primary_source={'url':g['url'],'kind':g.get('source_kind','official-product'),'access':g.get('access','search-index'),'evidence':g['evidence']},
          unclear_component_groups=[x['id'] for x in s['components'] if x['confidence']=='unclear'],
          unclear_rule_ids=[x['id'] for x in s['rules'] if x['confidence']=='unclear'],
          source_count=len(s['sources']),component_groups=len(s['components']),areas=len(s['layout']['areas']),
          state_fields=len(s['state_fields']),rules=len(s['rules']),rule_confidence=dict(Counter(r['confidence'] for r in s['rules'])),
          product_tested=False,gaps=s['gaps'],acceptance_examples=g['examples']))
    order={g['game_id']:i for i,g in enumerate(CAT['games'])};entries.sort(key=lambda x:order[x['game_id']])
    missing=[i for i in CATALOG if i not in {e['game_id'] for e in entries}]
    manifest=dict(schema_version='1.0',as_of=DATE,expected_count=len(CATALOG),authored_count=len(entries),
      not_authored_count=len(missing),not_authored_ids=missing,
      status_note='작성 완료 수와 공식 규칙 전체 검증/제품 지원 완료 수는 다르다. 모든 파일은 연구 초안이며 항목별 confidence가 우선한다.',
      verification_counts=dict(Counter(e['verification_status'] for e in entries)),fully_rules_verified_count=0,product_tested_count=0,games=entries)
    (ROOT/'coverage.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'source-index.json').write_text(json.dumps(list(source_index.values()),ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'authored':len(entries),'missing':len(missing),'sources':len(source_index)},ensure_ascii=False))

if __name__=='__main__':main()
