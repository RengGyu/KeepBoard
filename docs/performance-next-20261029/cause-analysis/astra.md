# 판독 누락 원인: 확인된 단계와 아직 분리되지 않은 원인

2026-10-29 · 연구아스트라 · 기존 코드/실험 기록만 확인, 제품 편집·추가 API 호출0

**결론:** 거절된 축약 실험은 모델이 반환한 JSON부터8개만 담았다. 화면 조립 과정에서49개를8개로 줄인 것이 아니다. 다만 프롬프트 내용과 출력 필수 필드를 동시에 바꾸고 각1회만 실행했으므로, “문장을 줄인 것이 원인” 또는 “필수 필드를 뺀 것이 원인” 중 하나로 확정할 수 없다. **현재 제품은 기존 긴 native prompt/schema로 복원된 상태다.**

## 무엇이 확인됐나

- **VERIFIED:** [기존 실행](../../../docs/release-next-20261029/live-baseline.json)은49개, [축약 후보](../../../docs/release-next-20261029/live-candidate.json)는8개다. source SHA는 같다. 지형19→4, 숫자17→3, 도둑1→1, 정착지8→0, 도로4→0으로 기록됐다.
- **VERIFIED:** [원문 진단](../../../docs/release-next-20261029/candidate-output-diagnosis.json)은 provider raw8 = literal8 = 표시8이다. 링크8개도 각각 단일 관측·충돌 없음이다. 따라서 **이번 큰 차이의 발생 지점은 모델 반환 단계**이며, source 확장·중복 연결·그림 표시에서 행을 잃은 증거는 없다.
- **VERIFIED:** 후보 원문이 지형4개를 출력하고도 `board.layout / coverage=full`을 주장했다. 지형19개 관측을 요구하는 prompt와 맞지 않는 내용이다. JSON 형식 준수와 판독 완전성은 별개다.
- **UNKNOWN:**49개가 모두 맞는 정답인지,8개 중 값/위치까지 정확한 것이 몇 개인지는 전체 GT가 없어 모른다. **“출력 개수가49→8로 감소했다”가 정확하며, “정확도가84% 떨어졌다”는 계산은 성립하지 않는다.** 보이는 도로·건물의 누락은 기존 검토에 보고됐지만 이 문서에서 사진 전량 GT를 새로 작성하지 않았다.

## 이전 / 거절한 실험 / 현재

| 항목 | 이전 운영 | 거절한 축약 실험 | 현재 제품 |
|---|---|---|---|
| prompt 구성 | `observationPrompt` + `sceneObservationInstructions` + native 보충 | native 한 장용 문단으로 전면 교체 | 이전 구성 복원 |
| prompt 길이 | 합성 고정 fixture14,893문자 | 같은 fixture2,263문자 | 이전 구성 복원 |
| schema 전달 | prompt에 scene schema 본문 + API response schema | API response schema만 | 이전 구성 복원 |
| component 필수 필드 | id,kind,variant,ownerId,quantity,location,region,evidenceId | variant/ownerId/evidenceId만 선택으로 변경(나머지5개 필수) | 기존8개 필수 복원 |
| 출력 형식 | scene의 components 배열 | 동일. 새 약어/행 수 상한 없음 | 동일 |
| 사진 출처 처리 | 모델이 각 행 evidenceId 출력 | 생략하면 decoder clone에서 단일 출처 채움; 원문 보존 | 기존 decoder 복원 |
| 모델 설정 | Gemini3.8 Flash / LOW / HIGH /32768 | 코드상 동일 | 동일 |
| 이번 실제 결과 | provider45.034초, 전체58.333초,49행 | provider9.890초, 전체21.340초,8행 | 복원 후 추가 유료 판독 없음 |

문자 수는 [합성 비교 기록](../sol2/verification.json)의 값이지 실제 두 요청의 토큰 수가 아니다. 현재 복원은 [withdrawal-verification.json](../rejected-short/withdrawal-verification.json), 릴리스 상태는 [completion.json](../../../docs/release-next-20261029/completion.json)에서 확인했다. 축약 snapshot과 현재 파일은 서로 다른 버전이며, 거절한 실험의8행 결과를 현재 운영의 새 결과로 말하면 안 된다.

