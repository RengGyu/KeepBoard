# 120게임 명세 → 공통 기록·보존·재개 연결 설계

상태: **계약 검토 요청. 제품 소스 구현 전.** 2026-10-22. 사용자 승인된 통합 범위의 실행 설계이며 새 게임 규칙 연구나 계정 시스템 설계가 아니다.

## 직접 확인한 출발점

- 기존 schema/README와 `tools/game-specs/validate.ts`의 `validateSpecification`/참조·분류·확장 검사를 재사용할 수 있다. 연구 원명세·아트는 읽기 전용이다.
- 읽은 시점 120개 명세에 1,322개 필드가 있다. component-scene524/json270/그 밖의 scalar528, 공개1111/owner127/hidden76/role-limited7/own-hidden1. required/ask는 모두 빈 배열인 현재 자료이며, 보완 중인 writer의 최종 자료를 다시 생성·검증한다. 이 숫자를 제품 완성도나 공식 사실 검증으로 표현하지 않는다.
- 현재 GamePack은 public/player, public/owner만 표현한다. PIN을 설정하지 않은 소유자 정보는 `shared/privacy.ts`가 가리지 않는다. `/resume`은 모든 PIN 소유자를 요구하면서 마지막 snapshot 전체를 덮어써 단일 owner 토큰으로 호출할 수 없다.
- 세션 생성은 이미 `session.gamePack` 복사본과 `gamePackVersion`을 고정한다. 기존 카탄/루미큐브 전용 편집기와 루미큐브의 acquisition flush/후보 확정 분리, 아트 resolver, 원본 영역, 질문·보존 실행기, PIN을 보존한다.

## 1. 한 곳의 명세 어댑터와 재현 가능한 생성

`tools/game-runtime/generate.ts`가 기존 validator로 원명세를 검증한 다음 **공통 어댑터 하나**에 전달한다. ID/필드 참조/조건/보존 의존/visibility의 의미를 검사하고, 알 수 없는 의미는 묵살하지 않고 제한 보고서에 남긴다. 공식 사실·인식 품질을 검증했다는 표시는 하지 않는다.

공통 어댑터는 `shared/gameEssentials.ts`(브라우저에서 쓸 순수 계약/정책)와 `gamepacks/catalog.ts`(생성 결과·native 결합)를 경계로 나눈다. 생성 결과는 `gamepacks/generated/game-essentials.json` 및 manifest(원본 SHA-256/어댑터 버전/출력 해시)로 고정한다. 정렬은 객체 key만 안정화하고 필드·선택지·보존·구성물 배열 순서와 null은 보존한다. 원본 writer 반환 후 한 번 재생성하며 실행 중 원명세 파일을 요청마다 읽거나 자동 갱신하지 않는다.

모든 게임은 같은 변환 경로를 쓴다. 예외는 **native 구현 등록표**의 카탄·루미큐브 연결뿐이다. native 필드와 별도 정규화는 그대로 두며 연구 ID와 기존 키의 명시 매핑(예: 루미큐브 `turn`→`currentPlayer`)만 등록한다. 연구에만 있는 scalar/보존/안내는 공통 metadata로 추가한다. 기존 native 값을 generic 장면으로 바꾸지 않는다.

## 2. 추가 인터페이스(안)

`GamePack.runtime?`에 다음 고정 metadata를 추가한다. 기존 팩에는 없어도 된다.

```ts
interface GameRuntimeMetadata {
  adapterVersion: string;
  source: { gameId: string; schemaVersion: string; editionId: string; sha256: string };
  support: { recording: 'generic'|'native'; illustration: 'catalog'|'native';
             recognition: 'manual'|'native'; rules: 'none'|'native-partial' };
  privatePolicy: 'pin-before-content';
  fieldBindings: RuntimeFieldBinding[]; // 원본 ID/범위/공개성/수명/편집능력 그대로
  physicalOnly: PhysicalOnlyTarget[]; // 비밀 내용용 input/AI 필드가 아님
  preservation: RuntimePreserveProcedure[]; // 원래 method/order_sensitive/steps/after/visibility
  resume: { requiredFieldIds: string[]; mustAskFieldIds: string[];
            pendingActionFields: string[]; notes: string[] };
  gaps: string[];
}
```

