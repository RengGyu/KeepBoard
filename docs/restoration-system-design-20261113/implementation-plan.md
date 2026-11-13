# 구현 순서와 전달용 작업 카드

**RECOMMENDATION — 이후 구현 의뢰를 위한 계획. 이번 요청은 설계만 허용한다.** 아래 카드가 존재한다는 이유로 제품 파일·tests·원자료를 변경하거나 유료 판독을 시작하면 안 된다. 지금은 어떤 구현 카드도 실행하지 않았다.

## 가장 먼저 할 한 묶음

**T1→T2→T3→T4: 기존 응답으로 전체 평면을 만들고, 묶음 정정이 저장·재개까지 유지되게 한다.** T4는 원자 수정과 snapshot 연결을 나눠 진행한다. 기존9응답을 그대로 재생할 수 있으므로 새 모델 선택·유료 호출·새 사진 없이 구현과 첫 회귀 확인이 가능하다.

묶음의 사용자 완료 행동은 ‘기존 기록을 열어 여러 필드/판을 가로 작업면에서 파악 → 필요한 한 묶음만 확인/수정 → 저장 → 재열기/재개에서 같은 값·구역·미확정 확인’이다. API schema만 만들거나 정적 mock 화면까지만 만든 상태는 완료가 아니다. 기존120종·native·구판 저장본의 진입점도 유지한다.

```text
T1 계약·기본 profile → T2 전체 scene → T3 가독 작업면
                         └────────→ T4a 묶음 transaction
T3 + T4a → T4b snapshot/재개 연결 → 첫 사용자 흐름 완료

T4 → T5 의미 recipe/구조군 연결
T5 → T6 새 구조 관측 → T7 필요한 영역 재판독
T4 + T5 → T8 진행 문맥·실물 묶음 연결 (T6 결과를 기다릴 필요 없음)
T6 + 별도 자료 → T9 다른 시점 정합 (후속, 첫 묶음의 선행조건 아님)
각 통합 결과 → T10 새 장면·실기기 확인 → 해당 실패만 다음 수정
```

T10은 맨 마지막 일괄 gate가 아니라 각 사용자 흐름이 생겼을 때 확인하는 카드다. 실제 가족별 새 장면 품질은 T5–T7을 진행하며 넓힌다. 30초/전120종 조사/반복 전체 suite를 초기 선행 마일스톤으로 두지 않는다.

## 카드 공통 전달 조건

감독이 실제 구현을 시작할 때 작업자에게 `/Users/jeonggyuju/.codex/policies/WORKER_RUNTIME_RULES.md`와 **해당 카드만** 전달한다. 컨텍스트 링크는 카드에 명시된 자료로 한정한다. 모든 작업자는 `/Users/jeonggyuju/Project_folder/KeepBoard/PROJECT_CONTEXT.md`와 해당 연결 자료, 현재 diff를 먼저 확인한다. 다른 작업자가 함께 있으므로 타인 변경을 되돌리지 않고 겹치는 파일은 조정한다. `PROJECT_CONTEXT.md`/`docs/work-sessions.md` 갱신은 감독 소유다.

아래 기본 실행 모델은 프로젝트 지시에 따른 `gpt-6.1-sol / high`, Normal/default이며 **감독이 전달 전 실제 model/effort/runtime을 확인**한다. 이 설계를 작성한 Astra/max 예외를 후속 작업자 전체에 자동 확장하지 않는다. 추가 Astra 검토나 새 작업자 생성은 적용되는 사용자/프로젝트 권한을 따른다. 이 문서는 agent spawn 요청이 아니다.

각 카드의 AUTHORITY는 **추후 해당 구현이 의뢰됐을 때**의 소유 범위다. 공통 FORBIDDEN: `.keepboard`/운영키 접근·출력, 원사진/기존응답/고정정답 원장 덮어쓰기, 사용자 목표·120종 범위 축소, 모델 변경, 무단 유료 호출/외부 사진 전송, commit/push/deploy/게시. 테스트 전용 제품 기능을 넣는 경우 기존 `TEST_ONLY_FEATURES.md` 규칙을 따른다.

