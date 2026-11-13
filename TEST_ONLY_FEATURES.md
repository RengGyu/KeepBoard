# 테스트 전용 기능 목록

사용자 요청(2026-11-10): 테스트 편의를 위한 임시 기능이다. 사용자가 테스트 모드를 모두 지우라고 하거나 실제 출시하기 전에 아래 기능과 연결 코드를 제거한다. 개발 환경 전용이어도 제거 대상이다. 일반 자동화 테스트 전체를 삭제하라는 의미는 아니다.

## saved-response-review — 격리된 실제 앱 검수 서버

- 2026-11-13 가독성/기존 5종 확인용 CLI: `docs/restoration-readability-generalization-20261113/sol2/{fixtures.mts,serve-five.mts}` 및 `supervisor/serve-three.mts`.
- 제품 runtime·운영 route에 연결하지 않는다. 새 임시 Store에서 기존 답만 재생하며 provider/외부 fetch를 차단한다. 실행 중 URL은 해당 task manifest에 기록한다.
- 테스트 모드 전체 제거/실제 출시 전에는 수동 검수용 CLI와 실행 중 검수 서버를 제거·종료한다. 원래 제품 renderer·값 편집기·일반 회귀 검사는 유지한다. 캡처/완료 보고서는 과거 검증 자료로 보관할 수 있다.

## clipboard-photo-paste — 클립보드 사진 붙여넣기

- 상태: 개발용 구현 완료. `clipboard-photo-paste` 식별자로 찾는다.
- 용도: 테스트 이미지를 복사한 뒤 보드 화면의 테스트 영역에서 Cmd+V / Ctrl+V로 추가한다.
- 활성 범위: Vite 개발 환경에서만. 운영 빌드에는 UI와 붙여넣기 핸들러를 포함하지 않는다.
- 처리: 클립보드 이미지 파일을 기존 사진 업로드·저장 경로로 전달한다. 판독 승인·provider 설정을 변경하지 않는다.
- 제거 파일: `src/testOnly/ClipboardPhotoPaste.tsx`, `tests/clipboard-photo-paste.test.ts`. `tests/fixtures/testOnlyViteEnv.mjs`는 마지막 DEV 전용 검사가 없어지면 함께 제거한다.
- 제거 연결: `src/SessionWorkspace.tsx`의 `ClipboardPhotoPaste` import, `TEST_ONLY_CLIPBOARD_PHOTO_PASTE` 상수·DEV 조건 JSX. 공통 `addGalleryFiles`는 일반 사진 추가가 사용하는 경우 유지한다.
- 확인: 집중15검사·전체 타입·production 빌드 통과. production JS11파일에서 테스트 기능 식별자·UI 문구가 제외됨을 확인했다. Chrome 개발 화면의 영역 노출은 확인했으며 실제 OS 클립보드→저장 완료는 미검증이다.
- 검증 기록: `docs/test-clipboard-20261110/`.

## photo-reading-flow — 임시 판독 예외 제거 완료

- 2026-11-11: 임시 로컬 4종 allowlist를 공통 제품 복원 정책·저장 의도 경로로 대체했다. 현120종의 기술적 지원이며 실제 정확도 승인을 뜻하지 않는다.
- 제거됨: `server/testOnly/photoReadingFlow.ts`, `src/testOnly/usePhotoReadingTest.ts`, capability endpoint·API 소비·DEV 판독 override·`KEEPBOARD_TEST_MODE` 조건. 실행 중 남아 있는 해당 환경변수는 더 이상 제품에서 소비하지 않는다.
- 제품 흐름: 사진 추가 → 기존 저장 → 판독 → 그림/정정 → 저장·재개. 테스트 모드 전체 제거 시 이 공통 제품 기능은 제거하지 않는다.
- `tests/test-photo-reading-flow.test.ts`는 현재 제품 저장/판독 회귀 검사이므로 임시 모드 삭제 대상으로 취급하지 않는다. 이전 임시 서버 검사는 제품 정책/HTTP 검사로 대체됐다.
- 붙여넣기 편의 기능은 위 clipboard 항목대로 개발 전용으로 남긴다. 실제 출시 전 제거 조건은 유지한다.
- 변경 기록: `docs/restoration-implementation-20261111/{contract.md,sol1/README.md,sol2/README.md}`. 과거 임시 모드 기록은 `docs/test-reading-flow-20261110/`에 보존한다.


## mobile-result-share — 외부 모바일 결과 확인 화면

- 현재 제품 렌더러를 번들해 저장된8게임 결과·7W4분할 원관측을 확인하는 owner-private Sites `/current/`. 루미큐브는 가로 배열, 다른 게임은 원사진 테두리 선택값을 표시한다. `findings.html`은 감독 시각 대조 오독5곳이다. 새 판독·서버저장은 제공하지 않는다.
- 2026-11-12 추가: `/boards/`는 기존 `GameBoardRecord`·아트로 사그라다/세븐 원더스/로스트 시티 저장본을 표시한다. 사그라다는 같은 응답의 주소 교정 후 오프라인 재생이다. `/audit/`는 기존8장 오독/해상도·7W117상자/무작위20대조·신규8회 모드/부분 판독 실측이다. 사진 원문·전체 provider 응답을 새 자료로 복사하지 않고 필요한 사진 대조·요약만 게시한다.
- 제품 소스에 별도 runtime 연결 없음. 소스/출력은 `/Users/jeonggyuju/Downloads/KeepBoard-mobile-review-20261111/`의 `review-entry.tsx`, `review-latest-entry.tsx`, `dist/current/`, `dist/findings*`, `dist/previous-current/`, `dist/game-art/`. 구현/실측 보조 스크립트는 `docs/remaining-validation-20261112/supervisor/`에 기록했다.
- 추가 제거/보관 대상: 같은 체크아웃의 `boards/`, `dist/boards/`, `dist/audit/`, 선택3게임용 `dist/game-data/` 및 해당 진입 링크. 새 검토 소스/보조 자료는 `docs/latency-placement-20261112/{sol1/boards-source,supervisor}/`다. 다른 기존 화면에서 쓰는 공용 `dist/game-art/`는 사용처를 확인하고 보존한다. 제품의 조기 값·위치 진단·선택 영역 재판독은 일반 기능이므로 임시 모드 제거 대상이 아니다.
- 테스트 모드 전체 제거 또는 실제 출시 전: 이 결과 공유 경로·진입 링크를 제거/보관 처리한다. 실제 제품 `RummikubBoardView`, `PhotoLayoutBoard`, `drawingLayout`와 공통 회귀 검사는 제거하지 않는다.

- 2026-11-12 추정 복원판 후속: 같은 Sites `/boards/`는 현재 제품 추정 구조·face값·원사진을 비교한다. 정정 시험은 메모리 안에서만 수정하고 재열기 때 원본으로 돌아간다. `/estimated/`는6회 강도 비교·CSV·원사진/복원 캡처다. 테스트 모드 전체 제거/실제 출시 전 `dist/estimated/`, 해당 root 진입 링크·이전 root 보관본, `docs/estimated-board-20261112/sol1/boards-source`의 공유 복제본을 제거/보관한다. **제품의 estimatedBoardStructure/EstimatedBoardView/structureOverride·공통 정정/보존 검사는 일반 기능이므로 제거하지 않는다.**
