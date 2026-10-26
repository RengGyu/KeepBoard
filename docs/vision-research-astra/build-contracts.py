"""Reproducible research extraction. Writes only beside this script; never edits product data."""
from pathlib import Path
import csv, hashlib, json, collections

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
INPUTS={}
def read(rel):
    p=ROOT/rel
    raw=p.read_bytes()
    INPUTS[str(p.relative_to(ROOT))]={'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
    return json.loads(raw)
def save(name,value):
    p=OUT/name;p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
catalog=read('docs/research/initial-supported-games/catalog.json')['games']
packs={p['runtime']['source']['gameId']:p for p in read('gamepacks/generated/game-essentials.json')}
runtime={r['game_id']:r for r in json.loads((OUT/'runtime-audit.json').read_text())['games']}
readouts={}
for path in sorted((ROOT/'shared/readouts/catalogs').glob('*.json')):readouts.update(read(str(path.relative_to(ROOT))))
boards={b['gameId']:b for b in read('public/game-art/boards/mapping.json')['games']}
inherited_art=read('docs/art-confirmation/source-manifest.json')['sources']
inherited_rules=read('docs/game-essentials/evidence.json')['sources']
checks=json.loads((OUT/'checked-evidence.json').read_text()) if (OUT/'checked-evidence.json').exists() else {'sources':[]}
photos=json.loads((OUT/'corpus-availability.json').read_text()) if (OUT/'corpus-availability.json').exists() else {'games':{}}
visuals=json.loads((OUT/'visual-reviews.json').read_text()) if (OUT/'visual-reviews.json').exists() else {'games':{}}
focus={x['game_id']:x for x in csv.DictReader((OUT/'game-focus.tsv').open(),delimiter='\t')}
assert len(catalog)==len({g['game_id'] for g in catalog})==120
assert set(focus)==set(packs)==set(runtime)=={g['game_id'] for g in catalog}

native={
 'catan':{'schema':'ComponentScene v1/v2','source_file':'shared/scene.ts','visible_attributes':['kind','variant','number','quantity','harbor.ratio','harbor.direction','evidenceId','region','coverageByLayer'],
          'manual_or_bounded_geometry':'19 hex/54 vertex/72 edge native topology; 관측 가능한 자리만. 색과 player ID 관계는 사용자 확인. 사막·도둑·항구를 기본 맵으로 자동 채우지 않는다.'},
 'rummikub':{'schema':'rummikub-scene-v1','source_file':'shared/rummikub.ts','visible_attributes':['kind','color','number','face','evidenceIds','region'],
             'manual_or_bounded_geometry':'공용 groups/loose와 owner rack; 같은 색/숫자 복제 타일 ID·순서 유지. 조커가 대체하는 색/숫자는 정체 관측과 별개 확인.'},
 'splendor':{'schema':'splendor-v1','source_file':'shared/splendor.ts','visible_attributes':['kind','points','bonus','cost','requirements','color','level'],
            'manual_or_bounded_geometry':'outer quantity는 실물 수. 카드 비용·귀족 요구·보너스·토큰은 독립. 인쇄되지 않은 레벨/총점/소유자 추정 금지.'}}

schema_specific={
 'wingspan':[('PRINTED-PANEL','birds의 현재 typed 필드는 face/printedName/habitat(manual)/cardArea(manual)뿐. 인쇄 먹이 비용·점수·둥지·알 한도는 없으므로 원본 카드 전체 crop을 반드시 유지. 구조화하려면 별도 선택 필드와 source 근거 필요.')],
 'seven-wonders':[('PRINTED-PANEL','age-cards의 ageLabel/cardColor만으로 비용·효과/과학·군사·점수 아이콘을 대신할 수 없음. 본판 카드 전체 crop 및 향후 인쇄 패널 필드 권고.')],
 'terraforming-mars':[('PRINTED-PANEL','cards의 cardType/printedName만으로 비용/태그/인쇄 효과·토큰 부착을 모두 표현하지 못함. cubes의 nominalValue는 manual; 금속색으로 숫자 자동 확정 금지.')],
 'ark-nova':[('PRINTED-PANEL','cards는 이름/종류 위주. 비용·아이콘·요구조건을 읽었다고 주장하려면 해당 판본 카드 근접 및 필드 추가 필요.')],
 'carcassonne':[('FEATURE-GRAPH','features는 이름/점과 attachedTo 참조를 지원하지만 도로/도시/들판의 변별 연결 그래프 전체가 아니다. 농부 영역·인접 연결을 자동 판정하지 않기.')],
 'seti':[('LAYER-ROTATION','현재 xy+90도 회전만으로 동심층별 회전과 탐사선의 부모 층/구역 관계를 복원할 수 없다. 사진+rotationState/parentSpace 수동 확인 유지.')],
 'akropolis':[('HEIGHT','typed height는 manual이나 그림판은 평면. 겹친 타일 층·높이는 명시 값/측면 사진 없이 복원 보증 불가.')],
 'descent-legends-dark':[('HEIGHT-APP','layer manual 값을 실제 다층 장면과 구별해서 표시. 외부 앱의 시나리오 상태는 KeepBoard 사진 재열기와 별개.')],
 'hanabi':[('OWN-HIDDEN','typed cards.suit/number가 있어도 hand.scene는 physical-only. 공용 불꽃/버림에만 관측 허용; owner 촬영을 새로 열지 않는다.')],
 'codenames':[('ROLE-BOUNDARY','key visiblePattern 양식 존재는 촬영 권한이 아니다. key.scene physical-only 유지; 단어 공개판과 별도.')],
 'calico':[('VISIBILITY-UNCLEAR','현재 hand는 owner지만 대기 패치의 의무 공개성 규칙은 기존 source-recovery에서도 미확정. 앱 보수적 owner 보관을 공식 비밀 규칙이라 부르지 않기.')],
 'ticket-to-ride':[('EDITION','구판/2025판 시작 티켓 수 차이 확인됨. 현재 범용 base ID만으로 어느 규칙·아트인지 결정하지 말고 촬영판 인쇄/판본 확인.')],
 'gloomhaven':[('EDITION','현재 원명세의 판본/로컬 2025 자료와 실사진 판본 일치 확인 필요. 1판 사진을 2판 효과/정체 사전으로 해석 금지.')],
 'hansa-teutonica':[('OFFICIAL-CONFLICT','기존 source-recovery의 영문 Bank 표기 충돌 보류 유지. 사진의 인쇄값과 규칙 요약을 구별.')],
 'sagrada':[('EDITION','SA01 Second Printing 개인 목표는 지정색 눈 합계, SA201 Remastered PDF p6/printed5는 지정색 주사위마다3점. corpus8ed0...의Green Focus는 신판 조항과 맞지만 정확 인쇄판은 미확인. 원판/신판의 목표·아트를 같은 것으로 인증하지 않는다.')]
}
sources={};games=[];rows=[];photo_needs=[]
for cat in catalog:
 gid=cat['game_id'];rel=f'docs/research/game-specs-120/games/{gid}.json';spec=read(rel);pack=packs[gid];rt=runtime[gid];ro=readouts.get(gid);board=boards.get(gid)
 digest=INPUTS[rel]['sha256'];assert digest==pack['runtime']['source']['sha256']
 if ro:assert (ro['sourceSHA'],ro['editionId'],ro['packVersion'])==(digest,spec['edition']['id'],pack['version'])
 inherited=[]
 for s in spec['sources']:
    sid=gid+'::'+s['id'];sources[sid]={'id':sid,'game_id':gid,'origin':'pinned-spec-source-metadata','metadata_checked_this_task':True,'content_rechecked_this_task':False,**s}
    sources[sid]['id']=sid
    inherited.append(sid)
 matched_art=[s for s in inherited_art if any(u['game_id']==gid for u in s.get('uses',[]))]
 matched_rules=[s for s in inherited_rules if s.get('game_id')==gid]
 for source in matched_art+matched_rules:
    sid='inherited::'+source['id'];sources[sid]={'id':sid,'origin':'previous-scoped-official-research','content_rechecked_this_task':False,'prior_evidence':source}
    if sid not in inherited:inherited.append(sid)
 scoped=[s['id'] for s in checks['sources'] if gid in s.get('game_ids',[]) and s.get('status')=='VERIFIED_SCOPED']
 components=[]
 for component in spec['components']:
    detail=next((c for c in (ro or {}).get('components',[]) if c['id']==component['id']),None)
    components.append({'component_id':component['id'],'name':component['name'],'kind':component['kind'],'identity_description':component['description'],
      'inventory_quantity':component['quantity'],'inventory_quantity_is_not_observed_quantity':True,
      'spec_confidence':component['confidence'],'spec_source_refs':[gid+'::'+s for s in component.get('source_refs',[])],
      'current_typed_fields':detail['fields'] if detail else [],
      'must_preserve_readout_keys':[f['id'] for f in detail['fields']] if detail else [],
      'visible_attribute_keys':[f['id'] for f in detail['fields'] if f['acquisition']=='visible'] if detail else [],
      'manual_attribute_keys':[f['id'] for f in detail['fields'] if f['acquisition']=='manual'] if detail else [],
      'mandatory_value_policy':'키를 유지하되 값 입력은 강제하지 않는다. 안 읽히는 값/basis는 null. 전체 패널을 확인하지 않은 0/false/빈 배열은 금지.',
      'art_identity_policy':'illustration variant is not printed commercial subtype; fresh AI variant=null; crop+legible text is the identity evidence'})
 partitions={k:[] for k in ['common_public','player_public','owner_private','do_not_infer']};areas=[]
 for area in spec['layout']['areas']:
    scope,vis=area['scope'],area['visibility']
    part='common_public' if scope=='public' and vis=='public' else 'player_public' if scope=='player' and vis=='public' else 'owner_private' if scope=='player' and vis=='owner' else 'do_not_infer'
    fields=[f for f in spec['state_fields'] if area['id'] in f.get('area_ids',[])]
    bindings=[b for b in pack['runtime']['fieldBindings'] if area['id'] in b['areaIds']]
    eligible=[b for b in bindings if b['key'] in {b['key'] for b in rt['collectable_bindings']}]
    keys={f['key'] for f in rt['public_photo_fields'] if part=='common_public'} if part=='common_public' else {f['key'] for f in rt['owner_photo_fields']} if part=='owner_private' else set()
    actual=[b['key'] for b in bindings if b['key'] in keys]
    if rt['mode']=='native':actual=[f['key'] for f in (rt['owner_photo_fields'] if part=='owner_private' else rt['public_photo_fields']) if any(b['key']==f['key'] for b in bindings)] if part!='do_not_infer' else []
    if rt['mode']=='assisted' and part=='player_public' and eligible:actual=['__photo.public']
    target=[b['key'] for b in bindings if b['editor'] not in ['physical-only','opaque-preserve']]
    a={**area,'partition':part,'capture_allowed_current':bool(actual),'current_ai_destination_fields':actual,
       'current_manual_target_fields':target,'source_field_ids':[f['id'] for f in fields],
       'allowed_component_ids':area['component_ids'] if part!='do_not_infer' else [],
       'owner_binding':'explicit user/roster binding only; no seat/color inference',
       'capture_instruction': ('내용 촬영 제외. 뒤집거나 펼치지 말고 원래 순서/방향의 실물 묶음을 보존.' if part=='do_not_infer' else
        area['name']+' 전체 경계를 먼저 기록. '+area['anchor_contract']+' 작은 인쇄/겹침은 같은 멈춘 상태에서 가까이 촬영; 읽히지 않으면 null.'),
       'capture_access': 'public evidence, unassigned tray; explicit owner selection later' if part=='player_public' else 'owner evidence, this owner only; public holdings in same photo remain private tray' if part=='owner_private' else 'public evidence' if part=='common_public' else 'physical-preserve-only',
       'evidence_contract':{'original_id_required':True,'original_region':'normalized crop in this source only; not game coordinates','same_static_state_required':True,'multi_view_same_object':'manual evidence link or joint read; never count similar copies as one'},
       'display_resume':{'source_anchor':area['anchor_contract'],'source_relations':[r for r in spec['layout']['relations'] if area['id'] in json.dumps(r)],'opening_policy':'retain-saved-turn','restore':'saved accepted/manual values and source photo; absent/stale/failed analysis does not clear existing values','render_basis':'native' if rt['mode']=='native' else 'manual record surface; original photo retains unrepresented geometry'},
       'official_rule_status':'REPORTED_PINNED_SPEC; independent checked evidence is scoped separately'}
    areas.append(a);partitions[part].append(area['id'])
 gaps=[{'id':code,'status':'RECOMMENDATION_OR_EXPLICIT_LIMIT','detail':detail} for code,detail in schema_specific.get(gid,[])]
 if rt['mode']!='native':
    gaps.append({'id':'PARTITION-EVIDENCE','status':'VERIFIED_CODE_GAP','detail':'Evidence에 public/player+owner+captureEpoch는 있으나 area/region별 공개범위·staticStateId·여러 원본의 동일 실물 연결은 없다. 현재 촬영 전에 공개/owner를 분리하고 수동 연결을 유지한다.'})
    if any(a['topology']=='hex' for a in areas):gaps.append({'id':'HEX-ORIENTATION','status':'VERIFIED_CODE_GAP','detail':'GenericPlacement.rotation은0/90/180/270만 지원한다. 실제60도 회전/육각 연결 재현과 다르다. 원본과 수동 방향을 남기고 필요한 게임에만60도·칸/부모 대응을 추가한다.'})
    if any(a['topology']=='graph' for a in areas):gaps.append({'id':'GRAPH-RELATION','status':'VERIFIED_CODE_GAP','detail':'평면xy는 연결/방향/가림을 자동 표현하지 않는다. 원본의 변/방/노선ID와 수동 메모를 유지한다.'})
    if any(a['topology']=='stack' and a['visibility']=='public' for a in areas):gaps.append({'id':'STACK-ORDER','status':'RECOMMENDATION','detail':'공개 더미라도 안 보이는 내부는 확정하지 않는다. 순서가 의미 있는 묶음은 원래 위/아래와 실물 보존을 유지한다.'})
 photo=photos['games'].get(gid,{});reviewed=photo.get('directly_reviewed_sha256',[])
 pneed={'game_id':gid,'edition':spec['edition']['name'],'status':'DIRECT_REVIEWED_PARTIAL' if reviewed else 'PROVIDED_NOT_REVIEWED' if photo.get('provided_image_rows') else 'NOT_PROVIDED_IN_SNAPSHOT','corpus_availability':photo,'same_state_multiview':'UNKNOWN','first_capture':focus[gid]['capture_focus'],
        'closeups':[{'area_id':a['id'],'name':a['name'],'needs':a['anchor_contract'],'access':a['capture_access']} for a in areas if a['partition']!='do_not_infer'],
        'do_not_collect':[{'area_id':a['id'],'name':a['name'],'reason':a['visibility']} for a in areas if a['partition']=='do_not_infer'],
        'edition_evidence_needed':'박스/규칙 인쇄판 또는 원 게시물의 판본 설명; 사진 게시일≠판본/촬영일',
        'no_photo_fallback':'contract/manual inspection only; no real-photo accuracy claim'}
 photo_needs.append(pneed)
 game={'contract_version':'0.1-research','game_id':gid,'name_ko':spec['name_ko'],'name_en':spec['name_en'],'edition':spec['edition'],
       'pinned_source':{'path':rel,'sha256':digest,'runtime_pack_id':pack['id'],'runtime_pack_version':pack['version'],'runtime_match':True},
       'basis':{'contract':'RECOMMENDATION','current_code_mapping':'VERIFIED_CODE_ONLY','readout_source_verification':ro['sourceVerification'] if ro else 'native-or-specialized','official_scoped_checks_this_task':scoped,'inherited_evidence_ids':inherited,'whole_game_rules_verified':False,'real_photo_accuracy_verified':False},
       'capture_focus':focus[gid]['capture_focus'],'critical_resume_distinction':focus[gid]['resume_distinction'],
       'partitions':partitions,'areas':areas,'components':components,'native_or_special_readout':native.get(gid),
       'runtime_capture_contract':{'mode':rt['mode'],'public_photo_fields':rt['public_photo_fields'],'owner_photo_fields':rt['owner_photo_fields'],'excluded_bindings':rt['excluded_bindings']},
       'manual_context_fields':[{'id':f['id'],'label':f['label'],'scope':f['scope'],'visibility':f['visibility'],'description':f['description']} for f in spec['state_fields'] if 'photo' not in f['acquisition']],
       'never_infer':spec['recognition_correction']['never_infer']+['소유자 신원/새로운 차례 이력은 crop·색·자리만으로 채우지 않는다.','미관측·가려진 실물은0/빈자리/완료로 바꾸지 않는다.'],
       'preservation':spec['resume'],'source_rule_gaps':spec['gaps'],'schema_gaps':gaps,'photo_need':pneed,
       'current_board_mapping':board,'visual_review':visuals['games'].get(gid,{'status':'INSUFFICIENT_EVIDENCE','reason':'현재 mapping과 code만 확인; worker 최종 render/contactsheet 전달 전. 중립판 정확 실물 재현 주장 금지.'})}
 save('games/'+gid+'.json',game);games.append(game)
 rows.append({'game_id':gid,'name_ko':spec['name_ko'],'edition':spec['edition']['name'],'source_sha256':digest,
      **{k:'; '.join(a['name'] for a in areas if a['partition']==k) for k in partitions},
      'capture_focus':focus[gid]['capture_focus'],'resume_distinction':focus[gid]['resume_distinction'],
      'current_schema':(ro or {}).get('schema',native.get(gid,{}).get('schema')),
      'source_status':(ro or {}).get('sourceVerification','native-or-specialized'),'official_checks_this_task':'; '.join(scoped),'photo_status':pneed['status'],'visual_review':game['visual_review']['status'],'real_photo_accuracy':'UNTESTED'})
for s in checks['sources']:sources[s['id']]=s
save('sources.json',{'note':'Metadata inheritance ≠ reopened source, scoped check ≠ full game verification. Official links/edition/section stored per record.','sources':list(sources.values())})
save('photo-requirements.json',{'game_count':120,'games':photo_needs})
with (OUT/'coverage.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
parts=collections.Counter(a['partition'] for g in games for a in g['areas'])
manifest={'as_of':'2026-10-23','contract_count':len(games),'exact_catalog_ids':True,'runtime_source_sha_matches':120,'typed_readouts':len(readouts),'native_games':['catan','rummikub'],'specialized_generic':['splendor'],
 'partition_area_counts':dict(parts),'components':sum(len(g['components']) for g in games),'typed_attribute_count':sum(len(c['current_typed_fields']) for g in games for c in g['components']),
 'official_scoped_checked_games':sum(bool(g['basis']['official_scoped_checks_this_task']) for g in games),'full_rules_verified_games':0,'real_photo_accuracy_verified_games':0,'direct_photo_review_games':sum(bool(g['photo_need']['corpus_availability'].get('directly_reviewed_sha256')) for g in games),'direct_photo_review_images':sum(len(g['photo_need']['corpus_availability'].get('directly_reviewed_sha256',[])) for g in games),'worker_final_reviews':{'sol1':'CODE_REVIEW_COMPLETE_NO_MUST_FIX_FOUND','sol2':visuals.get('review_status','PENDING')},
 'art_rule_evidence':'Existing local source metadata inherited, not all reopened. Current readout official-partial2/attachment-only115 retained.',
 'files':[{'game_id':g['game_id'],'path':'games/'+g['game_id']+'.json','sha256':hashlib.sha256((OUT/'games'/f"{g['game_id']}.json").read_bytes()).hexdigest()} for g in games]}
save('manifest.json',manifest);save('input-hashes.json',INPUTS)
text=['# 120게임 촬영 구획·복원 구분','', '앱 계약의 제안이며 실사진 정확도 인증이 아니다. ID별 JSON에는 원명세 SHA, 판본, 모든 영역/부품/현재 typed key와 공식 확인 범위를 담았다. 공개 개인보유의 주인 자동 추론은 하지 않는다.','', '|게임 / ID|먼저 찍을 구획|재개 때 구별할 내용|','|---|---|---|']
for g in games:text.append(f"|[{g['name_ko']} · {g['game_id']}](games/{g['game_id']}.json)|{g['capture_focus']}|{g['critical_resume_distinction']}|")
(OUT/'coverage.md').write_text('\n'.join(text)+'\n')
print(json.dumps({k:v for k,v in manifest.items() if k!='files'},ensure_ascii=False))
