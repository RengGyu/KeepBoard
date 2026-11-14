# 근거: 사진 → 저장 → scene → 표시

기준 코드 `7c921e25e096a7f5b4f4f2645eb2f6023da13651`. **VERIFIED**는 이번 로컬 읽기·직접 이미지 확인·무료 재생으로 확인한 내용, **REPORTED**는 기존 기록, **UNCLEAR**는 자료로 확정하지 않은 내용이다. 새 provider 판독이나 새 정답 작성은 없다.

## 1. 원자료와 캡처 확인

5종은 [원자료 manifest](../restoration-readability-generalization-20261113/sol2/manifest.json)의 2026-11-10 `request.json/native.json/decoded.json/view.json`을 재사용했다. 현재 [fixtures.mts](../restoration-readability-generalization-20261113/sol2/fixtures.mts)가 원사진 SHA·decode 치수·exact pack/request pin을 검증한다. native에서는 `message/output_text`의 공개 응답 JSON만 비교했다.

3종은 [pro-review data](../pro-review-20261113/data/cases)의 `*-baseline.json`과 해당 `data/packs`를 사용했다. `observationReceiptRefs`를 같은 파일의 receipt로 복원해 메모리 Session을 만들었다. 사그라다 baseline의 provenance는 **기존 실응답에 칸 ID 호환 교정 후 오프라인 저장·재열기**라고 명시한다. 이를 교정 전 원응답 또는 새 판독으로 부르지 않는다. 다른 두 baseline은 2026-11-12 실판독 저장본이라는 기존 provenance를 갖는다.

다음 16개 파일을 직접 열었다. 관찰은 큰 구조 비교이며 새 물체 수/값/칸 GT를 만들지 않았다.

| 게임/실제 열어 본 파일 | 원사진에서 보이는 구조 | 저장 서비스 이미지에서 확인한 것 | 유보 |
|---|---|---|---|
| [루미큐브 사진](../photo-service-comparison-20261113/assets/rummikub-photo.jpg) · [서비스](../photo-service-comparison-20261113/assets/rummikub-service.png) | 여러 방향의 숫자 타일 줄·분리된 집합 | native 사진 배치 9줄 | 표시 줄이 모든 실제 묶음 또는 합법 멜드와 일치한다는 판정 아님 |
| [하나비 사진](../photo-service-comparison-20261113/assets/hanabi-photo.jpg) · [서비스](../photo-service-comparison-20261113/assets/hanabi-service.png) | 가운데 색상별 겹친 카드, 위/아래 카드 받침, 옆 별도 카드와 토큰 | 카드 35개가 긴 한 줄 | 각 손패의 사람 소유·버림 경계·겹침 순서 미확정 |
| [아줄 사진](../photo-service-comparison-20261113/assets/azul-photo.jpg) · [서비스](../photo-service-comparison-20261113/assets/azul-service.png) | 플레이어 보드의 벽 격자·타일과 빈 인쇄칸, 점수/가장자리, 일부 공장 | 왼쪽 위 판 조각만 식별되고 나머지는 빈 캡처 | 전체 22개 픽셀 확인 불가. 인쇄색을 놓인 타일로 세지 않음 |
| [카르카손 사진](../photo-service-comparison-20261113/assets/carcassonne-photo.jpg) · [서비스](../photo-service-comparison-20261113/assets/carcassonne-service.png) | 중앙 연결 지도, 별도 점수판·타일·예비 말 | 타일·말 관측의 긴 한 줄 | 모든 실제 타일 개수/연결/점수말 위치의 정답은 새로 작성하지 않음 |
| [도미니언 사진](../photo-service-comparison-20261113/assets/dominion-photo.jpg) · [서비스](../photo-service-comparison-20261113/assets/dominion-service.png) | 중앙 여러 카드 더미와 주변 카드·덱 | 카드/묶음 49관측의 긴 한 줄, 여러 이름 모름 | 숨은 카드 수·모든 공급 더미의 역할/이름/소유 미확정 |
| [사그라다 사진](../photo-service-comparison-20261113/assets/sagrada-photo.jpg) · [서비스](../photo-service-comparison-20261113/assets/sagrada-service.png) | 앞 창문 4×5, 뒤 라운드 트랙, 도구/목표 카드·토큰 | 창문 18주사위 격자와 트랙·도구 등 패널 | 값 모름과 가림은 남음. 저장 주소와 사진 정답의 별도 인증 아님 |
| [로스트 시티 사진](../photo-service-comparison-20261113/assets/lost-cities-photo.jpg) · [서비스](../photo-service-comparison-20261113/assets/lost-cities-service.png) | 대각선 공유판, 양쪽 원정·색상 줄, 가운데 버림 | 색상/편으로 나뉜 행들 | 이미지 상단이 잘려 일부 제목/행 확인 제한. 42개 완전 pixels를 증명하지 않음 |
| [세븐 원더스 사진](../photo-service-comparison-20261113/assets/seven-wonders-photo.jpg) · [서비스](../photo-service-comparison-20261113/assets/seven-wonders-service.png) | 여러 판·도시 카드 집합, 겹침·끼움·동전·토큰 | 다수 판/영역과 하위 행, 큰 작업면 | 사진의 모든 물체/판 소속을 정확히 연결했다는 판정 아님 |

