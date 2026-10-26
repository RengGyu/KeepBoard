"""Human-authored source readings; no fact inference or network calls."""
import collections,hashlib,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2];HERE=pathlib.Path(__file__).resolve().parent
baseline=json.loads((HERE/'baseline.json').read_text())
games={g['game_id']:g for g in baseline['games']};rows={}
downloads={}
for p in HERE.glob('*results.json'):
 for x in json.loads(p.read_text()):
  if isinstance(x,dict) and 'url' in x:downloads[x['id']]=x
web_sources={
 'arkham-3-learn-web':('https://images-cdn.fantasyflightgames.com/filer_public/ca/77/ca776ab5-8169-4e4e-9036-dd61843b08e1/ahb01_learn-to-play-compressed.pdf','Arkham Horror Third Edition — Learn to Play 2018'),
 'concordia-web':('https://www.riograndegames.com/wp-content/uploads/2013/10/Concordia_rules_eng_1_1.pdf','Concordia Game Rules 1.1 — English base game'),
 'race-web':('https://www.riograndegames.com/wp-content/uploads/2013/02/RFTG_2e_rules.pdf','Race for the Galaxy second edition — English rules'),
 'heat-web':('https://www.daysofwonder.com/game/heat/','Heat — official base-game components'),
 'avalon-base-web':('https://indieboardsandcards.com/our-games/the-resistance-avalon/','The Resistance: Avalon — 2012 standalone base game'),
 'outer-rim-web':('https://cdn.svc.asmodee.net/production-fantasyflightgames/uploads/2026/09/sw06_learn_to_play_v2-compressed.pdf','Star Wars Outer Rim — base Learn to Play v2'),
 'galaxy-web':('https://www.czechgames.com/games/galaxy-trucker','Galaxy Trucker — 2021 base game'),
 'through-web':('https://www.czechgames.com/games/through-the-ages-a-new-story-of-civilization','Through the Ages: A New Story of Civilization — 2015 base game')}
def add(game,component,status,source,title,where,facts,art=None,need=None,semantics=None):
 g=games[game];c=next(c for c in g['components'] if c['id']==component)
 d=downloads.get(source,{})
 url=d.get('final_url',d.get('url')) or web_sources[source][0]
 rows[(game,component)]={'game_id':game,'component_id':component,'component_name':c['name'],'selected_edition':g['edition']['name'],'status':status,'official_source':{'id':game+'.art-confirmation.'+source,'title':title,'url':url,'checked_at':'2026-10-21','location':where,'local_path':'docs/art-confirmation/'+d['path'] if d.get('path') else None,'local_sha256':d.get('sha256'),'access':'opened' if d.get('status')=='downloaded' or source in web_sources else 'unavailable'},'verified_facts':facts,'fact_inference':False,'art_stylization_inference':bool(art),'art_recipe':art or [],'color_role':semantics or 'fixed-semantic','quantity_policy':'Keep original quantity:null; grouped classes and current scene quantity are not preset counts.','remaining_needed':need,'full_printed_inventory_verified':False}
def ok(g,c,s,t,p,f,a,sem=None):add(g,c,'confirmed',s,t,p,f,a,semantics=sem)
def partial(g,c,s,t,p,f,n):add(g,c,'partial',s,t,p,f,need=n)
def gap(g,c,s,t,p,f,n):add(g,c,'public-evidence-insufficient',s,t,p,f,need=n)

ok('agricola','people','agricola-rules','Agricola Revised Edition ©2016 — English Rules','p.2 Components/Your Personal Display; pp.5,8 Actions',
 '가족 원반·울타리·외양간은 개인색 구성물이다. 개인 공급과 농장/행동칸의 위치를 구별한다. 개인당 가족5·울타리15·외양간4가 표기되지만 이 묶음의 단일 quantity로 합산하지 않는다.',
 [('가족 원반','disk'),('울타리','confirmed:fence'),('외양간','piece:building')],'owner')
ok('agricola','cards','agricola-rules','Agricola Revised Edition ©2016 — English Rules','pp.2–3 Components/Setup; p.10 Hand Cards',
 '직업은 노랑, 보조설비는 주황, 대설비는 빨강 카드다. 개인 손패와 사용 카드, 공용 대설비를 구분한다. 유형색은 소유색이 아니다.',
 [('직업','confirmed:occupation-card'),('보조설비','confirmed:minor-card'),('대설비','confirmed:major-card')])
ok('anachrony','boards','anachrony-primary','Anachrony Essential Edition — English Rulebook','pp.2–3 Component List; pp.5–6 Setup; p.16 Research',
 '양면 Path판·개인판·지도자 카드·양면 Timeline 타일·Impact 타일이 별개다. 시간 초점은 Timeline 아래의 Path 표식이며 연구는 Breakthrough 타일과 두 연구 주사위를 사용한다.',
 [('진영 개인판','confirmed:house-mat'),('지도자','card:portrait'),('시대 타일','confirmed:timeline'),('초점 표식','disk'),('연구 돌파 타일','token:gear')])
ok('arkham-horror-3','map','arkham-3-learn-web','Arkham Horror Third Edition — Learn to Play 2018','pp.3–4 Components/Setup step2',
 '시나리오 뒷면 배치도에 따라 동네 타일과 거리 타일을 연결한다. 지도와 사용 동네 덱은 시나리오별로 달라지므로 고정 전체 지도를 만들지 않는다.',
 [('동네 구역','confirmed:neighborhood'),('거리 연결','confirmed:street-link')])
ok('arkham-horror-3','pieces','arkham-3-learn-web','Arkham Horror Third Edition — Learn to Play 2018','pp.3–5 Components/Setup',
 '조사자는 받침에 세우는 토큰, 괴물은 카드다. 단서/파멸은 양면 토큰이며 장소/동네·조사자와의 관계를 보존한다. 괴물을 미니어처로 취급하지 않는다.',
 [('조사자 스탠디','standee'),('괴물 카드','card:skull'),('파멸 면','token:skull'),('단서 면','token:eye')])
