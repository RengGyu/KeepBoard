"""Research-only catalogue builder. No network, application imports, or model calls."""
import csv
import json
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parent
CHECKED = '2026-10-21'

# Source status applies only to the fact described, not stock, popularity or product support.
SOURCES = {}
def source(key, url, status='opened', kind='publisher_product', note=''):
    SOURCES[key] = dict(source_id=key, url=url, access_status=status, source_kind=kind,
                        checked_at=CHECKED, evidence_note=note)

source('bga2025', 'https://br.boardgamearena.com/news?id=1025', kind='platform_usage_report', note='2026-01-09 발표, 집계 기간 2025년. 온라인 이용이며 한국 실물 판매량이 아님.')
source('redbutton', 'https://redbutton.co.kr/boardgame/보드게임-찾기/', kind='korean_cafe_selection', note='한국어 페이지 월간 Best 10에 이름 확인. 대상 월·선택 건수·산식은 미표시. 영문 페이지와 목록이 달라 한국어 페이지만 사용.')
source('bgg', 'https://boardgamegeek.com/browse/boardgame?sort=rank', 'search_index_only_live_403', 'community_ranking', '한 차례 검색 색인에서 상위 제목 일부 확인. 본문 403 이후 수집 중단. 현재 순위·평가수·소장수는 모두 null; 순위표 복제·bulk 수집 없음.')
source('catan', 'https://www.catan.com/catan', 'search_index', note='6판 기본판 3–4명, 60–90분.')
source('carc', 'https://www.zmangames.com/game/carcassonne/', 'search_index', note='기본판 2–5명, 30–45분. Big Box의 6인 수치를 사용하지 않음.')
source('ticket', 'https://www.daysofwonder.com/game/ticket-to-ride/', note='북미 기본판 2–5명, 30–60분.')
source('azul', 'https://store.asmodee.com/products/azul', 'opened', 'official_distributor_product', '기본판 2–4명, 평균 45분. 다른 출처의 30분을 합쳐 범위를 만들지 않음.')
source('splendor', 'https://store.asmodee.com/products/splendor', 'opened', 'official_distributor_product', '현행 아트 기본판 2–4명, 평균 30분.')
source('seven', 'https://www.rprod.com/en/games/7-wonders', 'search_index', note='3–7명, 30분. 출판사 누적 판매/수상 설명은 기준일 미표시라 비교 수치로 사용하지 않음.')
source('sm', 'https://store.stonemaiergames.com/products/wingspan', kind='publisher_catalog_navigation', note='Games 탐색 목록에서 해당 기본 게임 이름 확인. 품절·출판 중단 여부까지 확인한 것은 아님.')
source('wingspan', 'https://store.stonemaiergames.com/products/wingspan', note='1–5명. 상품 요약 40–70분, 설명 40–90분으로 불일치. 본문 범위와 불일치 메모 함께 보존.')
source('scythe', 'https://store.stonemaiergames.com/products/scythe', note='1–5명, 약 115분.')
source('viticulture', 'https://store.stonemaiergames.com/products/viticulture-essential-edition', note='Essential 기본판 1–6명, 45–90분.')
source('wyrmspan', 'https://store.stonemaiergames.com/products/wyrmspan', note='1–5명, 90분.')
source('apiary', 'https://store.stonemaiergames.com/products/apiary', note='1–5명, 60–90분.')
source('everdell', 'https://www.asmodee.co.uk/products/tabstg2680-everdell-essentials-edition', kind='official_distributor_product', note='Essentials, 1–4명, 40–80분. 구성 재질 차이 설명 확인.')
source('arknova', 'https://capstone-games.com/products/ark-nova', 'search_index', note='1–4명, 90–150분.')
source('mars', 'https://fryxgames.se/product/terraforming-mars/', 'search_index', note='1–5명, 90–120분.')
source('dune', 'https://www.asmodee.co.uk/products/dwd01015-dune-imperium-uprising', kind='official_distributor_product', note='독립 실행 가능. 1–4명 또는 6인 팀전; 5인을 포함한 연속 1–6명으로 해석하지 않음. 60–120분.')
source('brass', 'https://roxley.com/products/brass-birmingham?currency=GBP', 'search_index', note='2–4명, 60–120분.')
source('lookout', 'https://www.lookout-spiele.de/en/games.php', kind='publisher_catalog', note='기본판·확장·구판이 함께 있는 목록. 이 카탈로그는 별도 기본판만 선정하며 재고는 미확인.')
source('agricola', 'https://www.lookout-spiele.de/en/games/agricolare.html', note='2016 개정 기본판 1–4명, 약 90분. 구판 1–5명과 차이 명시.')
source('caverna', 'https://www.lookout-spiele.de/en/games/caverna.html', note='1–7명, 인당 약 30분. 전체 시간 범위로 임의 환산하지 않음.')
source('grand', 'https://www.lookout-spiele.de/en/games/grandaustriahotel.html', note='2–4명, 약 90분.')
source('patchwork', 'https://www.lookout-spiele.de/en/games/patchworkre.html', note='Revised Edition, 2명, 30분.')
source('cge', 'https://www.czechgames.com/our-games', kind='publisher_catalog', note='공식 Most Popular Games 표시: Codenames, Arnak, Galaxy Trucker, SETI. 판매량 순위는 아님.')
source('arnak', 'https://www.czechgames.com/games/lost-ruins-of-arnak', note='1–4명, 인당 30분.')
source('seti', 'https://www.czechgames.com/games/seti-search-for-extraterrestrial-intelligence', note='1–4명, 인당 40분.')
source('root', 'https://ledergames.com/products/root-a-game-of-woodland-might-and-right', note='2–4명, 60–90분. 기본 4세력만.')
source('spirit', 'https://shop.greaterthangames.com/products/spirit-island', 'prior_research_2026-10-20', note='기존 long-games manifest: 상품 100분, 출판사 연결 CORE 규칙 표지 90–120분·1–4명. 이번에는 그 기록 재사용.')
source('pandemic', 'https://www.zmangames.com/game/pandemic/', 'search_index', note='2–4명, 45분.')
source('jaws', 'https://cephalofair.com/products/gloomhaven-jaws-of-the-lion', 'search_index', note='독립 기본 게임, 1–4명, 1–2시간.')
source('frost', 'https://cephalofair.com/collections/board-games/products/frosthaven-bundles', 'search_index', note='독립 기본 게임, 1–4명, 2–3시간; 캠페인 총시간이 아님.')
source('arkham', 'https://www.fantasyflightgames.com/product/arkham-horror-the-card-game/', note='현재 AHC100 Chapter Two 기본판, 1–4명·60–120분. 기존 연구 AHC60(2021)과 별도 판본.')
source('ti4', 'https://www.fantasyflightgames.com/product/twilight-imperium-fourth-edition/', note='4판 기본판 3–6명·240–360분.')
source('burgundy', 'https://awakenrealms.com/games/awaken-realms/castles-of-burgundy', 'search_index', note='Special Edition 상품 1–4명·70–120분. 번들 확장을 초기 범위로 포함하지 않음.')
source('aeg', 'https://www.alderac.com/our-games/', kind='publisher_catalog', note='기본 게임 목록에서 이름 확인. 공개 규칙·인원·시간은 각 항목별 확인 상태를 따름.')
source('repos', 'https://www.rprod.com/en/games', kind='publisher_catalog', note='기본판과 독립 게임만 사용. Retrospective 표시는 현행 판매 보증이 아님.')
source('duel', 'https://www.rprod.com/fr/press/7-wonders-duel', 'search_index', note='독립 2인 게임, 30분.')
source('direwolf', 'https://www.direwolfdigital.com/support/', 'search_index', 'publisher_rules_hub', 'Clank! Catacombs 등 개별 규칙 제목 확인. 확장 규칙은 범위 제외.')
source('dow', 'https://www.daysofwonder.com/game/', kind='publisher_catalog', note='Heat, Five Tribes, Small World 등 기본 게임 링크 확인. 확장 제외.')
source('smallworld', 'https://www.daysofwonder.com/game/small-world/', note='2–5명, 40–80분.')
source('gaia', 'https://capstone-games.com/products/gaia-project/', 'search_index', note='1–4명, 60–150분.')
source('terra', 'https://capstone-games.com/products/terra-mystica', 'search_index', note='2–5명, 60–150분. 현행 상품 페이지는 품절 표시; 국내 재고 미확인.')
source('gwt', 'https://store.asmodee.com/products/great-western-trail', 'search_index', 'official_distributor_product', '2판 기본판 설명 확인. 수치는 후속 확인.')
source('rio', 'https://www.riograndegames.com/', 'search_index_live_403', 'publisher_catalog', '공식 검색 색인의 Popular Games: Dominion, Power Grid Recharged, Race for the Galaxy, Concordia 등. 본문 접근은 403이라 우회하지 않음.')
source('dominion', 'https://www.riograndegames.com/games/dominion/', 'search_index', note='RIO531 기본판 2–4명. 상단 <30분/본문 20–30분, 본문 범위 채택. 재입고 표시는 기준일 불명.')
source('orleans', 'https://www.dlp-games.de/en/spiele/orleans', 'search_index', note='현행 8쇄 이후 2–5명, 90분. 구판 2–4명과 다르므로 인원/구성 혼합 금지.')
source('wotr', 'https://www.aresgames.eu/games/war-of-the-ring-line/war-of-the-ring-second-edition', 'prior_search_index_live_403', note='기존 연구 2026-10-20: 공식 색인 2–4명, 120분 이상. 본문/PDF 미확보.')
source('rebellion', 'https://www.fantasyflightgames.com/product/star-wars-rebellion/', 'search_index', note='2–4명, 180–240분.')
source('mage', 'https://wizkids.com/mage-knight/', 'prior_research_2026-10-20', note='원 기본판 1–4명, 1–4시간. UE의 1–5명/확장 포함 자료와 분리.')
source('awaken', 'https://awakenrealms.com/our-games', 'search_index', 'publisher_catalog', 'Nemesis 등 독립 기본 게임 이름 확인. 후속작/확장은 자동 포함하지 않음.')
source('ffg', 'https://www.fantasyflightgames.com/productline/other-games/', kind='publisher_catalog', note='Core Game 표기된 개별 작품 및 별도 제품군 확인. 현행 재고는 미확인.')
source('eldritch', 'https://www.fantasyflightgames.com/product/eldritch-horror/', 'search_index', note='1–8명, 120–240분.')
source('eclipse', 'https://en.lautapelit.fi/product/24681/eclipse---2nd-dawn-for-the-galaxy', 'search_index', note='2판 기본판 2–6명, 60–240분. 2011판을 대체하는 2020판 명시.')
source('anachrony', 'https://us.shop.mindclashgames.com/product/anachrony-essential-edition/', 'search_index', note='Essential은 기본판만, 2–4명. 솔로/미니어처/확장 없음 명시.')
source('indie', 'https://indieboardsandcards.com/', 'search_index', 'publisher_catalog', 'Aeon’s End, Coup, The Resistance 제품군 확인. 개별 판본/인원/시간 별도 확인 필요.')
source('paleo', 'https://www.zmangames.com/game/paleo/', 'search_index', note='2–4명, 45–60분.')
source('age', 'https://capstone-games.com/products/age-of-innovation/', 'search_index', note='독립 기본 게임 제품 확인. Terra Mystica 확장으로 계산하지 않음.')
source('barrage','https://www.asmodee.co.uk/products/cga19001-barrage','search_index','official_distributor_product','기본판 1–4명,60–120분.')
source('odin','https://store.asmodee.com/products/a-feast-for-odin','search_index','official_distributor_product','현행 상품은 대체 2인 보드와 일부 미니 확장 동봉;이번은 기본 모드만. 세부 수치 미확인.')
source('robinson','https://shop.portalgames.pl/robinson-crusoe-adventures-on-the-cursed-island','search_index',note='영어 상품 1–4명,60–120분. 폴란드어 페이지 요약과 불일치해 영어판 기준 명시.')
source('legacy','https://www.zmangames.com/game/pandemic-legacy-season-1/','search_index',note='2–4명,60분. Red/Blue 표지는 달라도 내용 동일.')
source('arcs','https://ledergames.com/pages/how-to-play-arcs','search_index','publisher_rules_hub','현행 2–4인 설명 확인. 2022년 개발 일지의 3–4인 캠페인 수치를 가져오지 않음.')
source('kanban','https://www.eagle-gryphon.com/products/kanban-ev?_fid=813f31705&_pos=95&_ss=c','search_index',note='기본판1–4명,90–120분. 품절 표시;단종은 미확인.')
source('quacks','https://www.schmidtspiele.de/detail/product/the-quacks-of-quedlinburg.html','search_index',note='원작 기본판2–4명,45분. Duel과 구분.')
source('cats','https://www.asmodee.co.uk/products/tcok625-the-isle-of-cats','opened','official_distributor_product','기본판1–4명. Late Arrivals가 필요한6인을 기본판 수치에 넣지 않음. 시간 미확인.')
source('kingdomino','https://www.blueorangegames.com/games/king-domino','search_index',note='기본판2–4명,15분.')
source('sagrada','https://floodgategames.com/Sagrada/Sagrada-Rules-Floodgate-Games-SA01.pdf','search_index','publisher_rules_pdf','기본판 규칙 표지1–4명·30–45분을 검색 색인에서 확인;현행 인쇄는 미확인.')
source('akropolis','https://en.gigamic.com/games-for-family/1115-product.html','search_index',note='1–4명,25분. 공식 페이지 수상 기록은 인기의 보조 신호.')
source('stone','https://www.hans-im-glueck.de/en/game/stone-age-2/','search_index',note='출판사 현행 상품:2–4명,60–90분. 개정 설명과 규칙 다운로드 링크.')
source('dixit','https://www.libellud.com/game/dixit/','search_index',note='기본판과 언어별 규칙 링크. Odyssey/Disney/추가 카드 제외.')
source('scout','https://oinkgames.com/en/games/analog/scout/','search_index',note='2–5명,20분. 공식 SdJ 후보 표기.')
source('six','https://www.amigo-spiele.de/6-nimmt_4910_1124','search_index',note='원작 카드게임 상품 확인;동명 보드판/기념판 혼용 안 함.')
source('crew','https://thamesandkosmos.com/products/the-crew-mission-deep-sea','search_index',note='독립 Mission Deep Sea 상품 확인. 시간/인원 직접 확인 전.')
source('hanabi','https://abacusspiele.de/wp-content/uploads/2021/01/Hanabi_Regel.pdf','search_index','publisher_rules_pdf','원작 규칙 공개. 현행 인쇄/시간·인원은 미확인.')
source('love','https://www.zmangames.com/game/love-letter/','search_index',note='현행2–6명,20분. 구16장 판과 구성 다름.')
source('cockroach','https://www.schmidtspiele.de/detail/product/cockroach-poker.html','search_index',note='원작2–6명,30분. Royal과 구분.')
source('skull','https://store.asmodee.com/products/skull','search_index','official_distributor_product')
source('dobble','https://store.asmodee.com/products/spot-it-classic-eco-sleeve-ml','search_index','official_distributor_product','2–8명,15분 이하. Spot It!/Dobble 같은 게임의 지역명.')
source('monopoly','https://instructions.hasbro.com/en-us/instruction/monopoly-board-game-for-ages-8-for-2-6-players-includes-8-tokens-tokens-may-vary','search_index','publisher_rules_hub','Classic2–6인 제품. 공식 시간 미확인.')
source('bohnanza','https://www.amigo.games/wp-content/uploads/2024/10/Bohnanza-25th-Front-Cover.pdf','search_index','publisher_rules_pdf','25주년판에 기본 게임과 확장이 함께 있다고 명시. 이번은 기본 게임만;2–7인/45분 번들 수치는 적용하지 않음.')
source('lostcities','https://www.thamesandkosmos.com/manuals/full/691821_LC_Card_Game.pdf','search_index','publisher_rules_pdf','Original Card Game 2인 확인;보드게임/4인 변형 제외.')
source('jaipur','https://store.asmodee.com/collections/family-games/products/jaipur','search_index','official_distributor_product','현재 아트2인 기본판,30분.')
source('res','https://sandcastle-games.com/res-arcana','search_index',note='2–4명,30–45분. 개인 유물8장 설명 확인.')
source('starrealms','https://www.starrealms.com/sets-and-expansions/','search_index','publisher_catalog','원 Core Set2인과4인 Box Set/Gambit 구성 분리.')
source('machi','https://pandasaurusgames.com/products/machi-koro','search_index',note='5주년판2–4명,30분. 출판사100만부 누적 주장 기준일 미확인.')
source('tokyo','https://iellogames.com/jeux/king-of-tokyo/','opened',note='공식 원작 페이지:2–6명,30분. 페이지 발매 표기2016-06-17,규칙 링크 제공;국내 현행 인쇄와는 별개.')
source('splendor-duel','https://store.asmodee.com/products/splendor-duel','search_index','official_distributor_product','독립2인 게임,5×5보석 격자. 시간 확인 전.')
source('gloomhaven','https://cephalofair.com/collections/board-games-expansions/products/gloomhaven-board-game-2nd-edition','search_index',note='2판 제품 확인,1–4명·1–2+시간. 완결 번들 페이지2–3시간과 차이;임의 상한 확정 안 함.')
source('sleeping','https://www.redravengames.com/sleeping-gods/','opened',note='현재 공식 소개 1–4명,90분. 별도 본문의10–20시간은 전체 캠페인 시간으로 분리;중간 저장 가능 설명.')
source('outerrim','https://www.fantasyflightgames.com/genre/star-wars/','search_index','publisher_catalog','Star Wars: Outer Rim Core Game 항목 확인.')
source('twilight','https://www.gmtgames.com/p-927-twilight-struggle-deluxe-edition-8th-printing.aspx','search_index',note='Deluxe8쇄,2인. 상세시간 확인 전.')
source('throughages','https://www.czechgames.com/games/through-the-ages-a-new-story-of-civilization','search_index',note='신판 기본판,120분 이상. 정확 인원 확인 전.')
source('dominant','https://www.gmtgames.com/p-909-dominant-species-6th-printing.aspx','search_index',note='원 보드판6쇄,2–6명. Card Game/Marine과 구분.')
source('hansa','https://pegasus.de/en/Hansa-Teutonica-Big-Box/55148G','search_index',note='3–5명,45–90분. Big Box의 기본 지도 모드만 선정.')
source('ludwig','https://beziergames.com/products/castles','search_index',note='원 기본판1–4명. Collector5인은Towers 확장 필요라 적용하지 않음.')
source('istanbul','https://pegasus.de/en/Istanbul-Big-Box/55119G','search_index',note='기본판+두 확장 번들 존재. 기본판 수치를 번들 범위로 대체하지 않음.')
source('underwater','https://www.riograndegames.com/games/underwater-cities/','search_index',note='1–4인. 상단90–120분,본문인당30–45분;상단과본문 모두 메모. 직접 본문 접근은 하지 않음.')
source('voidfall','https://us.shop.mindclashgames.com/','search_index','publisher_catalog','Retail/Standard Edition 현행 판매 목록 확인.')
source('halli','https://blog.amigo-spiele.de/halli-galli-reihe/','search_index','publisher_catalog','Halli Galli 공식 제품군;Classic 인원/시간 미확인.')
source('blokus','https://shop.mattel.com/products/blokus-game-bjv44?bvstate=pg%3A2%2Fct%3Ar&currency=USD&variant=41289737896101','search_index',note='Classic 기본판2–4인. 상품의 less than a minute는 학습시간이므로 플레이시간에 사용하지 않음.')

