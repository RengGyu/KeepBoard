# 근거와 판단 경계

`VERIFIED`는 해당 코드/자료/사진에서 직접 확인, `INFERRED`는 그 근거로 설명한 원인·예상, `UNKNOWN`은 확인 불가, `RECOMMENDATION`은 앞으로 할 일이다. 기존 보고서의 수치는 그 보고서가 존재하고 그 내용을 담는다는 확인이며, 이번에 제품 suite나 독립 정답 평가를 다시 수행했다는 뜻이 아니다.

## E01 — 지식이 지나가는 경계

**VERIFIED.** [adaptSpecification](../../shared/gameEssentials.ts:32)은 원명세를 `fieldBindings`, 부품 이름/종류, 요약 `rules`, `resume`, 질문·보존 template로 바꾼다. `layout.areas[].anchor_contract`, `layout.relations`, 정정 `anchor_strategy`를 장면 추론용 구조로 내보내지는 않는다. [catalog](../../gamepacks/catalog.ts:6)는 정확한 pack/version/source에 읽기·복원 정책을 붙인다.

[compileObservationTask](../../shared/lightweightRecognition.ts:48)은 부품/속성/영역 합집합·적용성을 전달한다. [buildGeminiGameBody](../../server/ai/geminiGameReader.ts:22)를 [buildTerraGameBody](../../server/ai/terraGameReader.ts:40)와 compact 변환이 재사용한다. 일반 프롬프트에는 `runtime.rules`, field description, 판 자산의 table model이 없다. 공간 요청이 붙으면 [spatialInstructions](../../server/ai/spatialWire.ts:7)가 게임별 지시문·frame/address를 추가한다. 따라서 “룰을 전혀 보내지 않는다”는 설명은 과하다. **공간 요청이 있는 경로는 일부 의미를 이미 보낸다.**

[attachSpatialReading](../../server/spatialReading.ts:9)은 `values/boxes`에서 공간 요청을 붙이지 않는다. 기본 public-scene에서 정확히 연결된 canonicalSpatial은 전역 opt-in 없이 작동한다. 7W의 현재 공간 정의는 없고 Sagrada/LC는 있다. boxes 비교와 기본 전체 읽기를 혼동하면 안 된다.

## E02 — 자산은 충분한 부분도, 얇은 부분도 있다

**VERIFIED.** [Sagrada board.json](../../public/game-art/real-boards/sagrada/board.json)은 21영역·`tableModel`·9 table zones, [7W board.json](../../public/game-art/real-boards/seven-wonders/board.json)은 21영역·`tableModel`·49 table zones를 가진다. [LC board.json](../../public/game-art/real-boards/lost-cities/board.json)은 7영역이며 tableModel/tableZones가 없다. LC 자산의 5원정열을 두 관측편에 반복할 수 있지만, 자산이 양쪽 실제 편을 자동 식별해 주지는 않는다.

`src/`, `shared/`, `server/` 및 관련 생성기에서 `tableModel|tableZones|structureEvidence|assetScope|assetCompleteness|ownerSide|stateKey|privateViews`의 명시적 소비를 검색했을 때 일치가 없었다. [RealBoard](../../src/realBoards.ts:16)의 런타임 필드는 areas/slots/bounds/variants/network 등이다. JSON을 로딩한다는 사실과 의미를 실행한다는 사실을 구분한다. 검색 범위 밖의 모든 코드 부재를 인증하지 않는다.

현재 집계는 120 current packs, 공간 정의 31이다. `complete` 자산 표기는 그림 데이터 상태다. SVG에 그린 기본 말·더미·색 예시는 현사진 관측의 근거가 아니다.

## E03 — 검출·값·좌표의 별개 실패

**VERIFIED.** [9응답 집계](evidence-summary.json): LC 42/43/43/46행, Sagrada 42/42/42/41행, 7W 117행. literal `rotationDegrees`는 전부 null. 현재 literal decoder도 null을 부여한다([decodeLiteralObservationPayload](../../server/ai/geminiGameReader.ts:68)). 공간 board orientation과 literal 물체 회전은 다른 값이다.

