# Game essentials runtime implementation plan

> Execution: this worker implements inline, no subagents/commits/install. User explicitly approved execution and self-review; no additional approval gate.

**Goal:** 명세120종을 고정 팩·안전한 기록/질문/실물보존/재개 UI에 연결한다.
**Architecture:** 검증된 명세를 한 adapter로 변환하고 native 편집기는 보존한다. 새 팩의 비밀은 PIN-before-content 또는 physical-only로 처리하고, 저장본은 고정 버전을 계속 사용한다.
**Stack:** existing TypeScript/React/Express/Node, no dependencies.
**Spec:** [design.md](design.md), root 추가 승인 조건.

## Constraints / review focus

- 연구/schema/art read-only, 실제 Store/키/AI/기존 프로세스 접근 금지. writer 반환 전 build/dist 금지.
- 새 비밀 입력 우회(import/PATCH/AI/photo), 기존 정책 자동 교체, public resume의 개인값 손실, raw JSON 기본입력, 후보 자동확정을 우선 회귀로 고정한다.

## 1. Adapter / 고정팩

Files: `shared/gameEssentials.ts`, `gamepacks/catalog.ts`, `tools/game-runtime/generate.ts`, 생성 data/manifest, `shared/types.ts`, `tests/game-essentials-runtime-adapter.test.ts`.
- [x] 고정 fixture로 visibility/타입/required·ask/보존순서/unsupported·native 결합/버전 고정을 검증하는 테스트를 먼저 작성·실행한다.
- [x] `adaptSpecification(spec,digest,native?) -> GamePack`, `catalogSummary(pack)`, 단일 visibility/editor 정책을 구현한다. source/edition/hash와 원필드 의미를 runtime에 고정한다.
- [x] generator가 기존 validator로 검증하고 deterministic 결과를 생성하도록 한다. 최종 전수 생성은 writer 반환 후.

## 2. 서버 보호 / API / 범위별 재개

Files: `shared/privacy.ts`, `server/index.ts`, `server/engine.ts`, `server/ai/fields.ts` 등 필요한 수집 경계, `server/runtimeResume.ts`, `tests/game-essentials-runtime-api.test.ts`.
- [x] fresh Store fixture의 새 PIN 전 private 조회/쓰기/원본/import/AI 차단과 기존팩 정책 유지, 다중 PIN public/owner resume 회귀를 작성·실행한다.
- [x] `effectiveProtectedOwners(pack,players,configured)` 및 setupRequiredOwnerIds, forbidden secret 수집 거절, 고정팩 catalog 등록/legacy resolver를 연결한다.
- [x] `resumeSnapshot(session,pack,scope,ownerId?)`는 public/private 범위 병합. public은 모든 private 유지, owner는 공개/타owner/전역시계 불변. commit/export 투영·수집 경계도 검증한다.

## 3. 실제 공통 UI

Files: `src/GameEssentials.tsx`, 전용 CSS, 작은 generic 구성물 editor/model, `src/Dialogs.tsx`, `App.tsx`, `SessionWorkspace.tsx`, `PrivatePin.tsx`, `api.ts` 및 직접 caller.
- [x] scalar/질문/보존/제한/개인 잠금 DOM을 SSR 회귀로 확인한다.
- [x] catalog 선택·지원 수준·PIN 설정 전 개인차단·이전팩 선택보호 상태를 표시한다. 공통 metadata 입력/보관/재개 안내를 native와 함께 렌더한다.
- [x] 알려진 아트 목록 정정은 개별 instance/순서/null/사진 출처를 보존하고, 표현불가 상태는 내용 입력 없이 원본·실물 안내로 남긴다. raw JSON 기본입력은 금지한다.

## 4. 최종 데이터 / 검증 / 인계

- [x] writer 반환 후 전수 재생성·120 coverage/해시·고정 버전 불변 검사.
- [x] 전체 `npm test`, `npm run typecheck`; 데이터·코드 동결 후 `npm run build`.
- [x] CUA 가능 시 fresh synthetic preview, 불가 시 SSR/API와 실제 클릭 미확인을 분리한다.
- [x] 실행 결과/변경 파일/제약/새 resume 기본동작·초기 PIN 한계를 runtime 문서에 기록하고 소유권 반환.

Self-review: 설계의 visibility/신규 수집차단/legacy 비파괴/단일토큰/지원구분/필수질문/실물순서/전용회귀가 각각 1~4에 배정됨. raw secret을 원형보존이라는 이름으로 신규 수집하지 않고, physical 완료를 숨은 정답으로 승격하지 않는 조건을 Task1/2에서 검증한다. 아직 통과하지 않은 단계는 완료로 보고하지 않는다.
