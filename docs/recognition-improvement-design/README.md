# 사진 판독 개선: 공개 카드 한 영역부터

2026-10-24 · 설계 제안 · 제품/설정 변경 0, 신규 모델 호출 0. **권고는 스플렌더 `market` 한 영역의 사진→Argon 관측→원본 대조·정정→명시 반영→저장/재열기를 한 묶음으로 구현하는 것이다.** 기존 전체 기능을 교체하지 않고 이 경로만 선택적으로 연결한다. 작은 인쇄값 개선의 실험 근거가 있고, Catan의 사진→정식 칸 연결을 함께 해결하지 않아도 끝까지 사용할 수 있어 첫 구현량이 작다. Catan은 바로 다음 단계다.

목표는 **촬영 시작부터 사용자가 필요한 값을 확인하고 저장한 판을 다시 여는 데 걸리는 총시간**이다. Argon 자체는 현재 비교에서 더 느렸다. 잘못 읽은 값을 고치는 시간이 줄어 그 차이를 상쇄하는지는 **UNKNOWN**이며 아래의 작은 비교로 결정한다. ‘확인한 저장’은 시험의 판독 가능한 필드가 맞고 나머지는 모름으로 남은 상태를 뜻한다. 모든 비용·숨은 상태의 완전 복원을 뜻하지 않는다.

**최신 근거와 판단**

| 근거 | 확인 결과 | 설계에 주는 의미 |
|---|---|---|
| [Argon/DeepSeek 동결 비교](../argon-deepseek-comparison/README.md) | Catan Argon 지형 19/19·숫자 18/18, DS 사진 행 대응 17/19·13/18. 엄격 bbox 대응은 별도. Splendor Argon 점수 12/12(중간 신뢰 2 포함), 보너스 11/12, 귀족 점수 3/3; DS 해당 값 모두 null | 강한 인식기를 연결할 근거가 생겼다. 기존 연구의 ‘다른 모델 미시험’ 판단을 갱신한다. 2사진에 대한 평가이며 건물 종류 오독·미대응 개체는 남음 |
| 같은 비교의 지연 | Argon/DS Catan 148.62/85.95초, Splendor 150.39/76.02초 | 단순 모델 전환으로 빠른 응답을 약속할 수 없음. Splendor에서 늘어난 약 74초보다 정정 시간이 더 줄어야 같은 조건의 총시간 이득 |
| 요청·가용성 | 5회 송신=성공 4+Argon Sagrada 429, 다음 DS 미송신, retry 0. 성공 4회 cache-miss peak 환산 $0.3313099(청구액 아님) | 성공했던 계정 접근과 안정적인 서비스 용량은 다름. Sagrada 성능·429 quota 종류·해제 시각 UNKNOWN |
| [기존 A/B](../photo-observation-ab/README.md) | 짧은 순수 관측도 주요 속성 개선이 혼합적. Sagrada는 빨라지며 눈 정답 8→7 | 작은 JSON은 유지보수·출력량 개선 후보이지 정확도 해법으로 확정하지 않음 |
| [이전 원인 연구](../recognition-research-astra/README.md) | 네 요청의 provider 왕복이 gateway 측정시간의 99.981–99.994%, 정규화 1.45–5.77ms | 정규화 미세 최적화보다 읽을 대상·추론/출력·사용자 정정에 집중. 휴대폰 업로드·공급자 내부 큐/첫 토큰·운영 총시간은 미측정 |

현재 연구는 위 평가표를 재채점하지 않았다(REPORTED). 대신 원본/GT/프롬프트 3세트와 비공개 결과 13파일의 저장 SHA, 성공 4건 provider 최종 JSON→raw 동일성을 직접 확인했다(VERIFIED). [근거와 확인 수준](evidence.json). 사진 촬영일은 이번 검사로 확인하지 않았다. 요청은 2026-10-24 02:36–02:44 KST, 소스 동결은 전날 20:47 KST다. 주요 소스 26파일은 `02551424…` 동결본과 현재 공유본 해시가 같다. 이 manifest의 공유 적용/외부 배포 0 기록과 현재 운영 상태를 동일시하지 않는다. 운영은 조회하지 않았으며 **현재 배포판 UNKNOWN**이다.

