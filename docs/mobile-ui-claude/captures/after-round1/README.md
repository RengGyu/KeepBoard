# Round1 after — 실제 CUA 화면

합성 전용4410, own tab738444407. 실제 로드 JS CYyX5V9R / CSS VdwxpSl7. 값 수정·업로드·실AI·제품 소스 변경0. viewport1920×992 원복.

- 홈390 scrollHeight3212→3021. 첫 보드 article top543.03375px. before의 약y730은 이미지 추정이며 정확한 DOM 차이로 주장하지 않는다.
- 후보 모달390 scrollHeight1118→975, 열린 문서 scrollY542. 제목·닫기가 보인다. 닫기44×44 중앙 hit가 자체path이고 contains=true.390/360 모두 실제 클릭으로 닫혔다.
- 적용 기록: 상단 저장 없음/저장 버튼 총1. 헤더 행동 라벨 보임. 카드 수정의 대표 그림 select0. 빈 판은 한 줄 안내, 카드 선택 후 surface높이238.664px로 펼쳐짐. 값 수정/저장은 안 했다.
- Rummikub 두 번째 줄이 y약749에서 시작해 y774 이후 저장바에 일부 가림. 두 줄 한눈보기 완료로 판정하지 않음. 이 fixture는14타일 시험이 아니다.
- Wingspan PIN 잠금 표시 유지. PIN 입력·해제는 안 했다. 기록한390/360 화면의 document 가로 넘침0. 실제 터치/가상 키보드/320/저장·복원 검수는 미수행.

## 저장 오류 정정

초기 after의 metrics.json은 빈 배열이고 JPG는 before 경로에 잘못 저장됐다. 재사용 REPL helper가 이전 경로/배열 참조를 유지한 것으로 추정한다. 새 브라우저 검사를 하지 않고 실제 CUA 출력에 있던10상태 실측값을 metrics.json에 복구했다. 실제 저장된 after JPEG10개를 before 경로에서 바이트 그대로 복사하여 이 폴더에 넣었으며, 절대경로·bytes·SHA는 files.json에서 확인할 수 있다. 이미지 편집/재생성0.

그 과정에서 before 일부 이미지가 덮였다. 원본 home은 메모리에 남은 JPEG로 복구했고 이전 SHA와 일치한다. 원본 후보 stable390 등 총7개는 이전 SHA와 일치,8개의 원본 before JPEG는 복구하지 못했다. 목록은 ../before/CORRECTION.json. 해당8개 경로의 현 이미지를 before 근거로 쓰면 안 된다. 원래 before를 직접 본 tool 이미지/실측과 로컬 파일 보존 상태를 구분한다.
