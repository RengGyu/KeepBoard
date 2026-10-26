#!/usr/bin/env python3
"""Assemble receipts and narrow research claims; no network or upstream writes."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def artifact(path):
    p=ROOT/path
    return {'path':path,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}

def pdf_source(sid,title,receipt,stem,edition,scope,pages,claims,limits):
    r=json.loads((ROOT/'sources'/receipt).read_text())
    local=r['local_path']
    url=r.get('requested_url')
    if not url:
        parent=json.loads((ROOT/r['parent_receipt']).read_text())
        url=parent['requested_url']
    return {'source_id':sid,'title':title,'authority':'official-publisher',
            'url':url,'accessed_date_kst':'2026-10-22','retrieval_receipt':'sources/'+receipt,
            'format':'application/pdf','artifact':artifact(local),
            'metadata':json.loads((ROOT/'previews'/(stem+'.metadata.json')).read_text()),
            'metadata_date_caution':'PDF 작성·수정일/URL 경로 날짜를 실제 발매·판본 연도로 간주하지 않음.',
            'edition_identification':edition,'read_scope':scope,
            'visually_reviewed_pages':[{'pdf_page_1based':p,'artifact':artifact('previews/'+stem+f'-p{p}.png')} for p in pages],
            'claims':claims,'not_verified':limits,
            'rights':'출판사 저작권 유지. 공개 배포의 로컬 조사 자료. 재배포·상업 아트·모델 학습 허락을 확보했다는 뜻 아님.',
            'full_rulebook_verified':False}

sources=[
 {'source_id':'S01','title':'2F Funkenschlag Recharged official product and rules link',
  'authority':'original-publisher','url':'https://2f-spiele.de/2f-spiele/funkenschlag-spielefamilie/funkenschlag-recharged-version/',
  'accessed_date_kst':'2026-10-22','format':'text/html','origin_http_status':None,
  'status':'WEB_OPENED','http_note':'web 본문 열람 성공. web 도구가 origin HTTP status를 제공하지 않았으므로 200을 추정 기입하지 않음.',
  'location':'Spielregeln: Funkenschlag Recharged Version Spielregel (deutsch); contents; licensing partners',
  'confirmed':'현재 공식 Recharged 제품이 S02 독문 PDF를 직접 연결한다. 기본 Germany/USA 판과 Recharged 표식을 식별하는 출처 연결이다.',
  'not_verified':'영문/한국어 모든 인쇄 규칙의 조항별 동등성은 미검증.'},
 pdf_source('S02','Funkenschlag Recharged — official German rules','power-grid-de-system.receipt.json','power-grid-de',
            'S01가 Recharged 규칙으로 직접 배포. Germany/USA 및 할인 표식/경매 망치/카드 뒷면 체계 확인.',
            'p2–5 setup/order/auction/resources/build; 현금 관련 전체 추출 텍스트 검색. p1/3/4/5 시각 확인.',[1,3,4,5],
            [{'claim_id':'PG-ORDER','label':'VERIFIED_SCOPED','location':'PDF p4 Phase1/2; p5 Phase3/4','statement':'순서 트랙과 단계별 진행 방향·처리 완료 상태가 구별된다.'},
             {'claim_id':'PG-STACK','label':'VERIFIED_SCOPED','location':'PDF p3 Setup8–9','statement':'공개 시장 외 뒷면 발전소 더미가 있고 최초 Step3 카드는 아래에 놓인다. 카드 뒷면 종류는 일부 정보를 나타낸다.'},
             {'claim_id':'PG-CASH-HOLD','label':'UNCLEAR','location':'검토 p2–5/전체 텍스트 키워드 확인 범위','statement':'보유 현금 공개 의무를 확정할 명문 근거는 이번 범위에서 확보하지 못했다.'}],
            ['현금 공개 의무','모든 지도·확장 규칙','현재 저장된 게임의 숨은 더미 순서']),
 {'source_id':'S03','title':'Ticket to Ride official product: current and Old Rules',
  'authority':'official-publisher','url':'https://www.daysofwonder.com/game/ticket-to-ride/',
  'accessed_date_kst':'2026-10-22','format':'text/html','origin_http_status':200,
  'retrieval_receipt':'sources/ttr-product-system.receipt.json','artifact':artifact('sources/ttr-product.html'),
  'location':'Downloads: Rulebook English / Old Rules All',
  'confirmed':'동일 공식 페이지가 현행7201N V2 PDF와 구판 ZIP을 구별해 연결한다.',
  'not_verified':'이 페이지의 최신 구성만으로 사용자 소장판을 식별할 수 없음.'},
 pdf_source('S04','Ticket to Ride current English 7201N V2','ttr-current.receipt.json','ttr-current',
            '공식 페이지의 현행 English link, 문서 ©2025. URL filename7201N_TICKET2RIDEV2.',
            'PDF p2 Components/Setting up; pp3–4 hand/tickets. p2 시각 확인.',[2],
            [{'claim_id':'TTR-CURRENT-SETUP','label':'VERIFIED_SCOPED','location':'PDF p2','statement':'구성 티켓33장, 최초4장 배분/최소2장 보유.'},
             {'claim_id':'TTR-CURRENT-PRIVATE','label':'VERIFIED_SCOPED','location':'PDF p4 Drawing Tickets','statement':'목적지 티켓 정체는 종료까지 비밀로 유지한다.'},
             {'claim_id':'TTR-COUNT-HOLD','label':'UNCLEAR','location':'PDF pp2–4 검토 범위','statement':'손패/티켓 장수 공개 의무까지 확인한 것은 아니다.'}],
            ['사용자 소장판 동일성','장수 공개 의무','구판과 전면 호환']),
 pdf_source('S05','Ticket to Ride official Old Rules — English member','ttr-old-en.receipt.json','ttr-old-en',
            '공식 ZIP의7201-T2R-Rules-EN-20240423_LOWRES.pdf, 문서 ©2004–2024. 공식 페이지에서 Old Rules로 분류.',
            'PDF p2 Components/Setting up; pp3–4 hand/tickets; p1/2 시각 확인.',[1,2],
            [{'claim_id':'TTR-OLD-SETUP','label':'VERIFIED_SCOPED','location':'PDF p2','statement':'구성 티켓30장, 최초3장 배분/최소2장 보유. S04와 차이가 있다.'},
             {'claim_id':'TTR-OLD-PRIVATE','label':'VERIFIED_SCOPED','location':'PDF p2/4','statement':'목적지 티켓 정체는 종료까지 비밀로 유지한다.'}],
            ['파일명 날짜를 상자 인쇄일로 확정하지 않음','이 자료만으로 장수 공개 의무를 확정하지 않음']),
 {'source_id':'S06','title':'AEG Calico official product Rulebook link','authority':'official-co-publisher',
  'url':'https://www.alderac.com/calico/','accessed_date_kst':'2026-10-22','format':'text/html',
  'status':'WEB_OPENED','origin_http_status':None,'location':'Rulebook link; co-publishing Flatout; SKU AEG6010',
  'confirmed':'상품의 Rulebook 링크가 S07 공식 이미지형 PDF로 연결된다.',
  'not_verified':'상품 소개의 hand라는 말만으로 공개성까지 정할 수 없음.'},
 pdf_source('S07','Calico Base Game optimized official rulebook','calico-rules-system.receipt.json','calico-rules',
            '16쪽 물리 기본판, AEG/Flatout, p16 ©2020. 디지털판이나 2025 신판으로 이름 붙이지 않음.',
            '텍스트 추출은 빈 본문. PDF p4/5 설치·턴·도형, p16 크레딧을 직접 시각 확인.',[4,5,16],
            [{'claim_id':'CALICO-HAND-SETUP','label':'VERIFIED_SCOPED','location':'PDF p4 Beginner Setup G/H; p5 Standard Setup G/H','statement':'개인 손2장과 공개 시장3장을 구별한다.'},
             {'claim_id':'CALICO-HAND-HOLD','label':'UNCLEAR','location':'PDF p4/5 검토 범위','statement':'손 타일의 의무 공개/비공개를 직접 명시한 문구는 확보하지 못함. 뒷면 도형으로 소유자 보관을 지지하는 것은 INFERRED.'}],
            ['공개 플레이 관행의 공식 규칙성','전체 모드·프로모 조건']),
 pdf_source('S08','Hansa Teutonica Big Box English 2te Auflage','hansa-en-system.receipt.json','hansa-en',
            '14쪽, metadata title HTBB_Rules_EN_2te_Auflage_RZ.indd. 기본 Hanseatic League 지도 범위.',
            'PDF p2 Bank 설명, p3 setup/개인판 도형, p4 Income; 세 쪽 직접 시각 검수.',[2,3,4],
            [{'claim_id':'HANSA-SUPPLY','label':'VERIFIED_SCOPED','location':'PDF p3 Game Setup','statement':'시작 금색 표식 설치 후 남은 보너스 표식을 섞어 뒷면 공급으로 둔다.'},
             {'claim_id':'HANSA-BANK-CONFLICT','label':'VERIFIED_CONFLICT','location':'PDF p2 Bank vs p3 board diagram/p4 Income','statement':'인쇄면 p2는3/4/7/C, p3도형·p4는3/5/7/C. 추출 오류만은 아니다.'},
             {'claim_id':'HANSA-TYPO-HYPOTHESIS','label':'INFERRED','location':'S08 p3/4 + S09 p2와 대조','statement':'영문 p2의4가 오탈자일 가능성이 강하지만 명시 정오표는 확보하지 못함.'}],
            ['출판사의 해당 오탈자 공식 확정','사용자 실제 개인판','다른 지도/모듈 전체 규칙']),
 pdf_source('S09','Hansa Teutonica Big Box German 2te Auflage','hansa-de.receipt.json','hansa-de',
            'S08과 대응하는14쪽 독문 문서군, metadata title HTBB_Rules_DE_2te_Auflage_RZ.indd.',
            'p2 Geldbeutel 직접 시각 검수, p4 Einnahmen 추출 텍스트 대조.',[2],
            [{'claim_id':'HANSA-DE-BANK','label':'VERIFIED_SCOPED','location':'PDF p2 Geldbeutel; p4 Einnahmen','statement':'독문은3/5/7/C이며 C는 전체를 의미한다.'}],
            ['독문 하나로 영어판 전체 오류를 자동 교정하지 않음']),
 pdf_source('S10','Stone Age official English rules, same URL as existing scoped evidence','stone-age.receipt.json','stone-age',
            'Hans im Glück 공식8쪽 English PDF. 기존 stone-age.essentials.rules와 동일URL. 파일 metadata2017; 경로2023은 판본 연도가 아님.',
            'PDF p4 Game Overview/Game Rounds 직접 시각 검수.',[4],
            [{'claim_id':'STONE-FIRST-PLAYER','label':'VERIFIED_SCOPED','location':'PDF p4 Game Overview','statement':'라운드 후 시작 표식을 왼쪽 플레이어에게 넘긴다.'}],
            ['현행/구판 전체 개정 차이','제품에서 자동 전달하는 기능의 구현/시험']),
 {'source_id':'L01','title':'Frozen Stone Age amendment and original review finding','authority':'local-project-evidence',
  'accessed_date_kst':'2026-10-22','format':'application/json','label':'VERIFIED_LOCAL_STRUCTURE',
  'locations':['docs/game-essentials/manifest.json game_id=stone-age changes claim_id=stone-age:1',
               'docs/game-essentials/evidence.json#/sources/17',
               'docs/research/game-specs-120/games/stone-age.json state_fields id=starting-player',
               'docs/game-essentials/manifest.json game_id=stone-age review_findings[0]'],
  'input_hashes':'input-hashes.json',
  'claims':[{'claim_id':'STONE-ALREADY-PRESENT','label':'VERIFIED_TRACKING_MISMATCH','statement':'변경 이력·현재 필드·공식 scoped 근거가 모두 있는데 finding만 필드 없음/UNCLEAR로 남아 있다.'}],
  'not_verified':'이 로컬 구조 사실이 앱 동작·전체 규칙의 검증은 아님.'}
]
receipts=[]
for p in sorted((ROOT/'sources').glob('*.receipt.json')):
    r=json.loads(p.read_text());r['receipt_path']=str(p.relative_to(ROOT));receipts.append(r)
failed_web=[
 {'url':'https://www.daysofwonder.com/game/ticket-to-ride/','accessed_date_kst':'2026-10-22','tool_result':'Timeout fetching (tool wrapper400)','origin_http_status':None,'result':'FAILED_WEB_FETCH','later':'일반 GET HTTP200 및 HTML 확보'},
 {'url':'https://2f-spiele.de/pdf/funkenschlag-recharged-anleitung_de.pdf','accessed_date_kst':'2026-10-22','tool_result':'Timeout fetching (tool wrapper400)','origin_http_status':None,'result':'FAILED_WEB_FETCH','later':'일반 GET HTTP200 및 PDF 확보'},
 {'url':'https://www.hans-im-glueck.de/wp-content/uploads/2023/06/stone_age_rules.pdf','accessed_date_kst':'2026-10-22','tool_result':'Timeout fetching (tool wrapper400)','origin_http_status':None,'result':'FAILED_WEB_FETCH','later':'일반 GET HTTP200 및 PDF 확보'},
 {'url':'https://pegasus.de/en/NetiMedia/download?mediaId=018e5c283e69708e9b50c79cb8a8b317','accessed_date_kst':'2026-10-22','tool_result':'screenshot p2 Cache miss','origin_http_status':None,'result':'FAILED_SCREENSHOT','later':'동일공식 PDF 정상 다운로드 후 PDFKit 페이지 시각 검수'},
]
out={'as_of':'2026-10-22','time_zone':'Asia/Seoul; HTTP receipts retain UTC timestamps',
     'evidence_levels':{'VERIFIED_SCOPED':'선택 문서의 지정 조항/도형 확인만','VERIFIED_CONFLICT':'출처들에 다른 값이 실제로 있음','VERIFIED_TRACKING_MISMATCH':'기존 입력의 이력/필드와 finding이 불일치','INFERRED':'직접 공식 확정 문구가 없는 해석','UNCLEAR':'범위를 정해 조사했으나 해당 주장 근거 미확보','RECOMMENDATION':'앱 저장 방식 권고; 게임 규칙 아님'},
     'sources':sources,'retrieval_attempts':receipts,'web_failures':failed_web,
     'zip_size_check':{'method':'ordinary HEAD, no auth/proxy/UA change','url':sources[4]['url'],'origin_http_status':200,'content_type':'application/zip','content_length':76613492,'accessed_date_kst':'2026-10-22','meaning':'35MB 연구 로컬 한도 실패; 출판사 차단 아님. 실제 크기 확인 뒤80MB 한도로1회 재다운로드 성공.'},
     'search_limits_and_negatives':[
       {'scope':'Hansa official errata','query':'site:pegasus.de Hansa Teutonica Bank errata','result':'해당 정오표 검색 결과 없음','claim_limit':'정오표가 존재하지 않는다고 단정하지 않음. 문의 발송 없음.'},
       {'scope':'Calico hand visibility','queries':['site:alderac.com Calico hand tiles secret open information','site:flatout.games Calico hand hidden tiles rules'],'result':'공식 상품/규칙 후보는 확인. 의무 공개 명문을 찾지 못함.','claim_limit':'시장 공개/손 보유만으로 공개 의무를 만들지 않음.'},
       {'scope':'Power Grid cash','method':'확보PDF p2–5 및 전체 추출 텍스트에서 현금·공개 키워드 조사','result':'보유 현금 공개 명문 미확보','claim_limit':'문서에 절대로 없다고 단정하지 않음.'}],
     'client_failures_are_not_site_blocks':'sandbox DNS 실패·Python 신뢰저장소 TLS 실패는 HTTP 응답 전 오류. 시스템 curl은 기본 인증서 검증을 유지했다. -k/자격증명/프록시/UA 위장/403 재시도를 사용하지 않았다.',
     'upstream_or_product_changes':0}
(ROOT/'evidence.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Evidence:',len(sources),'sources;',len(receipts),'receipts;',sum('artifact' in s and s['format']=='application/pdf' for s in sources),'decoded PDFs')
