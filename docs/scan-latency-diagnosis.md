# 사진 스캔 지연 진단

2026-10-21 07:31 KST 코드·합성 측정 기준. 제품 코드는 수정하지 않았다.

**판단:** 먼저 줄일 수 있는 확정된 대기는 **촬영과 업로드의 직렬 연결**이다. 분석 버튼 이후의 긴 대기는 **AI 요청 구간이 우선 조사 대상**이다. 기존 실험에는 25.172초·45.699초가 남아 있지만, 현재 사용자의 요청을 측정한 수치도, 순수 모델 추론 시간도 아니다. 현재 모델 설정·사용자 사진·요청 본문·개인 세션·키는 읽지 않았다.

근거 표기: **VERIFIED** 코드/이번 합성 측정, **REPORTED** 기존 실험 기록/감독이 전달한 배포 구성, **UNCLEAR** 현재 실사용 측정 없음, **RECOMMENDATION** 적용안. 합성 가짜 AI의 처리 시간을 실제 AI 속도로 해석하지 않는다.

**대기가 생기는 순서와 근거**

카메라: 기존 수정 저장 → 카메라 준비 → 작은 화면 품질 검사 → 안정 대기 → 원본 JPEG 인코딩 → 업로드/서버 저장 → 다음 촬영 간격 및 안정 대기 → 사용자가 마치기 → 마지막 업로드 완료 → AI 일괄 요청 → 결과 정규화/저장 → JSON 수신 → 그림 표시.

갤러리: 각 파일의 읽기/이미지 디코딩 → 업로드/서버 저장을 차례로 반복 → AI 일괄 요청. 갤러리에는 카메라의 안정 대기가 없다.

| 구간 | 확인한 동작·지연 원인 | 코드 위치 및 판단 |
|---|---|---|
| 촬영 전 | 편집·자산·맥락의 미저장 변경을 `flush()`로 먼저 저장한다. 변경이 없으면 이 단계가 큰 원인이라는 근거는 없다. | `src/SessionWorkspace.tsx:41`, `:99` — VERIFIED 구조, 실제 대기 UNCLEAR |
| 기기 내 선별 | 긴 변 192px 샘플을 250ms 간격으로 검사한다. 안정 조건은 1초, 촬영 후 간격은 1.8초다. 간격 대기 중 `stableSince`를 지워 두 대기가 겹치지 않는다. 중복·흔들림이면 다시 기다린다. | `src/Capture.tsx:50`, `:125`; `src/scanQuality.ts:3`, `:90` — VERIFIED |
| 촬영/업로드 결합 | `capturing=true`가 전체 해상도 JPEG `.94` 인코딩과 `await onCapture()` 동안 유지된다. 그동안 다음 프레임 검사도 중단된다. `acceptScanFrame(...performance.now())`는 **업로드 성공 뒤** 실행돼 촬영 간격도 그때부터 시작한다. | `src/Capture.tsx:63`, `:77`, `:81`, `:126` — VERIFIED, 바로 개선 가능 |
| 사진 전송 | 카메라는 실제 협상된 영상 크기 그대로 전송한다(`ideal:1920`은 상한 아님). 갤러리는 원본을 `readAsDataURL`로 읽고 디코딩하며 축소하지 않는다. 파일별 업로드를 순차 대기한다. Base64는 원본 바이트보다 약 4/3 크기이며 JSON 문자열 복사도 생긴다. | `src/api.ts:3`, `:44`; `src/SessionWorkspace.tsx:53`, `:109`; `server/store.ts:48` — VERIFIED 구조, 휴대폰 인코딩/WAN 속도 UNCLEAR |
| 배포 경로 | `/api`와 `/uploads` 모두 Vercel 외부 rewrite → `trycloudflare.com`으로 설정돼 있다. Mac Express/files 구성은 감독 전달 내용이다. | `vercel.json:7` — 설정 VERIFIED, 실제 배포 revision/모바일 경로별 시간 UNCLEAR |
| 서버 저장/대기열 | 사진마다 세션 전체 읽기 → 이미지 쓰기 → 재계산 → 세션 전체 쓰기 → 전체 `SessionView` 응답. 세션별 변경 작업은 직렬이며 AI도 이 대기열 안에서 기다린다. 같은 세션의 수정/업로드는 AI가 끝날 때까지 대기할 수 있다. GET까지 잠기는 것은 아니다. | `server/index.ts:68`, `:77`, `:174`, `:198`; `server/store.ts:20`, `:27` — VERIFIED |
| AI 준비/요청 | 저장 원본을 다시 Base64로 읽는다. 같은 소유자/촬영 회차의 최대 6장을 **한 번의 공동 판독 요청**으로 보낸다. 정상적인 6장 스캔이 AI 6회 호출인 것은 아니다. 과거 사진 전체를 자동 재분석하는 경로도 현재 스캔에서는 쓰지 않는다. | `src/scanBatch.ts`; `server/ai/index.ts:52`, `:159` — VERIFIED |
| 모델/출력 | Gemini는 `generateContent`, OpenAI는 `/responses`와 `detail:'high'`. JSON 전체가 올 때까지 대기한다. 추론 수준·이미지 처리 해상도·usage/timing 수집 설정은 없다. 장면 JSON 스키마, 관측 필드 정의, 확정된 이전 상태 전체도 프롬프트에 포함한다. | `server/ai/index.ts:66`; `server/ai/prompt.ts:4`; `server/ai/scenePrompt.ts:5` — VERIFIED, 현재 모델의 실제 추론/출력/이미지 토큰은 UNCLEAR |
| 결과 표시 | JSON 전체 수신 → 정규화/장면 합치기 → 재계산/저장 → `App.receive` → 편집기 갱신 순서다. 주기적 4.5초 조회를 기다려 표시하는 구조가 아니다. 원본 보기의 작은 사진 탭도 원본 URL을 쓴다. | `server/ai/index.ts:109`, `:182`; `src/App.tsx:39`, `:50`, `:86`; `src/SceneWorkspace.tsx:27`; `src/SceneEditor.tsx:409` — VERIFIED, 모바일 paint/사진 decode는 UNCLEAR |

