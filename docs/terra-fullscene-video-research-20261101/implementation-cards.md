# 실행자 인계: 작은 순서로 구현·판별

2026-11-01. 이 문서는 설계 인계이며 제품 구현/모델 실행 승인이 아니다. 기존 소스/dirty 변경/동결 실험을 보존한다. 현재 모델 low 기본값을 전역 변경하지 않는다.

## 카드 1 — 같은 시야의 더 좋은 프레임 확보

**목적:** 한 장을 더 선명한 장면으로 바꿀 수 있게 하고, 작은 품질 샘플에서 보인 차이를 객체 coverage로 과장하지 않는다.

**소유 제안:** 기존 프런트 실행자 한 명. `src/scanQuality.ts::{sameScanView,stepScanSelector,reserveScanFrame,settleScanFrame}`, `src/Capture.tsx::{sampleFrame,takePhoto}`, `src/scanBatch.ts` 및 `src/SessionWorkspace.tsx::{saveRunPhoto,finishCaptureRun}`의 선택 manifest 연결. 별도 실행자는 이 경로를 동시에 편집하지 않는다.

**최소 변경 계약:**

1. 후보 평가와 업로드 예약을 분리한다. 같은 시야의 pending best frame은 더 좋은 후속 후보로 교체할 수 있다. 이미 발급된 evidence ID/원본 bytes는 바꾸지 않는다.
2. 첫 단계는 현재 시야의 best 원본 한 장과 작은 비교 특징만 유지한다. 시야 전환/사용자 마침에서 업로드 후보를 확정한다. 긴 원본 영상은 저장하지 않는다. 원본 복사 횟수·메모리와 업로드 겹침 감소를 계측한다.
3. 192px 전역 노출/중복 검사는 계속 쓰되, 후보가 되는 때 원본의 분산된 패치 선명도/포화와 edge 분포를 함께 본다. patch 품질은 읽힘의 대용 신호이며 `coverageComplete`를 만들지 않는다.
4. 거의 같은 구도에서만 best 교체를 허용한다. 서로 다른 영역을 단순 색/해시 유사도로 교체하지 않는다. 품질 차이가 애매하면 현재 후보를 유지한다. 후보 선택 임계값은 기존 공개 재생과 별도 개발 촬영에서 정하고 새 검증 영상 전에 고정한다.
5. 최대 6장은 최종 선택 상한이다. 모델 발행은 `finishCaptureRun` 뒤 고정 selected IDs에서만 한다. 버려진 후보는 유료 unit을 만들지 않는다. 저장 실패 시 예약/카운트를 정확히 해제한다.
6. 현재 `maxMotion`만 낮추는 수정은 하지 않는다. 먼저 best-frame 교체를 검증한다. 이동 중 좋은 프레임까지 계속 제외되는 문제가 남으면 다음 카드의 기하 보상 판단을 분리해 적용한다.

**수용:** 합성 흐림→선명 동일시야 교체, 선명→흐림 유지, 새 영역 보존, 업로드 지연/실패/마침 race, 최대 6/중복 분석 0. 공개 Risk/Chess 재생에서 선택 이유를 비교하고 실제 가독성은 사람이 따로 표기한다. 작은 분석 함수 시간과 폰 카메라/encode/메모리를 분리한다. 결과가 나온 뒤 ‘더 읽혔다’고 판단하며, 사진 수 증가만 성공으로 세지 않는다.

**보류:** 새 hand detector/SLAM/촬영 중 유료 분석/자동 상태 확정. 이 카드가 기존 사진 업로드·저장·재개를 막아서는 안 된다.

## 카드 2 — 전체 low의 지시/보고 정책 비교

**목적:** 사용자 가설을 추가 모델 없이 검증한다. 입력 품질과 별개로 개별 관측의 수·복원 유용성이 늘어나는지 본다.

**소유 제안:** 기존 연구 실행자. 처음에는 격리 runner와 평가 adapter만. 제품 접점은 `server/ai/geminiGameReader.ts::buildGeminiGameBody`, `server/ai/terraGameReader.ts::{buildTerraGameBody,TERRA_FILL_SENTENCE}`, `decodeLiteralObservationPayload`. 카탄은 `catanScenePrompt`의 별도 native wire를 유지한다.

**계약:** [prompt-variants.json](prompt-variants.json)과 [experiment-plan.json](experiment-plan.json)을 요청 전 exact body/SHA로 고정한다. P0/P1은 prompt 추가 외 deepEqual, P1/P2는 모름 속성 행 보고 지시 변경 외 deepEqual이다. schema·model·effort·detail·이미지·허용 필드·output cap은 동일하다. P2에서 읽힌 값과 기존 동의 속성 매핑을 빼지 않는다. 누락 속성은 `not-present-unconfirmed`로 남긴다.

**수용:** 전체 가시 실물 기준의 recall과 추가 출력의 precision, 숫자 정/오/모름/누락, 속성 단위·개별/그룹 표현을 분리한다. raw→normalized→editable 각 단계의 행/필드 보존을 확인한다. sparse 직렬화 bytes 감소를 속도 개선이라고 대신 보고하지 않는다.

