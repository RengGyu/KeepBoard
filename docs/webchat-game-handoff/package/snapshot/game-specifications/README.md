# 재사용 게임 명세 1.0

목표는 게임마다 화면/질문을 새로 만드는 대신 **구성물·공간·핵심 규칙·공개/비공개 상태·중단 맥락·정정 방법**을 공통 정의로 보존하는 것이다. 이 디렉터리는 연구/교환 형식이다. 현재 앱의 GamePack을 바꾸거나 명세를 제품 지원 완료로 등록하지 않는다.

- 계약: [schema.json](schema.json), 시작 파일: [template.json](template.json)
- 현재 카탄 상세 계약 예: [examples/catan-from-current-pack.json](examples/catan-from-current-pack.json)
- 작성자는 `docs/research/game-specs-120/games/{game_id}.json`에 게임당 하나의 기본 명세를 둔다. `game_id`는 [확정 카탈로그](../docs/research/initial-supported-games/catalog.json)의 120개 ID를 그대로 쓴다.
- `confidence`는 `verified / reported / unclear / recommendation`. 공식 상품 소개를 열었다고 전체 규칙을 verified로 바꾸지 않는다. 각 주장에 관련된 `source_refs`만 연결하고 실제 부족한 부분은 `gaps`에 적는다.

## 필수 구역과 작성 기준

| 구역 | 넣을 내용 |
|---|---|
| game_id, name_ko/name_en, edition | 카탈로그 ID와 특정 판본. 판본 차이/호환 여부는 edition.compatibility_notes에 기록한다. |
| components | 안정적인 종류 ID·이름·변형·특성·수량. 모르는 수량은 null, 범위는 game/player/variable/unknown. 0은 실제 없음이다. |
| layout.areas | 공개/개인/공동비밀 영역, grid/hex/graph/free/track/stack/zone. `dynamic=true`는 **슬롯 수가 가변**이라는 뜻이며 fixed_slot_count=null이다. 고정 19칸에서 타일 종류만 바뀌는 카탄은 슬롯 수 기준 dynamic=false다. |
| layout.relations | 영역 사이의 연결/인접/부착/순서 관계. 고정/가변 네트워크와 자유 배치 모두 anchor_contract에 앵커·방향·면·겹침·접점 의미를 적는다. 고정 슬롯 수를 모든 게임에 강제하지 않는다. |
| state_fields | 공개 상태/개인 자산/숨은 정보/차례/남은 효과. type, scope, visibility, lifetime, acquisition을 분리한다. 개인 종류별 카드와 공개 총수는 별도 필드다. |
| rules | 핵심 제약/도출/조건부 필요 상태/복원 절차. 요약만으로 충분하면 summary를 쓴다. 기계 조건이 있으면 when, derived면 effect, requirement면 required_field_ids를 연결한다. 규칙 ID로 필드·구성물·영역과 연결한다. |
| resume | 실제로 이어갈 맥락과 순서/비밀을 유지할 실물 방법. 기본 required_field_ids=[] 허용. 질문을 다 답해야 저장할 수 있다는 뜻으로 사용하지 않는다. opening_policy는 retain-saved-turn이며 열기만으로 턴을 만들지 않는다. |
| recognition_correction | 관측 가능한 필드/직접 입력할 필드/추정 금지 사항/정정 대상과 작업. 원본 photo ID/crop과 게임판 앵커를 구분한다. 사진·후보·중복 물체를 자동 합산하지 않는다. |
| extensions, custom_setup | 기준 명세에 필요한 변경만 패치. 커스텀 편집 가능 대상과 계속 지킬 규칙을 참조한다. 변형이 있다고 원본 위반 기록을 삭제하거나 합법 상태로 자동 정정하지 않는다. |
| sources, confidence, gaps | 출처의 URL/종류/열람 상태/확인일/주장 범위. null은 미확인이다. validator 통과와 사실/인식 정확도/제품 기능 완료는 별개다. |

ID는 컬렉션 안에서 유일하며 `a-z` 또는 숫자로 시작하고 이후 영문 대소문자·숫자·`.`·`_`·`-`를 쓴다. 단 game_id는 카탈로그의 소문자 하이픈 ID다. 목록 순서는 보존된다. 전체 field key를 UI label로 쓰지 말고 label에 짧은 한국어를 쓴다.

