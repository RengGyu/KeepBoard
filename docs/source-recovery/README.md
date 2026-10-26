# KeepBoard 미확정 근거 복구 조사

조사일: **2026-10-22 KST**. 이번 산출물은 연구 보고와 근거 묶음이다. 원명세·동결 manifest·앱에 적용하지 않았다.

**50항목을 모두 ‘접근 불가’로 취급할 필요가 없다.** 기존 필드와 근거를 먼저 대조하고, 필요한 조항만 공식 자료에서 확인하는 방식이 가장 실용적이다. 대표 **5사례·8항목**을 시험해 **신규 보완 근거 3건 + 기존 보완의 추적 종료 근거 1건**을 확보했다. 다른 **4건은 근거 부족·판본 선택·자료 충돌로 보류**한다. 나머지 42항목은 원인 분류까지만 했으며 공식 규칙을 새로 검증하지 않았다.

- 전체 50항목: [분류표 CSV](classification.csv), [ID·입력 위치·근거·후속 행동 JSON](cases.json)
- 대표 사례 상세: [representative-cases.json](representative-cases.json)
- 원출처·HTTP 결과·판본·페이지·주장별 등급: [evidence.json](evidence.json)
- 입력 불변·ID 대조·파일 해시 검사: [verification.json](verification.json), [입력 해시](input-hashes.json)

## 1. 실제 50항목의 분류

입력은 `game-essentials/manifest.json`의 `result=UNCLEAR` **50개 finding, 42게임**이다. 원 검토의 증거 표시는 **INFERRED 21 / UNCLEAR 16 / SPEC 13**이었다. `SPEC`는 기존 명세를 읽었다는 뜻이며 공식 규칙 검증이 아니다. 85개 전체 finding 중 이미 처리된 23개와 별도 런타임 12개는 이번 50개에 섞지 않았다. [동결 인계](../game-essentials/data-handoff.md), [원 검토 범위](../game-state-review/README.md)

다음 수는 **후속 작업에서 가장 먼저 해결할 원인 하나**로 집계한다. 판본·공개성·추출 문제 같은 보조 원인은 JSON에 중복 표시했다. 대표 사례를 조사하기 **전의 진단 분류**이며, 조사 후 해결 수와 다른 수치다.

| 우선 원인 | 수 | 구체적인 대상·의미 |
|---|---:|---|
| 해당 규칙 조항 미대조 | 22 | 칼리코 손 타일, 콘코르디아 현금 등. 다른 조항/상품을 읽었어도 쟁점 조항은 미검증 |
| 접근·전달 형식 복구 | 8 | Arcs 1, Lost Cities 1, Through the Ages 1, Power Grid 3, War of the Ring 2. JS 안내·잘못된 리디렉션·다운로드 실패가 서로 다름 |
| 판본 식별·동등성 | 5 | Avalon, Castles of Burgundy, Mage Knight, Sagrada의 판본 finding, Ticket to Ride |
| 명세 표현·공개 범위 해석 | 6 | Azul, Brass의 버림, Eclipse, Nemesis, Pandemic, Rummikub의 pool. 기존 장면/수량과 별도 필드 부재를 구분 |
| 사진·제품 지원 경계 | 6 | Descent, Dobble, Galaxy Trucker, Halli Galli, Journeys in Middle-earth, Mansions of Madness. 외부 앱 저장/실시간 순간 복원 |
| 상세 원문 미확보 | 1 | 다빈치 코드: 상품의 이미지·영상 중심 설명. 차단 증거 없음 |
| 공식 자료 내부 충돌 | 1 | Hansa Teutonica Bank 수치 |
| 보완 이력과 추적표 불일치 | 1 | Stone Age 시작 표식 |
| **합계** | **50** | 모든 원 finding과 일대일 대조 |

**과거 HTTP403 기록은 2게임·5항목**(Power Grid 3, War of the Ring 2)에 있다. 이것도 과거 보고된 결과이며 현재 재시험한 403은 아니다. Lost Cities의 실패 코드는 미확인, Arcs는 JS 표현 문제, Through the Ages는 규칙 URL의 상품 페이지 전환이다. Istanbul·Voidfall은 초기 크기 제한 뒤 공식 자료 일부를 열었으므로 계속 접근 불가라고 세지 않았다. Five Tribes의 상품 timeout도 공개성 조항 미대조와 따로 기록했다. [기존 접근 기록](../game-essentials/remaining.md)

