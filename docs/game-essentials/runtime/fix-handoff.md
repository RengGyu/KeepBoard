# 독립 검토 finding 2건 수정 인계

VERIFIED · 2026-10-22. 이 패키지 소유권을 반환한다. 변경 제품 파일은 아래 **4개만**이다. 원명세/아트/generated artifact/source freeze/사용자 기록/프로세스는 변경하지 않았다.

## A. 범위 복원 turn 상태 stale

직접 재현: 새 generated 카탄 세션 → build/주사위8 기록 → 저장 → 명시 next-turn → public resume. 복사된 assertion의 과거 turn 태그 때문에 `currentFacts`와 `catanSummary.factValue`가 값을 무시해 질문/briefing에서 사라졌다. owner turn 상태도 같은 결함이 있었다.

수정:

- `server/runtimeResume.ts`: 선택한 범위 중 **저장 시점 turn에 속했던 accepted 비도출 turn 상태**만 현재 논리 turn에 재연결한다. stale였던 상태/미확정 후보/session 수명·구매 이력은 그대로 둔다. snapshot 자체, 실물·사진 참조, region, id, updatedAt은 바꾸지 않는다. 공개 복원의 새 capture epoch/owner 복원의 epoch 불변 및 전역 turn 유지 계약도 그대로다.
- `server/engine.ts`: 기존 `isTurnField` 분류를 export하여 위 경로에서 그대로 재사용한다. 저장본과 재관측 값 비교는 snapshot의 **원래 turn**을 기준으로 유효값을 읽게 한다. 그렇지 않으면 복원 후 dice9로 정정해도 saved8 비교가 누락되는 별도 재현이 있었다. 현재 상태 조회의 기본 turn 판정은 그대로다.
- 신규 `tests/game-essentials-runtime-turn-resume.test.ts` 3개: public/owner 실제 fresh API의 질문·briefing·차이, 다른 owner/공개 상태·시계/출처 보존, 구매 turn 이력/미확정 후보/stale-at-save/snapshot 불변.

RED: `turn-fix-red.log` — 2/2 fail, phase와 owner 상태가 undefined. `turn-comparison-red.log` — saved8→observed9 차이가 누락됨. 최소 수정 후 GREEN: `turn-fix-green.log` 초기2개 pass, 최종 추가 회귀까지 `fixes-focused.log`/전체 로그에서3개 pass.

검증된 의미: 복원은 과거 게임 턴 자체를 되돌리는 동작이 아니다. 선택한 현재 상태만 현재 논리 turn 문맥으로 연결하며, 과거 구매 턴이나 다른 owner의 데이터·태그를 일괄 변경하지 않는다. 후보를 자동 확정하지 않는다.

## B. 실물 보관 위치 draft가 전체 저장에서 누락

직접 재현: 실제 `PreservationItem` input onChange → 부모 `GameEssentials` 등록 flush → commit → fresh API snapshot/reload. 수정 전 위치가 빈 문자열로 저장됐다. 위치 PATCH 오류가 나도록 준비해도 flush가 없으므로 commit/성공 알림이 먼저 진행되는 RED도 확인했다.

수정:

- `src/Packing.tsx`: 선택적 `onReadyToSave`로 dirty 위치만 등록한다. props 동기화가 미저장 draft를 덮지 않도록 현재 draft/마지막 저장 위치를 분리한다. flush는 **container만 PATCH**하며 packed/restored를 자동 변경하지 않는다. 실패는 draft/error를 남기고 부모에 rethrow한다. 기존 개별 위치 저장/포장/복원 버튼은 같은 명시 동작을 유지한다. busy 동안 위치 입력도 비활성화한다.
- `src/GameEssentials.tsx`: 각 보관 항목의 위치 flush를 기존 saves registry에 등록/해제한다. 기존 `SessionWorkspace.saveBoard → flush → essentialsSave → commit` 연결을 그대로 사용한다. SessionWorkspace 변경은 없다.
- 신규 `tests/game-essentials-runtime-preservation-draft.test.ts` 4개: 실제 컴포넌트 이벤트/부모 등록 → fresh API 저장·snapshot·reload, 위치 쓰기 실패 시 commit/성공 메시지 차단·draft 보존·재시도, PIN 잠금/타owner 보존, 개별 위치 저장/포장/복원 버튼 회귀.

RED: `preservation-fix-red.log` — 빈 container, 예상 거절 미발생, 개인 위치 누락으로3/3 fail. GREEN: `preservation-fix-green.log` 초기3개 pass; 버튼 회귀까지 최종4개가 focused/전체 실행에서 통과했다.

하네스 경계: 설치 없이 React의 **test-only controlled hook dispatcher**로 실제 GameEssentials/PreservationItem 함수·state setter·effect·이벤트를 실행했다. JSX 문자열/복제된 저장 모델만 검사한 것이 아니다. API/Store/commit/snapshot/reload는 실제 새 임시 서버다. DOM/React reconciler/레이아웃/실제 브라우저 클릭을 검증한 것은 아니다. 전체 저장의 기존 SessionWorkspace 버튼 자체를 클릭했다고 보고하지 않는다. React 내부 dispatcher 사용은 테스트에만 있으며 버전 변경 시 이 하네스를 확인해야 한다. PIN은 합성 API에서만 설정했다.

## 최종 명령과 결과

| 명령 | 직접 확인 결과 |
|---|---|
| `node --import tsx --test tests/game-essentials-runtime-turn-resume.test.ts tests/game-essentials-runtime-preservation-draft.test.ts` | focused7/7 pass, exit0 (`fixes-focused.log`) |
| `node --import tsx --test tests/game-essentials-runtime*.test.ts tests/catan*.test.ts tests/rummikub*.test.ts` | 관련92/92 pass, exit0 (`fixes-related.log`) |
| `npm run typecheck` | exit0 (`fixes-typecheck.log`) |
| `npm test` | 전체225/225 pass, exit0 (`fixes-all-tests.log`) |

초기 타입검사에서 신규 테스트의 address narrowing 오류1건이 나와 base URL을 검증 직후 고정하도록 수정했다. 위 표는 수정 후 최종 결과다. 제품 수정은 turn 복원/보관 위치의 위4파일로 한정했다. 신규 회귀 파일2개와 이 인계/실행 로그 외 기존 테스트나 데이터는 바꾸지 않았다.

수정 시각(KST): runtimeResume01:17:43, engine01:17:58, Packing/GameEssentials01:21:05. 이 시각 이후 제품 소스 추가 수정 없음.

## 미반영/미확인

이번 패키지는 **build/dist 생성0, 기존4393/4396/4330 등 재시작0, 프리뷰 전환0, 유료AI/카메라0**이다. 기존 URL 화면/API가 두 수정을 이미 제공한다고 볼 수 없다. 감독의 최종 통합·빌드·프로세스 전환은 별도다. 실제 브라우저에서 수정된 상단 저장과 복원 클릭은 이번에 미검증이며 API/컴포넌트 하네스 근거와 구분한다.
