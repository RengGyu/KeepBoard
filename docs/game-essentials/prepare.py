"""Author explicit evidence decisions; no product imports, user data or network."""
import json,pathlib
P=pathlib.Path('docs/game-essentials'); decisions=[]
urls={}
for fn in ['docs/art-confirmation/downloads.json','docs/art-confirmation/downloads-follow.json','docs/art-confirmation/downloads-last.json']:
 for x in json.load(open(fn)):urls[x['id']]=x['url']
for x in json.load(open('docs/art-confirmation/source-manifest.json'))['sources']:
 if x.get('local_path'):urls[pathlib.Path(x['local_path']).stem]=x['url']
long={x['id']:x for x in json.load(open('docs/research/long-games/manifest.json'))['sources']}
def game(id,file,title,location,fact,url=None,edition=None):
 path='docs/art-confirmation/sources/'+file+'.txt'
 if not pathlib.Path(path).exists():path='docs/game-essentials/sources/'+file+'.txt'
 d=dict(game_id=id,source=dict(id=id+'.essentials.rules',title=title,url=url or urls.get(file),local_text=path if pathlib.Path(path).exists() else None,location=location,edition=edition,checked_at='2026-10-22',confirmed_facts=fact,interpretation='게임 사실만 VERIFIED. 봉인·포장·메모·추가 기록 구조는 앱 보존 권고이며 공식 저장 규칙이 아니다.'),add_fields=[],amend_fields=[],rules=[])
 decisions.append(d);return d
def add(d,id,label,description,type='text',scope='public',visibility='public',lifetime='session',confidence='verified'):
 d['add_fields'].append(dict(id=id,label=label,description=description,type=type,scope=scope,visibility=visibility,lifetime=lifetime,confidence=confidence))
