# 상세 근거

라벨: **VERIFIED**는 코드/파일/계산으로 직접 확인한 것, **REPORTED**는 기존 기록에 적혀 있지만 재확인하지 않은 것, **UNCLEAR**는 근거가 부족한 것, **RECOMMENDATION**은 제안이다.

## 1. 종단 흐름과 구간별 병목

| 구간 | 현재 동작 (코드) | 측정/근거 | 판단 |
|---|---|---|---|
| 촬영 | `getUserMedia({width:{ideal:1920}})` 영상 프레임을 canvas JPEG .94로 저장(`src/Capture.tsx:100-104`, `:132`). 센서 정지사진이 아니다. 자동 선별은 250ms마다 192px 샘플로 하고, 1초 안정 + 1.8초 간격이 필요하다(`src/scanQuality.ts:3-8`). | 결정적 재생에서 6장에 16초(REPORTED `docs/scan-latency-diagnosis.md`). 공개 영상 재생: Risk 첫 5초 0/20(motion 19건), 체스 2장, 뒤 프레임은 duplicate(VERIFIED `selector-replay.json`). | 손으로 들고 이동하면 motion>5.5에 계속 막힌다. 장수가 늘수록 촬영 시간이 판독 시간과 비슷해진다. 영역당 1장 + 수동 셔터 기본이 가장 빠르다. |
| 판독 시작 | "마치기" 후 등록하고 나서야 분석이 시작된다(`src/SessionWorkspace.tsx:231-237`). | VERIFIED | 업로드된 사진부터 판독을 시작하면 촬영 시간과 판독 시간이 겹친다. 효과는 촬영 길이만큼이다(부차). |
| 전송 픽셀 | 서버 리사이즈가 없다. 원 바이트를 `detail:'high'`로 보낸다(`server/ai/terraGameReader.ts:27`). | 입력 토큰이 `ceil(w/32)·ceil(h/32)·1.2 + 약 1,000(문장)`과 정확히 일치한다. 사그라다 whole−crop 차이 741 = (768−150)·1.2, 카르카손 306 = 255·1.2, 티켓 644 = 537·1.2. 공식 patch 공식과 1.2 배수와 같다(VERIFIED 계산, [OpenAI images-vision](https://developers.openai.com/api/docs/guides/images-vision)). | 평가 사진은 1024px 웹 이미지라 480–768 patch에 그쳤다. 제품 1920×1080 프레임은 2,040 patch로 `high` 상한(동계열 gpt-5.6-terra 기준 2,500 patch·2048px, terra-6.1 상한은 UNCLEAR) 안에 든다. 즉 제품 입력은 평가 입력보다 픽셀이 약 3–4배 많다. 같은 원본 crop은 업스케일하지 않으면 patch가 오히려 줄어 새 정보가 없다. 기존 crop 결과(C)가 좋아지지 않은 이유와 맞는다. |
| 모델 시간 | 사진당 1회 non-stream 호출, reasoning low, strict JSON. | **38건 회귀: wall = 2.57초 + 11.21ms × 출력토큰, r=0.998, 62–89 tok/s.** 출력 토큰 하나로 분산의 99.6%를 설명하므로 입력 토큰(929–3,394)이 더 설명할 여지는 작다(VERIFIED `latency-tokens.json`; 다변량 회귀는 하지 않음). | 시간 = 출력 토큰. 공식 가이드와 같다: 출력 50% 절감 ≈ 지연 50% 절감, 입력 50% 절감은 1–5%([latency guide](https://developers.openai.com/api/docs/guides/latency-optimization)). |
| 출력 내용 | 물체마다 kind, 이름 붙은 box 객체, face, quantity, physicalUnit, 그리고 속성마다 `{id,valueJson,unknownReason}` 행. 보이지 않는 속성도 행을 강제한다(`TERRA_FILL_SENTENCE`, `terraGameReader.ts:10`, `:30`). | 현재 물체당 83–126토큰(중앙 87). low에서 reasoning은 출력의 0.5–15%(TTR 26/5,323)(VERIFIED). | low 지연의 대부분은 직렬화다. |
| 디코드/결합 | 전체 JSON 후 검증 → assemble → fusion. 결합 CPU 6–15ms(REPORTED crop-high). | 무시할 수준이다. | 병목 아님 |
| 표시 | hosted 1초 폴링과 단위별 부분 진행(`src/jobStatusPolling.ts:28`). | VERIFIED | 단위 내부 증분은 없다. 스트리밍이 필요하다. |

## 2. 와이어 재직렬화 (같은 정보, 다른 표현)

저장된 9개 응답(카르카손/사그라다/티켓 × whole-low A, whole-high B, crop-low C)을 o200k_base로 셌다. 프록시 토큰 수와 provider가 보고한 비-reasoning 출력의 비율은 **0.990–0.999**여서 프록시를 그대로 써도 된다.

| 표현 | 물체당 토큰(중앙) | 가시 출력 감소(중앙) | strict schema 적합 |
|---|---:|---:|---|
| 현재 | 86.7 | – | 현재 |
| null 행만 제거(sparse) | 81.9 | 4.4% (카르카손 B만 44%) | 강제 문장 제거 필요 |
| 짧은 키 + 값 맵 + 사유코드 맵 | 42.6 | 50.8% | 종류별 객체가 필요하다. Gemini에서는 종류별 대안이 거부된 기록이 있다(`geminiGameReader.ts:24`). Terra는 UNCLEAR |
| **고정 item + 종류별 위치 값 배열 `v` (권고)** | **35.3** | **59.9%** | 가능성이 높다. 고정 키 객체 + `anyOf` 스칼라 배열. 실제 endpoint 수락은 UNCLEAR |
| 종류별 열 헤더 + 행 배열 | 21.6 | 75.2% | 행이 혼합 타입 배열이다. strict 지원은 UNCLEAR |

reasoning을 그대로 둔다고 가정하고 측정 직선에 대입한 추정 wall(초)은 다음과 같다.

| 케이스 | 실측 | tuple 행 | 열 형식 |
|---|---:|---:|---:|
| 카르카손 A low (19개) | 24.0 | 11.2 | 8.6 |
| 사그라다 A low (24개) | 32.9 | 14.4 | 10.6 |
| 티켓 A low (64개) | 70.7 | 28.0 | 17.6 |
| 카르카손 B high (71개) | 174.4 | 110.1 | 99.3 |
| 사그라다 B high (45개) | 79.1 | 46.4 | 39.5 |
| 티켓 B high (67개) | 82.2 | 46.1 | 35.3 |

이 표는 **직렬화 비용만** 보여준다. 와이어를 바꾸면 reasoning, 열거 수, 정확도가 달라질 수 있다. 기존 `raw-audit.json`은 null 행 제거 바이트만 계산했고 토큰과 시간으로 환산하지 않았다. 위치 배열 표현과 시간 회귀는 이번에 처음 계산했다.

## 3. 품질: low가 무엇을 놓치나

VERIFIED `raw-audit.json`과 `crop-high/README.md`.

- 카르카손: A low는 tiles 2개(group 1) + followers 17, B high는 tiles 53 + followers 18, C crop-low는 tiles 0. 부분 참조 16개 중 놓친 6개는 모두 타일이다.
- 사그라다: A는 주사위 24개(group 1), B는 43개(먼 창문판까지). 하지만 참조 숫자 20개 중 정답은 A 19 / B 17이다. low가 값을 더 못 읽는 것은 아니다.
- 티켓: A 63량, B 66량으로 거의 같다.

해석:

- low의 실패는 "작은 값 오독"보다 **"많고 비슷한 물체(타일·먼 영역)를 묶거나 생략"**하는 형태다.
- 그런 물체일수록 비어 있는 속성 행이 많다. 카르카손 B는 354행 중 241행이 unknown이다. 현재 와이어에서는 물체 하나를 쓸 때마다 null 행 비용을 같이 치른다.
- 그래서 물체당 출력 비용이 열거를 억제한다는 가설이 나오지만, **검증되지 않았다**.
- 참조는 선택 ROI의 AI 부분 참조다. B가 찾은 ROI 밖 물체는 채점되지 않았다. 전수 정답 기준이 아니다.

## 4. 대안 비교 (독립 판단)

| 접근 | 정보량 | 지연 | 비용 | 구현 부담 | 판단 |
|---|---|---|---|---|---|
| **와이어 압축 + 스트리밍 (권고)** | 같음 | low 추정 −55~60%, 첫 행 ~3초 | 출력 비용도 같은 비율로 감소 | reader 1개 + decoder 변환. fusion/receipt는 기존 형식으로 정규화해 재사용 | 실측 법칙에 기반. 품질은 1회 검증으로 판정 |
| whole-high 기본 | 열거 개선 | reasoning 바닥 18–79초 + 출력 | 약 3배 | 설정만 | 너무 느림. 압축과 함께 "필요한 사진만" 옵션 |
| 같은 원본 crop 병렬 (기존) | 증가 없음(patch 감소) | 출력이 나뉘어 wall 감소 | 입력 중복 | 이미 있음 | 1920 프레임에서는 픽셀 이득 없음. 사그라다 C 숫자 퇴행 기록 |
| 실제 다각도 다장 | 가림 해소 가능 | 촬영 시간 + 장당 판독 | 장수에 비례 | 사진 간 대응이 없음(링크는 같은 SHA 안에서만) | 대응/중복 문제가 풀리지 않음. 영역 분할 촬영으로 대체 |
| 센서 정지사진 + `detail:original` | 작은 글자 픽셀 2–4배 | 입력 토큰 증가는 지연에 미미(가이드) | 12MP 약 14k 입력토큰 ≈ $0.014 | iOS 영상 경로로는 불가(ImageCapture 미지원). 업로드 경로는 이미 원본 허용 | 값 오독이 주 문제로 확인될 때의 2순위. 지금 주 실패는 열거 |
| 전용 검출기(open-vocab) + VLM 판독 | 위치 우수 가능 | 2단 직렬 | 서버/모델 운영 | 게임별 적응, 큰 플랫폼 | 범위 밖. 요구 확대 |
| reasoning none/minimal | 같음 | low에서 reasoning이 이미 0.5–15%라 이득 작음 | – | 설정 | 효과 작음 |
| priority service tier | 같음 | tok/s 증가 가능 | 더 비쌈 | 설정 | Terra 실측 없음(UNCLEAR) |

## 5. 권고 구현 범위 (RECOMMENDATION, 제품 수정 아님)

1. 새 Terra adapter profile(현재 `literal-named-fill-unit-original-v2`와 병존)을 만든다.
   - prompt에 종류별 속성 순서를 적는다.
   - item = `{k, b:[ymin,xmin,ymax,xmax]|null, f:'f'|'b'|'u', q:int|null, u:'s'|'g'|'u', v:[scalar|null|"~code"…]}`.
   - 강제 fill 문장은 제거한다.
   - decoder는 이를 기존 `{kind,box_1000,face,quantity,attributes,physicalUnit}`로 펼쳐 `decodeLiteralObservationPayload`에 넘긴다. 원문 보존·receipt·fusion은 그대로다.
2. `invoke`를 `stream:true`로 바꾼다. `response.output_text.delta`를 누적하다가 `]`로 끝나는 완결 item마다 진행 이벤트로 내보낸다. 최종 completed 응답이 오면 현재와 같은 전체 검증을 한다.
3. 촬영 UI는 영역별 "이 영역 1장" 안내 + 수동 셔터를 기본으로 한다(자동 선별 유지).
4. (부차) 업로드 완료 즉시 해당 unit 판독을 시작한다.

## 6. 남은 미지수

- 압축 와이어에서 Terra의 실제 토큰·reasoning·열거 수·정확도(유료 검증 필요).
- terra-6.1의 `high` patch 상한(문서 표에 없음).
- 실제 휴대폰 촬영→첫 행·최종까지의 시간(측정 기록 없음).
- 독립 사진에서 같은 물체가 편집 목록에 중복으로 생기는지(`projectGenericFusion` 경로 전수 미검토).
