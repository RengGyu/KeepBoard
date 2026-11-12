# 독립 검토 근거

검토일 2026-11-12. 범위는 현재 추정 복원판3종과 지정된 effort6회다. 이전 연구 결론을 승계하지 않고 현재 소스·원사진·저장 응답·캡처를 읽었다. 제품 실행, provider 호출, 테스트/빌드, 기존 파일 변경은 하지 않았다. JSON 비교·합산·SHA 대조만 수행했다. **VERIFIED**는 직접 확인, **REPORTED**는 기존 실행 기록, **INFERRED**는 해석, **UNCLEAR**는 미확인이다.

## 1. 입력과 구현 동일성

- [현재 작업 기준](../../../PROJECT_CONTEXT.md), [이번 계약](../contract.md), [Sol1 인계](../sol1/README.md), [Sol2 인계](../sol2/README.md)를 읽었다.
- [source-check.json](../supervisor/source-check.json)의17파일 SHA를 현재 바이트와 대조: 불일치0. 이17개에는 estimator/metrics/override/genericRecord, UI/face helper/CSS 및 관련 검사 파일이 포함된다. 전체 코드의 무변경 인증은 아니다.
- 핵심 SHA: `shared/estimatedBoardStructure.ts` = `91048e1c82f2703313b39a037055cca7ddf31cb30346a42d4b0af31ec8aefb6f`; `src/EstimatedBoardView.tsx` = `f6be2b2c57263e22946bd61c2379018a233b97f3efbd67ebd281ab657f347a04`.
- 실제 실행 `plan.json` 바이트 SHA = `a95cddd23aae8a1b5a174b1a070e3ff68aec0fe4d417ee0209bb2d7754b12b0e`, [verification.json](../supervisor/verification.json)과 일치. private 실행 위치는 [task.md](task.md)에 지정된 경로를 사용했다. 원문·사진을 새 보고서로 복제하지 않았다.
- 실제6개 `*.body.json`의 SHA는 각 plan unit과 일치한다. body 안 이미지 바이트를 해시하여 원사진·input SHA와 일치함을 확인했다. 게임별3 body에서 `reasoning.effort`를 비교 대상에서 제외하면 deep-equal이다. 원사진 SHA: Sagrada `94368d0c2f995914b9e857ceafa04afbfaff112c2b309ee082a4d2d4ac7a4feb`; Lost Cities `d6abc06aca6feda5f747803aca9df403e93fddf8acd807c8b5e654afb11c78cc`.

## 2. 구조·값·저장 책임

| 직접 읽은 지점 | 확인 내용 |
|---|---|
| [estimatedBoardStructure.ts](../../../shared/estimatedBoardStructure.ts):31–46 | 현재 물체 ID를 대상으로 원사진/owner/epoch/정의별 분리. 수동 override 우선, 기존 manual/board/group 위치 유지. 도출 결과만 반환 |
| 같은 파일:49–76 | LC는 판 bbox의 가로/세로 축과 중심으로 양쪽·색줄 구분. 7W는 가까운 wonder anchor·색별 묶음. Sagrada는 기존 칸 유지, 트랙/카드/토큰 추정. 창문 dice를 새 격자로 만드는 계산은 없음 |
| [drawingProjection.ts](../../../shared/drawingProjection.ts):48–81 | receipt/transform/source로 사진 좌표를 확인하며, 유효한 수동/정식 보드 위치를 사진 위치보다 우선 |
| [estimatedBoardMetrics.ts](../../../shared/estimatedBoardMetrics.ts):4–11 | 분모는 현재 출력된 고유 물체·요청 적용 속성. nonnull이면 읽힘으로 집계. 참조 실물 전체, 값 정답, 물리 단일성 인증이 아님. 오독은 null 유지 |
| [GameBoardRecord.tsx](../../../src/GameBoardRecord.tsx):170–197,255,287 | 기존 GenericPieceArt·사진 위치 참고·정식 board·선택 editor 연결. 추정 물체의 중복 사진 배열을 제외 |
| [EstimatedBoardView.tsx](../../../src/EstimatedBoardView.tsx):42–51 | 원 piece ID에 `structureOverride`만 덧붙이고 기존 onChange 사용. 줄/순서/상대 자리/부착 정정 및 해제 가능 |
| [estimatedStructureOverride.ts](../../../shared/estimatedStructureOverride.ts):8–10 | 이 필드는 AI 입력으로 거절되고 수동 구조만 저장. 원래 readout/geometry/owner와 별개 |

