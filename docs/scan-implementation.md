# 훑기 → 사진 선별 → 한 번 판독 → 그림 보드

## 실제 경로

1. 촬영 CTA는 스캔 단계의 그림 편집기보다 먼저 표시된다. 전체 판을 비춘 뒤 영역별로 잠시 멈추고 마친다.
2. `CameraDialog`가 작은 로컬 샘플에서 움직임·선명도·노출·균일면·이전 확보 사진과의 근접 중복을 검사한다. 자동/직접 촬영 합계 최대 **6장**이다. 장수나 화면 변화로 전체 판의 커버리지·복원 완료를 단정하지 않는다.
3. 선택된 프레임은 별도 canvas에 실제 `videoWidth × videoHeight`로 JPEG(.94) 저장한다. 작은 선별 샘플을 확대 저장하지 않는다. 카메라 미리보기 프레임 해상도를 보존하는 것이며 센서의 별도 고해상도 스틸 촬영은 아니다.
4. 업로드 응답의 `createdEvidenceId`가 있어야 이번 run에 추가한다. 로컬 확보 즉시 대기 예약/지문과 장수를 반영하여 다음 선별을 재개하고, 서버 저장 성공 때만 성공 지문/ID로 확정한다. 전송은 별도 직렬 큐이며 실패 원본은 큐에 남겨 재전송한다. 성공+대기+실패 최대 6장, 대기 data URL 문자열의 UTF-16 추정 상한은 96MiB다. 직접 촬영은 자동 품질/중복 판정을 우회하지만 6장 제한은 유지한다.
5. 마치기는 모든 대기/진행 중 전송을 기다린다. 실패 원본이 있으면 자동 종료/분석하지 않고 재시도 또는 명시적 제외를 기다린다. run을 먼저 종료/분석청구 상태로 바꿔 중복 종료 이벤트가 AI를 다시 호출하지 못하게 한다. AI 연결 시 **이번 run에서 실제 저장한 1~6장만 한 번 공동 판독**한다. 사진별 모델 호출은 없다. 비연결 모드에서는 사진 저장·직접 입력만 제공한다. 예시 방에 새로 찍은 실사진도 연결 시 판독한다. 기존 예시 상태 버튼은 예시 SVG만 사용한다.
6. 실패해도 원본은 남는다. 결과 영역의 **같은 N장 다시 분석**은 마지막 batch의 정확한 ID·소유자·촬영 epoch·목적·관찰 지시를 재사용한다. 자동 재시도는 없다. 이 마지막 batch 기억은 현재 열린 화면의 메모리이며 새로고침 후 전용 재시도 목록은 유지되지 않는다. 일반 세션의 별도 전체 사진 분석 버튼은 이전 사진 포함 소유자 전체 범위를 명시하며 대량이면 기존 서버의 6장 단위 호출을 사용한다.
7. 다중 파일 업로드도 선택 batch의 처음 6장만 저장하고 해당 ID만 공동 판독한다. 파일 준비는 앞 사진의 전송과 겹친다. 읽기/전송 실패 파일은 화면에 보관하며 재시도하거나 명시적으로 제외한 뒤 성공 ID만 마무리한다. 메모리 한도에 닿을 때만 전송 완료를 기다린다. 업로드 사진에는 카메라의 자동 품질 탈락을 적용하지 않는다.

## 기기 내 선별

`src/scanQuality.ts`는 DOM 없는 순수 함수다. 가장 긴 변 192px 샘플의 정수 grayscale에 다음 연산을 적용한다.

| 항목 | 연산 / 현재 기준 |
| --- | --- |
| 노출 | 평균 명도 35~225, 암부(≤16)/밝은 부분(≥239) 비율 각각 ≤78% |
| 균일면 | 명도 표준편차 ≥10 |
| 선명도 | 상하좌우 4-neighbor Laplacian 분산 ≥80, 가장자리 제외 |
| 움직임 | 연속 동일 크기 샘플의 평균 절대 명도 차이 ≤5.5 |
| 안정 대기 | 1초; 움직임·품질 탈락·일시정지 시 다시 시작 |
| 촬영 간격 | 로컬 원본 확보 뒤 1.8초 · 안정 대기와 중첩 |
| 근접 중복 | 16×12 셀의 평균 제거 명도 차이 ≤8, 평균 RGB 차이 ≤26, 64-bit dHash 차이 ≤12%, 비율 차이 ≤.08 |

