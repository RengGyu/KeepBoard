# 정지 보드 영상 프레임 추출

API 호출 0, 제품 수정 0. 미디어는 /private/tmp/kb-static-multiview-20261101 에 보관.

- Risk: https://mixkit.co/free-stock-video/risk-board-in-a-game-seen-up-close-5335/
  공개 720 다운로드에서 0.5, 2.5, 4.5초 원 프레임 추출. 카메라가 옆으로 이동하며 보이는 기물 배치는 표본에서 유지된다. 전체 구간의 모든 가려진 기물 불변까지 인증한 것은 아니다. 5초 이후 주사위/손 이동이 있어 제외. 부분 판, 얕은 초점, 제한된 공통 시야라 전체 판 정확도 평가용은 아니다.
- Chess: https://mixkit.co/free-stock-video/cinematic-shot-of-a-wooden-chess-49721/
  0.5, 2.5, 4.5초 추출. 기물 정지, 카메라 후퇴. 옆 각도 변화보다 거리 변화가 중심이며 어두움/가림이 있다.
- Catan: https://github.com/PBalewski/CATAN-video-tracking/blob/main/input_data/medium1.mp4
  샘플링했지만 고정 시점과 주사위 이동이라 다각도 정지 상태 비교에서 제외.

Risk와 Chess 각 3장 연락표 및 원 프레임과 SHA는 임시 폴더 manifest.json 참조. 같은 동영상에서도 기물이 움직이거나 편집되면 같은 저장 상태로 합치면 안 된다. 이번 시각 검수는 인식 성능 측정이 아니다.
