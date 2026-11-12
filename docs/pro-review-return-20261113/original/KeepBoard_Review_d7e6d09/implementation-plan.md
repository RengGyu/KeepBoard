# 구현 작업 카드

기준 커밋: `d7e6d098116659b727dae50a8ae204b1ab566aae`

**P0-01·02는 최소 패치와 격리 검사를 제공한다. P1은 수정 계약과 알고리즘 원형이며, 원앱 통합이나 실제 사진 성능을 확인한 구현본은 아니다.** 사진 대조는 이번 리뷰의 미완료 항목이다. 아직 없는 사진 정답표를 구현자가 검증된 fixture로 사용하면 안 된다.

## P0-01 — 다른 기록 영역의 수동 기준판 연결

**직접 확인한 문제**

`shared/estimatedBoardStructure.ts`의 수동 override 검사에서 `same()`은 `assertionId === a.id`를 요구한다. 자동 추정의 `extra`는 같은 원사진의 다른 assertion에 있는 판을 참고하므로, 자동으로 연결할 수 있는 판을 수동 정정에서는 미연결로 처리할 수 있다.

**파일·함수**

- 수정: `shared/estimatedBoardStructure.ts::estimateBoardStructure`
- 추가: `shared/estimatedStructureSafety.ts::resolveEstimatedReference`
- 추가: `tests/estimated-structure-safety.test.ts`

**구현 계약**

현재 사용자에게 허용된 live 기록만 입력한다. 같은 field와 evidence의 기존 수동 연결은 유지한다. 다른 field의 참조는 두 대상 모두 검증된 동일 `sourceKey`를 가져야 한다. 삭제된 대상, 후보가 여러 개인 ID, 다른 사진·소유자·epoch·정의에는 연결하지 않는다. 기존 receipt 검증을 완화하거나 모델이 수동 override를 생성하게 하지 않는다.

노드 수집이 끝난 뒤 수동 참조를 검사한다. 유효한 대상이 하나일 때만 연결 수에 포함한다. 원관측 값·ID·geometry는 변경하지 않는다. **`patch/minimum.patch`에 포함했다.**

**완료 기준**

관련 helper 7개 사례가 통과해야 한다. 원앱에서는 `board.scene`과 `cards.scene`에 나뉜 같은 사진의 판을 선택 → 저장 → 재열기하여 연결·값·원 ID·메모가 유지되는지 확인한다. 후자의 통합 검사는 이번에 실행하지 못했다.

## P0-02 — 부착 관계 때문에 물체가 화면에서 사라지는 문제

**직접 확인한 문제**

`src/EstimatedBoardView.tsx::roots/renderWithAttachments`는 A↔B 순환에 root가 없고, A→B→C에서는 자식을 일반 `render()`로 그려 C를 누락한다. 원 데이터 삭제가 아니라 표시 경로의 누락이다.

**파일·함수**

- 수정: `src/EstimatedBoardView.tsx::roots/renderWithAttachments`
- 추가: `shared/estimatedStructureSafety.ts::estimatedAttachmentForest`

**구현 계약**

파생 표시에서만 순환 연결을 분리하고 경고한다. 저장된 override는 보존해 수정 가능하게 한다. 재귀 렌더로 여러 단계의 부착물을 표시한다. 다른 field에 있는 대상은 외부 연결로 표시하고, 현재 물체를 숨기지 않는다. **`patch/minimum.patch`에 포함했다.**

**완료 기준**

flat·chain·self·cycle·cycle-child·cross-field·입력 불변 등 8개 helper 사례가 통과해야 한다. 실제 화면에서 A·B·C가 각각 한 번 표시되고 순환 대상도 선택·정정할 수 있어야 한다. helper 검사는 실행했지만 실제 브라우저 렌더는 미실행이다.

## P1-01 — 판별 scope·좌표계·관계 어댑터

**파일·함수**

- 추가 제안: `shared/structureRelations.ts::qualifiedAnchorRef/resolveBoardFrame/collectVisibleRelations`
- 수정: `shared/estimatedBoardStructure.ts`의 `Node` 및 그룹 생성
- 재사용: `drawingProjection.ts::photoDrawingReference`, `StoredSpatialPiece`, `SpatialBoardInstance`, `SpatialRelation`

**입출력 계약**

검증된 현재 `DrawingItem + assertions + evidence`를 받아, 판 단위 frame과 범위가 명시된 anchor 참조를 만든다. 실제 응답에 있는 board instance는 live piece가 아니어도 참조할 수 있다. 없는 판을 게임팩 지식만으로 생성하지 않는다.

**알고리즘**

