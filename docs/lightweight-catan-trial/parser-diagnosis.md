# 기존 카탄 arm 응답 실패 진단

**UNCLEAR: 당시 한 가지 원인은 확정할 수 없다.** HTTP 응답 본문은 JSON으로 읽혔지만, 그 안의 모델 답변을 추출하거나 JSON으로 해석하는 구간에서 실패했다. 제공자 원문/finishReason/parts 종류/실제 예외명이 보존되지 않아 빈 답변·잘못된 응답 구조·중단된 JSON·일반 JSON 문법 오류 중 하나를 고를 근거가 없다. 추가 API 호출은 **0회**, 기존 2/2 ledger는 그대로다.

## 직접 확인한 경계

| 경계 | 증거 | 판단 |
|---|---|---|
| 전송/HTTP | `catan.timing.json`: status 200, 약 67초 | 네트워크 예외/120초 timeout 분기가 아님 |
| HTTP JSON envelope 읽기 | `httpThroughJSONMs`, `responseJSONBytes=25977`, usage 기록 | `Response.json()` 완료. HTTP 본문 자체의 JSON 문법 오류가 아님 |
| 모델 답변 추출/파싱 | `requestAndParseMs` 없음 | `requestJSON()`은 반환하지 못함 |
| raw 결과 파일 쓰기 | raw 파일 없음; 완료시간 대입보다 뒤에 쓰도록 되어 있음 | 파일 저장 실패로 설명할 수 없음 |
| 카탄 필드/장면 정규화 | `normalizeMs` 없음 | 19칸 정규화·필드/스키마 검사는 시작되지 않음 |
| 하네스 catch | Error/TypeError/empty text를 모두 request-or-parse로 기록 | 원인 구분 정보가 여기서 유실됨 |

HTTP 200은 **외부 응답 envelope가 성공했다는 사실**이며, 내부 `parts[].text`가 유효한 JSON이라는 뜻이 아니다. 7,752 output tokens만으로 출력 한도에 걸렸다고 판단할 수 없다. 당시 요청에는 `maxOutputTokens`, temperature, thinking 옵션을 넣지 않았고, 응답 finishReason이 없다. 모델/제공자 기본 token budget을 추정해 원인으로 확정하지 않았다.

## 합성 재현과 하네스 검토 — VERIFIED

`parser-reproduction.mts`는 설정/사진/네트워크 없이 12개 합성 envelope를 실행한다. **HTTP 200 이후 서로 다른 9개 실패 사례가 기존 catch에서는 동일한 `request-or-parse`로 합쳐졌다.**

| 합성 입력 | 기존 실패 | 현재 진단/처리 |
|---|---|---|
| Gemini thought text + 정상 최종 JSON | 두 text를 합쳐 JSON 문법 오류 | thought 제외, 최종 JSON 정상 |
| MAX_TOKENS + 잘린 JSON | 일반 Error | invalid-json / model-json / MAX_TOKENS / 길이 |
| 뒤 쉼표·설명문 prefix | 동일 일반 Error | invalid-json / SyntaxError, 자동 복구 없음 |
| 안전 차단, candidate 없음 | 빈 텍스트 일반 Error | no-text / blockReason=SAFETY |
| candidate 있지만 빈 text | 같은 빈 텍스트 일반 Error | no-text / candidateCount=1 / textLength=0 |
| parts가 배열 대신 객체 | TypeError | response-shape |
| OpenAI incomplete/잘린 JSON | 일반 Error | invalid-json / incompleteReason |
| OpenAI refusal | 빈 텍스트 일반 Error | no-text / partKinds=refusal, 본문 저장 안 함 |