ok('arkham-horror-3','cards','arkham-3-learn-web','Arkham Horror Third Edition — Learn to Play 2018','pp.3–7 Components/Setup/Reading Cards',
 '시나리오 시트, 코덱스에 추가한 아카이브 카드, 동네/거리 조우 덱과 물품·동료·주문 덱을 구분한다. 공용 진열과 개인 자산도 별도다.',
 [('시나리오 시트','sheet'),('코덱스','card:book'),('조우','card:moon'),('물품','card:bag'),('주문','card:staff'),('동료','card:portrait')])
ok('arkham-lcg','locations','arkham-lcg-2026-rules','Arkham Horror The Card Game AHC100 ©2026 — Rulebook','pp.3–4 Components/Fundamental Concepts; pp.34–37 Card Anatomy',
 '2026 코어의 장소는 공개/미공개 양면이며 연결 토큰으로 인접을 나타낸다. 막과 주요사건은 서로 다른 진행 덱이다. 뒷면을 일반 카드 뒷면으로 바꾸지 않고 해당 상태를 별도로 기록한다.',
 [('장소 공개면','card:building'),('장소 미공개면','confirmed:unrevealed-location'),('막','card:book'),('주요사건','card:hourglass'),('연결 표식','confirmed:connector')])
ok('arkham-lcg','investigators','arkham-lcg-2026-rules','Arkham Horror The Card Game AHC100 ©2026 — Rulebook','pp.3,5 Components/Ready and Exhausted; pp.12–14 actions; pp.34–37 anatomy',
 '조사자 카드·미니카드·양면 조사자 토큰과 자산·적 카드는 별개다. 위치·교전/부착 관계와 준비/소진 방향을 기록한다. 전체 카드 앞면 목록은 확인 범위가 아니다.',
 [('조사자 카드','card:portrait'),('조사자 토큰','token:portrait'),('자산','card:bag'),('적','card:skull')])
ok('arkham-lcg','tokens','arkham-lcg-2026-rules','Arkham Horror The Card Game AHC100 ©2026 — Rulebook','p.3 Components; pp.5,7 Token Pool/Setup',
 '단서/파멸은 양면 토큰이며 자원·피해·공포는 다른 종류다. 표시값과 놓인 대상 카드를 함께 보존한다. 단서/파멸 1·3, 자원1·3·5, 피해/공포1·3 표기가 있다.',
 [('단서 면','token:eye'),('파멸 면','token:skull'),('자원','token:coin'),('피해','token:heart'),('공포','token:moon')])
ok('arkham-lcg','decks','arkham-lcg-2026-rules','Arkham Horror The Card Game AHC100 ©2026 — Rulebook','pp.3–4 Components/Scenario Decks; pp.6–10 Setup; pp.15–16 Skill Tests',
 '플레이어 덱·조우 덱·버림과 혼돈 주머니는 서로 다르다. 혼돈 표식은 카드가 아닌 토큰이다. 막/주요사건과 덱의 순서 및 비공개 정체를 외형으로 추정하지 않는다.',
 [('플레이어 덱','card-back'),('조우 덱','confirmed:encounter-back'),('혼돈 주머니','bag'),('혼돈 토큰 예시','token:star')])
ok('barrage','engineers','barrage-rules','Barrage — Core English Rulebook','pp.2–3 Components; pp.7–11 Setup/Contracts; pp.15–17 Management Actions',
 '회사별 엔지니어는 개인색 일꾼이며 계약은 타일, 크레딧은 값1·3·5의 공용 화폐다. 계약은 미완료/완료 면을 구별한다. 일꾼 소유색을 돈이나 계약에 적용하지 않는다.',
 [('엔지니어','worker'),('미완료 계약','confirmed:contract-tile'),('완료 계약 뒷면','confirmed:completed-contract'),('크레딧','token:coin')],'mixed; worker owner separate from contract/credit type')
ok('cascadia','nature','cascadia-rules','Cascadia Base Game — AEG optimized rulebook 2025-04','p.3 Components; p.7 Placement/Keystone reward; p.9 Nature Tokens scoring',
 '자연 토큰은 솔방울 그림이 있는 토큰이다. 야생동물 토큰과 구별하며 미사용 보유 수를 저장한다. 소유색 변형이 아닌 공용 유형이다.',
 [('자연 토큰','confirmed:pinecone-token')])
ok('concordia','colonists','concordia-web','Concordia English base Game Rules v1.1','p.1 Game Material; p.2 Architect',
 '육로 개척자는 사람 모양, 해로 개척자는 배 모양이며 플레이어색이다. 배치된 경로와 개인 창고의 대기 말을 구분한다. 각3개라는 재고와 현재 장면 수량은 별도다.',
 [('육로 개척자','worker'),('해로 개척자','piece:boat')],'owner')
ok('concordia','houses','concordia-web','Concordia English base Game Rules v1.1','p.1 Game Material; pp.2–3 Architect/Prefect',
 '개인색 주택과 공용 지방 보너스 표식은 별개다. 주택의 도시 소유와 지방 표식의 면을 기록한다. 주택 개인당15개를 지방표식과 합산하지 않는다.',
 [('개인 주택','piece:building'),('지방 보너스 생산면','token:grain'),('지방 보너스 화폐면','token:coin')],'mixed; house owner separate from province bonus')
ok('concordia','goods','concordia-web','Concordia English base Game Rules v1.1','p.1 Game Material; pp.2–3 Merchant/Prefect',
 '상품은 벽돌·식량·도구·포도주·직물 다섯 종류다. 개인 창고 슬롯과 세스테르티우스 화폐(1·2·5·10)를 별도로 기록한다.',
 [('벽돌','token:brick'),('식량','token:grain'),('도구','token:hammer'),('포도주','token:wine'),('직물','token:cloth'),('화폐','token:coin')])
