# KeepBoard 이미지 전용 API 선택

확인일 **2026-10-26**. 공식 웹 문서와 기존 연구만 읽었다. 가입·인증 시험·사진 전송·추론·학습·설치·설정 변경은 **0**이다. **VERIFIED**는 공식 문서에 현재 제공·계약이 명시된 범위, **INFERRED**는 KeepBoard 적합성 판단, **UNKNOWN**은 인증/실사진/청구로 확인하지 못한 범위다.

## 결정

**첫 검증·연결 후보는 Roboflow Serverless의 YOLO-World `v2-l`이다.** 자연어 클래스 이름으로 기물 후보의 위치를 찾으며 추가 학습·실물 참조셋·전용 GPU 운영 없이 호출할 수 있다. 이미 Roboflow 키가 있다는 인계 조건도 고려했다. 이는 실사진 정확도 우승 판정이 아니라 **현재 준비 부담이 가장 작은, 과제에 맞는 이미지 검출 API 선택**이다. v2-l은 비교 시작 버전으로 고정한 제안이며 다른 크기보다 KeepBoard에서 우수하다는 실측은 없다.

필요한 보조는 **Google Cloud Vision `TEXT_DETECTION`**이다. 숫자/문자와 위치를 읽는 별도 OCR로, 검출된 기물의 종류·색·카드 ID를 대신 결정하지 않는다. 두 API를 무조건 직렬 호출하는 제품 정책까지 권고하지 않는다. 먼저 같은 사진에서 기물 위치와 문자 값을 각각 평가해 실제 필요한 경로만 연결한다. YOLO-World 공식 문서도 좁고 세밀한 범주에는 약하다고 설명하므로, 작은 마을/도시 구분을 지원 완료로 보지 않는다.