**저장 근거:** 실제6건의 `*.reopened.json`과 `*.resumed.json`에서 assertion ID/value/observationReceipts를 직접 비교해 모두 동일함을 확인했다. 각 완료 snapshot도1개였다. 추정 구조의 수동 수정은 [replay.mts](../sol2/replay.mts):23–31에서 게임별1개를 합성 정정한 뒤 HTTP PATCH/commit/reopen/resume 및 원값/receipt 보존을 검사한다. [replay-result.json](../sol2/replay-result.json)은3건 보존을 보고하며, 연결된 private `*-replay.json`의 before/after 구조와 원 입력 SHA를 직접 확인했다. 이번 검토에서는 HTTP를 재실행하지 않았다. 이것은 합성 정정의 저장 연결 근거이지 사람이 사진을 정확히 고친 근거가 아니다.

## 3. 직접 본 사진과 화면

원사진 [Sagrada](../../real-photo-review-20261110/photos/final-pool-02.jpg), [Lost Cities](../../real-photo-review-20261110/photos/final-pool-10.jpg), [Seven Wonders](../../real-photo-review-20261110/photos/final-pool-08.jpg)를 열었다. [screenshots](../supervisor/screenshots)의 게임별 desktop/mobile6장도 모두 열었다.

- **VERIFIED:** Sagrada의 기존18칸은 큰 색/눈 그림으로 나타나고 미식별 눈은 `?`, 패턴 바탕은 중립색이다. LC/7W는 고정 크기 카드에 읽힌 속성·요청된 미상을 직접 표시한다. 기존 SVG/정정 모듈을 재사용한 구현은 확인된다.
- **VERIFIED:** `EstimatedBoardView`는 그룹마다 세로 section을 만들고 내부 카드 줄만 가로 스크롤한다(25–39행). [estimated-board.css](../../../src/estimated-board.css):1은 카드120×180px. 844×390 캡처에서 LC/7W는 판 제목·판 표기만 먼저 보이고 카드 값은 아래에 있다. 따라서 현재 캡처만으로 ‘한눈에 판 전체를 파악하기 쉽다’고 판정할 수 없다.
- **구분:** 캡처는 [boards-source/entry.tsx](../sol1/boards-source/entry.tsx):25–33의 원사진 비교·읽기 전용 공유 wrapper다. 그 헤더/사진 여백을 제품 전체 화면의 결함으로 단정하지 않는다. 다만 실제 `GameBoardRecord`/`EstimatedBoardView`를 사용하므로 세로 그룹 방식은 제품 코드에도 있다. [chrome-selection.txt](../supervisor/chrome-selection.txt)는 같은 piece ID 선택과 값 노출 근거이며, 공유 페이지의 정정 시험은 서버 저장을 하지 않는다.

### 3.1 확인된 LC 관계 오류 — 연결42/42와 양립

근거는 [Sol2 재생 locator](../sol2/replay-result.json)의 LC 원 저장 응답과 `lost-cities-replay.json.before`이다. 원사진에서도 판이 대각선으로 놓이고 사진 오른쪽 아래의 파랑/흰색/초록 원정이 같은 긴 변 쪽에 있음을 확인했다. 이는 사람 소유자 추정이 아니다.

판 bbox는 `{x:0,y:0.247,width:0.699,height:0.606}`. `axis()`는 width×사진종횡비와 height만 비교해 `{x:1,y:0}`을 선택한다(17행). LC 분류는 이 축의 법선으로 중심 `y=0.55`를 기준 삼는다(52행). 대각선 판의 실제 양쪽 경계를 추정하는 계산이 아니다.

| 실제 저장 물체 ID | 현재 읽힌 값(정답 재인증 아님) | bbox 중심 y | 도출 결과 |
|---|---|---:|---|
| `scan-5cd9b9fa0166c45ce8b24b999657` | blue, number2 | 0.4515 | expeditions / near |
| `scan-83a5f50fe0572afe970b80bf84a3` | white, number2 | 0.5655 | expeditions / far |
| `scan-5d832c89b02511b586a0b3d7a2ce` | green, number6 | 0.6520 | expeditions / far |