def amend(d,id,text):d['amend_fields'].append(dict(id=id,append=text))
def rule(d,id,name,summary,fields):d['rules'].append(dict(id=id,name=name,summary=summary,field_ids=fields))
d=game('agricola','agricola-rules','Agricola Revised Edition English Rules ©2016','PDF pp.3 Action Space Cards; p.6 Work Phase; p.12 Starting Player','회의장으로 선 플레이어가 바뀌며 자동 순환하지 않는다. 행동 카드는 단계별로 쌓인 숨은 무작위 순서다.',edition='2016 Revised 기본판')
add(d,'starting-player','선 플레이어 표식 보유자','현재 표식 보유자와 실제 시계방향 좌석 순서를 기록. 현재 행동 중인 turn과 다음 라운드 시작자는 별개다. 모르면 비워 둔다.','json')
add(d,'round-deck.scene','미공개 라운드 행동 카드','단계별 미공개 행동 카드의 실물 묶음과 위/아래 및 단계 경계 보존. 내용 확인을 위해 펼치지 않는다. 이미 공개된 행동은 actions.scene에 둔다.','component-scene','shared-secret','hidden')
rule(d,'essentials.starting-player','선 플레이어 유지','Meeting Place로 바뀐 실제 선 플레이어를 유지하며 재열기만으로 다음 사람에게 넘기지 않는다.',['starting-player','turn'])
d=game('anachrony','anachrony-primary','Anachrony Essential Edition English Rulebook','PDF pp.5–6 Setup; pp.10–11 Action/Clean-up; p.14 World Council','선 플레이어 배너는 해당 World Council 행동으로 교체하며 다음 시대에도 유지된다. Recruit/Mine pool 카드는 별도 뒷면 덱이다.',edition='Essential Edition')
add(d,'starting-player','선 플레이어 배너','현재 배너 보유자와 시계방향 좌석 순서. 시대가 바뀌어도 World Council로 바뀐 실제 보유자를 유지.','json')
add(d,'pool-decks.scene','모집·채광 풀 덱','Recruit와 Mine pool 미공개 덱을 각각 별도 묶음으로, 현재 공개된 풀 카드와 구분한다. 위/아래와 보관 위치를 기록하고 내부 순서는 펼치지 않고 유지.','component-scene','shared-secret','hidden')
d=game('barrage','barrage-rules','Barrage Core English Rulebook','PDF p.12 Actions; p.21 End of Round','행동 순서는 Energy Track의 순서 표식을 따른다. 라운드 종료 때 에너지 생산량 역순, 동률은 이전 순서를 뒤집는다.',edition='기본판')
add(d,'turn-order','차례 순서 트랙','회사별 순서 표식의 실제 배열을 기록. 현재 라운드 에너지량과 이전 배열을 사진으로 임의 재계산해 덮어쓰지 않는다. 라운드 종료 처리 중이면 변경 전/후와 완료 여부를 pending에 남긴다.','json')
rule(d,'essentials.turn-order','순서 갱신 중단점','라운드 종료 순서 갱신은 명시적 실제 처리 기록이다. 열기만으로 에너지 0/새 순서로 초기화하지 않는다.',['turn-order','energy','pending'])
d=game('caverna','caverna-rules','Caverna The Cave Farmers English Rules','PDF p.2 Setup; pp.9–10 Harvest; p.22 Starting Player','시작 플레이어 표식은 해당 행동 없이 자동 이동하지 않는다. 라운드6–12 수확 표식은 미공개 배치되며 공개된 물음표 누적이 수확에 영향을 준다.',url='https://www.lookout-spiele.de/upload/en_caverna.html_Rules_Caverna_EN.pdf',edition='기본판 1–7인')
add(d,'starting-player','시작 플레이어 표식','현재 표식 보유자와 시계방향 좌석 순서. 라운드 종료만으로 넘기지 않는다.','json')
add(d,'harvest-markers.scene','미공개 수확 표식','라운드 칸별 뒷면 수확 표식을 정체 미상으로 위치/앞뒤만 기록. 공개된 표식과 물음표 누적은 round의 공개 메모에 구분. 내부 면을 보려고 뒤집지 않는다.','component-scene','shared-secret','hidden')
amend(d,'round','이미 공개된 수확 물음표 횟수와 이번 수확의 진행/선택한 하위 단계도 구분한다. 미공개 미래 표식은 harvest-markers.scene으로 분리한다.')
d=game('stone-age','stone-age-rules','Stone Age English Rulebook — publisher-linked 2023/06 file','PDF p.4 Game overview/rounds; p.5 Tools','라운드마다 시작 표식을 왼쪽으로 넘기며 배치/회수 해결/먹이 단계가 구별된다. 도구는 사용 뒤90도 돌려 라운드당 사용 상태를 표시한다.',url='https://www.hans-im-glueck.de/wp-content/uploads/2023/06/stone_age_rules.pdf',edition='공식 현재 기본판 English PDF; 웹 본문으로 열람')
# PDF unavailable locally but full official web text directly inspected, record link only.
d['source']['local_text']=None
add(d,'starting-player','시작 플레이어 표식','현재 표식 보유자와 시계방향 좌석 순서. turn과 별도이며 재개로 표식을 넘기지 않는다.','json')
add(d,'round-phase','라운드 처리 단계','일꾼 배치/일꾼 회수와 행동 해결/먹이 지급 중 실제 중단 단계. 현재 해결자와 이미 회수한 일꾼을 유지한다.')
amend(d,'tools','각 도구의90도 사용 표시를 저장하고 재개 시 준비 상태로 되돌리지 않는다.')
d=game('terraforming-mars','terraforming-mars-rules','Terraforming Mars English Base Rulebook TMRULESFINAL','PDF p.7 Setup; p.8 Player Order/Research; p.11 Blue card actions','세대마다 선 플레이어가 시계방향으로 이동한다. 프로젝트 뽑기/버림은 별개이고 연구 때 버린 것은 뒷면이다. 파란 카드 행동은 세대당 사용 표식이 남는다.',url='https://fryxgames.se/wp-content/uploads/2023/04/TMRULESFINAL.pdf',edition='기본판 English; 확장 제외')
add(d,'starting-player','세대 선 플레이어','현재 선 플레이어와 좌석 순서. generation의 패스 상태와 별개. 세대 전환 처리 여부를 기록하고 재열기만으로 이동하지 않는다.','json')
add(d,'project-decks.scene','프로젝트 뽑기·뒷면 버림','프로젝트 뽑기와 뒷면 버림을 별도 묶음으로 보존. 손패와 합치지 않고, 위/아래·묶음ID·보관 위치만으로 내용 미상도 저장.','component-scene','shared-secret','hidden')
add(d,'generation-action-use','세대당 행동 사용 표식','파란 카드/기업의 행동 능력별 이번 세대 사용 여부. 카드/기업 ID와 실제 표식에 연결하고 단순 재개 시 제거하지 않는다.','json')
d=game('dominant-species','dominant-species-primary','Dominant Species Rules of Play ©2010 GMT','PDF p.4 Cards/Tiles Setup; p.20 Reset','지배 카드 뽑기 더미는 Ice Age가 아래이며 공개 진열과 구별한다. 미래 지형은 별도3더미다.',edition='원작 기본판 ©2010')
add(d,'dominance-deck.scene','미공개 지배 카드 덱','공개 cards.scene과 별도인 지배 카드 뽑기 더미. Ice Age가 아래였던 실물 순서를 보존하고 섞거나 펼쳐 검사하지 않는다.','component-scene','shared-secret','hidden')
add(d,'terrain-stacks.scene','미공개 지형 더미','미래 지형3더미별 위/아래와 실제 경계를 유지. 이미 공개된 각 더미의 맨 위 타일은 공용 기록, 아래 정체는 숨김.','component-scene','shared-secret','hidden')
d=game('le-havre','le-havre-2016-rules','Le Havre 2016 English Rules','PDF p.2 Special Buildings/Shortened Version; p.3 Building Proposals; p.5 Personal Supply','정규 full game은 특수건물6장을 뒷면으로 준비하나 shortened는 사용하지 않는다. 일반건물 제안은 공개 순서이며 개인 상품/프랑은 가리지 않는다.',edition='2016 기본판 full/shortened 구분')
add(d,'game-length-mode','Full/Shortened 모드','사용 중인 full/shortened 및 인원별 라운드 배열. 선택을 모르면 비워 두고 특수건물 존재를 강제로 추론하지 않는다.')
add(d,'special-buildings.scene','미공개 특수건물 묶음','Full game에서 사용하는 미공개 특수건물 덱. 공개 건물 제안 더미/이미 지어진 건물과 분리. Shortened 미사용이면 없음으로 기록.','component-scene','shared-secret','hidden')
d=game('arkham-lcg','arkham-lcg-2026-rules','Arkham Horror The Card Game 2026 AHC100 Rulebook','PDF pp.4–5 Scenario Decks/Lead Investigator; p.7 Chaos Bag; p.20 Campaign Setup; pp.17–18 Mythos','막/의제/조우가 독립 덱이며 선임 조사자가 선택/플레이어 순서를 정한다. 캠페인 재개는 이전 시나리오 완료 때 혼돈 주머니 구성을 사용한다.',edition='2026 Chapter Two AHC100')
add(d,'lead-investigator','선임 조사자','선임 조사자 ID와 플레이어 순서. 현재 행동 조사자와 구별한다.')
add(d,'chaos-bag','혼돈 주머니 구성·실물 보존','시나리오/캠페인에 적용 중인 난이도와 확인된 토큰 다중집합 또는 봉인 묶음 참조. 이미 뽑아 해결 중인 토큰은 test에 따로 기록. 모르는 구성은 열거나 수량을 가정하지 않는다.','json',confidence='recommendation')
add(d,'scenario-progress','막·의제·파멸 진행','현재 공개 막/의제 카드 ID·면·놓인 단서와 파멸, 다른 카드 위 파멸의 부착 대상, 진행 처리 여부를 기록. 미공개 다음 면은 읽지 않는다.','json')
d=game('terra-mystica','terra-mystica-rules','Terra Mystica English Rules 3rd Capstone file','PDF p.9 Actions; p.14 Passing','처음 패스한 플레이어가 다음 라운드 시작 표식을 가진다. 행동은 시계방향이며 패스자와 아직 행동 중인 플레이어를 구별한다.',edition='기본판; 공식 Capstone 3rd English 규칙 파일')
add(d,'starting-player','다음 라운드 시작 표식','실제 표식 보유자와 좌석 순서. 첫 패스가 발생하기 전/후를 round와 구별하여 현재 turn을 덮어쓰지 않는다.','json')
d=game('seti','seti-rules','SETI Search for Extraterrestrial Intelligence English Rules','PDF pp.6–7 Starting Player; p.19 Passing/New Round','시작 표식은 새 라운드에 왼쪽으로 이동. 첫 패스자의 태양계 회전 여부와 라운드 종료 카드 선택 보류가 별도 중단 상태다.',edition='기본판')
add(d,'starting-player','라운드 시작 플레이어','현재 시작 표식 보유자와 좌석 순서; 실제 라운드 전환 이후에만 갱신.','json')
amend(d,'phase','이번 라운드 첫 패스에 따른 회전을 이미 처리했는지와 라운드 종료 카드 선택이 아직 보류인지도 기록. 패스만으로 모두 완료됐다고 추정하지 않는다.')
d=game('res-arcana','res-arcana-rules','Res Arcana English Rules 2020-10-03','PDF pp.6–7 Actions/Pass; p.12 Summary','처음 패스한 사람이 시작 플레이어 표식을 얻고 각자 패스 때 아이템 교체와 카드 뽑기를 처리한다.',edition='기본판 2020 규칙 파일')
add(d,'starting-player','시작 플레이어 표식','현재 표식 보유자. 현재 행동자와 구분하고 라운드 최초 패스 여부와 함께 보존.','text')
amend(d,'pending','패스 처리 중이면 시작 표식 획득/아이템 교체/1장 뽑기 중 완료한 단계와 남은 단계만 기록한다.')
d=game('marvel-champions','marvel-rules','Marvel Champions Core Learn to Play','PDF p.4 Select First Player; pp.9–10 Player Order; pp.14–17 Villain Phase','플레이어 단계와 빌런 단계가 구별되고 빌런 단계 마지막에 시작 표식을 시계방향으로 넘긴다.',edition='Core Set; ©2019 Learn to Play')
add(d,'first-player','첫 플레이어 표식','현재 표식 보유자와 시계방향 순서. 현재 해결 플레이어와 구분. 단순 재열기로 넘기지 않는다.','json')
add(d,'round-phase','플레이어·빌런 단계','현재 단계와 빌런 활성화 대상/이미 처리한 대상. 뒷면으로 지급된 부스트·조우 카드를 해당 대상과 연결하고 공개 전 정체를 노출하지 않는다.','json')
d=game('twilight-imperium-4','twilight-imperium-4-ltp','Twilight Imperium Fourth Edition Learn to Play 2020 filename','PDF p.7 Setup 13; p.11 Status Phase; p.7 shuffled decks','단계 I/II 목표는 뒷면 두 줄의 슬롯에서 차례로 공개하며 행동/의제 덱은 독립 더미다.',url=long['ti4-learn']['source_url'],edition='4판 기본판; 2020 filename, 2026 업로드경로는 개정 아님')
d['source']['local_pdf']=long['ti4-learn']['local_path']
add(d,'future-objectives.scene','미공개 공용 목표 줄','단계 I/II의 미공개 목표를 줄/슬롯과 공개 순서로 보존. 공개된 목표는 agenda.scene, 남은 정체는 미상으로 유지.','component-scene','shared-secret','hidden')
add(d,'common-decks.scene','행동·의제 공용 덱','행동 카드/의제 뽑기 더미를 각각 분리하고 위/아래와 이미 처리한 버림을 섞지 않는다. 카드 효과로 알려진 위/아래 정보도 공개범위에 맞춰 유지.','component-scene','shared-secret','hidden')
d=game('spirit-island','spirit-island-rules','Spirit Island CORE Rulebook','PDF p.6 Setup; p.9 Invader Fear; p.12 Fear and Terror','획득한 공포 카드는 뒷면으로 모았다가 획득 순서대로 해결한다. 침략 덱은 단계별 구역을 갖는다.',url=long['spirit-rules']['source_url'],edition='기본 CORE; 정확 인쇄 미상')
d['source']['local_pdf']=long['spirit-rules']['local_path']
add(d,'earned-fear.scene','아직 해결 전 획득 공포','획득한 공포의 뒷면 묶음과 획득 순서를 별도 보존. 공개 공포 버림과 합치지 않는다. 내용 확인 없이 개수/위아래/보관 위치만 기록 가능.','component-scene','shared-secret','hidden')
amend(d,'invaders.scene','공개 침략 행동 슬롯과 공포 버림을 기록하되, 획득했지만 아직 공개하지 않은 공포 정체는 earned-fear.scene으로 분리한다.')
d=game('seven-wonders-duel','seven-wonders-duel-rules','7 Wonders Duel English US Rules official Repos download','PDF p.10 Discard; p.17 Mausoleum/Great Library','버림은 뒷면이지만 자유 열람 가능하며 Mausoleum 대상이다. 설치 때 제외된 카드는 버림이 아니며 제외 진보는 Great Library 대상이다.',url='https://cdn.svc.asmodee.net/production-rprod/storage/downloads/games/7wonders-duel/en/7du-rules-us-15990558193s5I6.pdf',edition='기본판 US English')
add(d,'discard.scene','시작 후 버린 카드','설치 때 제외된 카드와 구분한 열람 가능한 버림 더미. 뒷면 물리 상태와 공개 접근 범위를 혼동하지 않는다. Mausoleum 선택 중인 카드는 pending에 기록.','component-scene')
add(d,'removed-progress.scene','설치 때 제외된 진보','Great Library가 뽑는 미선택 진보 토큰을 시장의 남은 진보와 별도 실물 묶음으로 유지. 정체를 확인하려고 펼치지 않는다.','component-scene','shared-secret','hidden')
d=game('rummikub','rummikub-rules','Rummikub Classic 2600 English Rules D-2600-1236-0041 120819','PDF pp.1–3 Pool/Manipulation/Joker; p.4 Incomplete Runs','턴 내 재배열이 끝나지 않으면 기존 테이블 배치로 되돌리는 절차가 있다. 조커 회수 후 같은 턴 재사용과 최초등록 여부가 중요하다.',url='https://rummikub.com/wp-content/uploads/2019/12/2600-English.pdf',edition='Classic106타일4받침대 부분; XP/Mini XP160타일 제외')
add(d,'manipulation-baseline','재배열 전 테이블 참조(선택)','재배열 도중 중단한 경우에만 재배열 전 사진/묶음별 타일순서 참조, 받침대에서 낸 타일과 임시 분리 타일, 남은 조커 재사용 여부를 남긴다. 과거 상태가 없으면 모름으로 저장하며 복원값을 생성하지 않는다.','json',confidence='recommendation')
amend(d,'pending','재배열 중이라면 현재 장면과 재배열 전 참조(manipulation-baseline)를 구별한다. 시간 경과·벌칙을 재열기로 자동 적용하지 않는다.')
d=game('star-wars-outer-rim','outer-rim-reference','Star Wars Outer Rim Core Rules Reference','PDF p.5 Contact Tokens; p.14 Secrets','뒷면 접촉 토큰은 위치/등급이 공개여도 정체는 공개되지 않는다. 몰래 본 정체와 비밀 카드는 해당 플레이어만 알고 있다.',edition='기본판')
amend(d,'galaxy.scene','뒷면 접촉은 공개 위치/등급/앞뒤만 기록하고 정체는 추측하지 않는다. 몰래 확인한 정체는 공용 장면 대신 private.scene 소유자 범위에 둔다.')
amend(d,'private.scene','본인이 실제 몰래 본 접촉의 토큰 위치ID와 정체 대응을 보존하고 공용 사진이나 타인의 기록으로 채우지 않는다.')
d=game('dune-imperium-uprising','dune-uprising-rules','Dune Imperium Uprising Main Rulebook 23-10-12','PDF p.4 Setup; pp.7–8 Intrigue/Turns; p.15 Recall','단계별 충돌/음모/제국 덱은 별도이며 시작 표식은 Recall에 시계방향 전달. 음모는 개인 덱 밖에서 숨기고 사용 후 공개 버림이다.',url='https://d19y2ttatozxjp.cloudfront.net/pdfs/DUNE_IMPERIUM_UPRISING_Main_Rulebook_23-10-12.pdf',edition='독립 기본판; CHOAM/6인/Rivals 제외')
add(d,'starting-player','선 플레이어 표식','현재 표식과 시계방향 플레이어 순서. Recall을 실제 완료하기 전/후를 구별하고 열기만으로 넘기지 않는다.','json')
add(d,'common-decks.scene','공용 충돌·제국·음모 덱','단계가 다른 충돌 카드와 제국·음모 덱을 각각 분리한 뒷면 묶음으로 보존. 단계 경계/위아래와 공개 중 카드/버림을 구별한다.','component-scene','shared-secret','hidden')
add(d,'intrigue-discard.scene','공개 사용한 음모 버림','실제로 공개해 효과 해결을 마친 음모를 공용 버림으로 기록. 개인 미사용 음모와 일반 개인 덱/버림에는 합치지 않는다.','component-scene')
amend(d,'hand.scene','음모는 개인 뽑기 덱과 분리해 소유자만 정체를 보고 사용 시에만 공개한다. 음모 장수의 강제 공개는 이 원문에서 확인하지 않아 추가하지 않는다.')
d=game('jaipur','jaipur-rules','Jaipur Space Cowboys English Rules ©2019 publisher 2025/11 file','PDF p.2 Setup; pp.4–5 Sale/Deck depletion; p.7 Reminders','미공개 뽑기 덱 보충 불가가 라운드 종료를 유발한다. 판매한 상품은 공개 버림이며 낙타 보유수는 상대에게 알릴 의무가 없다.',url='https://cdn.svc.asmodee.net/production-spacecowboys/uploads/2025/11/Rules-JAIPUR-12x17-Version-EN_BD.pdf',edition='현행 Space Cowboys 2인 기본판 ©2019')
add(d,'draw.scene','미공개 상품 뽑기','남은 뽑기 덱을 손패/공개 버림과 분리한 실물 묶음으로 보존. 남은 수를 모르면 봉인·위아래·위치만 기록하며0으로 가정하지 않는다.','component-scene','shared-secret','hidden')
add(d,'discard.scene','판매한 공개 버림','판매 완료한 공개 상품 카드 묶음. 시장/손패/미공개 덱과 합치지 않는다.','component-scene')
add(d,'herd-private.scene','비공개로 유지한 낙타 보유','보유자가 공개하지 않은 낙타 보유수/실물 묶음의 선택 기록. 시장의 공개 낙타와 구분한다.','component-scene','player','owner')
amend(d,'camels.scene','공식 규칙상 상대에게 보유 낙타 수를 알릴 의무가 없다. 이 공개 필드는 시장/자발적으로 공개한 부분만 기록하고 미공개 보유수는 herd-private.scene에 둔다. 공개 총수를 강제하지 않는다.')
amend(d,'token-supply.scene','보너스 표식은 종류/남은 묶음/보이는 면만 기록한다. 아직 뽑지 않은 보너스의 뒷면 값을 확인하려 뒤집지 않는다.')
d=game('arkham-horror-3','arkham-horror-3-primary','Arkham Horror Third Edition Rules Reference','PDF p.2 rule103; p.4 rule204.11; p.12 rules430–431','이벤트 덱은 위/아래에서 뽑고 이벤트 버림을 섞어 아래로 넣는 절차가 있어 신화컵과 별도 묶음/중단점이 필요하다.',edition='3판 기본판 Rules Reference')
add(d,'event-deck.scene','미공개 이벤트 덱·임시 묶음','신화컵 토큰과 구별한 이벤트 덱의 위/아래 및 덱 홀더 방향. 공개 event-discard.scene과 분리하고 섞는 중 임시 묶음의 이미 섞었는지/아래로 넣었는지는 pending에 기록한다. 모르는 내부 정체는 펼치지 않는다.','component-scene','shared-secret','hidden')
add(d,'event-discard.scene','공개 이벤트 버림','규칙430.10에 따라 앞면으로 둔 이벤트 버림. 미공개 event-deck.scene이나 신화컵과 합치지 않고, gate burst 처리 중 이미 섞어 덱 아래로 옮겼는지는 pending에 구분한다.','component-scene')
amend(d,'cup.scene','신화컵의 토큰과 이벤트 카드 덱은 서로 다른 묶음이며 이벤트 덱의 위/아래 및 버림 중단 상태는 event-deck.scene으로 구별한다.')
gap_fixes={
'arkham-lcg': {'새 규칙 PDF 접근 실패; 핵심 시나리오 배치·공개성·타이밍은 2026 Grimoire로 추가 확인 필요.':'2026 AHC100 공식 규칙 PDF는 확보했고 선임 조사자/혼돈 주머니/막·의제·파멸의 인용 절을 확인했다. 그 밖의 시나리오별 배치·공개성·카드별 타이밍의 완전 대조와 최신 Grimoire 대조는 미완료.'},
'le-havre': {'Le Grand Hameau 등 특수 건물은 카드 패치. Inland Port는 독립작.':'기본판 full game에도 특수건물 묶음이 포함되며 shortened는 사용하지 않음(공식2016 규칙p.2). Le Grand Hameau 확장 건물은 별도 카드 패치이고 Inland Port는 독립작.'},
'jaipur': {'귀금속 최소 판매·손패 한계·낙타 무리 공개 관례·라운드 종료/동률 세부는 원문 추가 확인 필요.':'낙타 보유수를 상대에게 알릴 의무가 없음과 덱 보충 불가 종료는 공식 현행 Space Cowboys 규칙에서 확인했다. 귀금속 판매·손패 한계·종료/동률의 전체 규칙 실행은 이 데이터 보완의 범위가 아니다.'},
'stone-age': {'개정판의 구판 대비 차이, 카드 공개 범위·자원 나눗수·도구 재사용 및 음식 부족 처리는 원문 대조 필요.':'공식 현재 English PDF에서 도구의 라운드당 사용과90도 표시, 시작 표식 및3단계를 확인했다. 개정판/구판 전체 차이·카드 공개 범위·자원 나눗수·음식 부족 전체 처리의 대조는 미완료.'},
'res-arcana': {'정수 색의 번역·장소 양면·회전/패스·마법 물품 교체·최종 점수 타이밍은 원문 검증 필요.':'공식2020 규칙의 패스 중 시작 표식/마법 물품 교체/카드 뽑기 절을 확인했다. 정수 색 번역·장소 양면·모든 회전/점수 예외와 전체 타이밍 대조는 미완료.'}
}
for decision in decisions:
 decision['gap_replacements']=gap_fixes.get(decision['game_id'],{})
(P/'decisions.json').write_text(json.dumps(decisions,ensure_ascii=False,indent=2)+'\n')
print(len(decisions),'official-targeted games',sum(len(d['add_fields']) for d in decisions),'new fields')
