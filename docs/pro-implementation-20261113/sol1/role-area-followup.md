# 판 소속·역할 영역 동반 정정 후속

- UI 변경: `src/EstimatedBoardView.tsx`가 `estimatedBoardAnchorCorrection`을 직접 import한다. 명시 판 선택의 기존 write를 묶음 각 placement별 callback으로 실행한다. 같은 현재 field/group만 수정하며 v2/sourceKey/groupId/순서/원값을 보존한다. 역할 추론·게임별 분기·새 geometry는 UI에 추가하지 않았다.
- 최초 RED: 판을 골라도 `areaId=unclassified`인 실제 handler 실패(`role-area-followup-red.log`).
- 1차 GREEN: fresh known-role→판 선택 후 tableau, placed 0→2, 미분류 2→0, 원 ID/선택 유지. 역할 미상·선택 해제는 unclassified 유지. 관련 9/9 PASS + 좁은 tsc exit0 (`role-area-followup-tests.log`, `role-area-followup-typecheck.log`).
- 저장된 옛 오류 경계: 기존 q가 unclassified+anchorRef 상태로 저장되면 shared manualChecks가 suggestedAreaId를 제공하지 않아 같은 판을 다시 골라도 분류가 복구되지 않음. UI에서 역할을 재구현하지 않고 공유 계약 보완을 감독에게 전달했다. 직접 RED는 `role-area-saved-followup-red.log`. 이후 Sol2의 shared suggestedAreaId 메타 보완을 소비해 이 저장본 재선택 경계도 GREEN으로 확인했다. 원 q는 명시 선택 전까지 자동 변경하지 않는다.

최종 GREEN/동결 상태는 `freeze.json`의 후속 revision과 최종 로그를 기준으로 인계한다. 전체 suite/build/Chrome은 감독 담당, 이 작업의 새 API/commit/deploy는 0회.

**최종 VERIFIED:** fresh/기존 저장 오류 재선택 모두 포함 후속9/9 PASS, 범위 tsc exit0, diff-check exit0. 소스 재동결. 실제 Chrome 동일 자료 재검수/통합 build는 감독 담당이다. 변경 제품 파일은 `src/EstimatedBoardView.tsx` 하나, 직접 테스트는 `tests/pro-structure-controls-ui.test.ts` 하나다.
