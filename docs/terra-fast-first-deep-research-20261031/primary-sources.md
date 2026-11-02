# 1차 문헌·실제 구현 근거표

확인일: 2026-10-31. 논문의 실측은 해당 데이터/하드웨어에 한정된다. 다운로드한 소스는 실행하지 않았으며 모델 가중치는 받지 않았다. 고정 source SHA는 [code-source-index.json](code-source-index.json)에 있다.

| ID | 역할 | 자료·구현 판정 |
|---|---|---|
| P1 | 전용 OCR | [PP-OCRv6 / official PaddleOCR.js](https://arxiv.org/html/2606.13108) · 국소 시제품에 채택 |
| P2 | 실제 보드 상태 파이프라인 | [Determining Chess Game State from an Image / chesscog](https://pmc.ncbi.nlm.nih.gov/articles/PMC8321354/) · 역할 분리 원리 채택 |
| P3 | 검출 slicing | [SAHI: Slicing Aided Hyper Inference](https://arxiv.org/html/2202.06934) · 좌표/문맥 원리 채택 |
| P4 | open-vocabulary 검출 | [YOLO-World](https://arxiv.org/html/2401.17270) · 후속 비교 후보 |
| P5 | 국소 VLM 검색 | [V*: Guided Visual Search / SEAL](https://arxiv.org/html/2312.14135v2) · 유한 우선순위 탐색만 채택 |
| P6 | 모델 내부 동적 해상도 | [LLaVA-UHD](https://arxiv.org/html/2403.11703v1) · overview·공간 출처만 채택 |
| P7 | 학습 라우팅/부정 근거 | [RouteLLM](https://arxiv.org/html/2406.18665v2) · 현재 학습 router 도입 보류 |
| P8 | 결정적 평면 기하 | [OpenCV planar feature matching + homography](https://docs.opencv.org/4.13.0/d7/dff/tutorial_feature_homography.html) · 기존 확인 frame 우선 |
| P9 | 현재 API 경계 | [OpenAI Terra / image / latency / streaming API contracts](https://developers.openai.com/api/docs/models/gpt-6.1-terra) · 명시 profile·유한 요청 |

## P1 · PP-OCRv6 / official PaddleOCR.js

- **방법/읽은 위치:** §2.2–2.3, §3.1, §3.3.3, §3.4 Table 9. 텍스트 검출→polygon crop→CTC 문자 판독. NRTR은 학습 보조이며 추론에서 제외한다. 원본 문자 위치와 빈 판독을 따로 보존하는 데 적합하다.
- **원 연구 실측:** 일반 장면·문서200장, 디스크 I/O·전후처리 포함. native ONNX Runtime1.23.2 Apple M4: small1.29초/장, tiny0.35초/장. 브라우저·휴대폰·게임판 실측 아님.
- **판본/운영/라이선스:** 공식 소스 dab3fe3/JS0.4.2. Apache-2.0 코드와 small ONNX 모델카드 확인. 모델 파일21.2+9.88MB; runtime은 추가. Worker/WebGPU/WASM 코드 확인, npm 게시본403/미확인.
- **직접 확인과 적용 한계:** core.predict는 빈 rec의 polygon을 결과에서 누락한다. 공개 index는 det factory를 실행 API로 내보내지 않는다. CTC score는 문자 확률의 평균이며 보드 상태 정답 확률이 아니다. 주사위 눈/말/카드 정체성과 한국어 지원은 별도 확인 필요.
- **연결 위치:** src/Capture.tsx; proposed src/perception/ocrWorker.ts; proposed shared/perceptionEvidence.ts; shared/photoGeometry.ts
- **직접 읽은 코드:** [paddleocr-js/packages/core/src/pipelines/ocr/core.ts](https://raw.githubusercontent.com/PaddlePaddle/PaddleOCR/dab3fe35379033fdcb2d0e9572fac0b36c9a9ebf/paddleocr-js/packages/core/src/pipelines/ocr/core.ts) — OcrPipelineRunner.initialize, OcrPipelineRunner.predict
- **직접 읽은 코드:** [paddleocr-js/packages/core/src/models/rec.ts](https://raw.githubusercontent.com/PaddlePaddle/PaddleOCR/dab3fe35379033fdcb2d0e9572fac0b36c9a9ebf/paddleocr-js/packages/core/src/models/rec.ts) — decodeCTCSample
- **직접 읽은 코드:** [paddleocr-js/packages/core/src/models/det.ts](https://raw.githubusercontent.com/PaddlePaddle/PaddleOCR/dab3fe35379033fdcb2d0e9572fac0b36c9a9ebf/paddleocr-js/packages/core/src/models/det.ts) — createDetModel, decodeDetOutput
- **직접 읽은 코드:** [paddleocr-js/packages/core/src/pipelines/ocr/worker-backed.ts](https://raw.githubusercontent.com/PaddlePaddle/PaddleOCR/dab3fe35379033fdcb2d0e9572fac0b36c9a9ebf/paddleocr-js/packages/core/src/pipelines/ocr/worker-backed.ts) — createWorkerBackedPaddleOCR
- **직접 읽은 코드:** [paddleocr-js/packages/core/src/runtime/ort.ts](https://raw.githubusercontent.com/PaddlePaddle/PaddleOCR/dab3fe35379033fdcb2d0e9572fac0b36c9a9ebf/paddleocr-js/packages/core/src/runtime/ort.ts) — getProviderCandidates, createSession
- **직접 읽은 코드:** [paddleocr-js/packages/core/src/resources/model-asset.ts](https://raw.githubusercontent.com/PaddlePaddle/PaddleOCR/dab3fe35379033fdcb2d0e9572fac0b36c9a9ebf/paddleocr-js/packages/core/src/resources/model-asset.ts) — DEFAULT_MODEL_ASSETS, loadModelAsset
- **추가 공식 근거:** [1](https://huggingface.co/PaddlePaddle/PP-OCRv6_small_rec_onnx), [2](https://huggingface.co/PaddlePaddle/PP-OCRv6_small_det_onnx), [3](https://huggingface.co/PaddlePaddle/PP-OCRv6_small_rec_onnx/tree/main), [4](https://huggingface.co/PaddlePaddle/PP-OCRv6_small_det_onnx/tree/main), [5](https://raw.githubusercontent.com/PaddlePaddle/PaddleOCR/dab3fe35379033fdcb2d0e9572fac0b36c9a9ebf/paddleocr-js/packages/core/src/index.ts)

## P2 · Determining Chess Game State from an Image / chesscog

- **방법/읽은 위치:** §4.1–4.4, §5, Tables 1 and 3. 격자/RANSAC 정합→칸 점유→기물 분류. 칸 주변 문맥을 사용하고 새로운 기물 외형에는 알려진 초기 배치 사진으로 적응 학습한다.
- **원 연구 실측:** 저자 보고: i5-6500 3.20GHz quad CPU 약2초 초과, GTX1060 6GB 0.5초 미만. 새 기물27장에서는 적응 전 평균9.33개 오류/판, 적응 후0.11개·완전정답판88.89%.
- **판본/운영/라이선스:** 논문2021/소스4e9c22d(2025). 코드MIT. 오래된 Python/PyTorch 의존성, checkpoint 라이선스는 이번 별도검증 안함. 공개 학술/개인 구현이지120게임 상용서비스 사례 아님.
- **직접 확인과 적용 한계:** find_corners는 Canny/Hough/정규 격자에 의존한다. recognizer는 점유64칸 중 occupied만 종류 분류한다. 불법 상태를 경고하지만 합법 상태로 고치지 않는다. 초기재고를 임의 중간판의 정답으로 주입하면 안 된다.
- **연결 위치:** shared/photoGeometry.ts; game-photo-definitions/index.json; server/ai/observationAssembly.ts
- **직접 읽은 코드:** [chesscog/corner_detection/detect_corners.py](https://raw.githubusercontent.com/georg-wolflein/chesscog/4e9c22d76c75615d4e9a4cd567679f4caa00dec7/chesscog/corner_detection/detect_corners.py) — find_corners, _detect_edges, _detect_lines, _compute_homography
- **직접 읽은 코드:** [chesscog/recognition/recognition.py](https://raw.githubusercontent.com/georg-wolflein/chesscog/4e9c22d76c75615d4e9a4cd567679f4caa00dec7/chesscog/recognition/recognition.py) — ChessRecognizer.predict, TimedChessRecognizer
- **추가 공식 근거:** [1](https://github.com/georg-wolflein/chesscog)

## P3 · SAHI: Slicing Aided Hyper Inference

- **방법/읽은 위치:** §3, §4, VisDrone/xView experiments. 기존 detector에 겹치는 slice·resize를 적용하고 원본으로 box를 되돌린 뒤 결합한다. 큰 물체를 위한 whole 경로가 별도로 있다.
- **원 연구 실측:** VisDrone AP50 slicing-only +6.8/+5.1/+5.3점(FCOS/VFNet/TOOD). VisDrone640×640/xView400×400 slice. 게임 VLM·복원 점수가 아니다.
- **판본/운영/라이선스:** canonical obss/sahi b5a153e(2026-10-16), MIT. 먼저 발견한 Small-Object-Detection fork는 오래되어 현재 구현 근거에서 제외. detector 가중치는 별도 필요.
- **직접 확인과 적용 한계:** get_sliced_prediction의 source shift는 재사용 원리다. NMS의 삭제/NMM의 전이적 묶음은 동일색 이웃·겹친 다른 층·상충 값·원문 보존을 대신하지 못한다. 논문 overlap/IoU 값을 제품 정답 기준으로 가져오지 않는다.
- **연결 위치:** shared/photoGeometry.ts::mapObservationRegion; server/scanObservation.ts; server/observationFusion.ts
- **직접 읽은 코드:** [sahi/predict.py](https://raw.githubusercontent.com/obss/sahi/b5a153ee7bcb1fd84a7b868575ff14131e7423ce/sahi/predict.py) — get_sliced_prediction
- **직접 읽은 코드:** [sahi/postprocess/combine.py](https://raw.githubusercontent.com/obss/sahi/b5a153ee7bcb1fd84a7b868575ff14131e7423ce/sahi/postprocess/combine.py) — NMMPostprocess, GreedyNMMPostprocess, _apply_merge
- **추가 공식 근거:** [1](https://github.com/obss/sahi)

## P4 · YOLO-World

- **방법/읽은 위치:** §3.1–3.3, §4.1–4.2, Table 2. 문자 명칭과 이미지 영역을 맞추고 vocabulary embedding을 미리 계산한다. 위치/종류 후보를 주며 카드 정체성·숫자 판독은 별개다.
- **원 연구 실측:** 논문 YOLO-World-L: LVIS minival35.4AP, NVIDIA V10052FPS(reparameterized). CPU·폰·작은 게임 물체 성능 아님.
- **판본/운영/라이선스:** 공식4f70adb(2025), GPL-3.0. ONNX 예제는 있으나 일부 후처리 cuda:0. 해당 main detector 파일은 정적 AST에서61행 문법오류. 실행·가중치 다운로드 안함. 모든 release가 잘못됐다는 뜻 아님.
- **직접 확인과 적용 한계:** 게임팩의 일반명 vocabulary를 써도 새로운 외형의 회수율은 측정해야 한다. 소유자/비가시 수량은 검출로 확정하지 못한다. 직접운영·hosted·license 조건이 미해결이므로 첫 의존성으로 두지 않는다.
- **연결 위치:** proposed perception candidate interface; game-photo-definitions/index.json allowed component labels
- **직접 읽은 코드:** [yolo_world/models/detectors/yolo_world.py](https://raw.githubusercontent.com/AILab-CVC/YOLO-World/4f70adbaacf5685bd9ec5bea85f1f91057f6fc0b/yolo_world/models/detectors/yolo_world.py) — YOLOWorldDetector.predict, reparameterize, extract_feat
- **직접 읽은 코드:** [deploy/onnx_demo.py](https://raw.githubusercontent.com/AILab-CVC/YOLO-World/4f70adbaacf5685bd9ec5bea85f1f91057f6fc0b/deploy/onnx_demo.py) — preprocess, inference, inference_with_postprocessing
- **추가 공식 근거:** [1](https://github.com/AILab-CVC/YOLO-World)

## P5 · V*: Guided Visual Search / SEAL

- **방법/읽은 위치:** §3.3, §5.1–5.3, Tables 1–3. 질문에 필요한 목표를 subimage로 검색해 visual working memory에 넣는다. 모든 물체 인벤토리 검출과 다르다.
- **원 연구 실측:** V*Bench VQA75.39 vs GPT-4V54.97; A100 한 장에서 목표당 평균6초, guided4.65 vs BFS6.62단계. 폰·API·전체 물체 recall 수치 아님.
- **판본/운영/라이선스:** 공식4ede664(2024), 코드MIT. Vicuna/LLaVA 및 VSM checkpoint 조건은 별도. CUDA/BF16 7B stack이므로 가벼운 CPU 처리로 간주하지 않는다.
- **직접 확인과 적용 한계:** visual_search_queue는 crop 검색에서 첫 목표로 종료하고 다중 반환을 whole branch로 제한한다. 상식 위치 추정은 탐색 가설이다. 반복 기물 누락 검증과 bounded ROI만 빌리고 재귀 유료 agent는 제외한다.
- **연결 위치:** proposed selectRefinementRegions; server/scanExecution.ts bounded unit claims
- **직접 읽은 코드:** [visual_search.py](https://raw.githubusercontent.com/penghao-wu/vstar/4ede6647959cfb59eeabd09286adf6a5f9478da0/visual_search.py) — visual_search_queue
- **추가 공식 근거:** [1](https://github.com/penghao-wu/vstar)

## P6 · LLaVA-UHD

- **방법/읽은 위치:** §3.1–3.3, §4.1, Table 1. 비율에 맞춘 tiling, overview, 학습된 resampler, 공간 separator. slice당576 visual token을64로 압축한다.
- **원 연구 실측:** 2024논문은 CLIP ViT-L/14+Vicuna13B, 최대6slice+overview·672×1008, 학습8A100. 외부 Terra crop의 latency/token 측정이 아니다.
- **판본/운영/라이선스:** 코드aa2dac5(2026)는v3공지와v1모듈을 포함한다. 2024실험 checkout과 같다고 주장하지 않음. 코드Apache-2.0, base/checkpoint조건 별도.
- **직접 확인과 적용 한계:** slice_image_minicpm와 AdaptSpatialResampler_v1.forward를 읽었다. 후자는 학습된 query/cross-attention이므로 API 바깥의 atlas가 압축률·과금을 재현하지 못한다.
- **연결 위치:** shared/photoGeometry.ts; possible future multi-image ObservationRequest
- **직접 읽은 코드:** [llava/slice_process.py](https://raw.githubusercontent.com/thunlp/LLaVA-UHD/aa2dac531cd96b0102318884ccf4ef0f3206d5eb/llava/slice_process.py) — slice_image_minicpm
- **직접 읽은 코드:** [llava/model/multimodal_projector/uhd_v1_resampler.py](https://raw.githubusercontent.com/thunlp/LLaVA-UHD/aa2dac531cd96b0102318884ccf4ef0f3206d5eb/llava/model/multimodal_projector/uhd_v1_resampler.py) — AdaptSpatialResampler_v1.forward
- **추가 공식 근거:** [1](https://github.com/thunlp/LLaVA-UHD)

## P7 · RouteLLM

- **방법/읽은 위치:** §2, §3.1, §4.1–4.2, Tables 1–3. 입력 질문의 strong/weak 선호를 학습하고 strong 호출 비율에 맞게 threshold를 정한다.
- **원 연구 실측:** Arena만 학습한 router는 MMLU에서 무작위와 비슷하고 GSM8K APGR은 무작위보다 낮다. 도메인 자료 보강 효과는 언어 태스크 결과다.
- **판본/운영/라이선스:** 0b64fda(2024), Apache-2.0. MFModel.forward는 text-embedding-3-small API도 호출하므로 무호출 local 기하 router가 아니다.
- **직접 확인과 적용 한계:** calibrate_threshold의 quantile은 호출 비율 조정이지 정답률 보장이 아니다. 시각 GT 없이 점수를 정답 확률로 쓰지 않는다. 우선 이유 코드·false-safe·미검출을 측정한다.
- **연결 위치:** proposed selectRefinementRegions; evaluation-plan.md routing audit
- **직접 읽은 코드:** [routellm/calibrate_threshold.py](https://raw.githubusercontent.com/lm-sys/RouteLLM/0b64fdafe049e596a3f5657c219329f24af24198/routellm/calibrate_threshold.py) — quantile threshold selection
- **직접 읽은 코드:** [routellm/routers/matrix_factorization/model.py](https://raw.githubusercontent.com/lm-sys/RouteLLM/0b64fdafe049e596a3f5657c219329f24af24198/routellm/routers/matrix_factorization/model.py) — MFModel.forward, pred_win_rate
- **추가 공식 근거:** [1](https://github.com/lm-sys/RouteLLM)

## P8 · OpenCV planar feature matching + homography

- **방법/읽은 위치:** Code: keypoints → matching → findHomography(RANSAC) → perspectiveTransform. 특징점 대응→findHomography(RANSAC)→perspectiveTransform. 공식 예제는SURF이며 ORB/KAZE 대안도 언급한다.
- **원 연구 실측:** 튜토리얼에는 게임판 정확도·속도 벤치마크가 없다.
- **판본/운영/라이선스:** 공식 docs4.13.0 확인. 새 OpenCV build/가중치를 도입하지 않았다. 선택할 JS배포본의 license notice와 버전을 별도 고정해야 한다.
- **직접 확인과 적용 한계:** 구별 가능한 대응점이 필요하다. 반복 타일·가림·거울 회전·높이 있는 기물이 실패 조건이다. 알려진 원본 crop 변환과 추정한 다른시점 정합을 구분한다.
- **연결 위치:** shared/photoGeometry.ts::photoFrameTransform; geometryCandidates

## P9 · OpenAI Terra / image / latency / streaming API contracts

- **방법/읽은 위치:** model capabilities, images and vision, streaming, latency optimization, pricing. Terra 이미지 입력·reasoning 설정·structured output·streaming을 공식 문서에서 확인. 복수 이미지는 API에 가능하지만 현재 앱 compiler는1장이다.
- **원 연구 실측:** 공식 latency 설명은 일반 조언이다. KeepBoard30초나 게임 상태 정확도 보장 자료가 없다.
- **판본/운영/라이선스:** 2026-10-31 공식 docs 도구 열람. Terra none/low/medium/high/xhigh/max 지원. short-context standard input$1/M·output$5/M; 캐시 조건 별도. 제품기본low불변.
- **직접 확인과 적용 한계:** 모든 이미지는 입력 토큰을 쓰며6.1 Terra 전용 image multiplier는 미확인. 내부 early-exit/resampler 제어가 있다고 가정하지 않는다. stream JSON 조각은 편집 가능한 완성판이 아니며 HTTP abort도 무료 보장이 아니다.
- **연결 위치:** server/ai/terraGameReader.ts; shared/lightweightRecognition.ts; server/scanExecution.ts; server/analysisTask.ts
- **추가 공식 근거:** [1](https://developers.openai.com/api/docs/guides/images-vision), [2](https://developers.openai.com/api/docs/guides/latency-optimization), [3](https://developers.openai.com/api/docs/guides/streaming-responses), [4](https://developers.openai.com/api/docs/pricing)

## 적용 범위를 넘지 않기

SAHI의 detection AP, V*의 VQA 정답, OCR의 문자열 정확도, chesscog의 완성판 정확도는 서로 교환할 수 없는 지표다. 라이선스가 공개되어 있어도 폰에서의 지연·메모리·게임 외형 회수가 검증되었다는 뜻은 아니다. 최신 저장소 main이 논문의 실험 checkout과 같다고 가정하지 않았다.

문서 접근 실패는 우회하지 않았다. YOLO-World의 CVF PDF는403이라 arXiv 원문으로 읽었고, chesscog의 MDPI429는 반복하지 않고 PMC 저자 논문을 사용했다. Roboflow 경로404는 hosted 제공 여부 근거에서 제외했다.
