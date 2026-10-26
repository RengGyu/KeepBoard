# 120게임 촬영 구획·복원 구분

앱 계약의 제안이며 실사진 정확도 인증이 아니다. ID별 JSON에는 원명세 SHA, 판본, 모든 영역/부품/현재 typed key와 공식 확인 범위를 담았다. 공개 개인보유의 주인 자동 추론은 하지 않는다.

|게임 / ID|먼저 찍을 구획|재개 때 구별할 내용|
|---|---|---|
|[카탄 · catan](games/catan.json)|섬 전체와 바다 항구까지 한 장, 숫자·도로·도시가 겹친 구역 근접|숫자/지형/도둑 공존, 도로 변·건물 꼭짓점, 항구 종류/비율과 색 소유자 연결 별도|
|[카르카손 · carcassonne](games/carcassonne.json)|지도 전체와 갈라진 도시·들판/누운 미플 구역|격자·90도 회전뿐 아니라 미플이 붙은 타일 내부 지형; 점수판 한 바퀴 이력 미추론|
|[티켓 투 라이드 · ticket-to-ride](games/ticket-to-ride.json)|도시명·노선 양끝이 보이는 지도와 공개 열차 카드열|평행 노선/차량 점유와 카드/티켓 구분; 2025판과 구판 시작 티켓 규칙 혼합 금지|
|[아줄 · azul](games/azul.json)|공장별 무리, 개인 패턴줄·벽·바닥 전체|패턴줄의 누적과 벽의 설치를 구별; 색만 같다고 묶음 합치지 않기|
|[스플렌더 · splendor](games/splendor.json)|카드 비용 하단·보너스 상단·점수까지 한 카드 전체|개발 비용/영구 보너스/귀족 요구/실물 토큰 수를 다른 값으로 유지|
|[세븐 원더스 · seven-wonders](games/seven-wonders.json)|도시 카드의 비용/효과 띠와 불가사의 단계|밑에 넣은 카드 뒷면 정체와 비밀 드래프트 손패를 도시 건물과 구별|
|[윙스팬 · wingspan](games/wingspan.json)|서식지 한 줄씩 카드 전체·알·저장 먹이/접힌 카드 경계|개인 공급 먹이와 카드에 저장한 먹이 구별; 카드 식별과 인쇄 비용/점수 보존|
|[에버델 · everdell](games/everdell.json)|초원 진열과 개인 도시의 카드·점유 일꾼 근접|같은 카드의 실물 인스턴스/주민-건물 연결/계절 진행을 분리|
|[아크 노바 · ark-nova](games/ark-nova.json)|동물원 전체, 행동 카드 줄, 카드 인쇄 패널|울타리 모양·면/카드 강도 순서/개인 카드와 공급 구분|
|[테라포밍 마스 · terraforming-mars](games/terraforming-mars.json)|화성 칸·해양/도시/녹지와 개인 자원판 근접|자원 재고와 생산량, 금속 큐브 액면과 실물 개수 구분|
|[듄 임페리움: 업라이징 · dune-imperium-uprising](games/dune-imperium-uprising.json)|행동판·전투/주둔군·공개 카드열 분리|행동 중/공개 턴은 질문; 스파이·병력·샌드웜 위치를 하나의 수로 합치지 않기|
|[브라스: 버밍엄 · brass-birmingham](games/brass-birmingham.json)|도시별 산업 타일 면과 운하/철도 연결|타일 레벨/뒤집힘·맥주/철/석탄·시장 가격칸을 구별|
|[아그리콜라 · agricola](games/agricola.json)|개인 농장 셀과 방·울타리·동물·작물의 겹침|공급/배치 가족, 설비/직업 손패, 집 종류와 수확 처리 별도|
|[비티컬처 · viticulture](games/viticulture.json)|밭과 저장고 품질칸을 각각 근접|포도/와인 색·품질과 토큰 수, 방문객 종류별 손패/사용 구분|
|[사이드 · scythe](games/scythe.json)|지도 영토 자원과 세력/행동 매트|지도 자원은 영토에, 기술큐브는 해제 슬롯에; 카드/별의 과거조건 추정 금지|
|[루트 · root](games/root.json)|공터/길/숲 지도와 세력별 공개 보드|지지자와 손패, 칙령 열·장교·아이템 손상/소진 등 다른 세력 상태 구별|
|[정령섬 · spirit-island](games/spirit-island.json)|섬 모듈 경계와 땅 번호, 정령판, 침략 슬롯|현신 공급/땅 배치와 침략자 종류, 공포/공개 능력/미공개 덱 분리|
|[팬데믹 · pandemic](games/pandemic.json)|도시 이름·연결선·질병 큐브·연구소|발병/감염률/치료와 박멸은 별도; 격화 중 더미 상태와 사진만으로 얻을 수 없는 단계 구분|
|[글룸헤이븐: 사자의 턱 · gloomhaven-jaws](games/gloomhaven-jaws.json)|시나리오 책 쪽/육각판과 몬스터 번호, 캐릭터 상태|체력/경험·활성/버림/소실·아이템 방향을 보존; 미공개 방/선택 비추론|
|[프로스트헤이븐 · frosthaven](games/frosthaven.json)|전장 타일·문·번호, 캐릭터·전초기지 각각|전투와 마을 보유를 구분; 열린 방만 기록하고 비공개 목표/계절 덱 보존|
|[아컴호러 카드게임 · arkham-lcg](games/arkham-lcg.json)|장소 연결 아이콘과 조사자 자산·교전 근접|위치 인접과 교전/부착, 소진·피해·공포·사용량 분리; 2026 AHC100 판본 고정|
|[트와일라잇 임페리움 4판 · twilight-imperium-4](games/twilight-imperium-4.json)|은하 섹터와 행성/우주 칸을 근접, 지휘 풀|같은 타일의 함대/지상군·행성 소유/소진, 세 지휘풀을 독립 보존|
|[아르낙의 잊혀진 유적 · lost-ruins-arnak](games/lost-ruins-arnak.json)|장소·수호자, 연구 두 말, 도구/유물 경계|조수 면/사용, 우상 슬롯, 사용 카드와 덱을 분리|
|[버건디의 성 · castles-burgundy](games/castles-burgundy.json)|선택 개인판 번호·육각칸, 중앙 창고, 주사위|미설치 저장 타일과 영지 타일, 눈과 수량, 상품 묶음 구분|
|[캐스캐디아 · cascadia](games/cascadia.json)|개인 육각지도 전체와 반쪽 서식지/동물 부착|60도 방향·타일별 서식지 경계/동물 토큰, 선택 타일-동물 쌍 분리|
|[패치워크 · patchwork](games/patchwork.json)|개인 이불 셀과 조각 모양, 남은 패치 둘레|반사/회전·점유 셀과 둘레 선택 순서, 같은 시간칸 위아래 구분|
|[루미큐브 · rummikub](games/rummikub.json)|공용 타일 묶음별 숫자·색과 조커, 본인 받침대 별도|같은 숫자/색 복제 실물과 묶음 순서 보존; 조커 대체값/초기등록 이력 비추론|
|[클루 · clue](games/clue.json)|저택 방·문·통로와 인물/무기, 본인 증거 별도|정답 봉투/타인 메모는 촬영 제외; 공개 위치와 개인 추리 확실/가설 분리|
|[세븐 원더스 대결 · seven-wonders-duel](games/seven-wonders-duel.json)|겹친 시대 카드 구조와 공개 효과 패널|앞뒤·덮는 카드 관계, 불가사의 아래 카드와 군사/진보 상태 구분|
|[클랭크! 카타콤 · clank-catacombs](games/clank-catacombs.json)|던전 타일 내 방·문·통로와 말, 카드열|포털/잠금과 소음 대기/주머니/피해 분리; 미공개 타일 비추론|
|[히트: 질주의 열기 · heat](games/heat.json)|트랙 차선·차량과 개인 기어/열 구역|현재 위치와 이미 지난 랩 구분; 손패/엔진/공개/버림을 합치지 않기|
|[카베르나 · caverna](games/caverna.json)|농장/동굴 셀과 가구·목장·동물, 무기 근접|드워프 인스턴스별 무기값·행동 위치, 가구 공급과 설치 상태 구분|
|[가이아 프로젝트 · gaia-project](games/gaia-project.json)|섹터 배치·행성·위성, 세력판 파워 그릇|연방 묶음과 단순 인접, 파워/가이아 구역·건물 공급 트랙 구분|
|[테라 미스티카 · terra-mystica](games/terra-mystica.json)|지형/건물/다리 양끝과 세력판|직접 연결과 항해, 파워 세 그릇/종교 위치·투입 성직자 구분|
|[그레이트 웨스턴 트레일 · great-western-trail](games/great-western-trail.json)|경로 갈림·건물 면, 철도/배송 디스크|가축 손패/덱, 역/고용 줄·해제 디스크를 별도 유지|
|[바라지 · barrage](games/barrage.json)|유역·도관·발전소의 입출구와 공사바퀴|상류/하류·바퀴 칸/회전과 묶인 기계·기술을 보존|
|[콩코르디아 · concordia](games/concordia.json)|육로/해로·도시 주택, 개인 창고 칸|경로 위 개척자와 도시 주택 구별, 창고 점유 상품/개척자와 카드 순서 보존|
|[오를레앙 · orleans](games/orleans.json)|시장지도·개인 계획칸·직업/발전 트랙|주머니 내부 비추론; 뽑은 추종자/잔류/배치·기술 대체 구분|
|[파워그리드 · power-grid](games/power-grid.json)|도시 점유칸, 현재/미래 발전소 줄, 연료 시장|연료는 발전소별 부착; 단계·순서는 수동, 비공개 돈을 시장값으로 추정 금지|
|[그랜드 오스트리아 호텔 · grand-austria-hotel](games/grand-austria-hotel.json)|호텔 층/방 면과 손님 주문·주방, 행동 주사위|주방 재고와 손님에 낸 음식 구분, 객실 점유와 직원 손패 분리|
|[르 아브르 · le-havre](games/le-havre.json)|공급 칸·라운드 선박과 건물/작업자|건물 소유/점유, 가공 전후 상품·선박·대출 구분|
|[오딘을 위하여 · a-feast-for-odin](games/a-feast-for-odin.json)|개인 본판·섬 격자, 상품 모양, 행동 일꾼|조각 회전/반사·덮은 보너스와 미설치 상품 구별; 잔치 처리 이력 수동|
|[반지전쟁 2판 · war-of-the-ring-2](games/war-of-the-ring-2.json)|지역 경계·군대 종류와 원정대/정치/사냥 트랙|같은 지역 인물/부대, 사냥 배정과 가용 행동 주사위·정치 상태 분리|
|[스타워즈: 리벨리온 · star-wars-rebellion](games/star-wars-rebellion.json)|시스템·부대/지도자와 생산 대기줄|반란군 기지/미션 등 역할 비밀은 일반 owner 손패로 수집하지 않기|
|[메이지 나이트 · mage-knight](games/mage-knight.json)|타일/육각칸·장소와 적/방패, 부대/스킬|횡회전/부상·준비/사용 스킬, 제안 카드와 손패/덱 구별|
|[네메시스 · nemesis](games/nemesis.json)|방 번호·문/탐색/화재/고장·소음 통로|엔진/목표의 감춘 정체와 공개 방/인물 상태 분리|
|[로빈슨 크루소: 저주받은 섬의 모험 · robinson-crusoe](games/robinson-crusoe.json)|탐험 타일·캠프와 행동 할당, 자원|지붕/울타리/무기 트랙, 행동 배정/해결과 미공개 사건 덱 구분|
|[팬데믹 레거시: 시즌 1 · pandemic-legacy-1](games/pandemic-legacy-1.json)|현재 공개 도시판과 스티커/캐릭터 공개 부분|봉인 패킷·미공개 캠페인 내용 제외, 현재 날짜/단계는 확인 입력|
|[마블 챔피언스 카드게임 · marvel-champions](games/marvel-champions.json)|빌런·계략과 영웅 카드 방향/부착/토큰|체력·위협·진행·사용량과 실물 수 구별; 공개/비공개 손패 분리|
|[반지의 제왕 카드게임 · lotr-lcg](games/lotr-lcg.json)|퀘스트/활성 장소/대기 구역과 개인 교전·부착|카드 소진, 진행/피해/자원, 위협 값을 독립 보존|
|[이클립스: 두 번째 여명 · eclipse-second-dawn](games/eclipse-second-dawn.json)|섹터의 웜홀 변·행성과 청사진 슬롯|60도 방향·연결, 인구/영향력/경제 트랙과 비밀 평판 구분|
|[아크스 · arcs](games/arcs.json)|항성계와 법정/요원·행동 공개 카드|함선 상태·건물/자원/전리품과 현재 트릭/야망을 분리|
|[아나크로니 · anachrony](games/anachrony.json)|타임라인·워프, 공용 행동과 개인 건물 격자|일꾼 종류/상태·엑소슈트·워프 출처/시대 관계 분리|
|[칸반 EV · kanban-ev](games/kanban-ev.json)|부서 행동 위치·조립/시험 경로와 개인 차고|설계도/부품/차량, 교육·회의 표식과 비밀 목표 구분|
|[웜스팬 · wyrmspan](games/wyrmspan.json)|동굴 줄의 카드 전체와 탐험자/길드|발굴/용 배치와 알/자원, 소지 씨앗과 공개 카드 구분|
|[크베들린부르크의 돌팔이 약장수 · quacks](games/quacks.json)|솥의 칩/물방울/쥐꼬리 위치와 책|공급/솥/주머니를 구별, 폭발/마지막 뽑기 이력은 사진에서 확정 금지|
|[아일 오브 캣 · isle-of-cats](games/isle-of-cats.json)|배의 방/칸과 고양이·보물 모양|회전/반사·색가족·바구니/생선, 비밀 레슨과 공개 카드 구분|
|[도미니언 · dominion](games/dominion.json)|왕국 공급별 상단/표식, 플레이·버림|가려진 더미 수/순서 비추론; 손패·사용·버림과 남은 행동/돈/구매 분리|
|[포레스트 셔플 · forest-shuffle](games/forest-shuffle.json)|나무의 네 방향에 끼운 카드와 공터|반쪽 카드 활성 방향/부착 대상과 동굴의 감춘 카드 구분|
|[엘드리치 호러 · eldritch-horror](games/eldritch-horror.json)|세계 지도·조사자/단서/관문과 고대존재·소문|뒤집어야 읽는 카드 면 제외; 소지품/상태/피해와 미공개 덱 분리|
|[킹도미노 · kingdomino](games/kingdomino.json)|두 칸 도미노의 지형/왕관·타일번호와 왕 말|도미노 인스턴스의 두 셀·회전, 선택줄/왕국을 구분|
|[사그라다 · sagrada](games/sagrada.json)|창문 색/눈 제약과 주사위 윗면, 라운드 트랙|실물 개수/주사위 눈/색/칸 위치 구별; 개인 목표는 owner 구획|
|[칼리코 · calico](games/calico.json)|이불 색·무늬와 목표타일, 시장/대기 패치|색 연결과 무늬 연결, 고양이/단추·목표 진행 구분; 손 타일 공개성 미확정|
|[아크로폴리스 · akropolis](games/akropolis.json)|타일 지구/광장 별, 층 높이가 보이는 보조 각도|2D 점유와 높이·아래 가린 타일 분리; 미관측 아래층 비추론|
|[스톤 에이지 · stone-age](games/stone-age.json)|행동칸·일꾼과 개인 마을/도구/음식 트랙|공개 건물/가린 문명 카드, 도구 사용과 선플레이어 표식 구분|
|[코드네임 · codenames](games/codenames.json)|단어 5×5와 공개 덮개만|키 카드/스파이마스터 정보는 공용·owner 일반 촬영 제외; 숨은 단어 분류 비추론|
|[다빈치코드 · davinci-code](games/davinci-code.json)|타인 숫자를 드러내지 않는 개인 줄 외관|공개된 숫자와 본인만 아는 숫자·조커/줄 순서 구분|
|[레지스탕스: 아발론 · avalon](games/avalon.json)|원정 구성·공개 투표·성공/실패 트랙|역할 정체와 제출 카드별 제출자/선악 연결 금지; 무기명 묶음 보존|
|[딕싯 · dixit](games/dixit.json)|번호가 매겨진 공개 그림열과 점수판|제출한 사람/비공개 투표를 그림에서 추정 금지|
|[저스트 원 · just-one](games/just-one.json)|현재 공개된 힌트만|정답·탈락시킨 힌트·아직 비공개 작성은 공개 촬영에서 제외|
|[스카우트 · scout](games/scout.json)|카드 위/아래 숫자가 모두 보이도록 공개 쇼, 본인 손패 별도|손패 순서와 활성 끝 방향을 보존; 숫자로 손패 정렬하지 않기|
|[젝스님트 · six-nimmt](games/six-nimmt.json)|공용 네 줄·카드 숫자/소머리와 공개 선택|줄 순서·이번 공개 카드/아직 손패, 가져온 벌점 묶음 구분|
|[크루: 심해의 모험 · crew-deep-sea](games/crew-deep-sea.json)|트릭 자리와 임무/통신 카드·표식|통신 위치 의미와 과거 힌트/달성 여부 구분; 미공개 손패 유추 금지|
|[하나비 · hanabi](games/hanabi.json)|공용 불꽃/버림·단서/실수 표식만|자기 손패는 본인에게 보여주면 안 됨; 다른 손패도 일반 공용/owner 저장 제외|
|[러브레터 · love-letter](games/love-letter.json)|공개 버림 순서·보호 표식·호감|비공개 손패·제외 카드와 사용 카드/효과 중단 구분|
|[쿠 · coup](games/coup.json)|공개된 영향력과 개인 동전|살아 있는 영향력 정체/블러프 사실은 사진으로 확정 금지|
|[바퀴벌레 포커 · cockroach-poker](games/cockroach-poker.json)|공개 수령 카드의 곤충과 개수|전달 중 뒷면 정체와 발언·누가 보았는지 구분|
|[스컬 · skull](games/skull.json)|플레이어별 뒷면 더미와 공개 성공 면|스택 위아래/공개된 디스크만, 해골 정체·버려진 숨은 디스크 비추론|
|[도블 · dobble](games/dobble.json)|현재 공개 카드의 기호 전체|같은 기호 그림을 동일 실물 카드로 합치지 않기; 먼저 말한 사람은 수동|
|[모노폴리 · monopoly](games/monopoly.json)|이동판·집/호텔, 공개 소유권·저당 면|현금 액면/개수·감옥/현재 이동 처리·미공개 카드 분리|
|[보난자 · bohnanza](games/bohnanza.json)|콩밭 겹침과 거래 대기, 본인 손패 순서|맨 앞 카드/순서·다음 심을 콩·금화 뒷면 묶음 보존|
|[로스트 시티 · lost-cities](games/lost-cities.json)|색별 탐험열과 투자/숫자 카드, 버림 상단|열 순서·투자와 숫자 구별; 본인 손패/가려진 덱은 별도|
|[자이푸르 · jaipur](games/jaipur.json)|상품 시장·낙타 무리와 상품토큰 공급|가진 토큰 뒷면/보너스 숨은값, 상품 손패/낙타를 분리|
|[레이스 포 더 갤럭시 · race-for-the-galaxy](games/race-for-the-galaxy.json)|공개 카드의 원형/마름모·비용/능력 띠|뒤집어 놓은 상품의 카드 정체와 비밀 행동 선택을 추정하지 않기|
|[레스 아르카나 · res-arcana](games/res-arcana.json)|유물·마법사·물품·장소의 방향과 정수 부착|가용 정수/저장 정수·횡회전/사용, 손패·덱을 분리|
|[스타 렐름 · star-realms](games/star-realms.json)|교역열·함선/기지·전초기지 표시|기지 방어력/권위·거래/전투 잔량과 실물 개수 구분|
|[마치코로 · machi-koro](games/machi-koro.json)|시설 색·발동 주사위 눈·랜드마크 면|복제 시설 수와 효과값, 현재 주사위와 처리 여부 구분|
|[킹 오브 도쿄 · king-of-tokyo](games/king-of-tokyo.json)|도쿄 위치·괴수 다이얼·공개 카드·주사위|체력/승점/에너지와 눈·남은 재굴림 이력 분리|
|[스페이스 베이스 · space-base](games/space-base.json)|섹터 번호·위/아래 배치 카드·효과 띠|현재 함선과 배치된 함선 방향·화물/수입/승점 트랙을 분리|
|[타이니 타운 · tiny-towns](games/tiny-towns.json)|마을 셀의 자원/건물과 공용 건물조건|같은 색의 자원/건물 혼동 금지; 비공개 기념물과 현재 선택자 분리|
|[스플렌더 대결 · splendor-duel](games/splendor-duel.json)|공용 보석 격자·카드 비용/왕관·왕실|특권/진주/금·카드 보너스·예약 상태 분리; 기본 스플렌더로 대체 금지|
|[에이피어리 · apiary](games/apiary.json)|개인 벌집의 육각타일·일벌 단계와 동면 구역|일벌 숫자는 말 개수/주사위 눈과 다름; 행동/공급/동면 분리|
|[태피스트리 · tapestry](games/tapestry.json)|지도, 수도 격자의 조각, 수입 매트·기술카드|입체 건물 점유·수도 보너스, 시대 카드·개인 손패 분리|
|[익스페디션 · expeditions](games/expeditions.json)|탐험 타일 경계·미플, 메크판/강화 카드|결합한 카드와 단순 보유 카드·노동자 사용 상태/자원 분리|
|[차터스톤 · charterstone](games/charterstone.json)|현재 마을 스티커·건물과 개인 공개 자산|영구 캠페인 변화와 이번 세션 상태 구분; 봉인/미공개 내용 제외|
|[글룸헤이븐 · gloomhaven](games/gloomhaven.json)|전장 문/육각칸·몬스터 번호와 개인 카드/아이템|2025 2판과 구판 부품/상태 혼합 금지; 버림/소실·지속 효과·시나리오 분리|
|[슬리핑 갓즈 · sleeping-gods](games/sleeping-gods.json)|아틀라스 쪽수·함선 위치·선원/적 격자|적의 피해 칸/연결과 선원 피로/능력 부착, 미공개 이야기 비추론|
|[광기의 저택 2판 · mansions-madness-2](games/mansions-madness-2.json)|공개 방 타일·문/벽과 조사자/몬스터|실물 상태와 필수 외부 앱 시나리오 상태는 별도 보존, 앱 복원 보증 금지|
|[디센트: 어둠의 전설 · descent-legends-dark](games/descent-legends-dark.json)|전장 층·계단과 인물, 카드 면·피로|다층 높이와 2D 위치 구별; 외부 앱의 숨은 상태를 사진에서 재생성 금지|
|[아컴호러 3판 · arkham-horror-3](games/arkham-horror-3.json)|모듈 동네·거리·몬스터와 코덱스/시나리오|파멸/단서/방호와 공포/피해, 비공개 조건 면·신화컵 분리|
|[스타워즈: 아우터 림 · star-wars-outer-rim](games/star-wars-outer-rim.json)|지도 구역·순찰·연락 표식과 함선 슬롯|목표 카드 면·화물/현상수배/승무원 부착, 미공개 접촉 정체 분리|
|[스타워즈: 임페리얼 어썰트 · imperial-assault](games/imperial-assault.json)|칸/문/벽과 인물 번호, 영웅 장비/배치군|제국 비밀 준비는 일반 owner 수집 제외; 캠페인 앱/임무 진행은 외부 참조|
|[반지의 제왕: 가운데땅 여정 · journeys-middle-earth](games/journeys-middle-earth.json)|여정 타일/전투판과 준비 카드·피해|기술 덱 순서/선택·외부 앱 상태 분리; 사진만으로 앱 재개 상태 생성 금지|
|[황혼의 투쟁 · twilight-struggle](games/twilight-struggle.json)|국가 영향력과 DEFCON/군사/우주/승점 트랙|국가별 양측 수량, China카드 면/보유와 헤드라인 비밀 선택 구분|
|[쓰루 디 에이지스 · through-the-ages](games/through-the-ages.json)|문명 카드와 파랑/노랑 토큰·카드열|자원/생산/인구/부패·행동 토큰과 인쇄 레벨 구분; 미래 사건 비추론|
|[도미넌트 스피시즈 · dominant-species](games/dominant-species.json)|지형 육각·접점 원소, 종 말과 행동칸|종 개체수와 우세 원뿔, 접점 영향과 타일 점유 분리|
|[한자 토이토니카 · hansa-teutonica](games/hansa-teutonica.json)|도시 사무소/연결 경로와 개인 능력트랙|큐브/원반·공급/공용 재고·배치 구분; 영문 Bank 상충값을 자동 보정 금지|
|[매드 킹 루드비히의 성 · castles-mad-ludwig](games/castles-mad-ludwig.json)|방 모양/문 연결과 가격별 시장|자유 회전·문 연결/완성 보너스와 단순 가까움 구분; 비밀 목표/돈 별도|
|[이스탄불 · istanbul](games/istanbul.json)|시장 타일 배열·상인/조수 쌓임, 수레 트랙|상인 아래 조수와 놓고 간 조수, 확장/업그레이드·보유 카드 구분|
|[다섯 부족 · five-tribes](games/five-tribes.json)|타일별 부족 색·수량과 낙타/야자/궁전|이동 중 들고 있는 말·입찰/순서와 완료 액션 구분; 돈/비공개 자원 별도|
|[스몰 월드 · small-world](games/small-world.json)|지역 점유와 활동/쇠퇴 종족 면, 시장|종족/능력 짝·방어물·실물 수와 숨은 승점 구분|
|[팔레오 · paleo](games/paleo.json)|그룹별 사람·공개 탐험과 캠프/밤 목표|덱 뒷면이 허용하는 단서와 실제 앞면 정체 분리; 그룹 덱/버림/제거 구별|
|[혁신의 시대 · age-of-innovation](games/age-of-innovation.json)|지형/건물·개인판과 권능 그릇/과학트랙|사용 능력/기술·공급건물과 지도 상태 구분; 테라미스티카 아트로 판정 금지|
|[언더워터 시티즈 · underwater-cities](games/underwater-cities.json)|개인 도시/터널/시설과 행동칸|도시 돔/공생·업그레이드 및 카드 지속/즉시/행동 영역 분리|
|[보이드폴 · voidfall](games/voidfall.json)|시나리오 육각/함대와 가문 다이얼·기술|공간함대/시설·부패/인구/생산과 주기·비밀 계획 분리|
|[세티 · seti](games/seti.json)|회전 태양계 층별 기준점과 탐사선·신호/컴퓨터|각 층 회전과 절대 화면위치 구별, 궤도선/착륙선과 미발견 종 분리|
|[갤럭시 트러커 · galaxy-trucker](games/galaxy-trucker.json)|우주선 셀별 커넥터/방향과 실린 승무원·화물|인접 셀과 실제 커넥터 연결, 제거 부품/배터리·공개 모험 처리 분리|
|[할리갈리 · halligalli](games/halligalli.json)|각 공개 맨 위 카드의 과일 종류/개수|다음 카드/개인 덱과 현재 공개 카드 구분; 누가 먼저 종을 쳤는지 비추론|
|[블로커스 · blokus](games/blokus.json)|공용 격자와 폴리오미노 실루엣·남은 조각|색/회전/반사·실제 점유 셀과 대각 접촉을 보존|
|[에이언즈 엔드 · aeons-end](games/aeons-end.json)|균열 단계·준비 주문, 버림 순서와 공용 적|섞지 않는 개인 덱의 위아래/버림 순서 보존; 숨은 차례/네메시스 덱 비추론|
