# 공개 실물 영상 선별기 예비 검사

## 실제 실행

현재 `src/scanQuality.ts`를 그대로 가져와 공개 카탄 영상 2개를 250ms 간격, 192×108 RGBA 샘플로 시간순 재생했다. API 호출0·제품 수정0. 원본 영상/프레임은 private tmp에만 보관한다. ffmpeg 샘플링/리사이즈는 실제 브라우저 Canvas·휴대폰 실행과 차이가 있으며 CPU 수치는 실제 폰 성능이 아니다. 선별 후 업로드 성공은 즉시 완료로 모의했다.

|자료|길이|검사 프레임|선택|선택 시점|선별 함수 평균|
|---|---:|---:|---:|---|---:|
|근접 실물 영상|13초|52|3장|1.0·6.5·12.0초|0.63ms|
|위쪽 실물 영상|15초|60|2장|5.5·8.5초|0.35ms|

## 사진을 직접 보고 확인한 한계

- 근접 영상은 얕은 초점으로 숫자/뒤쪽 부품이 흐리고 전체 판이 안 보인다. 같은 영역 사진3장이 선택됐다. 전체 화면 선명도 점수를 통과해도 필요한 작은 정보를 읽을 수 있다는 보장이 없으며, 배경 손/실물 이동 때문에 중복으로 판정하지 못할 수 있다.
- 위쪽 영상은 전체 판이 보이나 게임 진행 중 손과 부품이 움직인다. 같은 전체 영역2장을 선택했다. 실제 손으로 멈춘 판을 훑는 스캔 성공률로 볼 수 없다.
- 두 영상 모두 실제 카탄 영상이라는 예비 자료이며, 같은 정지 상태의 전체→근접 handheld scan을 대체하지 않는다. 장면 선별 함수가 작동하는 것은 확인했지만 영역 커버리지/상태불변/작은값 판독 성공을 인증하지 않는다.
- 선택된5장은 API로 보내지 않았다. 인식 정확도/영상 종단30초를 측정하지 않았다. 임계값을 이 두 영상에 맞춰 조정하지 않았다.

## 출처

- [근접 영상 원출처 Mixkit 목록](https://mixkit.co/free-stock-video/cards/?page=14), 취득 미디어의 공개 다운로드 페이지 [DesktopHut](https://www.desktophut.com/es/Stock-Video-Detailed-Shot-Of-A-Board-In-A-Game-Of-Catan-Live-Wallpaper-For-PC). 해당 파일 실제1280×720·13초로 확인(페이지의1920표기와 다름). 사용권 독립 검증은 하지 않았으므로 미디어 재배포 없이 비공개 검사만 했다.
- [Friends playing Catan sitting at a table — Mixkit](https://mixkit.co/free-stock-video/friends-playing-catan-sitting-at-a-table-5333/), 공개720파일. 원페이지는 Mixkit Stock Video Free License 표시.
- Wikimedia의 Catan Seafarers 설명 영상도 검토했으나 직접 다운로드403으로 취득하지 않았다. 우회하지 않았다.

원본 파일·선택 장면 연락표: `/private/tmp/kb-public-scan-video-20261028/`. SHA·선별 사유별 수량은 [result.json](result.json). 재현 스크립트 [replay.mts](replay.mts).