`RuntimeFieldBinding`은 원본 필드 ID와 런타임 key, 원본 scope/visibility/lifetime, editor=`scalar|component-catalog|opaque-preserve|native`, component/area 참조와 조건을 가진다. 기존 FieldDefinition의 lifetime은 원본 turn/round/phase/campaign 의미를 보존하도록 union을 확장하고, 열기에서 자동 만료시키지 않는다. 실행하지 못하는 조건·도출은 보수적으로 미지원으로 남기며 무조건 true로 변환하지 않는다.

목록에는 `GameCatalogEntry{id,title,edition,version,support,limitations}` DTO를 사용한다. 새 `/api/game-catalog`는 120개 요약만, 기존 `/api/packs`와 세션 API는 고정된 실제 팩을 제공한다. 생성 대화상자는 목록을 검색·선택해 해당 팩으로 세션을 생성한다. 아트 보기와 기록 지원·전용 그림·자동 판독 지원을 혼동시키지 않는다. 120개 실행팩 전체를 첫 화면에서 읽을 필요는 없다.

## 3. 타입·질문·그림·일반 기록 UI

- number/boolean/text/enum → 기존 FieldEditor의 한국어 숫자/선택/불리언/텍스트 입력. enum의 players/roles 옵션은 세션 참가자/명세 역할 이름으로 바인딩한다. 역할을 선택한다고 비밀 조회 권한을 주지 않는다.
- 요구 질문은 `resume.required_field_ids`, `must_ask_field_ids`, 기계적으로 지원 가능한 조건부 requirement에서만 만든다. must-ask는 질문 의미, required는 재개 필요 상태 의미로 구분해 metadata를 유지하고 둘 다 모름/미완료 저장을 허용한다. 전 필드를 강제 질문으로 승격하지 않는다. 선택 기록은 더 보기에서 접근한다.
- 현재 차례/중단 지점/사진·구성물/관련 필수 scalar를 먼저, 기타 선택 기록은 접힌 더 보기. 카탄·루미큐브는 기존 native 편집기를 유지하고 공통 섹션에서 부족한 metadata만 보여준다.
- 일반 component-scene은 Catan ComponentScene/고정 토폴로지로 정규화하지 않는다. 알려진 구성물 ID·variant의 대표 아트와 사진/앵커·개별 instance·순서·수량(null/0 구분)을 가진 **작은 generic 구성물 목록 계약**으로 수동 정정한다. GameComponentArt를 그대로 사용하며 임의 첫 variant나 고정 칸을 추측하지 않는다. 개별 숫자/label이 그림에 없는 경우 별도 텍스트로 보존한다. 이 목록은 정확한 지도·네트워크 편집기와 동등하다고 표시하지 않는다.
- 임의 구조 json이나 지원하지 못하는 공간/게임 상태는 기존 값을 원형 보존하고 기본 JSON 편집기를 내놓지 않는다. 원본 사진·상태 요약·별도 기록 메모와 실물 보존 안내를 제공한다. 메모를 원래 JSON 값에 덮어쓰지 않는다. 외부에서 들어온 구조를 자동 단순화/마이그레이션하지 않는다.
- generic 자동 판독은 이번에 120종 완료로 연결하지 않는다. generic 업로드는 공개/허가된 개인 원본 보관이며 대표 그림은 수동으로 연결한다. 실제 인식은 기존 native 경로만 유지한다. 새 비밀 필드나 physical-only 필드는 AI allowedFields에 들어가지 않는다.

## 4. 비밀 처리: 권한 표현을 낮추지 않는 fail-closed 계약

| 원명세 | 이번 디지털 입력/사진/판독 | 실물 지원 |
|---|---|---|
| public/public, player/public | 공용 상태로 기존 입력 가능. ownerId는 공개 상태의 주체 | 공개 보존 |
| player/owner | **새 기록에서 PIN 설정·잠금 해제 후에만** 개인 내용 입력/읽기/원본/후보 가능 | owner별 봉인·위치 |
| hidden / own-hidden / role-limited / shared-secret | 내용 필드·사진 업로드·후보 생성·JSON 입력을 수집하지 않음. owner PIN으로 own-hidden을 열어주지 않음 | 내용을 노출하지 않는 절차·봉인/순서/확인 상태만 |
| 범위·공개성 조합 미지원/불명확 | 공개로 강등하지 않고 내용을 비활성화, 제한 표시 | 비밀 내용 없는 외부 상태 보존 |