**기존 실험과 이번 측정**

REPORTED — [이전 실험 설명](scene-trial/README.md), [결과](scene-trial/results.json): 2026-10-20, 당시 기록 모델 `gemini-4-argon`, 팩 `1.2.0`.

| 공개 연구 사진 | 기록된 대기 | 결과 구성물 |
|---|---:|---:|
| 01 · 전체 판 | 45.699초 | 40개 후보 |
| 08 · 카드 목록 | 25.172초 | 12개 후보 |

`seconds`의 세부 시작/종료 계측점과 provider usage는 결과 파일에 없다. 사진·구성물 수·출력량이 다른 2건으로 출력 개수와 속도의 인과관계나 현재 평균 속도를 산출할 수 없다. 당시 개발 서버 재시작으로 중단된 첫 시도는 현재 배포의 지연 원인으로 일반화하지 않는다.

VERIFIED — 이번 측정은 Apple M1 / Node v22.22.0 / arm64, 임시 Store 및 루프백 가짜 Gemini를 사용했다. 서버의 `.env` 자동 읽기를 피하려고 **빈 임시 디렉터리로 이동한 뒤** 서버 모듈을 import했다. 실제 모델 호출·카메라·배포 변경은 없었다. 가짜 서버는 유효한 합성 PNG를 수신하고 공개 연구 결과 형태의 40개 구성물 JSON을 반환했다. PNG는 압축을 하지 않은 전송 크기 시험용이며 실제 카메라 JPEG의 크기 분포를 대표하지 않는다.

| 시험 | 결과 | 해석 한계 |
|---|---:|---|
| 192×108 RGBA 품질 함수, 500회 | 중앙 0.329ms / p95 0.424ms | Mac의 함수 계산만. 모바일 canvas draw/readPixels/JPEG 인코딩 제외 |
| 안정적이고 서로 다른 6장, 250ms 시계 재생, 업로드 0ms 가정 | 1·4·7·10·13·16초에 촬영, 16초에 6장 저장 | 실제 촬영 실측이 아닌 현재 선택기의 결정적 재생. 카메라 준비/이동/인코딩/사용자 마치기 제외 |
| 동일 재생, 장당 업로드 500ms / 2,000ms 가정 | 19초 / 28초에 6장 저장 | 6장 모두의 전송 대기가 촬영 흐름에 더해짐. 실제 업로드 시간이라는 뜻 아님 |
| 640×480 합성 PNG 1장, 원본 922,283B | 업로드 중앙 10.9ms / 분석 API 중앙 20.6ms | 루프백, 가짜 AI 추가 지연 0ms, 각 3회 |
| 같은 크기 6장 | 업로드 합 중앙 61.0ms / 분석 API 중앙 63.3ms | provider 요청 본문 7,397,188B |
| 1280×960 합성 PNG 6장, 장당 3,687,983B | 업로드 합 중앙 181.8ms / 분석 API 중앙 215.9ms | provider 본문 29,522,788B. 가짜 서버만 수용했으며 실제 Gemini inline 한도 검증 아님 |
| 정규화 / 재계산 / 프롬프트 생성, 각 200회 | 중앙 0.080 / 0.573 / 0.022ms | 재계산 측정에는 합성 세션 복제도 포함. 실제 개인 세션/모바일 render 제외 |
| 가짜 AI에 1초 지연을 넣고 같은 세션 PATCH | PATCH 대기 1,016.5ms | 변경 대기열 결합 재현. 일반 단일 화면 사용에서 이 지연이 항상 더해지는 것은 아님 |

