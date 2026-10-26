import json
from pathlib import Path
out=Path(__file__).resolve().parent
f=json.loads((out/'findings.json').read_text())
claims={x['gameId']:x for x in json.loads((out/'claims.json').read_text())}
docs={x['gameId']:x for x in json.loads((out/'local-documents.json').read_text())}
rows=[
 ('F002','anachrony',0,'PDF p.2 Component List','workers 전체 color_role=owner, owner_color_supported=true','Scientist/Engineer/Administrator/Genius는 종류별 그림·색인 공용일꾼. 외골격은 개인 Path표식.','worker variant를 고정 유형색/종류로 분리하고 외골격만 owner색 유지.'),
 ('F003','dune-imperium-uprising',3,'PDF p.3 Game Components / Player Components','resources 전체 color_role=owner, owner_color_supported=true','Water(파랑), Solari(회색), Spice(주황)는 공용 유형 자원. Player Components의 disc와 다르다.','resource 3유형은 fixed-semantic, disc만 owner색으로 variant별 분리.'),
 ('F004','seven-wonders-duel',2,'PDF pp.2–4 Game Elements','progress 전체 color_role=owner, owner_color_supported=true','진보토큰은 녹색, 군사토큰/Conflict pawn은 빨강 공용 구성물이며 두 플레이어별 색을 택하지 않는다.','progress를 fixed-semantic으로 선언하고 진보/군사/Conflict pawn 대표형을 별도 유지.'),
 ('F005','hansa-teutonica',2,'PDF pp.1–3 Components / Setup','bonus color_role=owner, owner_color_supported=true','bonus marker는 공용 유형그림 표식(시작용 금색 포함)이며 개인색 Trader/Merchant와 다르다.','bonus를 고정 유형색으로, 소유는 owner ID 속성만 유지.'),
 ('F006','terraforming-mars',2,'PDF pp.5–6 Markers / Player Boards','cubes 전체 color_role=owner, owner_color_supported=true, 단일 cube variant','자원 cube는 청동1/은5/금10의 값 종류, Player marker cube는 개인색이다. 명세 문구는 이를 구분하지만 매핑은 구분하지 않는다.','component ID 유지, 자원cube 1/5/10은 fixed-type-value, player cube만 owner색으로 나눈다.'),
 ('F007','terra-mystica',2,'PDF pp.3–4 Components / Setup','resources 전체 owner색','자연색 worker, 공용 동전, 보라 power와 개인색 priest가 별개다.','worker/coin/power는 고정유형색, priest만 owner색.'),
 ('F008','a-feast-for-odin',3,'PDF p.3 Tiles / Goods / Money','ships(배·가축·은화) 전체 owner색','배타일은 공용형태, 양/소는 상품타일이며 은화도 공용 값이다. 개인색 바이킹과 다르다.','ships 묶음의 배/가축/은화 variants는 고정유형색으로, 소유는 관계만.'),
 ('F009','castles-burgundy',3,'PDF p.2 Components for the Base Game','money(은화·일꾼·점수) 전체 owner색','은화/worker token은 공용형태이며 turn-order/VP marker만 개인색이다.','coin/worker는 fixed-semantic, 개인 marker만 owner색.'),
 ('F010','sagrada',0,'PDF pp.1–3 Components / Dice Placement','dice color_role=owner','공용주머니의 주사위5색 red/yellow/green/blue/purple는 창문/목표에 쓰는 유형색이다. 개인판 소유색과 다르다.','5개유형색×눈1–6을 구분하고 owner색과 분리.'),
 ('F011','sagrada',3,'PDF pp.1–2 Components / Player Setup','tokens(은총·점수) 전체 owner색','흰 favor token은 공용형태, score marker는 선택한window frame에 맞는다.','favor는고정유형색, score marker만 개인판/owner연결.'),
 ('F012','king-of-tokyo',1,'PDF pp.2–3 Contents / Setup','dice color_role=owner','공유기본주사위6개는검정, power용2개는녹색이다. 괴수/플레이어별 소유색을 고르는주사위가 아니다.','숫자1/2/3·에너지/공격/하트 6면은 유지, black base/green extra 유형색으로 분리.'),
 ('F013','tiny-towns',0,'PDF pp.1–2 Objective / Setup','resources color_role=owner','5공용 자원cube는 wood갈색/wheat노랑/brick빨강/glass청록/stone회색. 개인색이아니다.','5자원 유형별 fixed-semantic cube로 선언.'),
 ('F014','tiny-towns',1,'PDF pp.2–4 Setup / Building Cards','buildings color_role=owner','건물 색/모양은 cottage/chapel/farm 등 유형이며 공용공급에서 각개인town에 놓는다. monument도 별도유형이다.','building유형색/shape와 owner를분리하고 개인town소유만 별도관계로.'),
 ('F015','seven-wonders',3,'PDF pp.1–3 Elements / Setup','military color_role=owner','분쟁표식은 승패/값(-1,+1,+3,+5)의공용유형색이며 개인색설정없음.','군사표식을 값/승패유형색으로 고정, 획득소유는관계로.'),
 ('F016','twilight-imperium-4',4,'PDF p.4 Components','trade(상품·교역품) color_role=owner','Trade Good/Commodity는 공용양면token이며6색plastic unit나 faction command/control token과 다르다.','trade good/commodity앞뒤를 고정유형으로, owner보유관계는별도.'),
 ('F017','azul',2,'PDF pp.2–3 Setup / Factory offer','first color_role=owner','선플레이어표식은공용단일표식이며center에서플레이어floor로이동한다. 플레이어별 고유색을 가진 여러 표식이 아니다.','first를fixed-semantic으로, 보유자/현재구역은관계로만.'),
 ('F018','age-of-innovation',0,'PDF pp.2–3 Components','map(지형·건물·다리) 전체 color_role=owner','지형은 7종 양면 공용 terrain tiles로 그림/색이 고정되어 있다. 플레이어 색 목재 건물/다리는 별도 구성이다. 지형의 종류색을 현재 보유자색으로 바꿀 수 있는 계약은 다르다.','map ID 유지, terrain variant는 고정 유형색, 목재 building/bridge만 owner색으로 분리.'),
 ('F019','twilight-struggle',1,'PDF pp.3–4 Markers / Game Setup','markers(영향력·DEFCON·군사·우주·점수) 전체 color_role=owner','US/USSR 영향력·우주·군사마커는 진영별 구분하지만 Turn/VP/DEFCON은 공용 하나의 트랙 표식이다. 그림도 진영색 마커와 노란 Turn/VP 및 DEFCON 표식을 구별한다.','진영별 influence/military/space와 공용 turn/VP/DEFCON variants를 분리. 공용 표식은 fixed-semantic 유지.'),
 ('F020','power-grid',3,'PDF pp.2–3 Spielmaterial / Spielvorbereitung','money(돈·순서 표식) 전체 color_role=owner','Elektro는 값별 지폐 공용 은행이며 소유자별 색상 화폐가 아니다. 순서/연결수는 개인색 집을 각각 사용한다.','money ID 유지, 지폐 값/형태는 fixed-semantic으로 분리하고 순서/연결수 표식만 개인색 집 연결.')
]
for id,game,index,page,existing,value,fix in rows:
 if any(x['id']==id for x in f):continue
 g=claims[game];url=docs[game]['url'] if game in docs else next(r['url'] for r in json.loads((out/'download-curl-receipts.json').read_text()) if r['gameId']==game)
 assert url
 f.append(dict(id=id,gameId=game,edition=g['edition']['name'],status='VERIFIED_MISMATCH',layer=['art'],sourceURL=url,sourceTitle=game+' official selected rules',page=page,visualEvidence='docs/game-fidelity-audit/review/pages/'+game+('-detail' if game=='terraforming-mars' else '')+'.png',checkedAt='2026-10-22',paths=['public/game-art/games/'+game+'/mapping.json#/components/'+str(index)+'/color_role','public/game-art/games/'+game+'/mapping.json#/components/'+str(index)+'/owner_color_supported'],existing=existing,evidenceValue=value,impact='유형색과 소유색이 매핑 계약에서 혼합되어 실물 유형색의 의미를 잘못 전달한다. 런타임의 실제 잘못된 정정/데이터 변환을 재현했다는 주장은 아니다.',minimumCorrection=fix,limits='정확한 인쇄색조·전체 카드/실물 재고 검수 아님. 대표아이콘의 미술적 단순화와 구분한 색역할 계약 finding.',inference=False))
(out/'findings.json').write_text(json.dumps(f,ensure_ascii=False,indent=2)+'\n')
print(len(f),'findings')
