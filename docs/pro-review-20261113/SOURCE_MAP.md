# 코드 읽는 순서

프로젝트 루트의 [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md)는 전체 재사용 지도다. 이 브랜치의 미완료 부분을 새로 설계하기 전에 아래 기존 경로를 추적한다.

## 1. 실제 위치 계산

- [estimatedBoardStructure.ts](../../shared/estimatedBoardStructure.ts): `estimateBoardStructure`. 사그라다/LC/7W의 영역·anchor·묶음·미분류 및 수동 override. 가장 먼저 볼 파일.
- [estimatedGeometry.ts](../../shared/estimatedGeometry.ts): 대각선 중심선, 반복 주사위 격자/원근 열선. 단일 사진에 맞춘 가정과 일반화 조건을 확인.
- [drawingProjection.ts](../../shared/drawingProjection.ts): 기존 수동/정식 보드 위치/출처 검증된 photo 좌표/미배치의 우선순위. receipt의 componentRefs로 원 ID/geometry를 찾음.
- [estimatedStructureOverride.ts](../../shared/estimatedStructureOverride.ts), [genericRecord.ts](../../shared/genericRecord.ts): 편집한 group/order/slot의 저장 계약.
- [drawingLayout.ts](../../shared/drawingLayout.ts): 일반 사진 줄 배치. 추정 구조와 사진 순서 정렬은 별개.
- [spatialObservation.ts](../../shared/spatialObservation.ts), [spatialPlacement.ts](../../shared/spatialPlacement.ts): frame·주소·정식 칸 조건과 unresolved 사유.

## 2. 실제 화면과 값 표시

- [GameBoardRecord.tsx](../../src/GameBoardRecord.tsx): 기존 보드·정식 칸·추정 구조·사진 배열을 선택하고 같은 실물 ID 정정에 연결.
- [EstimatedBoardView.tsx](../../src/EstimatedBoardView.tsx), [estimated-board.css](../../src/estimated-board.css): side/role/grid/cell 계약 소비, 7W anchor 묶음, 선택과 구조 정정.
- [GenericPieceArt.tsx](../../src/GenericPieceArt.tsx), [pieceFaceValues.ts](../../src/pieceFaceValues.ts), [piece-face-values.css](../../src/piece-face-values.css): 아트와 읽힌 색/숫자/이름, compact/wide 미상 표시 차이.
- [GameDetailReadout.tsx](../../src/readouts/GameDetailReadout.tsx), [GameDetailFields.tsx](../../src/readouts/GameDetailFields.tsx): 기존 타입별 값·정정 UI.
- [PhotoLayoutBoard.tsx](../../src/PhotoLayoutBoard.tsx), [PhotoObservationOverlay.tsx](../../src/PhotoObservationOverlay.tsx): 사진 줄·원사진 테두리·선택 연결.
- [RummikubBoard.tsx](../../src/RummikubBoard.tsx), [RummikubWorkspace.tsx](../../src/RummikubWorkspace.tsx): 이미 있는 native 가로 타일/묶음 구현. 새 공통 렌더러로 갈아엎지 않는다.

## 3. 판독부터 저장까지

- [terraGameReader.ts](../../server/ai/terraGameReader.ts), [terraCompact.ts](../../server/ai/terraCompact.ts), [spatialWire.ts](../../server/ai/spatialWire.ts): 실제 기본 모델/effort, wire 지시문·decoder, values/cells/boxes.
- [spatialAssembly.ts](../../server/ai/spatialAssembly.ts), [observationAssembly.ts](../../server/ai/observationAssembly.ts), [observationFusion.ts](../../server/observationFusion.ts): 요청→관측→실물/출처/좌표 변환 및 결합/충돌.
- [hostedObservation.ts](../../server/hostedObservation.ts), [restoration.ts](../../shared/restoration.ts), [restoration policy](../../gamepacks/policies/restoration/index.json): 현재 게임팩/필요 영역·속성 선택.
- [SessionWorkspace.tsx](../../src/SessionWorkspace.tsx), [saveIntent.ts](../../server/saveIntent.ts), [analysisTask.ts](../../server/analysisTask.ts), [runtimeResume.ts](../../server/runtimeResume.ts): 저장 버튼→동일 intent 판독→완료 snapshot→정정/재개. 중복 job·수동값 손실을 다시 만들지 않는다.
- [previewValues.ts](../../shared/previewValues.ts), [EarlyScanValues.tsx](../../src/EarlyScanValues.tsx): metadata-only preview와 필요한 non-face 값의 수신 시간 구별. DOM paint 측정은 아님.

## 4. 기존 게임 정보·보드·팩

- [gamepacks/catalog.ts](../../gamepacks/catalog.ts), [generated packs](../../gamepacks/generated/game-essentials.json)
- [game-photo-definitions](../../game-photo-definitions/index.json), [spatial definitions](../../game-photo-definitions/spatial/index.json)
- [보드 아트·칸](../../public/game-art/real-boards), [readout catalogs](../../shared/readouts/catalogs)
- 전달 사례의 정확한 팩은 [data/packs](data/packs). current pack와 저장 판본/정의 SHA가 같은지 확인.

## 5. 관련 검사는 확인 범위를 읽는다

- [estimated-board-structure.test.ts](../../tests/estimated-board-structure.test.ts): 구조·수동 override·경계·원 ID 보존.
- [structure-followup-ui.test.ts](../../tests/structure-followup-ui.test.ts), [estimated-board-ui.test.ts](../../tests/estimated-board-ui.test.ts): role/grid/cell·정정 진입·값 표시.
- [restoration-save-intent.test.ts](../../tests/restoration-save-intent.test.ts), [restoration-save-resave-ui.test.ts](../../tests/restoration-save-resave-ui.test.ts): 판독 중 재저장/메모 보존.
- [useful-preview-values.test.ts](../../tests/useful-preview-values.test.ts): 첫 미리보기와 필요한 값 수신의 차이.

테스트 통과는 위 계약 보존 근거다. 사진상 전체 위치·게임 규칙·모든 새 사진의 성공을 증명하지 않는다. 이 의뢰에서 전체 테스트를 반복 실행하는 것보다 원사진/코드/실제 응답의 잘못된 관계를 먼저 찾는다.