## T1 — 계약과 기본 profile/호환 adapter

**TASK:** typed scene/profile 계약과 old-record 입력 adapter를 만든다.

**OUTCOME:** 기존 저장본과 새 sidecar의 차이를 안전하게 읽고, 정확한 pack/version/source에 맞는 기본 recipe를 선택할 수 있다.

**CAPABILITY / MODEL / EFFORT:** 타입·호환 경계 구현; gpt-6.1-sol/high, 실행 전 실제 설정 확인.

**AUTHORITY / 소유:** 제안 `shared/restorationScene.ts`, `shared/restorationProfile.ts`, `tools/game-runtime/generate-restoration-profiles.ts`, `gamepacks/restoration-profiles/source/`, `gamepacks/generated/restoration-profiles.json`; `shared/types.ts`의 선택적 필드와 `gamepacks/catalog.ts`의 exact profile 연결만. 다른 사람과 공유되는 types/catalog 수정 범위는 먼저 조정한다.

**CONTEXT:** `PROJECT_CONTEXT.md`; [contracts §§1–4](contracts.md), [technical-design §§2–3,7](technical-design.md); 현재 `shared/gameEssentials.ts`, `tools/game-runtime/generate.ts`, `gamepacks/catalog.ts`, `shared/restoration.ts`, `shared/genericRecord.ts`, `shared/drawingProjection.ts`.

**ALLOWED SCOPE / 입출력:** 입력=고정 pack·원명세·art/spatial refs·현재 기록. 출력=검증된 `RestorationProfileV1`, source-keyed entity refs와 optional sidecar parser. 120 current packs에 metadata 기반 recipe를 생성하고 legacy native는 명시 분기한다. 새 정보 없는 팩은 기존 field/free-area renderer로 표현 가능하게 한다. 상세 역할 개선은 T5로 남긴다.

**FORBIDDEN:** 공통 금지 + 전체 원명세/팩 버전 재작성, inventory/asset 예시를 관측 instance로 생성, profile missing을 지원제외로 바꾸기.

**ACCEPTANCE:** old snapshot에 필드가 없어도 기존값을 그대로 열 수 있다. source/edition mismatch이면 공통시각/legacy fallback이고 정식주소는 생성되지 않는다. 동일 입력 compile은 같은 profile hash. retired pack은 current pack으로 교체되지 않는다. 필요한 validator round trip/잘못된 ref·version check를 추가한다. 현120 catalog가 빠지지 않았음을 metadata 집계로 확인하되 사진품질 인증이라 부르지 않는다.

**ESCALATE IF:** native source pin을 표현할 수 없거나 source 자료 간 모순 때문에 address/profile 적용이 불가능한 부분. 해당 부분만 UNKNOWN/fallback으로 남기고 기본 계약은 진행한다.

**DEPENDENCY:** 없음. 산출 계약은 T2/T4의 고정 입력이다.

## T2 — scope 전체 scene projection

**TASK:** 현재 필드별 drawing/estimate 결과를 전체 scene 관계/구역으로 합친다.

**OUTCOME:** 여러 field의 live 물체가 중복/소실 없이 모이고, 실제판이 없는 무리도 구별된 표시 구역으로 남는다.

**CAPABILITY / MODEL / EFFORT:** provenance·그래프·geometry 구현; gpt-6.1-sol/high.

**AUTHORITY / 소유:** 제안 `shared/sceneProjection.ts`; `shared/{structureRelations,estimatedBoardStructure,estimatedGeometry,drawingProjection}.ts`의 context index/adapter 경계. native 위치의 기존 의미는 유지한다.

**CONTEXT:** `PROJECT_CONTEXT.md`; [technical-design §4](technical-design.md), [contracts §§2–3](contracts.md), [walkthroughs](walkthroughs.md), [evidence E03–E05](evidence.md); 기존 `tests/{estimated-board-structure,estimated-structure-safety,restoration-projection}.test.ts`.

