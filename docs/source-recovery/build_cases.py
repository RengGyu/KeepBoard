#!/usr/bin/env python3
"""Rebuild the research-only 50-item ledger from frozen inputs and reviewed notes.
No network; writes only beside this script. Classifications are research judgments,
not edits to the upstream manifest or newly verified game rules.
"""
import collections
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]
MANIFEST = 'docs/game-essentials/manifest.json'
REVIEW = 'docs/game-state-review/games.json'
manifest = json.loads((PROJECT / MANIFEST).read_text())
review = json.loads((PROJECT / REVIEW).read_text())
review_map = {g['game_id']: (i, g) for i, g in enumerate(review['rows'])}

CATEGORIES = {
    'access_recovery': '접근·전달 형식 복구가 먼저',
    'source_not_located': '필요한 상세 원문을 아직 확보하지 않음',
    'edition_identity': '판본 식별·동등성 대조가 먼저',
    'clause_not_reviewed': '해당 규칙 조항 미대조',
    'spec_interpretation': '기존 명세의 표현·공개 범위 해석',
    'source_conflict': '공식 자료 내부 충돌',
    'product_boundary': '사진·앱의 지원 경계',
    'stale_tracking': '보완 이력과 미확정 추적표 불일치',
}

# key | primary | additional causes | observed basis | next bounded action | field ids
NOTES = '''
a-feast-for-odin:01|clause_not_reviewed||규칙 검색 본문을 읽은 범위에 시작 표식 전달 조항이 없고, finding도 라운드 이동 미대조라고 명시한다.|기존 공식 기본판 PDF의 라운드 종료/시작 표식 절만 확인한다.|turn
a-feast-for-odin:02|clause_not_reviewed||무기 카드 보유의 공개성 조항을 확인한 기록이 없다. 접근 차단 기록은 없다.|무기 카드 보관·사용 절의 공개/비공개 표현을 확인하고 보유와 사용 후 상태를 구분한다.|
arcs:01|access_recovery|clause_not_reviewed|공식 How to Play는 열렸지만 Rules Library가 JavaScript 안내만 반환했다. 보호 차단 여부는 기록되지 않았다.|공식 라이브러리의 정상 브라우저 렌더 또는 원출판사 공개 PDF 링크 1개를 확보해 Court setup만 확인한다.|
ark-nova:01|clause_not_reviewed||상품 소개가 근거이며 뽑기/버림 설치 절은 아직 대조하지 않았다. 접근 실패 증거는 없다.|공식 규칙 Setup의 zoo-card draw/discard 구역과 공개면을 확인한다.|
avalon:01|edition_identity|spec_interpretation,clause_not_reviewed|선택은 원 Avalon 기본판이나 근거는 Big Box 소개다. known-information은 owner로 존재하므로 정보 자체의 완전 누락은 아니다.|원 기본판 역할 구성과 밤의 공개 대상을 먼저 맞춘다. 역할별 예외를 대조하기 전 evil 전체 자동 공유를 만들지 않는다.|known-information,role.scene
azul:01|spec_interpretation|clause_not_reviewed|bag.scene 설명에 주머니와 상자 뚜껑이 함께 있다. 필드명 부재가 아니라 visibility 상속 범위의 문제다.|공식 라운드 정리/리필 절에서 뚜껑의 면·열람 권리를 확인한 뒤 주머니와 분리할 필요를 판정한다.|bag.scene
brass-birmingham:01|spec_interpretation|clause_not_reviewed|deck.scene에 뽑기와 사용 카드가 묶여 있다. 공개 버림이라는 원 finding의 규칙 근거는 아직 별도 확인이 필요하다.|공식 카드 사용·버림 절 대조 후 공개 버림/숨은 뽑기 묶음의 경계를 좁혀 제안한다.|deck.scene
brass-birmingham:02|clause_not_reviewed||현재 money는 public이고 보유 현금 공개 조항은 미대조다. 돈 필드가 없다는 문제가 아니다.|공식 money/information 절에서 현금과 이번 라운드 지출의 공개 범위를 각각 확인한다.|money
calico:01|clause_not_reviewed|format_recovery|기존 상품 소개만으로 손 타일 공개 관례를 확정하지 않았다. 이번 공식 PDF는 이미지형이며 열람과 조항 판정을 분리했다.|대표 C03 참조. 손 2장/시장 3장은 확인했으나 의무 공개는 보류한다.|hand.scene
castles-burgundy:01|edition_identity|clause_not_reviewed|선택은 Special Edition 기본 모드, 인용은 Ravensburger PDF이며 판본 대응이 미확정이라고 명세가 명시한다.|Special Edition 기본판 공식 규칙의 단계별 goods setup과 기존 PDF를 조항별 대조한다. 포함 확장은 비활성으로 둔다.|
castles-mad-ludwig:01|clause_not_reviewed|edition_identity|cash는 owner로 있고, 현행2판과 구판의 공개성 차이를 미대조했다고 명시한다.|현행2판 인쇄/언어를 고른 뒤 돈 보관·공개 조항만 찾는다. 없으면 owner가 공식 규칙이라는 주장은 보류한다.|cash,private.scene
concordia:01|clause_not_reviewed||공식 규칙의 구성물/상품은 이미 scoped 대조했으나 돈 공개 범위는 그 확인 범위 밖이다.|기존 공식 규칙 링크의 money/information 문구부터 확인한다. Venus를 원 기본판에 대입하지 않는다.|money
davinci-code:01|source_not_located|format_recovery,clause_not_reviewed|공식 한국 상품은 이미지/영상 중심이며 상세 규칙 텍스트를 확보하지 못했다. 403 등 차단 기록은 없다.|상품의 정상 설명서/규칙 영상·이미지로 기본판 제품코드를 확인한다. 두 경로로도 해당 조항이 없으면 소장 규칙의 관련 면을 요청 목록에 남긴다.|
descent-legends-dark:01|product_boundary||명세가 외부 앱 저장 의존을 이미 적고 있다. 공개 룰북 확보만으로 앱 내부 세이브를 사진에서 만들 수는 없다.|external-save 참조·원 앱 저장 유지 안내로 한정하고 앱 이식/복원 검증은 별도 제품 과제로 분리한다.|external-save
dobble:01|product_boundary|format_recovery|실시간 순간 복원 보장 불가라는 명세상의 지원 경계다. PDF 텍스트 추출 실패 기록은 별개다.|선택 미니게임·중단 합의·실물 묶음만 기록한다. 추가 검색을 반응 순간 재현의 해결책으로 제시하지 않는다.|
dune-imperium-uprising:03|clause_not_reviewed|spec_interpretation|로컬 공식 Uprising 규칙은 확보했고 음모 정체 비공개는 대조했다. 장수 공개 의무까지 검증된 것은 아니다.|기존 PDF의 Intrigue 절/공식 FAQ에서 내용과 장수의 공개를 분리해 확인한다.|intrigue
eclipse-second-dawn:01|spec_interpretation|clause_not_reviewed|galaxy.scene는 public이며 각 실물의 앞뒷면을 표현한다. 공개된 위치와 숨은 면의 정체가 같은 공개 범위인지가 쟁점이다.|기존 로컬 Second Dawn 규칙의 Explore/Discovery 절을 대조하고 위치·면·정체를 나눈다.|galaxy.scene
expeditions:01|clause_not_reviewed||상품 소개의 카드/운석 설명만 확인했고 공급 더미 설치·보충 절은 미대조다.|공식 base setup/refresh의 공급·버림·제외 더미를 구분해 실제 누락만 제안한다.|
five-tribes:01|clause_not_reviewed|access_history|상품 직접 열기의 timeout 기록은 있지만 공개성 조항 자체는 조사하지 않았다. 현재 차단으로 단정할 수 없다.|공식 기본판 규칙/FAQ에서 자원 카드와 점수 역할의 동전을 따로 대조한다. 판본별 카드 교체도 확인한다.|private.scene
forest-shuffle:01|clause_not_reviewed||cave-count는 owner로 존재한다. 동굴 내용과 장수의 열람 권리를 확인하지 않았다.|원 Forest Shuffle 동굴 조항/공식 FAQ만 확인한다. Dartmoor 규칙은 쓰지 않는다.|cave-count
galaxy-trucker:01|product_boundary||2021판 실시간 조립과 타이머 동기화는 현재 제품의 지원 경계다.|조립 중단 시점·합의된 남은 시간과 선박 사진을 별도로 저장하는 권고로 남긴다. 규칙 확인을 타이머 복원 구현으로 오인하지 않는다.|
halligalli:01|product_boundary||실시간 반응의 순간 재현 한계를 명세가 이미 적었다.|반응 직후 결과가 합의된 안정 상태만 기록하도록 안내한다. 승자/반응 순서를 사진에서 추정하지 않는다.|
hansa-teutonica:01|clause_not_reviewed|spec_interpretation|기존 bonus.scene는 public이며 설치/보유/사용 표식 설명만 있다. 공급의 뒷면 정체는 미분리다.|대표 C04의 공식 p3 setup 근거로 숨은 공급 묶음과 공개 사용/보유를 분리하는 보완안을 인계한다.|bonus.scene
hansa-teutonica:02|source_conflict|edition_identity|기존에는 PDF 추출 수치 충돌로 기록했다. 이번 인쇄면 검수에서도 영어 p2와 p3/p4가 다르다.|대표 C04 참조. 독문/영문 도형은 3/5/7/C를 지지하지만 영문 오탈자라는 최종 확정·강제 enum은 보류한다.|skills.scene
istanbul:01|clause_not_reviewed|access_history|초기 PDF 크기 제한 뒤 공식 기본판 관련 페이지를 art-confirmation에서 읽었다. 돈 공개 조항은 그 범위 밖이다.|이미 확보한 공식 규칙의 기본판 정보 공개 절부터 읽는다. Big Box 확장 규칙을 기본판 돈 규칙으로 삼지 않는다.|
journeys-middle-earth:01|product_boundary||외부 앱 저장 의존과 앱 이식 미지원이 기존 명세에 있다.|원 앱 캠페인/저장 슬롯 참조만 유지한다. 룰북 추가 수집으로 앱 저장 포맷을 확보했다고 주장하지 않는다.|external-save
kanban-ev:01|clause_not_reviewed||상품 구성의 목표 카드는 확인했지만 개인 목표 공개 조건은 미대조다.|Kanban EV 공식 규칙에서 목표의 종류·보유/공개 시점을 확인한다. 기존 Kanban 판을 대체 근거로 자동 사용하지 않는다.|private.scene
lost-cities:01|access_recovery|edition_identity,clause_not_reviewed|선택 카드게임의 CDN 리디렉션 실패가 기록됐다. HTTP 코드/보호 차단 여부는 확인되지 않는다.|Thames & Kosmos의 동일 카드게임 제품코드 또는 KOSMOS 공식 규칙 배포를 최대 두 경로로 확인한다. 동명 보드게임은 제외한다.|
mage-knight:01|edition_identity|clause_not_reviewed|확보된 Ultimate 자료와 선택 원 기본판 모드가 다르다. 자료가 전혀 없는 접근 장애가 아니다.|기존 Ultimate 본문에서 기본 지도/토큰의 적용 범위를 표시하고 원 기본 규칙과 적 공개 조건만 대조한다. 구분 불가 절은 보류한다.|map-area.scene
mansions-madness-2:01|product_boundary||2판 외부 앱 저장 의존이 기존 명세에 명시된다. 실물 규칙 PDF 확보와 앱 내부 상태 확보는 다르다.|원 앱 시나리오/세이브 참조만 유지하고 앱 저장 이식은 별도 범위로 둔다.|external-save
monopoly:01|clause_not_reviewed||Hasbro G0009 공식 구성/카드 순환은 읽었지만 현금 열람 조항은 검증하지 않았다.|기존 공식 G0009 규칙의 현금 공개 문구부터 확인하고 하우스 룰을 공식 사실로 올리지 않는다.|
nemesis:01|spec_interpretation|clause_not_reviewed|ship.scene는 public이고 앞뒷면 저장을 포함한다. 방의 위치 공개와 미탐험 방 정체 공개는 별개다.|원 Nemesis setup/exploration에서 각 토큰의 공개 시점만 확인하고 공개 위치/숨은 정체 표현으로 제안한다.|ship.scene
pandemic:01|spec_interpretation|clause_not_reviewed|decks.scene에 여러 더미를 묶어 hidden을 붙였다. 감염 버림이 이미 설명에 있으므로 구성물 누락이라고 다시 만들면 중복된다.|공식 setup/infection/discard 절을 확인한 뒤 감염 뽑기·감염 버림·플레이어 더미의 공개 범위를 분리한다.|decks.scene
power-grid:01|access_recovery|clause_not_reviewed|Rio 공식 배포의 크기 제한/HTTP403이 이전 보고에 있다. 이번에는 2F 공식 Recharged 대체 배포를 정상 확보했다.|대표 C01: p4/5 순서 트랙의 현재 순서·처리 완료 행을 보존하는 선택 필드안을 인계한다.|turn,auction
power-grid:02|access_recovery|clause_not_reviewed|Rio 접근 문제와 함께 발전소 더미 조항이 미대조였다. market.scene는 시장 두 줄 위주다.|대표 C01: p3 숨은 더미와 최초 Step3 위치를 확인. 현재 저장 시점의 정확한 순서는 펼쳐 알아내지 않고 물리 묶음으로 보존한다.|market.scene
power-grid:03|access_recovery|clause_not_reviewed|wallet.scene는 owner다. 접근 복구 뒤에도 확인한 PDF 범위에서 현금 공개 의무의 명문을 찾지 못했다.|대표 C01: 현금 공개 조항은 별도 보류한다. 공식 관련 FAQ 또는 정확한 해당 판 설명서 문구가 생길 때만 재개한다.|wallet.scene
root:01|clause_not_reviewed|spec_interpretation|Law of Root의 다른 절은 읽었으나 손패 장수를 물으면 알려야 한다는 조항은 검증하지 않았다.|기존 선택판 Law의 공개정보/손패 절만 확인한다. 소유자 장면의 수량 보존과 상대에게 공개할 의무를 구별한다.|
rummikub:01|clause_not_reviewed|spec_interpretation|rack.scene에 수량 보존이 있으므로 장수 저장 자체가 완전히 불가능하지 않다. 공개 장수라는 규칙 주장이 미검증이다.|기존 Classic106 공식 PDF와 FAQ에서 상대 장수 열람 권리를 확인하기 전 public 필드 강제 추가를 보류한다.|rack.scene
rummikub:03|spec_interpretation|clause_not_reviewed|pool.scene가 이미 있고 실물 인스턴스의 수량을 보존한다고 적혀 있다. 별도 count 필드 부재만으로 풀 누락을 확정할 수 없다.|현재 quantity로 미상/알려진 수를 표현 가능한지 후속 구현자가 확인한다. 총수를 강제 세거나 숨은 타일을 뒤집지 않는다.|pool.scene
sagrada:01|clause_not_reviewed|edition_identity|원 기본판 주머니 설치 절을 아직 대조하지 않았고 Remastered 자동 호환도 검증되지 않았다.|원 기본판으로 한정한 공식 setup의 bag/draw 절을 확인한다. Remastered 공급 차이는 별도 항목으로 둔다.|
sagrada:02|edition_identity||원판 기준 명세에 Remastered/Deluxe 미대조가 명시돼 있다. 최신 상품이 원판과 같다는 보증은 없다.|처음 지원할 인쇄/판본을 명시적으로 선택하고 표지·구성/개인 공급·도구 단계만 대조한다.|
scythe:01|clause_not_reviewed||상품 소개에서 조우/공장 카드는 확인했으나 숨은 공급 설치와 순서는 미대조다.|공식 base setup의 encounter/factory 구역을 읽고 뽑기·선택후잔여·제외 더미를 구별한다.|
six-nimmt:01|clause_not_reviewed||penalty.scene owner를 그룹 선택으로 두었고 벌점 더미 열람 조항은 검증하지 않았다.|AMIGO 원 기본판 벌점 더미 절을 확인한다. 대회·온라인 관행을 원 기본판 공개 의무로 대체하지 않는다.|penalty.scene
stone-age:01|stale_tracking|spec_interpretation|동결 manifest changes에 starting-player 추가가 있고 실제 필드와 공식 p4 근거도 있다. 동일 finding만 UNCLEAR로 남았다.|대표 C05: 새 필드를 만들지 않고 finding 종료 근거 묶음만 후속 검토자에게 인계한다.|starting-player,round-phase,turn
through-the-ages:01|access_recovery|clause_not_reviewed,spec_interpretation|Code of Laws URL이 상품 페이지로 바뀌어 검색 색인만 읽은 기록이다. 민간/군사 정보 공개 차이는 아직 추정이다.|CGE의 선택 신판 공식 규칙 라이브러리에서 현행 직접 PDF를 찾고 두 손패의 내용/장수/뒷면을 각각 확인한다.|hand.scene
ticket-to-ride:01|edition_identity|clause_not_reviewed,spec_interpretation|북미 기본판만 선택돼 있고 인쇄가 미지정이다. 현행2025와 공식 Old Rules의 초기 티켓 수가 실제로 다르다.|대표 C02: 판본을 먼저 묶고 공개 장수 의무는 별도 보류. 저장 중인 손패를 초기 배분 수로 교정하지 않는다.|hand.scene,decks.scene
voidfall:01|clause_not_reviewed|access_history|초기 PDF 크기 제한 뒤 official art-confirmation에서 관련 기본 자료 일부를 열었다. 카드 선택/의제 공개는 그 범위 밖이다.|이미 확보한 최종 규칙의 Focus/Agenda 공개 시점만 대조한다. 개발일지·경쟁/협력 모드를 섞지 않는다.|
war-of-the-ring-2:01|access_recovery|clause_not_reviewed|Ares 공식 상품/다운로드403이 이전 기록에 있다. 이번 연구에서 같은 차단 경로를 재시도하지 않았다.|Ares 정상 규칙 라이브러리나 권한 있는 현지 출판사2판 PDF를 최대 두 경로로 찾는다. 없으면 소장2판 사냥 풀 설치/추가 절을 요청 목록에 남긴다.|
war-of-the-ring-2:02|access_recovery|clause_not_reviewed|이전 Ares403과 함께 양 진영 사건 덱 설치 절이 미대조다. 1→2판 변경 문서는 기본판 전문의 대체물이 아니다.|같은2판 기본 규칙의 사건 카드 setup만 확인한다. Card Game·1판·확장 덱을 섞지 않는다.|
wyrmspan:01|clause_not_reviewed||공식 자원/FAQ를 scoped 대조했지만 용·동굴 카드 공급 설치는 미대조다.|기존 공식 규칙의 용/동굴 setup과 refill 절을 읽고 공개 offer와 숨은 덱을 분리한다.|
'''