Sagrada low는 `windows` 0개이고 dice 26개 중 18개를 `sourceAreaId=draft`로 반환했다. 7W는 wonder 4개, 카드 86개, 동전 17개, 군사토큰 10개. 이는 **관측행** 집계다. 카드 장수/전체 실물 수와 같다는 보장은 없다.

**VERIFIED — 직접 사진 열람.** [Sagrada](../pro-review-20261113/photos/sagrada.jpg)에는 전경 창틀/주사위 격자, 상단 트랙, 카드 두 줄과 토큰이 보인다. [LC](../pro-review-20261113/photos/lost-cities.jpg)는 비스듬한 공용판을 사이에 둔 카드줄과 판 위 더미가 보인다. [7W](../pro-review-20261113/photos/seven-wonders.jpg)는 앞/좌/우/뒤 두 무리로 구분 가능한 테이블, 가림과 손, 판 밖 동전, 분리된 뒷면 카드가 보인다. 직접 열람은 작은 숫자·가려진 카드의 재전사를 완료했다는 뜻이 아니다.

## E04 — 최신 연결 개선을 미구현으로 취급하지 않는다

**VERIFIED.** [collectStructureBoards/resolveStructureAnchor](../../shared/structureRelations.ts:40)에 같은 receipt의 판 alias, 명시 관계, containment, 카드 띠 전파, 경쟁 유보가 있다. [estimateBoardStructure](../../shared/estimatedBoardStructure.ts:52)에 LC A/B·버림 역할·색 모름 줄, 7W 단계 역할, Sagrada 상대 격자·판 없는 표시 격자·토큰 부착이 있다. 수동 override/native 위치를 우선 보존한다. 부분 순서는 [partialStructureOrder](../../shared/structureRelations.ts:94)로 처리한다.

이 추정기는 `ESTIMATED_AREAS`의 3종 분기를 사용한다. `allAssertions`를 읽어 다른 필드의 판을 참조하지만, 요청받지 않은 item은 `handled`로 두어 현재 필드 출력에 합치지 않는다. 따라서 cross-field 참조가 가능하다는 사실은 전체 장면 출력이 존재한다는 뜻이 아니다.

## E05 — 전체 장면의 표현이 비어 있는 지점

**VERIFIED.** [GameEssentials](../../src/GameEssentials.tsx:89)의 `activeBoard`/필드 선택 → [GameBoardRecord](../../src/GameBoardRecord.tsx:175)의 필드별 estimator → [EstimatedBoardView](../../src/EstimatedBoardView.tsx:18)로 간다. 7W cluster는 anchor별로 묶은 뒤 key로 정렬해 세로 나열한다. 판과 판의 상대 배치/좌석 관계를 출력하는 계약은 없다. LC도 색별 행을 나열하며 버림은 다른 필드다.

최신 보관 화면을 직접 열었다: [7W](../astra-placement-recovery-20261113/supervisor/screenshots/seven-wonders-landscape.png), [LC](../astra-placement-recovery-20261113/supervisor/screenshots/lost-cities-landscape.png), [Sagrada](../astra-placement-recovery-20261113/supervisor/screenshots/sagrada-medium-landscape.png). 844×390 캡처에서 7W는 첫 판의 일부 행, LC는 몇 개 색줄, Sagrada는 창문 위쪽부터 보인다. 이들은 보관된 Chrome 캡처이며 이번 live 브라우저/실폰 실행이 아니다.

## E06 — 정정·저장은 이미 있다

**VERIFIED.** [EstimatedPlacementControls](../../src/EstimatedBoardView.tsx:74)는 줄 전체 판 선택, 상대 자리, 부분 순서, 부착, 네 모서리 frame을 제공한다. 단 `wholeGroup`은 같은 `assertionId` 안에 한정된다. [answerField](../../server/engine.ts:113)는 새 assertion ID를 만들고 [rebaseEstimatedReferences](../../server/estimatedReferenceRebase.ts:7)가 같은 출처의 live 참조를 다시 연결한다.