physical-only 대상은 원본 범위/visibility/역할 의미를 runtime metadata에 그대로 유지한다. 공개 실행 필드로 변환하지 않는다. 공개 화면에 허용하는 것은 절차 이름·봉인/순서 유지 체크와 비밀 내용을 포함하지 않는 보관 위치 등 **별도의 외부 metadata**다. 이것이 숨은 필드 값을 답했다고 간주되거나 숨은 requirement를 충족했다고 자동 승격하지 않는다. 원래 데이터에 공개 위치도 민감하다고 명시되면 위치 입력을 생략하고 절차·체크만 제공한다.

PIN 최소 변경:

1. `runtime.privatePolicy`가 있는 **새 고정 팩**만 PIN-before-content 적용. 기존 보호가 선택형인 저장본은 같은 정책으로 조용히 갈아끼우지 않는다.
2. 이 팩의 보호 집합은 설정된 PIN 소유자뿐 아니라 아직 PIN이 없는 owner까지 포함한다. 세션/목록/snapshot/briefing/difference/AI 요약/원본 URL 투영에 같은 정책을 사용한다. 비밀번호 없는 상태에서 조회·쓰기·사진/후보 수집을 거절한다. 공개 승점/장수 등 player/public은 별도 유지한다.
3. `SessionView.privacy.setupRequiredOwnerIds?`를 추가한다. PrivatePin은 미설정자에게 기존 4자리 설정 폼을 표시하고, 설정 전에는 개인 편집기·메모·사진 버튼을 렌더링하지 않는다. 현재 토큰은 owner 한 명만 해제한다.
4. 새 필수 보호 기록에서 PIN 해제로 내용을 공개하는 경로는 허용하지 않는다(변경은 기존 PIN 검증). 복구/계정/역할 인증은 추가하지 않는다. 초기 PIN 설정은 기존 참가자 선택 기반이며 실명·좌석 인증이 생긴다는 뜻은 아니다.
5. 제한된 비밀 content field ID를 raw PATCH/import/generated pack 경로로 우회 추가해도 공개 수집하지 않도록 저장 경계에서 차단한다. import는 기존 원본 데이터를 파괴하지 않으며 지원 불가 비밀은 수집/노출 없이 원형 저장 또는 해당 신규 입력 거절을 명시한다.

## 5. 실물 보관·재개와 단일 owner 토큰

원래 `preserve_procedures`의 method/order_sensitive/steps/after를 공통 보존 섹션에 연결하고 기존 PreservationItem/restoreOrder를 재사용한다. 보관 체크/위치가 세션과 snapshot에 저장된다. 순서 보존이 명시된 더미는 섞지 않기·앞뒤 유지 안내를 보여주고 순서/의존 정보를 삭제하지 않는다. 루미큐브 rack/pool 절차도 실제 섹션에 나타난다. 준비 안 된 상태와 모름도 저장 가능하다.

일반적인 저장본 **열기**는 계속 GET이며 턴·epoch·라운드·시간·점수·장면을 바꾸지 않는다. 새 재개 섹션은 저장한 정보·원본·보관 위치/절차·선택적인 남은 행동을 읽는다.

명시적인 `/resume`만 최소 수정한다:

