# 카탄 native 단일 사진 판독: 다음 최소 패키지

2026-10-29 · 연구아스트라 · 제품 편집/유료 API/배포 0회

**후속 판정 — FAILED / 보류:** 실제 같은 사진 비교에서 후보 원문이49개 기준 응답 대비8개만 반환했다. 이번 릴리스는 기존 긴 native prompt/schema를 유지한다. 아래는 실험 전 설계 기록이며 현재 채택 권고는 [live-followup.md](live-followup.md)가 대체한다.

**RECOMMENDATION: 카탄 공용 판 한 장 경로의 프롬프트를 전용으로 줄이고, 같은 scene JSON에서 반복되는 선택 필드만 생략한다.** 새 wire 형식, 새 모델, 추가 호출은 도입하지 않는다. 원 응답과 보충한 입력을 분리해 기존 scene·receipt·저장 계약을 보존한다. 감독은 이 패키지를 구현솔2에 인계했으며, `shared/scene.ts`의 명시적 null 수량 보정은 감독이 담당한다.

이 패키지는 구현 가능한 출력·입력 절감이며 **30초 달성이나 도로/건물 누락 감소를 검증한 결과가 아니다.** 작은 실물 탐색을 명시하면서 실물 행은 줄이지 않는 방향이다. 누락 개선의 효과는 동일 실제 사진 비교 전까지 UNKNOWN이다.

## 근거와 병목 분리

표의 VERIFIED는 소스·저장된 수치·오프라인 재현을 직접 확인했다는 뜻이다. REPORTED 수치는 과거 실행 기록이며 이번에 재측정하지 않았다. INFERRED는 해석, UNKNOWN은 미확인이다.

| 근거 | 확인 내용 | 판단의 한계 |
|---|---|---|
| [native release.json](../../catan-native-board-connection-20261028/release.json) | VERIFIED 기록: 마지막 성공 native 한 장 `providerMs=42297`, `totalMs=56650`, 41개(지형19/숫자17/도둑1/정착지4). REPORTED: 보이는 도로·도시/건물 누락. | 사진의 전체 GT·native usage·반복 분산 없음. 41개 배치 성공은 전량 검출 성공이 아니다. |
| 같은 기록의 산술 | VERIFIED: provider 구간 밖 잔여는 14,353ms. | 업로드·job 예약·워크플로·이미지 읽기·저장·UI가 각각 몇 ms인지 UNKNOWN. 잔여 전부를 DB/워크플로 탓으로 돌릴 근거 없음. |
| `GeminiGameReader.readCatanScene` | VERIFIED: 현재 reader timer는 fetch 전부터 응답 JSON과 scene 디코딩 후까지 포함. 모델은 `gemini-3.8-flash`, LOW/HIGH, maxOutputTokens32768. | `providerMs`는 순수 생성 시간/TTFT가 아니다. 네트워크·provider 대기·디코딩이 분리돼 있지 않다. |
| [4crop timing-result.json](../../scan-parallel-20261028/timing-result.json), [README](../../scan-parallel-20261028/README.md) | VERIFIED 기록: cap1 101,206ms / cap2 50,910ms, 입력5,192 동일, 출력15,333/15,197, 조건별1회·retry0. | 다른 사진·직접 API 실험. 저장된 flat 응답은 `kind,box_1000,terrainType,color,number,ratio,resource,uncertainty`이며 제품 native scene도 generic attributes wire도 아니다. 제품 전체 지연/품질 개선치로 전용하지 않는다. |
| 같은 crop 각 요청 | VERIFIED 기록: 같은 입력1,298토큰에서 윗 crop 약4,900–5,158 출력토큰/32–33초, 아랫 crop 약2,511–2,620/17–18초. 총 보고 토큰 중 출력 약75%. | INFERRED: 출력 생성을 줄일 여지가 크다. 더 많은 물체/어려운 영역이 생성량과 시간을 동시에 늘릴 수 있어 출력량만의 인과 효과는 미분리. |
| `server/scanObservation.ts` / `workflows/analyze.ts` | VERIFIED: 로컬은 최대2 worker, cloud는 최대2개 wave. anchor는 native, detail/crop은 literal reader. 원 index로 결과 유지. | 한 장 native의 42초에는 unit 병렬화로 줄일 두 번째 작업이 없다. 4crop 병렬화 재작업은 이번 최소 개선의 핵심이 아니다. |
| `prepareScanObservation` / `prepareHostedObservation` | VERIFIED: prepare의 단위별 반복은 순차이고 이미지 읽기가 중복되는 지점이 있다. 분석에서도 고정 SHA를 재확인한다. | 실제 준비 시간 미측정. 증거 검증을 제거하거나 전체 준비 구조를 먼저 바꿀 근거가 부족하다. |
| [offline-evidence.json](offline-evidence.json) | VERIFIED: 합성 session의 현재 native prompt 14,910문자/15,731 UTF8 bytes, response schema4,263bytes. scene schema가 prompt에도 들어 있다. | 문자/bytes는 토큰·지연이 아니다. 사용자 사진/정보를 읽지 않은 코드 재현이다. |