notes = {}
for line in NOTES.strip().splitlines():
    key, primary, secondary, basis, action, fields = line.split('|')
    notes[key] = dict(primary_cause=primary, secondary_causes=secondary.split(',') if secondary else [],
                      classification_basis=basis, next_action=action,
                      relevant_field_ids=fields.split(',') if fields else [])

access_history = {
    'power-grid': ('REPORTED_ORIGIN_403_AND_TOOL_SIZE_LIMIT', 'docs/game-essentials/remaining.md:7'),
    'war-of-the-ring-2': ('REPORTED_ORIGIN_403', 'docs/game-essentials/remaining.md:8'),
    'lost-cities': ('REPORTED_REDIRECT_FAILURE_HTTP_UNKNOWN', 'sources:lost-cities.primary'),
    'arcs': ('REPORTED_JS_ONLY_RESPONSE_NOT_AUTH_DENIAL', 'sources:arcs.primary'),
    'through-the-ages': ('REPORTED_REDIRECT_TO_PRODUCT_NOT_RULES', 'sources:through-the-ages.primary'),
    'five-tribes': ('REPORTED_PRODUCT_TIMEOUT', 'sources:five-tribes.primary'),
    'istanbul': ('REPORTED_SIZE_LIMIT_LATER_SCOPED_RULES_AVAILABLE', 'sources:istanbul.primary + istanbul.art-confirmation.istanbul-rules'),
    'voidfall': ('REPORTED_SIZE_LIMIT_LATER_SCOPED_RULES_AVAILABLE', 'sources:voidfall.primary + voidfall.art-confirmation.voidfall-primary'),
    'dobble': ('REPORTED_PDF_OPENED_NO_EXTRACTED_TEXT', 'sources:dobble.primary'),
    'stone-age': ('REPORTED_SHELL_FAILURE_WEB_CLAUSE_ALREADY_READ', 'docs/game-essentials/evidence.json#/sources/17'),
}