# Compact authored research rows: ID | Korean title | English title | edition | priority |
# state family | proposed mode | proposed saved elements | selection rationale | edition/limit note | source ID
ROWS = '''
catan|카탄|CATAN|6판 기본판|P1|network_map|C|지형·숫자·도로·건물·항구;소유색;자원·개발카드;차례|기존 구현 기준점과 가족 전략의 긴 중단 기록|5판 등 구판은 같은 게임 ID 아래 판본별 아트·항구 배치를 확인;확장 제외|catan
carcassonne|카르카손|Carcassonne|현행 기본판|P1|tile_layout|B|타일 방향·연결;추종자 위치;점수;남은 말|많은 타일을 다시 맞추는 저장 가치와 넓은 이용층|Big Box/강·수도원장 등 동봉 모듈은 기본 규칙 범위와 별도 표시|carc
ticket-to-ride|티켓 투 라이드|Ticket to Ride|북미 기본판|P1|network_map|B|노선·열차색;점수;열차·목적지 손패;차례|노선과 비밀 목적지를 함께 저장하는 가족 전략 대표|유럽은 독립 실행 지도 게임이며 이번 120종에 별도 계수하지 않음;북미 슬롯과 호환 주장 안 함|ticket
azul|아줄|Azul|원작 기본판|P1|player_grid|B|개인 벽·패턴 줄;공용 타일;바닥 줄;라운드|짧지만 이용 신호가 강하고 격자 사진 정정에 적합|미니·언어판은 같은 게임;다른 Azul 독립작 자동 포함 안 함|azul
splendor|스플렌더|Splendor|현행 기본판|P1|card_tableau|A|공개 시장;보유 카드·토큰;예약 카드;차례|국내 카페 이용 근거와 간단한 개인 보유 기록|리프레시 아트는 같은 게임 판본;Duel은 독립 게임으로 별도 행|splendor
seven-wonders|세븐 원더스|7 Wonders|2판 기본판|P1|card_tableau|A|문명별 공개 카드;불가사의 단계;동전;현재 시대·손패|인원수가 많아도 공개/개인 기록 분리가 유용|1판 카드/기호 차이;확장·Architects 제외|seven
wingspan|윙스팬|Wingspan|현행 기본판·Swift Start 포함 상품|P1|card_tableau|B|서식지별 카드;알·먹이;개인 손패;라운드·행동 큐브|개인판에 누적되는 상태를 보존하는 대표|확장 새/해양/아시아 제외;Swift Start 사용 여부 메모|wingspan
everdell|에버델|Everdell|Essentials 기본판 기준|P1|card_tableau|A|도시 카드;일꾼;자원;계절;개인 손패|공용 판과 개인 도시가 동시에 넓어지는 저장 유형|Standard와 재질·아트 차이 확인;Collector 추가 카드 제외|everdell
ark-nova|아크 노바|Ark Nova|기본판|P1|player_grid|B|동물원 개인판;카드 배열;행동 카드 순서;자원·트랙;휴식|긴 실제 이용 신호와 복수 개인판 복원 가치|Marine Worlds 등 확장 제외;새 지도/프로모 별도|arknova
terraforming-mars|테라포밍 마스|Terraforming Mars|기본판|P1|engine_euro|B|화성 타일;생산·자원;공개 프로젝트;기업;손패·세대|공식 긴 시간과 공용판·개인 자원 이중 기록|Prelude·모든 지도/프로모 제외;Ares는 별도 작품|mars
dune-imperium-uprising|듄 임페리움: 업라이징|Dune: Imperium – Uprising|독립 기본판|P1|engine_euro|B|일꾼·스파이;병력;영향력;덱 구역;음모·라운드|긴 전략과 보드/카드 혼합 상태 대표|원작 Imperium의 확장을 요구하지 않음;초기 1–4인 모드 권장;6인 팀전 별도|dune
brass-birmingham|브라스: 버밍엄|Brass: Birmingham|Retail 기본판|P1|network_map|B|산업·운하·철도;뒤집힌 타일;수입·돈;손패;시대|망 배치와 개인 경제를 함께 잃기 쉬운 긴 게임|Deluxe는 아트/재질 차이 메모;Lancashire는 별개 게임|brass
agricola|아그리콜라|Agricola|2016 Revised 기본판|P1|engine_euro|B|농장 칸;가족·동물·작물;직업·설비;라운드|개인 격자와 공용 일꾼을 함께 저장|구판 5인과 개정판 4인 구분;추가 직업 덱 제외|agricola
viticulture|비티컬처|Viticulture|Essential Edition 기본판|P1|engine_euro|B|일꾼;포도밭·와인 값;방문객·주문;계절·순서|개인 자산의 값과 공용 행동 위치를 함께 기록|Tuscany Essential은 확장으로 제외;구판과 포함 카드 차이|viticulture
scythe|사이드|Scythe|기본판|P1|network_map|B|지도 유닛·자원;개인판 업그레이드;트랙;전투·목표 카드|긴 지도 점유와 개인판 기록의 결합|확장 세력·캠페인 제외;Expeditions는 독립작|scythe
root|루트|Root|기본 4세력|P1|network_map|B|지도 점유;세력별 개인판;말·건물;손패·차례|비대칭 공개 상태를 사진으로 남기는 대표|모든 세력 규칙 엔진 목표 아님;확장 세력 제외|root
spirit-island|정령섬|Spirit Island|기본판|P1|cooperative|B|섬 보드·중첩 토큰;정령판;능력 카드;침략자/공포 구역|협력 중단의 복수 보드·카드 구역을 보존|Branches 등 확장·추가 정령 제외;덱 내부 순서 사진 추정 금지|spirit
pandemic|팬데믹|Pandemic|기본판|P1|cooperative|B|질병 큐브;인물·시설;치료·확산 트랙;손패·덱|짧은 편이어도 중단 시 공용 상태의 밀도가 높음|Legacy는 별도 독립 게임;솔로 변형 제외|pandemic
gloomhaven-jaws|글룸헤이븐: 사자의 턱|Gloomhaven: Jaws of the Lion|독립 기본판|P1|campaign|C|시나리오 책 펼침;인물·적 상태;카드 구역;캠페인 메모|긴 협력 입문작으로 전투/시나리오 사이 저장 비교|원작 Gloomhaven 불필요;전체 카드 효과 해석 없이 사진·수동 값|jaws
frosthaven|프로스트헤이븐|Frosthaven|독립 기본판|P1|campaign|C|현재 시나리오;인물·적·상태;카드 구역;달력·전초기지 메모|여러 시간 및 장기 캠페인의 중단 가치|우선 시나리오 사이 기록;전투 중 완전 복원·미공개 책 해독 보장 안 함|frost
arkham-lcg|아컴호러 카드게임|Arkham Horror: The Card Game|2026 Chapter Two 기본판 AHC100|P1|campaign|C|장소·부착·소진;피해·공포;덱 구역;개인 손패;캠페인 메모|회전·부착·비밀 보유를 함께 다루는 긴 협력 카드 게임|기존 연구 AHC60 2021판은 별도 프로필;기본 상자 밖 카드 무한 지원 안 함|arkham
twilight-imperium-4|트와일라잇 임페리움 4판|Twilight Imperium: Fourth Edition|4판 기본판|P1|network_map|C|시스템 타일;함대·행성 소유;활성화;기술·목표·개인 카드;라운드|공식 4–6시간으로 긴 세션 저장의 핵심 대표|Prophecy of Kings 및 추가 콘텐츠 제외;초기 공용 사진+수동 개인 기록|ti4
lost-ruins-arnak|아르낙의 잊혀진 유적|Lost Ruins of Arnak|기본판|P1|engine_euro|B|유적·일꾼;연구 트랙;자원;덱 구역;라운드|공식 인기 표시와 카드/일꾼 혼합 대표|확장 리더/탐험 제외;시간은 인당 표기를 그대로 보존|arnak
castles-burgundy|버건디의 성|The Castles of Burgundy|Special Edition 기본 모드|P1|player_grid|B|개인 육각판;보관 타일;주사위;시장;라운드·점수|개인 자리 정정과 공용 시장의 저장 가치|상품에 포함된 Vineyards 등 확장은 초기 제외;구판 아트·번호 재확인|burgundy
cascadia|캐스캐디아|Cascadia|기본판|P2|tile_layout|B|서식지 타일·동물;시장;자연 토큰;남은 차례|복수 개인 타일판을 간단한 프로필로 기록|Landmarks 등 확장 제외|aeg
patchwork|패치워크|Patchwork|Revised Edition|P2|player_grid|B|개인 퀼트;시간 말;단추;공용 조각 순서|짧아도 배치를 다시 놓기 어려운 2인 비교군|테마·기념판은 별도 지원 수로 세지 않음|patchwork
rummikub|루미큐브|Rummikub|Classic 기본 세트|P2|tile_layout|A|테이블 숫자 조합;개인 받침 타일;차례|국내 월간 선택 근거와 비밀 받침 기록|세트 크기·타일 디자인 확인;3D 받침 뒤 타일 자동 추정 금지|redbutton
clue|클루|Clue / Cluedo|현행 Classic 기본판|P2|hidden_information|A|인물 위치;개인 카드·추리 메모;차례|국내 카페 이용 근거와 개인 비밀 기록|구판 방/인물/아트 차이;봉투 내용은 스캔으로 알아내지 않음|redbutton
seven-wonders-duel|세븐 원더스 대결|7 Wonders Duel|기본판|P2|card_tableau|B|공개·덮인 카드 층;불가사의;토큰·트랙|짧지만 덮인 카드 겹침과 2인 상태가 유용|7 Wonders 확장이 아닌 독립작;Pantheon/Agora 제외|duel
clank-catacombs|클랭크! 카타콤|Clank! Catacombs|독립 기본판|P2|tile_layout|B|던전 타일;인물;소음 큐브;전리품;덱 구역|변하는 지도와 개인 덱이 결합된 저장 가치|원작 Clank 보드·후속 확장과 혼용 안 함|direwolf
heat|히트: 질주의 열기|Heat: Pedal to the Metal|기본판|P2|network_map|B|차량 위치;기어;손패·열·버림;랩|공식 현행 대표 레이싱의 위치/개인 카드 기록|추가 서킷·추가 플레이어 확장 제외|dow
caverna|카베르나|Caverna: The Cave Farmers|기본판|P2|engine_euro|B|동굴·농장;가족·무기;동물·자원;라운드|인원 증가와 많은 개인 타일판에 따른 저장 가치|Forgotten Folk 제외;시간은 인당 약 30분|caverna
gaia-project|가이아 프로젝트|Gaia Project|기본판|P2|network_map|B|우주 지도·건물;세력판;기술·파워·자원;라운드|긴 전략의 지도/개인 자산 기록|Lost Fleet 제외;Terra Mystica와 독립 기본판|gaia
terra-mystica|테라 미스티카|Terra Mystica|기본판|P2|network_map|B|지형·건물;세력판;파워·종교 트랙;라운드|공개 상태가 넓게 누적되는 전략 대표|Fire and Ice 등 확장 제외;현행 페이지 품절은 단종 확정 아님|terra
great-western-trail|그레이트 웨스턴 트레일|Great Western Trail|2판 기본판|P2|engine_euro|B|건물·열차·목동;개인판;소 덱·자원|긴 순환 경로와 개인 덱의 중단 기록|Argentina/New Zealand/El Paso는 별도 작품;이번 목록 미계수|gwt
barrage|바라지|Barrage|기본판|P2|network_map|B|댐·도관·발전소;물;건설 휠;개인 자원|지형 위 연결과 공용/개인 부품 복원 가치|Leeghwater 등 확장 제외;연결 계산은 선택 확장|barrage
concordia|콩코르디아|Concordia|기본판|P2|network_map|B|도시 건물;이동 말;창고;개인 카드;차례|긴 지도 경제와 카드 순서를 남기는 유형|Venus 독립판/확장 구분;초기 원 기본판만|rio
orleans|오를레앙|Orléans|현행 8쇄 이후 기본판|P2|engine_euro|B|개인 일꾼 배치;여행 지도;개발 트랙;주머니·자원|주머니와 여러 개인 구역의 중단 기록|구 2–4인판과 현행 2–5인판 구분;주머니 내부는 수동/모름|orleans
power-grid|파워그리드|Power Grid|Recharged 기본판|P2|network_map|B|도시망;발전소;자원;돈;시장·단계|긴 경제 게임의 공개망과 개인 자원|구판·지역 지도 차이;모든 지도 자동 지원 아님|rio
grand-austria-hotel|그랜드 오스트리아 호텔|Grand Austria Hotel|기본판|P2|engine_euro|B|호텔 객실;손님·직원;음식;주사위 풀;라운드|개인 격자와 카드 부착형 기록|Deluxe 구성/Let's Waltz 확장 별도|grand
le-havre|르 아브르|Le Havre|기본 게임 모드|P2|engine_euro|A|건물 소유;자원;선박;일꾼;라운드|공개 건물과 수량이 많이 누적되는 경제 게임|현행 번들 내 추가 카드 포함 여부 확인|lookout
a-feast-for-odin|오딘을 위하여|A Feast for Odin|기본판|P2|player_grid|B|개인 퍼즐판;일꾼;상품;섬·카드;라운드|많은 개인 조각의 위치 보존 가치|Norwegians 등 확장 제외|odin
war-of-the-ring-2|반지전쟁 2판|War of the Ring: Second Edition|WOTR001 기본판|P2|network_map|C|지도 군대;요새;원정대;주사위;비밀 카드|긴 대결과 공개/비밀 상태의 저장 가치|기본 2인 우선;공식 색인 2–4인 변형·본문 접근 미확인|wotr
star-wars-rebellion|스타워즈: 리벨리온|Star Wars: Rebellion|기본판|P2|network_map|C|함대·지상군;리더;트랙;임무·비밀 기지|공식 3–4시간과 비대칭 비밀 정보|기본 2인 우선·4인 팀전 별도;확장 제외|rebellion
mage-knight|메이지 나이트|Mage Knight Board Game|원 기본판 모드|P2|tile_layout|C|탐험 타일;인물·부대;손패·덱 구역;마나;낮밤|긴 솔로/협력의 순서와 많은 상태|UE 구매 구성의 확장은 제외;UE 1–5인 수치를 원판에 적용 안 함|mage
nemesis|네메시스|Nemesis|원 기본판|P2|hidden_information|C|함선 방;인물·침입자;소음·고장;목표·손패|큰 판과 비밀 목적이 결합된 중단 기록|Lockdown/Retaliation은 독립 후속작으로 이번 목록 미계수|awaken
robinson-crusoe|로빈슨 크루소: 저주받은 섬의 모험|Robinson Crusoe: Adventures on the Cursed Island|현행 기본판 모드|P2|cooperative|B|섬 타일;캠프;인물 상태;발명·자원;시나리오·라운드|협력 생존의 다수 토큰과 시나리오 맥락|Collector 번들 추가 시나리오/확장 제외|robinson
pandemic-legacy-1|팬데믹 레거시: 시즌 1|Pandemic Legacy: Season 1|시즌 1 기본 상자|P2|campaign|C|변경된 판;현재 질병;인물;공개 캠페인 기록;덱 구역|영구 변경과 세션 중단 상태를 함께 보존|Red/Blue는 한 게임;시즌 0·2는 별개로 이번 목록 미계수|legacy
marvel-champions|마블 챔피언스 카드게임|Marvel Champions: The Card Game|Core Set|P2|cooperative|C|히어로·빌런;부착 카드;토큰;덱/버림/손패|공용 적과 개인 카드의 여러 구역 기록|기본 상자 카드만;모든 히어로·시나리오 팩 지원 아님|ffg
lotr-lcg|반지의 제왕 카드게임|The Lord of the Rings: The Card Game|Revised Core Set|P2|cooperative|C|영웅·동료;임무·적;소진·위협;덱 구역|회전·부착과 개인 자원 기록 재사용|구 Core 구성과 개정판 차이;추가 사이클 제외|ffg
eclipse-second-dawn|이클립스: 두 번째 여명|Eclipse: Second Dawn for the Galaxy|2판 기본판|P2|network_map|B|우주 타일;함대;영향력;기술·경제;라운드|공식 긴 범위와 많은 개인 부품|2011판과 2020판 배치/컴포넌트 호환 미검증|eclipse
arcs|아크스|Arcs|기본판|P2|network_map|B|시스템·함대;자원;궁정 카드;야망;장·손패|공용 지도와 개인 카드의 비교적 작은 전략 프로필|Blighted Reach 캠페인은 확장으로 제외|arcs
anachrony|아나크로니|Anachrony|Essential Edition|P2|engine_euro|B|일꾼·외골격;건물;자원;시간선;라운드|큰 개인판과 시간선 위 기록|Essential은 2–4인 기본판만;솔로 모드 자동 포함 안 함|anachrony
kanban-ev|칸반 EV|Kanban EV|기본판|P2|engine_euro|B|공장 위치;개인 보드;차량·설계;회의·트랙|긴 경제 게임의 많은 개인 자산과 단계|Driver's Edition과 슬롯/아트 혼용 안 함|kanban
wyrmspan|웜스팬|Wyrmspan|기본판|P2|card_tableau|B|동굴·드래곤;탐험 말;자원;손패·라운드|개인판 엔진 계열에 같은 UI 재사용|윙스팬 확장이 아닌 독립 게임;Dragon Academy 제외|wyrmspan
quacks|크베들린부르크의 돌팔이 약장수|The Quacks of Quedlinburg|기본판|P2|player_grid|B|냄비 칩;주머니;점수·루비;라운드|라운드가 길지 않아도 칩 배치/개인 비밀 보존|Big Box 안 확장 제외;주머니 내부 자동 추정 금지|quacks
isle-of-cats|아일 오브 캣|The Isle of Cats|기본판|P2|player_grid|B|배 격자;고양이·보물;카드;자원·라운드|퍼즐 개인판에 놓인 많은 조각 저장|가족/표준 모드를 메모;확장 제외|cats
dominion|도미니언|Dominion|2판 기본판 RIO531|P2|card_tableau|A|왕국 시장;개인 덱·버림·손패;차례;선택적 점수 메모|짧지만 널리 알려진 덱 구역 대표|덱 내부 순서·카드 효과를 사진만으로 복원한다고 하지 않음|dominion
forest-shuffle|포레스트 셔플|Forest Shuffle|원작 기본판|P2|card_tableau|A|나무·겹친 동물 카드;개인 손패;공용 카드|카드의 부분 겹침과 방향 보존에 유용|Dartmoor 등 독립 후속작·확장 제외|lookout
eldritch-horror|엘드리치 호러|Eldritch Horror|기본판|P2|cooperative|C|세계 지도;조사자·적;전조·파멸;카드 부착;손패|공식 2–4시간의 큰 협력 게임|추가 보드/고대신 확장 제외|eldritch
kingdomino|킹도미노|Kingdomino|기본판|P3|tile_layout|B|개인 왕국;도미노 순서;왕 말|입문 타일 게임의 폭넓은 후보|짧은 중단 가치로 요청 후 우선화;Origins 별개|kingdomino
sagrada|사그라다|Sagrada|기본판|P3|player_grid|B|창문 주사위;목표;도구;라운드|색·눈금·개인 격자 비교 후보|확장 제외;작은 주사위 눈금 인식 미검증|sagrada
calico|칼리코|Calico|기본판|P3|player_grid|B|퀼트 타일;단추·고양이;개인 손타일|촘촘한 개인 패턴 기록|표면 패턴 판독 난도 미검증|aeg
akropolis|아크로폴리스|Akropolis|기본판|P3|tile_layout|B|개인 도시 타일;층 높이;자원|입체 겹침 보존을 보는 가족 후보|사진 하나의 층 높이 추정 한계;확장 제외|akropolis
stone-age|스톤 에이지|Stone Age|기본판|P3|engine_euro|B|일꾼;자원;건물·카드;개인판|일꾼 프로필을 재사용할 고전 전략|기념판은 동일 게임;Winter 모드 별도|stone
codenames|코드네임|Codenames|현행 단어 기본판|P3|hidden_information|A|단어 격자;공개 색;힌트 메모;비밀 키|공식 인기 표시가 있으나 한 판이 짧음|팀장 키를 공용으로 공개하지 않음;Duet/Pictures 별도|cge
davinci-code|다빈치코드|Da Vinci Code / Coda|기본판|P3|hidden_information|A|개인 숫자 타일 순서;공개 여부;차례|국내 카페 선택 근거가 있는 간단 비밀 기록|비밀 숫자는 소유자 입력;통용 한글명 사용|redbutton
avalon|레지스탕스: 아발론|The Resistance: Avalon|기본판|P3|hidden_information|A|임무 결과;리더;공개 투표;개인 역할|짧은 인기 계열의 요청 후보|발언 이력·추론은 사진으로 재구성 불가;현행 개별 제품 확인 필요|indie
dixit|딕싯|Dixit|기본판|P3|card_tableau|A|점수;현재 공개 카드;개인 손패|가족 카드 기록 후보이나 저장 편익은 낮음|완전한 그림 카드 사전 수집 불필요|dixit
just-one|저스트 원|Just One|기본판|P3|party|A|라운드;공개 힌트;점수|짧은 파티게임도 요청 경로에 포함|즉석 힌트/발언은 사진·메모;기본 우선 제작 제외|repos
scout|스카우트|SCOUT|기본판|P3|hidden_information|A|순서 고정 손패;공개 조합;점수 토큰|작은 게임에서도 손패 순서가 중요한 후보|사진의 위아래와 카드 방향 확인|scout
six-nimmt|젝스님트|6 nimmt!|기본판|P3|card_tableau|A|공개 네 줄;개인 손패;벌점|BGA 실제 이용 강세를 반영한 짧은 예외|주 라운드가 짧아 초기 핵심보다 요청 대기|six
crew-deep-sea|크루: 심해의 모험|The Crew: Mission Deep Sea|독립 기본판|P3|cooperative|A|현재 임무;통신 토큰;개인 손패;트릭|짧은 협력 임무와 개인 비밀 후보|원작 Crew 확장이 아닌 독립작;손패 공개 범위 유의|crew
hanabi|하나비|Hanabi|기본판|P3|hidden_information|A|공개 불꽃;힌트·실수;각자 보이는 카드|시점별 보임이 다른 특수 비밀 유형|소유자에게도 안 보이는 카드라 일반 owner-private UI만으로 충분하지 않음|hanabi
love-letter|러브레터|Love Letter|현행 2–6인 기본판|P3|hidden_information|A|라운드 토큰;공개 버림;개인 한 장|짧은 카드게임의 요청 후보|구 16장 판과 현행 판의 인원·카드 구성 차이;구판 수치 혼합 안 함|love
coup|쿠|Coup|기본판|P3|hidden_information|A|공개/비밀 영향력;동전;차례|작은 비밀 역할 후보|발언·블러핑 이력은 선택 메모|indie
cockroach-poker|바퀴벌레 포커|Cockroach Poker|기본판|P3|hidden_information|A|공개 모음;개인 손패;진행 중 제안|국내 접근성이 기대되는 짧은 카드 후보|국내 이용 수치 미확인;진행 중 거짓말 이력은 모름|cockroach
skull|스컬|Skull|기본판|P3|hidden_information|A|뒤집힌 스택;남은 패;점수·차례|짧은 블러핑 게임 범위 후보|가려진 스택 내부는 추정 금지|skull
dobble|도블|Dobble / Spot It!|Classic 기본판|P3|party|A|카드 더미;선택 모드;점수|접근성 후보지만 저장 필요는 낮음|실시간 진행을 정지 사진만으로 완전 재개하지 않음|dobble
monopoly|모노폴리|Monopoly|Classic 기본판|P3|network_map|B|부동산·담보;집·호텔;돈;위치·차례|고전 가족 게임의 긴 판 저장 후보|지역·테마판의 칸/화폐 차이 확인;개별 테마판 수로 부풀리지 않음|monopoly
bohnanza|보난자|Bohnanza|기본판|P3|hidden_information|A|콩밭;순서 있는 손패;거래 메모;금화|카드 순서 기록이 중요한 작은 게임|판본별 덱·인원 차이 미확인|bohnanza
lost-cities|로스트 시티|Lost Cities|원작 2인 카드게임|P3|card_tableau|A|원정열;버림;손패;라운드 점수|간단한 카드열 정정 후보|보드판/롤앤라이트와 구분|lostcities
jaipur|자이푸르|Jaipur|현행 2인 기본판|P3|card_tableau|A|시장;상품·낙타;토큰;라운드|2인 공개 시장·개인 손패 후보|구판 아트만 별도 메모|jaipur
race-for-the-galaxy|레이스 포 더 갤럭시|Race for the Galaxy|2판 기본판|P3|card_tableau|A|개인 문명;상품;손패;선택 단계|출판사 인기 표시와 엔진 카드 상태|확장·Roll for the Galaxy 제외|rio
res-arcana|레스 아르카나|Res Arcana|기본판|P3|card_tableau|A|유물·장소;회전;정수;손패|회전과 자원을 쓰는 작은 엔진 후보|Lux et Tenebrae 등 확장 제외|res
star-realms|스타 렐름|Star Realms|원작 2인 Core Set|P3|card_tableau|A|공용 시장;기지;권위;덱 구역|작은 덱 게임 공통 기록 후보|Frontiers/Colony Wars 등 독립 제품 이번 계수 제외|starrealms
machi-koro|마치코로|Machi Koro|원작 5주년판|P3|card_tableau|A|개인 시설;랜드마크;돈;공용 시장|가족 엔진의 간단 카운터 후보|2는 별도 독립 후속작;확장 제외|machi
king-of-tokyo|킹 오브 도쿄|King of Tokyo|현행 기본판|P3|player_counters|A|괴수 위치;체력·점수;에너지;카드|간단 개인 카운터 후보|Dark/Duel 별도;Power Up 확장 제외|tokyo
space-base|스페이스 베이스|Space Base|기본판|P3|card_tableau|B|개인 함선 열;배치/이동;수입·돈·점수|카드 슬롯과 숫자 기록 후보|Command Station 등 추가 콘텐츠 제외|aeg
tiny-towns|타이니 타운|Tiny Towns|기본판|P3|player_grid|B|개인 격자;재료;건물;개인 목표|격자 공통 프로필에 적합|Fortune/Villagers 등 확장 제외|aeg
splendor-duel|스플렌더 대결|Splendor Duel|독립 기본판|P3|card_tableau|B|보석 격자;공개 시장;보유·예약;토큰|원작과 다른 2인 격자 상태|확장이 아닌 독립 게임;원작 수치/프로필 재사용 주의|splendor-duel
apiary|에이피어리|Apiary|기본판|P3|engine_euro|B|일꾼 값;개인 벌집;타일·자원;겨울잠|일꾼 수치와 개인 타일 기록 후보|확장 제외;일꾼 방향/면 판독 미검증|apiary
tapestry|태피스트리|Tapestry|기본판|P3|engine_euro|B|문명판;수도 격자;발전 트랙;지도·카드|여러 개인 트랙을 가진 문명 후보|밸런스 개정 카드 적용판 구분|sm
expeditions|익스페디션|Expeditions|기본판|P3|tile_layout|B|지도 타일;메크;카드·부착;개인 토큰|Scythe와 다른 지도/카드 구조 후보|독립 게임;Ironclad 재질판은 중복 계수 안 함|sm
charterstone|차터스톤|Charterstone|기본판|P3|campaign|C|영구 변경 판;일꾼;개인 상자·자원;캠페인 메모|레거시 저장의 후보|미공개 상자 내용 추정·카드 전체 해독 안 함|sm
gloomhaven|글룸헤이븐|Gloomhaven|2판 기본판|P3|campaign|C|시나리오 타일;인물·적;카드 구역;캠페인 기록|긴 협력 후보를 넓게 확보|2판 공식 제품 확인;1판과 카드·배치 호환 미검증;판본은 같은 ID 안에서 구분|gloomhaven
sleeping-gods|슬리핑 갓즈|Sleeping Gods|원작 기본판|P3|campaign|C|지도 책 페이지;선원 상태;자원·카드;캠페인 메모|탐험과 장기 진행을 사진·메모로 보존|Distant Skies는 독립 후속작으로 별도 요청|sleeping
mansions-madness-2|광기의 저택 2판|Mansions of Madness: Second Edition|2판 기본판|P3|app_assisted|C|타일·인물;조사자 상태;카드;앱 세이브 메모|큰 실물판 기록 후보|앱 내부 시나리오 세이브는 별도로 필요;KeepBoard가 대체하지 않음|ffg
descent-legends-dark|디센트: 어둠의 전설|Descent: Legends of the Dark|기본판|P3|app_assisted|C|입체 타일;인물·적;카드;앱 진행 메모|입체 실물과 디지털 상태 경계를 보여 주는 후보|앱 저장 데이터 추출/연동 범위 아님;입체 높이 한 장 판독 한계|ffg
arkham-horror-3|아컴호러 3판|Arkham Horror: Third Edition|3판 기본판|P3|cooperative|C|모듈 지도;조사자;적·토큰;시나리오 카드|카드게임과 다른 큰 보드 상태 후보|LCG와 별도 독립 게임;확장 제외|ffg
star-wars-outer-rim|스타워즈: 아우터 림|Star Wars: Outer Rim|기본판|P3|network_map|B|지도;함선·캐릭터;화물·현상금;손패|큰 개인 보유 상태와 이동 기록|Unfinished Business 확장 제외|outerrim
imperial-assault|스타워즈: 임페리얼 어썰트|Star Wars: Imperial Assault|기본판 캠페인|P3|campaign|C|전장;인물·적;상태·장비;캠페인 메모|기본 상자 캠페인 후보|무한 미니어처 전투/확장 전체 지원 아님;Skirmish 별도|ffg
journeys-middle-earth|반지의 제왕: 가운데땅 여정|The Lord of the Rings: Journeys in Middle-earth|기본판|P3|app_assisted|C|여정 타일;인물·적;개인 카드;앱 메모|실물 구성물 기록 후보|앱 내부 상태는 별도 세이브 필요|ffg
twilight-struggle|황혼의 투쟁|Twilight Struggle|현행 Deluxe 기본판|P3|network_map|B|국가 영향력;트랙;보유 카드;턴|긴 2인 역사게임의 많은 수치|카드 이벤트 전체 자동 해석 안 함|twilight
through-the-ages|쓰루 디 에이지스|Through the Ages: A New Story of Civilization|신판 기본판|P3|engine_euro|B|문명 카드;큐브·토큰;트랙;손패·시대|긴 카드 문명 게임의 누적 상태|구 A Story와 판본 구분;확장 리더 제외|throughages
dominant-species|도미넌트 스피시즈|Dominant Species|원작 기본판|P3|network_map|B|육각 타일;종·원소;행동 칸;점수|큰 공용판에 다수 말이 누적되는 후보|Marine은 독립작이며 이번 목록 미계수|dominant
hansa-teutonica|한자 토이토니카|Hansa Teutonica|Big Box의 원 기본 지도 모드|P3|network_map|B|도시·길;개인 능력;말 재고;보너스|길 점유/개인 트랙 공통화 후보|Big Box 동봉 확장 지도 제외|hansa
castles-mad-ludwig|매드 킹 루드비히의 성|Castles of Mad King Ludwig|현행 기본 모드|P3|tile_layout|B|개인 방 연결;목표;돈;공용 시장|불규칙 방 타일 배치 기록 후보|Collector/확장 구성과 기본 모드 구분|ludwig
istanbul|이스탄불|Istanbul|기본판|P3|tile_layout|B|장소 배열;상인·조수;수레·루비;돈|타일 배열과 개인 수량 기록 후보|Big Box 확장 제외|istanbul
five-tribes|다섯 부족|Five Tribes: The Djinns of Naqala|기본판|P3|tile_layout|B|타일·미플;소유;카드·돈;턴 순서|많은 색 말의 칸별 수량 기록 후보|확장·추가 부족 제외|dow
small-world|스몰 월드|Small World|기본판|P3|network_map|B|지역·종족 토큰;쇠퇴 면;점수;라운드|겹침과 앞뒤 면을 가진 지도 후보|인원별 보드 식별;Underground 별도|smallworld
paleo|팔레오|Paleo|기본판|P3|cooperative|A|부족·자원;모듈 카드 구역;동굴 그림;라운드|협력 카드 묶음의 비교 후보|선택 모듈 이름만 메모;미공개 카드 자동 읽기 안 함|paleo
age-of-innovation|혁신의 시대|Age of Innovation|독립 기본판|P3|network_map|B|세력·지형;건물;능력·기술;자원|Terra Mystica 계열의 다른 개인판 구조 후보|독립 기본판이며 Terra Mystica 확장으로 계수 안 함|age
underwater-cities|언더워터 시티즈|Underwater Cities|기본판|P3|engine_euro|B|개인 도시망;카드;자원;라운드|개인 연결판·카드 기록 후보|New Discoveries 확장 제외|underwater
voidfall|보이드폴|Voidfall|Retail 기본판|P3|network_map|C|섹터·함대;개인 트랙;의제·기술;사이클|대형 우주 전략 범위 후보|Galactic 재질판 중복 계수 안 함;세부 모드 확인 필요|voidfall
seti|세티|SETI: Search for Extraterrestrial Intelligence|기본판|P3|engine_euro|B|태양계 회전;탐사선;개인 자원·기술;카드|공식 인기 표시와 회전판 상태 후보|Space Agencies 확장 제외;회전 기준을 수동 확인|seti
galaxy-trucker|갤럭시 트러커|Galaxy Trucker|현행 기본판|P3|player_grid|B|개인 우주선;방향·손상;승무원·화물;라운드|공식 인기 표시와 조립 후 배치 기록|실시간 조립 중보다 비행 사이 저장 우선|cge
halligalli|할리갈리|Halli Galli|Classic 기본판|P3|party|A|공개 카드;개인 더미;선택적 점수|국내 가족 후보 폭을 확보하되 저장 편익 낮음|인기도 수치 미확인;반응 순간 판정은 기록 대상 아님|halli
blokus|블로커스|Blokus|Classic 기본판|P3|player_grid|B|색별 조각 배치;남은 조각;차례|가족 격자판의 간단 위치 기록|Duo/Trigon 별도;언어판 중복 계수 안 함|blokus
aeons-end|에이언즈 엔드|Aeon’s End|2판 기본판|P3|cooperative|A|마법사·균열;보스;시장;손패·덱 구역|섞지 않는 덱 등 순서 보존 한계가 분명한 협력 후보|기본 상자만;덱 내부 순서는 선택 수동 기록/물리 유지 필요|indie
'''

