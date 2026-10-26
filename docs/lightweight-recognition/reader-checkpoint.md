# 로컬 reader 중간 진단 — 숫자 관측부터 한 번 좁히기

**권고:** 기존 응답의 좌표를 억지 변환하지 않는다. 모델에 앱 전체 관측 JSON을 만들게 하는 경로를 줄이고, **숫자 토큰 한 종류의 실제 값·상자만 출력 → 코드가 내부 계약을 조립**하는 작은 교정을 먼저 한다. 검증기는 유지한다. 이후 제안은 같은 원본의 최대 2회 진단이며 **이번 연구 실행0**, 최종 A/B6회 배치를 해제한 것이 아니다.

2026-10-24 확인. 아래 소스는 작업 중인 격리 stage이며 배포본이 아니다. 정확한 파일·symbol·SHA, 고정 prompt/schema/실험 조건은 [reader-checkpoint.json](reader-checkpoint.json)에 있다. 기존 [design.md](design.md) / [contract.json](contract.json)의 후보·명시 반영·저장 경계를 변경하지 않는다.

| 확인 수준 | 직접 확인한 사실 | 판단 |
|---|---|---|
| VERIFIED | 원본850×637 JPEG의 요청 body와 prompt를 현재 함수에서 오프라인 재구성해 보관 SHA와 일치. HTTP200/finish stop, 입력1599·출력1591token, cap2048 | 실제 연결·생성은 됐다. 잘림/OOM이 이번 실패 근거가 아니다. |
| VERIFIED | 9개 허용 종류마다 관측1개, 모두 같은 큰 bbox와 수량12. 지형/숫자 속성은 unknown | 개별 실물 판독 실패. 좌표가 유효해져도 유용한 숫자·지형이 생기지 않는다. |
| VERIFIED | 원문 그대로 validator를 재실행: 9/9 bbox 범위 오류. job failed/candidate0 | `validateObservationResult`의 정당한 거절. 앱 조립 이전 실패다. |
| VERIFIED | reader113.384초; runtime prompt12.902초, 직렬 출력100.410초(88.61%) | 출력 반복이 현재 대기의 대부분. prompt 단계의 이미지 encode/prefill 세부 분리는 UNKNOWN. |
| UNCLEAR | 작은4B 시각 능력, task/schema 부담, 양자화·runtime, 이미지 sampling 영향 | 1회로 원인 비중을 구분할 수 없다. 전120게임·모델 전체 무능 판정 금지. |

