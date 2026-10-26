# 기존 상세 카탄 명세·AI·현행 화면 점검

> **후속 수정 완료(2026-10-21):** 아래는 수정 전 독립 검토 기록이다. 현재 해결 내용·남겨 둔 불확실성·검증은 [catan-detailed-pack-fixes.md](catan-detailed-pack-fixes.md)를 따른다. 기존 `catan-detailed-pack-probe.mts/json`은 당시 결함을 재현한 동결 자료로 유지하며, 현재 코드의 통과 검사로 재실행하지 않는다. 해당 경계는 `tests/catan-review-fixes.test.ts`의 지속 회귀로 옮겼다.

2026-10-21. **기존 상세 방식도 완성본이라고 보기 어렵다.** 자리/항구/소유/원본/개인 상태를 보존하는 핵심 계약은 있으나, 현재 단순화된 화면과 상세 엔진 사이에 연결 공백이 있다. 특히 수동 그림의 기준판 반영, 자원 수 충돌 표시, 구매 카드 제한의 회기 만료를 먼저 고쳐야 한다. 57필드를 더 늘리는 것으로 해결되지 않는다.

범위: 현재 제품 소스 읽기와 합성 probe. 제품 수정·실제 API·개인 자료·배포는 **없음**. 기존 129개/파서 포함 138개 회귀 통과와 이번 독립 검토를 구분한다. 회귀 통과가 실제 사진 인식/현재 UI의 모든 입력 경로 완성을 보장하지 않는다.

## 직접 확인한 문제와 우선순위

### P1 · 신규 수동 그림/부분 정정이 자산 계산의 기준판으로 이어지지 않는다

**VERIFIED — 코드 경로 + 합성 재현.** `gamepacks/catan.ts:60`의 공용 첫 장면 필드는 `components.observed`다. `src/SceneWorkspace.tsx:19`는 새 세션에 기존 assertion이 없으면 첫 필드를 고르고, `:26`의 선택 목록도 현재 필드/이미 기록이 있는 필드만 노출한다. `:29`는 고른 필드에 그대로 저장한다. 따라서 새 수동 그림은 `components.observed`에 들어간다.

`shared/catanSummary.ts:28`의 `canonicalBoard`는 **accepted board.layout만** 읽는다. probe에서 19칸+마을1개, full/건물 complete를 모두 갖춘 동일 장면을 `components.observed`로 저장하면 기준판은 0개·마을 확인수 0, `board.layout`으로 저장하면 마을 확정 1이었다. 부분 관측을 자동으로 기준판에 합산하지 않는 것은 올바른 계약이지만 **사용자가 확인한 그림을 기준판으로 반영할 경로가 현재 UI에 없다.**

기존 full 기준판 A와 새 부분 정정 B가 함께 있으면, B를 저장해도 A가 자산/항구 계산 기준으로 남는다. 새로 열 때 `SceneWorkspace:19`는 accepted board.layout을 우선한다. B 데이터가 삭제된 것은 아니지만 “고쳐 저장한 그림”과 계산/첫 표시가 달라질 수 있다.

**최소 수정안:** 명시적으로 확인한 장면/앵커별 정정을 공용 기준판에 반영하는 한 transaction을 연결한다. 새 수동판은 공용 기준판 생성으로 이어져야 한다. 부분 관측을 통째로 full로 바꾸거나 기존 판을 조용히 덮지 않는다. 원본·후보·기존 저장본을 남기며 동일 물체를 두 필드에서 합산하지 않는다.

### P1 · 자원 총수와 종류별 수가 충돌해도 옛 총수가 확정 숫자처럼 표시된다

**VERIFIED.** `shared/catanSummary.ts:59`는 별도 총수와 종류 합계가 다르면 conflict를 반환한다. 그러나 `src/CatanOverview.tsx:10`의 `showNumber`는 status를 보지 않고 value만 출력하며 `:28`, `:35`가 이를 사용한다.

재현: 별도 공개 총수7 → 종류별 `{lumber:2, brick:0, wool:0, grain:0, ore:0}`로 수정. helper 결과는 `resources.value=2`, `resourceTotal.value=7/status=conflict`다. 화면 코드는 **자원 7장**만 표시하고 충돌을 알리지 않는다. 별도 총수의 사진 후보/기존 확정값을 바로 수정할 공용 일반 필드 UI도 현재 연결되지 않았다.

