# 루미큐브 사진→후보 UI 인계 (2026-10-22)

수정: `src/SessionWorkspace.tsx`의 연결 상태에서 업로드 자동 판독과 기존 최근사진 다시 읽기 안내를 구분했다. 새 후보 수를 이번 요청의 새 assertion ID·owner·사진 참조로 계산하고, 판독 완료에 후보가 없을 때 성공 후보 안내를 하지 않는다. `rummikubReadoutMessage`가 미연결/진행/실패/후보 없음/후보 확인 문구를 구분한다. 기존 사용자 기록·사진·설정·서버는 접근하거나 변경하지 않았다. green 타일 표시는 기존 root 구현을 그대로 두었다.

## 미수정 후보의 선행 확정 수정

발견했던 경로는 기존 `readStoredPhotos()` → 기본 `flush()` → RummikubWorkspace `forceSave` → `api.update` answers였다. 읽기 시작만으로 미수정 candidate가 기존 accepted를 대체할 수 있었다. 감독관이 경로를 확인하고 추가 수정 범위를 승인한 뒤 아래처럼 분리했다. 이 코드 결함이 실제 사용자 기록 변경의 원인이었다고 단정하지 않는다.

- `src/rummikubSavePolicy.ts`의 `RummikubSaveOptions`, `PHOTO_INPUT_SAVE_OPTIONS`, `rummikubDraftAnswers`가 UI 저장 의도를 분리한다.
- 기존 사진 읽기·상단/첫 사진 촬영 진입·사진 업로드 준비는 `flush({acceptCandidate:false})`를 사용한다.
- 미수정 후보는 이 경로에서 scene answer를 만들지 않는다. 초기 등록/중단 메모만 수정했어도 scene 후보를 함께 확정하지 않는다.
- 직접 편집한 dirty 타일 초안은 기존 API 저장 경로로 보존한 뒤 판독을 시작한다. 저장 실패 시 판독을 시작하지 않는다.
- 명시적인 상위 저장/타일 기록은 기본 옵션으로 미수정 후보도 확정한다. 다른 화면 이동의 기존 flush 의미는 변경하지 않았다.
- 서버·공유 모형·팩·데이터는 수정하지 않았다. 실제 사용자 보드에서는 어떤 저장·확정·재분석도 실행하지 않았다.

검증 상태:

- CUA `getState`: browsers/apps 비어 있음, native pipe startup 실패. 우회·브라우저 설치·실제 버튼 클릭 없음.
- 최초 단독 `node --import tsx docs/rummikub-integration/verify-ui.mts`는 CSS import 미지원 exit1. 기존 프로젝트의 CSS 제외 loader를 사용하는 올바른 명령으로 최종 통과했다. 제품 CSS나 별도 브라우저 도구를 변경/설치하지 않았다.
- `node --import ./docs/board-story/feedback/register-css.mjs --import tsx docs/rummikub-integration/verify-ui.mts`: **exit0**. 공용/개인 분리·PIN DOM 제외·미연결 안내·연결 시 기존사진 버튼·자동 판독 설명·후보 타일 markup·green 표기 및 정규화→저장 payload를 합성 SSR로 확인했다. 읽는 중/실패/새 후보 없음 문구도 순수 함수로 확인했다.
- `node --import tsx --test tests/rummikub-ui-save.test.ts`: **4/4, exit0**. accepted+미수정 candidate에서 읽기 준비 후 합성 분석 실패에도 write0/기록 불변, 명시 저장은 후보 확정 payload 생성, dirty 초안 및 green 보존, 문맥만 수정했을 때 후보 선행 확정 없음. 이 테스트는 실제 API/버튼 클릭이 아니라 제품 편집기가 사용하는 저장 정책의 합성 회귀다.
- `npm run typecheck`: **exit0**.
- 실제 브라우저 이미지 로딩·효과·390/1440 레이아웃·버튼 클릭은 **미확인**. SSR는 이를 검증하지 않는다. 최종 build/dist 변경은 다른 작업자 동결 여부를 알 수 없어 실행하지 않았다.
- 유료 AI 호출·실제 보드 조회/저장/확정·서버 재시작·build/dist 변경 없음.

## 초록색 보존 검수

현재 `shared/rummikub.ts`는 green을 허용하고, RummikubWorkspace는 후보 값을 해당 정규화로 읽어 초록 이름/#36864b의 숫자 glyph로 표시한다. flush는 해당 scene을 `rummikubDraftAnswers`/`rummikubAnswers`로 전달한다. 합성 green 7 후보의 SSR markup 및 저장 payload에서 green이 그대로임을 확인했다. 숨은 앞면/모름 표시 정책은 별도 유지한다.

감독관이 전달한 현재 저장본의 null 색과 과거 `greenTiles16` 집계는 원문/저장 시점 대응이 확인되지 않았다. 이 작업자는 실제 사용자 기록과 사진을 읽지 않았으며, 두 자료를 같은 AI 원문으로 간주하지 않는다. 구버전 탭이 실제 사용한 번들·실행 경로도 검증하지 않았으므로 현재 색 유실의 원인을 구버전 탭으로 귀속하지 않는다.

## 최종 변경 파일

`src/SessionWorkspace.tsx`, `src/RummikubWorkspace.tsx`, 신규 `src/rummikubSavePolicy.ts`, 신규 `tests/rummikub-ui-save.test.ts`, `docs/rummikub-integration/verify-ui.mts`, 이 문서. `src/App.tsx`·전용 CSS·서버·공유 파일·게임팩은 이번 작업에서 수정하지 않았다. 파일 소유권을 감독관에게 반환한다.

## 최종 빌드·4393 정적 반영 확인 (2026-10-22)

제품 소스 작업자 동결 후 `npm run typecheck` → `npm run build` 순서로 실행해 **각각 exit0**. 이번 단계에서는 제품 소스나 테스트를 수정하지 않았고 전체 테스트를 반복하지 않았다.

홈과 생성된 정적 JS/CSS만 read-only GET했다. 검증 스크립트 exit0, 세 응답 모두 HTTP200이며 로컬 dist와 SHA-256이 일치한다.

| 4393 경로 | HTTP | 로컬 dist와 일치하는 SHA-256 |
|---|---|---|
| `/` | 200 | `651a40fb68eb128cad122ed7bc85bc86066c107c86d99463896e832885c88663` |
| `/assets/index-Q3dBnblD.js` | 200 | `665ef9e161b35f2c6f6b3f2e680053a787b1b788f97604919ef640117a5ee1a5` |
| `/assets/index-Boe8hxeB.css` | 200 | `fd71e312e05661dd49a9a76eb35357afea77fab62fc10cfa2cee24256d43cb5d` |

**확인 경계:** 4393는 새 프런트엔드 파일을 제공한다. 이미 열린 탭의 새로고침·실제 클릭은 확인하지 않았다. 서버 프로세스는 재시작하지 않았으므로 다른 작업자의 API 정규화 필터 등 서버 코드가 실행 중 프로세스에 반영됐다고 보증하지 않는다. UI 정적 자산 반영과 서버 코드 반영은 별개다. 사용자 세션/API/사진 조회·쓰기, 유료 AI 호출, 프로세스 조작은 없었다.