수동·정식 관계를 우선하고, 같은 원사진의 관측 관계를 결합한다. 중심 거리만으로 소속을 확정하지 않는다. 명시 관계가 충돌하면 후보를 남긴다. 실행 가능한 기하·부분순서 원형은 `analysis/relation_core.py`에 있다. 이 원형은 판 자체를 검출하거나 의미 있는 코너를 알아내는 모델이 아니다.

**완료 기준**

사진과 판을 함께 평행 이동·회전해도 판 내부 관계가 변하지 않아야 한다. 서로 다른 판의 같은 색 묶음은 분리한다. scope가 다른 대상은 합치지 않는다. 삭제된 anchor를 receipt에서 되살리지 않는다. 원본 값은 불변이어야 한다.

## P1-02 — 로스트 시티의 편·색줄·버림·순서

**파일·함수**

- `estimatedBoardStructure.ts::estimateBoardStructure`의 lost-cities 분기
- `estimatedGeometry.ts`의 판 국소 좌표 및 편 구분
- `EstimatedBoardView.tsx`의 편·순서 라벨

**교체할 조건**

사진 중앙 `(0.5, 0.5)`로 near/far를 결정하는 조건을 제거한다. 버림 그룹 키에 기준판 참조를 포함한다. 숫자 오름차순을 실제 사진 순서 복구 알고리즘으로 사용하지 않는다.

**새 계약**

그룹 키는 `[sourceKey, qualifiedAnchorRef, role, laneKey]`다. 판의 중심선과 관측 방향 기준으로 A/B를 정의하고 사람 소유자는 별도로 관리한다. 관측된 `before`·겹침 관계로 부분순서를 만든다. 화면 정렬 순위와 실제 카드 순서가 미확정인 상태를 구별한다. 버림 더미는 윗장과 실제 묶음 보존 조건으로 처리하며, 가려진 아래 카드를 읽으려 하지 않는다.

**완료 기준**

공동 이동 후에도 side A/B가 유지되고, 두 판의 blue-discard가 합쳐지지 않아야 한다. 투자 카드는 여러 장 허용한다. `[3,4,5,6,8,10]`을 증가·중복 규칙만으로 추가8 오류로 표시하지 않는다. 9/6/8의 실제 판정은 원사진 대조 전까지 유보다.

## P1-03 — 사그라다의 창문·역할·트랙·토큰

**파일·함수**

- `estimateBoardStructure`의 sagrada 분기
- `EstimatedBoardGroup`에 `slotBasis` 구분
- 기존 spatial definition 연결 및 `EstimatedBoardView` 트랙 표시

**창문**

창문 부품이 누락됐을 때 같은 epoch의 검증된 observed board instance 또는 명시적으로 등록한 frame만 재사용한다. 없으면 해당 판의 외곽·방향을 한 번 정정한다. low의 `draft.scene`을 window로 일괄 변경하지 않는다. lattice가 18개를 배정했다는 사실로 사진상 18주소가 맞다고 확정하지 않는다. 전체 행·열 누락 시 원점이 불분명하다는 기존 한계도 유지한다.

**트랙·토큰**

인쇄 주소와 관측 band 순위를 구분한다. AABB 10등분을 실제 라운드 번호로 표시하지 않는다. 같은 완료 라운드에 여러 주사위가 놓일 수 있다. 사용한 favor, 미사용 favor, 점수 표식, 역할 미상을 구분하며, 도구와 겹치지 않는 토큰을 모두 오류로 보지 않는다.

**완료 기준**

window·track·draft 혼합 반례에서 영역이 섞이지 않고, 같은 트랙 칸의 복수 주사위가 보존돼야 한다. 미사용 토큰을 도구에 억지로 부착하지 않는다. 사진 기준 행·열·역할 정답을 확보한 뒤에만 실제 위치 개선을 주장한다.

## P1-04 — 세븐 원더스의 판 소속과 묶음

**파일·함수**

- `nearAnchor`를 사용하는 seven-wonders 분기
- `SpatialPlacement.boardInstanceRef`와 `StoredSpatialPiece.relations`를 소비하는 공통 어댑터
- 기존 7W cluster 렌더러는 유지

**결정 순서**

1. 범위가 검증된 수동·정식 판 연결이 있으면 사용한다.
2. 관측 관계와 노출된 겹침 띠에서 물리적 연결 요소를 만든다.
3. 판 국소 방향의 tableau·단계 아래·동전·군사 영역과 대조한다. 최근접 중심은 후보 정렬에만 사용한다.
4. 두 판의 근거가 충돌하면 연결 요소를 미확정으로 남긴다. 원사진과 판 후보를 함께 보여 주고 묶음 소속을 한 번 정정한다.
5. 단계 아래의 뒷면 카드를 일반 tableau로 바꾸지 않는다. 카드 색과 사람 소유자는 별개다.