**하네스가 본문을 먼저 소비해 깨뜨렸다는 가설:** 기존 메커니즘은 clone도 아니고 두 번 읽기도 아니다. Proxy의 `json()`에서 `target.json()`을 한 번 호출한 뒤 **그 같은 payload 객체를 호출자에게 반환**한다. 이를 `response-observer.mts`로 분리해 실제 표준 `Response` 객체로 검사했다. 12사례 모두 observer 전/후 기존 decoder 결과가 같았고, read count는 1이었다. 정상 Gemini와 OpenAI wire 응답도 통과했다. 당시 카탄 arm의 HTTP JSON 읽기 완료 기록도 이 가설에 반한다. 따라서 이번에 재현한 범위에서 body-consumption 결함은 확인되지 않았다.

## 최소 수정 — 실제 사건 해결 확정과 구분

- `server/ai/response.ts`: 순수 응답 판독 함수로 분리. **Gemini thought 부분을 최종 답변에 합치는 실제 코드 결함**을 합성 입력으로 재현하고 수정했다. 공식 [Gemini Part 계약](https://ai.google.dev/api/generate-content#Part)은 `thought`를 일반 text와 구분한다. **당시 응답에도 thought text가 있었다고 주장하지 않는다.** 당시 usage에서 thoughts token 항목이 없었다는 사실만으로 parts 존재 여부를 결정할 수 없다.
- 실패는 `invalid-json`, `no-text`, `response-shape`로 구분한다. stage·HTTP status·finishReason·blockReason·parts 종류/수·본문 길이·parser error class만 노출한다. 임의 provider 문자열은 `other`로 제한하고, 답변/생각/거절문/키/사진/응답 ID/JSON 오류 snippet은 진단 객체에 넣지 않는다.
- 엄격 JSON 파싱은 유지한다. 잘린 괄호 채우기·뒤 쉼표 삭제·설명문에서 임의 JSON 추출·여러 JSON 중 하나 고르기·자동 재시도는 하지 않았다. 정상 plain/fenced JSON과 OpenAI `output_text`/wire `output[].content[]` 계약을 유지했다.
- `server/ai/index.ts`: 기존 transport의 모델/옵션/원본 전송 코드는 그대로, 응답 판독만 새 함수에 연결했다. `parseModelJSON`의 기존 import 경로도 re-export로 유지한다.
- trial 하네스: 다음 **별도 승인된 호출이 있을 때만** response metadata와 안전한 decode code를 보존하도록 보완했다. 원본 응답/키를 기록하지 않는다. 기존 측정/ledger는 덮어쓰거나 초기화하지 않았다.

공식 [finishReason/응답 계약](https://ai.google.dev/api/generate-content#FinishReason)은 MAX_TOKENS·차단 등 완료 사유를 제공한다. 다음 정상 승인 호출에서는 이 메타데이터만으로 빈 응답/구조 오류/JSON 문법 오류/한도 중단을 구분할 수 있다. 이번에는 새 실제 호출이 금지되어 확인하지 않았다.

## 재현 명령과 exit

```sh
node --import tsx docs/lightweight-catan-trial/parser-reproduction.mts
node --import tsx --test tests/aiResponse.test.ts
npm run typecheck
npm test
npm run build
```

직접 실행 결과: 합성 재현 **12사례 exit 0**, 새 회귀 **9/9 exit 0**, typecheck **0**, 전체 **138/138 exit 0**, build **0**. 수정 전 새 회귀는 **2통과/5실패, exit 1**로 thought 오염과 진단 정보 유실을 재현했다. 전체 npm test 첫 실행은 tsx 임시 소켓 EPERM로 exit 1이었고, 승인된 로컬 테스트 재실행에서 통과했다. 외부 AI/API 요청은 없었다.

수정 파일: `server/ai/index.ts`, `server/ai/response.ts`, `tests/aiResponse.test.ts`, trial의 `harness.mts`, `response-observer.mts`, `parser-reproduction.mts`, `parser-reproduction.json`, 이 문서. 배포/서버 재시작/commit은 하지 않았다.

**후속 비교 전 필요한 것:** 동일 조건의 다음 승인 호출에서 metadata를 얻어 실제 실패 분기를 먼저 확인해야 한다. 과거 raw가 없으므로 이번 수정이 과거 사건을 해결했다고 확정하거나 속도/정확도 비교를 재개할 수는 없다.
