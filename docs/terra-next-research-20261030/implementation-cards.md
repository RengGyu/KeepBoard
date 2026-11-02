# 구현자 인계 — Terra 첫 연결과 다음 품질 개선

이 문서는 **권고 구현 계약**이다. 연구자는 제품을 수정하지 않았고 후속 유료 호출도 실행하지 않았다. 최신 공유 소스 기준이며 과거 frozen 실험 사본은 변경하지 않는다. 현재 다른 작업자의 `public/game-art/real-boards/**` 소유권과 충돌하지 않는다.

## 핵심 결정 3개

1. Terra를 기존 스캔 파이프라인에 추가한다. 일반 literal과 Catan native의 두 기존 출력 경로를 유지한다. 새 해석 LLM·새 큐·120게임 전용 엔진은 만들지 않는다.
2. **현재 편집 기록의 자동 반영→선택적 정정→저장·재개**를 유지한다. 레거시 candidate 호환은 보존하며 승인/정정 의무를 추가하지 않는다. 모름≠0, raw 관측≠수동값, 사진 bbox≠판 슬롯이다.
3. M1은 named 좌표+필드 안내+원본으로 실제 연결을 완성한다. 속성 required schema와 확대는 다음 좁은 비교에서 선택한다. 이번의 복합 보강 결과를 M1의 실측 성능이라고 표현하지 않는다.

## 카드 T1 — backend/shared 실제 Terra adapter

**권장 소유자:** 기존 구현솔2 한 명. 감독이 `server/ai/**`, 필요한 shared 파일의 소유권을 이번 카드에만 명시 위임한다. docs/work-sessions.md의 기본 소유권을 묵시적으로 넘기지 않는다. 새 worker를 만들지 않는다.

**범위**

| 파일·심볼 | 최소 변경 |
|---|---|
| `shared/lightweightRecognition.ts` | `terra-game-observation-v1` selection/identity/wire를 **additive union**으로 추가. 과거 Gemini/local receipt와 저장판본 유지 |
| 신규 `server/ai/terraGameReader.ts` | `read`, `readCatanScene`, `status`, `identity`. native fetch로 Responses 호출, 자동 retry0. 구성은 서버에서 주입; 실험의 로컬 auth helper 의존 금지 |
| `server/ai/geminiGameReader.ts` | provider envelope 검사와 순수 literal payload decoding을 좁게 분리해 재사용. 기존 Gemini 요청·수용 결과 불변 |
| `server/ai/catanSceneReading.ts` | native payload→기존 normalize/receipt 함수를 provider 중립으로 추출. Terra strict schema adapter만 추가. 기존 카탄 prompt·필수 관측 범위·slot 의미 축약 금지 |
| `server/hostedObservation.ts`, `server/scanObservation.ts` | concrete `GeminiGameReader` 대신 작은 hosted reader 인터페이스. kind 검사를 공통 hosted predicate로 교체. anchor native/detail literal 분기 유지 |
| `server/scanExecution.ts`, `server/analysisJobs.ts` | 고정 identity 및 같은 hosted scan intent/claim 처리. Terra를 legacy queue로 잘못 보내지 않음 |
| `server/index.ts`, `server/cloudRuntime.ts` | 선택된/작업에 고정된 provider로 reader 생성. capability·POST·progress·중단 복구 경로에서 Terra 인지. cloud에서 `new GeminiGameReader()` 고정 제거 |
| `workflows/analyze.ts` | 기존 hosted `runScan` 및 `maxRetries=0` 보존; 필요하면 판별자만 변경. 새 workflow/큐 금지 |
| `server/ai/observationAssembly.ts` | 현재 face 복원·값 보존은 유지. 사용자 summary의 ‘Gemini’ 고정 표현만 reader에 맞추거나 중립화 |

### 요청·응답 계약

```text
provider: OpenAI Responses / model: gpt-6.1-terra
reasoning.effort: low / input_image.detail: high
max_output_tokens: 32768 / store: false / service_tier: default
automaticRetries: 0 / reader timeout: 기존 연구 조건 240초를 명시
selection: terra-game-observation-v1 + definitionSHA + areaId + 기존 frame/target
identity: model/API/effort/detail/output limit/adapter version을 작업 시작 때 고정
```

`literal-named-fill-original-v1`: 게임·판본·영역의 기존 allowed kind/property prompt, 실험 `FILL_SENTENCE`, **{ymin,xmin,ymax,xmax} 또는 null**. 명명 좌표를 수학적으로 x/y/width/height로 변환한다. 축 추측·정렬·clamp로 형식 위반을 덮지 않는다. `raw`·출처·누락 이유를 남긴다. row 생략은 unknown, 눈앞 물체 삭제 사유가 아니다.

일반 어댑터가 OpenAI 응답을 Gemini 응답인 것처럼 저장하지 않게 한다. 공통 decoder는 순수 payload만 받으며 `receipt.reader`/wire version은 실제 Terra다. completed가 아니거나 refusal/error가 있으면 정상 빈 관측과 구분한다. 토큰 한도나 네트워크 중단 후 재전달은 기존 claim에 의해 새 유료 요청을 만들지 않는다.

