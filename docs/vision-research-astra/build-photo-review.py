"""Scoped human observations; no image download, crop, model call, or redistribution."""
from pathlib import Path
import json,hashlib
OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
raw=(ROOT/'docs/game-photo-corpus/manifest.json').read_bytes()
manifest=json.loads(raw)
images={i['sha256']:i for i in manifest['images']}

def fact(target,field,value,scope='visible-only',note=''):
    return {'target':target,'field':field,'value':value,'basis':'direct-human-visible','scope':scope,'note':note}

rows=[
 {'sha256':'25c3ba99150e52870a9c40f360d0581a191ed1f64cc8344031f951f449584e3f','partitions':['public-or-player-public-UNRESOLVED'],
  'decision':'SCOPED_READOUT_TRIAL','edition_status':'UNKNOWN_PRINTING','capture_instruction':'6장 앞면의 인쇄 패널 근접. 전체 판이나 시장/개인 보유 여부를 판단할 사진은 별도로 필요.',
  'facts':[fact('위 가운데 카드','points',4),fact('위 가운데 카드','bonus','blue'),fact('위 가운데 카드','cost.white',6),fact('위 가운데 카드','cost.blue',3),fact('위 가운데 카드','cost.black',3),fact('아래 가운데 카드','points',2),fact('아래 가운데 카드','bonus','black',note='어두운 직사각형 보석 기호; 실제 색조는 조명으로 갈색에 가까움'),fact('아래 가운데 카드','cost.blue',1),fact('아래 가운데 카드','cost.green',4),fact('아래 가운데 카드','cost.red',2),fact('아래 오른쪽 카드','points',3),fact('아래 오른쪽 카드','cost.red',6)],
  'unknown':['ownerId','market-versus-owned','cardLevel','partial edge objects','unlisted costs: panel completeness not certified','turn/history'],
  'field_mapping':'splendor-v1 points/bonus/cost. 관측되지 않은 비용은 null; 아래가 잘린 카드의 나머지 비용을 0으로 채우지 않는다.'},
 {'sha256':'210fe11683641690c26cdf41070c9b0f6eed1e950a4358a5cf81b06e9d37503f','partitions':['common-public','player-public-unassigned'],
  'decision':'LAYOUT_AND_ABSTENTION_TRIAL','edition_status':'UNKNOWN_PRINTING','capture_instruction':'중앙 시장 전체와 참가자별 공개 보유를 분리해서 확대. 같은 촬영 상태의 근접 원본은 아직 없음.',
  'facts':[fact('중앙과 테이블 가장자리','regions','공용 시장·더미와 여러 공개 보유 영역이 한 사진에 보임')],
  'unknown':['owners','all card costs','occluded card identities','stack quantities','same-state link to other Splendor photos'],
  'field_mapping':'전체 사진은 범위·앞뒷면·가림 관측용. 작은 숫자의 정답을 근접 사진에서 가져와 채우지 않는다.'},
 {'sha256':'26bad7b14b6e865768aeff5c77e54867db56fec9e33c8f7ba932a3e3ee430efc','partitions':['common-public','owner-private-unassigned'],
  'decision':'MIXED_SCOPE_AND_EDITION_CHALLENGE','edition_status':'SUPER_RUMMY_NOT_CONFIRMED_RUMMIKUB','capture_instruction':'원본 전체를 쓸 경우 본인 영역으로만 시험. 공용 시험에는 rack 앞면이 없는 별도 입력이 필요.',
  'facts':[fact('rack 위 왼쪽','tile.number',13,'owner-private'),fact('rack 위 왼쪽','observedColor','blue','owner-private'),fact('rack 위 오른쪽','tile.number',13,'owner-private'),fact('rack 위 오른쪽','observedColor','black','owner-private'),fact('rack 아래 왼쪽부터','visible-number-sequence',[11,3,3,8],'owner-private'),fact('rack 아래 왼쪽부터','visible-color-sequence',['black','yellow','blue','red'],'owner-private')],
  'unknown':['owner identity','official product/edition equivalence','joker represented value','initial meld completed','pool quantity'],
  'field_mapping':'공식 native 색상 enum의 orange에 관측 yellow를 강제 대응하지 않는다. 숫자·가시색의 별도 관측으로만 사용.'},
 {'sha256':'08942c1046b3e366e67e07e2b3ed3ef98a0fd116321af09504bfea1979c27bc8','partitions':['common-public'],
  'decision':'NATIVE_PARTIAL_BOARD_TRIAL','edition_status':'OLDER_ART_PLASTIC_PIECES_EXACT_PRINTING_UNKNOWN','capture_instruction':'섬과 테두리의 전체 배치 후보. 작은 항구 비율·겹친 길/건물은 근접 추가 필요.',
  'facts':[fact('판 위 부품','observed-colors',['red','blue','white','orange']),fact('판','visible-structure','육각 지형·숫자 토큰·도로·건물·바다 테두리')],
  'unknown':['all harbor ratios and complete nine-port coverage','player identities','current player','resource/development hands','edition matching CN3081'],
  'field_mapping':'ComponentScene layers terrain+number+piece; 사진에서 빠진 항구/길은 기본 배치로 메우지 않는다.'},
 {'sha256':'cd106e18acaffcfe87d7ecba85451ec3ed9941933b32363edb75b4b2990766de','partitions':['common-public'],
  'decision':'PARTIAL_SPATIAL_AND_POSTURE_TRIAL','edition_status':'RIVER_MODULE_VISIBLE_EXACT_PRINTING_UNKNOWN','capture_instruction':'부분 지도. 타일 접합·길/도시·말 자세를 확인하되 전체 필드 연결과 점수판은 사진 밖.',
  'facts':[fact('지도','visible-module','river'),fact('아래 가운데 초록 말','posture','lying'),fact('지도 위 다른 말','visible-posture','standing')],
  'unknown':['whole-map topology','scoreboard','owner identities','completed feature score','exact River/base printing'],
  'field_mapping':'followers.posture/observedColor 관측 가능. attachedTo/gridX/gridY/feature connectivity는 수동 확인. River 포함을 기본판 전용 사진이라고 표기하지 않는다.'},
 {'sha256':'bc7259b0968cc2efd9fab73f9e14994f57c1b81677bae169fad7cc9fa864d6f3','partitions':['owner-private-unassigned','player-public-unassigned','common-public'],
  'decision':'ORDER_AND_MIXED_SCOPE_TRIAL','edition_status':'Oink_SCOUT_EXACT_PRINTING_UNKNOWN_ACCESSORY_TRAYS','capture_instruction':'앞면 손패는 본인 구획. 토큰/테이블은 별도 공용 사진 권고. 손패를 숫자순으로 정렬하지 않는다.',
  'facts':[fact('맨 앞 카드 주황 끝','printedNumber',9,'owner-private'),fact('같은 카드 파랑 끝','printedNumber',3,'owner-private'),fact('오른쪽 따로 놓인 별 토큰','visible-nominal-values',[5,10,10,2],'player-public-unassigned')],
  'unknown':['activeEnd','complete ordered hand','occluded bottom numbers','token owner','round/turn','manual serial'],
  'field_mapping':'topNumber/bottomNumber는 카드 인쇄 방향을 먼저 정해야 매핑. 여기서는 두 끝의 값만 GT이며 activeEnd/handPosition은 자동 추론하지 않는다.'},
 {'sha256':'8ed0ebe465eb7679298947eaab1d26c9adba4a3cba6fc6a5c1dc93aea09fbda4','partitions':['player-public-unassigned','owner-private-unassigned'],
  'decision':'EDITION_AND_GRID_READOUT_TRIAL','edition_status':'INFERRED_REMASTERED_COMPATIBLE_PRINTED_OBJECTIVE_NOT_EXACT_PRINTING','capture_instruction':'창문은 공개 개인보유, 왼쪽 Green Focus는 비공개 목표. 전체 원본은 본인 범위로만 사용. 공용에는 목표를 포함하지 않은 별도 입력 필요.',
  'facts':[fact('창문','rows',4),fact('창문','columns',5),fact('창문 전체','visible-dice-count',19),fact('창문 위에서2행 왼쪽에서5열','occupancy','empty'),fact('2행2열','dieValue',4),fact('2행2열','observedColor','yellow'),fact('2행3열','dieValue',6),fact('2행3열','observedColor','green'),fact('2행4열','dieValue',5),fact('왼쪽 목표','printedName','GREEN FOCUS','owner-private'),fact('왼쪽 목표','printed-effect-paraphrase','창문의 초록 주사위마다 3점','owner-private'),fact('창문 왼쪽 투명 돌','visible-count',2)],
  'unknown':['player identity','round/turn','tools/public objectives outside photo','covered window constraints','exact manufacturing print','canonical die colors under lighting'],
  'field_mapping':'dice.dieValue/dieColor는 보이는 것만. cell은 수동 attr; GT의 행/열은 인간이 정한 창문 기준이며 모델 crop xy를 cell로 변환한 것이 아님. cards에는 효과값 필드가 없어 원본 근거를 유지.',
  'official_comparison':{'source_id':'official.sagrada.remastered.20261023','old_rule':'SA01 p4: 지정색 눈 합계','new_rule':'SA201 PDF p6/printed p5: 지정색 주사위마다 3점, 눈 무관','result':'사진 인쇄와 SA201의 제한된 조항 일치; 전체 신판 인증 아님'}}
]
for row in rows:
    src=images[row['sha256']]
    assert hashlib.sha256(Path(src['localPath']).read_bytes()).hexdigest()==row['sha256']
    row.update({'game_id':src['gameId'],'source_page':src['pageUrl'],'direct_image_url':src['imageUrl'],'uploader':src.get('uploader'),
                'license':src['license'],'source_accessed_at':src.get('accessedAt'),'source_capture_date':None,'source_publication_date':None,
                'date_note':'접근일은 촬영/게시일이 아니다. 제공 메타데이터에 검증된 사진 날짜 없음.',
                'dimensions':{'width':src['width'],'height':src['height']},'reviewed_at':'2026-10-23',
                'review_method':'Direct view_image of authorized public corpus original, local SHA checked. No model call.',
                'same_static_state_with_other_images':'UNKNOWN','owner_binding':'UNKNOWN; do not infer from position, hand, or color',
                'accuracy_test_executed':False})