[PATCH /api/sessions/:id](../../server/index.ts:323)은 이미 `answers[]`를 처리하며 `change` 안에서 저장한다. [linkComponents](../../server/componentLinking.ts:13)는 여러 실물을 한 목적지로 clone에서 검증해 이동한다. 신규 UI 때문에 별도 일반 저장 API를 만들 필요는 없다. 다만 여러 필드를 한 번에 바꾸며 서로 참조하는 경우는 현재 단건 helper의 적용 순서에 의존하지 않도록 일괄 ID 재연결 설계가 필요하다. **이번에 기존 batch의 버그를 재현했다고 주장하지 않는다.**

[saveIntent](../../server/saveIntent.ts:9), [commitAnalysisTask](../../server/analysisTask.ts:35), [resumeSnapshot](../../server/runtimeResume.ts:9)은 저장 의도·완료 snapshot·늦은 결과 차단·명시 재개를 제공한다. [sessionCodec](../../server/sessionCodec.ts:8)은 receipt 등 중복 데이터를 intern한다. 새 장면 metadata는 이 경계에 연결해야 하며 자동 저장을 새로 발명할 필요가 없다.

추가 확인: [redactSession](../../shared/privacy.ts:4)은 복제 뒤 assertions/notes/evidence/preservations/snapshots 등의 현재 필드를 명시적으로 거른다. [rooms.authorizeRoom](../../server/rooms.ts:26)의 PATCH 분기는 answers/assertions 등의 write scope를 검사한다. [Snapshot/Session](../../shared/types.ts:62)에는 현재 scene sidecar가 없다. 따라서 새 필드는 단순 타입 추가만으로 기존 범위·snapshot 처리가 완료되지 않는다. `engine.currentFacts`의 최신 accepted/turn 선택과 불완전 Catan 판의 규칙판정 제외도 확인했다. 장면 수집에서는 최신성 규칙을 재사용하되 부분 그림 자체를 지우는 필터로 확대하지 않는 설계가 필요하다.

## E07 — 사진 여러 장과 같은 실물은 별개

**VERIFIED.** [projectGenericFusion](../../server/observationFusion.ts:28)의 sourceKey는 원본 evidence/SHA/읽기영역/scope/정의에 묶인다. 동일 원본 crop의 overlap, single/group, 부분 refinement, 값 충돌, 수동값/삭제 보호가 있다. 등록되지 않은 다른 시점은 `unregistered-view` 등으로 유보한다. `sameStaticState`와 여러 사진을 받는 기능 자체는 기하 정합을 증명하지 않는다.

## E08 — 진행 상황 질문의 현재 한계

**VERIFIED.** 대표 3팩의 `requirements`는 빈 배열이다([집계](evidence-summary.json)). 원명세에 turn/pending/round/neighbors 등은 있지만 일부 JSON 필드는 `opaque-preserve`/확인 메모로 바뀐다. [recompute](../../server/engine.ts:145)는 requirements로 질문을 만들고 `ready=questions.length===0`을 계산한다. [planActions](../../server/actions.ts:3)는 그 질문들을 묶는다. 따라서 **질문 엔진이 없는 것이 아니라**, 복원 관계의 불확실성·실제 중단 단계가 이 엔진에 자동으로 연결되지 않은 것이다. 질문0은 장면 전체가 복원됐다는 판정이 아니다.

## E09 — 기존 사진 판정과 이번 유보

**VERIFIED — 기록 내용.** [FINAL_V2_REPORT](../astra-placement-recovery-20261113/photo-evaluation/FINAL_V2_REPORT.md)의 고정 대응은 363행이다. LC baseline 판·편·역할 41맞음/1유보, 고정 같은줄쌍 63/63. 7W는 74맞음/0오소속/23미연결/20유보. Sagrada low는 표시격자18/실제판0. 판정 단위가 달라 통합 정확도 하나로 나눌 수 없다.

[source-basis](../astra-placement-recovery-20261113/photo-evaluation/source-basis.json), [source-matches](../astra-placement-recovery-20261113/photo-evaluation/source-matches-v1.json), [addendum](../astra-placement-recovery-20261113/photo-evaluation/source-evidence-addendum.json)을 읽었다. LC 노랑 노출띠·빨간 더미·7W 떨어진 동전은 이전 Sol 판단과 차이가 보존돼 있다. 원사진에서 빨간 더미를 전부 뒷면이라고 단정할 근거는 약하고 상단 노출띠를 개별 숫자로 대응시키기도 어렵다. 이번 설계는 고정 원장/363행을 수정하거나 이 차이를 해소했다고 주장하지 않는다.