case_map = {'power-grid':'C01','ticket-to-ride':'C02','calico':'C03','hansa-teutonica':'C04','stone-age':'C05'}
ready = {'power-grid:01','power-grid:02','hansa-teutonica:01','stone-age:01'}
items=[]
for gi,g in enumerate(manifest['games']):
    spec=json.loads((PROJECT / g['spec_path']).read_text())
    ri,rg=review_map[g['game_id']]
    for fi,f in enumerate(g.get('review_findings',[])):
        if f['result'] != 'UNCLEAR': continue
        key=f"{g['game_id']}:{fi+1:02d}"
        n=notes.pop(key)
        assert all(rg['findings'][fi][k]==f[k] for k in ['item','type','evidence','importance']), key
        refs=[f"{MANIFEST}#/games/{gi}/review_findings/{fi}",f"{REVIEW}#/rows/{ri}/findings/{fi}",g['spec_path']+'#/sources',g['spec_path']+'#/gaps']
        fields=[]
        for field_id in n['relevant_field_ids']:
            matches=[(i,v) for i,v in enumerate(spec['state_fields']) if v['id']==field_id]
            if matches:
                i,v=matches[0]
                fields.append({'id':field_id,'json_pointer':f"/state_fields/{i}",'visibility':v.get('visibility'),'description':v.get('description')})
            else:
                fields.append({'id':field_id,'note':'관련 개념 표기. 동일 ID의 필드는 없음; 새 필드가 필요하다는 결론은 아님.'})
        history=access_history.get(g['game_id'],('NO_SPECIFIC_ACCESS_FAILURE_RECORDED','상세 조항 미대조를 차단으로 해석하지 않음'))
        result='NOT_RETESTED'
        route='RESEARCH_NOW'
        if g['game_id'] in case_map:
            result='SCOPED_HANDOFF_READY' if key in ready else 'HOLD_AFTER_SCOPED_REVIEW'
            route='HANDOFF_NOW' if key in ready else 'HUMAN_OR_NEW_PRIMARY_EVIDENCE'
        elif n['primary_cause']=='product_boundary': route='PRODUCT_BOUNDARY_HOLD'
        items.append({'item_id':f"{g['game_id']}:review:{fi+1:02d}",'upstream_item_id':None,
                      'game_id':g['game_id'],'original_ordinal':fi+1,'name':g['name'],
                      'item':f['item'],'item_sha256':hashlib.sha256(f['item'].encode()).hexdigest(),
                      'original_status':f['result'],'original_evidence':f['evidence'],'original_type':f['type'],
                      'original_needed':f['needed'],'input_refs':refs,
                      'selected_edition':spec['edition'],**n,'existing_fields':fields,
                      'existing_access_record':{'state':history[0],'basis':history[1],'label':'REPORTED_FROM_FROZEN_INPUT'},
                      'representative_case_id':case_map.get(g['game_id']),
                      'research_result':result,'next_route':route,
                      'source_metadata':[s for s in spec['sources'] if s['id']!='essentials.storage-guidance'],
                      'upstream_changed':False})
