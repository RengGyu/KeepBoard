# 실제 Chrome 표시·정정 검수

격리 headless Chrome, 실제 Vite로 빌드한 현재 제품 `GameBoardRecord`/`EstimatedBoardView`를 사용했다. 기존9응답을 읽는 공유 호스트이며 새 모델·서버 저장 호출은 없다. native CUA 연결은 실패해 종료 요약을 남겼고, 설치돼 있던 로컬 Chrome DevTools CLI를 사용했다. 실제 iPhone Safari/물리 터치는 미검증이다.

## 확인한 동작

- 844×390 가로,390×844 세로의 실제 `innerWidth/innerHeight`를 확인했다. 세 게임 화면의 body 폭이 viewport를 넘지 않았다. 줄 안 가로 pan은 별도 컨테이너다.
- 사그라다 medium: 선택 버튼42개, 중복0, 깨진 이미지0. 4×5에 주사위18개와 빈칸2개를 표시했다. readout의 보라6을 선택해 기존 수정 modal로 진입했다.
- 창문 격자 안내를 열고 **원사진 DOM 위에 네 click 좌표**를 전달했다. 마커4개와 적용 버튼 활성화를 확인했다. 적용 후 grid18/전체42, 선택된 ID·색·눈 유지, alert0. 물리 손가락 탭을 자동화한 검사가 아니다.
- LC baseline: 선택 버튼42개, 원정·버림 역할 표시. 자동 연결16/42이며 미연결을 숨기지 않는다.
- 7W baseline: 선택 버튼117개·중복0·표시 그룹39개. automatic 연결33/117. 판 미연결도 종류·역할·색/stack별로 표시한다.
- 7W 판 후보4개를 이름과 **실제 사진 위치**로 구별한다. 이름 없는 두 판도 오른쪽 가운데/오른쪽 위로 구분된다. UI 사진 위치는 사람 소유/판 방향 판정이 아니다.
- 세 게임을 전환할 때 과거 선택을 비우고 해당 데이터를 다시 표시했다. 검사 시 console error0, 깨진 이미지0.

## 실제 화면에서 발견한 후속 결함

7W 사진 대조 index43인 `scan-dde571aebc873e6a7990d15417ce`를 선택해 GIZAH로 판 소속을 고쳤다. cluster는 GIZAH로 옮겨졌지만 areaId가 unclassified라 배치33/117이 그대로이고 미분류 집계와 모순됐다. 최초 전체1415검사·빌드가 이 사용성 결함을 잡지 못했다는 근거다.

이 결함을 Sol2의 역할 영역 제안·공통 정정 helper와 Sol1의 실제 판 선택 handler로 후속 수정한다. 후속 검수 결과는 아래에 추가한다.

**후속 VERIFIED:** 최종 공유 helper와 UI로 같은 index43을 다시 선택하고 GIZAH를 지정했다. 실제 DOM에서 배치 **33→34/117**, group 제목은 `판 주변 색별 카드`, 선택 cluster는 원 GIZAH ID, 전체117개·중복0·읽힌209/376·yellow 값 유지·console error0을 확인했다. 이미 저장된 manual/unclassified의 재선택도 직접 handler/HTTP 회귀로 확인했다. 원9사례를 바꿔 저장한 것이 아니라 browser-local 임시 정정이다. [정정 후 화면](screenshots/seven-manual-correction.png).

## 캡처

[사그라다 가로](screenshots/sagrada-landscape.png) · [세로](screenshots/sagrada-portrait.png) · [모서리 정정](screenshots/frame-editor.png)

[LC 가로](screenshots/lost-cities-landscape.png) · [세로](screenshots/lost-cities-portrait.png)

[7W 가로](screenshots/seven-wonders-landscape.png) · [세로](screenshots/seven-wonders-portrait.png)

가로 캡처는 첫844×390화면이며 화면에 안 담긴 영역 전체의 시각 품질을 인증하지 않는다. 자동 배치 수와 원사진 소속 정답 수는 별도다.
