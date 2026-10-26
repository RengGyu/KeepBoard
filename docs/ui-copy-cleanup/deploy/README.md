# 설명 정리 UI production 배포

VERIFIED: https://keepboard-kappa.vercel.app · 2026-10-22 08:16 KST 공개 검증.

- deployment `dpl_4whhd9TNKdqu1AmB9WP9CKQxRqLf` · READY/production · CLI65 deploy exit0
- 고정 URL https://keepboard-ljh2rzukf-renggyus-projects.vercel.app
- stage `/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-copy-production-58mlfu3r` · 541 files / 25797162 bytes
- 기존 Vercel 프로젝트 연결/인증/터널 라우트 그대로, 검증한 dist를 clean prebuilt static으로 복사. 아트배포 zip 제외. src/server/docs/PDF/.keepboard/.env/설정/Store/키 미포함.

[자산 hash·API 직접검증](verification.json) · [clean static manifest](static-manifest.json) · [공개390 모달](production-dialog-390.jpg)

홈/JS `index-tKFbzYPI.js`/CSS `index-Culbj5Hp.css` 200·MIME 정상·SHA256 dist 일치. health200/catalog200·120종. public settings는 configured/provider/model만 whitelist로 읽어 `true / gemini / gemini-4-argon` 확인. 기존 설정·라우팅·백엔드·프록시·터널·gateway 변경/재시작 없음.

Chrome CUA390 공개 새판→게임 검색 루미→루미큐브 선택 실제 확인. 중복 지원설명 줄이 없고 게임/판본/지원표시·기록 이름·플레이어·기록 시작 버튼 유지. page overflow0. 사용자 목록·기존 기록 내용을 출력하지 않고 최종 증거는 모달 bbox만 저장. 공개 보드 생성/수정/AI 호출 없음. viewport reset.

키없는4399 합성 2개에서 루미큐브 공용/PIN설정 전·카르카손 기록/보관조건/위치저장·재열기/축약복원영역을 실제 검수했다. [자세한 수행·한계](../verification/README.md). 실제 손가락·휴대폰 가상키보드와 실AI 미확인. 기존 Mac backend/proxy/tunnel이 계속 켜져 있어야 하는 호스팅 조건은 동일.

소스 추가수정·test/build 반복·git commit/push 없음. 파일 소유권 반환.
