# 통합본 실제 화면 검수

**VERIFIED:** Chrome의 자기 새 탭 `738444402`만 사용했다. 최종 합성 preview는 **http://127.0.0.1:64188**. 운영/사용자 보드는 열지 않았고 제품 수정·배포·실 AI 호출은 0이다. 390×844에서 검사 후 viewport를 **1920×992 기본값으로 reset**했다.

|구간|직접 수행 / 결과|근거|
|---|---|---|
|Splendor|촬영 안내 → 사진 읽기 클릭 → 바로 로비 → 목록에서 재진입. 초기 카드 영역이 비어 있어도 다른 영역 후보가 노출되고 미적용 안내 표시|실제 UI; 최종 preview job 1개 completed|
|후보 정정|미귀속 토큰 후보를 사용자가 개발 카드로 정정. 점수0/보너스파랑/비용 `null,0,6,null,null`/수량3 입력 → 완료 → **이 후보 적용**|[편집 화면](splendor-edit-390.jpg)|
|저장/재열기/복원|보관 위치 입력, 별도 위치 저장 없이 상단 저장 → reload → 해당 영역 선택 → 공개 저장 기록 복원. 카드와 위치 유지, packed/restored 자동 완료 안 됨|[저장 카드](splendor-saved-390.jpg), [보조 API 대조](splendor-api-after.json); snapshot typed 값 exact|
|Catan|부분 촬영 안내/원본 탭 직접 확인. **시작만 API 승인 대체** 후 로비 이탈·재진입, 실제 19타일/도로/마을/도둑 후보 확인 → 첫 타일5→8 수정 → **반영** → 상단 저장 → reload|[실제 제품 배치](catan-saved-board-390.jpg), [보조 API 대조](catan-api-after.json); job1/snapshot exact|
|표시 after|동결 `GenericPieceArt`/`GameComponentArt`/`artResolver`를 import한 격리 React renderer로 8 die 분류와 Wingspan 비교. 8개 모두 큐브형, Wingspan 먹이는 동일 베이지·행동 큐브는 각 소유색|[실제 마운트 캡처](display-after-390.jpg), [renderer 메타](renderer-preview.json). 제품 전체 여정/눈 값 검증은 아님|
|반응형/console|Splendor/Catan 각각 390,320에서 document width=viewport width, broken image0. 격리 renderer390 overflow0/12 SVG/준비·실패0|[콘솔](console.json). 최종 preview와 renderer warn/error0|

**구분할 한계/인계 사건**

- 최초 63646에서 모의 분석1회/후보 편집까지 했으나 적용 때 연결이 끊겼다. 감독 확인: Sol2의 정적 preview 전환으로 해당 서버가 종료된 인계 사건이며 앱 background job 실패로 세지 않는다. `splendor-guide-390.jpg`/`splendor-reentry-candidate-390.jpg`는 이 **초기 HMR 참고 캡처**, 최종 dist 근거가 아니다. 기존 HMR websocket 오류4개도 따로 기록했다.
- CUA `fileChooser.setFiles`는 “enable Allow access to file URLs” 오류. extension 설정은 바꾸지 않았다. Catan 사진 추가 UI 업로드는 **미검증**, 승인된 기존 합성 1px 원본으로 API job 시작202/queued만 1회 수행했다. 다른 단계는 UI 조작이다. 카메라 촬영·실제 사진 정확도는 미검증이다.
- 최종 preview 모의 분석 **2회**(Splendor UI1/Catan API1), 초기 중단 preview UI1을 포함하면 이 카드 전체 **3회**다. 실 AI0. 모델 retry는 없었다. 800ms mock이므로 화면 이탈의 정확한 순간이 running인지 별도 캡처하지 못했고, 재진입에서 completed 작업과 중복 없는 후보를 확인했다. 장시간/서버 재시작은 이 UI 카드에서 재현하지 않았다.
- Catan 부분 선택 시 내부 영문 geometry 설명 노출을 직접 발견했다([수정 전](catan-guide-390.jpg), `PhotoCaptureGuide.tsx:6`의 selected.instruction). Sol2가 좁게 교정했고 **새 빌드 reload/부분 선택에서 한국어 안내 및 영문 제거를 직접 확인**했다([수정 후](catan-guide-after-copy-390.jpg)). 발견 내용만 전달했으며 Sol1 제품 수정0.
- 문구 교정 빌드가 같은 snapshot/dist를 갱신한 두 번째 인계 사건이 있다. 기능 여정은 **JS `index--AYP2-3w.js`**에서 통과했고, 이후 기능 전체를 반복하지 않았다. 문구 교정 후 **`index-oIYMddFK.js`**는 HTML/JS/CSS exact hash와 실제 안내 표시만 확인했다. [이전 해시](preview-assets.json) / [문구 수정 후 해시](preview-assets-after-copy-fix.json)를 분리했다. CSS는 `index-u-JBb3AS.css` 동일.

최종 관측 source digest는 `f782590735b2d8115af3fc94ccee846228e9c89319c19a5a6f9dd42d653e737d`다. 이는 src/server/shared/gamepacks/public/tests **1118파일의 정렬 JSON SHA 맵**을 SHA256한 본 검수 방식이며 Sol2의 별도 release manifest digest와 혼동하지 않는다. 기능 검수 후 차이는 PhotoCaptureGuide/SessionWorkspace/관련 UI test 3파일로 기록했다. 검수는 전체 588/type/build 재실행을 포함하지 않는다. 기존 통과 보고와 실제 UI/API 증거는 별개다.

최종 JS SHA `aae56eab81da713e1bdee88628e8ba512297849f5f1d16412ea61986ef267dfc`, CSS SHA `98c2cb1719e7ec34b23dac6b8e3afd5abf31c5472d8933506bfb138fd66b7b35`. 자체 임시 renderer 서버만 종료했으며 64188 preview 및 기존 프로세스는 유지했다. 변경/증거 파일과 캡처 SHA는 [verification.json](verification.json). 파일 소유권 반환. 운영 반영은 별도 A3 카드 대기.