**VERIFIED:** 동일 물리 편에 있는 색줄이 서로 다른 추정 편으로 갈린다. near/far 이름을 전부 뒤집어도 해결되지 않는 분할 오류다. 해당 사진의 파랑 원정과 반대편 파랑 원정도 같은 near 그룹에 들어간다. 숫자 정렬로 바꾸는 해법은 이 오류를 고치지 못한다.

또한 저장 필드 `discard.scene`의5개 전부가 추정 영역 `expeditions`에 들어갔다. 대표 `scan-515bb9c50df8cfe6425265aecd88`(빨강 더미), `scan-2c1a0e05db0721c923f049ecbc54`(중앙 카드). 52행은 board가 아닌 모든 `cards`에 같은 분류를 적용하고 기존 field/sourceAreaId의 버림 역할을 사용하지 않는다. **원 저장 필드·값이 실제로 바뀐 것은 아니다.** 각 필드의 상위 제목과 별개로 도출된 영역/줄 의미가 충돌한다. 따라서 총 연결42를 관계 정답42라고 사용할 수 없다.

### 3.2 Sagrada의 두 입력 경로

- 옛 저장 응답: window19개 중 windows1 + 기존 정식 dice18. 이18개의 공간 정보는 보존한다. 전체38/42 연결에서 미해결은 카드1·토큰3.
- 새 boxes6회 중 Sagrada3회: 요청 `spatial=false`, 칸 ID를 묻지 않는다. high/medium은 windows1·window dice18을 반환하지만 estimator는 windows만 window 그룹에 넣고 dice18을 `window-cell-or-component-area-not-established`로 남긴다. low는 windows 자체가 없고 해당 dice의 `sourceAreaId`도 draft로 나온다.
- **VERIFIED:** 기존18칸을 보여 주는 공유 캡처와 새 판독의 연결20/42·20/42·19/41은 다른 결과다. 정식 frame을 더 요구해야만 한다는 결론도 아니다. 사용자가 승인한 코드 추정 격자가 아직 구현돼 있지 않은 경계다. 모든 bbox를 강제로20칸에 끼워 맞추는 해결은 근거가 없다.
- 트랙의1..10은 관측 extent 또는 겹침 band 순서에서 만든 **상대 자리**(63–69행)다. 인쇄 라운드 번호의 정답이나 빈 라운드 확정이 아니다.

### 3.3 Seven Wonders의 구조와 내용

원 저장 응답에 wonder4, age-cards86, coins17, military10이 있다. 총117 중101 연결·16 미연결은 재생 파일과 일치했다. age-cards의 구조화 값은 `face`86, `cardColor`68, `printedName`3, `ageLabel`0 nonnull이다. **색별 목록은 제공하지만, 그 목록만으로86장 정체/시대까지 읽은 것은 아니다.** 미연결16을 전부 검출 누락으로 세지 않으며 nearest-anchor101개도 실제 정답 여부를 전수 확인하지 않았다. 판 주변 추정은 유용한 중간 결과다.

## 4. 강도 실험 — 직접 확인한 조건과 수치

실제 model은 모두 `gpt-6.1-terra`, 요청/반환 effort high·medium·low 일치, image detail high, output cap32768, service tier default, status completed다. 2사진×3강도, provider6, retry0, peak1, 미발행0. 게임별 고정 high→medium→low 순서다. 새 독립 사진·반복·순서 교차 시험은 아니다.

| 게임/강도 | 업로드 시작→첫 preview 수신 | 전체 runner 시간 | 출력 토큰(그중 추론) | 도출 연결 | 읽힌/적용 속성 | 사용량 환산 USD |
|---|---:|---:|---:|---:|---:|---:|
| Sagrada high |59.530초|79.533초|5352 (3106)|20/42|72/92|0.0343805|
| Sagrada medium |21.120초|39.826초|3340 (1001)|20/42|71/92|0.0243205|
| Sagrada low |5.630초|28.912초|2254 (63)|19/41|72/87|0.0188905|
| LC high |58.497초|75.431초|6069 (3571)|42/43|117/210|0.0365355|
| LC medium |23.654초|44.136초|3788 (1303)|43/43|116/210|0.0251305|
| LC low |3.329초|30.698초|2596 (43)|46/46|105/225|0.0191705|

