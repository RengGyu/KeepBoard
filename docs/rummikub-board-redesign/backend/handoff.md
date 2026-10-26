# Classic 4색·선택형 PIN backend 인계

2026-10-22 · 승인된 backend-design.md 9항 구현 완료. **제품 쓰기 동결·파일 소유권 반환.** 전체 작업트리에는 이전 작업이 포함되어 아래 파일의 이번 계약 변경만 인계한다.

- VERIFIED: 새 Classic AI 관측은 빨강/파랑/검정/주황 또는 null. green·representedColor green은 null과 경고로 남기며 orange로 치환하지 않는다. 신규 수동 green은 명령/서버에서 거절한다.
- VERIFIED: 기존 accepted/candidate의 동일 tile ID·미변경 green은 이동/메모/저장 시 유지한다. snapshot 원본과 명시적 복원도 보존하며 사용자의 명시 정정은 허용한다. 기존 native 1.0.0은 별도 export로 보존, 새 native는 1.1.0이다.
- VERIFIED: 실제 설정 PIN owner만 보호한다. 새/과거 pin-before-content 고정팩의 PIN 미설정 개인 입력·사진·읽기·export/import가 가능하고 저장팩/version을 바꾸지 않는다. 설정된 PIN의 내용/목록/snapshot/사진/쓰기/AI 근거/owner 복원/export 차단, currentPin 확인·token 폐기·재시작 잠금은 유지한다. 실제 PIN 파일 구현은 수정하지 않았다.
- VERIFIED: unsupported hidden/own-hidden/role-limited/shared-secret의 필드·import·개인사진 거절은 PIN 설정 유무와 독립이다. 숨은 내용을 펼쳐 수집하는 정책으로 바꾸지 않았다.

## 정확한 제품 변경 파일

`shared/rummikub.ts`, `shared/gameEssentials.ts`, `shared/privacy.ts`; `server/index.ts`, `server/engine.ts`, `server/ai/index.ts`, `server/ai/rummikubPrompt.ts`; `gamepacks/rummikub.ts`, `gamepacks/catalog.ts`, `gamepacks/generated/game-essentials.json`, `gamepacks/generated/game-essentials.manifest.json`.

generator 자체 수정 없이 기존 generator로 120팩을 재생성했다. adapter는 essentials-2, 새 metadata privatePolicy는 optional-pin이며 validator는 이전 pin-before-content도 허용한다. shared/types.ts의 이번 직접 변경은 없다.

테스트 변경: `tests/rummikub-model.test.ts`, 신규 `tests/rummikub-optional-pin.test.ts`, `tests/game-essentials-runtime-adapter.test.ts`, `tests/game-essentials-runtime-api.test.ts`, `tests/private-pin.test.ts`, `tests/rummikub-runtime-integration.test.ts`. 기존 보호 검사는 유지했고 필수 PIN 기대만 변경했다. 서버 import는 임시 cwd에서 수행해 프로젝트 .env를 읽지 않는다. API 회귀는 fresh tempStore/loopback만 사용하며 provider 시험도 로컬 모의 응답이다.

## 프런트 계약

- `RUMMIKUB_COLORS` 기존 이름 유지, 4색 readonly tuple. 신규 `RummikubClassicColor`; 저장 호환 `RummikubColor = RummikubClassicColor | 'green'`.
- `normalizeRummikub(Detailed)` 기본은 legacy 보존. AI만 `colorPolicy:'classic'`. legacy green을 UI 재렌더에서 자동 null/orange로 바꾸지 않는다. 수동 신규 선택지는 RUMMIKUB_COLORS/null을 사용한다.
- privacy DTO 형태 불변: `protectedOwnerIds`=실제 PIN 설정자, `unlockedOwnerIds`=유효 token owner, `setupRequiredOwnerIds=[]`. 잠금은 이 두 집합으로 판정한다. 호환 export `strictPrivate(pack)`는 현재 선택형 앱 정책상 false다.
- PIN 미설정 개인 내용이 세션 공유자에게 보일 수 있다는 짧은 안내는 프런트 담당 범위. 기존 PIN 변경/해제 API 형태는 같다. src/UI 테스트는 수정하지 않았다.

## 직접 검증

모든 명령은 프로젝트 루트에서 수행. 로그는 이 디렉터리 상대경로다. 아래 개수는 중복 실행을 합산한 고유 테스트 수가 아니다.

| 결과 | 명령/근거 |
| --- | --- |
| exit 0, 19/19 | `node --import tsx --test tests/rummikub-model.test.ts tests/rummikub-source-evidence.test.ts tests/game-essentials-runtime-adapter.test.ts tests/game-essentials-runtime-final.test.ts` → focused-model.log |
| exit 0, 19/19 | `node --import tsx --test tests/rummikub-optional-pin.test.ts tests/game-essentials-runtime-api.test.ts tests/private-pin.test.ts tests/rummikub-runtime-integration.test.ts` → focused-api.log |
| exit 0, 9/9 | 보강 후 `node --import tsx --test tests/rummikub-optional-pin.test.ts tests/game-essentials-runtime-api.test.ts` → edge-api.log. 실제 PIN 설정 전/후 unsupported 거절, 비밀사진 import 거절, native 1.0.0/1.1.0 fallback 포함 |
| exit 0 | backend/shared/변경 backend 테스트 대상 TypeScript 검사 → typecheck.log(출력 없음) |

타입검사 명령:

```sh
node node_modules/typescript/bin/tsc --noEmit --target ES2022 --lib ES2022,DOM,DOM.Iterable --module ESNext --moduleResolution Bundler --strict --esModuleInterop --resolveJsonModule --allowImportingTsExtensions --skipLibCheck --types node,vite/client shared/rummikub.ts shared/gameEssentials.ts shared/privacy.ts shared/types.ts server/index.ts server/engine.ts server/ai/index.ts server/ai/rummikubPrompt.ts gamepacks/catalog.ts tests/rummikub-model.test.ts tests/rummikub-optional-pin.test.ts tests/game-essentials-runtime-api.test.ts tests/game-essentials-runtime-adapter.test.ts tests/private-pin.test.ts tests/rummikub-runtime-integration.test.ts
```

RED 근거 model-red.log/API api-red.log 보존. 최초 focused-api 실패는 새로 허용된 입력에서 테스트가 해당 필드에 없는 `train-cards` component ID를 쓴 경우였다. 바인딩의 실제 component ID로 고쳤으며 제품 validator는 완화하지 않았다.

원명세 불변: final 회귀가 120개 원본 각각을 data-freeze.json SHA256 및 generated manifest와 대조했다. freeze digest `de2ba37449113dce2547698f0b04123909e875e496b730b7f0c81f8f3cc4b4fd`, 1360필드·120팩, 임시 재생성 바이트 동일. 원명세/아트 경로는 이 작업에서 쓰지 않았다. 437분류의 구성물 의미/매핑 호환도 final 회귀 통과했다. 이는 아트 전체 파일의 전후 byte 동일성을 따로 측정했다는 주장은 아니다.

## 남은 통합 확인

UNCLEAR: 프런트의 새 색 선택/legacy 표시·선택형 PIN 연결과 실제 화면은 이번 backend 작업 범위에서 확인하지 않았다. 실제 AI 정확도도 측정하지 않았다. 전체 suite/build는 반복하지 않았으며 감독이 프런트 통합 후 한 번 실행한다. 사용자 Store/PIN/사진·키·운영 프로세스는 접근/변경하지 않았다.