## 실제 지시문의 차이

직접 읽은 원문: [기존 일반 prompt](../../../server/ai/prompt.ts), [기존 scene 지침](../../../server/ai/scenePrompt.ts), [현재 native 연결](../../../server/ai/catanSceneReading.ts), [거절한 snapshot](../rejected-short/catanSceneReading.ts.snapshot).

| 실제 차이 | 해석 |
|---|---|
| 기존: `Put all public components ... inside ONE assertion.value.components array`, 각 distinguishable 물체별 component, canonical cell 관측, full19 조건을 여러 문단에서 강조. 축약: `One assertion`, `Inspect each physical kind`, `Keep each visible object ...`로 통합. | 전체 열거의 문맥·반복은 줄었다. **모든 물체 지시 자체는 남았다.** “종류당 한 개만 출력”이라고 요구한 문장은 없다. |
| 기존 capture contract·팩의 allowed field 설명·placement 설명·상세 variant/항구/owner 지침을 본문에 제공. 축약에서는 제거하거나 짧은 문장으로 대체. | 예를 들어 `board.layout`의 “19개 타일과 공개 배치”, 숫자·도로·정착지·도시 및 타일 앵커 설명이 별도 필드 정의로 전달되지 않는다. 다만 대부분의 기본 값 설명은 API schema에 남았다. 의미 정보가 전부 사라진 것은 아니다. |
| 기존: `Unknown variant/ownerId/quantity/number/location id stays null`. 축약: `Unknown stays null or omitted`, 이어 `Omit optional null/inapplicable fields`. | 첫 문장만 읽으면 필수 quantity/location/region도 생략 가능하게 들리는 모호성이 있다. 하지만 같은 문단의 필수 보존 지시와 `optional` 제한이 있으므로 **명백히 필수 필드 생략을 명령했다고 단정하지 않는다.** |
| 축약: `evidenceId may be omitted`; schema required에서도 evidenceId/variant/ownerId 제거. | 이3개에 대해서는 지시와 schema가 일치한다. `number`, `face` 등은 이전부터 선택이었다. variant는 지형의 중요한 관측값이지만 snapshot은 `Retain every readable variant`도 명시했다. |
| 기존 schema 본문 직렬화 제거 | API response schema는 유지됐다. **schema를 없앴다**는 설명은 틀린다. 구조화 schema는 full19 조건과 실제 그림의 실물 전량을 검증하지 않는다. |
| 축약에도 작은·겹친·가장자리 물체, terrain/number-token/road/settlement/city/robber/harbor, `all 19 terrain cells ...` 조건 유지 | “도로를 읽으라는 지시가 빠져서” 또는 “19칸 조건을 삭제해서”라는 원인 설명은 실제 diff와 맞지 않는다. |
| 기존 players 전체 → id/color만 | name 등 문맥이 빠졌다. owner 해석에는 영향 후보지만, 지형19→4까지 줄어든 현상을 이것만으로 설명할 근거는 없다. 기존 native는 assertions를 빈 배열로 전달했으므로 “기존에는 저장 정답을 보고49개를 맞혔다”는 주장도 근거 없다. |

기존 multi-view/private/복원 관련 지침 일부는 실제 한 장 공용 판 요청에 불필요한 문맥이었다. 그것을 없앤 것 자체가 잘못이라는 증거도 없다. 문장 길이와 품질의 단순 비례관계를 만들지 않는다.

## 원인 가설: 확인 우선순위3개

순위는 추가 비교가 있다면 먼저 분리할 순서이며, 확률이나 확정 원인 순위가 아니다.