입력 토큰은 Sagrada3050, LC2478로 각 게임 내 동일했다. 합계 환산비용$0.158428은 원 usage 연결 기록을 재합산한 값이며 실청구는 null이다. 전체 시간은 [analyze.py](../supervisor/analyze.py):37–48의 `elapsedMs`로, session 생성부터 저장/재개 확인까지 포함한다. 이를 순수 모델 생성 시간이나 실제 폰 종단으로 부르지 않는다.

**첫 값의 정확한 의미:** [run.mts](../supervisor/run.mts):157–178은 loopback 업로드 뒤250ms 간격으로 thin progress를 조회하고 preview에 관측이 처음 있으면 시각을 기록한다. [terraGameReader.ts](../../../server/ai/terraGameReader.ts):157–171은 정상 decode 후 속성 하나라도 observed인 행을 preview로 낸다. LC의 첫 자격 행 `item-2`는 세 강도 모두 `face=back`뿐이다. 첫 poll이 정확히 어떤 행까지 받았는지는 별도 첫 payload로 동결돼 있지 않으므로, 그 시각에 유용한 숫자까지 도착했다고 확정할 수 없다.

[EarlyScanValues.tsx](../../../src/EarlyScanValues.tsx):6–24는 읽기 전용 값 목록이고 최종 그림/저장 결과가 아니다. 제품은 [SessionWorkspace.tsx](../../../src/SessionWorkspace.tsx):117–137 및 [jobStatusPolling.ts](../../../src/jobStatusPolling.ts):31의1→2→5초 폴링을 사용한다. 실험250ms/loopback과 다르며 upload18–23ms도 모바일 전송 측정이 아니다. **medium/low의 수치는 대기 개선의 유망 근거이지 실제 첫 유효값30초 달성 인증이 아니다.**

## 5. 오독·모름 해석

- **VERIFIED, 제한된 시각 대조:** 원사진의 윗줄 첫 보라6과 겹치는 Sagrada high `item-2`는 yellow4다. 한 물체의2속성 오류다. low `item-4`는 초록 윗면1을2로 기록했다. 현재 UI가 그 값을 충실히 표시한다고 오독이 없어지는 것은 아니다.
- **REPORTED / 미확정 유지:** [supervisor-review.json](../supervisor/supervisor-review.json)의 LC high9→6은 별도 부분 오독 보고다. medium의4개·low의1개 불일치 후보는 넓은/인접 bbox 대응부터 불확실하여 이 검토에서 추가 확정 오독으로 세지 않았다. 노랑 주사위의 반사/옆면 후보도 그대로 미확정이다.
- Sagrada low의 읽힘72/87은 high72/92보다 비율이 높지만, windows1개와 그 요청5속성이 빠져 분모가 줄었다. 정확도 개선 근거가 아니다. LC low는 관측43→46인데 읽힌 속성117→105, 모름93→120이다. 더 많은 연결이 더 정확한 상태를 뜻하지 않는다.
- LC medium 부분 대조80속성 중70은 unmatched-or-ambiguous다. 불일치 후보가 적다거나 확정 오독0이라고 정확도를 인정할 수 없다. 7W는 이번 강도 실험 대상도 아니다.
- 자료의 참조는 부분 AI 초안이며, 전체 물체 누락·중복·위치 정답/오답·사람 수정 부담의 독립 분모는 없다. **5~10% 달성/미달 비율을 새로 계산하지 않는다.**

## 6. 검증 수준과 후속 범위

[tests.log](../supervisor/tests.log)에서1374/1374, [build.log](../supervisor/build.log)에서 빌드 완료 기록을 확인했다. 이는 기존 실행 기록이며 이번 재실행이 아니다. 마지막 UI 보완 전 전체 검사와 이후 집중 검사를 합쳐 하나의 최신 전수 검사로 부르지 않는다. 이 검사는 저장/표시 계약 근거이지 사진 정확도 검사도 아니다.

권고는 [README의 세 작업](README.md#다음-작업--최대-세-가지)로 한정한다. 우선 기존 역할을 보존하는 관계 추정과 현재 저장 답에서 드러난 가독성/배치 경계를 고친 뒤, 이미 확보한6응답으로 강도별 오류·모름·누락을 구분할 수 있다. 모델 교체·자동 추가 판독·120종 확대·새 플랫폼은 이번 근거로 요구하지 않는다. 실제 iPhone Safari 종단과 새 사진 일반화는 **UNCLEAR**로 남긴다.
