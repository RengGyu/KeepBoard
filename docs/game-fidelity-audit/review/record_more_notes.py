import json
from pathlib import Path
out=Path(__file__).resolve().parent
n=json.loads((out/'notes.json').read_text())
rows={
'arkham-lcg':('2026 신규코어 구성물p3·장소 공개/미공개면·연결토큰·막/주요사건 별도덱p4 확인. 단서/파멸1·3, 자원1·3·5, 피해/공포1·3 표기 일치.','이전 코어에 소급하지 않음. 전체 카드/연결·부착 규칙은 미검수.'),
'eclipse-second-dawn':('Second Dawn 표지·p3–4 섹터 육각/웜홀과 개인 청사진, 영향력disc/인구cube/식민선tile 및 준비/사용 구분 확인.','모든 함선부품·세력별 차이·평판 공개성 전체 미검수.'),
'gloomhaven':('신판 클래스와p4 인물 miniature 또는 standee 선택·summon standee·개인판/시트 확인. p12/13/60/61은 별도 detail sheet 준비(추가검수 전).','신판 전체 지도/원소/몬스터 인쇄와나머지 페이지 미검수.'),
'azul':('원작 p2–4 공장5/7/9·100타일/색당20·개인판 양면·5패턴줄/벽/바닥·단일공용 선표식 확인. 타일 색·무늬는 blue/yellow/red/black/light patterned의 유형이다.','현재5개 예시모자이크에 실제유형 이름/정확대응이 없어 일대일 대응은 보류. 회색벽 변형 전체제약 미검수.'),
'blokus':('BJV44 Classic 규칙의4색(red/blue/yellow/green)·84개/색당21·1/2/3/4/5칸 조각분포·공유판 및2인 각2색 구분을 텍스트/렌더에서 확인.','인쇄용 넓은 mediaBox contact는 작다. 개별21도형 SVG의 셀을 전수 대조한것 아님.'),
'arkham-horror-3':('Rules Reference p2–4 실제본문으로 시나리오가 동네/거리와 동네덱 결정·괴물카드·조사자token·신화컵을 구별함을 확인.','이4페이지에 구성물 그림없음. 토큰 색/실루엣/도해는 시각사실 VERIFIED로 세지 않는다.'),
'imperial-assault':('Learn to Play p2–4 구성물도해: 모듈map·stand door·피겨와 ally/villain token·피해1/5·strain·condition·위협/라운드dial 분류 일치.','부속 Luke/Vader pack은별도. 전체 미션/공개범위·피겨색은 미검수.'),
'journeys-middle-earth':('Learn to Play p3–4에서 여정/전투판별도, 영웅6+적25피겨, banner/stand, skill/item/damage/fear/boon 분리·양면탐험/영감·위협/수색 확인.','모든맵 연결과 앱 내부공개정보·모든아이템 미검수.'),
'le-havre':('기본모드p1–4: 공용gameboard·player disc/ship·goods 양면가공·건물/선박카드·franc coin과 loan card 분리 확인.','round card의 ship뒷면은개인ship marker와구분. 모든가공/건물·특수건물확장 미검수.'),
'marvel-champions':('Core Set p3–4에서 hero/alter-ego, villain/plan, status 카드3종과 피해/위협/만능/가속token, HP dial 구분 확인.','카드군/토큰 대표유형까지만. 전체343카드·상태 규칙·소진구현 미검수.'),
'mansions-madness-2':('2판 p3–4에서 map·door/wall·investigator/monster figure+matching token, card군·양면fire/darkness·secret passage·barricade·ID 확인.','1판conversion kit 제외. 모든카드 앞뒷내용/앱state 미검수.'),
'monopoly':('G0009 기본문서 contents·board spaces·buildings를 시각확인: houses32/hotels12/title deeds28, 공용집녹색/호텔빨강, 지폐·chance/community chest 별도.','지역명/모든말 조형/개인현금 공개성 선택은 미검수. 두인쇄page만있음.'),
'quacks':('기본규칙 p1–4: 색/값1·2·4 ingredient칩, 개별pot·droplet/rat, 가득/빈flask·ruby·개인scoremarker·0/50seal 구분 확인.','모든ingredient book면·색별대표아이콘·세트추가 규칙 미검수.'),
'res-arcana':('기본규칙 p2–4: artifact/mage/monument 카드, 양면place of power와magic item tile·5정수(red/green/blue/black/gold) 확인.','기존의상징아이콘을실물조형복제주장으로 취급하지 않음. 전체power/카드효과미검수.'),
'seti':('기본규칙 p2–4:3solar disc+4sector board·개인computer, 같은색8figure·30marker, 공용data/credit/energy·5alien중2개선택 확인.','figure의 probe/orbiter/lander 정확역할전환은 추가조항미검수. 색별실물수와게임상역할은별개.'),
'power-grid':('Recharged 독문 p2–4: Germany/USA 공유map, player색house·공용4연료(갈색coal/검정oil/노랑trash/빨강uranium)·종이돈·발전소별fuel 저장 확인.','영문세부동등성/현금공개여부·모든시장값미검수. money owner색묶음은종이돈/순서표식을혼합.'),
'stone-age':('기본 p2–4: 공용본판+4개인판, 개인색figure·공용wood/clay/stone/gold 및 food/tool tile, building tile/civilization card 구분 확인.','특정인쇄년도미기재. 주사위 owner색선언은실물유형대응이불명확해확정불일치로올리지않음.'),
'ticket-to-ride':('현행북미 p2–4:5player색train/scoremarker와8route색 train card+locomotive구분, 45개시작train·33ticket·비공개ticket 보존 확인.','구북미ticket30과현재33차이는판본차. source quantities null이므로불일치아님. 전체지도노선전수미검수.'),
'voidfall':('Retail Components p3–4: 양면sector·population die·house mat·resource/influence dial·guild/installation/corruption 분리 확인.','기존cube=함대강도와population die를구분. Galactic 미니어처판·전체섹터배치/시나리오미검수.'),
'star-wars-rebellion':('Rules Reference p2–4: mission/leader pool·capture/attachment ring·build queue·진영/space-ground 전투구분을본문대조.','구성물 시각도해가없는범위. army/player색과충성/사보타주아이콘의실제그림은미확인.'),
'star-wars-outer-rim':('Rules Reference p2–4: path공간인접·ship/player board의asset slot·standee/character card·개인목표면·contact bounty관계 확인.','지도sector/endcap·contact색·fame/reputation도해는이페이지에없으므로확정하지않음.'),
'terra-mystica':('기본 p2–4:7지형·개인색building/bridge/priest, 자연색worker·공용coin·보라power·각faction mat/공용cult board 확인.','확장제외. resources 전체owner색묶음이worker/coin/power와priest를혼합한다.'),
'jaipur':('현행2인 p2–4:상품/낙타카드와상품/bonus/camel/seal token 분리, 시장5장·낙타herd·bonus뒷면값 숨김·상품공급순서 확인.','개인획득token 숨김범위는추가본문미검수. token의정체/값을서로바꿔추정하지않음.'),
'calico':('기본 p2–4: 개인hex quilt/3design goal·색/무늬 독립patch·6black-white pattern tile·cat/6색button+rainbow, 시장3·손2 확인.','손패공개정책/고양이별전체조건·개별hex SVG도형미검수.')}
for game,(facts,limits) in rows.items():
 n[game]=dict(pages=[1,2] if game=='monopoly' else [1,2,3,4],facts=facts,limits=limits,readScope='지정 원문 PDF contact sheet 직접 시각확인 및 해당 본문대조',checkedDimensions=['selected-edition','component-kind','board-and-player-area','type-color-vs-owner-scoped'],visual=game not in ['arkham-horror-3','star-wars-rebellion','star-wars-outer-rim'])
n['terraforming-mars']['pages']=[1,2,3,4,5,6];n['terraforming-mars']['facts']+=' p5–6에서bronze1/silver5/gold10 resourcecube와개인색playercube·보유/생산구별 확인.';n['terraforming-mars']['limits']='모든카드유형·resource카드부착·특수지도/확장미검수.'
(out/'notes.json').write_text(json.dumps(n,ensure_ascii=False,indent=2)+'\n')
print(len(n),'page reading notes')