**VERIFIED:** [capture-check-results.json](capture-check-results.json)에서 8쌍의 manifest SHA·원사진 사본 일치, 실제 이미지 치수, 캡처 기준 commit `65f5526…`→현재 기준의 `src/shared/server/gamepacks/game-photo-definitions/public/game-art` diff 0을 확인했다. 따라서 단순히 다른 제품 버전의 캡처라서 생긴 차이로 볼 근거는 없다.

**UNCLEAR — 캡처 완전성:** 기존 [capture-proof.json](../photo-service-comparison-20261113/capture-proof.json)은 아줄 4패널/22 source/export pieces라고 보고한다. 그러나 2880×416 실제 PNG는 x≥340 구간에서 RGB 세 채널 모두 190 미만인 픽셀이 0개다. 직접 확인한 왼쪽 위 단편과 일치한다. 이는 캡처의 픽셀 완전성 제한이지, 제품이 21개를 삭제했다는 증거가 아니다. 아래 아줄 경로/개수는 코드 재생으로 판정했다. 캡처 생성 원인까지 조사 범위를 넓히지 않았다.

## 2. 게임별 실제 전달 경로

[replay.mts](replay.mts)는 현재 pure 함수만 사용한다. 5종은 native compact 전개→정규화 재실행→저장본 비교를 추가하고, 8종 모두 scene·layout·코덱을 재생한다.

| 게임 | 원요청/응답에 있는 정보 | 정규화·저장 | scene·layout→UI |
|---|---|---|---|
| 루미큐브 | `table`, 구조 요청 없음. 58 bbox, 모두 single | `table.scene`, groups 0/loose 58 | scene native 패널→`RummikubBoard`→`PhotoLayoutBoard`, 9줄 |
| 하나비 | `fireworks`, 구조 요청 없음. 35 bbox; `sourceAreaId` 전부 없음 | `fireworks.scene`, 35개 보존 | request area를 모두 observedRole로 사용→fallback 1묶음→grid family지만 grid presentation 없음→한 줄 |
| 아줄 | `pattern`, 구조 요청 없음. boards 3/tiles 19, bbox 22; 영역 태그 없음 | 허용 owner 없는 공개 관측 정책으로 `__photo.public`; 원 region/receipt 보존 | 22개 모두 pattern 역할. 판 자체 3묶음+타일 19개 1묶음→4영역. track family, grid presentation 없음→행 경로 |
| 카르카손 | `map`, 구조 요청 없음. tiles 9/followers 34, bbox 43 | `map.scene`, 43개 보존 | 같은 역할/출처→1묶음 free-area→한 줄. 저장 좌표가 있는 별도 typed map 경로는 선택되지 않음 |
| 도미니언 | `supply`, 구조 요청 없음. 49 bbox; single 35/group 14 | `supply.scene`, 49개 보존. group 14개의 quantity 모름 유지 | 1묶음 track→한 줄. 더미별 영역/순서 없음 |
| 사그라다 | public-scene; window 19/round-track 8/tools 8/무태그 7. spatial: 판 2/placement 27/relation 5. scene-reading 없음 | 3개 필드, 총42. 보정된 baseline에 resolved spatial 18개 | board asset 없이 drawing 생성→canonical 아닌 photo. 기존 사그라다 추정기로 18칸·11묶음/4영역, retained 0 |
| 로스트 시티 | public-scene; expeditions 36/discard 5/무태그 1. spatial: 판 1/placement 5/relation 30 | 2개 필드, 총42. resolved canonical 0 | 기존 전용 추정/관계 처리→12묶음/5영역. 색상·편·부분 순서 표시 |
| 세븐 원더스 | public-scene; wonder-area 14/city 95/무태그 8. spatial/scene-reading 없음 | `__photo.public`, 총117: 판4/동전17/군사10/카드86 | 기존 전용 추정으로 45묶음/17영역. region 사이 left-of 85/above 61; 큰 작업면으로 배치 |