### 공개 범위

scope는 `public / player / shared-secret`, visibility는 `public / owner / hidden / own-hidden / role-limited`다.

- 공개 설치물/공개 카드 총수: scope=player, visibility=public 가능.
- 자기 손패: scope=player, visibility=owner.
- 한나비 자기에게만 보이지 않는 카드: scope=player, visibility=own-hidden. **ownerId는 누구의 카드인지이며, 볼 권한이 있다는 뜻이 아니다.**
- 역할별 정보: visibility=role-limited, visible_to_roles=[역할ID]. 최상위 optional roles에 `{id,name,description}`을 선언한다.
- 공동 비밀 덱 내부/순서: scope=shared-secret, visibility=hidden. 실물 보존과 기록 가능한 외부 상태를 구분한다.

공용 정정 대상/공용 보존 절차가 비공개 필드를 드러내는 참조는 거절한다. 이것은 명세 분류 검사다. 현재 제품에 Hanabi 권한 UI나 실제 사용자 인증을 구현했다는 뜻은 아니다. own-hidden/역할 공개를 실행할 때는 별도 어댑터에서 관찰자와 소유자를 구분해야 한다.

### 필드와 규칙

type은 `number / boolean / text / enum / json / component-scene`다. enum은 options=[{value,label}]을 제공하거나 `option_source=players|roles`를 명시한다. 참가자/역할의 실제 ID를 명세에 미리 만들지 않는다. lifetime은 session/turn/round/phase/campaign이다. acquisition은 photo/manual/physical/derived 중 하나 이상이다. derived 필드는 photographable_field_ids에 넣지 않는다.

when은 `op=eq|neq|exists|gt|and|or|not`, 원자 조건은 field_id/owner/value, 논리 조건은 conditions다. owner는 `$owner`, `public` 또는 명시된 맥락이다. 이 파일의 조건은 **표현 계약**이며 도구가 게임을 진행하거나 값을 도출하지 않는다. 숫자 계산/공간 거리/판본별 특수 절차처럼 이 작은 조건 언어로 표현하지 않은 내용은 summary/anchor_contract/steps에 정확히 남기고 제품 어댑터 요구로 표시한다.

카탄 예시는 현재 57필드·25조건부 요구·17도출·8보존을 각각 옮겨 참조 유효성을 확인한다. 예를 들어 수명은 session인 구매 카드의 사용 제한에는 별도 구매 턴 확인이 필요하다. 이 예시가 새 형식만으로 현재 카탄 UI/배치 규칙 실행기를 대체한다는 뜻은 아니다. 상세 슬롯 교환/해안 두 접점/레이어/후보-확정/모르는 수량/개인 공개 범위를 어댑터에서 유지해야 한다.

## 확장·판본·커스텀 패치

extensions의 각 항목은 id/name/kind/compatible_edition_ids/requires/conflicts/patches/source_refs/confidence/gaps를 가진다. kind는 expansion/edition/custom이다. 패치는 인덱스 경로 대신 `{op,collection,id,value?}`를 쓴다.

- collection: components, areas, relations, state_fields, rules, preserve_procedures, correction_targets, edition.
- add: 새 ID만. replace: 존재하는 ID만. remove: 존재하는 ID만이며 value 없음. add/replace의 value.id는 patch.id와 같아야 한다.
- 전부 객체 교체다. 값 일부를 조용히 덮는 deep merge나 임의 코드 실행은 없다. 삭제 뒤 참조가 끊기면 실패한다.
- requires는 자동으로 먼저 적용한다. 순환/미등록 의존/같이 고른 conflicts/겹치는 add/호환되지 않는 기본 판본은 실패한다. compatible_edition_ids는 **의존 패치 적용 후 판본**을 기준으로 검사하며, expansion/custom은 최종 판본과도 호환되어야 한다. 새 판본 전용 확장은 해당 edition patch를 requires로 지정한다.
- edition 종류만 edition collection을 replace할 수 있고, 새 edition 전체를 한 번 명시해야 한다. 동시에 두 edition patch를 고를 수 없다. 기본판/기존 저장본을 조용히 새 판본으로 바꾸지 않는다.
- 각 확장+그 의존은 독립 검사한다. 모든 가능한 조합을 전수 실행하지는 않는다. 실제 고른 조합은 --extensions로 별도 검사한다.