**ALLOWED SCOPE / 입출력:** 입력=허용 scope의 accepted records·evidence·profile·기존 overrides. 출력=stable entities/groups/regions/claims/frames/진단. 기존 estimator를 field별 compatibility adapter로 호출하되 shared context는 한 번 만들고 `handled`를 전체 누락으로 오해하지 않는다. 새 역할/거시 관계는 파생 inference다. competing anchor/순서 cycle은 유보하고 raw geometry를 보존한다.

**FORBIDDEN:** 공통 금지 + photo별 ID/좌표/group count 상수, 최근접 하나로 강제 연결, deleted receipt object 부활, native/수동 정정 무시, display region을 관측 board로 세기.

**ACCEPTANCE:** 고정9응답에서 원값/owner/ID/bbox digest가 같다. LC 양편+버림, Sagrada 창문+track+tools, 7W 여러 도시가 scope scene에 함께 있다. Sagrada low와7W 누락판 구역의 실제 board identity는 null이다. 현재 성공한 연결/부분순서와 수동 예외가 유지된다. bad bbox/중복 binding/삭제/경쟁판 synthetic 반례에서 강제 사실 생성이 없다.

**ESCALATE IF:** live identity 대응이 불명확한 재배열/이동. 추정 병합 대신 두 후보/미확정으로 남기고 필요한 새 source map을 보고한다.

**DEPENDENCY:** T1. 새 판독 불필요.

## T3 — 읽기 좋은 전체 작업면

**TASK:** scene의 상대 구조를 가로 중심 패널로 합성하고 기존 편집기로 연결한다.

**OUTCOME:** 사용자가 여러 판/공용 구역을 한 장면에서 찾고 읽고, 한 물체를 누르면 원래 기록을 수정할 수 있다.

**CAPABILITY / MODEL / EFFORT:** 기존 React renderer 통합·레이아웃; gpt-6.1-sol/high.

**AUTHORITY / 소유:** 제안 `shared/sceneLayout.ts`, `src/RestorationSceneView.tsx`; `src/{GameEssentials,GameBoardRecord,EstimatedBoardView,PhotoLayoutBoard,SessionWorkspace}.tsx`의 해당 연결, 관련 스타일. wrapper와 renderer body를 나누되 기존 상세 편집 기능을 유지한다.

**CONTEXT:** `PROJECT_CONTEXT.md`; [technical-design §5](technical-design.md), [contracts §4](contracts.md), [walkthroughs](walkthroughs.md); 기존 `tests/{readable-drawing-layout,estimated-board-ui,restoration-drawing-ui}.test.ts`와 저장된 supervisor screenshots.

**ALLOWED SCOPE / 입출력:** 입력=T2 scene+plan/viewport. 출력=읽을 크기의 패널·pan/jump·source selection. 상대 축/중앙/양편을 보존하며 native/자산/기존 piece renderer를 재사용한다. 물리 순서 미확정과 display order를 구별한다. T4 완료 전에는 영속 수정처럼 보이는 임시 group UI를 제품 완료로 내놓지 않는다.

**FORBIDDEN:** 공통 금지 + 전체 축소만으로 fitting, 7W anchor 세로목록을 전체 scene이라고 명명, 예시 아트를 현재 실물로 표시, 새로운 별개 값 편집기.

**ACCEPTANCE:** 저장된3사진 입력에서 공용/양편/여러 도시 구역을 가로 view로 탐색한다. 값은 읽기 크기이고 선택은 정확한 assertion/piece로 이동한다. 전체 pan과 카드 tap이 충돌하지 않고 native/detail 경로가 유지된다. 기존 field를 한 화면에 임의 나열하는 데서 끝나지 않는다. 실제 Safari 증거는 T10에서 별도로 남긴다.

**ESCALATE IF:** 기존 renderer의 내부 scroll/field 의존 때문에 body 분리 없이 중복 편집 상태가 생기는 경우. wrapper/body 책임을 작게 나눠 통합한다.

**DEPENDENCY:** T1–T2.

## T4a — 묶음 정정의 원자 적용