**최소 수정안:** 두 값을 자동으로 하나 지우지 말고 “합계2 / 별도기록7 · 확인 필요”를 보여주고 선택한 근거를 한 번 정정하게 한다. 완전한 종류 합계를 새로 입력했을 때 옛 독립 총수를 어떻게 처리할지 명시한다. 공개 총수와 비공개 종류별 내용의 표시 범위는 유지한다.

### P1 · 과거 구매 카드에서 ‘이번 턴 사용 불가’가 새 턴에도 다시 도출된다

**VERIFIED — 실제 helper 실행.** `gamepacks/catanProfile.ts:15`는 구매 종류/이름을 session 수명으로 남긴다. 보유 사실 보존은 올바르다. 그러나 `gamepacks/catan.ts:981`의 `newly-bought-action-card-cannot-be-played` 조건은 종류가 knight/progress/mixed인지뿐이며 구매 턴 조건이 없다. `server/engine.ts:188`의 nextTurn 후 recompute가 이 보존 값을 다시 읽는다.

재현: t1에서 r이 knight 구매 종류 기록 → nextTurn(b) → recompute → nextTurn(r) → recompute. **다음 자기 턴에도 r의 newActionCardUnavailableThisTurn=true**가 생성됐다. 같은 구조의 새 승점 카드 예외 파생도 구매 턴 의미가 흐려진다. 이는 현재 UI의 카드 사용을 강제 차단하는 턴엔진 오류가 아니라 **잘못 남는 제한 안내/파생 상태**다.

**최소 수정안:** 보유/정체와 턴 한정을 분리한다. 기존 assertion의 구매 turnInstanceId 또는 purchaseBatches.purchasedTurnId와 현재 턴을 비교해 제한만 만료시킨다. 카드 종류/수량 자체를 nextTurn에서 삭제하지 않는다. 과거 자료에 구매 턴이 없으면 미상으로 남긴다.

### P2 · 교역 검사는 계산하지만 화면에서는 그 결과를 숨긴다

**VERIFIED.** `shared/catanSummary.ts:101`의 inspectTrade는 `validRatio/messages`를 반환한다. probe의 목재3→광석1은 false이며 차례·판본·효과·은행·해안 미확인 등 안내를 반환했다. `src/CatanOverview.tsx:60`은 helper를 호출하지만 `:69`는 ratio와 항구 강조만 렌더하고 **validRatio/messages를 렌더하지 않는다.**

현재 UI에서는 공용 플레이어 행에서만 교역 창을 열기 때문에 viewerOwner는 미지정이다. 소유자 화면의 종류별 손패로 검사하는 분기는 이 진입에서 사용되지 않는다. `:73`은 기록 저장을 허용한다. 실제로 있었던 비율 위반 상태까지 기록해야 하므로 저장 허용 자체를 결함으로 보지는 않는다.

**최소 수정안:** 계산값/실행 조건/미확인 경고를 구분해 짧게 표시한다. 비율이 틀리거나 관측이 부족하다고 원본 거래 기록 저장을 막지는 않는다. 손패 자동 차감/자동 실행은 추가하지 않는다.

### P2 · 레이어 확인·판본·효과·타이틀 등의 입력 경로가 현재 화면에서 빠졌다

**VERIFIED — 화면 소스 연결 점검.** `src/SessionWorkspace.tsx:141` 이후는 SceneWorkspace, CatanOverview, QuickContext, 저장 버튼이다. `RecordedFields`, 일반 CandidateRow, 질문/보존 컴포넌트는 파일에 남지만 현재 workspace에 mount되지 않는다. 이것은 사용자 요청에 따른 단순화 결과이며, 옛 큰 폼을 전부 복원해야 한다는 뜻은 아니다.

다만 현재 남아 있는 기능이 필요로 하는 다음 입력도 직접 해결할 수 없다.