# players, duration endpoints, per-player duration, evidence note. None is deliberately unknown.
FACTS = {
 'catan': (3,4,60,90,None,''), 'carcassonne': (2,5,30,45,None,''),
 'ticket-to-ride': (2,5,30,60,None,''), 'seven-wonders': (3,7,30,30,None,''),
 'wingspan': (1,5,40,90,None,'요약 40–70/본문 40–90분 불일치;본문 채택'),
 'everdell': (1,4,40,80,None,''), 'ark-nova': (1,4,90,150,None,''),
 'terraforming-mars': (1,5,90,120,None,''), 'dune-imperium-uprising': (1,6,60,120,None,'허용 인원 1–4 또는 6;초기 프로필은 1–4'),
 'brass-birmingham': (2,4,60,120,None,''), 'agricola': (1,4,90,90,None,'공식 약 90분'),
 'viticulture': (1,6,45,90,None,''), 'scythe': (1,5,115,115,None,'공식 약 115분'),
 'root': (2,4,60,90,None,''), 'spirit-island': (1,4,90,120,None,'기존 확보 CORE 규칙 기준;공식 상점은 100분'),
 'pandemic': (2,4,45,45,None,''), 'gloomhaven-jaws': (1,4,60,120,None,'공식 1–2시간을 분으로 환산'),
 'frosthaven': (1,4,120,180,None,'공식 2–3시간;캠페인 전체 시간이 아님'),
 'arkham-lcg': (1,4,60,120,None,'2026 AHC100 현재 제품 기준'),
 'twilight-imperium-4': (3,6,240,360,None,''), 'lost-ruins-arnak': (1,4,None,None,30,'인당 표기;전체 시간 null'),
 'castles-burgundy': (1,4,70,120,None,'Special Edition 상품 수치;기본 모드만 선정'),
 'patchwork': (2,2,30,30,None,''), 'seven-wonders-duel': (2,2,30,30,None,''),
 'caverna': (1,7,None,None,30,'인당 약 30분;전체 시간 null'),
 'gaia-project': (1,4,60,150,None,''), 'terra-mystica': (2,5,60,150,None,''),
 'orleans': (2,5,90,90,None,'현행 8쇄 이후;구판 4인과 구분'),
 'grand-austria-hotel': (2,4,90,90,None,''),
 'war-of-the-ring-2': (2,4,120,None,None,'공식 검색 색인 120분 이상;본문은 403'),
 'star-wars-rebellion': (2,4,180,240,None,''),
 'mage-knight': (1,4,60,240,None,'기존 연구 원 기본판 1–4시간;UE 수치 아님'),
 'eclipse-second-dawn': (2,6,60,240,None,''), 'anachrony': (2,4,None,None,None,'Essential 기본판;공식 시간 미확인'),
 'wyrmspan': (1,5,90,90,None,''), 'dominion': (2,4,20,30,None,'공식 본문20–30/요약<30분'),
 'eldritch-horror': (1,8,120,240,None,''), 'small-world': (2,5,40,80,None,''),
 'apiary': (1,5,60,90,None,''), 'paleo': (2,4,45,60,None,''),
 'seti': (1,4,None,None,40,'인당 40분;전체 시간 null'),
 'azul': (2,4,45,45,None,'공식 유통사 평균 45분'),
 'splendor': (2,4,30,30,None,''), 'barrage': (1,4,60,120,None,''),
 'robinson-crusoe': (1,4,60,120,None,'영어 상품 기준;폴란드어 요약과 차이'),
 'pandemic-legacy-1': (2,4,60,60,None,'한 세션 표기;캠페인 총시간 아님'),
 'kanban-ev': (1,4,90,120,None,'출판사 상품의 인원/시간 이미지 대체텍스트'),
 'quacks': (2,4,45,45,None,''), 'isle-of-cats': (1,4,None,None,None,'6인은 확장 필요;기본판 시간 미확인'),
 'arcs': (2,4,None,None,None,'현행 규칙 안내;개발 일지의 옛 캠페인 시간 사용 안 함'),
 'kingdomino': (2,4,15,15,None,''), 'sagrada': (1,4,30,45,None,'공식 규칙 표지 검색 색인'),
 'akropolis': (1,4,25,25,None,''), 'stone-age': (2,4,60,90,None,''),
 'scout': (2,5,20,20,None,''), 'love-letter': (2,6,20,20,None,'현행 판본;구 16장 판과 다름'),
 'cockroach-poker': (2,6,30,30,None,''), 'dobble': (2,8,None,15,None,'공식 15분 이하;하한을 임의로 만들지 않음'),
 'monopoly': (2,6,None,None,None,'공식 Classic 규칙 제품;시간 미확인'),
 'lost-cities': (2,2,None,None,None,'원작 카드게임 공식 규칙;시간 미확인'),
 'jaipur': (2,2,30,30,None,''), 'res-arcana': (2,4,30,45,None,''),
 'star-realms': (2,2,None,None,None,'원 Core Set;4인 Box Set은 다른 구성'),
 'machi-koro': (2,4,30,30,None,'5주년판 기준'),
 'splendor-duel': (2,2,None,None,None,'독립 게임;공식 시간 미확인'),
 'gloomhaven': (1,4,60,None,None,'2판 상품 1–2+시간;120분을 상한으로 확정하지 않음'),
 'sleeping-gods': (1,4,90,90,None,'소개 상단90분;본문10–20시간은 전체 캠페인으로 별도 보존'),
 'king-of-tokyo': (2,6,30,30,None,''),
 'through-the-ages': (None,None,120,None,None,'공식120분 이상;이번 확인 범위에서 인원 미확인'),
 'dominant-species': (2,6,None,None,None,'원작6쇄;시간 미확인'),
 'twilight-struggle': (2,2,None,None,None,'Deluxe8쇄;시간 미확인'),
 'hansa-teutonica': (3,5,45,90,None,'Big Box 기본 지도 모드만 선정'),
 'castles-mad-ludwig': (1,4,None,None,None,'5인은Towers 확장 필요;원 기본판 범위에 넣지 않음'),
 'underwater-cities': (1,4,90,120,None,'상단90–120분 채택;본문은 인당30–45분이므로 직접 일치하지 않음'),
 'blokus': (2,4,None,None,None,'상품의 less than a minute는 학습시간;플레이시간 미확인'),
}