**TASK:** 한 group의 판/역할/frame/분할·병합 수정과 즉시 undo를 existing PATCH에 연결한다.

**OUTCOME:** 여러 field를 포함한 묶음도 한 번의 조작으로 바뀌고 일부 저장/참조 유실이 없다.

**CAPABILITY / MODEL / EFFORT:** transaction·identity·UI command 통합; gpt-6.1-sol/high.

**AUTHORITY / 소유:** 제안 `server/restorationState.ts`; `server/index.ts` PATCH/change 연결, `server/{engine,estimatedReferenceRebase,componentLinking}.ts` 참조 갱신, `server/rooms.ts` 기존 권한 연결, T3의 controls dispatch. 공유 파일 수정은 T4b와 순차 조정한다.

**CONTEXT:** `PROJECT_CONTEXT.md`; [contracts §5](contracts.md), [technical-design §6](technical-design.md); 기존 `tests/{structure-relations-http,pro-structure-controls-ui,structure-scope-policy}.test.ts`.

**ALLOWED SCOPE / 입출력:** 입력=scene commandId/expectedSceneRevision/group+선택범위 + 기존 answers. 출력=한 번 저장한 view/revision. stage clone→모든 field newID map→기존 proven refs/scene bindings rebase→자동 종속 관계 재평가. 기본 group 수정에서 기존 명시 수동 예외는 유지. 직접 선택한 동일 차원의 최신 manual command만 이를 대체할 수 있다. owner linking은 기존 명시 flow만 사용한다.

**FORBIDDEN:** 공통 금지 + per-piece 필수 wizard, 표시 수정으로 raw 값/sourceArea 변경, field 권한 우회, 일부 command만 반영, array index identity.

**ACCEPTANCE:** 두 field에 걸친 group 수정→성공, 같은 command 재시도→중복없음, stale/삭제/범위 위반→무변경. 단건 기존 answer와 batch 상호참조 모두 dangling ref 없음. 단 한 구역 확인이 관련 자동 관계에 전파되고 수동 예외는 유지된다. 직전 command undo가 다른 새 수정을 잃지 않는다.

**ESCALATE IF:** 출처 proof 없는 ID 대응/foreign scope 갱신 필요. 자동 rebase/owner 이동을 하지 말고 그 부분만 유보한다.

**DEPENDENCY:** T1–T2, UI 연결은 T3.

## T4b — 저장·재열기·명시 재개까지

**TASK:** sidecar를 기존 모든 관련 snapshot/restore 경로에 연결하고 첫 묶음 흐름을 완성한다.

**OUTCOME:** 새/구 저장본을 열 수 있고, 수정한 장면 관계와 미확정이 snapshot 재개까지 유지된다.

**CAPABILITY / MODEL / EFFORT:** persistence·scope·late-result 통합; gpt-6.1-sol/high.

**AUTHORITY / 소유:** `server/index.ts` commit/legacy resume, `server/{saveIntent,analysisTask,runtimeResume,sessionCodec}.ts`, `shared/privacy.ts`, 필요한 scene validator/저장 loader. `shared/types.ts`는 T1 계약을 사용한다. 관련 HTTP/integration tests만 소유한다.

**CONTEXT:** `PROJECT_CONTEXT.md`; [technical-design §7](technical-design.md), [contracts §4](contracts.md), [validation-plan §3](validation-plan.md); 기존 `tests/{restoration-save-intent,game-essentials-runtime-turn-resume,real-board-free-save-resume-api,restoration-save-resave-ui}.test.ts`.

**ALLOWED SCOPE / 입출력:** 입력=live scene+기존 snapshot/intent. 출력=scope에 닫힌 snapshot sidecar와 동일 의미의 reopen/resume. profile/algorithm pin, old no-sidecar read adapter, 미래 version 보존. 별도 scene stamp로 늦은 구조 선택을 차단하되 sidecar만 바뀐 경우 유효 literal은 기존 fusion으로 받고 최신 manual 위에서 재투영한다. 기존 값/원본 stale 검사는 유지하며 pan/zoom은 제외한다. 공개/개인 redaction에서 새 metadata의 refs·가설·질문도 같은 범위를 따른다.

