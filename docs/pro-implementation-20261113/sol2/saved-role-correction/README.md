# 저장된 미분류 override의 역할 제안 복원

**VERIFIED:** manualChecks 경로에서 출처와 참조가 유효한 manual/unclassified placement에만 기존 suggestedRoleArea 메타데이터를 붙인다. 그 그룹 전체가 같은 제안을 가진 경우 group에도 제공한다. 원 q/분류/집계를 자동 변경하지 않으며, 기존 명시적 판 재선택 helper만 영역을 승격한다. foreign/거절된 참조에는 제안을 붙이지 않는다.

제품 수정은 shared/estimatedBoardStructure.ts 두 곳뿐이다. 직접 backend 회귀1개를 추가했고 src/UI 테스트 파일은 수정하지 않았다.

```sh
npx tsx --test tests/estimated-board-structure.test.ts tests/structure-relations-http.test.ts tests/pro-structure-controls-ui.test.ts
npm run typecheck
```

신규 직접 회귀 RED→GREEN, 최종 **40/40 PASS**, typecheck exit0. Sol1의 실제 handler known-role 회귀(저장된 unclassified를 재열고 동일 판 재선택 포함)도 PASS다. 기존 HTTP PATCH/commit/reopen 및 source/원값/raw 보존 회귀를 함께 통과했다. UI 추가·provider·키·원문/입력/GT 변경·전체suite/build·commit/deploy0. 이전 동결은 보존하고 이번 두 파일 delta/SHA만 별도 기록했다.