**INFERRED:** 7W 사진의 `GIZAH (A)`/기존 A 표기와 현재 팩의 “2판 기본판” 사이에는 판본 불일치 가능성이 있다. **UNKNOWN:** 원사진의 정확한 제품 판본/인쇄. 이를 근거로 팩을 몰래 바꾸지 않는다. 공통 카드무리/부분 겹침은 표시할 수 있지만 구체 불가사의 단계의 효과·정식 주소는 정확한 판본 확인 전 적용하지 않는다.

## E10 — 필요한 1차 규칙만 확인

확인일 2026-11-13. 전체 규칙 엔진 구현이나 120종 재조사를 하지 않았다. 아래 사실을 **장면 역할/보존 관계의 근거**로만 사용한다.

| 자료 | 직접 확인한 관련 내용 | 설계에 쓰는 범위/한계 |
|---|---|---|
| [Floodgate Sagrada SA01 Second Printing, pp.2–4](https://floodgategames.com/Sagrada/Sagrada-Rules-Floodgate-Games-SA01.pdf) | 창문 패턴과 주사위, 공개 도구/목표, 도구 위 은총, 라운드 트랙의 같은 칸에 여러 잔여 주사위 | 창문/풀/트랙·토큰 관계를 구별. 보이는 주사위 수로 현재 라운드/턴을 확정하지 않음 |
| [Kosmos Lost Cities 691821, pp.2–3](https://www.thamesandkosmos.co.uk/wp-content/uploads/2020/04/691821_LC_Card_Game.pdf) | 공용판 양쪽 원정, 색별 버림, 원정의 겹친 카드·보이는 숫자, 버림 위 카드, 5색 기본/6색 변형 | 원정/버림·양편·순서를 별도로 보존. 합법성 때문에 숫자 순으로 재배열하거나 아래 값을 채우지 않음 |
| [Repos 7 Wonders 2판, pp.2,4–5](https://cdn.svc.asmodee.net/production-unboxnowcom/uploads/2022/01/sev-en02-rules-15988888706j22H.pdf) | Day/Night·가변 단계, 도시 색별 겹침, 단계 밑 뒷면 카드, 좌/우 이웃, 선택→사용→전달 | 색별 무리·단계 끼움·좌석 관계가 중요. 사진 속 모든 뒷면을 단계 카드라고 보지 않음 |
| [Repos 공식 FAQ](https://www.rprod.com/en/7-wonders/faq) | 구판/신판 혼합을 권하지 않으며 디자인·밸런스가 개정됐다고 안내 | 팩의 edition 문자열만으로 사진의 판본 일치를 증명할 수 없음 |

처음 지정된 7W 최신 CDN PDF는 web 도구의 용량 제한으로 전문 열기가 실패했다. 같은 공식 CDN의 위 2판 PDF는 전문 열람했다. 검색 결과의 Architects/Duel 자료는 사용하지 않았다. LC의 기존 source note에 있던 PDF 접근 실패와 달리 이번 공식 상품의 Manual 링크에서는 열람에 성공했다. 이 사실은 **이번 문서에만** 추가했고 기존 원명세를 수정하지 않았다.

## 재현·변경 범위

[inspect-evidence.py](inspect-evidence.py)는 지정 JSON의 집계와 SHA만 읽고 이 폴더의 JSON 2개를 작성한다. 실행 결과: 9사례, 보호 대상71파일, HEAD `fedc735`. [verify-design.py](verify-design.py)는 문서 링크/JSON/TypeScript 계약 예시만 검사하고 manifest와 원파일을 대조한다. 제품 실행·제품 타입/build/test·유료 호출·사이트 게시를 수행하지 않았다. 원관측의 잘못된 bbox/값도 그대로 보존했다. 최종 결과는 [design-validation.json](design-validation.json)에 있다.