**좌표와 이미지 설정.** 공식 Qwen3-VL cookbook은 상대0–1000 좌표 및 `bbox_2d:[x1,y1,x2,y2]`를 사용한다. 현재 prompt는 normalized xywh만 말하고 schema는 숫자 범위를 제한하지 않는다. 새 wire는 공식 방식으로 명시하되 내부0–1 xywh로 **한 번만** 변환한다. 이전 응답의 정수만 보고 pixel/1000 단위를 판별할 수 없으므로 구응답은 그대로 실패로 남긴다. [공식 좌표/예제](https://github.com/QwenLM/Qwen3-VL/blob/main/cookbooks/2d_grounding.ipynb), 확인일2026-10-24.

실제 runtime log에는 grounding용 이미지 최소1024token 경고가 있고 launch args에는 해당 override가 없다. 이는 **설정된 최소값에 대한 경고**이며 실제 이미지 token 수 또는 실패 원인 확정은 아니다. 같은 revision의 구현도 확인했다. [llama.cpp pinned source](https://github.com/ggml-org/llama.cpp/blob/620d2225cc436ab0b001e3200e590e3b286ef9ab/tools/mtmd/clip.cpp#L1738-L1762). 원본 자체에 작은·회전된 숫자가 있으므로 업샘플링이 사라진 정보를 복원한다고 말하지 않는다.

추가 직접 대조: projector header는 patch16/merge2이고 min/max pixel key는 없다. pinned 코드 기본은 **min8/max4096 image tokens**다. 원본850×637을 이 코드로 계산하면 **864×640·540 visual tokens 예상**, min1024 조건은 **1184×896·1036 예상**이다. 이는 **정적 코드 계산(INFERRED)**이며 보관 log에 per-image 실제 크기/token 계측이 없어 실측 확정은 아니다. 총 prompt1599를 image tokens로 세지 않는다. header의 image_size768도 실제768×768 입력이라는 뜻이 아니다. 따라서 이미지 설정 영향은 구체적으로 시험할 가치가 있으나 경고 자체를 오독 원인이나 잘못된 실행의 확정 근거로 삼지 않는다.

**작은 구현 카드 — Sol2, Sol1 UI 작업은 계속**

- 대상: `server/ai/localReader.ts`의 `observationReaderPrompt`, `observationResponseSchema`, `LocalReader.read`와 해당 focused test. 새 provider-private `qwen-number-grounding-v1`은 `items:[{bbox_2d,text}]`만 생성한다. 종류/수량/owner/ref/epoch/imageIndex/version/빈 참조/모름 설명을 모델에 반복 출력시키지 않는다. 번호 종류는 고정 task가, 근거·범위는 요청이, ref는 코드가 제공한다.
- 변환: 명시된 새 wire에서만 `x=x1/1000`, `y=y1/1000`, `w=(x2-x1)/1000`, `h=(y2-y1)/1000`. 정방향·유한·범위를 검증하고 clamp/자동 단위추정 금지. 문자 그대로의 숫자를 보존하며 게임 허용값 밖이면 진단과 unknown으로 남긴다. null을0/없음으로 바꾸지 않는다. 숫자를 수량으로 쓰지 않는다.
- 내부 `ObservationResult` / `validateObservationResult` / `assembleObservations` / candidate→explicit apply→save를 재사용한다. 단일 물체라는 wire 의미가 확실할 때만 수량1, 아니면null. 불명확한 객체를 GT·재고로 채우지 않는다. 모델의 범용 JSON 반복 부담을 코드로 옮기는 교정이며 정확도·속도 개선은 아직 가설이다.
- 오프라인 수용: 구raw9개는 계속 거절, 새 synthetic xyxy 변환/원본 왕복, 역전·범위 밖 거절, 같은 숫자의 다른 물체 보존, null·소유범위·기존 accepted 보존. **schema 통과를 사진 정답으로 세지 않는다.**

**다음 진단 카드 — 최대2 local 요청, 실패 포함/retry0/paid0/동시1**

정확 조건·영문 prompt·JSON schema는 JSON의 `nextExperiment`에 고정했다. 동일 원본 SHA `82a495688f1130cbab488b4f30a736c915e32bb8059d4a393042c5456f929e22`, 같은 model/weight/projector/runtime, context8192, output cap1024, temperature0. **crop/회전/frame/atlas 없음**, GT와 숫자 개수는 입력하지 않는다. 이 카드의1024 출력 cap은 유한 진단 범위이고 제품 속도/품질 합격선이 아니다.

1. **D1:** 숫자 토큰만 compact wire로 읽기. 기존 이미지 전처리 설정 유지.
2. **D2:** 요청 body와 원본은 동일, 격리 reader의 `--image-min-tokens 1024`만 변경. 실제로 이미1024 이상 처리되어 효과 없는 설정이라면 D2를 생략한다. 임의로 다른 실험으로 바꾸지 않는다. 프로세스 load/readiness는 별도, UI preview/운영 process는 건드리지 않는다.

이 두 조건은 이미지 최소값이라는 한 변수를 비교한다. D1과 최초 smoke는 task/schema/output cap이 함께 달라서 “짧은 prompt 단독 효과”라 부르지 않는다. 순서/캐시/열 영향을 기록하고 단1쌍으로 안정적인 지연 개선을 인증하지 않는다.

채점은 기존GT18개 전체를 유지한다. GT center가 정확히 한 bbox에, 그 bbox가 정확히 한 GT center에 대응할 때만 값 완전일치를 센다. 다대일/일대다·누락·null·오독을 별도 보고한다. bbox 유효성과 값 정답은 별도이며 정확한 token 경계 GT가 없으므로 IoU는 UNKNOWN. 모델 바깥영역 예측은 FP/미확인을 직접 구분한다. runtime prompt/decode/전체시간·출력량·finish·memory 가능값을 기록한다. 로컬 API fee0이나 전력/기기비용은 미측정이다.

**중단/다음 판단:** 두 조건 모두 유일 대응하는 정답 숫자가 없거나 종류 목록만 반복하면 추가 prompt/OCR sweep 및 현재안 그대로의6회 배치를 멈춘다. 관측값이 나오면 정답·오독·정정 부담과 시간을 함께 비교해 다음 한 단계만 선택한다. 숫자 진단 성공도 전체 Catan·지형/도로·120게임의 성공이 아니다. 이 연구는 실행하지 않았으며 추가 모델/서비스가 필요하지 않다.

**B0 추가 인계 반영.** 새 `buildCatanAtlas`/Pillow raster/`mapObservationRegion` 소스를 읽었다. 실제 원본 내부를192px 패널·5열·8px 간격으로 재배치하고 원본 polygon으로 역매핑한다. 사진 밖 패널은 건너뛰므로 항상19개라고 가정하지 않는다. terrain/number/robber로 제한하는 연결을 확인했으나 6/6 시험 통과는 worker REPORTED, 실제 판독 품질은 UNKNOWN이다. 내부 crop은 가장자리 도둑/말을 놓칠 수 있어 부재를 확정하지 않는다. atlas 모델 실험은 이번2회에 덧붙이지 않는다. 후속에는 frame/crop·실제 포함GT를 모델 결과와 독립적으로 먼저 고정한다. 현재 preview51328 old backend 여부는 supervisor 보고이며 조회하지 않았다.

OCR 별도 비교는 [기존2/18](ocr-diagnostic.json)→[새처리0/18](ocr-digit-diagnostic.json)(오독1·누락17). 추가 sweep 권고 없음. 이번 산출물에는 private 사진/raw/GT를 복사하지 않았고 제품·runtime·설정 수정0, 모델/API 호출0이다.