- `coverageByLayer.buildings/roads/harbors` 확인: `SceneEditor`에는 global/레이어 coverage를 고치는 control이 없다. full 19칸이어도 layer 미기록이면 설치물 확정수는 null이었다. partial 표시의 19칸은 엔진에서 board.layout 요구가 계속 남았다. 불확실하게 두는 것은 옳지만 사용자가 다 확인했을 때 해결할 수 없다.
- 실제 타이틀 보유자/없음: 둘 중 하나라도 미기록이면 공개 점수가 모름이다. probe는 마을1+완전 건물층에도 점수 null, 두 타이틀 none을 직접 API helper에 넣은 뒤 1점이었다. AI 후보가 생겨도 일반 scalar 후보를 확인/정정하는 화면은 현재 없다.
- rulesProfile/tradeBuildMode, pendingEffect, 도둑 원인/처리/버리기 잔여량, 구매 묶음, 종료/승자 등: 팩/엔진에는 있지만 QuickContext는 현재 사람·phase·자유 메모만 입력한다. 메모는 이 필드로 자동 변환되지 않는다.

**최소 수정안:** 현재 요약에 필요한 레이어 확인/타이틀/충돌/미완료 효과만 작은 맥락 입력으로 남긴다. 제공하지 않을 고급 상태는 질문/ready 판정/확정 안내에서 제외한다. 현재 `saveBoard`는 allowIncomplete=true로 저장하므로 이 질문들을 해결하지 않아도 사진/기록은 저장된다. 이를 “상세 명세가 모두 충족됐다”는 뜻으로 해석하면 안 된다.

### P2 · 비공개 승점이 중복 필드에서 서로 다르게 남을 수 있다

**VERIFIED.** `shared/catanSummary.ts:83`은 별도 `player.score.hiddenVictoryPoints`를 개발 카드 handCounts['victory-point']보다 우선한다. 별도2를 기록한 후 개발 카드 승점을0으로 고쳐도 합계의 숨은 확인분은2로 남았다. 현재 해당 별도 입력은 `CatanOverview:33`에서 이미 값이 있을 때만 보인다. 충돌 상태는 만들어지지 않는다.

**최소 수정안:** 새 입력의 숨은 승점은 개발 카드 수량 한 출처로 관리하고, 구판/별도 override는 보존하되 불일치가 있으면 확인시킨다. 과거 저장값을 조용히 재해석하거나 삭제하지 않는다.

### P2 · AI 허용 필드에 사진으로 읽을 수 없는 파생 상태가 들어간다

**VERIFIED.** `server/ai/prompt.ts:6`은 acquisition=observe를 그대로 전달한다. 공용 허용값에는 `turn.actionDevelopmentCardLimitReached`, 개인에는 신규 카드 제한/승점 예외/기사단 기준/최장도로 기준 같은 파생 대상 4개가 포함된다. 합성 `turn.actionDevelopmentCardLimitReached=true` 사진 응답은 normalizeObservations에서 후보1개로 받아들여졌다.

프롬프트 끝에서는 과거 행동/구매 시점/현재 턴 이력을 추정하지 말라고 지시하므로 **허용 필드와 관측 지침이 충돌**한다. 실제 모델이 이번 사진에서 잘못 출력했다는 증거는 없다. 후보 수락도 별도이므로 자동 확정된다고 말하지 않는다.

**최소 수정안:** 스캔 출력에서 파생 전용 필드를 제외하고 확인된 입력으로 로컬 계산한다. 주사위 합도 “이번 굴림”이라는 시간 맥락이 확인된 경우에만 현재값으로 읽는다. 기사 수/물리 타이틀처럼 실제 보이는 입력과 과거 행동의 제한을 구분한다.

### P2 · ‘현재 사람 정정’과 ‘다음 턴 시작’의 UI 계약이 분리되어 있지 않다

**VERIFIED.** QuickContext(`SessionWorkspace:177`)는 currentPlayer만 PATCH하며 nextTurn을 부르지 않는다. 현재 src에서 nextTurn 호출은 api helper 정의뿐이다. 현재 사람 r→b로 바꿔도 턴ID와 기존 “행동 개발 카드 사용함” 제한이 남는 것을 재현했다.

사람을 잘못 골라 고치는 경우에는 턴을 새로 만들면 안 되므로 이 PATCH 자체가 틀린 것은 아니다. 다만 실제 다음 턴으로 넘어갈 명시 진입이 없어 세부 턴 수명 기능을 현재 UI에서 관리할 수 없다.