**FORBIDDEN:** 공통 금지 + 열기만으로 snapshot 마이그레이션, 과거 pack 교체, owner resume로 공용 scene 교체, 미확정 자동완료/실물 정리 완료 간주.

**ACCEPTANCE:** T3 화면에서 T4a 수정→일반 commit와 save-intent 완료 snapshot 각각→재열기→명시 resume 성공. 원값/수동/native/부분순서/판 없는 구역 표시가 같다. late response가 수동 edit를 덮지 않는다. 구 native/retired snapshot과 scope 별 저장도 기존 의미가 유지된다. 제품효과와 검증 범위를 명시해 첫 묶음 인수 보고한다.

**ESCALATE IF:** old snapshot이 참조한 원본/팩을 구할 수 없는 부분. 해당 참조는 유보하고 다른 기록/저장본은 정상 연다.

**DEPENDENCY:** T1–T4a/T3. 이 카드까지가 첫 추천 묶음의 완료다.

## T5 — 지식 recipe와 다른 구조군의 재사용

**TASK:** 기존 원명세·아트·공간정의의 미사용 의미를 실행 profile로 연결한다.

**OUTCOME:** 영역 역할·반복/판본 조건·보존 관계가 코드/reader/renderer에서 같은 ID/의미를 쓴다.

**CAPABILITY / MODEL / EFFORT:** 게임 의미와 typed metadata/adapter 구현; gpt-6.1-sol/high.

**AUTHORITY / 소유:** T1의 `gamepacks/restoration-profiles/source/*`와 생성기/profile validator, `shared/sceneProjection.ts`의 family recipes. 원명세·art의 사실 수정이 필요하면 별도 근거를 남기고 지정 source 한 곳을 고친다. 생성물을 손으로 독립 수정하지 않는다.

**CONTEXT:** `PROJECT_CONTEXT.md`; [technical-design §3](technical-design.md), [walkthroughs §4](walkthroughs.md), [evidence E01–E02,E10](evidence.md); 실제 원명세 `docs/research/game-specs-120/games/`, `public/game-art/real-boards/`, `game-photo-definitions/spatial/`.

**ALLOWED SCOPE / 입출력:** 입력=기존120 metadata와 필요한 해당 family의 source. 출력=처음 Sagrada/LC/7W 상세 profile, 공통 grid/lane/stack/player-area, 이후 track/market/network/free-area 재사용. 매 family는 하나의 독립 작은 후속 카드로 나눠 실제 쓰는 파일만 소유한다. 기존3 heuristic은 adapter로 보존하며 proven family 구현으로 단계 이관한다. 120종 단순지원 경로는 유지한다.

**FORBIDDEN:** 공통 금지 + 전120 규칙 재조사, 완전 규칙 심판, 보이지 않는 수량/값 채우기, 7W 판본을 추측 변경, metadata completeness를 사진 성공률로 표시.

**ACCEPTANCE:** 같은 role/recipe가 model hints와 scene validator/renderer에 일관되게 전달된다. 변형/판본 불명은 공통 구조만 적용한다. 해당 family 새 반례에서 예시 물체 생성/false snap 없이 의미를 유지한다. 어떤 게임은 상세, 어떤 것은 legacy/free-area인지는 사실대로 보고하되 지원을 제거하지 않는다.

**ESCALATE IF:** 판본/규칙 source가 충돌해 역할 또는 native 주소를 결정 못함. common visual로 제한하고 필요한 판본 자료만 명시한다.

**DEPENDENCY:** T1–T4. T6/T8과 연결.

## T6 — 구조 관측 co-output와 geometry 계약

**TASK:** 현재 hosted reader에 버전 지정 scene request/result를 추가한다.

**OUTCOME:** 물체 값과 별개로 판 존재·region·frame·방향·겹침/끼움 근거를 받을 수 있으며 old responses는 그대로 읽힌다.

**CAPABILITY / MODEL / EFFORT:** strict wire/decoder/assembly 구현; gpt-6.1-sol/high.