out={'version':'0.1-research','corpus_manifest_path':'docs/game-photo-corpus/manifest.json',
     'corpus_snapshot_sha256':hashlib.sha256(raw).hexdigest(),'corpus_snapshot_image_count':len(manifest['images']),
     'reviewed_images':len(rows),'reviewed_games':len({r['game_id'] for r in rows}),
     'scope':'7 originals reviewed directly. Corpus found/usable labels are not edition or accuracy approval. Originals are not copied into this report.',
     'real_model_calls':0,'rows':rows}
(OUT/'photo-review.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
availability={'snapshot_sha256':out['corpus_snapshot_sha256'],'checked_at':'2026-10-23',
 'note':'실제 manifest images 행만 집계. 생산자의 found/usable은 사진 직접 검토나 판본·정확도 인증이 아니다.',
 'games':{gid:{'provided_image_rows':sum(i['gameId']==gid for i in manifest['images']),
                'producer_usable_yes_rows':sum(i['gameId']==gid and i.get('usable')=='yes' for i in manifest['images']),
                'directly_reviewed_sha256':[r['sha256'] for r in rows if r['game_id']==gid]}
          for gid in manifest['games']}}
index_path=ROOT/'docs/game-photo-corpus/index.json'
if index_path.exists():
    index_raw=index_path.read_bytes();index=json.loads(index_raw)
    assert len(index)==120 and len({g['gameId'] for g in index})==120
    availability.update({'index_path':'docs/game-photo-corpus/index.json','index_sha256':hashlib.sha256(index_raw).hexdigest(),
      'availability_basis':'final collector selected index; metadata read only, not new image review',
      'index_selected_images':sum(len(g['selected']) for g in index),
      'retained_images_reported':sum(g['retainedCount'] for g in index),
      'producer_status_counts':{s:sum(g['status']==s for g in index) for s in sorted({g['status'] for g in index})},
      'note':'사진 확보 상태만 최종 index에서 갱신. found/partial 및 개인영역 표시는 생산자 관측이며 게임의 공식 공개범위·판본·GT 확정이 아니다. 직접 검토7장·실험3장은 확대하지 않음.'})
    availability['games']={g['gameId']:{'provided_image_rows':len(g['selected']),
        'producer_usable_yes_rows':sum(i.get('usable')=='yes' for i in g['selected']),
        'candidate_image_rows':g['candidateCount'],'retained_image_rows':g['retainedCount'],
        'producer_status':g['status'],'producer_edition_match':g.get('editionMatch','unverified'),
        'producer_ground_truth_validated':g.get('groundTruthValidated',False),
        'selected_sha256':[i['sha256'] for i in g['selected']],
        'directly_reviewed_sha256':[r['sha256'] for r in rows if r['game_id']==g['gameId']]}
        for g in index}
(OUT/'corpus-availability.json').write_text(json.dumps(availability,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:out[k] for k in ['reviewed_images','reviewed_games','real_model_calls']},ensure_ascii=False))
