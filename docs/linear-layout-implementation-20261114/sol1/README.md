# C1/C5 표시 연결 인계

**VERIFIED — 소스 동결. 관련43/43, 범위 타입 검사 exit0. 유료 호출0.**

기존 저장 위치·아트·편집기를 재사용한다. 전체 장면이 모든 일반 group을 일자 행으로 보내던 경로를 `resolveSceneDisplay`의 근거별 part로 나눈다. source/value/bbox/ID/owner/canonical은 바꾸지 않는다. 새 renderer나 게임별 bbox 규칙은 없다.

## 실제 연결과 C5 근거

| 충분/부족 입력 | 실제 dispatch와 직접 근거 |
|---|---|
| native Catan/Rummikub | 기존 plan의 native callback을 그대로 사용한다. generic binding이 없는 native 패널도 유지한다. 기존 루미큐브58 binding과 원 native 진입 검사 포함. |
| 유효한 저장 manual 위치 | `resolveSceneDisplay`→`manual-board`→기존 `GameBoardRecord bodyOnly readonly`. `displayItems`는 원 assertion/piece 및 원 저장값과 같은 위치만 받는다. landscape/map 이름 차이, legacy inset, free-board/slot-board frame의 실제 body 선택·원 ID 클릭을 확인했다. 실제 칸과 안 맞는 slot은 기존 미배치 표시로 남겨 실물을 숨기지 않는다. |
| SHA/frame/slot/범위가 일치하는 canonical | 기존 `projectGenericDrawing`/`spatialView`/`publicSpatialView`를 소비한다. 실제 Sagrada baseline18개는 정확 asset context에서만 `canonical-board`. 미로드/다른 SHA·팩 버전은 canonical이 아니다. 표시 asset 전후 semantic scene 동일. 별도 Azul pattern/wall 합성 frame·slot은 asset 로딩 뒤 **실제 Scene→기존 GameBoardRecord→원 ID 표시**로 연결됨을 검사했다. 주소와 사진 정답 일치는 별도 인증하지 않는다. |
| typed map 좌표 | 기존 `carcassonneLayout`→`CarcassonneLayoutPreview`로 연결한다. 합성 저장 gridX/Y 2개와 실제 map 버튼 선택 검사. 실제 옛 Carcassonne에 좌표를 만들지 않았다. |
| 기존 grid/slot/cell 및 부분순서 | 기존 `EstimatedGroupBody`와 shared hint를 그대로 소비한다. 3종의 grid·색줄·판 문맥 회귀를 유지한다. 사진 geometry와 반대인 명시 순서는 최종 실제 component에서 `relation-layout`로 지키며 사진 줄 정렬에 덮이지 않는다. |
| physical single/group | 그대로 한 실물 표현이다. 실제 Dominion49관측의 single/group이 모두 같은 qualified 원 ID로 남는 것을 검사했다. 49개를 49더미라고 이름 붙이거나 quantity만큼 복제하지 않는다. topology의 pile 의미만으로 실물 더미 membership/장수를 만들지 않는다. |
| 위 근거 없는 usable source bbox | `photo-rows`→기존 `PhotoLayoutBoard`/`layoutDrawingItems`. 실제 Hanabi35개는 기존 사진5줄을 소비하고 25개 display 슬롯에 강제로 넣지 않는다. 실제 옛 Azul22개도 canonical 근거 부족으로 사진 경로를 유지한다. `part.fallbackReason`이 `no-validated-position-or-structure` 또는 `board-asset-pending-or-mismatch`를 구분한다. `topologyKind` 태그 자체가 배치 근거는 아니다. |
| usable 위치도 없음 | 고정 크기 미확정 목록. 숨김/원점 겹침/원값 보정 없음. |

C4의 실제 selected role recipe/topology를 참조하되 `contextRoleIds`/요청 영역을 확정 역할·점유로 올리지 않는다. 검증 위치·기존 grid/slot·관계가 없는 새 topology에 무리하게 칸을 채우지 않는다. 판/역할/공급 더미/방향 정보가 없는 원자료는 사진 fallback이며, 이번 연결로 그 정보가 새로 생겼다고 보고하지 않는다.

## 공통 소비·표시 크기

- `shared/sceneDisplay.ts::resolveSceneDisplay({scene,pack,assertions,evidence,boardContexts})`는 parts와 `consumedEntityIds`, 미확정 이유를 반환한다. part의 members는 `entityId + LivePieceRef + 원 piece/DrawingItem`이다. 같은 binding을 중복 소비하지 않는다. Sol2 `SceneBoardContext`를 재사용하고 UI전용 `manualLayoutTags`만 추가한다.
- `useSceneBoardAssets`는 필요한 variant만 기존 loader로 SHA 검증한다. `realBoardViewForPlacements`로 실제 asset variant를 복원하고 `sceneDisplayBoardContext`는 기존 free/slot frame 함수를 재사용한다. frame 태그를 asset variant로 fetch하지 않는다. 로딩/선택은 display 재평가뿐이며 PATCH/provider 호출이 없다.
- `PhotoLayoutBoard`의 기존 bare-ID 계약은 유지하고 optional qualified callback/선택/renderTile을 추가했다. canonical 제외도 optional qualified key를 사용한다. 같은 bare ID의 다른 assertion과 cross-field 부착 자식이 모두 한 번 표시·선택되는 직접 회귀가 있다. 부착 높이도 사진 행 공간에 포함해 자식이 canvas 아래에서 잘리지 않게 한다.
- 패널 기본 크기는 adapter 결과에서, 최종 크기는 자연 내용에서 얻는다. 사진 여러 줄에 전체 entityCount×112 폭을 남기지 않는다. 장면 안에서만 nested photo rows의 max-height/overflow를 풀었다. legacy 단독 사진 UI는 유지한다. 중복 사진 제목·hint·margin은 장면 embedding에서만 줄이고 원사진 버튼·접힌 근거는 보존했다. 기존 pan/jump/집중 재진입도 유지한다.

## 직접 검사

```
node --import tsx --test tests/scene-display.test.ts tests/restoration-scene-ui.test.ts tests/restoration-scene-layout.test.ts tests/structure-followup-ui.test.ts tests/photo-layout-board.test.ts tests/readable-drawing-layout.test.ts
./node_modules/.bin/tsc --noEmit -p docs/linear-layout-implementation-20261114/sol1/tsconfig.json
```

[집중 결과](focused-tests.log): **43통과/실패0/skip0**. [범위 타입](typecheck.log): **exit0**. 실제 component 경계와 기존 사진/native 회귀를 포함하며, test의 art fetch는 로컬 public fixture로 제한했다. 새 provider·운영 데이터 접근·전체 suite/build·Git·배포0. root가 8종 실제 App Chrome/최종 통합을 담당한다. 중간 Hanabi 화면 관찰은 root 보고이며 본 인계의 합성/직접 component 결과와 구분한다.

## 동결

[시작 해시](before.json), `preimages/`, [자기 delta](delta.patch), [파일별 전후 SHA](freeze.json). 제품6파일(신규 helper 포함)과 직접 test1파일. `GameBoardRecord` 확장은 감독의 좁은 bodyOnly+readonly 승인 범위이며 일반 편집/native 저장 동작은 바꾸지 않는다. 소유 밖 shared projection/types/profile/backend 및 root 문서는 수정하지 않았다. `sceneLayout`/`EstimatedBoardView`는 재사용만 했다. 새 사진·실폰·정답 위치/더미 인증은 미확인이다.