**AUTHORITY / 소유:** `shared/lightweightRecognition.ts`, `server/{hostedObservation,spatialReading}.ts`, `server/ai/{geminiGameReader,terraGameReader,terraCompact,observationAssembly,spatialAssembly,spatialWire}.ts` 중 실제 사용되는 경계. 모델/강도 설정 변경은 제외한다.

**CONTEXT:** `PROJECT_CONTEXT.md`; [contracts §6](contracts.md), [technical-design §8](technical-design.md), [evidence E01,E03](evidence.md); 기존 strict v3/readMode/spatial protocol tests.

**ALLOWED SCOPE / 입출력:** 입력=profile SHA/역할단서/기존 한 장 request. 출력=valid literal+optional scene extension/deferred. visible-support와 추정 외곽을 분리, 원좌표 transform provenance 유지. unsupported 구조 조각만 유보하고 literal preview/행을 보존한다. default mode와 boxes/values/cells는 명시 계약으로 구별한다.

**FORBIDDEN:** 공통 금지 + v3 exact schema 전역 완화, unknown role 때문에 물체 삭제, literal 회전 대신 화면 회전 저장, 구조 실패로 모든 값 폐기, 암묵적 항상2회 호출.

**ACCEPTANCE:** old9응답/receipt는 byte 내용 변화 없이 재생되고 신규 protocol 합성 응답은 범위/ref/버전 검증된다. partial/truncated/bad geometry에서도 valid 값은 남는다. 실제 품질 개선은 새 승인된 판독 전에는 UNKNOWN으로 보고한다.

**ESCALATE IF:** 실제 API/provider가 필요한 구조 schema를 지원하지 않거나 응답예산 문제. 축약 contract/단일선택 구조부터 조정하고 무단 모델 변경·호출을 하지 않는다.

**DEPENDENCY:** T5+T2. 구현 검사는 유료 호출 없이 가능, 실제 이득 확인은 별도 판독 허용/자료 필요.

## T7 — 필요한 영역만 재판독/재촬영 연결

**TASK:** 복원에 영향을 주는 미독 값·잘못된 기하를 기존 원본/ROI로 확인하는 action을 연결한다.

**OUTCOME:** 이미 읽힌 전체 장면을 반복 호출하지 않고 필요한 곳만 확인하며, 새 결과가 수동값/원관측을 덮지 않는다.

**CAPABILITY / MODEL / EFFORT:** existing fusion/ROI·UX 연결; gpt-6.1-sol/high.

**AUTHORITY / 소유:** `server/{actions,scanObservation,observationFusion,analysisTask}.ts`와 현재 evidence/ROI 선택 UI, scene 진단→action adapter. 원본 사진은 읽기 전용이다.

**CONTEXT:** `PROJECT_CONTEXT.md`; [technical-design §§6,8,10](technical-design.md), [validation-plan §§2,5](validation-plan.md); 기존 same-source crop fusion·수동 삭제 보호.

**ALLOWED SCOPE / 입출력:** 입력=미확정 원인/영향/원본 근거. 출력=기존 원본 확대·부분판독 또는 필요한 경우 가까운 한 사진 제안. 추가판독은 그 runtime의 사용자 허용 범위 안에서만 실행한다. call의 ROI/sourceSHA/이전 후보/실제비용과 실패를 남긴다.

**FORBIDDEN:** 공통 금지 + 무한재시도, 실제 가림 값 hallucination, 구조만 바꾸면 되는 문제에 새 호출, user manual 교체, 부분완료 시간을 전체완료로 표시.

**ACCEPTANCE:** 판/묶음 확인으로 끝나는 경우 재판독이 발생하지 않는다. 값/geometry만 추가될 때 기존 group ID·수동/삭제가 유지된다. 서로 다른 값은 충돌로 남고 사용자가 한 곳에서 비교한다. 보이지 않는 것에는 전체촬영 반복보다 실물 보존/짧은 확인 경로가 있다.