**최소 수정안:** 턴별 제한을 제품에 계속 제공할 때만 간단한 명시 다음 턴 동작을 남긴다. 저장·열기·사람 이름/색 정정만으로 epoch/turn을 바꾸지 않는다. 턴엔진을 제공하지 않을 선택이면 상세 턴 제한을 현재 기능처럼 주장하지 않는다.

## 53KB는 실제로 어디에 전송되는가

**VERIFIED — 합성 동일 코드 측정, 실제 AI 추가 호출 없음.** 팩은 compact JSON 52,828B/57필드/25요구/17도출/8보존이다. 하지만 일반 스캔의 observationPrompt에는 **전체 팩 JSON을 넣지 않는다.**

| 값 | 측정 |
|---|---:|
| 새 합성 공용 prompt | 16,802B |
| 새 합성 개인 prompt | 16,015B |
| 공통 Catan scene instructions | 9,121B (그 안의 scene schema 4,112B 포함) |
| 공용 관측 field 정의10개 | 4,780B |
| 동일 field의 UI/규칙 메타데이터 등을 덜어낸 표현 | 2,663B |
| 합성 accepted board가 추가된 공용 prompt | 19,954B |

실제 trial의 공용 prompt는 17,090B였고 플레이어/사진 metadata/지시가 달라 위 합성 값과 차이가 있다. **요구사항25개·derivedRules17개·preservationTemplates8개가 스캔 때 전부 전송되는 것은 아니다.** 다만 관측 field 객체의 ui.showWhen/group/source 등 카메라 판독에 불필요한 메타데이터가 일부 따라가며, 기존 accepted 장면 전체가 context에 다시 들어가 길이가 증가한다. 공개 context에서 개인 손패가 빠지는 것은 별도 probe로 확인했다.

예외: 선택적 `gamePackPrompt`는 새 팩 생성 시 전체 Catan template를 예시로 넣는다(`server/ai/prompt.ts:24`). 일반 사진 판독과 다른 경로이고 현재 일반 사용자 설정 UI에도 노출되어 있지 않다.

또한 sceneJSONSchema는 **프롬프트 문자열 안의 지침**이다. `server/ai/index.ts:70`은 Gemini responseMimeType만, `:74`는 OpenAI json_object만 보낸다. provider에 formal responseSchema/strict JSON schema를 전달하지 않는다. 따라서 “EXACT schema” 문구가 형태를 강제로 보장하지 않으며 파싱 후 로컬 정규화/검증이 필요하다. 이것만으로 실제 실패 원인을 단정하지 않는다. 기존 arm의 200 이후 파싱 실패는 원문/finishReason이 없어 여전히 미확정이다.

2,117B의 field 메타데이터 축소는 원본 값 차이 측정이지 모델 속도/정확도 향상의 실측이 아니다. 필수 구조를 빼면서까지 짧게 만들 근거도 이번 검토에 없다.

## 상세 명세 중 남길 것과 선택으로 돌릴 것

| 구분 | 반드시 남길 최소 정보 | 축소/별도 선택으로 돌릴 부분 |
|---|---|---|
| 카탄 그림판 | typed terrain/number/road/settlement/city/robber/harbor, 자원 종류/숫자/수량/모름, canonical slot, ownerId/observedColor, 원본 evidenceId/region | 매번 반복하는 UI order/showWhen/source 메타데이터; 사진에 없는 전체 구성 개수 강제 |
| 정확한 정정/요약 | candidate/accepted 구분, 단일 기준판, 부분 관측의 명시 반영, 레이어 확인, 점유층·교환·undo, 항구 해안 양 접점/비율 | 그림용 좌표와 source crop 혼용, 후보/복수 장면 합산, 완전정보 추정 |
| 개인 보유 | 자원5종/개발5종의 null과0, 선택 확인 총수, 개인 notes, 소유자 표시 범위 | 총수/숨은 승점의 무조건 이중 출처, 사진 뒷면에서 카드 정체·구매 수명 추정 |
| 저장/그대로 열기 | 당시 pack/version·원본·확정/후보·소유·메모·snapshot, 열기 시 턴/epoch 불변 | 보관/복원 전체 체크리스트를 기본 시작 조건으로 만드는 것 |
| 남은 처리 | 현재 사람·필요할 때 단계/짧은 메모·실제 거래 전달량·확인한 구매 턴 | 모든 중단 상황을 다 묻는 25요구, 텍스트 안내를 필드로 복제하는 다수 resume 파생, 자동 생성 제한 boolean |
| 판본/규칙 | 기존 저장본 판본 고정, 선택한 거래/건설 방식, 원본 위반 기록 허용, 확인 가능한 국소 배치 규칙 | 모든 게임에 같은 턴질문 강제, 초기배치/과거 업그레이드/전체 플레이 엔진 추정 |

