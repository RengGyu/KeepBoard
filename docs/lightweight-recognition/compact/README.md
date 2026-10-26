# 숫자 전용 판독 제품 연결 — 동결 인계

선택형 `catan-numerals-v1`을 격리 제품의 **작업 → 숫자 후보 → 명시 검토 → 저장·복원**에 연결했다. 기본 AI·일반 로컬 wire·다른 게임은 유지한다. 공유 제품 적용·배포·새 실제 모델 요청은 0이다.

- **VERIFIED:** 관련 backend 집중 검사 **42/42, exit 0**. 마지막 schema envelope 이름을 D2의 `qwen_number_grounding`으로 맞춘 뒤 영향받는 transport **3/3, exit 0**. 최종 타입 검사 exit 0. [로그 인덱스](manifest.json).
- **VERIFIED:** 기존 D2 raw 18항목을 실제 제품 API로 오프라인 재생하여 후보·부분 덮어쓰기 차단·baseline CAS 검토·commit·resume·재열기·export/import 통과. [D2 재생](d2-offline.json). 이는 변환·저장 연결 검증이며 새 판독 정확도 측정이 아니다.
- **VERIFIED:** 빈 결과/Atlas 전부 보류의 원문·보류 목록을 job 영수증으로 보존. 잘못된 task·scope·epoch·profile·원본 SHA는 거절하고, accepted 상태를 비우지 않는다. 기존 job 보관 기간은 24시간이며 리더의 private raw 파일은 별도로 남는다.
- **REPORTED/Sol1:** 실제 390/360px CUA에서 모의 숫자 2→3 정정·명시 반영·저장·재열기, 기존 도로·원관측·다른 pending 보존. [별도 UI 근거](../sol1-numeric-ui/README.md). 1px 합성 사진과 다른 사진의 D2 응답을 조합한 검수이므로 사진·위치 정확도 근거가 아니다.

## 단일 계약과 주요 경로

`shared/lightweightRecognition.ts`의 `LocalReaderSelection.task?:'catan-numerals-v1'`, `LocalTaskProfile`, `LocalReaderCapabilities.readers[].tasks`를 소비한다. task가 없으면 기존 일반 경로다. 숫자 capability 미확인 또는 cloud에서는 사용할 수 없으며 paid fallback은 없다. 원본이 기본이고 기준점은 선택; Atlas에는 확인된 기준점이 필요하다.

1. [prepareLocalObservation/analyzeLocalObservation](files/server/localObservation.ts): exact 게임/판본·공용 board·현재 epoch 사진 1장, 숫자만의 allowlist, source/input SHA와 profile을 고정한다.
2. [LocalReader.read](files/server/ai/localReader.ts): D2와 동일 prompt/schema·output1024·temperature0·cache_prompt:false. 시작 기록과 현재 PID 실행 인자까지 대조하며 일반 경로의 output2048은 유지한다.
3. [qwenNumberGrounding](files/server/ai/qwenNumberGrounding.ts): 명시된 정수 0..1000 xyxy만 한 번 변환한다. 숫자는 quantity가 아니다. null/도메인 밖 값은 unknown, 별개 실물은 별개 ref다. Atlas bbox가 패널 하나에 완전히 들어갈 때만 원래 projective warp의 역변환을 사용하고 나머지는 raw와 함께 보류한다.

`ObservationReceipt.taskProfile/sourceImageSHA/nativeWire`, `AnalysisJob.taskProfile/observationReceipts`가 권위 타입이다. 숫자 job의 receipt/profile/request/reader/input은 commit 때도 일치해야 한다. 후보가 없는 작업도 receipt를 조회할 수 있다. B1은 [별도 수정](../b1/manifest.json)으로 보존했고 이번 patch에 중복 포함하지 않았다.

## 고정 파일·준비 입력

[manifest](manifest.json)에는 **17파일(제품10·도구4·검사3)**의 정확 pre/post SHA가 있다. [patch](integrated.patch)와 [동결 파일](files/)을 함께 반환한다.

- delta post-map SHA: `267ec202f95c758e47c1c051c368628ec89a01b5a36f9d537bb3b8a38fed0560`
- patch SHA: `ea3388ef7893780a5aea67ee285d389084676438938f1d72619ba5503f1acc28`
- 이전 28파일 중 해제하지 않은 16파일, B1, D1/D2 보고서·D2 raw, 정의 index, GT/frame/기존 프리뷰 12파일 SHA를 대조했다. 비대상 변경 0.

소유 모델 PID **97187**은 재시작하지 않았다. 실제 args/시작 receipt로 image-min1024 설정을 확인했다. private config에는 그 receipt의 위치 메타데이터만 추가했고 생성 설정은 바꾸지 않았다. 실제 이미지 token 수·Metal 전체 메모리는 UNKNOWN이다.

**N1/N2는 준비만 완료, 실행 0.** [최종 준비 v2](number-comparison-prepared.json): 고정 원본·GT·frame 불변, B0 `1008×808 / 19 panels / inputSHA 600cba209027d2c24cce4832e5e9a88e5f2e16974ddb2d76d2ec84af9c9d2743`. 전체 값/위치 분모18, source center의 unique panel 포함18. 이는 기하 포함 수이며 변환 후 가독성은 UNKNOWN이다. 이전 private v1은 보존했고 v2에서 schema envelope 이름에 따른 body SHA만 정정했다. [실제 LocalReader body 생성 대조](body-verification.json)는 fetch를 전송 전에 가로채 두 prepared SHA와 정확 일치했다(네트워크 전송0·모델0). GT 값/개수/frame/panel은 모델 본문에 들어가지 않는다. 다음 실제 작업은 새 세션 ID·epoch·CAS를 다시 고정하고 별도 실행 카드가 필요하다.

프리뷰 **51328 / PID10016 / exec83343**은 같은 private Store로 유지한다. 새 합성 세션·job은 [프리뷰 기록](../compact-preview.json), GT용08493 세션은 불변이다. 추가 재시작하지 않았다.

전체 suite/build는 최종 통합 단계에 남긴다. 한 사진의 D2 숫자 성과를 전체 보드·120게임 성능으로 확대하지 않는다. backend/source 동결 및 파일 소유권을 감독에게 반환한다.