**ESCALATE IF:** 새 유료 호출/사진 전송 권한 또는 판정할 수 있는 원본이 없음. 해당 실험만 남겨 두고 action/fusion 구현은 계속한다.

**DEPENDENCY:** T4/T6. 실제 효과 확인은 추가 자료 필요.

## T8 — 중단 문맥과 실물 보존을 scene에 연결

**TASK:** 기존 resume/requirements/preservation/actions를 장면의 미확정과 묶음에 연결한다.

**OUTCOME:** 그림 확인 후 필요한 진행 문맥을 짧게 남기고, 같은 묶음을 정리했다가 복원할 수 있다.

**CAPABILITY / MODEL / EFFORT:** 기존 도메인/진행 UI 통합; gpt-6.1-sol/high.

**AUTHORITY / 소유:** `server/{actions,engine}.ts`, `shared/gameEssentials.ts`의 기존 resume 연결, profile preservation links, 현재 `src/SessionWorkspace.tsx` 관련 pack/restore 흐름 및 scene 선택. 기존 template 의미를 유지한다.

**CONTEXT:** `PROJECT_CONTEXT.md`; [technical-design §6](technical-design.md), [walkthroughs](walkthroughs.md), [evidence E08](evidence.md); 실제 pack의 fields/requirements/preservationTemplates와 원명세 pending/round/turn.

**ALLOWED SCOPE / 입출력:** 입력=이미 답한 진행 메모+관계 미확정+보존 template. 출력=중복되지 않는 action, group↔preservation 연결, 필요시 기존 field 편집. display-only group id의 merge/split 이후 보존 대상이 바뀌면 자동 완료 처리하지 않고 연결 재확인 상태로 둔다.

**FORBIDDEN:** 공통 금지 + 모든 사진 후 필수설문, 질문0=완전복원 선언, player owner 강제입력, 사진에서 시대/턴/숨은 패 추론, 원래 필드와 중복 progress state.

**ACCEPTANCE:** 기존답은 재질문하지 않고 skipped decision도 입력이 안 바뀌면 유지된다. 하나의 중요한 구역 질문으로 관련 불확실성이 해소된다. 미완료 포함 저장이 가능하고 packed/restored는 사용자의 실제 행동 확인 전 true가 되지 않는다. 포장한 group을 재개판에서 찾을 수 있다.

**ESCALATE IF:** 해당 게임의 중단단계를 표현할 field가 없는 경우. 기존 note를 사용하고 필요한 최소 typed field 제안만 별도 보고한다.

**DEPENDENCY:** T4+T5. 새 판독을 기다릴 필요 없음.

## T9 — 다른 시점의 동일성·정합 (후속)

**TASK:** 단일사진/동일원본 crop가 아닌 다른 view의 등록과 실물 동일성을 분리해 처리한다.

**OUTCOME:** 같은 상태의 추가 사진을 이용하되 반복된 실물·서로 다른 시점 상태가 잘못 합쳐지지 않는다.

**CAPABILITY / MODEL / EFFORT:** geometry·identity 병합; gpt-6.1-sol/high. 필요시 독립 검토 범위를 감독에게 제안.

**AUTHORITY / 소유:** `server/observationFusion.ts`, `shared/photoGeometry.ts`와 새 scene registration/alias 계약, 관련 scene UI. 기존 same-source crop flow는 유지한다.

**CONTEXT:** `PROJECT_CONTEXT.md`; [technical-design §9](technical-design.md), [evidence E07](evidence.md), [validation-plan §4](validation-plan.md).

**ALLOWED SCOPE / 입출력:** 입력=별도 view·state claim·board landmark/frame. 출력=범위가 명확한 registration proof와 유일한 identity match/대안. board별 정합, 반복물 구별, 중간 이동된 상태 분리. 정합 없는 view는 별도 보기로 제공한다.

**FORBIDDEN:** 공통 금지 + captureEpoch/sameStaticState만으로 merge, 색/번호 같으면 동일실물 처리, 테이블 전체에 한 board homography 사용, 정합전 장수 합산.