**정보가 있어 정확도에 도움을 줄 수 있는 부분:** 종류별 enum, 카탄 슬롯·층·앵커, 항구 접점, 물체 수량/소유/근거 범위, unknown 허용/후보 검증/중복 금지. 이 구조는 오류를 구분하고 편집/집계를 연결할 수 있다. **실제 사진 정확도가 경량보다 높다는 실험 증거는 아직 없다.**

**부피이거나 현재 UX에서 쓰이지 않는 부분:** 스캔에 섞인 ui/condition 메타데이터, 사진 관측 대상이 아닌 파생 boolean, 별도 총수/승점의 중복 확정값, UI가 제공하지 않는 대규모 완료 요구/보존 흐름. 기존 저장본에서 이를 지우라는 뜻은 아니다. 새 기본 흐름의 최소 투영으로 분리하고 역사적 팩/스냅샷 reader를 유지한다.

## 잘되는 계약과 이번 확인의 한계

- **VERIFIED:** typed component/위치/별도 source crop/observedColor/owner/null 수량/항구 독립층 계약이 있다. 자리 교환, 숫자층 보존, 원본대로 기록, 항구2접점/2·3·4 비율, private scope, 구판 pinned pack, 명시 저장/직접 열기 등은 기존 합성 회귀에 근거가 있다. 이번 probe도 재계산이 턴/epoch를 바꾸지 않는 것과 공개 prompt가 개인 손패를 제외하는 것을 직접 확인했다.
- **구현과 공식 명세 경계:** `catan-placement-research.md`의 기록 정정과 새 배치 구분/6·8 경고/도시 과거증명 비강제, `catan-information-priority-research.md`의 6판·2020 구분/교역 실전달 기록/새 카드 제한만 만료 요구를 대조했다. 이번에 새 규칙 해석을 반복 조사하지 않았다. 원본을 합법 상태로 바꾸는 수정도 하지 않았다.
- **UNCLEAR:** 기존 실제 사진 인식의 개체/슬롯/건물 유형/항구 접점 정확도, 실제 API 실패의 단일 원인, 현재 원격 배포의 파서 수정 포함 여부, 모든 UI 경로의 브라우저 조작, 모바일 실기기, 모델 latency 편차. 최근 parser 별도 결함 수정은 과거 실제 arm 실패 해결의 증명이 아니다.

## 재현과 산출물

```sh
node --import tsx docs/catan-detailed-pack-probe.mts
./node_modules/.bin/tsc --noEmit --allowImportingTsExtensions --module esnext --moduleResolution bundler --target es2023 --esModuleInterop --strict --skipLibCheck docs/catan-detailed-pack-probe.mts
```

직접 실행 둘 다 **exit 0**. 합성 결과는 [catan-detailed-pack-probe.json](catan-detailed-pack-probe.json), 재현 코드는 [catan-detailed-pack-probe.mts](catan-detailed-pack-probe.mts). 이번에는 이 세 검토 파일만 작성했다. 이전 138개 전체 suite/build는 반복하지 않았고, 그 통과 수를 이번 새 검토의 완성 증거로 재사용하지 않는다. 실제 API0·제품 수정0·배포0.

**권장 순서:** 수동/부분정정→기준판 연결, 자원 충돌 표시, 구매 턴 제한 만료를 먼저 고친다. 그다음 현재 UI가 제공할 최소 입력과 엔진 요구를 맞춘다. 상세 팩을 유지하든 경량+C로 옮기든 이 연결 문제는 먼저 해결해야 한다.