**완료 기준**

중심 거리 반례, 서로 다른 판 크기, 공동 이동·회전, 두 판 경계, 같은 색의 여러 줄에서 ID·값을 보존해야 한다. 사진에서 판별·색별·기타 토큰·경계 사례 20개 이상을 직접 대조한다. 이번 묶음에는 그 사진 정답 fixture가 없으므로 이 카드는 완료가 아니다. `101/117`만으로 올바른 소속을 인증하지 않는다.

## P1-05 — 정정·이동·삭제·재열기 우선순위

**파일·함수**

`EstimatedPlacementControls::patch`, `GameBoardRecord`의 native 위치 수정, `estimatedStructureOverride.ts::validateStructureOverride`, `genericRecord.ts`의 저장 검증. `saveIntent.ts`와 `runtimeResume.ts`는 기존 흐름을 보존한다.

**계약**

v1 저장본을 계속 읽는다. 범위가 명시된 참조가 필요한 새 정정만 v2로 기록한다. native 위치를 수정할 때 충돌하는 구조 위치 override만 비활성화하며 값·메모·owner는 유지한다. 모델은 수동 값을 생성하거나 변경할 수 없다. anchor 삭제 시 관계를 미확정으로 남기고 가까운 다른 판으로 자동 이동시키지 않는다.

**완료 기준**

저장 중 새 응답, 재저장, 재시도, anchor 삭제, epoch 교체에서도 수동 값·메모·원 ID가 보존돼야 한다. 미확인 관계가 있어도 저장할 수 있어야 하며, 저장 성공과 위치 정답을 혼동하지 않는다.

## P1-06 — 공정한 대응·채점

**파일**

`analysis/match_observations.py`, `tests/test_matcher.py`. 기존 실험 채점 경로에 연결할 때 같은 대응 규칙을 사용한다.

**계약**

같은 사진의 기하를 일대일로 대응한 뒤 색·종류·값·역할을 채점한다. 색이나 출력 ID가 다르다고 같은 실물을 탈락시키지 않는다. 넓은 묶음 박스, 중복, 겹침 모호성을 별도로 남긴다. 수량과 앞뒷면은 저장 구조의 실제 필드에서 읽는다. 같은 live ID의 상충 기록은 첫 값을 임의 채택하지 않는다.

**완료 기준**

14개 matcher 검사 통과. 미검토 GT는 기본적으로 채점을 거부한다. 부분 GT로 사진 전체 누락·허위 수를 계산하지 않는다. 미대응은 값 오독과 다르게 집계한다. 현재 `ground-truth.json`은 미검토 원장이므로 정확도 평가에 사용할 수 없다.

## P2-01 — 표시 밀도·필요 필드·모델 강도

**표시**

`art(p,true)`의 공통 compact 경로가 이미 연결돼 있으므로 일괄 재작성하지 않는다. 실제 화면의 다른 경로에서 반복 빈 라벨이 확인되면 그 경로만 수정한다. 카드명이 없는 것과 효과·실물 식별이 불가능한 것을 구분한다.

**판독**

`terraGameReader.ts`, `terraCompact.ts`, `spatialWire.ts`, `hostedObservation.ts`는 필요한 관계가 실제 응답에서 빠지는 원인이 확인될 때만 좁게 수정한다. 숨은 카드명이나 더미 아래 값을 요구하지 않는다. 새 기본 모델·강도 전환은 하지 않는다. 조건부 비교는 `experiments.md`에 명시한 범위와 금액 상한 승인 후에만 실행한다.

**완료 기준**

사진상 값·위치·누락을 함께 비교해 high/medium을 결정한다. 첫 HTTP 미리보기와 첫 유용한 값의 DOM 표시를 구분한다. 30초를 필수 통과선으로 사용하거나 사용자 동의 없이 제품을 색·개수 기록 수준으로 축소하지 않는다.

## 원앱에서 합치기 전 확인

이번 묶음은 전체 저장소가 아니다. 다음 검사는 미실행 상태로 남아 있다.

- `estimated-board-structure.test.ts`, `estimated-board-ui.test.ts`, `structure-followup-ui.test.ts`
- `restoration-save-intent.test.ts`, `restoration-save-resave-ui.test.ts`
- 같은 사진의 값·배치·메모·소유 범위에 대한 저장 → 재열기 비교
- 390px·넓은 화면 렌더, 실제 iPhone Safari의 확대·선택·정정

새 디자인 전체가 아닌 **P0 최소 패치만 먼저 적용 검토**하고, 나머지는 각 카드의 근거와 완료 기준에 따라 분리한다.
