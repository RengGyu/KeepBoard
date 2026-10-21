# 구성물 장면(Component Scene) 계약

코드 기준: `shared/scene.ts`. 편집 화면: `src/SceneEditor.tsx`. 테스트: `tests/scene.test.ts`.

장면은 사진이나 사용자 입력에서 확인한 **실물 구성물 하나하나**를 기록합니다. 각 구성물에는 무엇인지, 누구 것인지, 몇 개인지, 어느 자리에 있는지, 어느 사진의 어느 부분에서 보였는지를 담습니다.

- **논리적 위치**(`location`)와 **사진 출처**(`evidenceId` + `region`)는 따로 기록합니다. 그림 보드에서 조각이 놓이는 좌표는 위상(topology)에서 계산하므로 사진 좌표와 관계가 없습니다.
- `shared/scene.ts`의 기하 검사는 조각이 **그 자리에 들어갈 수 있는지**만 봅니다. 편집 화면은 별도 `shared/catanPlacement.ts`로 기본판 거리·사막 숫자·도둑 수·연결 등의 확인 사항을 표시합니다. 실제 테이블에 잘못 놓인 배치도 명시적인 원본 기록으로 보존할 수 있습니다. 적용 범위는 [자리 이동과 배치 규칙](./scene-movement.md)을 참고하세요.
- `coverage: 'full'`은 보드 전체가 보인다는 뜻일 뿐, 규칙에 맞는 배치라는 뜻이 아닙니다.
- 모르는 값은 `null`로 남깁니다. 비어 있는 타일을 기본 지형으로 채우지 않고, 사진이 없으면 영역을 만들지 않으며, 위치를 추측하지 않습니다.

## JSON 출력 형식

```jsonc
{
  "version": 1,
  "coverage": "full" | "partial" | "catalog",
  "components": [
    {
      "id": "road-3",                 // 장면 안에서 고유하고 바뀌지 않는 id
      "kind": "road",                 // 아래 종류 중 하나
      "variant": null,                // 세부 종류. 모르면 null
      "ownerId": "red",               // 참가자 id. 공용이거나 모르면 null
      "quantity": 1,                  // 이 항목이 나타내는 실물 개수. 셀 수 없으면 null
      "location": { "type": "edge", "id": "r3c3.NE" },
      "region": { "x": 0.41, "y": 0.22, "width": 0.06, "height": 0.03 },  // 또는 null
      "evidenceId": "ev-123",         // region이 가리키는 사진. 또는 null
      // 선택 항목. 해당할 때만 기록합니다.
      "number": 8,                    // terrain / number-token: 2–12, 7 제외
      "direction": 30,                // 회전 각도(0–359)
      "face": "front" | "back" | null,// 보이는 면
      "attachedToId": "card-2",       // 이 구성물이 올려지거나 속한 다른 구성물
      "note": "반쯤 가려짐"
    }
  ]
}
```

필수 키는 `id, kind, variant, ownerId, quantity, location, region, evidenceId`입니다. 모델 응답 스키마는 `sceneJSONSchema`로 제공합니다. Gemini `responseSchema`가 지원하는 범위(대문자 타입, `nullable`, `enum`, `propertyOrdering`)만 사용합니다.

### coverage

| 값 | 뜻 |
|---|---|
| `full` | 19개 타일 보드 전체가 보임 |
| `partial` | 보드나 테이블의 일부만 보임. 기록되지 않은 자리는 모르는 상태 |
| `catalog` | 보드 없이 구성물 종류와 수량만 셈 (상자, 손패, 공급처 사진 등) |

`coverage` 값이 없거나 올바르지 않으면 `partial`로 기록합니다.

### kind와 variant

| kind | 라벨 | 들어갈 수 있는 보드 자리 | 정규 variant |
|---|---|---|---|
| `terrain` | 지형 타일 | hex | forest, pasture, fields, hills, mountains, desert |
| `number-token` | 숫자 토큰 | hex | — (`number` 사용) |
| `robber` | 도둑 | hex | — |
| `road` | 도로 | edge | — |
| `settlement` | 정착지 | vertex | — |
| `city` | 도시 | vertex | — |
| `resource-card` | 자원 카드 | — | lumber, wool, grain, brick, ore, hidden |
| `development-card` | 개발 카드 | — | knight, victory-point, road-building, year-of-plenty, monopoly, hidden |
| `token` | 기타 토큰 | hex, edge, vertex | longest-road, largest-army, harbor, building-cost |
| `deck` | 카드 더미 | — | development, lumber, wool, grain, brick, ore |
| `container` | 보관함 | — | box, tray, bag |
| `unknown` | 알 수 없음 | hex, edge, vertex | 자유 입력 |