**첫 구현의 사용자 흐름**

1. 기존 촬영 부분에서 **‘레벨별 공개 카드’** 선택 → 카드 영역이 꽉 차게 사진 1장. 촬영/갤러리/기존 `PhotoDialog`의 영역 사진을 재사용한다. `market`은 필드 범위이지 실제 픽셀 crop이 아니므로 화면 안내만으로 사진이 잘렸다고 처리하지 않는다.
2. 해당 사진 1장·현재 판본·공개 시장의 카드만 요청한다. 12장이라는 정답 수를 강제하지 않는다. 귀족·플레이어 구매 카드·토큰·손패는 이 읽기에 합치지 않는다. 다른 영역은 기존 경로를 유지한다.
3. 서버는 작은 관측 결과를 기존 `market.scene` 후보로 조립한다. 카드 종류·점수·보너스·비용과 사진 bbox만 모델의 일이다. ID·소유 범위·근거 연결·manual null·앱 wrapper는 서버가 만든다. **앱 규칙으로 숫자/비용을 채우지 않는다.**
4. 후보의 실제 카드 부분 사진과 점수/보너스/비용을 한곳에 표시한다. `TargetCrop`·`SplendorFields`·기존 선택/명시 반영을 재사용한다. null부터 찾기 쉽게 하되 모델이 자신 있게 틀린 값도 전부 수정 가능하다. 미확인은 그대로 저장할 수 있다. 원본 확인과 값 편집 사이의 모달 왕복을 줄인다.
5. 사용자가 선택해 반영한 뒤 기존 저장/재열기로 끝낸다. 이미 기록한 시장에는 기존 실물 연결 기능으로 선택 카드만 추가하며, 부분 판독을 시장 전체 교체로 처리하지 않는다. 기다리는 동안 원본을 보거나 다른 기록을 수정할 수 있고, 돌아오면 같은 job을 찾는다. 새 결과가 수동 수정/accepted 값을 덮어쓰지 않는다. 429면 ‘지금 사진을 읽을 수 없어요. 사진은 저장됐어요’와 수동 기록/사용자가 다시 시도할 경로를 제공한다. 자동 재호출·자동 저품질 대체는 하지 않는다.

**모델 이름 교체로 구현할 수 없는 부분**

| 경로 | 실제 코드/실험 계약 | 필요한 좁은 연결 |
|---|---|---|
| 제품 직접 호출 | [`requestJSON`](../../server/ai/index.ts): `generateContent`, 120초, Gemini thinking/resolution/output cap 명시 없음 | 성공 실험과 다른 경로다. 관측된 149–150초와 같은 지연이면 120초 경계 밖이다. 새 Argon pilot은 이 경로로 보내지 않는다 |
| 제품 gateway/hosted | [`requestBody/finalJSON/usageNumbers/hostedJSON`](../../gateway/server.mjs): Gemini는 generateContent/candidates; hosted는 DeepSeek/high/180초 고정. Gemini effort 설정도 현재 불허 | protocol을 `gemini-interactions`로 명시한 별도 어댑터를 추가하고 local/hosted가 같은 순수 serializer/decoder를 사용. legacy 동작 유지, 묵시적 fallback 금지 |
| 성공한 실험 | `/v1beta/interactions`; image resolution high; thinking high, summaries none, output 32768; standard/store false/background false/stream false. 완료 `steps[type=model_output].content[type=text]` | 같은 계약을 먼저 fixture로 고정. JSON Schema 추가는 이후 관측 과제 변경으로 기록. Interactions는 `generateContent`와 응답/usage 구조가 다름 |
| 제한/완료 처리 | 실험 timeout 300초. 제품 local gateway client 245초/server 250초, cloud 함수 설정 300초. 현재 cloud workflow는 유료 step retry 0·batch claim 존재 | pilot 제안 upstream **220초** < local client245/server250 < cloud300초. 전부 timeout을 300초로 올리지 않는다. 220초는 제안한 한계이지 p95 보장값이 아님. 완료/유효 JSON만 후보화 |

