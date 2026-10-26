# 120게임 기록 런타임 인계

VERIFIED · 2026-10-22. 구현 파일 소유권을 반환한다. 기존 서버/사용자 Store/키/원명세/아트는 변경하지 않았다.

## 실제 연결

게임 찾기 → 판본 고정된 새 기록 → 해당 게임의 상태 입력/구성물 대표 그림 정정 → 실물 보관 → 명시 저장 → 같은 기록 다시 열기까지 공통 GamePack/API를 사용한다. 카탄·루미큐브 전용 편집기를 유지하며, **2종 native +118종 수동 기록**이다. 120종 자동 판독/공간 편집기/전체 규칙 실행이 아니다.

- `shared/gameEssentials.ts`: 단일 검증 명세 adapter, visibility/입력/지원 수준/선택 질문/보관/판본·출처 고정. 기존 native 규칙 요구를 복제하지 않고 기존 단순 기록 동작을 유지한다. required/mustAsk는 원본 의미대로만 사용한다.
- `tools/game-runtime/generate.ts`, `gamepacks/catalog.ts`, `gamepacks/generated/game-essentials{,.manifest}.json`: 검증 후 결정적 120팩 생성/등록. 전체 팩 JSON은 서버에서 사용하며 홈은 작은 catalog DTO만 받는다.
- `shared/{types,privacy,genericRecord}.ts`: runtime metadata·PIN 상태, 비밀 투영, 순서/독립 실물 ID/null과0/사진 영역을 보존하는 일반 구성물 목록.
- `server/{index,engine,runtimeResume}.ts`, `server/ai/fields.ts`: 현재 기본팩/과거 고정팩 resolver 분리, 수집/사진/import/export/AI 경계, 범위별 복원.
- `src/{App,Dialogs,PrivatePin,SessionWorkspace,RummikubWorkspace,Fields,GameEssentials}.tsx`, `src/api.ts`, `src/game-essentials.css`: 120게임 검색·지원 수준·실제 입력/저장 hook·실물 보관·PIN-before-content·native 연결. `src/artResolver.ts`, `src/ArtLibrary.tsx`의 변형 이름 helper를 재사용해 일반 폼에 asset ID를 노출하지 않는다.
- 신규 `tests/game-essentials-runtime-{adapter,api,ui,final}.test.ts`: adapter/API/SSR/최종 데이터·결정성·아트 의미·출처/순서 회귀. 개발용 고정6 fixture는 이 폴더 `fixtures/`, `fixture-packs*`에 별도 유지한다.

## 고정 데이터

`docs/game-essentials/data-freeze.json`의 digest **de2ba37449113dce2547698f0b04123909e875e496b730b7f0c81f8f3cc4b4fd**와 연결했다. 실제120파일 SHA가 freeze/생성 manifest와 모두 일치하고 1,360개 source field binding이 있다. 데이터writer의 선택필드38개도 별도 수동 입력 또는 표현불가 실물 보관 안내로 연결된다. required/mustAsk 배열은 변경하지 않았다.

원래 아트의 입력 해시는 **119게임**에서 최신 원명세와 다르다. 이는 보관/필드/근거 metadata 수정이며 baseline과 현재의 **437 구성물 객체는 전부 동일**하다. mapping component ID/name/kind도 모두 대응한다. 아트를 재생성하거나 원래 source_sha256을 바꾸지 않았다. 사실 정확도/새 인식 성능을 검증한 수가 아니다.

재생성: `node --import tsx tools/game-runtime/generate.ts`. validator를 통과한 원명세에서만 생성하며 동일 입력의 output SHA가 같다.

## 새 기록/기존 기록과 비밀

무버전 `POST /api/sessions`는 native 포함 현재 보호 기본팩을 고른다. UI도 선택한 version을 명시한다. session.gamePack이 있으면 그대로 사용하고, 없는 과거 고정본은 정확한 ID/version의 기존 native 또는 imported pack만 찾는다. 버전이 다른 최신팩으로 자동 교체하지 않는다. 명시 과거 native version으로 신규 생성하는 호환 API는 선택형 PIN이며 화면에 이전 정책을 표시한다.

새 팩 owner 내용은 PIN 설정 전 읽기/쓰기/원본 업로드가 차단된다. wrong-owner token·snapshot/list·사진 원본·export·import·후보 경계도 회귀 검사했다. own-hidden/hidden/role-limited/shared-secret 등 현재 권한으로 표현 못 하는 내용은 디지털 입력/AI/비밀 사진을 수집하지 않고 외부 실물 절차만 표시한다. 실물 포장 체크가 숨은 내용 확인을 만족시키지 않는다. 신규 runtime 전체 비밀 import/export는 안전하게 제공할 수 없어 거절한다. 기존 저장값에 파괴적 migration은 없다.

