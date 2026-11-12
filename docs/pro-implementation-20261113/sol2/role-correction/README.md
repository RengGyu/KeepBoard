# 명시적 판 정정의 역할 영역 동반 저장

**VERIFIED:** `unclassified`는 역할도 불명인 경우와 판 소속만 모르는 경우를 구분하지 못했다. 실제7W sample `scan-dde571aebc873e6a7990d15417ce`는 원관측 `age-cards / city`지만 판 정정 후에도 areaId가 미분류로 저장돼 연결 수가 증가하지 않았다.

`shared/estimatedBoardStructure.ts`만 제품 변경했다. optional `suggestedAreaId`를 placement/group에 제공한다. 역할이 명시된 원 sourceArea/field만 사용하며 종류만 같다는 이유로 제안하지 않는다. LC의 모순된 discard/expeditions 역할도 제안하지 않는다. 자동 areaId/placed/소속은 그대로이며 실제 판 선택 전에 상태를 승격하지 않는다.

UI는 공유 `estimatedBoardAnchorCorrection(placement,anchorRef)`가 반환하는 `{areaId,anchorRef,anchorPieceId}`를 기존 수동 v2에 합친다. non-null 명시적 선택과 역할 제안이 함께 있어야 unclassified를 제안 영역으로 옮긴다. 역할 미상·선택 해제는 영역을 승격하지 않는다. 묶음은 각 placement에 적용한다. 판 검증·sourceKey·ID 재식별·기존 guard는 유지했다. src는 편집하지 않았으며 Sol1 연결은 감독에게 인계했다.

검사:

```sh
npx tsx --test tests/estimated-board-structure.test.ts tests/structure-relations-http.test.ts
npm run typecheck
```

- 최초 신규 직접 회귀 RED(`red.log`) → GREEN(`green.log`). 최종 집중 **33/33 PASS**(`focused.log`), 타입검사 exit0(`typecheck.log`).
- city/tableau와 wonder-area/stages 제안, 역할 없음의 미제안, 선택 해제 비승격을 검사했다.
- 실제 고정7W case를 격리 Store로 열고 sample의 미분류 줄→GIZAH 선택 helper→실제 PATCH→commit→GET→resume을 검사했다. 그 줄의 실물 수만큼 tableau/placed가 증가하고 unclassified가 감소한다. group 제목의 area도 tableau다. 원 rawreceipt·값·실물ID·region·owner 및 메모는 그대로다. 이 테스트는 사용자 선택을 저장하는 계약 검사이며 소속 정답률이나 새 API 성능 측정이 아니다.

이전 `sol2/freeze.json`·9사례 재생/입력은 보존했다. 이 후속의3파일 delta와 새 SHA는 `implementation.patch`/`freeze.json`이다. 유료 호출·키·원사진/GT 수정·src 편집·전체suite/build·commit/deploy는0회다. 전체 통합/Chrome 동작은 감독과 UI 소유자 범위로 남겼다.