- 기본 public resume은 snapshot의 **공개 부분만** 복원하고 현재 잠긴 모든 owner의 private assertion/사진/메모/보존은 그대로 둔다. 따라서 모든 owner 토큰을 요구하지 않는다.
- `{scope:'owner', ownerId}`는 해당 owner의 PIN 토큰으로 그 owner의 private 부분만 복원한다. 다른 owner나 공개 기록은 덮어쓰지 않는다. unsupported secret content는 어떤 scope에서도 새로 노출하지 않는다.
- 범위별 병합은 snapshot/public-private 분류를 기준으로 수행하고 단순히 전역 requireOwner를 지우지 않는다. 명시 복원에서 저장된 턴은 유지한다. 새 관측 epoch가 필요한 동작은 explicit resume에 한정한다.
- 전체 private 원본 export처럼 단일 토큰으로 안전하게 제공할 수 없는 기존 기능은 안전한 거절/제한을 유지한다. 잠금 없이 전체 자료를 내보내도록 권한을 완화하지 않는다.

## 6. 새 기록·기존 기록 호환

생성 팩 버전은 어댑터 버전+명세/판본 digest를 포함하고 native 결합도 새 버전으로 고정한다. 새 세션은 필요한 runtime metadata·source hash·기존 native 능력을 포함한 전체 팩을 복사한다. 자료 갱신은 새 기록에만 적용한다.

기존 session.gamePack은 그대로 사용한다. 고정 팩이 없는 오래된 native 저장본은 이전 native 버전 resolver를 보존한다. 같은 game ID라는 이유로 최신 보강 팩/필수 PIN 정책으로 대체하지 않는다. 데이터 이관이나 기존 내용 삭제/자동 색 수정/타일 재정렬은 없다. 아트 라이브러리 원본이나 research schema를 제품 저장 schema로 직접 쓰지 않는다.

## 7. 구현 범위와 검증안

예정 변경: `shared/types.ts` 및 공통 runtime/privacy 계약, 단일 adapter+생성 도구/결과, catalog/native 결합, 서버 팩 목록·고정 버전·필드 수집·보존·범위별 resume·PIN 경계, Create/Library 공통 게임 선택, generic 상태 섹션·구성물 목록과 아트, native 보존 metadata 섹션. 기존 Catan/Rummikub 필드/장면/편집 경로 변경은 연결에 필요한 범위로 제한한다. API 키·사용자 Store·기존 프로세스·유료 AI는 접근하지 않는다.

합성 검증:

1. 카탈로그120 ID coverage/validator/출처 digest 및 deterministic 생성, 알 수 없는 privacy/조건에서 fail-closed.
2. 카르카손(public/free growing map), 티켓 투 라이드(owner hand/공개 점수/ordered deck), 하나비(own-hidden), 코드네임(role-limited), 루미큐브(native ordered duplicates/rack/pool), 카탄(native topology)의 서로 다른 상태를 검증한다.
3. adapter→fresh temp Store API 생성→허가된 입력→조건부 질문/보존→commit→프로세스/세션 재읽기에서 판본/값/null/순서/사진·crop 유지. 원명세가 바뀌어도 기존 고정팩 불변.
4. PIN 설정 전 GET/list/snapshot/export/원본/후보/분석 차단, 잘못된 owner 토큰 및 unsupported secret 우회 거절, 공개 정보 정상, 두 PIN 소유자에서 public/owner resume의 비파괴 병합.
5. pristine 루미큐브 후보는 acquisition만으로 확정되지 않음, dirty 초안·green·1/7/13·동일 타일 중복 보존. 기존 전용 테스트 전체 회귀.
6. 실제 React SSR로 generic 입력·요구 질문·실물 절차·제한 표시·비밀 DOM 제외. CUA 불가면 실제 클릭/레이아웃 미확인을 분리한다.
7. 최종 전체 tests/typecheck. build/dist는 data writer 반환·통합 동결 이후만. 합성 프리뷰가 필요하면 새 포트와 키 없는 새 임시 Store만 사용한다.

## 계약 확인을 요청하는 경계

위 `GamePack.runtime`/slim catalog DTO, 새 기록 PIN-before-content 및 setupRequiredOwnerIds, unsupported 비밀의 내용 수집 금지+외부 metadata 보존, public/owner 범위별 explicit resume, native 새버전+legacy resolver 보존이 추가 인터페이스다. **이 문서 확인 전에는 제품 소스를 수정하지 않는다.** 현재 schema로 일반 규칙 자동 실행·역할/own-hidden 디지털 권한은 표현/구현하지 않으며 지원 수준 제한으로 남긴다.