8종 모두 현재 exact profile이 catalog에서 붙는다. 옛 저장 pack에 profile이 없다는 사실과 현재 실행에 profile이 없다는 주장은 다르다. `sourceAreas`, request 계약, profile topology, 전체 group/panel, obsRef→piece→entity 예시는 결과 JSON에 있다.

**VERIFIED — 보존:** 5종 native 응답은 모두 `v/items` 구조이며 spatial/scene 객체가 없다. 현재 `expandCompactTerraPayload` 출력이 저장 `hostedWire.items`와 동일하고 deferred는 비었다. `decoded.raw == receipt.result`; 재실행한 `assembleObservations`의 생성 ID를 제외한 piece 속성/값/기하와 목적 field가 전부 동일하다. 원응답에 없는 관계를 검증기가 버렸다고 볼 수 없다.

**VERIFIED — 저장 범위:** 8종 408 binding이 scene에 정확히 한 번씩 연결되고, 모든 entity가 한 group에 있다. `encodeSession`→JSON→`decodeSession`이 현재 JSON 값·receipt·scene을 그대로 돌려준다. 디스크 Store·HTTP·commit→resume를 이번에 다시 실행하지 않았다. 이전 5종 HTTP/재개 보존 결과는 [기존 sol2 보고서](../restoration-readability-generalization-20261113/sol2/README.md)의 **REPORTED** 근거다.

## 3. 일자 선택의 정확한 trigger

```text
GameEssentials → restorationScenesForView
  └─ projectRestorationScene
       ├─ projectGenericDrawing(..., board 인자 없음)
       ├─ estimateBoardStructure (현재 sagrada/lost-cities/seven-wonders)
       ├─ validated scene-reading 또는 추정 그룹
       └─ 미소속: 같은 scope/source/recipe/role/board bucket으로 fallback
            └─ family는 있으나 presentation.grid/slots가 없음
                 └─ RestorationSceneView.groupBody
                      └─ EstimatedGroupBody(no grid)
                           └─ .estimated-row / flex / min-width:max-content
```

