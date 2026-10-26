"""Manual records of source bodies actually opened during this audit.

These are scoped text/access notes, NEVER visual/color certification.
The original product/spec/mapping files remain read-only.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
claims = {x['gameId']: x for x in json.loads((ROOT / 'claims.json').read_text())}
rows = {}

def note(game, section, facts, limits, url=None, status='PARTIAL'):
    primary = next(s['url'] for s in claims[game]['sources'] if s.get('url'))
    rows[game] = dict(status=status, sourceURL=url or primary, section=section,
        facts=facts, limits=limits, visual=False, checkedAt='2026-10-22',
        readScope='공식 웹 본문/공식 PDF 추출 텍스트 직접 열람. 검색 snippet은 확정 근거에서 제외. 시각 도해 미검수.',
        checkedDimensions=['selected-edition', 'component-kind-text', 'board-or-public-scope-text'])

note('aeons-end', 'official product / SKU IBCAED2 / description',
     '2판 상품 SKU와 가변 턴 순서·개인 덱/카드·Gravehold 구분을 대조했다.',
     '실제 카드 종류별 그림/유형색, breach/player mat 구성물 페이지 필요.')
note('akropolis', 'official product Contents; linked rules attachment 471',
     '61 city tiles·4 starting tiles·40 stone cubes·Chief Architect 1개라는 상품 본문을 대조했다. 연결 규칙 PDF 열림.',
     '규칙 PDF 시각 페이지와 각 city tile 층/색 조합은 아직 미검수.')
note('apiary', 'official product What is in the box / components',
     '공용 양면 본판, hive/docking mat, frames, workers, queen·seed/hibernation 및 fiber/pollen/water/wax/honey 공급 구분을 대조했다.',
     '연결 규칙 링크 열람 실패. 인쇄 유형색·worker 성장 숫자 면·모든 타일 그림 미검수.')
note('arcs', 'official How to Play page',
     '공식 페이지의 기본 게임 안내/영상 링크만 열렸다.',
     '구성물 원문 미확보. 기본판과 Blighted Reach 캠페인 범위를 분리한 구성물/설정 도해 필요.', status='HELD')
note('ark-nova', 'official Rulebook PDF pp.2–5 Components / Setup',
     '공용 본판/협회판, 양면 action cards, 개인 지도, 빈/점유 enclosure 면, 숨은 최종득점 카드와 개인 말·공용 돈을 텍스트 대조했다.',
     '본판/개인 지도 연결 및 그림색은 미시각검수. 모든 enclosure·동물 카드 미검수.',
     'https://capstone-games.com/cdn/shop/files/Ark-Nova-Rulebook.pdf?v=15269496103518830006')
note('avalon', 'official Avalon Big Box product',
     '현재 링크는 23인물 및 모듈 포함 Big Box 상품이다.',
     '명세 선택은 기본판으로만 적혀 있다. Big Box 전체를 기본판 구성물 근거로 쓰지 않음. 선택 SKU/기본판 구성물 규칙 필요.', status='HELD')
note('bohnanza', 'official Spielidee / contents',
     '110카드·5콩밭 mat와 거래/심기/수확→동전의 역할을 본문 대조했다.',
     '콩 종류별 수/그림, 손패 순서 전체 조항 및 각 인쇄별 공급 차이는 미검수.')
note('brass-birmingham', 'official product Retail Contents (Deluxe separate)',
     'Retail의 공용판/개인판4·산업/연결/상인 타일, black coal30·orange iron18·beer15·카드보드 돈77의 텍스트와 Deluxe clay 별도임을 대조했다.',
     '규칙 링크 접근 실패. 실제 유형색/판 연결을 시각확정한 것은 아님. Deluxe를 Retail 근거로 합치지 않음.')
note('carcassonne', 'current official product What is in the box; old PDF 502',
     '현재 공식 상품 본문에서 본판 land tiles72·meeples40·river12·abbots5·scoreboard1을 대조했다.',
     '구 PDF는 로컬 TLS 실패 후 web502; 현재 본문은 열림. 도로/도시/수도원 SVG와 인쇄별 타일 앞면은 미검수.',
     'https://www.zmangames.com/game/carcassonne/')
note('castles-mad-ludwig', 'official product description / rules link',
     '방 타일·foyer/문 연결·방 완성 및 Master Builder 가격 전시의 종류를 본문 대조했다.',
     '연결 규칙 PDF 접근 실패. 현행 기본 모드와 확장/Collector 구성물 차이, 타일 방 유형색·형태는 미검수.')
note('catan', '2025 primary PDF / 2020 selectable profile source access',
     '선택 판본은 2025 6판이며 2020은 별도 profile라는 명세 경계를 확인했다. 이 감사에서 공식 PDF 본문 열람은 실패했다.',
     '2020 다운로드 timeout, 2025 web unexpected status. 2020 그림을 2025 구성물 근거로 승격하지 않음. 2025 구성물/설정 원문 필요.', status='HELD')
note('charterstone', 'official product description / components',
     '영구 스티커 건물·공유 마을·12회 캠페인, 공용6종 자원·금속 동전의 구분을 본문 대조했다.',
     '전체 crate/unlock·개인 charter·타입색/형태 규칙 및 모든 신규 구성물은 미검수.')
note('clank-catacombs', 'official product Contents / linked rulebook',
     '독립 Catacombs의 던전 타일29와 4색 개인 큐브30+말, 모듈식 판이라는 본문을 대조했다. 연결 공식 PDF18페이지는 열리나 추출 텍스트가 없다.',
     'PDF 시각검수 미실시. tile 연결·유령/포털/자물쇠·모든 유형색은 미검수.')
note('clue', 'official Hasbro instruction landing / contents',
     '6인물·6무기·검정카드21·빨강 보너스카드13·주사위2와 봉투 종류를 공식 본문 대조했다.',
     '현행 Classic이라는 선택만으로 국가/인쇄 SKU 고정 불가. Sam Black판과 다른판 사이 이름·보너스 차이를 자동 교정하지 않음. 규칙 다운로드 실패.')
note('cockroach-poker', 'official product game description',
     '뒤집어 제안하는 카드와 상대의 판정/벌점 앞면 전시 구조를 공식 본문 대조했다.',
     '실제8종 생물의 인쇄색·수량·기존 SVG 전수 대응은 미검수.')
note('codenames', 'current official CGE product Components',
     '현행 단어판의 25단어 격자·비밀 key와 agent/bystander/assassin 종류, 200단어카드/40key 등 상품 본문을 대조했다.',
     '옛 PDF URL은 현행2025 상품 페이지로 redirect. 규칙 그림색·각 카드 앞뒷면 및 이전 인쇄 동등성 미검수.',
     'https://www.czechgames.com/games/codenames')
note('concordia', 'official Game Rules PDF p.1 Game Material',
     'Imperium/Italia 양면, 개인창고5, 개인색당 해상3/육상3/점수1/집15, 공용5종 goods·도시/보너스·동전과 개인 카드 앞면 버림더미를 텍스트 대조했다.',
     '제품 페이지403 후 공식 PDF 대체 접근 성공. 그림색/도시노선·현재판 전체 카드 효과는 미검수.',
     'https://www.riograndegames.com/wp-content/uploads/2013/10/Concordia_rules_eng_1_1.pdf')
note('coup', 'official product description',
     '개인 비공개 영향력 인물카드와 공개 손실/동전이라는 구성 역할을 공식 본문 대조했다.',
     '인물별 인쇄/수량·비공개 카드 보존 전체 조항과 Reformation 혼입 여부는 미검수.')
note('davinci-code', 'official Korea Boardgames product page',
     '공식 한국어 상품 정체만 확인했다. 상세 구성물 설명은 이미지로 제공된다.',
     '상세 이미지를 직접 보지 못했으므로 흑백/0–11/조커 수량·스탠드 형태를 이 감사에서 확정하지 않음. 선택 인쇄의 구성물 사진/규칙 필요.', status='HELD')
note('descent-legends-dark', 'official product description / Learn to Play link',
     '독립 Legends of the Dark의 다층3D 지형·피겨·앱 연계이며 Journeys in the Dark와 호환하지 않는다는 본문을 대조했다.',
     'Learn to Play 링크 열람 실패. 지형 도해·타입색·각 개인 보드 앞뒷면은 미검수.')
note('dixit', 'official product Contents / linked Refresh Rules',
     '현행 Refresh의84카드·8투표dial·8rabbit·득점판·카드슬롯8을 본문 대조했다. 공식 Refresh 규칙 PDF 열림.',
     '초판6인 토큰과 현행8인 dial을 혼합하지 않음. 그림색/실루엣·카드이미지 전체는 미검수.')
note('dobble', 'official Classic Box contents / Rulebook English',
     'Classic 공식 본문은 카드55·틴케이스·규칙1을 적는다. 일치 심볼 찾기라는 종류와 대조했다.',
     '규칙 PDF는2페이지이나 추출본문0. 8심볼·모든 카드 조합/그림색·원형 렌더는 미시각검수.')
note('dominion', 'official Dominion2nd PDF pp.2–3 Contents / Supply',
     '선택2판의 Kingdom262/26종·Trash mat, 기본 공급7더미+선택왕국10더미, 개인 시작 Copper7/Estate3을 텍스트 대조했다.',
     '연결 구판 PDF의252/32종/Trash card는 2판 근거에서 제외. 전체500 실물/모든 카드 효과·그림색 미검수.',
     'https://www.riograndegames.com/wp-content/uploads/2016/09/Dominion2nd.pdf')
note('eldritch-horror', 'old official Rulebook / current product redirect',
     '공식 규칙22MB는 web 크기제한, 다운로드 실패. 현행 상품 URL은 일반 Product Lines로 redirect되어 원문 범위를 확인하지 못했다.',
     '기본판 구성물/설정 도해의 접근 가능한 공식 사본 필요. Arkham Horror 자료로 대체하지 않음.', status='HELD')
note('everdell', 'official Essentials Edition product description',
     '선택 Essentials의 cardboard 구성물 비용절감판과 critter/construction 도시 카드 종류를 본문 대조했다.',
     '기존 Deluxe/Collector 자원 재질·색을 Essentials 실물 정답으로 쓰지 않음. 실제 Essentials 구성도해 필요.')
note('expeditions', 'official standard edition product Components',
     '플라스틱 mech+snap5·mech mat, 장소20·worker50·corruption36 및 공용 카드 종류를 본문 대조했다.',
     'Ironclad metal재질을 기본판으로 혼입하지 않음. 시각 색/각 자원·토큰 면 전체는 미검수.')
note('five-tribes', 'official Days of Wonder source access',
     '기존 fives-tribes URL timeout. 정상 대체 five-tribes URL 접근 실패, 공식 메뉴의 기존 링크도 timeout.',
     '선택 기본판의 부족5색/플레이어색·타일 배열·개인말 구성/실물 도해 원문 필요. 실패를 게임의 오류로 세지 않음.', status='HELD')
note('frosthaven', 'official product classes / Rules & Errata',
     '클래스별 개인 보드/카드·Geminate의 두 형태와 두 miniature를 본문에서 확인했다. 공식 페이지가 규칙/FAQ/초판 정오표를 구분한다.',
     '연결 rulebook은 외부 호스트이며 구성물 페이지 시각대조 미실시. 모든 잠금봉투/미니어처·몬스터/개인색은 미검수.')
note('gaia-project', 'official Rulebook PDF pp.2–3 Components',
     'sector10(05–07양면)·양면 세력판7·연구/득점판, 개인색 구조물·위성, 공용 기술/가이아행성/부스터·오토마 분리를 텍스트 대조했다.',
     '구 Capstone404 후 공식 현행 연결 PDF 접근 성공. 실제 색/각 공간 형태와 확장 미검수.',
     'https://capstone-games.com/cdn/shop/files/Gaia-Project-Rules-CG.0609sm2_1.pdf?v=15399621975902927537')
note('galaxy-trucker', 'official CGE 2021 product Components',
     '현행2021의 양면 비행판2·3면 선박판4·부품156·모험카드60·사람/갈색·보라 외계인/화물/배터리/2주사위를 본문 대조했다.',
     '옛 PDF URL은 HTML로 redirect. 실제 connector 방향·셀/유형색·각 선박 설계는 미시각검수.',
     'https://www.czechgames.com/games/galaxy-trucker')
note('gloomhaven-jaws', 'official product / Google Drive rulebook link',
     '독립 Jaws of the Lion 공식 상품과 연결 규칙 링크만 확인했다. 연결 Drive에서 실제 PDF 본문을 받지 못했다.',
     'Gloomhaven2판의 figure/map를 가져오지 않음. Jaws 구성물 및 scenario-book/보조book 도해 원문 필요.', status='HELD')
note('grand-austria-hotel', 'official Lookout product Components',
     '공용판2·호텔판4·순서tile9·카드120·객실84·음식음료cube120·주사위14·disc24 등 공식 본문 구성 군을 대조했다.',
     '객실/음식/주사위 유형색과 소유색·실물 앞뒤/방 배치도해 미검수.')
note('great-western-trail', 'official Asmodee product / Second Edition description',
     '2판 상품 정체·개인 cattle deck·열차/도착지 New York 및 목장 경로 종류를 본문 대조했다.',
     '구판과 인쇄 재배치를 혼입하지 않음. 모든 노동자 유형색/건물/개인판 슬롯은 미시각검수.')
note('halligalli', 'official AMIGO contents',
     'Classic 공식 구성물 과일카드56·종1과 과일 수를 비교하는 종류를 본문 대조했다.',
     '과일별 모든 숫자/인쇄색/카드 공급 분포·Deluxe 등 타상품은 미검수.')
note('heat', 'official Days of Wonder product Contents',
     '양면트랙판2/서킷4·개인mat6·차/기어말6씩·speed72/heat48/stress37 및 별도 upgrade모듈 종류를 본문 대조했다.',
     '기본4트랙과 확장트랙을 합치지 않음. 실제차/트랙색·코너/기어칸·카드전체앞뒤 미시각검수.')
note('isle-of-cats', 'official How to Play phases / publisher reply 2024-06-17',
     '개인 face-down lesson·5일/5단계와 fishing/discovery 카드, 기본 boat의 틀은 같지만 쥐/보물지도 색 위치가 다르다는 저자 본문을 대조했다.',
     '확장 Boat Pack의 다른 배 형태는 기본판에 합치지 않음. 실제 polyomino 도형/타입색·배 모든 셀 미검수.')
note('just-one', 'official current product Content / rules in one minute',
     '현재110카드·easel7·지우는 펜7·천7, 카드1–5 단어 선택을 본문 대조했다.',
     '신규550단어판의 카드 roster를 옛판에 소급하지 않음. 이젤/비공개 단서의 그림·전체수량 미시각검수.',
     'https://www.rprod.com/en/games/just-one')
note('kanban-ev', 'official Eagle-Gryphon Components list',
     '공용본판/개인판4·개인worker4/자격·은행시간, Sandra1·차40·부품60·디자인35·공장목표12·수요5·수상20·최종목표11의 본문 종류를 대조했다.',
     '연결 Drive폴더의 규칙 실제 페이지는 미확보. 차 타입색 대 개인색·각 부서/개인판 면 도해 미검수.')
note('kingdomino', 'official site and Blue Orange normal alternative access',
     '선택 기본판 공식 사이트 timeout, Blue Orange 정상 대체 URL도 열람 불가.',
     '기본 domino48·숫자/지형·성/왕/개인5×5 여부의 구성물·설정 원문 필요. 확장으로 대체하지 않음.', status='HELD')
note('lost-cities', 'official 2018 rules PDF pp.1–3 Components / Preparation / Long Game',
     '6색2–10+색별 wager3의 상품72장과 기본5색60장·다른 면6원정 변형을 구분했다. 개인 열은 오름차순·공용 색별 버림더미 맨위가 보인다.',
     '기존 명세의5/6면 분리는 오류로 세지 않음. 실제 카드색/게임판 슬롯 그림은 미시각검수.',
     'https://www.thamesandkosmos.co.uk/wp-content/uploads/2020/04/691821_LC_Card_Game.pdf')
note('lost-ruins-arnak', 'official CGE product Components',
     '양면 공용/개인/공급판, archaeologist8·research8, 장소/우상/수호자/조수/사원, 카드110·공용 자원5종과 moon staff를 본문 대조했다.',
     '규칙 PDF18.9MB는 web크기/다운로드timeout. 본문 구성물은 열림. 실제 양면지도·유형색/미니어처는 미검수.',
     'https://www.czechgames.com/games/lost-ruins-of-arnak')
note('lotr-lcg', 'official Revised MEC101 product; linked Rules Reference size limit',
     'Revised Core의1–4인 cooperative LCG·영웅/조우/퀘스트 카드군을 공식 상품 본문 대조했다.',
     '옛FAQ로 Revised 수량을 확정하지 않음. Revised 규칙11.6MB web크기제한. token색/카드 공급/자원·위협 dial·앞뒤 도해는 미검수.',
     'https://www.fantasyflightgames.com/product/the-lord-of-the-rings-the-card-game/')
note('love-letter', 'official current Rulebook pp.2–5 Contents / Setup / Discards',
     '현행2–6인 21인물·숫자0–9·호의13, 손1/덱뒷면·보지 않고1장제외·공개 버림·탈락 reference 뒤집기를 텍스트 대조했다.',
     '16장/구1–8판 혼입하지 않음. 실물 토큰/카드 앞뒷면 그림·색은 미검수.',
     'https://cdn.svc.asmodee.net/production-zman/uploads/2026/04/LL_Rulebook_with_Bag.pdf')
note('mage-knight', 'official Wizkids Starter Set / SKU70495 Features',
     '공식 원2011 Starter SKU70495의 카드240·칠된figure8·token196·map20·mana crystal54/dice7·mat2/규칙2를 본문 대조했다. 아래 Lost Legion/Krang은 별도 확장이다.',
     'Download Rules 링크 접근 실패. 기존 Ultimate 텍스트를 원 기본판 전체 구성물 근거로 쓰지 않음. 실제 육각/마나유형색·각 개인판/앞뒤는 미시각검수.')
note('nemesis', 'official rulebook94MB / official game page',
     '원 Nemesis 규칙은 web크기제한·다운로드실패. 공식 상품 정상 대체 페이지는 본문0.',
     '35MB 연구 다운로드 상한 내 접근 가능한 공식 구성/설정 도해 필요. Lockdown/Retaliation 대체 금지.', status='HELD')
note('orleans', 'official dlp Contents / edition paragraph',
     '8쇄2023부터5인 기본물품 추가임을 본문에서 구분했다. 개인판/천주머니5·상인5·trading post50·cube35·follower125 등 현재 본문을 대조했다.',
     '2023 규칙 링크 CDN redirect 접근 실패. 4인 구판 수량을 오류로 세지 않음. follower 유형색·기술/시민면 미시각검수.')
note('paleo', 'official current product Contents',
     '카드222·wood40/cardboard98·판3·graveyard/workbench·주사위2와 공용 cave painting5/10module이라는 종류를 본문 대조했다.',
     '구 PDF502 후 현행 상품은 열림. 카드뒷면 유형/공개범위·실물 색과 모든 module구성 미검수.',
     'https://www.zmangames.com/game/paleo/')
note('pandemic-legacy-1', 'official Rulebook PDF p.2 Starting Contents / official product',
     'Red/Blue는표지차이고내용같음, 5character/4pawn·player61/infection48/legacy62·dossiers5/스티커/번호봉투8·질병cube96을 텍스트 대조했다.',
     '닫힌봉투내용은 공개 구성 목록 이상 열지 않음. 캠페인 변경 후 모든 board/지역/질병색·스티커 그림 미시각검수.',
     'https://cdn.svc.asmodee.net/production-zman/uploads/2024/09/zm7170_zm7171_rules_red_web.pdf')
note('pandemic', 'official Rulebook p.1 Contents / Overview',
     '질병4타입(blue/yellow/black/red) cube96·역할7/말7·연구소6·치료4·감염률/발병, player59/infection48을 본문 대조했다. 질병유형과 역할말 종류는 다르다.',
     '그림색은 미시각검수. 도시전체연결·각역할/실제판 모든칸은 미검수.',
     'https://cdn.svc.asmodee.net/production-zman/uploads/2024/09/Pandemic_Rulebook.pdf')
note('patchwork', 'official Revised product / components paragraph',
     'Revised2025·변경아트2024와 기본기작 유지, 판3·wood3·tile89를 본문 대조했다.',
     '구판 패치패턴을 선택판본의 정확인쇄로 승격하지 않음. 모든 도형·5×1 등 특수패치와 버튼면은 미시각검수.')
note('race-for-the-galaxy', 'official 2e rules PDF pp.1–2',
     '2판2018 world/development 카드, 카드를 뒷면 상품으로 놓음·액션세트7·VP칩1/5/10 역할을 텍스트 대조했다.',
     '전 카드 타입색/숫자·군사/비군사 표식·SVG앞뒤는 미시각검수.')
note('robinson-crusoe', 'official old PDF / current normal product alternative',
     '기존 PDF는 쇼핑몰 redirect/접근실패. 정상 공식 상품 대체 URL도 접근 불가.',
     '현행 기본 모드 선택의 구성/캐릭터판/캠프·날씨주사위·scenario 원문 필요. 검색에 나온 구 PDF excerpt만으로 확정하지 않음.', status='HELD')
note('root', 'official Law Oct2025 PDF pp.2,24 / C.1 Root',
     '공식 Rules Library의 JS실패 뒤 Resources 연결 PDF 본문을 대조했다. C.1 기본4세력의 건물28/token19/warrior55/Vagabond1, 공유deck54·양면Fall/Winter·개인판4·battle dice2와 비공개 손내용/공개손수 구분을 확인했다.',
     'C.2 이후 확장구성은 기본판에서 제외. 실제말/세력타입색·지도clearings연결·모든카드 앞뒷면 미시각검수.',
     'https://cdn.shopify.com/s/files/1/0106/0162/7706/files/Root_Base_Law_Oct_2025.pdf?v=1774903756')
note('scout', 'official Oink product description',
     '손패 재배열 금지·SCOUT/SHOW와 칩 득점 종류를 본문 대조했다.',
     '카드 이중 숫자 전체 범위·전후방향/공급·실물색 및 모든 개인정보 조항 미시각검수.')
note('scythe', 'official product description / contents overview',
     '개인 세력/플레이어mat·mech/character/worker·자원과 비공개 objective/combat 카드 구분을 본문 대조했다.',
     '기본5세력/확장색을 합치지 않음. 자원타입색/실물형태/맵노선·모든 공개범위 미검수.')
note('six-nimmt', 'official AMIGO contents / 7-step rules',
     '카드104·손10·공용4열·각열최대5/6번째에회수·동시비공개선택과 숫자순배치를 본문 대조했다.',
     '1–104의 인쇄/벌점아이콘 분포와 SVG유형색은 미시각검수.')
note('skull', 'official current product description',
     '각세트4disc=꽃3+skull1·6세트라는 종류를 본문 대조했다.',
     '현행 pink box/Last Chance와 기존판 포함물 구분, 개인mat앞뒤·그림/소유색은 미시각검수.')
note('sleeping-gods', 'official Rulepop Components / Detailed Components List',
     'ship/crew9·공용command/fatigue/damage/resource, atlas·퀘스트/모험/시장·다수보관함을 본문 대조했다.',
     '같은 페이지 요약과 상세 목록의5damage/coin수량이 서로 달라 개수 교정근거로 쓰지 않음. 색/형태 서술도 실제 그림 시각검수는 아님.')
note('small-world', 'official Contents / About Small World',
     '인원별양면판2·race14/특수능력20·각유형token·공용보강주사위·코인109와 active/decline종족 구조를 본문 대조했다.',
     '개인플레이어색을 종족색으로 혼동하지 않도록 구분. 양면종족/실물색·전지역 연결 미시각검수.')
note('spirit-island', 'official CORE Rulebook local extracted text pp.4–6 Components / Setup',
     '로컬 공식 CORE 원문추출 p.4–6의 island4/spirit8·Dahan36/city20/town32/explorer40/blight38·개인presence13/effect3씩·공용energy1/3·fear 및 invader단계덱/양면blight를 텍스트 대조했다.',
     '정확인쇄 미상. 실제지형/말색·개인판 도해는 미시각검수. 확장/다른 상품 그림으로 대신하지 않음.',
     'https://www.dropbox.com/scl/fi/5wzghwnbsi39msyy6vvox/Spirit-Island-CORE-Rulebook.pdf?dl=1&rlkey=86i7aofqbzhulezjr7z0ssyff')
rows['spirit-island']['readScope']='기존 공식 CORE PDF 로컬 추출 텍스트 p.4–6을 새로 직접 읽음. 기존 조사 결론 미인용. 시각도해 미검수.'
rows['spirit-island']['localText']='docs/game-essentials/sources/spirit-island-rules.txt'
note('splendor-duel', 'official Rulebook PDF pp.2–3 Contents / Setup and p.4 actions',
     '독립Duel 보드25token=기본5색×4/pearl2/gold3·카드67/royal4/privilege3·3층공급5/4/3·토큰공개와 reserve구조를 본문 대조했다.',
     '토큰 실제색/5×5나선의 정확도형·모든card유형 미시각검수.',
     'https://cdn.svc.asmodee.net/production-spacecowboys/uploads/2025/11/SCSPL2P01EN_Rules_Planche_BD.pdf')
note('splendor', 'official current product Contents',
     'development90·noble10, gem5타입×7/gold5 및 현행firstplayer를 본문 대조했다.',
     '구FR링크 실패 후 현행공식은열림. 신구판firstmarker차이·실제색/카드분포·개인보유공개범위 미시각검수.',
     'https://www.spacecowboys-games.com/game/splendor/')
note('star-realms', 'official Learn to Play Basic Rules',
     '원2인Core의 개인 시작10=Scout8/Viper2·Authority50·공유시장ship/base라는 종류를 본문 대조했다.',
     'Colony Wars 등 독립코어로 대체하지 않음. 4진영색/다중진영·기지앞뒤 실물/전체카드 미시각검수.')
note('tapestry', 'official current product Components / revised civilizations',
     '개인 capital/income mat·4tracks·tapestry/tech/trap 카드 및 현행 purpleicon 수정세력16을 본문 대조했다.',
     '명세 기본판에 모든 인쇄의 세력목록/수치를 소급하지 않음. landmark/자원색·보드 전체 도해 미검수.')
note('through-the-ages', 'official CGE 2015 A New Story Components',
     '카드열·culture/science/military/age공용판·개인판4·civil179/military150·4색cube250/wood28의 본문 종류를 대조했다.',
     '구rules URL은현재상품 HTML로redirect. 큐브타입/소유색 계약·개인bank/실물면·행동숫자는 미시각검수.',
     'https://www.czechgames.com/games/through-the-ages-a-new-story-of-civilization')
note('underwater-cities', 'official Rulebook PDF pp.1–2 (spread)',
     '양면공용판/개인판4·개인색마커3씩·공용시설·카드/action색맞춤과 공급종류를 텍스트 대조했다.',
     '펼침 PDF11페이지=인쇄22페이지 혼동하지 않음. 실제색/슬롯연결·metropolis앞뒷면 미시각검수.')
note('viticulture', 'official Essential Edition product Components',
     '공용본판·포도밭개인판6·worker30/grande6·vine42/order36/summer38/winter38/field18 등 EE종류를 본문 대조했다.',
     'Tuscany본판·확장노동자를 기본EE로 합치지 않음. 자원숫자·실제소유색·cellar슬롯/카드앞뒤 미시각검수.')
note('war-of-the-ring-2', 'official Ares product 1518 and normal second-edition alternative',
     '두 정상 공식 URL 모두403. 선택 WOTR001의 실제 구성/지도 원문을 이 감사에서 대조하지 못했다.',
     '1판/확장/카드게임 자료로 대체하지 않음. WOTR001 components/setup·진영별dice/army 도해 필요.', status='HELD')
note('wingspan', 'official current Swift Start product Components',
     '개인mat5·달걀75·커스텀주사위5·기본bird170·bonus26/Automa16·개인action8 및 Swift Start 포함을 본문 대조했다.',
     '추가Swift Start bird와기본170을 합쳐전체공급 단정하지 않음. 알색은플레이어소유색이라는 근거 없음. 실물/서식지슬롯/모든새인쇄 미시각검수.')
note('wyrmspan', 'official product Components',
     '개인mat5·dragon183/cave75·guildboard1/양면guild4·roundboard/양면목표10·egg55라는 종류를 본문 대조했다.',
     'Wingspan의5색/서식지 규격을 자동전용하지 않음. 자원유형색·각굴/탐험칸/모든용카드 실물 미시각검수.')

assert len(rows) == 70, len(rows)
assert set(rows).isdisjoint(json.loads((ROOT / 'notes.json').read_text()))
(ROOT / 'web-notes.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
print(f'{len(rows)} independent text/access records saved')