30초의 규모도 분리한다. 이전 한 번의 14.353초 잔여가 그대로라고 가정하면 provider 구간은 42.297초에서 15.647초 이하로 줄어야 한다(약63% 감소). 이는 **가정에 따른 산술**이며 이 패키지가 그 감소를 낼 예측이 아니다. native usage 부재로 몇 토큰을 줄여야 하는지 계산할 수 없다.

## 소유 파일과 경계

| 소유자 | 파일 | 변경 |
|---|---|---|
| 구현솔2, 이번 한정 위임 | `server/ai/catanSceneReading.ts` | 단일 사진 전용 prompt, native schema required 축소, 원 wire와 별도 expansion clone 분리 |
| 구현솔2, 이번 한정 위임 | `tests/catan-native-scene-connection.test.ts` | sparse/full 응답 동등성, 원문 보존, source/attachment/unknown·0 회귀 |
| 감독 | `shared/scene.ts` | `normalizeComponent`의 `quantity`가 명시 null일 때 legacy count/default로 대체하지 않는 최소 보정 |
| 감독 | 해당 scene 정규화 테스트(기존 파일 또는 별도 집중 파일) | null/0/legacy count/누락 기본값을 구분하는 회귀 |
| 연구아스트라 | `docs/performance-next-20261029/astra/**` | 이 설계, 오프라인 근거, compact handoff |

`geminiGameReader.ts`, generic `read()`, shared 공개 타입·wire id, crop 입력/선별, workflow, UI, commit/merge 로직은 이번 필수 수정 파일이 아니다. reader가 이미 `catanScenePrompt`와 `catanSceneResponseSchema`를 호출하므로 새 request builder를 만들 필요도 없다. 기존 일반 `observationPrompt`/`sceneObservationInstructions`는 다른 호출자가 사용하므로 그대로 둔다.

## 입력·출력 계약

대상은 기존 native 분기 그대로다: `nativeBridge==='catan'`, `areaId==='board'`, `common_public`, owner 없음, 원본 이미지1개, detail/crop이 아닌 anchor 또는 기존 단일 사진. `prepareHostedObservation`와 reader의 이미지 수/SHA 확인을 유지한다. schema와 expansion에서 단일 출처 전제를 직접 확인하고, 다중 사진에 동일 기본값을 적용하지 않는다. 다른 경로의 허용 범위를 넓히지 않는다.

외부 출력 형태는 계속 다음과 같다.

```text
{summary, assertions:[{field, value:{version,coverage,components,...}, evidenceIds}], warnings}
```

- assertion field는 기존 `board.layout|components.observed`, 개수 상한1을 유지한다.
- component의 required는 `id,kind,quantity,location,region`이다.
- 기존 `variant,ownerId,evidenceId`를 **properties에는 남기고 required에서만 제외**한다. non-null 관측값은 생략하지 않는다. `variant/ownerId`는 모름·비적용일 때만 생략 가능하다.
- `evidenceId`는 한 원본이 요청에 고정돼 있으므로 매 행 반복하지 않아도 된다. assertion.evidenceIds는 유지한다. id는 짧은 고유 문자열로 남겨 `attachedToId` 연결을 유지한다.
- `number,ratio,observedColor,face,direction,attachedToId,note`, 모든 기존 kind, location·coverage·coverageByLayer는 계속 표현할 수 있어야 한다. 값 있는 속성이나 작은 실물 자체를 속도 때문에 제외하지 않는다.
- quantity는 생략하지 않는다. `null`은 불명, `0`은 실제 관측된0, `1`은 실제 단일 실물이다. 그룹 box라는 이유로1을 만들지 않는다.
- API 설정·이미지 bytes/해상도·출력 token 상한·호출 수는 유지한다. 작은 `maxItems`나 낮은 maxOutputTokens로 응답을 잘라 절감하지 않는다.