모든 이전 성공 사진과 전송 대기/실패 원본의 예약 지문을 비교하므로 A→B→A 재방문도 확인한다. 첫 프레임을 즉시 저장하지 않는다. 크기/배열 길이/픽셀 범위를 검사하고, 크기 변경 시 이전 프레임과의 motion을 비교하지 않는다.

이 값은 **실기기 보정 전 휴리스틱**이다. 고주파 무늬가 선명도로 통과하거나 비슷한 영역을 중복으로 제외할 수 있다. 작은 글자·숫자 판독 가능성, 초점 품질, 모든 시점의 동일 실물 연결을 보증하지 않는다. 직접 촬영·원본 확인 경로를 유지한다.

## 프레임 및 생명주기

- 지원 브라우저에서는 `requestVideoFrameCallback`의 새 decoded frame을 사용하되 main thread 연산을 최대 250ms 간격(약 4Hz)으로 제한한다. `mediaTime` 중복도 건너뛴다. 미지원이면 250ms timeout과 `currentTime` 변경 검사로 대체한다.
- pause, document hidden, pagehide, 정상 닫기, unmount에서 callback/timer 취소·track stop·`srcObject` 해제를 한다. 재연결에는 세대 번호를 써 이전 getUserMedia 결과를 폐기한다.
- 현재 세대의 video track `ended`는 일시정지와 연결 안내로 처리한다. 직접 촬영도 live track/현재 영상 readyState를 검사해 마지막 정지 프레임을 재사용하지 않는다. 사용자 stop으로 종료된 이전 세대는 오류를 만들지 않는다.
- 정상 닫기는 in-flight 저장 후 한 번 마무리한다. 강제 페이지 이탈/unmount는 카메라를 해제하지만 그 뒤 백그라운드 AI를 시작하지 않는다. 이미 서버에 도착한 사진은 보존된다.
- HTTPS/localhost, 권한 거절, 장치 없음, 재연결 안내와 업로드 대안을 제공한다. 원본 카메라 성공 여부는 실기기 검증이 필요하다.

## run 범위와 서버 계약

`src/scanBatch.ts`는 opening sessionId/ownerId/captureEpoch/purpose/instruction을 복사한다. 이후 view refresh나 탭 변화로 소유자가 바뀌지 않는다. `createdEvidenceId`로 찾은 실제 photo가 같은 owner/scope/epoch일 때만 batch에 넣는다. 최신 세션을 다시 조회해 기존 사진 전체를 분석 대상으로 고르는 경로는 제거했다.

evidence POST의 선택적 `expectedCaptureEpoch`를 서버 session 변경 직렬화 안에서 검사한다. 다른 기기가 재개해 epoch가 바뀌면 **이미지 저장 전 409**로 거절한다. analyze도 같은 선택적 epoch와 모든 요청 ID의 존재/복원 epoch를 검사한다. 불일치 시 조용한 새 epoch 재분류·일부 사진만 분석은 하지 않는다. 기존 크롭 등 옵션 없는 호출은 기존 계약을 유지한다.

## 공동 판독과 원본 관계

프롬프트는 같은 captureEpoch 사진을 하나의 정적인 상태의 여러 시점으로 설명한다. canonical hex/edge/vertex + 종류/층/owner로 같은 앵커의 동일 실물을 합쳐, 사진 수만큼 구성물이나 수량을 더하지 않도록 지시한다. 시점 변화에서 턴 이력이나 실제 이동을 추정하지 않는다. 부분 사진만으로 full coverage를 추정하지 않는다. 앵커가 없는 동일 삽화 카드·느슨한 조각은 외형만으로 병합하지 않는다.

현재 `ComponentScene`은 구성물마다 대표 crop **1개**와 그 source evidenceId만 지원한다. 복수 시점 crop 목록은 미지원이다. assertion에는 실제 사용한 모든 `evidenceIds`를 남기며 assertion region의 source는 첫 ID다. 모든 사진 원본은 별도 보관한다. 모델 결과는 후보로 추가되고 기존 사용자 accepted 값은 자동 덮어쓰지 않는다. 공동 판독의 실물 dedup 정확도는 모델 품질에 의존하며 이 변경에서 실모델로 측정하지 않았다.