ok('crew-deep-sea','tokens','crew-deep-sea-rules','The Crew Mission Deep Sea — Thames & Kosmos English Rulebook','p.2 Game Materials; pp.5–6 Communication; p.14 Distress Signals',
 '소나 토큰·조난 신호 토큰·선장 표식을 구별한다. 소나 토큰은 사용 면 및 공개 카드의 위/중간/아래 위치가 정보다. 선장은 잠수함4 보유자로 정해진다.',
 [('소나 사용 가능','confirmed:sonar-token'),('소나 사용 면','confirmed:sonar-spent'),('선장','token:anchor'),('조난 신호','token:bolt')])
ok('dominant-species','actions','dominant-species-primary','Dominant Species ©2010 GMT — Rules of Play','pp.2–3 Components/Glossary; pp.8–9 Action Display; pp.18–19 Dominance Cards',
 '행동 말은 나무 원기둥이며 지배 표식 원뿔·종 큐브와 다르다. 지배 카드는 일회 효과 카드, Survival 카드는 별도다. 행동칸 위치와 획득/처리 카드 상태를 기록한다.',
 [('행동 원기둥','confirmed:cylinder'),('지배 카드','card:leaf')],'mixed; cylinder player color, card fixed')
ok('eclipse-second-dawn','discs','eclipse-rules','Eclipse Second Dawn English rulebook 2021-04-27','pp.3–4 Components/Player Area; p.6 Game Concepts; p.8 Colonization',
 '영향력은 원반, 인구는 큐브, 식민선은 양면 타일이다. 원반의 구역/행동/트랙 위치, 인구의 자원 트랙/행성 위치, 식민선 사용면을 구별한다. 영향력과 인구의 색은 세력 소유색이다.',
 [('영향력 원반','disk'),('인구 큐브','cube'),('식민선 준비면','confirmed:colony-ready'),('식민선 사용면','confirmed:colony-spent')],'mixed; owner disc/cube separate from colony face')
ok('gloomhaven','map','gloomhaven-2025-rules','Gloomhaven Second Edition 2025 — Rulebook','pp.12–13 Map Tiles and Walls/Overlay Tiles; p.60 Component Inventory',
 '지도 타일은 여러 육각 칸으로 된 방이며 벽선·문·장애물/어려운 지형 등 오버레이가 별도다. 단일 육각 조각을 방 전체로 취급하지 않는다. 선택 타일ID·면·회전·연결·점유칸을 저장한다.',
 [('다중 육각 방','confirmed:hex-room'),('문 오버레이','special:door'),('장애물 오버레이','confirmed:obstacle-hex'),('물 지형 오버레이','tile:water')])
ok('gloomhaven','figures','gloomhaven-2025-rules','Gloomhaven Second Edition 2025 — Rulebook','p.4 Creating a Character; pp.60–61 Component Inventory',
 '인물은 미니어처 또는 대체 인물 스탠디, 몬스터는 스탠디, 소환물도 스탠디다. 종류·인스턴스·해당 받침/위치를 구별하며 모든 인물을 미니어처로 통일하지 않는다.',
 [('인물 미니어처 대표','piece:portrait'),('인물 스탠디','standee'),('몬스터 스탠디','confirmed:monster-standee'),('소환 스탠디','confirmed:summon-standee')])
ok('gloomhaven','cards','gloomhaven-2025-rules','Gloomhaven Second Edition 2025 — Rulebook','pp.5–6 Character Cards/Items; p.61 Component Inventory',
 '인물 능력·아이템·몬스터 능력·공격 보정 카드는 다른 덱이다. 능력의 손패/버림/소실, 아이템의 사용 방향과 보정 덱 순서를 별도 기록한다. 각 카드 효과나 전체 인쇄 앞면을 이 그림으로 대체하지 않는다.',
 [('인물 능력','card:sword'),('아이템','card:bag'),('몬스터 능력','card:skull'),('공격 보정','confirmed:modifier-card')])
ok('gloomhaven','markers','gloomhaven-2025-rules','Gloomhaven Second Edition 2025 — Rulebook','pp.4–5 Character Dial/Initiative; p.21 Elements; pp.60–61 Inventory',
 '원소판은 여섯 원소 토큰과 라운드 표식을 사용한다. 인물 체력/경험은 결합 다이얼이고 주도권 순서 표식은 별도다. 원소의 상태 위치와 주도권 순서, 실제 다이얼값을 보존한다.',
 [('원소판 대표','confirmed:element-board'),('주도권 표식','confirmed:initiative-strip'),('체력·경험 다이얼','confirmed:dual-dial'),('피해','token:heart')])
ok('heat','cards','heat-web','Heat — official Days of Wonder base-game page','What’s in the box; basic-game Rules download listed',
 '기본판 구성 목록은 Speed72장·Heat48장·Stress37장을 명시한다. 세 종류를 구분하는 대표형으로 제한한다. 손패/덱/버림/엔진의 이동 세부는 이번 상품 본문만으로 추가 확정하지 않는다.',
 [('속도 카드','confirmed:speed-card'),('열 카드','card:flame'),('스트레스 카드','card:bolt')])
ok('imperial-assault','map','imperial-assault-primary','Imperial Assault Core — Learn to Play','pp.2–4 Component List/Tutorial Setup',
 '모듈식 지도 타일·받침이 있는 문·터미널·상자는 별개다. 지도 타일ID의 a/b면·회전·격자 연결, 문/터미널/상자의 점유 위치를 저장한다. 기본 상자에 동봉된 별도 피겨팩 구성은 목록에서 제외한다.',
 [('격자 지도 구역','special:room-doors'),('문','special:door'),('터미널','token:computer'),('상자','token:box')])