**원문과 expansion의 순서:**

1. 기존 provider decoder가 받은 JSON을 `wire`로 유지한다. 명시 null/부적합 값/생략 여부를 포함한 실제 `wire.assertions`가 raw receipt이다.
2. `structuredClone(wire)`를 별도로 만든다. 정상 component object에 `evidenceId` 자체가 없을 때만 단일 고정 사진 ID를 추가한다. `Object.hasOwn` 등으로 누락을 구분한다. 명시 null/다른 ID/잘못된 값은 expansion에서 덮어쓰지 않는다.
3. clone만 기존 `normalizeObservations`에 전달한다. 기존 face/값 검증·경고·scene 조립을 유지한다. raw wire는 변경하지 않는다.
4. receipt의 `hostedWire.id='gemini-catan-scene-wire-v1'`, `items=structuredClone(wire.assertions)`를 유지한다. 이는 같은 scene envelope의 선택 필드 생략이지 다른 약어/배열 wire가 아니다.
5. 기존 request, image/source SHA, frame, transforms, scanUnitId, componentRefs, normalized result, assertion observationReceipts를 그대로 연결한다. 저장·재열기·수동값 merge는 기존 경로를 거친다.

주의: 기존 `normalizeComponent`에는 `evidenceId:null`이고 유효 region이 있는 unattributed crop을 첫 evidence로 귀속시키는 규칙이 있다. 이번 adapter가 명시 null을 직접 채우지 않는 것과, 기존 downstream 규칙이 결과를 정규화하는 것을 혼동하지 않는다. 명시 잘못된 ID는 현재 정규화에서 source/region을 비우므로 expansion에서 유효 ID로 바꿔 구제하지 않는다.

## 전용 프롬프트에 남길 의미

전체 범용 prompt를 이어붙이지 말고 기존 도메인 제약을 짧게 전달한다. responseFormat의 JSON schema를 본문에 다시 JSON.stringify하지 않는다. typed schema 설명에 있는 필드 이름을 다시 길게 나열할 필요는 없다.

1. 이 사진은 현재 공용 판의 한 시점이며, 도로·정착지·도시·도둑 같은 작은 실물, 경계/겹침부터 살핀 뒤 지형·숫자 토큰·항구 등 모든 허용 실물을 기록한다. **이는 탐색 지시이며 검출 순서를 강제하는 파이프라인이나 추가 호출이 아니다.**
2. 물체는 보이지만 값/슬롯이 불명이어도 물체 행을 남긴다. 인쇄된 그림과 이동 말, 지형과 그 위의 숫자·도둑을 구분한다. 예상 재고·19칸·규칙상 정상 배치로 빈 관측을 채우지 않는다.
3. canonical hex/edge/vertex 규칙과 사진 위쪽 기준 rows3,4,5,4,3을 유지한다. 논리 슬롯과 사진 region은 독립이다. 슬롯 불명은 unplaced/null, 사진 region 불명은 null이다.
4. 실제 색 `observedColor`와 ownerId를 구분한다. 전달할 플레이어 문맥은 필요한 id/name/color뿐이다. 사용자 색 배정 또는 명시 보이는 소유 근거가 없으면 owner는 null/생략이다. player id/name의 색 단어를 증거로 쓰지 않는다.
5. visible front·숫자·변형·방향·attachment는 읽히는 값만 유지한다. 앞면이 안 보이면 hidden identity를 만들지 않는다. 항구 ratio/type/coastal edge도 관측된 것만 유지하고 재고로 생성하지 않는다.
6. full terrain coverage가 roads/buildings/harbors의 완전 판독을 뜻하지 않는다. coverageByLayer가 제공되면 실제 관측 의미를 유지한다. 기존 전체/부분 필드 규칙을 유지한다.
7. 턴·현재 플레이어·기록된 상태·규칙상 기대를 추론하지 않는다. summary는 짧게, note/warnings는 실제 불명·충돌만 기록한다. 이미 읽은 값을 서술문으로 반복하지 않는다.