## 로컬 도구

프로젝트에 이미 있는 Node+tsx를 사용한다. 설치/네트워크/AI 호출은 없다.

```sh
node --import tsx tools/game-specs/cli.ts schema
node --import tsx tools/game-specs/cli.ts validate game-specifications/examples/catan-from-current-pack.json
node --import tsx tools/game-specs/cli.ts validate docs/research/game-specs-120/games --report /tmp/game-specs-partial-report.json
node --import tsx tools/game-specs/cli.ts coverage docs/research/game-specs-120/games
node --import tsx tools/game-specs/cli.ts import docs/research/game-specs-120/games --out /tmp/keepboard-specifications-v1 --complete
node --import tsx --test tests/game-specifications.test.ts
```

validate는 현재 들어온 파일의 형식과 카탈로그 ID를 검사한다. 아직 15개만 있어도 그 15개가 유효하면 exit0이며 missing105를 그대로 보고한다. coverage 또는 --complete는 120 ID가 각각 정확히 한 번 있어야 exit0이다. **JSON 파일 개수를 완료 수로 세지 않는다.** 틀린 파일은 valid 수에 포함하지 않는다. 목록 밖 ID/중복 ID/빈 입력은 실패한다. 대체 카탈로그는 --catalog FILE로 지정한다.

입력은 게임당 JSON 객체 하나이며 폴더는 재귀 검색한다. 숨김 파일/폴더는 제외하고 심볼릭 링크는 거절한다. catalog/보고서/스키마 JSON을 games 폴더 안에 섞지 않는다. `--report` 대상은 새 파일만 허용한다.

import는 **전체 입력을 먼저 검사한 뒤 새 출력 폴더에만** 정규화한다. 기존 폴더/파일은 덮어쓰지 않는다. 필드 누락을 기본값으로 메우거나 번역/추측/교정하지 않으며 객체 key 순서만 안정화한다. 배열 순서·null·출처·판본·비공개 분류는 보존한다. `.import-manifest.json`에 원본 경로/SHA256·검사 결과·적용 확장을 기록하고 원본은 수정하지 않는다. 기존 원본을 삭제하는 도구가 아니다.

--extensions a,b를 주면 의존을 포함해 검사/구체화한다. 구체화된 출력은 선택된 규칙을 적용한 **독립 명세**이므로 extensions=[]로 저장해 재적용을 막는다. 원래 전체 패치 레시피는 입력 원본에 남고, 적용한 ID/순서는 manifest의 files[].applied에 남는다. 선택하지 않은 레시피를 제품에서 계속 편집하려면 원본 기준 명세를 사용한다. 기본 import는 확장 레시피까지 그대로 보존한다.

## 검증 경계

schema.json은 JSON Schema 2020-12의 제한된 키워드로 쓴다. 로컬 실행기는 이 파일이 쓰는 type/enum/const/$ref/properties/required/additionalProperties/items/minItems/uniqueItems/minLength/pattern/minimum/maximum만 평가한다. 지원하지 않는 키워드나 외부 $ref를 조용히 무시하지 않고 오류로 반환한다. 범용 JSON Schema 전체 엔진/공식 meta-schema 인증 도구는 아니다.

추가 의미 검사는 ID·참조·개인정보 분류·조건 구조·확장 의존/충돌·보존 순환·카탈로그 coverage다. verified는 opened 출처 metadata가 있는지 확인할 뿐, 공식 출처의 내용·주장 범위·규칙 해석·실제 사진 정확도를 사실검증하지 않는다. 모든 보고서는 factualVerification=false다. **120/120 형식 통과도 120종 제품 지원 완료가 아니다.**

검증 실행/정확 파일 목록은 [verification.json](verification.json)에 남겼다. 새 전용 검사 13개를 포함한 전체 163개 테스트, 프로젝트/도구 타입 검사, schema 자체 검사가 exit0이다. 제품 빌드는 제품 변경이 없는 이번 범위에서 재생성하지 않았다. 실제 연구120종 최종 coverage는 산출물 완성 후 실행해야 한다.