ok('imperial-assault','figures','imperial-assault-primary','Imperial Assault Core — Learn to Play','pp.2–4 Component List/Tutorial Setup',
 '영웅·제국군 피겨와 동료/악당 토큰이 구별된다. 배치 카드 그룹·개체 ID·받침색/위치와 영웅 활성화 토큰의 면을 보존한다. 모두 소유 플레이어색 미플로 바꾸지 않는다.',
 [('영웅 피겨 대표','piece:portrait'),('제국군 피겨 대표','piece:helmet'),('동료·악당 토큰','token:portrait')])
ok('imperial-assault','tokens','imperial-assault-primary','Imperial Assault Core — Learn to Play','pp.2–3 Component List; pp.6–7 Damage/Status Phase',
 '피해·스트레인·상태 토큰과 위협/라운드 다이얼은 다른 물체다. 각 대상/수치와 활성화의 준비/소진 면을 구별한다. 피해1/5 외 장식 수를 실제값으로 해석하지 않는다.',
 [('피해','token:heart'),('스트레인','token:bolt'),('상태','token:shield'),('위협·라운드','confirmed:dual-dial')])
ok('istanbul','places','istanbul-rules','Istanbul Big Box English rules — base sections only','pp.3–6 Base Components/Setup; pp.18–19 base Places',
 '기본판 장소는1–16의 정사각 타일을4×4로 배치한다. Big Box 규칙의17–20·21–25는 확장이므로 제외한다. 타일 번호·배치와 장소별 루비 칸을 보존한다.',
 [('기본 장소 타일','confirmed:market-place')])
ok('istanbul','cards','istanbul-rules','Istanbul Big Box English rules — base sections only','pp.3–4 Base Components; p.7 Setup; p.24 Bonus Cards',
 '보너스 카드와 모스크 타일·요구 타일은 서로 다르다. 원 초안의 막연한 보상 타일 표현은 기본판 모스크 타일로 좁힌다. 커피콩/인장 표시 확장 카드는 제외한다.',
 [('보너스 카드','card:star'),('모스크 타일','confirmed:mosque-tile'),('요구 타일','confirmed:demand-tile')])
ok('journeys-middle-earth','tiles','journeys-middle-earth-primary','Journeys in Middle-earth Base — Learn to Play','pp.3–5 Components/Setup; pp.7–8 Travel/Exploration; p.14 Battle Maps',
 '여정 지도 타일과 전투 지도 타일은 별개며 앱이 해당 타일과 방향을 지시한다. 지도 연결과 개별 구역을 보존한다. 일괄 고정 지도 또는 같은 격자로 바꾸지 않는다.',
 [('여정 지도 구역','confirmed:journey-tile'),('전투 지도 구역','special:room-doors')])
ok('journeys-middle-earth','figures','journeys-middle-earth-primary','Journeys in Middle-earth Base — Learn to Play','p.3 Component List; pp.4–5 Setup',
 '기본판은 영웅6·적25의 플라스틱 피겨와 적 배너/받침을 구분한다. 인물 선택과 적 그룹 배너, 실물 구역 위치를 별도 기록한다.',
 [('영웅 피겨 대표','piece:portrait'),('적 피겨 대표','piece:sword'),('적 그룹 배너','confirmed:banner')])
ok('journeys-middle-earth','cards','journeys-middle-earth-primary','Journeys in Middle-earth Base — Learn to Play','pp.3–5 Components/Setup; pp.10–12 Tests/Damage/Fear',
 '기술 덱·준비 기술·아이템·피해·공포·보탬 카드가 다르다. 피해/공포 앞뒷면과 아이템 소모 표식의 부착 대상을 보존한다. 역할/영웅 기술을 한 덱의 앞면 종류로 추정하지 않는다.',
 [('기술','card:scroll'),('아이템','card:sword'),('피해','card:heart'),('공포','card:moon'),('보탬','card:shield')])
ok('journeys-middle-earth','tokens','journeys-middle-earth-primary','Journeys in Middle-earth Base — Learn to Play','p.3 Component List; pp.5–9 Tokens/Explore; pp.12–14 Terrain',
 '영감/탐험과 수색/위협은 각각 양면 토큰이다. 어둠·인물·소모 표식은 별개다. 초안의 정찰을 별도 물체로 만들지 않는다. 정찰은 카드 처리이며 앱 상태와 물리 토큰 면을 구분한다.',
 [('영감 면','token:star'),('탐험 면','token:compass'),('수색 면','token:eye'),('위협 면','token:skull'),('어둠','token:moon'),('소모','token:bolt')])
ok('le-havre','debt','le-havre-2016-rules','Le Havre 2016 English rules — full base mode','pp.1–3 Components; p.10 Loans',
 '돈은 프랑 동전이고 대출은 Loan 카드다. 대출을 화폐 토큰으로 합치지 않는다. 개인별 현금과 미상환 카드 수를 기록하며 확장 특수건물은 이 분류의 근거에서 제외한다.',
 [('프랑','token:coin'),('대출 카드','confirmed:loan-card')])
ok('machi-koro','cards','machi-koro-rules','Machi Koro rulebook linked from 5th Anniversary product','pp.3–6 Components/Card Explanation/Setup/Establishment Types',
 '초기 시설과 건설 전/후 랜드마크가 다르다. 기본 네 랜드마크는 역·쇼핑몰·놀이공원·전파탑이다. 시설의 유형색/발동 눈과 소유 도시, 랜드마크 면을 구별한다.',
 [('시설 카드','card:building'),('역 랜드마크','card:train'),('쇼핑몰 랜드마크','card:bag'),('놀이공원 랜드마크','card:star'),('전파탑 랜드마크','card:telescope')])
ok('machi-koro','coins','machi-koro-rules','Machi Koro rulebook linked from 5th Anniversary product','p.3 Components; p.4 Setup',
 '동전은1·5·10 값의 공용 화폐다. 개인 보유와 은행을 구별하며 소유색을 칠하지 않는다.',
 [('1 동전','confirmed:coin-1'),('5 동전','confirmed:coin-5'),('10 동전','confirmed:coin-10')])