모든 종류는 보드 자리 외에 `area`와 `unplaced`에도 둘 수 있습니다. 위 목록에 없는 variant 문자열도 그대로 보존합니다. 다만 terrain과 resource-card는 흔한 별칭을 정규 값으로 바꿉니다. 예: `wheat`/`밭` → `fields`, `wood`/`목재` → `lumber`.

### location

| type | id |
|---|---|
| `hex` | `r{row}c{column}` (`r1c1`–`r5c3`, 행마다 3·4·5·4·3개). `null`이면 보드 위에 있지만 어느 타일인지 모름 |
| `vertex` | `{hexId}.{N\|NE\|SE\|S\|SW\|NW}` (뾰족한 위쪽 육각형의 꼭짓점). `null`이면 보드 위, 자리 모름 |
| `edge` | `{hexId}.{NE\|E\|SE\|SW\|W\|NW}` (육각형의 변). `null`이면 보드 위, 자리 모름 |
| `area` | `supply`, `bank`, `player`, `hand`, `discard`, `box`, `table` 또는 자유 문자열. `null`이면 보드 밖, 영역 모름 |
| `unplaced` | 항상 `null`. 위치가 기록되지 않음 |

여러 타일이 공유하는 꼭짓점과 변은 **정규 id 하나**로 저장합니다. 정규 id는 읽기 순서(r1c1, r1c2, …)에서 그 자리에 닿는 첫 타일 기준입니다. 입력할 때는 인접한 어느 타일 기준 별칭을 써도 됩니다. 예: `r2c2.SE`, `r2c3 sw`, `R3C3-N`는 모두 같은 꼭짓점으로 바뀝니다 (`resolveSlotId`).

### region과 evidenceId

- `region`은 `evidenceId` 사진 기준의 0–1 정규 좌표입니다. 사진 밖으로 나간 부분은 잘라 내고, 너비나 높이가 0인 영역은 `null`이 됩니다.
- `normalizeScene(value, evidenceIds)`에 사진 목록을 넘기면 다음처럼 처리합니다.
  - 목록에 없는 `evidenceId`는 비우고, 그 사진의 영역도 함께 버립니다.
  - `evidenceId` 없이 영역만 있으면 `evidenceIds[0]` 사진의 영역으로 봅니다. `Assertion.region`과 같은 규칙입니다.
  - 사진 목록이 비어 있으면 영역을 버립니다.
- 사진 목록을 넘기지 않으면 출처를 그대로 둡니다. 편집기는 이 방식을 써서, 화면에 보이지 않는 사진의 출처를 지우지 않습니다.

### 정규화가 바꾸는 것

`normalizeSceneDetailed`가 반환하는 `adjustments`에 바꾼 내용이 한국어 문장으로 남습니다.

- 알 수 없는 kind → `unknown`
- 그 종류가 들어갈 수 없는 보드 자리 (예: 도시를 hex에 둠) → 맞는 보드 자리 종류에 `id: null`
- 존재하지 않는 자리 id → 같은 type에 `id: null`
- 보드 밖 종류에 보드 자리를 준 경우 → `unplaced`
- `quantity`가 없을 때: hex·edge·vertex에 놓인 구성물은 1, 그 밖에는 `null`. 음수나 소수는 `null`
- terrain·number-token의 `number`가 2–12(7 제외) 범위를 벗어나면 `null`. `direction`은 0–359로 맞춤
- 비었거나 중복된 id → `{kind 또는 id}-n`. 존재하지 않는 `attachedToId` → `null`
- `components` 배열이 없는 값 → 빈 `partial` 장면, `recognized: false`. 이전 `board.layout` 형식은 `shared/sceneBridge.ts`가 변환합니다.

## 위상과 기하 도우미

`CATAN_TOPOLOGY`는 기본판 19개 타일 보드입니다. 뾰족한 위쪽 육각형, 외접 반지름 1, `r3c3`이 원점이며 게임팩 앵커의 q/r 좌표와 같습니다.

- `hexes[19]`: `id, row, column, q, r, x, y, vertexIds[6], edgeIds[6], neighborHexIds`
- `vertices[54]`: `id, x, y, hexIds(1–3), edgeIds, aliases`
- `edges[72]`: `id, x, y(중점), angle, vertexIds[2], hexIds(1–2), aliases`
- `bounds`, `byId.{hex,vertex,edge}`, `aliases.{vertex,edge}`