**ACCEPTANCE:** 새 두시점 counterexample에서 같은물체/다른물체/판단불가가 분리되고 원관측 provenance가 남는다. 움직인 물체는 과거 state와 자동 fusion하지 않는다. 기존 crop refinement·수동/삭제 보호가 유지된다.

**ESCALATE IF:** 서로 다른 시점 실제 자료나 확정 가능한 correspondence가 없음. 구현 가능한 contract와 separate-view 동작까지만 완료하고 registration 품질은 UNKNOWN으로 둔다.

**DEPENDENCY:** T6+다른시점 자료. T1–T8 사용자 완료의 선행조건 아님.

## T10 — 새 장면과 실기기에서 사용자 흐름 확인

**TASK:** 각 통합된 기능을 새 구조군 장면과 실제 가로폰 사용으로 확인한다.

**OUTCOME:** 코드회귀와 실제 복원/사용성/시간의 증거를 분리해 다음 수정 대상을 결정한다.

**CAPABILITY / MODEL / EFFORT:** 범위 제한 검증·근거 보고; gpt-6.1-sol/high. 모델 판정은 사람 인증으로 표현하지 않음.

**AUTHORITY / 소유:** 추후 지정한 새 평가 폴더와 필요한 focused fixture/test. 제품 오류 수정은 원 카드로 돌아가 범위를 정한다. 기존 정답 원장/사진은 읽기 전용.

**CONTEXT:** `PROJECT_CONTEXT.md`; [validation-plan](validation-plan.md), [walkthroughs §4](walkthroughs.md), 구현 카드의 실제 diff와 검증 결과.

**ALLOWED SCOPE / 입출력:** 입력=고정9응답+해당 family 새사진+실제 iPhone Safari. 출력=검출/값/기하/소속/순서/표시/수정저장별 결과와 유보 분모, 구역찾기→수정→저장→재개 증거, 종단시간 분해. 사진/API 권한이 없는 항목은 미측정으로 남기고 가능한 replay/기기 동작만 진행한다.

**FORBIDDEN:** 공통 금지 + 1430검사/363행을 전체 정확도로 사용, 새 숫자 선행gate, 반복전체suite, photo별 정답에 코드를 맞추기, Chrome emulation을 실폰Safari라고 표현.

**ACCEPTANCE:** 실제 사용 흐름이 읽는 크기로 끝나는지, 정정 한 번의 전파/재열기 유지가 되는지 확인한다. 오연결과 해결가능 미연결을 같이 보고하고 display-only를 actual board 정답에 넣지 않는다. 새로운 bottleneck 근거가 생길 때만 성능작업을 제안한다.

**ESCALATE IF:** 실기기/새사진/판독 권한 없음. 해당 한계를 명시하며 이미 검증 가능한 범위를 완료한다. 임의로 완전 검증을 선언하지 않는다.

**DEPENDENCY:** 첫 실행은 T4 완료 후. 이후 T5–T9에서 새 의미가 생긴 부분만 갱신.

## 자료나 제품 선택이 필요한 부분

현재 설계를 막는 질문은 없다. 아래는 후속 효과를 측정할 때 필요한 입력이며 기본 제품 동작은 이미 위에서 결정했다.

- 사진 속7W의 정확한 판본: 공통 시각 구조는 진행하고, 판본별 정식주소/효과는 해당 확인 전 유보한다.
- 새 장면/두시점 사진과 유료 판독 사용 범위: 기존 응답 기반 구현은 진행 가능하다. 새 모델 품질·정합 효과는 자료/허용 이후 측정한다.
- 실제 iPhone Safari 접근: 보관 Chrome 캡처와 별개의 증거가 필요하다. 기기가 없으면 현재 확인 한계를 보고한다.
- 어떤 family에서 품질 문제가 남는지: T5의 다음 세부 recipe는 metadata와 실제 실패를 보고 정한다. 현재120종 목표 자체를 축소하지 않는다.

감독에게 넘길 인수물은 변경 파일/실제 동작/검증 결과/남은 UNKNOWN이다. 감독이 root 문서에 연구 제안·사용자 채택·실제 구현을 구분해 반영한다.