ok('mansions-madness-2','map','mansions-rules','Mansions of Madness Second Edition — Learn to Play','pp.3–5 Components/Setup; p.14 Explore',
 '방 지도 타일과 문·벽·수색/상호작용·탐험/시야 토큰이 별개다. 앱이 공개한 타일과 표식 위치를 기록한다. 기존1판 전환 키트는2판 기본 구성 근거와 분리한다.',
 [('방 타일','special:room-doors'),('문','special:door'),('벽','confirmed:wall-link'),('탐색/상호작용','token:eye'),('탐험/시야','token:compass')])
ok('mansions-madness-2','figures','mansions-rules','Mansions of Madness Second Edition — Learn to Play','pp.3–4 Components/Setup steps3,6',
 '조사자 카드와 맞는 피겨, 괴물 토큰과 맞는 피겨가 있다. 괴물 토큰은 받침에 끼운다. 인물/괴물 종류·개체ID·지도 위치·앱 연동 상태를 구별한다.',
 [('조사자 피겨 대표','piece:portrait'),('괴물 피겨 대표','piece:skull'),('괴물 받침 토큰','confirmed:monster-base')])
ok('mansions-madness-2','cards','mansions-rules','Mansions of Madness Second Edition — Learn to Play','pp.3–4 Components/Create Card Decks; pp.12–13 Damage/Horror/Conditions',
 '일반/고유 아이템·주문·상태·피해·공포는 별도 카드군이다. 피해/공포의 공개/비공개 면과 주문의 뒤집힘, 개인 보유/부착을 구분한다. 뒷면 내용은 펼쳐 수집하지 않는다.',
 [('일반 아이템','card:bag'),('고유 아이템','card:gem'),('주문','card:staff'),('상태','card:shield'),('피해','card:heart'),('공포','card:moon')])
ok('mansions-madness-2','tokens','mansions-rules','Mansions of Madness Second Edition — Learn to Play','p.3 Components; pp.13–15 Tokens/Terrain',
 '단서, 양면 화재/어둠, 바리케이드·비밀통로·ID 토큰이 구별된다. 상태는 주로 카드이므로 상태를 임의 토큰 재고로 만들지 않는다. 토큰 면과 방/개체 연결을 기록한다.',
 [('단서','token:eye'),('화재 면','token:flame'),('어둠 면','token:moon'),('바리케이드','confirmed:fence'),('비밀 통로','token:compass'),('ID','confirmed:id-token')])
ok('marvel-champions','cards','marvel-rules','Marvel Champions Core ©2019 — Learn to Play','p.3 Components; pp.6–7 Player Area; pp.10–13 Player Phase; p.23 Card Types',
 '동료·지원·업그레이드는 구분되는 카드 종류다. 조우 카드와 별개이며 소진은 카드 회전이다. 업그레이드의 부착 대상과 개인 덱/손패/사용 영역, 조우 덱을 보존한다.',
 [('동료','card:portrait'),('지원','card:building'),('업그레이드','card:gear'),('조우','card:skull')])
ok('marvel-champions','tokens','marvel-rules','Marvel Champions Core ©2019 — Learn to Play','p.3 Components; pp.6–7 Setup; pp.14–16 Villain Phase',
 '피해·위협·만능 카운터·가속 토큰과 Stunned/Confused/Tough 상태 카드가 구별된다. 상태를 모두 원형 토큰으로 바꾸지 않는다. 토큰 수치와 놓인 대상 카드를 저장한다.',
 [('피해','token:heart'),('위협','token:skull'),('만능 카운터','cube'),('가속','token:hourglass'),('기절 상태 카드','card:bolt'),('혼란 상태 카드','card:moon'),('강인 상태 카드','card:shield')])
ok('monopoly','property','monopoly-rules','Hasbro Monopoly Classic G0009 ©2025 — English instructions','sheet1 Contents/Setup; sheet2 Properties/Buildings/Mortgages',
 '소유권 카드·집·호텔은 별개다. 카드의 담보 면과 부동산별 집/호텔 수를 기록한다. G0009 인쇄는 집32·호텔12·소유권28장을 명시하며 다른 지역 부동산 명칭까지 고정하지 않는다.',
 [('소유권 정면','card:building'),('담보 면','confirmed:mortgage-card'),('집','piece:building'),('호텔','confirmed:hotel-piece')],'mixed; building type colors and title owner separate')
ok('monopoly','money','monopoly-rules','Hasbro Monopoly Classic G0009 ©2025 — English instructions','sheet1 Contents/Setup; sheet2 Chance and Community Chest',
 '지폐, 기회 카드, 공동기금 카드는 다른 물체다. 뽑은 카드는 일반적으로 더미 맨 아래로 돌아가므로 더미 순서와 보유 탈옥 카드를 구분한다. 개인 현금과 은행을 합치지 않는다.',
 [('지폐','confirmed:banknote'),('기회','card:star'),('공동기금','card:box')])
ok('quacks','pot','quacks-primary','The Quacks of Quedlinburg — Schmidt English rules 2024 file','pp.1–3 Contents/Setup/The Rats; p.8 Variant',
 '솥 개인판은 기본면과 시험관 변형면이 있다. 시작 방울과 쥐 표식은 별개이며 경로 위치를 구별한다. 재료칩의 숫자는 이동값이므로 놓인 칩 개수/수량과 혼동하지 않는다.',
 [('솥 경로판','confirmed:cauldron-board'),('시작 방울','piece:water'),('쥐 표식','confirmed:rat-token')])