POP = {
 'bga2025': ['catan','azul','ark-nova','terraforming-mars','carcassonne','ticket-to-ride','six-nimmt'],
 'redbutton': ['splendor','rummikub','clue','davinci-code'],
 'bgg': ['brass-birmingham','ark-nova','pandemic-legacy-1','dune-imperium-uprising','twilight-imperium-4','war-of-the-ring-2','terraforming-mars','star-wars-rebellion'],
 'cge': ['codenames','lost-ruins-arnak','seti','galaxy-trucker'],
 'rio': ['dominion','power-grid','race-for-the-galaxy','concordia'],
 'seven': ['seven-wonders'],
}

def duration(g):
    lo,hi,pp=g['playtime_min_minutes'],g['playtime_max_minutes'],g['playtime_per_player_minutes']
    if pp is not None: return f'인당 {pp}분'
    if lo is None and hi is None: return '미확인'
    if lo is None: return f'{hi}분 이하'
    if hi is None: return f'{lo}분 이상'
    return f'{lo}분' if lo == hi else f'{lo}–{hi}분'

SHAPES = {
 'network_map':'공용 지도 + 개인 카드/자원 구역',
 'tile_layout':'가변 타일 배치 + 공용/개인 부품',
 'player_grid':'개인 격자판 여러 곳 + 공용 공급',
 'card_tableau':'공용/개인 카드 열·겹침 + 비밀 손패',
 'engine_euro':'공용 행동판 + 개인판·트랙·자원',
 'cooperative':'공용 상황 + 여러 인물·덱 구역',
 'campaign':'시나리오 판 + 인물/카드 + 장기 진행 메모',
 'hidden_information':'공개 구역 + 시점별 비밀 기록',
 'app_assisted':'실물 배치 + 별도 앱 진행 상태',
 'party':'짧은 라운드 사진 + 메모',
 'player_counters':'공용 위치 + 개인 수치/카드',
}