원 입력에는 finding별 고유 ID가 없다. 이번에 `game_id:review:원 finding의 1부터 시작하는 순번`을 부여했다. 예를 들어 `dune-imperium-uprising:review:03`, `rummikub:review:03`의 03은 미확정 항목만 다시 센 번호가 아니다. **JSON pointer·원문·원문 SHA256·원래 증거 표시**를 함께 보존해 재현 가능하게 했다.

## 2. 대표 적용 결과

### C01 — Power Grid: 정상 대체 배포는 성공, 현금 조항은 별도 보류

기존 Rio 배포처의 403을 반복하지 않고, [원출판사 2F의 Recharged 상품 페이지](https://2f-spiele.de/2f-spiele/funkenschlag-spielefamilie/funkenschlag-recharged-version/)에 연결된 [독일어 규칙](https://2f-spiele.de/pdf/funkenschlag-recharged-anleitung_de.pdf)을 **HTTP200, 정상 PDF 12쪽**으로 확보했다. 상품의 Recharged 표시와 PDF의 할인 표식·경매 망치·카드 뒷면 체계로 적용 범위를 식별했다. 언어가 다르다는 이유만으로 배제할 필요는 없지만 모든 번역·쇄의 전면 동일성을 주장하지 않는다.

- `review:01`: **p4–5**의 순서 트랙·단계별 진행 방향 확인. 현재 플레이어와 라운드 순서/이미 처리한 플레이어를 구분하는 근거 확보.
- `review:02`: **p3 Setup8–9**의 뒷면 발전소 더미·최초 Step3 카드 위치 확인. 공개 시장과 별도 묶음이 필요하다. 뒷면 무늬로 드러나는 특징과 숨은 앞면 정체도 다르다.
- `review:03`: 현금의 **공개 의무 문구는 이번 검토에서 미확보**. 다운로드 성공으로 승격하지 않는다.

위 두 보완은 저장용 **선택 기록**의 근거다. 더미를 뒤집어 현재 내부 순서를 알아내거나 초기 Step3 위치를 저장된 중간 상태에 다시 적용하는 기능을 뜻하지 않는다. [검수 페이지](previews/power-grid-de-p3.png), [순서 페이지](previews/power-grid-de-p4.png)

### C02 — Ticket to Ride: 공식 구판을 구해도 적용판 선택은 남는다

[공식 상품](https://www.daysofwonder.com/game/ticket-to-ride/)이 [현행 영어 7201N V2](https://cdn.svc.asmodee.net/production-daysofwonder/uploads/2025/07/7201N_TICKET2RIDEV2_RULES_EN_20250425_WEB.pdf)와 [Old Rules ZIP](https://cdn.svc.asmodee.net/production-daysofwonder/uploads/2025/07/old_rules_TTR_USA.zip)을 별도로 배포한다. 모두 HTTP200이었다. ZIP의 최초 실패는 **연구용 로컬 35MB 한도**였고 접근권한 문제가 아니었다. 실제 76.6MB를 확인한 뒤 한 번 정상 다운로드하여 영어 PDF만 추출했다.

| p2에서 직접 대조한 항목 | 공식 Old Rules 영어 | 현행 ©2025 영어 |
|---|---:|---:|
| 목적지 티켓 구성 | 30 | 33 |
| 처음 나눠주는 티켓 | 3 | 4 |
| 처음 최소 보유 | 2 | 2 |

구판은 ZIP 안의 `7201-T2R-Rules-EN-20240423_LOWRES.pdf`, 문서 표시는 ©2004–2024다. **파일명/업로드 경로의 연도와 실제 소장판을 동일시하지 않는다.** [구판 p2](previews/ttr-old-en-p2.png), [현행 p2](previews/ttr-current-p2.png)

`ticket-to-ride:review:01`의 **장수 공개 의무는 여전히 UNCLEAR**다. 두 규칙의 p2–4에서 티켓 정체를 숨기는 것은 확인했지만, 카드 종류별 장수를 반드시 상대에게 알려야 한다는 명문은 확보하지 못했다. 판본을 맞추는 일과 공개 장수 필드를 공식 필수값으로 만드는 일은 별개다. 저장된 중간 손패를 초기 배분 수로 교정해서도 안 된다.

### C03 — Calico: 원문 열람 성공과 정보 공개 판정은 다르다

[AEG 상품의 Rulebook 링크](https://www.alderac.com/calico/)에서 [공식 PDF](https://www.alderac.com/wp-content/uploads/2025/04/Calico_BaseGame_Rulebook_Optimized.pdf)를 **HTTP200, 16쪽**으로 확보했다. 이 파일은 이미지형이라 추출 텍스트가 비어 있었다. p4/5를 직접 읽어 개인 손2장·공개 시장3장을 확인했다. p4 그림에서는 손 타일이 뒷면이다. p16은 ©2020을 표시하므로 URL의2025를 신판으로 부르지 않는다. [p4](previews/calico-rules-p4.png), [p5](previews/calico-rules-p5.png)

`calico:review:01`의 의무 공개/비공개를 명시한 문구는 이 범위에서 확보하지 못했다. 소유자 보관 해석은 **INFERRED**, 현재 owner를 유지하는 것은 **앱 권고**로 구분한다. 공식 도메인 추가 검색으로도 해당 FAQ를 찾지 못했으므로 무기한 재검색하지 않는다. 사용자의 공개 플레이 관행은 세션 설정을 정할 수 있지만 공식 규칙 확정 근거는 아니다.

### C04 — Hansa Teutonica: 실제 인쇄 충돌을 OCR 오류로 처리하면 안 된다

[Pegasus 영어 PDF](https://pegasus.de/en/NetiMedia/download?mediaId=018e5c283e69708e9b50c79cb8a8b317)와 [대응 독일어 PDF](https://pegasus.de/NetiMedia/download?mediaId=018e5c283e68712aad092616e0fe4441)를 HTTP200으로 확보했다. 둘 다14쪽이며 메타데이터 제목은 `HTBB_Rules_[EN/DE]_2te_Auflage_RZ.indd`다.

- `review:01`: 영어 **p3 setup**의 남은 보너스 표식 뒷면 공급을 확인했다. public `bonus.scene`의 설치/보유/사용 표식과 분리하는 좁은 보완 근거가 된다.
- `review:02`: 영어 **p2 인쇄면**은 Bank `3/4/7/C`, 같은 문서 **p3 그림·p4 Income**은 `3/5/7/C`, **독문 p2**도 `3/5/7/C`다. **실제 출처 충돌 VERIFIED**, 영문 p2 오탈자라는 결론은 **INFERRED**다. 명시 정오표는 확보하지 못했다.

[영문 p2](previews/hansa-en-p2.png) · [영문 p3](previews/hansa-en-p3.png) · [영문 p4](previews/hansa-en-p4.png) · [독문 p2](previews/hansa-de-p2.png)

후속 앱에서는 실물에서 확인한 값과 현재 덮인 말을 보존할 수 있다. 이 조사만으로 4를 강제로5로 바꾸거나 저장값을 거절하면 안 된다. **소장 개인판의 은행 트랙·룰북 판권면**, 또는 해당 문서에 대한 공식 정오표가 충돌 종료에 필요한 자료다.

### C05 — Stone Age: 새로 조사하기 전에 이미 보완됐는지 확인한다

`stone-age:review:01`은 필드가 없다고 남아 있지만, 동결 manifest의 `stone-age:1` 변경 이력과 실제 `starting-player` 필드, 기존 공식 scoped 근거가 이미 존재한다. [공식 규칙 PDF](https://www.hans-im-glueck.de/wp-content/uploads/2023/06/stone_age_rules.pdf)도 이번에는 HTTP200으로 확보했고 **p4 시작 표식 전달**을 시각 재확인했다. [p4](previews/stone-age-p4.png)

**추적표 불일치 VERIFIED**다. 새 필드 추가 없이 기존 보완과 finding을 연결하는 종료안을 인계하면 된다. 파일은8쪽이고 메타데이터는2017이므로 `/2023/06/`을 개정판 연도로 승격하지 않는다. 현행/구판 전체 차이나 앱 재열기 동작까지 검증한 것은 아니다.

## 3. 반복 사용할 짧은 복구 절차

1. **현재 필드·변경 이력부터 대조한다.** finding을 한 문장 주장으로 나누고 기존 `scene` 설명·수량·면·공개 범위를 읽는다. Stone Age처럼 이미 보완된 경우 새 수집/새 필드가 필요 없다. Rummikub pool도 이미 장면과 수량 보존이 있어 ‘별도 count 필드 없음’만으로 구성물 누락을 확정하지 않는다.
2. **보유한 공식 자료를 재사용한다.** URL·SHA256·선택 판본·기존 읽은 페이지를 확인한 뒤 쟁점 절만 추가 대조한다. Dune Uprising, Eclipse, Rummikub 등은 로컬 공식 자료가 있고, Concordia 등도 기존 공식 조항 기록이 있다. 다른 조항을 읽었다는 이유로 쟁점까지 VERIFIED로 만들지 않는다.
3. **정상 배포 경로를 찾는다.** 원출판사 상품의 Rulebook/Downloads → 공식 자료실/권한 있는 지역 출판사 순서다. 2F 대체 규칙과 Days of Wonder Old Rules가 실제 유효했다. 검색 결과/팬 문서는 위치를 찾는 단서로만 쓰고 공식 근거로 승격하지 않는다.
4. **접근과 판독을 구분한다.** HTTP·최종URL·형식·해시·페이지 수를 먼저 기록한다. 이미지 PDF는 필요한 면을 렌더해서 읽는다. Calico의 빈 텍스트와 Hansa의 실제 인쇄 충돌은 서로 다른 문제다. 도구 timeout/cache miss/크기 제한을 HTTP403으로 바꾸어 기록하지 않는다.
5. **선택판에 필요한 조항만 연결한다.** 기본 게임/독립 후속작, Original/Big Box/Ultimate/Remastered, 지도·모드·언어·문서코드를 확인한다. 구성/설치/정보 공개 중 실제 쟁점에 영향을 주는 차이만 대조한다. 전체 카드 사전이나 모든 확장 조사로 늘리지 않는다.
6. **주장별로 승격하거나 보류한다.** 공식 원문·맞는 판본·정확한 절·필요한 도형·상충 여부가 충족된 주장만 `VERIFIED_SCOPED`. source opened는 접근 표시일 뿐이다. 미상은 null/unknown으로 남기며 저장 필수 질문을 늘리지 않는다.

실무 기록은 아래 정도면 충분하다.

```text
item_id / 기존 필드 / 검증할 한 주장
선택 게임·판본·언어·모드 / source URL·SHA256
접근 결과(HTTP 또는 미확인) / PDF쪽·인쇄쪽·절
확인 사실 / 해석(INFERRED) / 앱 권고 / 남은 상충
결과: 좁은 보완 인계 | 자료 요청 | 보류
재개 조건: 필요한 정확한 문서·사진·답변
```

## 4. 판본 동등성과 상충 판정

출처의 우선순위는 **적용판을 명시한 공식 정오표/FAQ → 그 판의 공식 규칙·도형 → 공식으로 배포된 대응 번역 → 상품 설명 → 비공식 보조**다. 상품 설명은 구성 존재나 제품 정체를 확인하는 데 유효하지만 손패 공개 규칙까지 대체하지 않는다. 다른 언어 PDF가 더 새 파일이라는 이유만으로 원문을 덮어쓰지 않는다.

판본 대응은 최소한 **게임/제품 정체, 기본·확장 모드, 해당 구성물과 설치, 쟁점 조항**이 맞아야 한다. TTR의30/33티켓처럼 구체적인 차이가 나오면 별도 판본으로 묶는다. Mage Knight Ultimate는 원 기본판 해당 절을 구분할 수 있는지 확인한 뒤 좁은 범위만 쓰고, 확장 부품을 기본 사실에 포함하지 않는다. 선택판이 이미 명확한 게임은 먼저 그 판의 공식 자료를 찾으면 되며, 모든 게임에 사용자 실물 사진이 필수인 것은 아니다.

상충 시에는 **출처별 원 주장과 이미지**를 남기고, OCR/추출 오류 → 같은 문서의 도형/다른 절 → 대응 공식 번역 → 정확한 판에 대한 정오표 순으로 확인한다. 해결되지 않으면 합의 가능한 부분만 분리한다. Hansa의 공급은 보완할 수 있어도 Bank 수치 전체는 강제 확정하지 않는 식이다.

특히 **숨은 내용·장수·뒷면 특징·위치·열람 권리**는 다른 주장이다. 사진에 뒷면 더미가 보이거나 전체 구성 수를 안다는 이유로 남은 정체·현재 순서·상대에게 공개할 의무를 만들어서는 안 된다. “찾아본 범위에서 조항을 못 찾음”도 “그런 규칙은 없음”으로 승격하지 않는다.

## 5. 멈춤 기준과 필요한 사람의 확인

**권장 조사 예산**은 게임별 기존 자료 대조5분, 공식 배포 경로 최대2곳, 필요한 공식 FAQ/정오표 검색1회, 첫 조사15–25분 정도다. 이는 앞으로의 계획 가정이며 이번 실측 시간 통계가 아니다. 충분한 좁은 근거를 얻으면 즉시 인계한다.

- **401/403·인증·지역 제한:** 해당 경로 중단. 계정·프록시·User-Agent 위장·자격증명 대체 금지. 정상적으로 별도 공개한 공식 채널만 검토한다.
- **429:** 같은 실행에서 재요청하지 않는다. 응답의 대기 조건을 기록하고 이후 재개 여부를 별도 판단한다.
- **도구 크기/추출 제한, 로컬 TLS·DNS 실패:** 원 서버의 거부로 분류하지 않는다. 원인이 특정됐을 때만 정상 환경/기본 인증서 검증으로 한 번 재현한다. TLS 검증을 끄지 않는다. 이번 Python 신뢰저장소 오류는 시스템 curl 기본 TLS로 해결했다.
- **선택판 불명·자료 충돌·명문 없음:** 결과와 필요한 자료를 남기고 보류한다. 다른 항목을 진행한다. 미상 상태를 저장할 수 있게 두는 것이 제품 목적과 맞다.

| 필요한 확인 | 최소 자료 | 할 수 있는 판단 / 남는 한계 |
|---|---|---|
| TTR 적용판 | 상자 제품코드·언어, 룰북 표지/판권면, p2 구성·설치 | 확보한 현행/구판 중 대응 선택. 장수 공개 의무는 별도 근거 필요 |
| Hansa Bank 충돌 | 개인판 은행 트랙과 룰북 판권면; 또는 해당판 공식 정오표 | 그 실물 값 보존. 모든 언어판 공통 규칙으로 일반화하지 않음 |
| Calico·Power Grid 현금의 공개 의무 | 해당 판 공식 FAQ/설명서의 명시 문구 | 공식 공개 정책 판정. 테이블 관행만 있으면 세션 설정으로만 기록 |
| 상세 원문을 못 찾은 게임 | 제품 식별면 + 쟁점 절만 보이는 소장 룰북 사진 | 해당 인쇄물의 좁은 사실 확인. 출처 없는 전사본은 확정하지 않음 |
| 외부 앱·실시간 6건 | 별도 제품 기능/지원 범위 결정 | 추가 규칙 수집만으로 앱 세이브나 순간 타이머가 복원되지는 않음 |

이번에는 사용자 자료 요청, 출판사 연락, 로그인·구매를 수행하지 않았다. 사람의 응답이 없으면 판단 불가한 항목은 그대로 보류한다.

## 6. 후속 구현솔 인계 카드

**A. 지금 바로 검토할4건 — 예상40–80분, 데이터 검토 가정**

대상: `power-grid:review:01/02`, `hansa-teutonica:review:01`, `stone-age:review:01`.
`cases.json`의 해당 input pointer와 근거 페이지를 읽고 **변경 후보 diff**를 만든다. Power Grid의 순서/처리 상태·숨은 더미, Hansa의 숨은 표식 공급은 기존 장면과 중복 없이 연결한다. Stone Age는 새 필드 없이 기존 변경과 finding을 연결한다. **수용:** null 저장 허용, 숨은 정체 자동 생성 없음, 기존 필드 삭제 없음, 공식 사실과 앱 보존 권고 구분. **차단:** 선택판·현재 필드가 인계 입력 해시와 달라졌거나 기존 저장을 잃는 구조일 때 해당 항목만 중단. 동결 원본 반영은 후속 권한으로 수행한다.

**B. 공식 자료가 이미 있는9항목부터 — 예상2–3시간, 조사량 가정**

Dune Uprising1, Eclipse1, Concordia1, Istanbul1, Monopoly1, Rummikub2, Voidfall1, Wyrmspan1. 총8게임이다. 기존 공식 파일/링크를 재사용해 각 항목의 `next_action`에 있는 절만 읽는다. **수용:** 각 주장에 페이지·판본·관찰과 공개 의무의 구분. **차단:** 다른 판본만 있거나 관련 문구를 못 찾으면 optional/unknown을 유지하고 종료. 이9건이 지금 공식 검증됐다는 뜻은 아니다.

**C. 사람/새 1차근거가 필요한4건 — 대기 중 반복 조사 없음**

Power Grid 현금, TTR 장수 공개/적용판, Calico 손 공개, Hansa Bank. 위 최소 자료가 도착하면 항목당 약10–30분의 좁은 재대조를 계획한다. 소장판 선택과 공식 규칙 사실을 구분하고, 응답이 없으면 **HOLD** 유지.

**D. 나머지 항목 — 개별 경로로 분리**

새 공식 대조를 하지 않은42건 중6건은 제품 지원 경계,36건은 후속 자료/조항 조사다. B의9건은 그36건의 첫 묶음이다. 접근 복구8건 중 Power Grid3건만 이번에 실제 시험했으므로, Arcs/Lost Cities/Through the Ages/War of the Ring의 현 상태를 재확인했다고 주장하지 않는다. 각 원인은 `classification.csv`에 한 줄 행동으로 남겼다. 별도 대형 규칙 엔진·숨은 상태 필수 입력을 추가하는 과제로 바꾸지 않는다.

## 7. 재현·검증·자료 취급

```bash
python3 docs/source-recovery/verify.py
```

검사는 원 입력127개 파일의 SHA256, 미확정50 ID·원문·순번·원 증거 표시, 분류 합계, 대표사례8항목·출처 참조, 보관 PDF/HTML/검수 PNG의 해시를 확인한다. **규칙 사실성 자체를 자동 검증하는 테스트는 아니다.** 제품 코드는 이번 작업에서 쓰지 않았고 원 입력 불변은 해시로 별도 확인한다. 다른 작업자의 기존/동시 변경 전체를 이 연구의 변경이라고 해석하지 않는다.

`build_cases.py` / `build_evidence.py`는 네트워크 없이 연구 JSON을 재생성한다. `fetch_system.py`는 특정 URL을 단회 정상 GET하고 HTTP/형식/해시 receipt를 남긴다. `fetch_public.py`는 실패한 Python 클라이언트 재현용이며 일반 재다운로드에는 시스템 TLS 경로를 사용한다. `inspect_pdf.swift`는 macOS 내장 PDFKit으로 텍스트·메타데이터·지정 페이지 PNG를 만든다. 패키지를 설치하지 않았다.

```bash
swift -module-cache-path docs/source-recovery/.swift-cache \
  docs/source-recovery/inspect_pdf.swift \
  docs/source-recovery/sources/hansa-en.pdf \
  docs/source-recovery/previews/hansa-en 2 3 4
```

`sources/`의 PDF는 공개 공식 배포본7개, HTML1개다. TTR 다국어 ZIP은 필요한 영어 PDF 추출 후 로컬 원 ZIP을 제거했고 URL·원 ZIP 해시·멤버 목록·추출 파일 해시를 남겼다. 다운로드/열람 날짜는 receipt에 있으며 PDF 생성일과 구분한다. 저작권은 출판사에 있다. 이 폴더를 공개 재배포하거나 아트/학습 허락을 받았다고 표시하지 않는다.
