# 모바일 picker / tabs 실제 브라우저 검수

VERIFIED · 2026-10-22 · Chrome CUA · 합성 keyless http://127.0.0.1:4398/ 만 사용. 제품 소스 변경 없음. 기존 프로세스 유지. 뷰포트 override reset 완료.

## 실제 수행

- 390×844 새 보드: 기록 이름 `[검수 합성] 모바일 선택`, 1번 이름 `검수 하나` 작성 → 검색 `루미` → Enter는 루미큐브 선택만 하고 모달 유지/생성 없음.
- 재열기 → 결과 없음 `없는게임zz` → Enter에도 생성 없음. Escape 1회 검색어 초기화/120목록, 2회 picker만 닫힘/모달·초안 유지, 3회 모달 닫힘.
- `카탄` 검색→CATAN 결과 클릭→재열기→`루미` 검색. 이름/플레이어 초안 유지, 현재 선택은 결과를 누르기 전까지 유지.
- 검색 ArrowDown→첫 결과 focus, 첫 결과 ArrowUp→검색 focus. 목록 120개, 내부 높이340/scrollHeight7724, overflow-y:auto. picker 주요 버튼 최소높이44px.
- 최종 새 모달에서 `[검수 합성] 판본 생성`·검수 하나·루미큐브 선택 후 **기록 시작을 한 번** 눌러 아래 합성 세션 생성. API로 이 새 기록만 읽어 고정 pack/version/이름 확인. 원시 HTTP request body를 캡처한 것은 아니며, 저장된 결과와 createRequest 직접 경로를 대조한 검증이다.
- 6인 긴 이름 보드: native 가로 wheel로 마지막 민준 탭까지 이동→실제 클릭→aria-selected=true, 활성 탭 bbox x279.24..379.84/폭390 안. PIN 설정화면 표시, PIN 입력/설정·개인자료 변경 없음.
- 탭 위 native 세로 wheel로 페이지 scrollY 0→126.5. 그 위치에서 가로 wheel 후 scrollY126.5 유지, 내부 scrollLeft619. scrollTop 쓰기/합성 DOM event 없음.
- 전체 화면 폭320/360/390/430/1440에서 page overflow0/broken image0. 탭 overflow-y:hidden 및 scrollHeight-clientHeight=0 전부 확인.

## 합성 생성 결과

- session `4e72b6c6-48c4-4359-9f9b-6edfef1ce585`
- gamePackId `rummikub`, gamePackVersion `1.0.0-essentials-1.fb4be402632a`
- catalog edition `Classic 기본 세트`, version 동일. players `[검수 하나, 파랑, 흰색]`.
- 생성 API 읽기 명령 exit0. 첫 sandbox localhost GET은 EPERM으로 실패했고 승인된 네트워크 실행으로 재확인했다.

## 화면 증거

[picker390 검색](picker-390.jpg) · [picker390 전체목록](picker-390-list.jpg) · [picker1440](picker-1440.jpg) · [공용390](tabs-390-public.jpg) · [마지막탭390](tabs-390-last.jpg) · [탭1440](tabs-1440.jpg)

## 범위·한계

FAILED material UI 조건 없음. 실제 손가락 스와이프/휴대폰 가상키보드/물리 휴대폰 Safari는 미확인. native wheel·Chrome viewport·키보드 검수를 실제 터치라고 주장하지 않는다. 탭 선택의 scrollY0 보존과 가로 스크롤 시 비영점 scrollY 보존을 각각 확인했으며, 모든 콘텐츠 높이 변경에서의 세로 위치를 전수 검증하지 않았다. 전체 tests/typecheck/build는 이 읽기 검수에서 반복하지 않았다(227/pass는 앞 작업 보고). 사용자 운영 기록·사진·설정은 검수하지 않았다. 생산 배포는 후속 명시 승인으로 별도 수행, ../deploy/README.md 참조.
