# Pro UI 구현 인계

**VERIFIED — 소스 동결.** P0 부착 표시, qualified 관계/판 기준 정정, 기존 위치 편집 우선순위를 기존 renderer와 저장 callback에 연결했다. 유료 호출·새 agent·commit·Site·배포·전체검사·build 실행은 0이다.

- `shared/estimatedStructureSafety.ts`: live evidence/source를 확인하는 참조 resolver와 표시용 attachment forest 두 helper. legacy 문자열의 같은 record 링크는 유지하고, qualified 참조는 같은 record도 검증된 동일 source가 필요하다. self/cycle은 저장 원문을 지우지 않고 표시에서만 끊으며 chain과 다른 field 연결 실물을 숨기지 않는다.
- `src/EstimatedBoardView.tsx`: 모든 부착 단계의 원 ID 선택, qualified 판 이름, LC 관측편 A/B, 미확정·부분 순서와 상대 band/인쇄 칸 구분. 수동 줄의 판 소속·부분순서·부착은 `referenceRecords`/`boardContexts`를 소비하고 현재 field만 변경한다. `sourceKey` 생성이나 사용자 좌표/JSON 입력은 없다.
- 원사진 네 모서리 탭으로 semantic TL/TR/BR/BL frame을 기존 v2 override에 보존한다. 사그라다 창문은 **주사위 4×5칸 격자 외곽**이며 장식·전체 판 외곽이 아님을 표시한다. shared adapter가 같은 실제 판에 이를 공유한다. AABB를 코너로 바꾸거나 UI에서 geometry를 추론하지 않는다.
- `src/GameBoardRecord.tsx`: native 칸/위치·회전/반사 정정이 이전 구조 override에 가려지지 않게 v1은 해제, v2는 `active:false`로 보존한다. readout/수량/coverage만 바꿀 때는 구조를 유지한다. 구조 편집물은 native와 동시에 중복 표시하지 않는다. 원사진 진입은 기존 검증된 receipt geometry를 재사용한다.
- `src/estimated-board.css`: 선택 경로를 유지한 다단계 부착·기존 photo frame 정정 표시만 추가. compact art는 변경하지 않았다.

## 직접 검증

`focused-tests.log`: **22/22 PASS**, 실패/skip 0. 실행 명령과 파일별 SHA는 [freeze.json](freeze.json), 정확한 자기 delta는 [sol1-delta.patch](sol1-delta.patch), 시작 원본은 `preimages/`에 있다.

검사: self/cycle/chain/cross-field 매 ID 1회 표시·선택·원문 불변; qualified 동명 ID와 다른 source 차단; 줄 전체 판 정정/현재 field 제한; 부분순서·relative band; 4tap frame·busy guard·창문 안내; frame callback→JSON 재열기→shared 실제 판 기준 소비; null/0/readout 보존; native spatial/slot 변경의 v1 해제·v2 비활성 및 구판 경로.

`npx tsc --noEmit -p docs/pro-implementation-20261113/sol1/tsconfig.json`: **exit 0**. `git diff --check` 소유 파일: **exit 0**.

## 남은 검수

- 브라우저·실제 터치, 통합 전체 테스트/build, 저장 HTTP 회귀는 감독/Sol2 담당이다. React handler와 shared JSON 재투영 검사는 실제 화면/위치 정확도 인증이 아니다.
- readonly 공유 화면의 임시 수정은 기존 host의 메모리 `onChange` 경로를 사용한다. 이 변경은 실제 readonly 저장 권한을 열지 않는다.
- 관측 판/출처가 없는 항목은 새 판을 만들지 않는다. frame/관계 미확정과 순환은 원문을 유지한 채 미확정으로 남는다.
- `PROJECT_CONTEXT.md` 통합 갱신에 사용할 제품 상태는 위 VERIFIED 항목이다. 해당 공통 문서는 감독 통합 소유로 이 패키지에서 수정하지 않았다.

## 판 후보 라벨 후속 — VERIFIED

이름/면을 읽지 못한 판도 선택지에서 구분하도록 `boardContexts`의 같은 source·qualified ref에 대응하는 실제 `sourceRegion` 중심으로 `사진 위쪽·왼쪽` 등의 위치와 `판 후보 N`을 붙였다. 사진 안 위치 설명이며 소유·판 방향을 확정하거나 좌표/원관측을 바꾸지 않는다. 기존 option의 qualified ID와 저장 payload는 유지한다.

추가 직접 검사: 이름·면이 미상인 실제 계약의 7W 후보4개 라벨 구분·선택 ID/원값 유지 포함 **7/7 PASS** (`board-label-followup-tests.log`), 범위 tsc **exit 0**. 최초22검사는 이전 freeze에 보존되며 전체 suite/build는 재실행하지 않았다. 최초 인계는 `freeze-before-board-label-followup.json`/`sol1-before-board-label-followup.patch`, 최종 SHA와 합산 delta는 기존 `freeze.json`/`sol1-delta.patch`다. 변경 제품 파일은 `src/EstimatedBoardView.tsx` 하나이며 직접 테스트 한 파일을 보완했다.

## 명시 판 선택의 역할 영역 후속 — VERIFIED

`estimatedBoardAnchorCorrection(placement,anchorRef)`를 같은 field/group의 각 placement별로 소비한다. 알려진 역할 제안이 있는 미분류 항목만 명시 판 선택 때 해당 영역으로 함께 저장하며 역할 미상/판 선택 해제는 승격하지 않는다. 직접 handler→JSON 재열기에서 tableau/placed증가/미분류감소/선택ID·원값·sourceKey·groupId·순서 보존과 기존 잘못 저장된 override 재선택을 확인했다. 후속 **9/9 PASS**, 범위 tsc **exit0**. [상세 근거](role-area-followup.md). 새 API/전체suite/build/commit/deploy는0. 이전 동결은 `freeze-before-role-area-followup.json`과 `sol1-before-role-area-followup.patch`에 보존했다.