초기 PIN 설정은 좌석 본인 인증이 아니다. 역할 로그인/계정/복구 서비스는 추가하지 않았다. 일반 자유 메모는 사용자가 허용된 범위의 내용만 기록하는 기능이며 규칙을 해석하거나 비밀 역할 권한을 대신하지 않는다.

## 복원 API

새 runtime의 scope 없는 `/resume`는 public이다. `{scope:'public'}`는 private 상태를 잠금 여부와 무관하게 보존한다. `{scope:'owner',ownerId}`는 그 owner의 private 상태만 복원하고 공개 상태/다른 owner/전역 turn·epoch를 유지한다. 필요한 공용 출처 사진도 보존한다. 공개 복원은 새 관측 epoch를 만들지만 현재 논리 turn을 되돌리지 않는다. 단순 열기/플레이어 보기/저장만으로 turn·epoch가 진행하지 않는다.

과거팩의 scope 없는 API는 원래 전체 복원+필요한 PIN 요구 계약을 유지한다. 기존 호출을 전역 권한 완화로 바꾸지 않았다. 프런트의 새 복원 동작은 scope를 명시한다.

## 검증 근거

| 명령/경계 | 결과 |
|---|---|
| 원명세 validator `node --import tsx tools/game-specs/cli.ts validate docs/research/game-specs-120/games --complete` | exit0,120 valid/coverage120, factualVerification=false |
| 최종 generator + deterministic 재생성/개별 freeze SHA/아트 의미 회귀 | exit0,120/437 일치 |
| `npm test` | **exit0,218/218 pass**, 신규 runtime15개 포함 |
| `npm run typecheck` | **exit0** |
| `npm run build` | **exit0**, index-B7f_KIjk.js/index-Bd4K20ak.css |
| CUA Chrome 합성 실제 UI | 390/1440 overflow0/broken0; 카르카손 검색·대표 그림·수량0·중단 초안→상단 저장→reload 보존; PIN 설정 전 개인 내용 미표시; 카탄 공용 보드1개/저장 |

로그: `generation-final.log`, `validator-final.log`, `tests-final.log`, `typecheck-final.log`, `build-final.log`. 첫 전체 실행은 새 기본정책 때문에 과거 fixture가 실패했다. 해당 legacy 생성에 명시 old version만 추가했다. 변경 파일은 `tests/{board-ux,catan-information-api,catan-review-fixes,journey,private-pin,quick-save,scan-api,rummikub-runtime-integration}.test.ts`. 테스트 삭제/보호 default fallback은 없다. 새 실제120/native 무버전 생성 회귀를 별도로 추가했다.

## 합성 미리보기/화면

**http://127.0.0.1:4396** — 이번 작업의 새 loopback 서버/임시 Store, 키·gateway 없는 환경. `node --import tsx tools/game-runtime/preview.ts`로 새 임시 Store를 재현한다(기본포트4396, 별도포트는 RUNTIME_PREVIEW_PORT). 실제 사용자 데이터가 아니다.

- [카르카손 390](screenshots/carcassonne-390.jpg), [1440](screenshots/carcassonne-1440.jpg)
- [개인 PIN 설정 전 390](screenshots/private-setup-390.jpg), [카탄 native390](screenshots/catan-native-390.jpg)

CUA는 최종 viewport override를 reset했다. PIN 입력/오답/타owner/범위별 복원은 합성 API 회귀로 확인했으며 브라우저에서 PIN을 실제 설정한 것으로 보고하지 않는다. 120개 화면 전수 클릭/실제 카메라/실AI 정확도는 미검증이다.

## 한계/운영 구분

일반 구성물 편집기는 종류/대표 그림/수량·순서/사진 연결과 위치 메모를 제공한다. 카르카손 격자 스냅·회전/부착, 자동 카드 규칙·라운드 만료 등 전용 기하/게임엔진은 없다. 기존 표현불가 JSON은 그대로 보존하고 기본 raw JSON 입력을 제공하지 않는다. 원본/실물 보관이 필요하다.

기존4393/4392/4319/4330 등은 종료·재시작하지 않았다. 최종 dist는 정적 서빙 프로세스가 읽을 수 있지만, 기존 API 프로세스는 이번 catalog/PIN/resume 코드를 자동 반영했다고 볼 수 없다. 현재 확인한 새 API는 위4396 합성 프로세스다. 배포·기존 서버 전환은 감독 범위다.