ok('quacks','goods','quacks-primary','The Quacks of Quedlinburg — Schmidt English rules 2024 file','pp.1–3 Contents/Setup; pp.6–7 Evaluation/Flask',
 '루비·양면 플라스크·개인 점수 표식은 별개다. 플라스크 가득/빈 면, 점수 트랙 위치 및0/50 봉인의 면을 저장한다. 루비는 공용 유형색이다.',
 [('루비','token:gem'),('가득 찬 플라스크','confirmed:flask-full'),('빈 플라스크','confirmed:flask-empty'),('점수 표식','disk')],'mixed; player marker separate from ruby type')
ok('race-for-the-galaxy','points','race-web','Race for the Galaxy Second Edition — English Rules 2018','pp.1–2 Contents/Setup',
 '승점 칩은1·5·10 값이다. 공용 공급과 개인 획득을 구별하고 끝 라운드용10점 칩의 별도 대기 상태를 기록한다. 카드 점수와 칩 수량은 별도다.',
 [('1 승점 칩','confirmed:vp-1'),('5 승점 칩','confirmed:vp-5'),('10 승점 칩','confirmed:vp-10')])
ok('res-arcana','places','res-arcana-rules','Res Arcana base — English Rules 2020-10-03','pp.2–4 Components/Setup; pp.6–8 Actions/Powers/Pass',
 '힘의 장소는 양면 타일이고 마법 물품은 별도 타일이다. 장소 선택면·획득자·90도 회전 사용 상태와 위에 놓인 정수, 물품의 교체 상태를 구별한다.',
 [('힘의 장소','confirmed:power-place'),('마법 물품','confirmed:magic-item')])
ok('seti','probes','seti-rules','SETI base — English Rules','pp.2–3 Components; pp.8–11 Launch/Orbit/Land',
 '같은 플레이어색 피겨가 태양계에서는 탐사선, 행성판 궤도에서는 궤도선, 행성 착륙칸에서는 착륙선이 된다. 다른 실물 조각 세 종류로 복제하지 않고 동일 에셋과 역할/부착 위치를 구분한다.',
 [('탐사선 피겨 · 위치에 따른 역할','confirmed:probe-piece')],'owner')
ok('star-wars-outer-rim','map','outer-rim-web','Star Wars Outer Rim Base — Learn to Play v2','pp.2–4 Components/Setup',
 '지도 구역 타일과 양 끝 캡, 공개 순찰 토큰과 뒷면 접촉 토큰은 별개다. 접촉의 색/점 개수와 공개면, 지도 구역 순서·행성/항로 위치를 저장한다.',
 [('은하 구역','confirmed:galaxy-segment'),('끝 캡','confirmed:map-endcap'),('접촉 뒷면','confirmed:contact-back'),('접촉 공개면','token:portrait'),('순찰','token:ship')])
ok('star-wars-outer-rim','markers','outer-rim-web','Star Wars Outer Rim Base — Learn to Play v2','pp.2–5 Components/Setup; Rules Reference Reputation p.13',
 '피해·크레딧 토큰, 개인판 명성 슬라이더와 세력별 평판 토큰이 다르다. 피해가 인물/함선 중 어디에 놓였는지, 평판의 긍정/중립/부정을 기록한다.',
 [('피해','token:heart'),('크레딧','token:coin'),('명성 슬라이더','confirmed:track-slider'),('평판','token:shield')])
ok('star-wars-rebellion','markers','star-wars-rebellion-primary','Star Wars Rebellion Base — Rules Reference','Loyalty/Subjugation pp.8,14; Reputation p.12; Sabotage Markers p.13; Refresh Phase pp.10–11',
 '충성/복종과 사보타주 표식은 다른 시스템 상태다. 시간과 반란군 평판은 같은 트랙의 다른 표식이며 생산 대기는 유닛의 build queue 위치다. 생산 대기를 임의 토큰으로 만들지 않는다.',
 [('충성','token:shield'),('복종','token:helmet'),('사보타주','token:gear'),('시간','token:hourglass'),('평판','token:star')])
ok('terra-mystica','tiles','terra-mystica-rules','Terra Mystica Capstone base — English Rules','p.3 Components; pp.6–7 Setup; pp.12–15 Special Actions/Town/Passing',
 '도시 타일, 타원 호의 타일, 두루마리 모양 보너스 카드는 다른 구성물이다. 도시/호의 획득과 보너스 카드 교체·사용 행동 표식을 구별한다. 원 초안의 획득/사용 면은 모든 타일의 공통 양면 규칙이 아니다.',
 [('도시 타일','confirmed:town-tile'),('호의 타일','confirmed:oval-favor'),('보너스 두루마리','confirmed:bonus-scroll')])
ok('voidfall','sectors','voidfall-primary','Voidfall Retail base — English Rulebook 2023','pp.3–4 Components; pp.17–19 Sectors/Population',
 '구역은 양면 육각 타일이며 인구 주사위의 눈과 함대/길드·시설·오염 표식이 별개다. 구역ID·면·인구값·부착 구조물을 구별한다. 주사위가 있다는 사실을 임의 굴림 결과로 기록하지 않는다.',
 [('구역 타일','confirmed:voidfall-sector'),('인구 주사위 예시','die'),('길드 표식','token:building'),('시설 표식','token:factory'),('오염','token:skull')])
ok('voidfall','houses','voidfall-primary','Voidfall Retail base — English Rulebook 2023','p.3 Components; pp.6–8 House Setup; pp.19–20 Resources; pp.28–29 Civilization',
 '가문 매트와 자원 다이얼판, 영향력 다이얼판, 문명 트랙 표식은 별개다. 가문 정체·사용면·각 자원/생산 다이얼값과 트랙 위치를 보존한다. 가문 능력 전체 효과는 그림으로 대체하지 않는다.',
 [('가문 매트','confirmed:house-mat'),('자원 다이얼','dial'),('영향력 다이얼','confirmed:triple-dial'),('문명 트랙 표식','cube')])