assert len(items)==50 and not notes,(len(items),notes.keys())

cases=json.loads((ROOT/'representative-cases.json').read_text())
counts=dict(collections.Counter(i['primary_cause'] for i in items))
out={'as_of':'2026-10-22','purpose':'동결 자료를 변경하지 않는 근거 복구 조사',
     'identity_policy':'원 입력에 itemID가 없으므로 game_id:review:원 finding 1-based순번을 새 추적ID로 부여. JSON pointer·원문·해시도 보존.',
     'classification_policy':'주원인은 가장 먼저 할 후속 행동을 정한 연구 판단이며 게임 규칙의 사실 검증 등급이 아니다. 보조 원인은 중복 가능. 최초 분류와 대표사례 조사 결과를 별도 유지.',
     'counts':{'items':len(items),'games':len(set(i['game_id'] for i in items)),
               'original_evidence':dict(collections.Counter(i['original_evidence'] for i in items)),
               'primary_causes':counts,'primary_total':sum(counts.values()),
               'historical_origin_403_items':5,'current_origin_403_retested':0,
               'representative_cases':len(cases),'representative_items':8,'scoped_handoff_ready_items':4,
               'hold_after_scoped_review_items':4,'not_retested_items':42},
     'cause_labels':CATEGORIES,'items':items,'representative_cases':cases,
     'full_50_rule_verification':False,'upstream_manifest_modified':False,'product_modified_by_this_task':False}
(ROOT/'cases.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
with (ROOT/'classification.csv').open('w',encoding='utf-8-sig',newline='') as file:
    columns=['item_id','game_id','name','item','original_evidence','primary_cause','secondary_causes','classification_basis','next_action','research_result','next_route']
    w=csv.DictWriter(file,fieldnames=columns);w.writeheader()
    for i in items:
        row={k:i[k] for k in columns};row['secondary_causes']=';'.join(i['secondary_causes']);w.writerow(row)
print(json.dumps(out['counts'],ensure_ascii=False,indent=2))