| 함수 | 용도 |
|---|---|
| `boardSlotTypes(kind)` / `compatibleLocationTypes(kind)` | 그 종류가 놓일 수 있는 자리 종류 |
| `isCompatibleLocation(kind, location)` | 기하적으로 들어맞는지 (합법성 아님) |
| `snapToSlot(kind, point, opts?)` | 위상 좌표에서 가장 가까운, 들어맞는 자리. 너무 멀면 `null` |
| `slotPoint(location)` / `slotLabel(location)` | 그림 좌표 / 한국어 라벨 |
| `resolveSlotId(type, raw)` | 별칭 → 정규 id |
| `createComponent(scene, kind, patch?)` | 고유 id를 가진 새 구성물 |
| `inspectScene(scene)` | 정보성 알림만 반환하며 저장을 막지 않음: 같은 자리에 겹침, 보드 위인데 자리 모름, `full`인데 지형이 빈 타일 |

## 편집 화면 (`SceneEditor`)

```ts
SceneEditor({ value: unknown, onSave(scene: ComponentScene): Promise<void>, players: Player[], busy: boolean,
              evidence?: Evidence[], onEvidence?(evidenceId: string, region?: Assertion['region']): void })
```

- **도구 모음**: 범위(보드 전체·일부만·구성물 목록), 보기(그림 보드·원본 사진), 되돌리기(Ctrl/⌘+Z), 변경 취소, 저장. 저장할 때는 정규화된 장면을 `onSave`에 넘깁니다.
- **그림 보드**: 지형은 ComponentArt로 그립니다. variant를 모르는 지형은 '?' 타일로 표시하고, 지형이 없는 타일은 빈 자리 윤곽으로 남깁니다.
  - 조각을 **끌면** 들어맞는 자리에 붙습니다. 마우스, 터치, 펜 모두 됩니다.
  - **누르는 방식**도 있습니다. 조각을 선택하면 들어갈 수 있는 자리가 강조되고, 그 자리를 누르면 옮겨집니다.
  - 빈 타일을 누르면 그 자리에 지형, 숫자 토큰, 도둑 등을 추가할 수 있습니다.
  - 조각을 목록 영역으로 끌면 보드에서 빠집니다.
  - 수량이 알려진 2개 이상의 보드 밖 묶음을 빈 보드 자리에 놓으면 한 개만 떼어 새 구성물로 놓고 수량을 하나 줄입니다. 수량 0·미상에서는 생성하지 않습니다. 점유된 자리는 확정된 보드 출발지가 있을 때만 교환합니다.
  - 지형 이동 시 알려진 내장 숫자는 독립 숫자 기록으로 분리해 원래 칸에 남깁니다. 분리·교환은 한 번의 되돌리기이며 사진 영역을 추정하지 않습니다.
- **원본 사진**: 구성물 영역을 사진 위에 표시합니다. 영역을 누르면 해당 구성물이 선택되고, ‘사진에서 표시’를 누른 뒤 사진 위를 끌면 영역을 기록합니다.
- **선택한 구성물 양식**: 원시 JSON 없이 모든 필드를 입력합니다.
  - 종류, 세부 종류(목록 또는 직접 입력), 소유자, 수량(비우면 모름), 숫자
  - 위치 종류와 자리 (타일·꼭짓점·변 목록, 영역 목록 또는 직접 입력)
  - 사진, 영역 %, 출처 조각 미리보기, 원본 보기
  - 면, 연결된 구성물, 방향, 메모
  - 복제, 보드에서 빼기, 삭제
- **목록**: 종류별로 묶어 보여 주고 수량 합계를 표시합니다. 손잡이를 끌어 보드에 놓을 수 있습니다.
- **JSON 보기·가져오기**: 기본으로 접혀 있습니다. 저장될 JSON을 확인하고, 수정한 뒤 적용하거나 복사할 수 있습니다.
- 내용이 같은 `value`로 다시 렌더링되면 편집 중인 상태를 유지합니다. 편집 중에 다른 내용이 도착하면 ‘새 기록 불러오기’ 안내만 표시합니다.
- 규칙 경고는 최종 장면에서 다시 계산합니다. 새 배치의 인접 건물·사막 숫자·두 번째 도둑은 제한하되 ‘원본대로 기록’ 경로로 기존 실물 상태를 보존할 수 있습니다. 연결·초기배치·도시의 과거 업그레이드는 촬영 범위만으로 확정하지 않습니다.
