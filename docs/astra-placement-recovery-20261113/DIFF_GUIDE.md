# 꼭 볼 변경3곳

## 1. 판 중복은 실물 중복과 다르다

파일: `shared/structureRelations.ts`, `collectStructureBoards`(40행).

전에는 같은 receipt의 live 판과 boardInstance가 alias 없이 중복 후보가 되어 모든 카드가 경쟁 판으로 막힐 수 있었다. 이제 같은 출처/receipt의 유일한 상호 기하 동치이고 방향·명시 연결 충돌이 없을 때 파생 alias만 연결한다. 실제 중복 live판이나 두 관측판은 합치지 않는다. [직접 회귀](../../tests/placement-recovery.test.ts)의 `one same-receipt live/observed board…`, `board alias matching rejects…`를 함께 읽는다.

## 2. 줄 소속을 추정해도 원래 색은 모름일 수 있다

파일: `shared/structureRelations.ts`, `inferDisplayLaneLabels`(85행), 소비는 `shared/estimatedBoardStructure.ts`의 `laneScopes`.

입력→같은 출처·판·편의 겹침 관계→유일한 관측 줄→표시 그룹. `suit:null`인 카드가 blue 줄에 표시돼도 원 readout을 blue로 바꾸지 않는다. 두 다른 줄이 경쟁하면 같은 색이라도 유보한다. `unknown read colors join only a unique same-board/side display band…`가 원값 보존과 회전·경쟁을 검사한다.

## 3. 그려지는 격자와 실제 판 주소를 구분한다

파일: `shared/estimatedBoardStructure.ts`의 anchor 없는 `displayHypothesis:'unanchored-grid'`(138행), `src/EstimatedBoardView.tsx`의 grid 표시/정정 경계.

전에는 판 관측이 없으면 반복 격자도 버렸다. 이제 기존 주사위로 상대 격자를 그리되 `anchorRef:null`, 미분류·미연결, 실제 배치 수 제외를 유지한다. `display-only lattice renders original dice…`가 표시/선택·원값·배치수·native/manual 우선순위를 검사한다. 실제 원사진 대조에서 low18칸의 표시가 일치해도 실제 판 연결0임을 확인했다.

## 짧은 흐름과 영어

사진 출처 확인 → 판 동치·역할·관측 띠 계산 → 추정 소속/표시 격자와 불확실성 분리 → 기존 평면 renderer → 같은 ID의 정정·저장.

핵심 단어: alias(다른 참조 이름), membership(소속), ambiguous(모호한), preserve(보존하다).

- Keep source values. — 원래 값을 유지하세요.
- Leave ambiguous links unresolved. — 모호한 연결은 미확정으로 남기세요.
- We merged duplicate board references. — 중복 판 참조를 연결했습니다.
- Unknown values stay unknown. — 모르는 값은 그대로 남습니다.

소유권 확인 질문: 색 모름 카드를 파란 줄에 묶어도 원래 `suit`가 null이어야 하는 이유는 무엇인가? 변경 내용을 영어2문장으로 설명해 보면 표시 추정과 관측값의 차이를 확인할 수 있다.