공식 문서는 Interactions와 기존 generateContent의 공존, schema 출력, Argon 이미지 입력을 확인해 준다. 실험 어댑터를 제품 계약으로 옮길 근거이며 시각 정확도 보증은 아니다. [Interactions](https://ai.google.dev/gemini-api/docs/interactions-overview), [API 필드](https://ai.google.dev/api/interactions-api), [구조화 출력](https://ai.google.dev/gemini-api/docs/structured-output), [Argon](https://ai.google.dev/gemini-api/docs/models/gemini-4-argon).

**정확도·대기·개발시간을 따로 개선한다**

- **정확도:** 근거가 생긴 Argon + 현재 게임/선택 영역 + 원본 옆 수정. 새 시장 전용 요청의 일반화는 아직 미측정이다. 더 큰 이미지·고해상도 옵션도 이미 사라진 글자를 복원하지 않는다.
- **실제 응답시간:** 불필요한 주변 61장 카드까지 출력했던 Splendor 실험과 달리 선택 시장만 반환하도록 한다. 대상 수·출력 metadata 축소가 후보지만 효과 UNKNOWN. Argon 두 성공의 생각 토큰 9,648/9,431, 최종 텍스트 3,905/5,412였다. high를 우선 재현하고, output cap 32,768을 유지한다. medium/low와 작은 cap을 동시에 바꾸지 않는다. 공식 cap은 생각+최종 출력을 합하므로 작은 cap은 완료 JSON을 잃을 수 있다. [출력 예산](https://ai.google.dev/gemini-api/docs/latest-model).
- **체감 대기:** 기존 background job/재접속을 재사용한다. 현재 진행 단계와 경과 시간만 표시한다. 스트리밍 조각/추론문을 게임 상태로 반영하거나 가짜 완료율을 표시하지 않는다. 첫 묶음에 provider 원격 background·새 queue·부분 commit은 필요 없다.
- **정정/총시간:** 첫 화면에 실제 카드 crop과 편집값을 같이 둔다. 빠른 null 정정뿐 아니라 잘못 채워진 값·누락·허위 개체 추가/삭제도 측정한다. 같은 사진의 재열기는 기존 job/후보를 재사용하고 자동으로 재읽지 않는다.
- **개발시간:** 기존 typed 상태/후보/연결/저장과 검증 함수를 사용한다. 새 DSL·120게임 팩 재작성·새 SDK/벡터DB 없이 관측 어댑터 1개와 UI 경로 1개부터 완성한다. ECC가 모델 추론을 빠르게 한다고 주장하지 않는다.

Argon usage는 이번 응답에서 `total_output_tokens`가 생각을 제외하므로 `total_thought_tokens`를 더해 비용을 계산해야 했다. DeepSeek `output_tokens`에는 이미 생각이 포함된다. 둘을 같은 덧셈으로 처리하지 않는다. 현재 gateway 진단이 앱 반환 경계에서 사라지는 부분을 좁게 연결해 queue/provider/normalize/후보/사용자 정정/저장 시간을 따로 남긴다. 원문·사진·키를 timing 기록에 넣지 않는다.

**대안과 후속 순서**

| 선택 | 품질/지연·비용 판단 | 구현량/채택 범위 |
|---|---|---|
| **A. Argon 시장 1회 + 빠른 대조·저장 (권고)** | 기존 2사진의 핵심 값 개선, 약150초·429 확인. 총시간 이득 미확인. 비용은 더 높지만 품질을 우선 | 중간, 프로토콜 어댑터와 시장 mapper/UI만. 아래 수용 사례 후 제한 활성화 |
| B. 현재 DeepSeek 유지 + 같은 시장 대조 UI | 모델 연결 변경 없이 바로 정정 동선 개선 가능. 실제 raw의 null/오독은 그대로; 모델 대기 약76–86초였음 | 작음. Argon 연결/용량 미확인 시 UI부터 제공할 현실적 대안. 자동 cascade는 하지 않음 |
| C. 한 평면의 로컬 배치 보조 + 현재 인식기 | 추가 모델 호출 없이 배치 정정 감소 가능. 인쇄값 정확도는 별개이며 실측 없음 | 중간. A 이후 Catan `CATAN_TOPOLOGY/snapToSlot` 재사용. 사용자 기준점/방향 확인 후 배치 후보만 생성 |

C의 사진 bbox는 사진 좌표다. 확인한 판 평면·방향 없이 hex/edge/vertex나 Sagrada cell로 바꾸지 않는다. 충돌/가림/영역 밖은 미배치로 남긴다. Catan 도로·건물은 높이/겹침 때문에 중심만으로 슬롯을 확정할 수 없으며 별도 확인한다. Sagrada cell의 현재 manual 계약도 숫자 오독과 다르게 취급한다. 첫 시장 묶음은 `placement`를 만들어내지 않고 원본과 후보를 보존한다.

기존 `AnalysisJobs/CloudJobs`는 활성 요청 중복 억제와 batch 재사용을 이미 한다. 새 plan에는 source/edition·사진 SHA와 순서·owner/epoch/area·모델/프로토콜·prompt/schema/전처리 버전을 묶어, 같은 alias가 다른 구현을 가리킬 때 과거 작업을 새 조건의 결과로 오인하지 않게 한다. 범용 영구 캐시/유사 이미지 캐시는 만들지 않는다. 종료 작업은 같은 ID 재조회만 재사용하고, 명시 재읽기는 새 작업이다. confidence 기반 저가→고가 cascade는 두 응답 대기를 더하며 이번 자료로 신뢰도 임계점을 정할 수도 없다.

RAG는 이미 선택 게임의 팩을 가져오는 경로가 있으므로 추가 규칙 검색부터 시작하지 않는다. 시각 카드 검색은 판본·허용 참조 그림·유사 카드 혼동 검증이 갖춰졌을 때만 보조 후보가 될 수 있다. 미세조정/전용 OCR은 반복 오류와 합법적 학습/holdout 자료가 더 쌓인 뒤 검토한다. 첫 구현의 의존성이 아니다.

**실행/판정**

[구현 카드](implementation-cards.md)에 기존 두 구현솔의 파일 소유권, offline 수용 예, **실행하지 않은 최대4회/$0.90 holdout 카드**를 고정했다. 새 두 물리 판의 시장 사진에서 `현재 DS+현재 UI`와 `Argon 시장+대조 UI`를 비교한다. 속성/개체/bbox/배치/정정 동작/총시간은 분리하고, 총시간은 동일 정답 상태에 도달한 경우만 비교한다. 튜닝에 쓰인 사진 crop을 holdout이라 부르지 않는다. 이 작은 확인에서 좋아져도 전120게임 정확도나 운영 p95를 인증하지 않는다.

ECC 적용은 기존 구현솔2의 backend 한 묶음 → 구현솔의 UI 한 묶음 → 집중 회귀/독립 결과 확인이다. `search-first`의 기존 기능 탐색, `eval-harness`의 사전 분모, `cost-aware-llm-pipeline`의 비용/재사용 기록, `architecture-decision-records`의 대안/결정 근거만 사용했다. 새 thread·기본 retry3·일괄90% 기준·최저가 우선·별도 평가 인프라는 도입하지 않는다. 사용자 권한과 프로젝트 소유권이 우선한다.

남은 **UNKNOWN**: 현재 배포 경로/실계정 quota, Argon 시장 전용 과제의 새 사진 성능, 비용 전체 GT, Sagrada Argon 품질, 사용자 실제 정정시간, cloud의 실요청 지연·tail, 120게임 실물 정확도. [검증 범위/해시/공식 근거](evidence.json).