**카탄은 별도 필수 분기다.** 현재 anchor는 `catanScenePrompt/ResponseSchema`의 scene을 읽어 그림 슬롯으로 연결한다. `readCatanScene`을 생략하고 generic bbox만 넣으면 현재 사용자 기능이 줄어든다. Terra native strict JSON Schema에서는 각 object의 required/additionalProperties·nullable 표현을 공식 지원 형식으로 바꾸되, 기존 의미 있는 필드/좌표 종류를 없애지 않는다. literal box_1000을 native region/slot 좌표와 혼동하지 않는다. 그림 위치가 불명확하면 기존 unplaced·원문을 유지한다. 이 native Terra 경로의 실제 사진 품질은 **아직 UNKNOWN**이다.

`HostedObservationReader`는 현재 쓰는 네 메서드/identity 정도로 충분하다. adapter version으로 두 wire 버전을 식별하고 job/receipt에서 일치시킨다. 게임팩 sourceSHA/packVersion/캡처 정의를 provider 추가 때문에 갱신하지 않는다.

### T1 수용 검사 — 호출 없는 것부터

- 저장된 Terra native response 18개→named 변환→decoder→assembly 재생: 원관측, null/0/false, 관측된 속성, face 복원, 원본 SHA 보존. 이 연구의 참고값은 18/18 조립·749/749 값 보존·face41개이다. 이것은 **회귀 분모**이며 목표 정확도 수치가 아니다.
- Responses completed/빈 items/refusal/incomplete/429/잘린 JSON을 서로 다르게 처리. 같은 claim 재전달·완료 순서 역전·단위 실패 후 성공 단위 보존.
- Catan synthetic native와 literal crop: terrain/number/road/building+unknown이 기존 장면·출처로 전달. 같은 수량을 GT로 채우지 않음.
- 공용/owner/다른 epoch·수정된 scope에서 기존 CAS 동작 유지. 사용자가 고친 null·0·false·삭제·배치를 늦은 결과가 덮지 않음.
- 과거 Gemini/local 저장본과 레거시 후보를 새 adapter로 재해석하지 않음. reader unavailable 때 기존 기록·수동 저장 가능, 다른 provider로 몰래 호출하지 않음.

재사용할 집중 검사 위치: `tests/gemini-game-observation.test.ts`, `tests/gemini-game-api.test.ts`, `tests/cloud-gemini-execution.test.ts`, `tests/fastest-scan.test.ts`, `tests/scan-parallel-workflow.test.ts`, `tests/observation-fusion.test.ts`. Terra 전용 fixture/test를 추가하되 이 파일들을 전부 복제하지 않는다. 변경 경계의 typecheck/build와 필요한 회귀를 실행한다. 광범위 재연구는 선행조건이 아니다.

## 카드 T2 — 프런트 연결·저장 재열기

**권장 소유자:** 기존 구현솔1. T1의 additive identity/capability 계약 동결 후 시작. 제품 shared/server와 아트 파일은 이 카드에서 수정하지 않는다.

- `src/SessionWorkspace.tsx`: available reader로 Terra 선택·기존 기본값 연결, `resolveReader`/`newCaptureRun`/detailTarget/scanProgress/reload job 발견의 Gemini 전용 분기를 hosted 공통 분기로 교체한다. 별도 실험용 UI를 만들지 않는다.
- `src/jobStatusPolling.ts`: Terra도 hosted 진행/부분 결과 polling 사용. 지금은 Gemini kind만 fast path다.
- `src/api.ts`/`src/ScanObservationResults.tsx`: 타입·응답 소비에 필요한 좁은 조정만. 완료와 원본 유지·부분 실패 구분, 슬롯 보장 문구 금지.
- `GameEssentials`·`GameDetailFields`·snapshot/resume는 현재 필드/수동 경로 재사용. 앞면이 이미 있는 경우 다시 묻지 않음. 턴·손패·정리 메모는 기존 선택 입력/실물 보존으로 남김.

**수용:** 실제 UI에서 기존 그림 자동 반영→값 하나 수정→그대로 저장→새로고침→저장본 재개, 원본과 수정값 동일. 390px에서 원사진과 모름·누락·수량이 구분되며 정정을 강요하지 않는다. 새 승인 단계 없음. Gemini 과거 작업도 재열림. 이 검사는 backend mock/replay로 먼저 하고 실제 Terra 1회와 혼동하지 않는다.

전용판은 별도 제작자가 완료한 **한 게임**만 골라 `loadRealAssets`→field/area→manual placement→저장·재열기를 확인한다. 없는 아트는 기존 fallback. 신규 아트 좌표와 예전 수동 placement 의미가 맞지 않으면 해당 게임에서 보류/미배치로 표시하고 원래 기록을 유지한다. 94개 전수 슬롯 연결이나 사진 bbox 자동 투영은 T2 완료 요건이 아니다.

## 카드 V1 — 첫 실제 연결 확인, 후속 별도 실행 제안

이 연구의 실행 권한은 **0회**다. 구현 후 감독이 기존 실험 원본과 권한을 확인해 범위를 고정한다.