중요한 제외: [Grounding DINO 공식 제품 문서](https://docs.roboflow.com/models/supported-models/grounding-dino)는 **Serverless Cloud API 미지원, Dedicated 또는 self-hosted만 가능**이라고 명시한다. 일반 모델 가격표에는 Grounding DINO가 남아 있어 문서 간 불일치가 있다. 가격표/오픈소스 endpoint 존재만으로 Serverless 가용성을 확정하지 않고 이번 우선 후보에서 제외했다. 이전 Florence-2-base의 고정 OCR/OD 실패도 Roboflow의 다른 모델 실패로 확대하지 않는다.

## 비교 — 최우선1, 보조1, 대안2

| 선택 | 정확한 task·기반 모델·입력 | 반환 및 못 하는 일 | 준비와 현재 제공 |
|---|---|---|---|
| **최우선: Roboflow YOLO-World v2-l** | Open-vocabulary object detection. 이미지 + `text` 클래스 목록. 긴 자유 질의/게임 규칙 프롬프트가 아니라 찾을 외형 이름 | 클래스·confidence·bbox. 색 수식어를 클래스에 넣을 수 있지만 독립 색 속성의 정확성은 미확인. 숫자6/9·문양 뜻·카드 ID/OCR 출력 없음 | **VERIFIED:** Serverless/8개 버전/무학습 지원. 기존 키의 현재 잔액·요청 성공은 UNKNOWN. 정확한 checkpoint hash는 문서에 없어 버전 문자열 수준 고정 |
| **역할별 보조: Google Cloud Vision OCR** | `TEXT_DETECTION`, Google 관리형 OCR. 내부 모델 아키텍처/고정 checkpoint는 비공개. 이미지·선택 언어 힌트, 게임 프롬프트 없음 | 문자열·단어 polygon. 회전된 작은 숫자6/9 성능 UNKNOWN. 임의 자원 문양/기물 종류·소유색·카드 정체성 판독 API는 아님 | **VERIFIED:** 즉시 응답 REST API. 학습 불필요·이 OCR endpoint 자체의 사용자 fine-tune 없음. 별도 GCP 프로젝트·Vision 활성화·billing/auth 필요; Gemini 키 존재만으로 준비 완료 아님 |
| **대안1: fal Model API / Meta SAM 3** | `fal-ai/sam-3/image`. Text/point/box로 객체 segmentation. 자유 대화/인쇄값 해석이 아닌 영역 지정 | mask·선택 bbox/score. 여러 겹 기물의 윤곽/클릭 정정 후보. 숫자·색 이름·게임 기호 뜻·카드 ID는 출력하지 않음 | **VERIFIED:** 공개 모델/API 페이지와 상업 사용 표시. 학습 불필요. 별도 fal 계정/잔액 필요; 계정별 실제 호출은 UNKNOWN. 해당 hosted endpoint의 fine-tune 제공은 확인 못함 |
| **대안2: Roboflow 맞춤 RF-DETR** | RF-DETR Small 등으로 라벨된 게임 부품 detection 학습 → 고정 `project/version` 호출. 추론 때 자연어로 새 클래스를 추가하는 모델 아님 | 학습 클래스·bbox·score. 필요하면 판본별 기물/기호 분류 가능성이 있으나 숫자·색·카드 ID가 자동으로 모두 생기지 않음 | **VERIFIED:** custom training/weights 배포/Serverless 지원. 기본 COCO 모델은 게임 전용 모델 아님. **현재 KeepBoard 학습 데이터/배포된 모델은 없음** |

기능·호출 근거: [YOLO-World](https://docs.roboflow.com/models/supported-models/yolo-world), [Cloud Vision OCR](https://docs.cloud.google.com/vision/docs/ocr), [SAM 3 API](https://fal.ai/models/fal-ai/sam-3/image/api), [RF-DETR 배포](https://rfdetr.roboflow.com/latest/learn/deploy/). 공급사가 제시한 L4 GPU ms 수치나 SAM 성능 문구는 네트워크·대기열·KeepBoard 실사진 결과로 환산하지 않았다.

## 실제 호출 형태 — 문서 예시이며 실행하지 않음

**1. YOLO-World**

`POST https://serverless.roboflow.com/yolo_world/infer`, `Authorization: Bearer <ROBOFLOW_API_KEY>`.

```json
{
  "image": {"type": "base64", "value": "<APPROVED_IMAGE_BASE64>"},
  "text": ["round cardboard token", "small wooden house", "small wooden stick", "playing card"],
  "yolo_world_version_id": "v2-l"
}
```

공식 SDK 대응: `InferenceHTTPClient(api_url="https://serverless.roboflow.com", api_key="<KEY>").infer_from_yolo_world(inference_input="<APPROVED_IMAGE_PATH>", class_names=[...], model_version="v2-l")`. 위 클래스 문구는 **INFERRED 시험 후보**이며 정확한 게임 명칭/정답으로 확정하지 않는다. 실제 부품 개수나 기대 숫자는 전달하지 않는다. [공식 응답 타입](https://github.com/roboflow/inference/blob/main/inference/core/entities/responses/inference.py)의 `x,y,width,height`는 중심/크기 기반 픽셀 좌표다. 입력 크기·API 반환 image 크기를 함께 저장해 SDK 리사이즈와 원본 역매핑을 확인해야 한다. confidence는 필터 점수이지 정답 확률이 아니다.

**2. Cloud Vision OCR**

`POST https://vision.googleapis.com/v1/images:annotate`, GCP 인증 사용.

```json
{"requests":[{"image":{"content":"<APPROVED_IMAGE_BASE64>"},"features":[{"type":"TEXT_DETECTION"}]}]}
```

`textAnnotations`의 전체 문자열 항목과 개별 단어를 중복 객체로 세지 않는다. `boundingPoly.vertices`는 픽셀 좌표이며 좌표값0은 JSON에서 생략될 수 있다. **문자 polygon ≠ 원형 토큰 외곽 ≠ 육각 타일**이다. dense 문서용 `DOCUMENT_TEXT_DETECTION`과 별개이며, 보드 전체의 드문 숫자를 시작 대상으로 삼을 때 TEXT_DETECTION이 과제에 맞는다. OCR의 문자 symbol 정보와 게임 고유 아이콘 인식은 다르다.

**3. SAM 3**

공식 호출: `fal.subscribe("fal-ai/sam-3/image", {input:{image_url:"<DATA_URI_OR_APPROVED_URL>", prompt:"round cardboard token", apply_mask:false, return_multiple_masks:true, max_masks:32, include_scores:true, include_boxes:true}})`.

반환은 `masks`와 요청 시 `boxes`/`scores`; box는 문서상 **normalized `[cx,cy,w,h]`**이다. 입력 point/box는 정수 좌표를 받는다. 반환 정규화 수치 범위·원본과 출력 mask 해상도 대응은 실응답 미확인으로 남기며 임의로 /1000 하지 않는다. 기본 `max_masks:3`을 전체판 검출 완료로 오인하지 않는다. 선택한32도 요청 상한일 뿐 기대 부품 수/실제 재현율이 아니다. data URI를 지원하므로 공개 이미지 URL을 만들 필요는 없지만 provider 전송 자체는 발생한다.

**4. 맞춤 RF-DETR**

학습된 모델을 Roboflow에 배포한 뒤 `InferenceHTTPClient(api_url="https://serverless.roboflow.com", ...).infer(image, model_id="<project>/<version>")`로 호출한다. 현재 존재하지 않는 KeepBoard endpoint를 만들어 적지 않는다. 라벨·판본·실사진 다양성이 확보돼야 의미가 있다. 학습된 좁은 detector는 반복되는 특정 부품 오검출을 개선할 선택지이며, 120게임의 전체 카드 목록을 학습해야 한다는 제안은 아니다.

## 과금·무료 조건·데이터 조건

아래는 **공식 공개 가격**이며 실제 계정 잔액/무료분 적용/청구가 아니다. 세금·환전 제외. 호출 수와 이미지 수는 분리한다. 예를 들어 원본1장을18개 crop으로 따로 읽으면 OCR 단위도18개다.

| 대상 | 청구 단위와 지금 확인한 가격 | 개인 프로젝트 조건 |
|---|---|---|
| YOLO-World | **0.1875credit / 1000이미지**. Roboflow on-demand $6/credit로 환산하면 $1.125/1000이미지 사용량 | 무료10credits/월·카드 없이 시작 가능. Core $39/월은 필수가 아님. prepaid와 monthly는 별도 구매/만료 조건. 기존 Roboflow의 현 잔액/새 endpoint 인증·한도는 미확인 |
| Cloud Vision TEXT_DETECTION | 기능별 월 첫1000unit 무료, 이후500만까지 **$1.50/1000unit** | billing 활성화 필요. 이미지에 다른 기능을 추가하면 해당 기능도 과금. 무료분 이후 원본1회는 $0.0015,18crop은 $0.027의 단순 계산이며 정확도나 권장 정책 아님 |
| fal SAM 3 image | 공개 모델 페이지 **$0.005/request**. 서로 다른 클래스에4회 요청하면 $0.02 | 모델 API 사용에 직접 GPU 임대 불필요. 상시 무료량·현재 가입 크레딧·최소 충전액은 공식 확인 부족으로 **UNKNOWN**. 실제 호출/청구0 |
| 맞춤 RF-DETR Small | 검출 추론 **0.1875credit/1000이미지**. 학습·라벨링·Workflow 추가 단계는 별도 | 같은 Roboflow 무료/유료 정책. 표시된 싼 추론비가 자료 제작·학습비를 포함한 총비용은 아님 |

근거: [Roboflow 모델별 가격](https://docs.roboflow.com/deployment/roboflow-cloud/serverless-api/model-pricing), [Roboflow 요금·약관 설명](https://roboflow.com/pricing), [Cloud Vision 가격](https://cloud.google.com/vision/pricing), [SAM 3 모델 가격](https://fal.ai/models/fal-ai/sam-3/image). Roboflow의 최신 과금 설명은 대부분 모델을 이미지 단위, vision-language/custom Python은 실행시간 단위로 구분한다. Florence의500초/credit을 YOLO-World에 그대로 적용하지 않는다. 여러 모델을 엮는 Workflow를 단일 무료 판독으로 계산하지 않는다.

**Roboflow:** private 프로젝트라도 신규 workspace의 제품 개선/데이터 라이선싱 기본 허용이 안내돼 있으며 무료 opt-out이 가능하다. 현재 계정 상태는 읽거나 변경하지 않았다. cloud hosted model 상업 라이선스가 포함된다는 설명과 self-host 가중치 라이선스는 구분한다. 요청 데이터 상세 보존기간은 이번 확인 범위에서 UNKNOWN이다.

**Google:** [Cloud Vision 데이터 FAQ](https://docs.cloud.google.com/vision/docs/data-usage)에 서비스 제공 외 학습 이용 없음, 온라인 즉시 응답 이미지의 메모리 처리/디스크 비보존, 일부 요청 metadata 임시 로그가 명시돼 있다. 이 정책을 Gemini API나 비동기 배치 정책으로 확대하지 않는다.

**fal:** model 페이지는 상업 사용을 표시하지만 그것이 사진의 비보존/학습 제외를 뜻하지 않는다. [공식 privacy policy](https://fal.ai/legal/privacy-policy)는 계정/개인정보 보존과 팀 내 요청 열람을 설명한다. 이 특정 SAM endpoint의 입력·출력 보존기간 및 학습 이용 보장을 확정하지 못했으므로 **UNKNOWN**으로 남긴다. 공식 API 페이지의 웹 직접 열람은 timeout이 있었으나 검색으로 제공되는 동일 공식 API schema는 확인했다. 계정 인증·모델 실행으로 가용성을 검증하지 않았다.

## 게임 정의·참조를 연결하는 최소 범위

**INFERRED:** 현재120개 정의에서 선택 게임·촬영 영역의 가시 부품만 꺼내 YOLO-World의 짧은 외형 클래스 목록으로 변환한다. 모델이 모르는 보드게임 용어를 장문의 규칙으로 설명하는 방식은 아니다. 반환 클래스는 기존 component 후보에 연결하되 색/소유자/숫자는 따로 확인하고, public/owner 사진 경계와 unknown·원본 SHA·후보/명시 적용을 유지한다.

지금은 검증된 실물 참조셋0이다. YOLO-World text input에 참조사진을 끼워 넣거나 SAM의 point/box prompt를 카드 정체성 검색이라고 부를 수 없다. 정확한 카드 식별은 판본별 권리·실물 대응이 확인된 참조셋과 별도 검색/분류가 필요하다. 이미 알려진 공개 카드 스캐너 패턴을 따라갈 수는 있지만 이번에는 새 참조 카탈로그·개인 사례 수집을 확대하지 않았다. RF-DETR 학습 역시 실제 사진·라벨이 있어야 하며 SVG437분류를 실물 정답으로 대체하지 않는다.

## 실행자가 바로 판단할 항목

1. **우선 검출 후보는 YOLO-World v2-l**, OCR 보조는 Cloud Vision TEXT_DETECTION. 같은 판의 기물 위치와 인쇄 숫자를 별도 GT로 평가한다. 원본/박스 대응·누락·오분류·읽은 값·총 대기/수정 시간을 분리하고, game tile center를 글자 GT로 쓰지 않는다.
2. 겹친 부품/윤곽 때문에 bbox만으로 정정이 어려울 때만 **SAM 3**를 대안으로 비교한다. 문자 정확도 개선 API로 평가하지 않는다.
3. 무학습 검출의 특정 부품 오류가 반복되고 소량의 적법한 라벨 사진을 확보할 수 있을 때 **맞춤 RF-DETR**를 검토한다. 지금 학습부터 시작하지 않는다.

**UNKNOWN:** 세 서비스의 KeepBoard 실제사진 정확도·6/9·작은 문양·카드 종류 판별·온라인 지연·계정별 실패율. 이 조사만으로 현재 Gemini/DeepSeek 판독을 교체하거나 비용 절감률을 선언할 수 없다. 기존 [방향 연구](../vision-direction-research-20261026/README.md)와 [LOW OCR 한계](../hosted-vision-comparison/results/gemini-low-20261026/README.md)를 보존하며, 이번 결과는 관리형 이미지 전용 API의 구체적 선택·호출 계약 인계다. 추가 실험은 실행하지 않았다.
