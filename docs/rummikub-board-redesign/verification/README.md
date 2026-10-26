> **최종 compact 후속 수정:** [compact-handoff.md](compact-handoff.md) 및 [rack-compact-390.png](rack-compact-390.png). 최종 소스/빌드/14타일 최초화면 결과는 이 후속 기록이 우선한다.

# 루미큐브 제품 통합 검수

VERIFIED · 2026-10-22. 목업4400이 아닌 실제 built React 앱4401을 Chrome CUA로 검수했다. 프런트/제품 소스의 실제 실패가 발견되지 않아 추가 제품수정 없음. 기존 Claude 프런트 + Sol2 backend 작업을 보존하고 동결/소유권 반환.

## 명령과 exit

- `npm test` · **exit0 / 237/237** → [tests.log](tests.log). 처음 sandbox 실행은 tsx IPC listen EPERM으로 시작 전 실패; 승인된 실행에서 키 환경변수 제거 후 전체 suite1회 정상 완료. 실제 AI는 로컬 모의만.
- `npm run build` · **exit0** (tsc --noEmit 포함) → [build.log](build.log). `index-C_-jlA7V.js` / `index-DsE_7zu4.css`.
- `node --import tsx docs/rummikub-board-redesign/verification/preview.mts` · output session35735 / 새 loopback4401 유지. fresh tempStore·키/AI env 제거·임시 cwd에서 server import. [실제 fixture 정보](preview.json).
- 합성 PIN API fixture setup200, currentPin 없는 해제403 → [pin-fixture.json](pin-fixture.json). 사용자 PIN/자료 접근0.

## 실제 브라우저 조작

프리뷰: http://127.0.0.1:4401/?session=6d988a9f-2407-4f16-a3f4-2b7d8f2bbc34

- 390 공용판: 한 면의 묶음/13타일 run·4색·조커 표시. 320/390 모두 페이지 가로overflow0/broken img0. 13타일 묶음은 안에서 줄바꿈, 순서 그대로.
- `크게 보기`→축소100%→확대150/200/300% 실제 클릭. 300% pan clientWidth354/scrollWidth1080; native 가로 wheel로 scrollLeft0→390 확인. 핀치/손가락 제스처는 검증하지 않았다. 세로 pan은 CSS·범위 구현 확인이며 native 세로 동작을 별도로 기록하지 않았다.
- 개인 하나 탭: 공용 개요＋자기 두 줄14타일. 다른 owner의 `다른 사람 고유 줄` 미노출. PIN 미설정 상태에서 받침대 스캔/개인 사진 추가 버튼 표시·enabled, 숫자 편집 가능. 실제 카메라는 켜지 않음.
- 첫째 줄 클릭→body portal 편집 모달→첫 빨강1 선택→13으로 변경→완료→상단저장→reload. 첫 타일 빨강13 및 자기14타일 유지. 완료 후 다른 사람 랙/이어갈 기록·보관 블록 없음. portal 부모 BODY, 모달 위로 뒤쪽 받침대/타일이 올라오지 않음을 실제 screenshot 확인.
- PIN은 browser credential 생성 정책에 따라 UI에서 새로 입력해 설정하지 않고, 명시 합성 API fixture로0007 설정. reload→잠김/DOM랙0/촬영버튼없음 확인. 기존 합성PIN0007을 실제 UI에 입력→열기→14타일/촬영버튼 복원. 현재PIN 없는 해제403은 합성 API에서 확인했고, 잘못된 currentPin·보호분리·기존legacygreen 보존은 위 전체 suite의 기존 회귀가 통과했다.
- viewport reset 완료.

## 제품 화면 캡처

[공용판390](public-390.png) · [공용개요＋내랙390](rack-390.png) · [편집모달390](edit-390.png)

## 정적/SSR와 미확인 구분

긴 raw analysisSummary·GameEssentials 미표시, 기존 green 그대로의 색/표식, 새4색만 선택, 오래된 candidate보다 새accepted 우선은 rummikub-board-ui 4개를 포함한 suite 결과와 소스 대조 근거. `다시 읽기`는 configured+현재영역사진 조건으로 남아 있는 소스를 확인했고 이 keyless/no-photo fixture에서 실AI 버튼을 실행하지 않았다. 사용자 원본/실AI 정확도/카메라/실폰 키보드/Safari/실제 손가락은 미확인. PIN 설정 폼의 credential 생성 완료 클릭은 미수행(API setup과 UI unlock을 분리). 운영API/UI에는 아직 이 변경을 배포하지 않았고 기존 프로세스/라우팅/모델 불변.

## 이번 직접 변경 파일

제품소스/기존tests 변경0. `docs/rummikub-board-redesign/verification/preview.mts`, `preview.json`, `pin-fixture.json`, `tests.log`, `build.log`, 위3 PNG, 본 README만 작성. build가 dist를 갱신했다. 원명세120/아트437는 건드리지 않았다. 운영반영은 감독 별도 승인 후.