1. **INFERRED — 전체 관측 과제를 설명하는 문맥을 크게 압축한 영향.** 전체 열거·필드 의미·canonical 관측·variant와 부품별 설명·반복 확인을 동시에 줄였다. 출력이 지형/숫자 일부만 담고 full이라고 한 현상과는 양립한다. 그러나 축약에도 모든 물체/19칸 지시가 있어, 특정 문장 삭제가 실패를 만들었다는 직접 증거는 없다.
2. **INFERRED — sparse 출력 정책과 schema 완화의 영향 또는1번과의 상호작용.** 필수3개를 뺐고 “모르는 값은 null 또는 생략”이라는 새로운 압축 지시를 넣었다. 생성되는 각 행의 형태가 달라지는 실제 변경이다. 하지만 행 수는 제한하지 않았고 raw8행에서 이를 빼먹어 parser가 전체 행을 삭제한 것도 아니다. “필수 필드3개를 빼면 검출 개수가 줄어든다”는 일반 법칙이나 이번 인과관계는 아직 검증되지 않았다.
3. **UNKNOWN — 실행별 VLM 변동 또는 확인되지 않은 응답 종료 상태.** 군별1회이고 실제 응답의 finishReason·usage·modelVersion·완전한 요청/응답 body 증거가 현재 요약에 없다. native `decodeProviderJSON`은 성공 경로에서 finishReason을 요구하지 않고 파싱한 본문만 돌려준다. **job completed·유효 JSON만으로 STOP을 증명하지 못한다.** token cap은 코드상 같으므로 “토큰 한도를 낮춰서 잘렸다”는 주장은 근거 없다. 반대로 종료 메타가 없으므로 가능한 종료 상태를 확정적으로 배제할 수도 없다.

production/candidate 코드 묶음과 호출 시점도 다르며 client→app transport는 fetch/vercel-curl로 다르다. 이것은 전체 시간 비교의 제한이다. client transport가 모델이 반환한 물체를 삭제했다는 증거는 없고, 단위가1개라 cap2 스케줄러가 같은 사진을 두 개로 쪼갠 것도 아니다. 요청 설정·모델 문자열이 같은 것과 실제 요청 bytes·응답 modelVersion까지 같음은 구분해야 한다.

## 가장 작은 다음 비교 — 실행하지 않음

**RECOMMENDATION:** 원인 분리가 필요하고 별도로 실행 승인이 있다면, 우선 **기존 full schema/모델/이미지/실행 경로를 고정한2군**만 비교한다.

- A: 기존 긴 prompt + 기존 full schema.
- B: 거절한 짧은 **관측 설명** + 기존 full schema. 단, wire 지시도 full schema와 맞춘다: variant/ownerId/evidenceId를 필수로 명시하고, 모름은 null, evidenceId는 고정 사진 ID를 출력하도록 한다. `evidenceId may be omitted` 및 optional3개 생략 허용은 제거한다. 그 외 짧은 설명은 유지한다.

이렇게 해야 관측 설명 단축을 시험하면서 schema 완화·출처 확장을 동시에 시험하지 않는다. **거절한 짧은 prompt를 그대로 full schema와 섞으면 evidenceId 생략 허용과 필수 schema가 충돌하므로 깨끗한 분리 실험이 아니다.** B는 이 포맷 지시만 정렬한 새 비교안이며 과거 후보와 byte-identical이라고 표시하지 않는다.

최소 스크리닝은 같은 환경에서 A/B 각1회, 총2호출·retry0이다. 기존 서로 다른 배포의 결과를 새 대조군으로 재활용하지 않는다. 사진 bytes/SHA, players·scope, 모델 설정, schema SHA를 고정하고 prompt 차이와 실제 finishReason/usage/modelVersion을 기록한다. 원사진에서 확인한 지형·숫자·도로·건물 목록으로 대응을 비교하며 행 수만 정답 지표로 삼지 않는다. 이2회로 반복 안정성을 확정하지 않는다.

B에서도 누락이 크면 **선택 필드 완화 없이도 짧은 관측 설명에서 실패가 재현됨**을 알 수 있다. B가 양호하면 schema 완화/상호작용/실행 변동이 남으며 “schema가 원인”으로 단정하지 않는다. 이 문서는 후속 호출·추가 연구 일정을 승인하거나 시작하지 않는다. 현재 운영은 복원한 기존 방식으로 유지한다.