ok('wyrmspan','resources','wyrmspan-primary','Wyrmspan English base — official product components and Rules & FAQ','Coins/Tokens/Eggs/Markers; official FAQ “What exactly do I gain…” and cached-resource clarification',
 '알·동전과 고기/금/수정/우유 네 자원은 별개다. 카드에 저장한 고기/우유와 개인 공급을 구별한다. 동전·알은 any-resource 선택의 네 자원에 포함되지 않는다. 유형색을 플레이어 소유색으로 바꾸지 않는다.',
 [('알','piece:egg'),('동전','token:coin'),('고기','token:meat'),('금','token:gold'),('수정','token:crystal'),('우유','token:milk')])

# Remaining sources were inspected but do not establish the complete selected group.
partial('aeons-end','mages','aeons-end-primary','Aeon’s End official physical product IBCAED2 (2017)','Description/Technical Data','2판 물리 기본판 SKU와 breach mage·고유 능력 존재를 확인했다. 균열판의 번호/회전/개방 면은 상품 본문에 없다.','IBCAED2 기본 규칙의 Component List/Player Setup 및 마법사판·균열 토큰 앞뒤 도해.')
partial('aeons-end','nemesis','aeons-end-primary','Aeon’s End official physical product IBCAED2 (2017)','Description','Gravehold를 공격하는 Nameless와 네메시스/적 체계라는 큰 범위만 확인했다. 적 카드의 Minion/Power 구별과 네메시스판은 본문에서 확인하지 못했다.','2판 기본판 Nemesis setup/Anatomy 도해와 기본 네메시스판 예시. 확장·디지털판 자료 제외.')
gap('aeons-end','counters','aeons-end-primary','Aeon’s End official physical product IBCAED2 (2017)','Description/Files','공식 상품 본문에 체력·충전·진행 카운터의 물체별 목록과 면이 없다.','2판 Component List의 life/charge/nemesis-specific token 그림과 해당 설명. 수량은 확인 전 null.')
for c in ['map','pieces','cards','tokens']:
 gap('arcs',c,'arcs-primary','Arcs official How to Play page','How to Play; current resources library inspected','공식 소개와 영상 링크는 확인되지만 현재 공식 자료 페이지에서 기본판 구성물 본문과 배치 도해를 확보하지 못했다. 2022 개발일지나 제3자 규칙 미러로 확정하지 않았다.',{'map':'기본판 최종 규칙의 Components/Map/Setup 페이지: 클러스터·행성·게이트 및 지도의 인쇄판.','pieces':'기본판 최종 규칙의 ship/city/starport/agent 물체 도해와 damaged 상태 표시 방식.','cards':'기본판 Action/Court 카드 구별과 공개/비공개·리드/손패/획득 상태 설명. 캠페인 카드 제외.','tokens':'기본판 resource/ambition 표식 목록과 포로·전리품의 실물 처리. Blighted Reach 제외.'}[c])
for c in ['cards','markers']:
 gap('avalon',c,'avalon-base-web','The Resistance Avalon official standalone base product (2012)','Description/How to Play; Big Box excluded','2012 기본판과 2022 Big Box가 다른 상품임을 확인했다. 기본판 투표/원정 카드와 표식 구성물의 본문·도해는 확보하지 못했다.', '2012 기본판 규칙 Components와 Team Building/Quest 도해. Big Box 추가 모듈을 제외한 승인/거부·성공/실패 및 리더/원정/추적 표식 앞뒤.')
partial('charterstone','workers','charterstone-primary','Charterstone English base — official product/Chronicle introduction','What’s in the box; Rulebooks introduction','기본판의 목재 토큰과 캠페인 중 추가 규칙을 붙이는 Chronicle 구조는 확인했다. 일꾼과 진행 말의 종류별 도해·세부 수량은 없다.','초기 Chronicle의 Workers/Progress Token 도해와 현재 해금 범위. 비밀 상자나 미공개 카드를 펼칠 필요 없음.')
gap('coup','coins','coup-primary','Coup base — official product (2012)','Description/How to Play','공식 상품은 영향력 카드와 승리 목표를 설명하지만 동전 재고·표시값·시작 공급의 본문이 없다.','기본 Coup 규칙 Contents/Setup의 동전 그림·명칭·값. Reformation 화폐나 비공식 업그레이드 제외.')
partial('davinci-code','tiles','davinci-code-primary','코리아보드게임즈 다빈치 코드 — 제품 PD2024002346M4NG','상품 주요 정보/상품상세','한국 공식 상품명과 인원·연령은 확인했지만 상세는 이미지 중심이며 선택 인쇄판 숫자/조커 전체 구성의 규칙 본문을 확보하지 못했다.','해당 한국판 설명서 구성물/코드 만들기 페이지 또는 숫자0–11·조커의 앞면과 뒷면이 보이는 공식 구성물 사진. 플레이어 비밀 줄 사진은 불필요.')
gap('everdell','events','everdell-primary','Everdell Essentials Edition TABSTG2680 — official Asmodee UK product','Description','Essentials가 카드보드 구성물을 쓰는 판본임은 확인했다. 원 기본판의 재질/이벤트를 그대로 승격하지 않았다.','TABSTG2680 규칙 Components/Setup의 Basic/Special Events와 Forest/Destination 장소 구분 도해. Collector Edition 제외.')
partial('expeditions','markers','expeditions-primary','Expeditions standard plastic-mech base — official product','Description/What’s in the box; rules-faq','파워·기지(guile)로 오염을 극복하는 엔진과 기본 플라스틱 메크판은 확인했다. 해당 추적기·동전·영광 표식의 전체 구성 도해는 없다.','기본판 rulebook Components/Mech Mat의 power/guile/glory/action tracker와 coin 그림. Gears of Corruption의 6인 부품 제외.')
partial('galaxy-trucker','contents','galaxy-web','Galaxy Trucker 2021 base — official CGE product','Components/Description','2021판 우주인·갈색/보라 외계인·배터리·상품 블록의 목록을 확인했다. 객실/생명유지/화물칸별 부착과 배터리 사용 상태는 다운로드 위젯 본문에서 확인하지 못했다.','2021 기본 규칙 Astronauts/Aliens/Batteries/Cargo 페이지. 2007판과 확장 승무원/상품은 제외.')
partial('galaxy-trucker','credits','galaxy-web','Galaxy Trucker 2021 base — official CGE product','Components/Description','크레딧 타일68개와 비행 중 부품 손실의 존재를 확인했다. 크레딧 표시값과 잃은 부품을 두는 구역/배상 관계는 본문에 없다.','2021 규칙 Cosmic Credits/Lost Components/End of Flight 도해. 현재 보유 크레딧을 총 타일 수로 추정하지 않음.')
for c in ['pieces','tiles','money']:
 partial('great-western-trail',c,'great-western-trail-primary','Great Western Trail Second Edition ES5190 — official Asmodee product','Description and official component photo captions','2판 SKU·목장주 피겨 사진·개인 트랙과 여러 타일의 공식 사진은 확인했다. 세 분류의 전체 구성과 앞뒤/기능 대응은 규칙 본문에서 확인하지 못했다.',{'pieces':'ES5190 Components/Player Setup의 목장주·기관차·개인 디스크 도해. El Paso/Argentina 제외.','tiles':'ES5190 기본판 건물·일꾼·위험·역장 타일의 명칭과 양면 구분. 확장 타일 제외.','money':'ES5190 기본판 동전·증서 표식·목표 카드의 별도 구성과 사용면/트랙 설명.'}[c])
