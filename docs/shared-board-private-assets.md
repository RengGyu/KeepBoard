# 공용 보드 하나와 개인 보유 정보

2026-10-21. 사용자 정정: 같은 판을 공용/플레이어별로 보여주고 전환 중 늘어나는 것이 문제다. 앞선 모델 응답의 장면 단편 진단과 구분한다.

**VERIFIED — 원인:** `SessionWorkspace`의 형제 `SceneWorkspace`와 `CatanOverview`가 같은 `key={ownerId || 'public'}`를 사용했다. Chrome 합성 4인 세션에서 플레이어를 전환하자 오래된 보드 2개가 남고 자원 입력이 5→15→25→35개로 누적되는 것을 재현했다. key를 `scene:owner`/`assets:owner`로 구분한 뒤 같은 왕복에서 공용 보드1개, 각 개인 보드0개/보유 패널1개/자원 입력5개로 유지됐다. 개인 장면의 좌표 또는 보드 부품 추가가 개인 카탄 토폴로지를 열던 표시 경로도 별도로 막았다.

**변경:** 공용 탭은 보드·항구·도로·건물·도둑을 편집한다. 개인 탭은 자원/개발 카드(비공개 승점 포함) 수량을 바로 보여주며 남은 말·기존 별도 승점 기록은 더 보기로 유지한다. 개인 메모와 손패/개인 사진 추가를 유지했다. 개인 장면은 좌표가 있어도 사진/3열 묶음 카탈로그로만 표시하며 새 보드 부품 추가·배치 UI는 제공하지 않는다. 기존 개인 좌표·원본·후보·수량은 그대로 보존하고 수정 가능하다. 개인 원본에 공용 보드 사진을 대신 보여주지 않으며 개인 상태를 공용 장면에 합치지 않는다. 빈 개인 카탈로그는 만들지 않는다. 저장 데이터/API/AI 계약은 변경하지 않았다.

**VERIFIED — 회귀:** 새 4개 테스트는 3/4인 예시의 단일 공용 보드 표시 모드, 소유자별 사진/후보 분리, 과거 좌표/출처 보존, 개인 수정 후 공용 배치·다른 소유자 불변을 확인한다. 기존 저장·재개·스캔큐·공용 교환·즉시추가·목록 회귀도 함께 실행했다.

**VERIFIED — Chrome 390px:** 기존 합성 4인 세션 및 새 합성 3인 세션에서 모든 소유자/공용 탭을 반복 전환했다. 개인 화면 보드0/보유패널1, 공용 화면 보드1/개인카탈로그0, 가로 넘침 없음. 새 합성 개인 사진의 목재 후보3→4 수정/반영, 원본 영역 연결, 개인 보유 목재4·메모 저장 후 재열기를 확인했다. 이후 공용 구성물의 aria-label/위치 transform이 수정 전과 동일했다. 과거 개인 도로 좌표도 카탈로그에 남고 토폴로지는 없었다. 콘솔 오류·경고 없음, viewport 복구.

검증 URL: `http://localhost:4319/?session=0804f46a-f2f5-4225-a569-d1b29e4d643a&step=capture` (직접 만든 합성 3인 세션). [모바일 화면](screenshots/private-assets-mobile.png).

**미실행:** 실제 카메라/실제 AI/사용자 원본은 사용하지 않았다. 사진·후보는 합성 원본과 가져오기 API로 준비했으며 실제 손패 인식 정확도를 검증한 것은 아니다. 최신 정적 빌드만 기존 4319에서 확인했고 서버 재시작·배포는 하지 않았다.

변경 파일: `src/SessionWorkspace.tsx`, `src/SceneWorkspace.tsx`, `src/SceneEditor.tsx`, `src/CatanOverview.tsx`, `src/sceneWorkspaceModel.ts`(추가), `src/correction-workspace.css`, `tests/private-workspace.test.ts`(추가), 이 문서, `docs/screenshots/private-assets-mobile.png`. `dist/` 갱신. 스캔 큐·모델/서버·공유 저장 계약은 수정하지 않았다.

최종 검증: `npm run typecheck` exit **0**, `npm test` exit **0** (**125/125**), `npm run build` exit **0** (`index-DnUEBgKl.js`). 공용 도로 추가는 3탭으로 11→12개, undo 한 번으로11개 복구도 브라우저에서 확인했다. [개인 화면 상단](screenshots/private-assets-mobile-top.png)도 함께 저장했다(변경 이미지 파일에 추가).
