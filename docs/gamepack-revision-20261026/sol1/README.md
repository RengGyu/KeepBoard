# Sol1 게임팩 원본 검토 인계

**부분 인계:** 지정된 56개 게임의 현행 source spec·vision profile을 개별로 점검해 [review.json](review.json)에 영역, 구성물, 저장 필드, 공개 범위, 공식 자료 범위와 미확인 사항을 기록했다. 규칙 전체 검증은 56개 모두 미완료다. 부분 근거가 확인된 7개 게임의 14개 원본 파일만 수정했다. 나머지 게임별 공식 규칙 대조와 판본 확인은 Cloud Claude 인계 대상이다. 이전 버전의 저장 팩, 생성된 게임팩, 런타임·제품 코드는 변경하지 않았다. 정확한 수정 전후 해시는 [freeze-manifest.json](freeze-manifest.json)에 있다.

| 게임 | 확인된 관계와 원본 수정 | 근거 범위 |
|---|---|---|
| A Feast for Odin | 비공개 직업 손패와 사용한 공개 직업 분리 | [공식 기본판 규칙](https://www.feuerland-spiele.de/fileadmin/game/Ein_Fest_fuer_Odin/ODIN_EN_rules_2nd_Web.pdf) pp. 3, 20 |
| Concordia | 미사용 성격 카드 손패와 사용 더미 분리; 공개 식별은 맨 위만 | [공식 규칙](https://www.riograndegames.com/wp-content/uploads/2013/10/Concordia_rules_eng_1_1.pdf) p. 1, Game flow / Tribune |
| Dixit | 손패·섞인 비공개 제출·공개 그림판 분리 | [출판사 How to play](https://www.libellud.com/game/dixit/) |
| Grand Austria Hotel | 손님/직원 물리 카드 분리; 미고용 손패/고용 직원 공개판 및 사용 방향 보존 | [공식 영문 규칙](https://www.lookout-spiele.de/wp-content/uploads/GAH_rules_EN_web.pdf) pp. 2, 10–13. 2015 규칙과 지정 소매 판본의 차이는 미확인 |
| Arkham Horror: The Card Game | 공개 플레이 자산 카드 연결, 개인의 공개 버림더미와 비공개 덱 분리 | [현행 코어 규칙](https://images-cdn.fantasyflightgames.com/filer_public/0e/d0/0ed09507-1705-47ed-a630-cd15885cabb0/ahc100_rulebook-web.pdf) Types of Actions > Play 및 [Arkham Grimoire](https://images-cdn.fantasyflightgames.com/filer_public/76/b3/76b332d5-7047-458f-91b6-82c8500cc445/arkham_grimoire.pdf) Discard Piles의 검색 색인 본문; 대용량 PDF 전체는 열지 못함 |
| Pandemic Legacy: Season 1 | 새 팩의 카드 손패와 공개된 캐릭터 카드·기록 분리. 이전 owner 기록은 자동 공개/이동하지 않음 | [공식 제품 구성](https://www.zmangames.com/game/pandemic-legacy-season-1/)의 카드 종류; 캐릭터 앞면의 공개 기록 방식은 제한적 구현 제안이며 캠페인 전체 규칙 확인 아님 |
| Splendor | 중앙 색별 보석·금 공급과 각 플레이어 보유 토큰 분리 | [공식 영문 규칙](https://cdn.svc.asmodee.net/production-asmodeeca/uploads/2022/01/SCSPL01EN_SPLENDOR_RULES_LIGHT.pdf) Setup / Actions / Purchased Cards |

나머지 49개는 기존 게임별 영역·구성물·공개/개인/숨김 분리를 유지했다. [review.json](review.json)은 각 게임의 현행 관계와 공식 자료에서 이어받은 부분 근거, 적용하지 않는 범주, 남은 `gaps`를 따로 보여준다. **구조 검사나 기존 검색 발췌를 전체 공식 규칙 검증으로 간주하지 않았다.** 56개 중 전체 규칙서 검증 완료로 표시한 게임은 0개다. 특히 출처가 제품 소개·검색 색인에 그치는 게임의 세부 카드 효과·턴 예외는 미확인이다. 읽지 않은 판본의 정보나 비공개 카드 내용을 채우지 않았다.

**호환 경계:** 기존 세션의 pinned 팩과 원본 값은 그대로 둔다. 새 영역을 만든 게임은 새 source로 팩을 재생성해야 실제 제품에서 쓰인다. 이전 owner 필드에 혼합 저장된 자료를 공개 영역으로 자동 이행하지 않는다. 특히 Pandemic Legacy와 Arkham LCG는 기존 버전 값의 범위를 사용자가 직접 확인해야 한다. Vision profile의 `runtime_match=false`는 수정된 source가 아직 생성 팩에 반영되지 않았다는 뜻이다.

검사: `node --import tsx tools/game-specs/cli.ts validate docs/research/game-specs-120/games --complete` 종료 0, 120/120 구조 유효, `factualVerification=false`. `python3 docs/gamepack-revision-20261026/sol1/finalize_review.py`로 56/56 고유 ID·영역/필드/구성물·source/profile 참조 오류 0을 확인했다. Profile 읽기 키 중복·누락 검사도 56게임 오류 0. 게임 규칙 정확성, 실제 사진 판독, 생성 팩/런타임 기능 검증을 뜻하지 않는다.