추가 확인:

- 6장 입력의 프롬프트는 확정 상태가 없을 때 16,066문자, 40개 장면과 공개 사실을 확정한 합성 상태에서는 27,314문자였다. **문자 수이며 실제 토큰 수가 아니다.** Base64 이미지 문자열 역시 텍스트 토큰으로 과금된다고 계산하면 안 된다.
- 40개 장면을 담은 합성 세션에서 스냅샷 0/10/50개 응답은 각각 약 150/304/920KB였다. `SessionView.pack`과 `SessionView.session.gamePack`에 같은 팩이 각각 약 53KB로 포함된다. 느린 회선과 오래된 기록에서 개선 여지는 있지만 이번 로컬 결과에서는 수십 초의 주원인이 아니었다.
- 배포 설정에 적힌 공개 `/api/health`만 GET한 1회는 HTTP 200, curl total 0.921초였다. **Mac → 공개 터널 → 서버 경로의 작은 응답**이며 Vercel 경유·휴대폰 업로드·AI 요청 시간은 아니다. 샌드박스 안의 최초 DNS 실패는 배포 장애로 계산하지 않았다.
- 합성 스크립트 실행 **exit 0**, 최종 실행의 가짜 provider 호출 10회 확인. 측정 전후 관련 소스 13개 SHA-256 동일. 임시 서버/자료 정리 완료. 연구용 스크립트와 수치 사본은 `/private/tmp/keepboard-scan-latency.mts`, `/private/tmp/keepboard-scan-latency-results.json`에 있다. 제품 파일 변경 없음.

**적용 순서 — 사용자가 바로 느끼는 개선부터**

1. **촬영·업로드를 분리하고, 촬영 간격과 안정 대기를 겹친다.**
   - 적용: `src/Capture.tsx`, `src/scanQuality.ts`, `src/scanBatch.ts`, `src/SessionWorkspace.tsx`.
   - 한 장을 canvas로 확보한 뒤 다음 장면 검사를 재개하고, 업로드는 작은 대기열로 진행한다. 첫 구현은 업로드를 한 번에 하나만 처리해도 촬영/선별과 겹칠 수 있다. 저장 중인 장면은 임시 fingerprint로 중복 방지하고 `저장됨 + 대기 중 ≤ 6`을 지킨다. 실패 시 임시 예약을 해제하고 재시도를 제공한다.
   - 안정 시간은 촬영 간격 중에도 누적한다. 마지막 촬영 시각과 서버 저장 완료 시각을 분리한다. 흐림·움직임·중복 검사를 약하게 만드는 수정은 하지 않는다. 250ms 재생에서 후속 촬영 대기를 약 3초에서 약 2초로 겹칠 여지가 있으며 이는 구현 후 재확인할 계산값이다.
   - 마치기는 대기열을 비운 뒤 **저장 성공한 evidenceId만** 기존 batch에 넣고 AI를 한 번만 호출한다. 소유자/captureEpoch 고정, 실패/닫기/재시도 동작은 유지한다. 업로드 `Promise.all`만 추가하면 메모리 증가와 서버 직렬 대기, 응답 순서 역전이 생길 수 있다.
   - 6장은 목표가 아니라 상한이다. 전체 판 1장과 필요한 확대 사진을 확보했으면 마칠 수 있게 안내한다. 현재도 6장을 꼭 채울 필요가 없다.