- **최대3 새 요청, 각1회, retry0**: 기존 Catan 전체1(native+그림), Quacks1(숫자·모름·수량), Splendor1(카드 구조·출처). 서로 다른 정지 상태를 한 job으로 묶지 않는다. 비교용 추가 전체 baseline을 다시 호출하지 않는다.
- 입력 SHA/영역/판본/reader profile/출력한도를 고정하고 기존 AI 부분 기준은 변경하지 않는다. 사진에 읽을 수 없는 부분은 unknown. 이 3회는 독립 일반 정확도 시험이 아니라 **연결·품질 제한 확인**이다.
- 요청 raw→관측→실제 편집 객체/값→저장·재열기 순서로 대조. bbox 대응/개별 회수/값 정오/오연결/그림 위치를 따로 기록한다. Catan에서는 새 native 경로가 정보·위치를 잃는지 우선 확인한다.
- 업로드/prepare/provider/결합/첫 그림/최종 반영/저장 완료 시간을 분리한다. 첫 그림은 진행 중 미리보기와 편집 기록 반영을 구별하며, 빠르게 보이게 하려고 별도 중간 commit을 추가하지 않는다. 사용자 정정·촬영 시간은 실제 수행한 것만 기록한다. usage의 input/output/reasoning/cache와 요금 환산을 남기고 잔액·실청구로 부르지 않는다.
- 401/403/429 또는 한도 소진은 추가 발행을 멈추고 원본을 남긴다. 이미 발행된 병렬 요청은 결과/실패를 회수·집계한다. 같은 body 반복으로 맞는 출력이 나올 때까지 시도하지 않는다. paid 요청 후 연결이 끊겼다는 이유로 재호출하지 않는다.
- **실패 조건:** 이미 읽힌 값/원본/수동 수정이 저장 과정에서 사라짐, 소유 범위 혼합, Catan이 native 기능 없이 전체 완료로 표시됨, 완료 전/중복 claim이 두 번 유료 호출됨. 일부 숫자 오독·미배치는 따로 보고하며 전체 마일스톤을 완전자동 요구로 바꾸지 않는다.

기존 9회 평균 환산은 base 약$0.01132/요청, 보강 약$0.01631/요청이지만 Catan native와 새로운 휴대폰 사진의 예산 상한이 아니다. 실행 전 실제 고정 body와 공식 요금으로 한도를 정한다. 출력 최대32768은 출력 항목의 비용만 제한하므로 전체 요청 비용 상한으로 쓰지 않는다. 무료 크레딧이 있어도 API usage는 동일하게 집계한다.

## 카드 Q1 — 출력 누락 vs 실제 시각 판독을 분리하는 다음 실험

T1/T2가 연결된 후 **필요할 때만** 진행할 제안이다. V1과 자동 연속 실행하지 않는다.

고정된 Sagrada·Quacks 원본 각1장에 **A=current named+fill flat attributes, B=같은 task의 종류별 nullable required properties**를 각1회: 최대4요청, retry0. 이미지 bytes·전체 관측 범위·reasoning/detail/output한도·모델은 같고 **이미지 확대는 하지 않는다**. 원문 값이나 inventory를 schema const로 넣지 않는다. 기존 kind/property domain만 사용한다.

분모는 (a) 이미 검출된 같은 물체에서 요구된 visible 속성 key의 생략, (b) 실제 읽을 수 있는 숫자/색·종류 기준, (c) 개별 검출과 묶음이다. A/B 순서는 미리 고정하고 단일 쌍의 확률적 변동 한계를 명시한다. key가 다 채워져도 null 증가·오독 증가·물체 감소·출력/시간 증가가 있으면 그대로 보고한다. 카탄 native 위치 계약을 이 literal 비교와 섞지 않는다.

**판단:** 새 wire가 실제 API에서 수락되고 누락 없이 기존 저장값으로 연결되는지는 구현 판정 가능. 네 요청만으로 일반 정확도 개선을 확정하지 않는다. 값이 계속 틀리면 output schema 강화만으로 해결됐다고 하지 말고, 기존 동일 원본 crop에서 실제 가독 정보가 더 있는 부분을 다음 후보로 고른다. 필요한 경우에만 `fill-only` vs `fill+resize`를 같은 입력으로 분리 비교하며, 이번 카드에 추가 호출을 끼워 넣지 않는다.

## 보류·변경하지 않을 범위

- 다른 시점 자동 정합/3D/전용 검출기/파인튜닝/새 참조 카탈로그. 현재 두 실제 W/C/D 사례만으로 그 비용을 정당화하지 못한다.
- 게임별 수량·숫자 정답·좌표로 보정, 묶음을 수량만큼 복제, observedColor로 소유자 추정, 화면 아트로 실물 정체 확정.
- 120팩 sourceSHA/판본 재발행, 자동 규칙심판, 모든 숨은 상태 수집, 저장 전 필수 질문 추가.
- 실측 없는 30초 약속, 전용판 완성=사진 배치 완성, 개발 사진=독립 검증이라는 표현.

후속 구현자는 결과·변경 파일·집중검사·남은 실제 사진 한계를 감독에게 반환한다. 감독이 운영 적용을 별도로 담당한다.