partial('mage-knight','cards','mage-knight-primary','Mage Knight original base mode — official WizKids Starter Set section','Starter Set/Features/Downloads','원 기본판의 마법·유물 획득과240장 카드 존재는 확인했다. 공식 연결 구 도메인 PDF는 인증서 오류여서 무시하거나 우회하지 않았다.','원 기본판 Walkthrough/Rulebook의 Deed/Advanced Action/Spell/Artifact/Wound 카드 도해. Ultimate 확장 카드로 대체하지 않음.')
gap('scout','tokens','scout-primary','SCOUT Oink Games 2021 — official product','Product/Errata Notice','공식 페이지의 인쇄 오류 안내와 대상 시리얼은 확인했다. 토큰의 종류별 명칭·앞뒤·지급 규칙은 본문에서 확인되지 않았다.','Oink 기본판 설명서의 Components/Scout/Scout & Show/Scoring 부분. 가능한 시리얼2221020251 등 오류 수정본 사용.')
partial('tapestry','markers','tapestry-primary','Tapestry base English — current purple-icon revised civilization mats','Description/What’s in the box','현행 기본판의 네 진보 트랙과 개정 문명판을 확인했다. 자원/점수 표식과 트랙 매핑의 전체 도해는 확보하지 못했다.','기본 규칙 Components/Setup/Income mat 그림과 자원별 표식 명칭. 문명팩·확장 전용 표식 제외.')
for c in ['cards','cubes','boards']:
 partial('through-the-ages',c,'through-web','Through the Ages A New Story of Civilization — CGE 2015 base','Components/Description','2015 신판의 민간179/군사150 카드, 네 색 플라스틱 큐브와 개인/문화/과학/군사/현재시대 판을 확인했다. 유형별 앞뒷면과 큐브 은행·행동의 상세 대응은 본문에서 확보하지 못했다.',{'cards':'2015 Code of Laws/Guidebook의 카드 해부도: 기술·지도자·불가사의·군사/이벤트/전술. 구판과 새 지도자 확장 제외.','cubes':'신판 Guidebook의 Yellow Bank/Blue Bank/Unused Worker Pool/Civil and Military Actions 도해와 색 역할.','boards':'신판 개인판 은행·노동자/행동 구역과 과학/문화/군사/행복 트랙의 전체 설정 도해.'}[c])
partial('viticulture','goods','viticulture-primary','Viticulture Essential Edition English base — official product','What’s in the box/Description','투명 포도·와인 토큰48개와 리라 동전72개를 확인했다. 품질값을 토큰 자체 인쇄값으로 볼 수 없으며 셀러/포도 압착판 위치의 대응은 원문 도해 대조가 남았다.','Essential rulebook Crush Pad/Cellars/Aging/Components 그림. 적·백 포도와 적·백·로제·스파클링 와인 구역 및 리라 표시값. Tuscany 제외.')

for key,source,title,where in [
 (('wyrmspan','resources'),'wyrmspan-support','Wyrmspan base — official Rules & FAQ','FAQ “What exactly do I gain…”; cached-resource clarification before comments'),
 (('star-wars-outer-rim','markers'),'outer-rim-reference','Star Wars Outer Rim base — Rules Reference','Reputation p.13; Damage/Credits/Fame glossary')]:
 d=downloads[source]
 rows[key]['support_sources']=[{'id':key[0]+'.art-confirmation.'+source,'title':title,'url':d.get('final_url',d['url']),'location':where,'local_path':'docs/art-confirmation/'+d['path'],'local_sha256':d['sha256'],'access':'opened','checked_at':'2026-10-21'}]

expected={(g['game_id'],c['id']) for g in games.values() for c in g['components']}
assert set(rows)==expected,(sorted(expected-set(rows)),sorted(set(rows)-expected))
counts=collections.Counter(r['status'] for r in rows.values());assert sum(counts.values())==81
report={'as_of':'2026-10-21','baseline_source_unclear':81,'intentional_catan_unknown_excluded':True,'counts':dict(counts),'definition':'confirmed means the stated representative identities and recorded semantics only; never all rules, printed faces, factual product support or recognition accuracy.','rows':list(rows.values())}
(HERE/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report['counts']))
