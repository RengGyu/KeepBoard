"""Independent page-reading notes. No product/source edits."""
import json
from pathlib import Path
out=Path(__file__).resolve().parent
notes={
 'agricola':([1,2,3,4],'2016 Revised 구성물과 개인 농장/행동판, 가족5·울타리15·외양간4, 직업 노랑/보조설비 주황/대설비 빨강을 확인. 가족 원반 대표형은 불일치.','판본별 전체 공급 수·나머지 규칙·전체 카드 앞면은 미검수.'),
 'anachrony':([1,2,3,4],'Essential Edition 표지·본판/Path판/개인판·지도자·Timeline/Impact·연구 주사위를 확인. 일꾼은 종류별 그림/색의 공용 공급, 외골격은 Path별 표식이다.','일꾼 종류별 모든 활성/피로 그림·나머지 행동 규칙은 미검수.'),
 'cascadia':([1,2,3,4],'기본판 서식지/야생동물/득점카드/자연토큰 분류, 솔방울 자연토큰, 서식지 육각·5종 동물과 공급/개인 배치를 확인.','전체 서식지 인쇄 조합·득점 카드별 조건과 기존 SVG의 모든색은 미검수.'),
 'caverna':([1,2,3,4],'기본판 개인 Forest/Mountain판·동굴/방/밭/목장 타일·색별 드워프·무기값 표식·공용 행동판을 확인. 실제 드워프는 원반으로 나타난다.','투구는 대표 그림이므로 그 자체를 수량/정체 오류로 승격하지 않음. 나머지 가구·동물 규칙 미검수.'),
 'barrage':([1,2,3,4],'댐base/elevation·도관·발전소의 회사색, 물방울/굴착기/믹서·건설바퀴·계약타일·값1/3/5 공용크레딧과 엔지니어 개인색 구분을 확인.','전체 수로 연결·회사별 능력·계약 세부는 미검수.'),
 'crew-deep-sea':([1,2,3,4],'독립 Deep Sea 기본판: 4색1–9·잠수함1–4, task카드, 소나/조난/선장 표식과 임무로그를 확인. 카드 유형은 소유색이 아니다.','전체96태스크 내용·소나 처리 세부·기존 대표형 모든색은 미검수.'),
 'dominant-species':([1,2,3,4],'원작 기본판: 육각 earth/tundra, 종cube·지배cone·행동cylinder 구분, 6종 원소disc와 동물판/행동판을 확인.','원소 기존 대표형은 전체종류 목록 아님. 전체 지도 슬롯·개별 카드 효과 미검수.'),
 'dune-imperium-uprising':([1,2,3,4],'Uprising 표지, 별도 Agent/Spy·병력cube·공용 sandworm, 공용 water/Solari/spice와 개인색 disc를 확인. 자원묶음 전체를 owner색으로 선언한 매핑은 혼동.','CHOAM/팀모드 추가규칙·전체 리더/카드 효과 미검수.'),
 'seven-wonders-duel':([1,2,3,4],'기본 Duel: 3시대 카드/불가사의·공유 Conflict pawn·군사토큰·진보토큰·공용 동전 확인. 진보 녹색·군사 빨강은 소유자색이 아니다.','시대 카드 전체 유형색·피라미드 전체 배치와 덱 수량 미검수.'),
 'terraforming-mars':([1,2,3,4],'기본판 표지와 원래 Mars 지도·TR/세대/산소/온도·해양9칸, 도시/녹지/바다와 개인자원판 분리 개요 확인.','자원/소유 cube 구별은 PDF p5–6 추가 시각확인 전에는 판정하지 않음.'),
 'hansa-teutonica':([1,2,3,4],'Big Box 원지도: Trader cube/Merchant disc, 색별개인책상·사무소/노선, 유형별 bonus marker 공용공급·획득/사용 상태를 확인. bonus를 owner색으로 선언한 매핑 불일치.','동/영국 지도·추가카드 모드 제외. 전체 능력/보너스효과는 미검수.'),
 'istanbul':([1,2,3,4],'Big Box 문서의 BASE GAME 블록만 대조: 장소1–16, 개인수레, merchant 두꺼운disc·assistant 얇은disc·family cylinder, 공용 Governor/Smuggler 및 기본 모스크/요구타일 확인.','실제4×4 배치는 p6 추가 확인 전에는 VERIFIED 아님. 확장17–25 구성은 판정에서 제외.'),
 'machi-koro':([1,2,3,4],'원작 시설/4랜드마크·공용동전1/5/10·공유두주사위·도시/공급 분리 및 건설전/후 면을 확인.','문서표지만으로 5주년 세부인쇄 일치 확정은 보류. 유형색 정체 전체와 임의 owner 주사위색의 제품효과 미검수.')
}
target=out/'notes.json'
old=json.loads(target.read_text()) if target.exists() else {}
for game,(pages,facts,limits) in notes.items():old[game]=dict(pages=pages,facts=facts,limits=limits,readScope='지정 PDF 페이지를 새로 렌더한 contact sheet 직접 시각확인; 해당 구성/설정 텍스트 대조',checkedDimensions=['selected-edition','component-kind','board-and-player-area','type-color-vs-owner-scoped'],visual=True)
target.write_text(json.dumps(old,ensure_ascii=False,indent=2)+'\n')
print(len(old),'independent notes')