2. **현재 요청의 단계 시간을 수집하고, 확인 가능한 단계만 표시한다.**
   - 적용: `src/Capture.tsx`, `src/api.ts`, `src/SessionWorkspace.tsx`, `server/index.ts`, `server/ai/index.ts`, `server/store.ts`, `src/App.tsx`/`SceneEditor.tsx`.
   - 아래 계측안을 작은 수정에 같이 넣는다. `사진 2/3 보내는 중` → `사진 속 판을 읽는 중` → 결과 도착 뒤 `그림을 보여주는 중`처럼 실제 완료 이벤트에 맞춘다. AI 대기 전체에 `저장 중`을 표시하거나 임의의 퍼센트·예상 완료 시간을 만들지 않는다.
   - 서버의 중간 단계 이벤트가 아직 없으면 업로드 후에는 `사진을 읽고 있어요` 하나로 유지한다. 정규화/저장을 하고 있다고 타이머만으로 주장하지 않는다. 단계 표시는 답답함을 줄이지만 그 자체가 총 처리 시간을 줄이지는 않는다.

3. **같은 인식 모델에서 출력량·추론 옵션을 먼저 조정한다.**
   - 적용: `server/ai/prompt.ts`, `server/ai/scenePrompt.ts`, `server/ai/index.ts` 및 해당 옵션 계약. 현재 설정 모델은 이번 조사에서 확인하지 않았다.
   - 1차 변경은 `summary`/`reason`/`note`의 반복 설명을 줄이고, 사진에서 읽을 필드의 이름·형식·식별 조건만 전달하는 것. 장면의 슬롯·소유자·모름·수량·원본 영역·증거 연결과 한 장면으로 합치는 지침은 유지한다. 출력 부품 수 자체를 잘라 속도를 높이면 안 된다.
   - 다음으로 이전 장면 전체의 좌표/긴 설명을 매번 반복하는 문맥을 줄인다. 필요한 플레이어·확정 상태와 원본을 구분하는 지침은 남긴다. 새 사진이 보여주는 사실을 이전 판에서 복사하게 만들지 않는다.
   - Gemini 4/3 계열을 **실제로 사용 중이며 지원되는 경우에만** `generationConfig.thinkingConfig.thinkingLevel: "low"`를 현재 설정과 비교한다. 2.5 계열은 `thinkingBudget` 계약이 다르다. 장면 대응·가려진 부품·여러 시점 합치기 정확도가 떨어지면 채택하지 않는다. 작은 출력 토큰 상한은 JSON을 중간에 끊을 수 있으므로 속도 조절의 첫 수단으로 쓰지 않는다. [Gemini generateContent thinking 문서](https://ai.google.dev/gemini-api/docs/generate-content/thinking)
   - 출력 생성을 줄이는 것이 유력한 지연 개선 수단이지만 프롬프트를 줄인 만큼 시간이 비례해서 줄지는 않는다. 이 앱의 개선율은 별도 측정 전에는 약속하지 않는다. [OpenAI latency optimization](https://developers.openai.com/api/docs/guides/latency-optimization)

4. **크기 측정에 따라 사진 전송량을 줄인다. 원본 보존과 분석용 이미지를 구분한다.**
   - 적용: `src/api.ts:readPhoto`, `src/Capture.tsx:takePhoto`, `server/store.ts`, `server/ai/index.ts:readImage/requestJSON`.
   - `canvas.toDataURL`의 동기 인코딩을 `toBlob` 기반으로 바꿀지 모바일 long task를 보고 결정한다. 원본 바이트 업로드 경로를 마련하면 첫 구간의 Base64 약 33% 팽창을 줄일 수 있다. Blob을 다시 Base64로 바꾸어 같은 JSON으로 보내면 전송량 감소는 없다.
   - 분석용 JPEG의 후보(예: 긴 변 2048/2560, 품질 .85/.90)를 기존 원본과 비교한다. 이 수치는 검증되지 않은 실험 시작점이지 확정 품질 기준이 아니다. 원본은 그대로 보존하고 영역 좌표의 종횡비/원본 대응을 유지한다. 전체 판의 작은 숫자·색·도로·항구는 저해상도에서 먼저 손실될 수 있으므로 필요한 확대 시점은 보존한다.
   - 서버에서 분석용 이미지만 줄이면 **휴대폰 → 서버 원본 업로드**는 빨라지지 않는다. 원본 업로드를 기다리지 않고 분석을 시작하려면 저장 완료 의미/재시도/원본 보존 계약 변경이 추가로 필요하므로 첫 수정으로 섞지 않는다.
   - Gemini inline 입력은 프롬프트 포함 총 요청 20MB 한도가 문서화돼 있다. 합성 큰 사진 6장의 본문은 약 29.5MB였다. Express의 80MB 제한이 provider 수용 한도를 뜻하지 않는다. 실제 요청 바이트를 재서 분석용 이미지 크기를 조절하고, 큰 파일/반복 사용일 때만 Files API를 검토한다. Files API도 최초 업로드 왕복이 필요하므로 항상 빨라지는 해결책은 아니다. [Gemini 이미지 입력](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding)
   - Gemini의 `generation_config.media_resolution`은 모델의 이미지 처리량을 조절하며 지원 범위는 모델별로 다르다. OpenAI `detail` 역시 모델별 전처리가 다르므로 `high → low`를 일괄 적용하지 않는다. 특히 최신 문서는 `low`가 항상 적은 토큰이라는 뜻은 아니라고 설명한다. JPEG 압축 바이트 감소와 모델 이미지 토큰 감소는 별개다. [Gemini media resolution](https://ai.google.dev/gemini-api/docs/generate-content/media-resolution), [OpenAI images and vision](https://developers.openai.com/api/docs/guides/images-vision)

5. **관측된 경우에만 세션 응답·잠금·사진 표시를 가볍게 한다.**
   - 적용: `server/index.ts:change/evidence/analyze`, `server/store.ts`, `src/api.ts`, `src/App.tsx`, `src/SceneEditor.tsx`.
   - 매 업로드에 팩/과거 스냅샷/질문을 모두 돌려주는 대신 저장된 사진 메타데이터만 반환하고 마지막에 한 번 뷰를 갱신하는 계약을 검토한다. 기존 호출자와 저장 데이터를 유지하며 순서가 뒤바뀐 응답이 새 상태를 덮지 않게 해야 한다.
   - 실제 같은 세션 동시 수정 대기가 크면 AI 작업은 읽기용 snapshot에서 실행하고 결과 반영만 짧게 직렬 처리한다. 그동안 captureEpoch가 바뀌거나 사용자가 고친 값이 있으면 기존 값 보존 정책을 다시 적용해야 한다. 현재 단일 클라이언트의 주 병목으로 입증된 내용은 아니므로 뒤 순서다.
   - 원본 사진 탭에는 작은 썸네일을 사용하고 전체 크기는 열 때 읽도록 한다. 그림 자체는 원본 다운로드 완료에 묶지 않는다. React render/이미지 decode 계측 후 필요 범위만 적용한다.

**현재 배포에서 스트리밍을 우선안으로 삼지 않는 이유**

Quick Tunnel은 SSE를 지원하지 않는다. provider 스트리밍을 Mac 서버까지만 받아 첫 응답/완료 시점을 재는 것과, 브라우저까지 SSE를 전달하는 것은 다르다. 현재 코드는 전체 JSON이 있어야 장면을 정규화하므로 일부 토큰이 일찍 와도 완성된 그림을 바로 보여줄 수 없다. 장기 작업 표시가 필요하면 기존 서버의 작업 상태를 짧게 조회하는 별도 계약을 검토할 수 있으나, 관측 없이 새 서비스/전면 구조 변경부터 할 이유는 없다. [Cloudflare Quick Tunnel 제한](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)

Vercel 외부 rewrite의 응답 대기 제한은 120초다. adapter의 `AbortSignal.timeout(120_000)`도 provider fetch 시작부터 120초여서 대기열·파일 준비·저장까지 포함하는 전체 요청 제한보다 안쪽 제한이 먼저 끝난다고 보장되지 않는다. 긴 요청은 느림 끝에 proxy 오류가 될 수 있다. 제한을 늘리는 것은 속도 개선이 아니며, 실패가 확인되면 전체 제한 안에서 안내하거나 재조회 가능한 작업 계약을 다룬다. Vercel Function의 메모리/실행 제한을 이 외부 rewrite에 그대로 적용해 진단하지 않는다. [Vercel proxied request timeout](https://vercel.com/docs/limits#proxied-request-timeout), [외부 rewrite](https://vercel.com/docs/routing/rewrites)

**가장 작은 확인 실험과 계측 계약**

개인 로그 본문을 읽을 필요는 없다. 무작위 `scanRunId`로 한 스캔의 시간·장수·바이트·크기만 묶는다. 사진/이름/세션 본문/프롬프트/AI 응답 내용/키는 기록하지 않는다. provider/model 식별자와 옵션, 수치 usage, 실패 유형만 추가한다. 클라이언트와 서버 시각을 직접 빼지 말고 각자의 monotonic duration을 수집한다.

| 측정 위치 | 필요한 경계 |
|---|---|
| `Capture`/`readPhoto` | 카메라 준비, 품질 검사 누적 CPU, 각 reject 이유별 대기, 촬영 시각, 인코딩/파일 읽기·decode 완료, 사진별 픽셀/바이트 |
| `api.request` | 요청 JSON 직렬화, fetch 시작, 응답 headers, body 수신/JSON 파싱 완료. 브라우저 upload 완료를 따로 측정하지 않았다면 이 전체를 순수 업로드 시간이라 이름 붙이지 않음 |
| Express (`express.json` 앞/뒤) | 요청 시작, 본문 수신·파싱 완료, `change` 대기열 진입/획득, 세션 읽기, 이미지 쓰기 |
| AI adapter | 파일 읽기/Base64/프롬프트·요청 직렬화, provider fetch 시작, headers 수신, 응답 body 완료, JSON/장면 정규화·합치기. 비스트리밍 headers 시간은 모델 첫 토큰 시간과 같다고 보장하지 않음 |
| 저장/응답 | 재계산, 세션 쓰기, JSON 직렬화, HTTP finish. `finish`는 클라이언트 수신/paint 완료가 아님 |
| React | 응답 적용, 장면 commit, 다음 paint 기회 및 표시 이미지 load/decode. `requestAnimationFrame` 한 번은 실제 픽셀 표시 완료의 엄밀한 증명이 아님 |

서버 내부 소요를 `Server-Timing` 또는 개발용 수치 결과로 반환하면 클라이언트 전체 대기와 비교할 수 있다. 차이는 클라이언트·전송·proxy·응답 처리의 합이며, 곧바로 특정 tunnel 지연이라고 단정하지 않는다. 숫자만 기록하는 관측은 새 저장/완료 필수 조건으로 만들지 않는다.

최소 실행 순서:

1. **무료·로컬:** 위 가짜 AI로 1/6장, 0/1초 fake delay 및 실패 1회를 재생한다. 수정 전후 촬영·업로드 겹침, 최대 6장, 실패 예산 반환, 마치기 중 대기열 drain, 성공 ID만 1회 분석을 확인한다. 실제 카메라 없이도 가능한 회귀 범위다.
2. **현재 배포의 다음 정상 스캔:** 기존 사용 흐름에 수치 계측만 붙여 1장 또는 필요한 소수 사진에서 client 총대기/서버 대기/provider 전체대기/화면 적용을 비교한다. 이번 연구에서는 이 실요청을 실행하지 않았다. 실계정 원본 로그는 불필요하다.
3. **별도 승인된 실제 AI 비교가 가능할 때:** 기존 공개 연구 사진 01 전체 판과 08 카드 목록을 서로 다른 스캔으로 사용한다. 현재 설정 기준과 한 가지 변경(짧은 출력 또는 지원되는 낮은 thinking 또는 이미지 파생본)만 비교한다. 숫자·도로/건물 색·부품 수·위치·원본 영역이 유지되는지 먼저 본다. 서로 다른 판을 한 묶음으로 합치지 않는다. 한 번의 빠른 응답으로 개선율을 확정하지 않는다.

UNCLEAR로 남은 것은 현재 배포 revision/인식 모델 옵션, 사용자 사진 크기·장수, 휴대폰 인코딩, 실제 업로드 회선, provider의 추론/출력 토큰·대기, 앱 render/원본 decode 시간이다. 따라서 현재 사용자의 “총 몇 초 중 어디가 몇 초”인지는 아직 말할 수 없다. **촬영 대기를 겹치는 수정은 코드와 재생으로 근거가 있고, AI 옵션·전송량 조정의 효과는 수치 계측과 동일 사진 비교로 확인할 사항**이다.

재현 식별용 SHA-256 앞 12자리: `Capture.tsx 9dfd997fb926`, `scanQuality.ts 141fac81c760`, `SessionWorkspace.tsx 2e2a46987bc63`, `server/index.ts b01e7429e1f5`, `server/ai/index.ts 3d8388411ccc`, `prompt.ts 8e6c1a988f02`, `vercel.json 6334cf9c938a`. 병행 구현으로 줄 번호가 달라지면 함수명을 기준으로 적용한다.


## 구현 인계 · 2026-10-21

**VERIFIED:** 원본 확보와 전송을 분리했다. `scanUploads`는 네트워크 한 건씩 처리하지만 `enqueue`는 전송을 기다리지 않는다. 로컬 원본/예약 지문은 최대6장, 대기 data URL의 UTF-16 문자열 추정치는 96MiB로 제한하며 성공한 본문은 즉시 해제한다. 캔버스·브라우저 내부 fetch 복사본까지 포함한 전체 프로세스 메모리 상한을 주장하지 않는다. 카메라 원본 해상도/JPEG .94와 품질·중복 임계값은 유지했다. 안정 대기는 1.8초 촬영 간격 중에도 누적된다. 갤러리도 다음 파일 준비와 전송을 겹치며, 용량이 찰 때만 대기한다.

실패 원본은 열린 화면에 남겨 재전송하거나 명시적으로 제외한다. 실패를 조용히 완료 처리하지 않는다. 마치기는 대기열 drain 뒤 이번 성공 ID만 기존 `finishScanBatch`로 한 번 분석한다. owner/epoch·AI실패 같은ID 재분석 계약은 유지한다. 정상 화면 이동은 전송 완료/실패 처리를 기다리게 하며, 강제 이탈에는 브라우저 안내를 요청한다. 강제 탭/OS 종료 뒤 미전송 메모리 원본 복구는 미지원이다. 이미 전송된 원본은 서버에 남는다. 요청 성공 응답 자체가 유실된 경우 재전송의 서버 저장 중복을 제거하는 영속 idempotency는 이번 범위에 넣지 않았다.

**VERIFIED — 합성 시계:** `tests/scan-upload-queue.test.ts`에서 250ms 간격의 서로 다른 안정 장면, 장당2초의 직렬 업로드를 재생했다. 촬영은 1/3/5/7/9/11초, 마지막 성공은13초다. 기존 계약의 계산(장당 업로드2초+다음 선별3초)은28초였다. 이는 고정된 합성 조건의 흐름 비교이며 실기기·회선·실AI 개선율이 아니다. 추가 회귀는 예약 중복/6장 상한, 안정·간격 중첩, 원본 재시도/메모리 해제, drain/중단/명시 제외, 한 번 분석청구를 확인한다.

실제 진행은 촬영/사진 전송 N/M/사진 판독으로 표시한다. 임의 퍼센트나 예상 시간을 만들지 않았다. `scanTiming`은 원본 확보·갤러리 읽기·사진 업로드·분석 API 왕복의 ms/사진수/크기 추정만 최대30건 메모리와 마지막 단계별 Performance Measure에 보관한다. 서버는 `Server-Timing`으로 queue/load/mutate/recompute/save 및 images/provider/normalize의 ms만 반환한다. provider는 준비된 요청의 직렬화·네트워크·응답JSON/파싱을 포함하는 adapter 왕복이며 **순수 모델 추론 시간은 아니다**. mutate는 내부 AI 구간을 포함하므로 숫자들을 모두 더하면 안 된다. 사진·이름·세션ID·키·프롬프트를 진단에 넣지 않는다.

모델·추론 옵션·이미지 축소·출력 프롬프트 단축은 실물/실AI 품질 비교 없이 바꾸지 않았다. 기존 장면조립/즉시추가/색칩/3열 묶음 소스도 수정하지 않았다. 실제 카메라·외부 AI·배포 호출은 실행하지 않았다. 서버 재시작·배포는 감독 담당이다.

변경 파일: `src/Capture.tsx`, `src/scanQuality.ts`, `src/scanUploads.ts`, `src/scanTiming.ts`, `src/SessionWorkspace.tsx`, `src/api.ts`, `server/index.ts`, `server/ai/index.ts`, `tests/scan-upload-queue.test.ts`, `tests/scan-api.test.ts`, `docs/scan-implementation.md`, 이 문서. `dist/` 빌드 산출물 갱신.

최종 실행 근거: `npm run typecheck` exit **0**, `npm test` exit **0** (**121/121**), `npm run build` exit **0**. 파이프 없이 실행했으며 실제 AI/카메라를 사용한 검증은 아니다. 제품 파일 소유권을 감독에게 반환한다.