## 공식 기술과 적용 범위

- [MDN requestVideoFrameCallback](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback): 실제 새 영상 프레임 callback. **적용**: main-thread 연산 throttle, 취소·fallback.
- [MDN Taking still photos](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Taking_still_photos): getUserMedia → video → canvas. **적용**: native video dimensions 원본 확보와 작은 선별용 canvas 분리.
- [OpenCV image filtering / Laplacian](https://docs.opencv.org/4.13.0/d4/d86/group__imgproc__filter.html): Laplacian 미분 연산의 공식 설명. **적용**: 연산 원리를 직접 구현한 작은 grayscale 고주파 지표. OpenCV 라이브러리를 넣거나 OpenCV의 모든 경계/커널 동작을 재현한 것은 아니다.
- [OpenCV ORB](https://docs.opencv.org/4.13.0/d1/d89/tutorial_py_orb.html): keypoint/descriptor 기반 매칭은 다른 단계다. **미적용**: ORB·호모그래피·정밀 시점 정합·연속 물체 추적. 현재는 conservative near-duplicate 선별 + bounded batch 공동 판독이다.
- `ImageCapture.takePhoto`, 상시 영상 AI, 새 라이브러리/서비스는 도입하지 않았다.

## 확인 근거와 남은 확인

- `tests/scan-quality.test.ts`: motion/dwell, blur/dark/bright/flat, near duplicate/revisit/새 영역, 저장 실패 시 예산 미소비·재시도, 6장 상한, 작은 입력/잘못된 입력.
- `tests/scan-batch.test.ts`: owner/epoch 고정, 정확한 성공 ID, 중복 finish 방지, 실패 뒤 동일 ID 보존, 예시/잘못된 owner/epoch 제외, 비연결 모드, 6장 제한.
- `tests/scan-api.test.ts`: 로컬 가짜 Gemini endpoint로 이전 사진·개인 사진을 제외한 실사진 6장 전송(예시 방 포함), 요청당 모델 호출 1회, 실패 원본 보존·같은 6장 재시도, 사용자 accepted 보존, epoch 변경 업로드/판독 거절, 누락 ID 거절. 외부 모델 호출 없음.
- 브라우저·실제 카메라·폰별 화질/성능·실제 AI 판독 정확도는 이 작업에서 확인하지 않았다. 감독이 최신 서버 프로세스를 재시작한 뒤 브라우저 검증한다.

### 감독 확인 (2026-10-20)

- `node --import tsx --test tests/scan-quality.test.ts tests/scan-batch.test.ts tests/scan-api.test.ts`: 9/9 통과, exit 0. 실제 외부 AI 호출 없음.
- 제공된 사진의 저해상도 픽셀을 선별 함수에 입력: A→B→A에서 두 장을 확보하고 재방문 A는 duplicate 처리. 카메라 입력이나 인식 정확도 측정은 아님.
- Chrome: 촬영 CTA가 그림보다 먼저 표시됨, LAN HTTP에서 HTTPS 필요 안내와 직접 촬영 비활성화, 0장 종료 후 사진 수 불변. 390×844에서 문서/스크롤 폭 모두 390.
- 새 API로 서버 재시작 완료. 확인용 HTTPS에서 최신 JS와 dist의 SHA-256 일치, 오래된 epoch 업로드 409, 확인용 빈 방의 사진 수 0 확인.
- 자동화 브라우저의 외부 trycloudflare 탐색은 ERR_BLOCKED_BY_CLIENT로 제한되어 로컬의 같은 빌드 화면을 확인했다. 외부 HTTP 응답 확인과 브라우저 렌더링 확인을 구분한다.
- 실제 휴대전화 카메라, 손으로 훑는 촬영, 실제 공동 판독의 정확도·토큰 사용량은 미측정이다.
- 화면: `docs/screenshots/scan-entry-mobile.png`, `docs/screenshots/scan-camera-unavailable-mobile.png`.
