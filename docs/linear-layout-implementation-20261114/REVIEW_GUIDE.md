# 짧은 코드·화면 안내

## 이번 수정이 다루는 문제

판독 응답에 이미 있는 위치·관계가 전체 복원판으로 전달되지 않아 일반 카드가 모두 한 줄로 표시됐다. 이번 작업은 그 소비 경로를 연결한다. 새 사진을 읽거나, 빠진 칸·소속을 임의로 채우는 작업과 구분한다.

흐름: 저장된 원관측 → 출처·scope·현재 실물 검증 → 장면의 역할·관계·부분순서 → 기존 위치/판/지도 표시기 → 근거가 부족하면 사진의 여러 줄 배열.

## 꼭 읽을 diff 세 곳

1. `shared/sceneDisplay.ts`의 `resolveSceneDisplay`: 표시 경로 선택. 기존에는 일반 그룹이 격자·슬롯 없이 일자 행으로 갔다. 이제 유효한 저장 위치·정식 칸·typed map·구조를 먼저 사용한다. 자산이 없거나 근거가 부족한 경우 사진 배열/미확정으로 남긴다. 자산 로딩이 원기록을 바꾸지 않는 것이 핵심이다. 근거: `tests/scene-display.test.ts`.
2. `shared/sceneProjection.ts`의 `reconcileSceneSelections`: 구조 갱신과 수동 정정 재연결. 이전 그룹을 무조건 덮어씌우면 다른 실물까지 역할이 바뀌거나 낡은 순서가 남을 수 있다. 현재 실물과 결정의 적용 범위를 검증하고, 적용할 수 없는 결정은 이유와 함께 보존한다. 근거: `tests/linear-scene-refresh.test.ts`, `tests/linear-scene-refresh-http.test.ts`.
3. `src/RestorationSceneView.tsx`의 `renderPart`: resolver가 고른 경로를 기존 표시기에 연결한다. 원래 실물의 assertionId/pieceId를 유지해 선택하면 기존 편집기가 열린다. 판정 불가를 새 판·소유자·장수로 채우지 않는다. 근거: `tests/scene-display.test.ts`와 감독의 실제 앱 8종 캡처.

## 사용자 확인

- [사진·서비스 나란히 보기](comparison/README.md)에서 원래 사진의 여러 줄·묶음과 비교한다. 특히 하나비·아줄·카르카손·도미니언이 긴 한 줄을 벗어났는지 확인한다.
- 실제 앱에서 실물 하나를 선택하면 같은 실물의 기존 상세 수정이 열리는지 확인한다.
- 사진 배열은 실제 칸·더미·판 소속 확정과 다르다. 모르는 위치까지 정답처럼 채우지는 않는다.

## Development English

단어: `layout` 배치, `source` 원근거, `relation` 관계, `fallback` 대체 경로, `preserve` 보존하다.

업무 표현: “Use the saved position.” / “Keep the original value.” / “This relation is unknown.”

“The view now uses the saved positions. Cards can follow the photo rows. Missing board links stay unknown.”

확인 질문: 왜 사진의 여러 줄로 표시됐다는 사실만으로 실제 칸 복원까지 완료됐다고 말할 수 없을까요? 원한다면 위 변경을 영어 두세 문장으로 설명해 볼 수 있습니다.
