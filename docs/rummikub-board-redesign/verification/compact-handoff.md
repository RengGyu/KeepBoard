# 390 첫 화면14타일 compact 후속 수정

VERIFIED · root 실제 캡처 리뷰 후 허용된 최소 수정. 제품 동결/파일 소유권 반환. 이전 README의 '제품수정0'은 최초 검수 단계이고, 최종본에는 아래3파일 수정이 포함된다.

## 변경

- `src/SessionWorkspace.tsx`: rummikub-session 클래스, 루미큐브 workspace 중복 새보드 제거(전역 새보드 유지), 촬영/사진 버튼의 짧은 시각 라벨. aria-label·handler·저장/촬영/개인범위 로직 유지.
- `src/correction-workspace.css`: max600px rummikub-session 내부에만 heading/actions/tabs/카드 간격 압축. actions44px, 루미큐브 타이틀21px, 버튼 가로배치. 다른 게임/전역nav 규칙 변경 없음.
- `src/private-pin.css`: 루미큐브 quiet 상태만44px 행과 작은 여백. 비밀번호 미설정 공유안내 원문·설정/변경/해제 절차 유지. 잠금/입력 패널은 그대로.

## 최종 확인

- 관련UI회귀 `node --import tsx --test tests/rummikub-board-ui.test.ts tests/rummikub-ui-save.test.ts tests/game-essentials-runtime-preservation-draft.test.ts` **exit0 /12/12** → compact-tests.log.
- `npm run build` **exit0** (tsc 포함) → compact-build.log. 최종 JS `index-lb7ziqWz.js`, CSS `index-D7OcWrAc.css`. 전체237은 compact 전 통과; 요청대로 반복하지 않았다.
- 기존 fresh4401는 재시작 없이 새dist 제공. 실제 Chrome390×844에서 reload·합성기존PIN0007 열기 후 **scrollY0**. 자기14타일 bbox 최대bottom652.37, 하단저장바top773.07 → 두 줄 모두 최초viewport안. [최종 개인화면](rack-compact-390.png).
- 상단4action 및 quiet 변경/해제 버튼 computed height44px(애니메이션 소수오차0.00002). 320px 페이지overflow0/14타일 유지.
- 최종빌드 크게보기150→200→300, native가로wheel scrollLeft0→390, 축소200→150→100 실제 클릭. 해당 fixture는300%에서도 세로overflow범위0이므로 세로pan 이동은 발생하지 않는 상태. 핀치/손가락 미검증.
- PIN합성 설정은 그대로 유지. 최종 reload 시 잠김·DOM랙0 재확인, 앞서 실제UI올바른PIN해제14타일 확인. 현재PIN 없는 해제는 앞선 합성API403+전체suite 계약. 비밀번호 생성 UI완료 클릭 미수행(APIfixture설정과 기존PIN UI열기를 구분).
- viewport reset. 같은4401합성프로세스 유지. 운영/백엔드/shared/pack/데이터원명세/아트/모델/route/배포/commit 변경0.

추가 실제사용자사진/AI/카메라/실폰 검증은 하지 않았다. 320에서14개가한viewport안인지까지는 수용범위가 아니며 페이지가로overflow0만 확인했다. 390 수용화면은 실제 캡처와bbox로 직접 확인했다.