**승격 조건:** 개선된 그림/저장 정보가 추가 오검출·숫자 오류·정정 부담과 함께 유리한지 평가한다. 혼합 결과면 선택형/보류로 남기며, 새 지시를 모든 게임 기본값으로 즉시 바꾸지 않는다. 카탄의 generic wire 전환이나 `kind:null`은 이 비교에 섞지 않는다.

## 카드 3 — 작은 crop 우선의 알려진 값 충돌 제거

**목적:** 판독이 맞았던 값을 결합 과정에서 잃지 않는다. 정보가 부족하면 저장을 막는 대신 값과 대안을 보존한다.

**소유 제안:** 기존 백엔드 실행자. `server/observationFusion.ts::{focused,projectGenericFusion}`과 직접 회귀 tests. 프런트/판 자산/팩 소유 범위를 침범하지 않는다.

**계약:**

- 동일 물체 연결이 확인된 필드에서 모름+관측값은 보완한다. null≠0; false/0도 알려진 값이다.
- 서로 다른 알려진 값은 ROI 크기/density만으로 새 값을 선택하지 않는다. 이전 선택은 임시로 유지하고 원관측·대안·conflict를 남긴다. 수동값과 삭제 의도는 기존 digest/revision 보호를 유지한다.
- 첫 결과가 완전한 정답이라는 가정은 하지 않는다. 이후 사용자의 정정이나 별도로 검증된 관측 증거로 AI 선택을 바꿀 경로는 유지한다. 모델 certainty 점수·반복 일치만으로 자동 승격하지 않는다.
- slot/숫자/게임 ID별 특례, 예상 수량 보충, IoU를 알려진 사례에 맞춰 낮추는 변경은 금지한다.
- 현 결과의 결합/auto accepted 흐름을 유지한다. 필수 확인 버튼이나 전체 결과 보류를 추가하지 않는다.

**수용:** 기존 Sagrada A+C/B+C의 raw 값 집합을 고정 재생하여 작은 ROI라는 이유의 교체가 사라지는지 본다. 정답 결과로 assertion을 덮지 않는다. 반대 상황인 틀린 anchor+올바른 detail, unknown 보완, 사용자 정정, reverse/redelivery, same-unit 이웃, group refinement, stale epoch/owner를 합성 회귀로 함께 검사한다. 틀린 anchor가 자동으로 고쳐지지 않는 잔여 한계를 따로 보고한다.

## 카드 4 — 조건부: 카메라 움직임과 정보 coverage

카드 1과 새 촬영 자료가 준비된 뒤에만 필요성을 판단한다. `src/scanQuality.ts` 밖 별도 작은 worker 모듈에서 LK/특징점→RANSAC 후보를 만들고, 기존 selector에는 결과 신호만 넘기는 형태가 가능하다. 새 패키지/번들/기기 비용은 구현자가 먼저 확인한다. 이번 연구는 OpenCV를 설치/실행하지 않았다.

**정합 근거:** 특징점이 한 모서리에 몰리지 않는지, 양방향 대응/재투영 잔차, 지역 coverage, scale 변화, 반복 무늬 경쟁 매칭. threshold는 검증 전 개발 자료에서 고정하고 calibrated correctness로 부르지 않는다.

**상태/정합 분리:** 평면 camera motion 제거 뒤 지속하는 지역 변화는 상태 변경의 후보이지 증명이 아니다. 손·반사·3D parallax가 의심되면 UNKNOWN으로 유지한다. 정합 실패 시 원사진을 버리지 않으며, 관련 없는 사진을 단일 재고로 합산하지 않는다.

**수용:** 고정판 이동카메라, 고정카메라 움직이는 말, 지나가는 손, 정지 손, glare, 반복 타일, 초점 변화, 단순 zoom을 서로 구분해 기록한다. whole-scene 물체 회수/가독값 gain이 없는 정합 개선만으로 제품 효과를 주장하지 않는다. 현재 source별 receipts와 저장본을 유지하는 것부터 검증하고 전체 3D 엔진을 만들지 않는다.

## 실행 순서와 공통 종료 기준

1. 카드 1의 국소 코드/오프라인/폰 성능 확인과 카드 2의 **출력 전 새 사람 기준 고정**은 독립 진행 가능하다.
2. 카드 3은 기존 원응답으로 검증 가능하며 새 유료 판독을 기다릴 필요가 없다.
3. 새 12회 비교는 별도 실행 승인 후 한 번만 한다. 입력/GT가 없으면 호출하지 않는다. 같은 결과를 보고 prompt를 튜닝하면 그 사진은 개발셋으로 재분류한다.
4. 카드 4와 범용 detector/OCR는 앞 단계 결과가 실제 필요성을 보여줄 때만 진행한다.

원본·선택 이유·raw·변환·field decision을 남긴다. 테스트 개수/JSON 유효성만으로 실제 복원 완성을 주장하지 않는다. 전체 광학정보가 없거나 식별이 불가능한 부분은 UNKNOWN으로 남기며 보통의 저장을 막지 않는다.