def materials(gid, src):
    if gid in ['twilight-imperium-4','frosthaven','spirit-island']:
        return 'prior_local_rules_available'
    if gid in ['mage-knight','arkham-lcg']:
        return 'prior_related_edition_rules_only'
    if src['source_kind']=='korean_cafe_selection': return 'cafe_title_reference_only'
    if gid=='avalon': return 'series_reference_only'
    if src['source_kind']=='publisher_rules_pdf': return 'public_rules_pdf_indexed'
    if src['source_kind']=='publisher_rules_hub': return 'publisher_rules_hub_identified'
    return 'public_reference_only'

def build():
    rows=[]
    for line in ROWS.strip().splitlines():
        gid,ko,en,edition,priority,family,mode,elements,reason,edition_note,sid = line.split('|')
        if sid not in SOURCES:
            raise ValueError(f'Missing source: {gid}/{sid}')
        src=SOURCES[sid]
        pmin,pmax,tmin,tmax,pp,tnote=FACTS.get(gid,(None,None,None,None,None,''))
        pop=[s for s,ids in POP.items() if gid in ids]
        unknown=[]
        if pmin is None: unknown.append('추천 기본판의 공식 인원 미확인')
        if tmin is None and tmax is None and pp is None: unknown.append('추천 기본판의 공식 시간 미확인')
        if not pop: unknown.append('정량 인기 및 국내 이용 근거 미확인;출판 목록/저장 유형으로 선정')
        if 'pending' in src['access_status']: unknown.append('공식 개별 자료 직접 확인 전')
        unknown.append('국내 현재 재고·한국어판 현행 인쇄 미확인')
        unknown.append('이번 조사에서 실사진 인식·정정 UI 재시험하지 않음' if gid=='catan' else '실사진 인식·정정 UI 시험 미실시')
        if gid=='avalon': unknown.append('제품군 출처만 확인;현재 Avalon 개별 기본판 자료 미확인')
        g=dict(game_id=gid,name_ko=ko,name_en=en,base_game=True,
               recommended_edition=edition,edition_compatibility_note=edition_note,
               priority_group=priority,initial_target=priority in ['P1','P2'],
               current_support_status='tested_catan_reported' if gid=='catan' else 'catalogue_only',
               support_evidence='REPORTED: 감독 작업 카드상 기존 시험완료;이번 조사에서 재시험하지 않음' if gid=='catan' else '선정/명세 제작 후보;지원 완료 아님',
               players_min=pmin,players_max=pmax,
               allowed_player_counts=[1,2,3,4,6] if gid=='dune-imperium-uprising' else None,
               playtime_min_minutes=tmin,playtime_max_minutes=tmax,playtime_per_player_minutes=pp,
               playtime_note=tnote,
               campaign_total_min_minutes=600 if gid=='sleeping-gods' else None,
               campaign_total_max_minutes=1200 if gid=='sleeping-gods' else None,
               metadata_evidence_status=src['access_status'] if gid in FACTS else 'unverified',
               metadata_source_url=src['url'] if gid in FACTS else None,
               popularity_source_urls=[SOURCES[x]['url'] for x in pop],popularity_signal_ids=pop,
               bgg_rank=None,bgg_num_ratings=None,bgg_owned=None,
               publisher_or_reference_url=src['url'],reference_source_id=sid,
               reference_access_status=src['access_status'],
               materials_availability=materials(gid,src),
               state_family=family,expected_recording_mode={'A':'photo_common','B':'small_layout_profile','C':'optional_special_extension'}[mode],
               default_capture_mode='photo_common',
               table_shape_category=SHAPES[family],
               table_shape_note='RECOMMENDATION: 상태 유형에 따른 구도 분류;실제 테이블 cm/부품 수를 측정한 값 아님',
               proposed_saved_elements=elements.split(';'),
               selection_reason=reason,
               unverified=unknown,checked_at=CHECKED)
        g['playtime_display']=duration(g)
        rows.append(g)
    data=dict(schema_version=2,as_of=CHECKED,recommendation=dict(initial_target_count=60,first_wave_count=24,
              second_wave_count=36,current_tested_count_reported=1,catalogue_count=len(rows),
              proposed_base_catalogue_target=1000,compared_catalogue_scales=[1000,5000,10000],
              expansion_strategy='base_pack + versioned_expansion_patches + session_custom_map',
              count_is='독립 기본 게임;판본·언어·프로모·확장 중복 계수 없음',
              evidence_level='RECOMMENDATION;게임별 지원 완료는 별도 시험 후'),
              scope_note='120행은 기본 프로필 범위. 행의 확장 제외 메모는 기본팩에 합치지 않는다는 뜻;확장은 별도 패치로 지원 제안. 1000종은 목표이며 이번 확보 수가 아님.',
              games=rows,sources=list(SOURCES.values()))
    (OUT/'catalog.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    columns=list(rows[0])
    with (OUT/'catalog.csv').open('w',newline='',encoding='utf-8-sig') as f:
        w=csv.DictWriter(f,fieldnames=columns);w.writeheader()
        for row in rows:
            w.writerow({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v for k,v in row.items()})
    human=['# 기본 게임 후보 120종','',
           '2026-10-21. P1 24종 + P2 36종 = 초기 시험/준비 목표 60종, P3 60종 = 요청 후보. 카탈로그 확대 목표 1,000종과 구분한다. 카탄 1종만 기존 시험 완료로 보고받았고, 나머지는 지원 완료가 아니다. 확장은 각 기본팩의 별도 패치로 다루며 아래 120종에 중복 계수하지 않는다.','',
           'A = 사진 공통 / B = 작은 배치 프로필 / C = 필요한 전용 확장. 방식은 설계 권고. 시간은 공식 표기이며 초보자 실측이 아니다. 출처 접근 상태·선정 이유·저장 요소·인기 근거·판본 한계는 [CSV](catalog.csv)와 [JSON](catalog.json)에 있다.','']
    for group,title in [('P1','먼저 준비할 24종'),('P2','이어 준비할 36종'),('P3','요청에 따라 올릴 60종')]:
        human += [f'## {group} — {title}','',
                  '| # | 게임 · 영문명 | 기준 기본판 | 인원 | 공식 시간 | 방식 |',
                  '|---:|---|---|---|---|---|']
        for i,g in enumerate(rows,1):
            if g['priority_group']!=group: continue
            pmin,pmax=g['players_min'],g['players_max']
            player='미확인' if pmin is None else (str(pmin) if pmin==pmax else f'{pmin}–{pmax}')
            if g['allowed_player_counts']: player='1–4 또는 6'
            mode={'photo_common':'A','small_layout_profile':'B','optional_special_extension':'C'}[g['expected_recording_mode']]
            human.append(f'| {i} | [{g["name_ko"]}]({g["publisher_or_reference_url"]}) · {g["name_en"]} | {g["recommended_edition"]} | {player} | {g["playtime_display"]} | {mode} |')
        human += ['']
    (OUT/'catalog.md').write_text('\n'.join(human)+'\n')
    print(json.dumps({'games':len(rows),'groups':dict(Counter(x['priority_group'] for x in rows)),
                      'duration_known':sum(x['playtime_display']!='미확인' for x in rows),
                      'popularity_signal_rows':sum(bool(x['popularity_signal_ids']) for x in rows)},ensure_ascii=False))

if __name__=='__main__': build()