| 경계 | 현재 코드와 확인된 동작 | 인과 |
|---|---|---|
| 진입 | [GameEssentials.tsx:47](../../src/GameEssentials.tsx#L47), [96](../../src/GameEssentials.tsx#L96) | generic field 중심 표시가 아닌 전체 scene 작업면이 기본 경로 |
| 역할 | [sceneProjection.ts:27](../../shared/sceneProjection.ts#L27) `sourceAreaId ?? request.areaId` (public-scene일 때는 예외) | 요청 범위를 각 물체의 관측 역할처럼 기록. 원 5종은 단일 영역으로 몰림 |
| canonical/manual 입력 | [sceneProjection.ts:32](../../shared/sceneProjection.ts#L32), [drawingProjection.ts:73](../../shared/drawingProjection.ts#L73) | 기존 projector는 board asset이 있어야 manual/canonical 경로를 쓰는데 scene 호출은 전달하지 않음 |
| 추정기 범위 | [estimatedBoardStructure.ts:59](../../shared/estimatedBoardStructure.ts#L59), [estimatedStructureOverride.ts](../../shared/estimatedStructureOverride.ts) | 지원 area가 없으면 바로 return. 유효 manual/board 위치를 retained로 옮기는 단계보다 앞임 |
| fallback 묶음 | [sceneProjection.ts:51](../../shared/sceneProjection.ts#L51) | geometry의 줄/더미/인접을 계산하지 않고 같은 출처·역할 bucket에 합침. 판 entity는 자기 group으로만 분리 |
| presentation 생성 | [scenePresentation.ts:11](../../shared/scenePresentation.ts#L11), [18](../../shared/scenePresentation.ts#L18) | 같은 3종 추정기 결과에서 grid/slots/order 힌트를 만듦. profile family/topology만으로는 만들어지지 않음 |
| family 분기 | [RestorationSceneView.tsx:65](../../src/RestorationSceneView.tsx#L65) | native Catan/Rummikub와 retained canonical 예외를 빼면 같은 groupBody. `plan.renderer`가 grid/track/network여도 별도 실행 분기 없음 |
| 행 실행 | [RestorationSceneView.tsx:53](../../src/RestorationSceneView.tsx#L53), [EstimatedBoardView.tsx:18](../../src/EstimatedBoardView.tsx#L18), [estimated-board.css:1](../../src/estimated-board.css#L1) | grid 없으면 행. slots가 있으면 그 안의 소행만 나누며, 일반 fallback은 원 순서 items 한 줄 |
| 폭 증폭 | [RestorationSceneView.tsx:55](../../src/RestorationSceneView.tsx#L55), [sceneLayout.ts:18](../../shared/sceneLayout.ts#L18) | grid 없을 때 `entityCount×112+40` 기본폭. 패널 간 관계만 macro layout에 사용하여 큰 행/작업면이 유지됨 |

`flex-wrap` 하나를 추가하면 길이는 줄어도 관계·역할·칸·지도는 그대로 없고, 폭 추정/패널 layout도 함께 검토해야 한다. 반대로 `family==='grid'`면 무조건 격자로 보내면 아래 팩 의미 문제로 잘못된 칸을 만들 수 있다.

## 4. 읽기 부족과 소비 단절을 분리

### 요청/관측에 없는 정보

- 원 5종은 `request.spatial=false`, `request.scene=false`; bbox는 207개 모두 있다. 따라서 canonical 0을 모두 “칸 읽기 실패”라고 할 수 없다. 요청하지 않은 관계·칸도 포함된다.
- 하나비 카드의 suit 34known/1unknown, number 20/15, printedName 20/15. `cardArea`는 수동 의미 필드이며 현재 visible property 요청이 아니다. bbox와 색/숫자로 손패 소유나 버림 역할을 확정할 수 없다.
- 아줄 타일 19개 색은 known이지만, 원응답에 wall/pattern/floor별 source area·칸·판 frame이 없다. 원요청 pattern이라는 사실은 실제 사진 속 19개 타일의 pattern 소속 증거가 아니다.
- 카르카손 tiles 9 중 group 5개는 quantity도 unknown; follower 34개는 색 known, posture 20known/14unknown. 타일 city/road/monastery/shields/printedName은 모두 unknown. gridX/Y·feature·attachedTo 같은 수동 필드까지 새 판독 사실로 채우지 않았다. 9관측을 완전한 개별 지도 타일 집합으로 확대하면 안 된다.
- 도미니언 printedName 6known/43unknown, cardType 5/44, face 35/14. unknown quantity 14개의 group을 장수만큼 펼치거나 숨은 수량을 초기 세팅에서 가져오면 안 된다.
- 사그라다 raw die 26개 모두 color known, dieValue 16known/10unknown. 앞 창문 18개만의 값 정답률로 읽으면 안 된다.

### 저장되어 있으나 scene/UI에 연결되지 않는 정보

1. **위치:** 기존 [spatialPlacement.ts:7](../../shared/spatialPlacement.ts#L7)는 exact assetSHA/frame/viewbox/slot을 검증한다. 실제 사그라다 baseline의 resolved 18개는 현재 board.json을 넘기면 모두 `space:'board'`로 반환된다. scene은 같은 입력에서 `retained=0`, bbox 추정 18칸을 만든다. **18칸 모두 저장 주소와 현재 일치**하므로 이 사례는 지금의 오배치 증명이 아니라 권위 있는 위치 근거가 미전달되는 증거다.
2. **기존 map 표시:** [carcassonneLayout.ts:6](../../shared/readouts/carcassonneLayout.ts#L6)와 [CarcassonneLayoutPreview.tsx:10](../../src/readouts/CarcassonneLayoutPreview.tsx#L10)는 typed gridX/Y·부착을 처리한다. [GameBoardRecord.tsx:175](../../src/GameBoardRecord.tsx#L175)에는 그 경로와 사진 fallback이 있다. 현재 scene은 좌표가 있어도 이 adapter를 선택하지 않는다. 실제 옛 사진에 좌표가 있었던 것은 아니다.
3. **관계:** [sceneProjection.ts:45](../../shared/sceneProjection.ts#L45)는 receipt의 observationRef를 현재 assertion의 `(assertionId,pieceId)`에서만 찾는다. 같은 공개 scope의 여러 field에 흩어진 live 참조를 잇지 못한다. 한 field 안의 유효 `precedes`는 scene.relations에 남지만 [RestorationSceneView.tsx:40](../../src/RestorationSceneView.tsx#L40)는 `presentation.orderLevels`만 사용한다. [42](../../src/RestorationSceneView.tsx#L42)의 `attached-to` 소비는 따로 있으므로 모든 관계가 무시된다는 주장은 틀리다.
4. **재투영:** [sceneProjection.ts:65](../../shared/sceneProjection.ts#L65)의 sourceDigest는 assertion value와 request origin을 포함하지만 `receipt.result.scene` 및 projector 알고리즘 버전은 포함하지 않는다. 같은 digest면 [68](../../shared/sceneProjection.ts#L68)에서 이전 groups/regions/relations/plan을 재사용한다. 같은 요청을 재decode·마이그레이션할 때 새 구조가 화면에 반영되지 않는 최소 반례가 있다. 새 provider taskId가 바뀌는 모든 요청이 무시된다는 뜻은 아니다.

## 5. 팩/보드 자산의 존재와 의미 손실

**VERIFIED:** `withRestoration`으로 8종 모두 exact profile을 얻었다. 문제는 “지원 게임 목록에 없음”보다 profile에서 실제 실행기로 가는 계약이다. [restorationProfile.ts:60](../../shared/restorationProfile.ts#L60)의 기본 compiler는 해당 field의 첫 asset area와 slot x/y 배열을 중심으로 family/topology를 고른다. `tableModel/tableZones/numericTracks`는 source pointer로 보유해도 해당 의미를 모두 실행 계약으로 해석하지 않는다. [생성기](../../tools/game-runtime/generate-restoration-profiles.ts#L5)의 별도 semantic source는 현재 3종이다.

| 기존 자료 | 실제 profile/정의 상태 | 단순 topology 소비의 오류 위험 |
|---|---|---|
| [하나비 board.json](../../public/game-art/real-boards/hanabi/board.json) | fireworks 25 표시 슬롯→grid 5×5. [spatial index](../../game-photo-definitions/spatial/index.json)는 named-area만 있고 실제 내부 격자 없음 | 전체 사진의 카드35개를 25개 정식 칸에 억지 배정 |
| [아줄 board.json](../../public/game-art/real-boards/azul/board.json) | tableModel은 5개 pattern line·벽5×5·바닥7을 기술. pattern profile은 첫 row1 slot 하나만 수집 | 가변 행 길이1..5와 board instance 경계가 소실된 track을 일반 칸으로 사용 |
| [카르카손 board.json](../../public/game-art/real-boards/carcassonne/board.json) | landscape는 slots0, `unbounded-square-edges`; profile map은 free-area. 점수트랙은 asset 좌표 때문에 grid5×10 | 지도 인접을 점수판 격자와 혼동하거나 free-area를 일자 목록으로 끝냄 |
| [도미니언 board.json](../../public/game-art/real-boards/dominion/board.json) | tableModel은 공급 slot=카드 더미라고 명시. profile supply는 첫 basic 7slots→track, kingdom10 의미 미흡 | card 한 장/관측 group/물리 더미/공급 자리 단위를 혼동 |

spatial 정의는 검토한 자료에서 사그라다·아줄에 실제 slot 프레임이 있고, 하나비·도미니언은 named-area 위주다. 카르카손/루미큐브/세븐 원더스에는 현재 spatial 정의가 없다. `cells` 옵션만 켜는 것으로 모든 구조를 얻을 수 없다. [server/spatialReading.ts](../../server/spatialReading.ts#L10)는 read mode와 정책/slot 지원에 따라 요청을 붙인다. 전체 시스템에서 spatial이 항상 꺼져 있다는 결론도 아니다.

## 6. 무료 반례와 재사용 확인

[counterexamples.mts](counterexamples.mts) 및 [결과](counterexample-results.json). 모든 합성 변경은 메모리 복제본에만 적용했다.

| ID | 입력 | 이번 결과 | 판정 |
|---|---|---|---|
| A | 실제 하나비35 | 실제 component tree: row1/grid0/35개. 기존 `layoutDrawingItems`는 같은 bbox로5줄 | 사진 배치 계산 기능은 있고 현재 generic UI가 소비하지 않음 |
| B | 카르카손 한 타일에 유효 수동 placement를 합성 | board 인자 있으면 manual, 없으면 photo. manual 입력을 직접 추정기에 넣어도 retained0 | asset 전달 누락과 unsupported-game 조기 반환이라는 독립 두 단절 |
| C | 실제 사그라다 baseline | exact board asset으로 canonical18; scene retained0/estimated18, 현재 주소 일치18 | 위치 근거 미전달. 현재 오배치/판독 오답 판정 아님 |
| D | 카르카손 타일2에 typed gridX/Y 합성 | 기존 map adapter tiles2; scene tree에는 `CarcassonneLayoutPreview` 없음 | 기존 저장 좌표 표시기를 재사용할 소비 경로 필요 |
| E | 하나비2에 decoder 통과 region+역순 precedes 합성 | deferred0, scene precedes1, physicalOrder0, UI는 원 배열순 | 관계 검증 성공과 표시 소비 성공이 다름 |
| F | 같은 receipt의 두 관측을 같은 공개 scope의 두 field로 분리 | live entity2, 원 precedes1, scene precedes0 | assertion-local lookup이 필드 간 관계를 잃음 |
| G | 같은 request/value에서 scene region을1→2로만 변경 | fresh2group, previous 사용시1group, sourceDigest 동일 | 재decode/버전 이행시 구조 입력을 digest에 포함해야 함 |

추가로 미소비 `layoutDrawingItems`를 전체 저장 관측에 적용하면 하나비5/아줄8/카르카손6/도미니언9줄을 계산한다. 이는 개선용 무료 하위 도구의 존재 증거다. 실제 손패/더미/지도 또는 향후 제품의 목표 줄 수가 아니며, 판과 타일을 먼저 의미별로 분리하면 줄 수는 달라질 수 있다. 이미 구조가 있는 사그라다/로스트 시티/세븐 원더스를 이 fallback으로 일괄 대체하면 안 된다.

## 7. 확인 범위와 남은 불확실성

- **VERIFIED:** frozen input·현재 pure code에서 관측/값/기하 보존, scene 전달, 실제 React component tree 분기, 캡처 파일과 SHA를 확인했다. [pins.py](pins.py)의 지정 488파일 전후 비교는 [input-invariance.json](input-invariance.json)에 남긴다. 이 pin 집합에 포함하지 않은 전체 filesystem 불변을 주장하지 않는다.
- **REPORTED:** 기존 HTTP 저장·재열기·재개 및 캡처 DOM 개수, 감독의 runtime model/effort 확인. 이번에 같은 작업을 전부 재실행하지 않았다.
- **UNCLEAR:** 모든 실제 물체의 완전성, 게임별 정확한 역할/소속/지도, 새 structure 요청의 성공률, 모바일 실기기 응답시간, 아줄/로스트 시티 캡처 잘림 원인.
- **RECOMMENDATION:** 제품 소비 경로를 먼저 고치고, 남는 정보 결핍만 [최소 후속 실험](design.md#후속-사진판독이-필요한-조건)으로 좁힌다. 이번 인계에 유료 호출이나 전 게임 회귀 확장은 필요하지 않았다.
