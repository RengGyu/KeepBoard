# 이미지 계약: 확보된 그림과 게임별 판독은 별개

## 실제 첨부 파일

- `snapshot/public/game-art/assets.json`: 전체 아트 asset_id→file manifest.
- `snapshot/public/game-art/games/{gameId}/mapping.json`: 120게임의 component/variant/layers/transform/hidden_layers/adapter/색 역할. gameId `catan`과 실행팩 `catan-base`는 명시 alias.
- manifest가 참조하는 기존 SVG 원문을 모두 포함했습니다. 예:
  - `snapshot/public/game-art/common/card-shell.svg`
  - `snapshot/public/game-art/common/symbol-gem.svg`
  - `snapshot/public/game-art/common/unknown.svg`
  - `snapshot/public/game-art/games/splendor/mapping.json`: 카드/토큰/귀족 대표형 조립
  - `snapshot/public/game-art/games/carcassonne/mapping.json`: 기존 CarcassonneArt adapter
  - `snapshot/public/game-art/games/catan/mapping.json`: ComponentArt adapter
- `snapshot/public/game-art/boards/mapping.json`과 SVG: 핵심 기록 표면 연결. 일부는 인쇄된 상용판이 아니라 수동 기록을 위한 중립 대표형입니다.
- `snapshot/src/{artResolver,artLoader,GameComponentArt,GenericPieceArt,boardVisuals,GameBoardRecord}.ts[x]`: 실제 선택·합성·렌더 방식.

## 재사용 규칙 (현재 코드)

기본 manifest viewBox는 `0 0 120 120`. 개별 SVG/adapter가 다른 viewBox이면 그 파일의 계약을 보존하세요. 레이어는 같은 좌표계에 transform을 적용합니다. assets classification=existing은 `/public/`를 정규화한 루트 URL, 나머지는 `/game-art/` 경로입니다. ZIP의 snapshot prefix는 설명용이며 제품 URL에 넣지 않습니다.

`asset_id`는 실제 파일 식별자, component_id는 게임 구성물 분류, variant.name은 대표 그림 선택지입니다. source의 실물 subtype/상업 카드 ID가 아닐 수 있습니다. 예를 들어 스플렌더 ‘보석 카드/별 카드’ 그림을 비용/실물 정체로 판독하지 않습니다. AI variant는 현재 null로 요청합니다. 알려진 component라도 subtype 미상이면 대표형/원본crop/미확인 표시를 정직하게 사용하세요. 무조건 첫 variant를 넣어 identity를 확정하지 마세요.

owner_color_supported + color_role=owner일 때만 소유색을 적용합니다. material/type/fixed-semantic 색은 플레이어 색으로 바꾸면 안 됩니다. variant의 override를 우선합니다. hidden_layers/back_variant가 없으면 뒷면은 unknown이며 앞면 기호를 노출하지 않습니다. common.unknown의 물음표를 유지하세요. 그림 겹침 레이어는 수량이 아니며 quantity=null은 ?, 0은0으로 표시합니다.

## 새 게임별 정보 표시 (제안)

기존 대표카드 SVG 위에 해당 게임에서 확인된 숫자·비용·아이콘을 React/SVG로 조립할 수 있습니다. 새 구조화 데이터를 읽는 renderer/editor가 필요하며, 대표그림만 추가하면 판독·저장이 구현되는 것은 아닙니다. 기존 아트로 충분하면 새 이미지 생성은 불필요합니다. 새 SVG는 독자적 단순 기호로, 외부참조/script/foreignObject 없이 제공하세요. 상용 카드의 정확한 그림을 임의 복사하지 마세요.

작은 화면 320/390에서 수치·색·모름을 읽을 수 있게 하고 색만으로 의미를 전달하지 마세요. accessible label/텍스트, 키보드 focus, 44px 터치영역을 유지합니다. 카드 전체보기/편집은 기존 흐름에 연결하고 horizontal page overflow를 만들지 않습니다. 정적 대표그림이 실제 인쇄숫자·카드 identity·geometry를 보증하지 않는다는 경계를 유지합니다.