이 변경에서 줄어드는 것은 schema 중복·한 사진에 불필요한 multi-view/private/context 설명·행별 source 반복·비적용 null·반복 서술이다. **작은 도로/도시, unknown 행, provenance를 제거할 이유는 없다.** 다만 출력 의미를 보존할 수 있다는 설계적 주장과 VLM의 실제 재현율 보존은 별개다. 짧은 지시가 성능을 높이거나 낮출 가능성 모두 실사진으로 확인해야 한다.

## 명시 null 수량의 기존 결함

**VERIFIED**, [offline-evidence.mts](offline-evidence.mts) 실행으로 확인했다.

```ts
normalizeScene({version:2,coverage:'partial',components:[{
  id:'r',kind:'road',quantity:null,
  location:{type:'edge',id:'r1c1.E'},region:null,evidenceId:null
}]}).components[0].quantity // 현재 1
```

`shared/scene.ts`의 `const quantityRaw = raw.quantity ?? raw.count`는 명시 null을 count 미정의로 바꾼다. 다음 기본값 분기가 보드 슬롯에1을 채운다. native 전체 decoder에서도 scene=1/receipt.result=1/raw receipt=null을 재현했다. 0은0으로 유지됐다.

감독 소유 최소 보정은 `raw.quantity === undefined ? raw.count : raw.quantity`처럼 undefined에만 legacy count fallback을 적용하는 것이다. 명시 null은 null, 0은0, count-only 레거시와 quantity 자체가 없는 레거시의 기존 기본값은 유지한다. 이 수정은 성능 개선이 아니라 요청된 null 보존 계약에 직접 필요한 결함 수정이다. 이 문서의 baseline probe는 **변경 전 증거**로 남기고, 수정 후 새 실행으로 덮어쓰지 않는다.

## 구현 완료 확인

유료 호출 없는 집중 검사로 아래 의미를 확인한다. 검사 통과가 시각 인식 정확도나30초 성능을 증명하지는 않는다.

| 검사 | 기대 |
|---|---|
| 같은 사진 full legacy scene vs sparse scene | 정규화된 실물·값·슬롯·region·source·attachments가 동일. UUID/time 같은 생성 메타는 비교에서 제외 |
| source 생략 + region null/유효 region | 고정 한 사진에서 생략된 component source가 복원됨. raw items에는 여전히 생략. 원 입력 불변 |
| source 명시 null/잘못된 ID | expansion에서 덮어쓰지 않음. 기존 downstream null+region 규칙과 잘못된 source/region 제거 동작 유지 |
| null/0/알 수 없는 variant/face 없음 | null→1/0으로 채우지 않음. 0 유지. 한 부적합 속성 때문에 다른 실물/슬롯을 버리지 않음. 구형 face 누락 수용 |
| 작은 road/city/settlement + unplaced/가림 행 | 부품 수 제한이나 필드 생략 때문에 행이 사라지지 않음. 관측색 유지, owner 추정 금지 |
| id와 attachedToId, 방향0, number:null, harbor ratio | 참조 및 값 보존. 짧은 id가 정렬/생성 순서와 무관하게 연결됨 |
| 기존 한 번 호출 mock | endpoint/model/LOW/HIGH/max tokens/image bytes 그대로, fallback/retry/두 번째 요청 없음 |
| native commit + 기존 scan 회귀 | baseline manual 값·타 source·원사진/SHA·receipt·index·부분실패·저장/재열기 유지 |

권고 실행: `node --import tsx --test tests/catan-native-scene-connection.test.ts tests/scan-recognition-integration.test.ts tests/scan-parallel-workflow.test.ts tests/cloud-gemini-execution.test.ts`, 감독의 scene null 테스트, `npm run build`(배포 빌드 필요 시 기존 `build:vercel`), `git diff --check`. 감독의 기존 scan/workflow/HTTP 14개 통과 보고는 REPORTED이며 변경 후 native 검사를 대체하지 않는다.

prompt/schema UTF8 bytes의 전후 비교와 full/sparse 합성 JSON의 의미 동등성도 남긴다. 예시 road 행은 반복3필드를 제외하면231→170bytes지만 이것은 합성 문자열 길이일 뿐 실제 응답·토큰·지연 절감률이 아니다. 출력 행 수 감소를 성공으로 세지 않는다.

