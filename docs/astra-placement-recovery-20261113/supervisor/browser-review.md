# 최종 실제 화면 확인

Chrome DevTools MCP로 현재 제품 `GameBoardRecord`와 기존 아트/정정 renderer를 빌드한 로컬 viewer를 확인했다. 실제 iPhone Safari·물리 터치는 미검증이다.

- 844×390, 390×844에서 사그라다 medium/low, LC baseline, 7W baseline의 게임 전환·기존 실물 선택·같은 ID 표시를 확인했다. 1440×900에서 사그라다를 확인했다.
- 실물 버튼은 각각42/41/42/117개, ID 중복0. 사그라다20칸에서 r2c2/r2c5는 빈칸이다. low에는 판·역할 미확정 안내가 있고 실제 연결 수와 구분한다.
- LC의 색 모름 카드2개는 원래 blue/white 줄에 들어가고 선택값의 색은 `?` 그대로다. 가로 스크롤은 scrollLeft0→90(max92), 페이지 전체 가로 넘침은 없다.
- 7W는74/117 집계, 기존117개 모두 선택 경로에 있다. 4개 판 묶음과 미연결 묶음을 구분한다.
- 정상 로딩 후 깨진 이미지·페이지 alert·console error0, 요청200/304. 초기 local preview의 `/game-data/`404는 제품 변경 없이 선택3게임 root 경로 alias를 제공해 해결했다.
- 브라우저 MCP의 직접 파일 저장은 workspace-root 제한으로 거절됐다. 반환된 PNG를 그대로 저장했다. 게임 select는 option의 표시 문구로 선택했고, mobile→desktop emulation의 reload 후 사그라다 화면을 다시 확인해 실제 게임 이름으로 캡처를 보관했다.

이 viewer는 기존 응답을 실제 제품 renderer로 표시한다. 새 사진 판독·운영 서버 저장을 실행한 앱 배포가 아니다. HTTP 정정/commit/재개는 별도 임시 Store 검사3/3에서 확인했다. 광범위 시각 회귀·접근성·Web Vitals PASS를 주장하지 않는다.

캡처는 [screenshots](screenshots/)에 있다. 소스와 입력 pin은 viewer의 `source.json` 및 [verification.json](verification.json)을 따른다.
