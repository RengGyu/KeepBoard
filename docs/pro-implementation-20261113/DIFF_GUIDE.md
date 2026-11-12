# 꼭 볼 변경 세 곳

1. `shared/estimatedStructureSafety.ts::estimatedAttachmentForest`
   - 이전: A↔B는 표시할 맨 위 실물이 없어 둘 다 사라지고, A→B→C는 C가 빠질 수 있었다.
   - 이후: 저장 관계는 그대로 두고 표시용 관계만 분리해 각 실물이 한 번씩 선택된다. 다른 기록 영역의 동명 ID를 같은 실물로 취급하지 않는다.
   - 근거: `tests/pro-attachment-ui.test.ts`, `tests/estimated-structure-safety.test.ts`.

2. `shared/structureRelations.ts::resolveStructureAnchor`
   - 이전: 가장 가까운 판 중심이 소속을 대신했다.
   - 이후: 같은 사진·소유 범위·epoch·정의에서 확인한 판 연결, 관측 관계, 유일 영역, 연결요소를 먼저 사용한다. 거리는 후보 정렬에만 쓴다.
   - 핵심: 미연결을 줄였다는 것과 위치가 맞는다는 것은 다르다. 원사진에 판이 더 있어도 응답에 없는 판을 자동 생성하지 않는다.

3. `src/EstimatedBoardView.tsx::EstimatedPlacementControls`와 `server/engine.ts::answerField`
   - 사용자는 원사진 네 모서리·판/묶음을 한 번 정정한다. UI는 검증된 참조를 기존 저장 값에 넣는다.
   - 서버가 기록 ID를 교체하더라도 살아 있는 같은 실물의 관계 참조를 유지한다. 삭제·다른 출처 참조를 새 대상으로 옮겨 붙이지 않는다.
   - native 위치 수정은 충돌하는 구조 override만 해제/비활성화하며 값·메모·원사진을 지우지 않는다.

흐름: 원관측·사진 출처 → 검증된 판/실물 관계 → 추정 평면 표시 → 필요한 묶음 정정 → 기존 저장·재열기. 모호하면 원문을 보존하고 미확정으로 표시한다.

짧은 개발 영어: `anchor` 기준판, `reference` 참조, `scope` 범위, `unknown` 미확정. “Keep the original value.” “Check the source.” “The piece stays visible.” 이번 변경을 설명한다면: “We keep the original data. We fix the board links. Unknown links stay unknown.”

확인 질문: 잘못 붙은 카드 수가 줄어도 미연결이 늘 수 있는데, 왜 두 수를 따로 봐야 할까요?