## 실제 사진 비교안 — 아직 실행 권한 없음

후속 승인이 있을 때 **같은 native 과제** A(기존 prompt/schema)와 B(이번 패키지)를 비교한다. 4crop flat 결과를 A로 쓰지 않는다. 최소 탐색안은 다른 실제 카탄 원본2장 × A/B 각각2회 = 최대8요청, retry0이다. 요청 실패도8회 예산에 포함한다. 사진별 순서를 A,B,B,A와 B,A,A,B로 배치해 실행 순서 편향을 조금 줄일 수 있지만, 소표본·서비스 부하 불확실성은 남는다.

- 사진·원본 bytes/SHA·방향·범위·선택 players·모델·endpoint·LOW/HIGH·출력상한·계정·호출수·실행 환경을 동일하게 고정한다. A/B 차이는 이번 prompt/schema뿐이며 두 decoder는 각 계약에 맞게 결과를 처리한다.
- 도로·건물 누락이 보고된 사진을 사용할 권한과 원본이 확보되면 포함한다. 원본이 없으면 새로 고정한 사진으로 **A부터 다시** 측정하며 과거56.650초와 직접 비교하지 않는다. 다른 사진1장은 별도 구도/조명으로 두되 서로 같은 판으로 합치지 않는다.
- 모델 출력 보기 전에 원사진에서 명확히 보이는 개별 실물/종류/읽히는 값/슬롯·원본 영역을 제한된 정답표로 고정한다. 가림·흐림은 unknown으로 표시한다. 완전 GT가 없으면 확인한 항목의 누락·오류만 보고하고 전체 precision/recall을 만들지 않는다.
- 입력/출력/생각 토큰은 provider usage 원값으로 기록하고 누락을0으로 만들지 않는다. 요청 wall, 반환 JSON bytes, STOP/잘림·HTTP 상태, 정규화 전후 종류별 행 수, 출력→실물 대응을 함께 남긴다. 가격·실제 비용은 확인 없이 산출하지 않는다.
- 같은 입력에서 관측된 도로/도시 등 작은 실물이 더 누락되거나, box/slot·null/0·출처·owner가 나빠지면 토큰 감소만으로 채택 근거를 만들지 않는다. 추가 row가 실제 더 잘 본 것인지 환각인지도 확인한다.
- 직접 API timer와 앱 총시간을 별도 보고한다. 30초 목표는 지정된 제품 경로의 기존 시작/종료 경계로 실행했을 때만 판단한다. 준비·워크플로·저장·UI를 제외한 API 결과를 종단30초로 쓰지 않는다.

실사진 비교는 이 연구·오프라인 구현과 별도 승인 범위다. 미확인 품질/속도는 UNKNOWN으로 남기고 다른 승인된 배포·작업의 새 선행 마일스톤으로 만들지 않는다.

## 공식 문서와 적용 한계

- **VERIFIED 문서:** [Gemini GenerateContent structured outputs](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)의 REST 예제는 현재 코드와 같은 `generationConfig.responseFormat.text.schema`를 사용하며, `required`에 포함하지 않은 속성도 정의한다. 같은 필드명/기본 타입/nullable을 쓰는 선택 속성화 근거다. 이 endpoint의 수정 schema 실제 수락·속도는 유료 호출 전 UNKNOWN이다.
- **VERIFIED 문서:** [Gemini structured outputs: JSON schema support / best practices / limitations](https://ai.google.dev/gemini-api/docs/structured-output#json-schema-support)는 required·null 타입을 설명하고, 앱에서 의미 값을 검증해야 한다고 명시한다. 긴 optional 연속·분기 등이 복잡성 한도에 영향을 줄 수 있다. 새 anyOf/tuple wire를 기본안으로 도입하지 않는 이유다.
- **INFERRED 적용:** API에 schema를 이미 전달하므로 prompt의 동일 schema 직렬화를 없애도 형식 정의는 남는다. 공식 문서가 KeepBoard의 토큰/정확도 절감률을 보증하는 것은 아니다. 모든 서술 제약까지 지우는 근거도 아니다.

정확한 source SHA와 실행 출력은 [offline-evidence.json](offline-evidence.json), 구현용 요약은 [handoff.json](handoff.json)에 있다.
